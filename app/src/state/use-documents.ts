// Holds handoff.json and demo.json with undo/redo, autosaves after edits, and reconciles with
// edits made outside the app (Claude, a text editor).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, type FileState } from '../api';
import type { FileKind } from '../lib/types';
import { commit, type Docs, type History, initHistory, redo as redoStep, undo as undoStep } from './history';
import { validate } from './validators';

export const AUTOSAVE_MS = 800;
const KINDS: FileKind[] = ['handoff', 'demo'];

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'invalid' | 'error' | 'conflict';

export interface Conflict {
  kind: FileKind;
  data: unknown;
  hash: string;
  diskErrors: string[];
}

interface Saved {
  data: unknown;
  hash: string | null;
}

type Notify = (message: string, tone?: 'info' | 'error') => void;

function initialSaved(files: Record<FileKind, FileState | null>): Record<FileKind, Saved> {
  return {
    handoff: { data: files.handoff?.data, hash: files.handoff?.hash ?? null },
    demo: { data: files.demo?.data, hash: files.demo?.hash ?? null },
  };
}

export function useDocuments(files: Record<FileKind, FileState | null>, notify: Notify) {
  const [history, setHistory] = useState<History>(() =>
    initHistory({ handoff: files.handoff?.data ?? undefined, demo: files.demo?.data ?? undefined }));
  const saved = useRef(initialSaved(files));
  const present = useRef<Docs>(history.present);
  present.current = history.present;
  const [status, setStatus] = useState<Record<FileKind, SaveStatus>>({ handoff: 'saved', demo: 'saved' });
  const [errors, setErrors] = useState<Record<FileKind, string[]>>({
    handoff: files.handoff?.errors ?? [], demo: files.demo?.errors ?? [],
  });
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [tick, setTick] = useState(0);
  const inFlight = useRef<Record<FileKind, boolean>>({ handoff: false, demo: false });

  const setKindStatus = (kind: FileKind, value: SaveStatus) => setStatus((s) => (s[kind] === value ? s : { ...s, [kind]: value }));
  const setKindErrors = (kind: FileKind, value: string[]) => setErrors((e) => ({ ...e, [kind]: value }));

  // Resolves true when the file on disk matches the editor afterwards.
  const save = useCallback(async (kind: FileKind): Promise<boolean> => {
    const data = present.current[kind];
    if (data === undefined || data === saved.current[kind].data) return true;
    if (inFlight.current[kind]) return false;
    const problems = validate(kind, data);
    setKindErrors(kind, problems);
    if (problems.length) {
      setKindStatus(kind, 'invalid');
      return false;
    }
    inFlight.current[kind] = true;
    setKindStatus(kind, 'saving');
    try {
      const { hash } = await api.save(kind, data, saved.current[kind].hash);
      saved.current = { ...saved.current, [kind]: { data, hash } };
      setKindStatus(kind, present.current[kind] === data ? 'saved' : 'pending');
      return present.current[kind] === data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        let disk: unknown = null;
        try {
          disk = JSON.parse(String(error.body.text));
        } catch { /* broken JSON on disk; the dialog offers only "keep mine" */ }
        setConflict({ kind, data: disk, hash: String(error.body.hash), diskErrors: disk ? validate(kind, disk) : ['not valid JSON'] });
        setKindStatus(kind, 'conflict');
      } else if (error instanceof ApiError && error.status === 422) {
        setKindErrors(kind, (error.body.errors as string[]) ?? [error.message]);
        setKindStatus(kind, 'invalid');
      } else {
        setKindStatus(kind, 'error');
        notify(`Could not save ${kind}.json: ${(error as Error).message}`, 'error');
      }
      return false;
    } finally {
      inFlight.current[kind] = false;
      setTick((t) => t + 1);
    }
  }, [notify]);

  // Autosave, debounced, for each file that differs from what is on disk.
  useEffect(() => {
    if (conflict) return undefined;
    const timers = KINDS.filter((k) => history.present[k] !== undefined && history.present[k] !== saved.current[k].data)
      .map((kind) => {
        if (!inFlight.current[kind]) setKindStatus(kind, 'pending');
        return setTimeout(() => save(kind), AUTOSAVE_MS);
      });
    return () => timers.forEach(clearTimeout);
  }, [history.present, save, tick, conflict]);

  const apply = useCallback((kind: FileKind, update: (doc: unknown) => unknown) => {
    setHistory((h) => {
      const current = h.present[kind];
      const next = update(current);
      return next === current ? h : commit(h, { ...h.present, [kind]: next });
    });
  }, []);

  const replaceFromDisk = useCallback((kind: FileKind, data: unknown, hash: string) => {
    saved.current = { ...saved.current, [kind]: { data, hash } };
    setHistory((h) => commit(h, { ...h.present, [kind]: data }));
    setKindErrors(kind, validate(kind, data));
    setKindStatus(kind, 'saved');
  }, []);

  const onOutsideChange = useCallback((file: FileState & { kind: FileKind }) => {
    const { kind } = file;
    const dirty = present.current[kind] !== saved.current[kind].data;
    if (!file.data) {
      saved.current = { ...saved.current, [kind]: { ...saved.current[kind], hash: file.hash } };
      notify(`${file.name} was changed outside the app and is not valid JSON. Your version is kept; it will replace the file on the next save.`, 'error');
      return;
    }
    if (!dirty) {
      replaceFromDisk(kind, file.data, file.hash);
      notify(`${file.name} changed outside the app. Reloaded.`);
      return;
    }
    setConflict({ kind, data: file.data, hash: file.hash, diskErrors: file.errors });
    setKindStatus(kind, 'conflict');
  }, [notify, replaceFromDisk]);

  const resolveConflict = useCallback((choice: 'mine' | 'disk') => {
    if (!conflict) return;
    const { kind } = conflict;
    if (choice === 'disk' && conflict.data) {
      replaceFromDisk(kind, conflict.data, conflict.hash);
      notify(`Loaded ${kind}.json from disk.`);
    } else {
      // Treat the disk version as seen, so the next save replaces it with ours.
      saved.current = { ...saved.current, [kind]: { data: Symbol('outdated'), hash: conflict.hash } };
      setKindStatus(kind, 'pending');
    }
    setConflict(null);
    setTick((t) => t + 1);
  }, [conflict, notify, replaceFromDisk]);

  return {
    docs: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => setHistory(undoStep),
    redo: () => setHistory(redoStep),
    apply,
    status,
    errors,
    conflict,
    resolveConflict,
    onOutsideChange,
    saveNow: save,
  };
}
