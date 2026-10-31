// Undo and redo over the documents. A snapshot holds both files so one undo step can span either.
import type { FileKind } from '../lib/types';

export type Docs = Partial<Record<FileKind, unknown>>;

export interface History {
  past: Docs[];
  present: Docs;
  future: Docs[];
}

export const HISTORY_LIMIT = 200;

export function initHistory(present: Docs): History {
  return { past: [], present, future: [] };
}

export function commit(history: History, next: Docs): History {
  if (next === history.present) return history;
  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}

export function undo(history: History): History {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}
