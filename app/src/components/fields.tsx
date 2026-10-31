// Inputs that keep a local draft and commit on blur or Enter, so typing does not create one
// undo step per key and does not save half-typed values.
import { useEffect, useState, type ReactNode } from 'react';

interface Base {
  label: string;
  hint?: ReactNode;
  testId?: string;
}

export function TextField({ label, value, onCommit, hint, testId, placeholder }: Base & {
  value: string; onCommit: (v: string) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onCommit(draft); };
  return (
    <label className="field">
      <span>{label}</span>
      <input
        data-testid={testId} value={draft} placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setDraft(value);
        }}
      />
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function TextArea({ label, value, onCommit, onDraft, hint, testId }: Base & {
  value: string; onCommit: (v: string) => void; onDraft?: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        data-testid={testId} value={draft}
        onChange={(e) => { setDraft(e.target.value); onDraft?.(e.target.value); }}
        onBlur={() => { if (draft !== value) onCommit(draft); }}
      />
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function NumberField({ label, value, onCommit, min, max, step = 0.1, testId, hint }: Base & {
  value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const parsed = Number(draft);
  const invalid = draft.trim() === '' || !Number.isFinite(parsed) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max);
  const commit = () => {
    if (invalid) setDraft(String(value));
    else if (parsed !== value) onCommit(parsed);
  };
  return (
    <label className={`field${invalid ? ' invalid' : ''}`}>
      <span>{label}</span>
      <input
        data-testid={testId} type="number" inputMode="decimal" value={draft} step={step} min={min} max={max}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function ColorField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(draft);
  return (
    <label className={`field${valid || !draft ? '' : ' invalid'}`}>
      <span>{label}</span>
      <div className="color-row">
        <input type="color" value={valid ? draft : '#000000'} aria-label={`${label} picker`}
          onChange={(e) => { setDraft(e.target.value.toUpperCase()); onCommit(e.target.value.toUpperCase()); }} />
        <input value={draft} placeholder="#RRGGBB" onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if ((valid || !draft) && draft !== value) onCommit(draft); }} />
      </div>
    </label>
  );
}
