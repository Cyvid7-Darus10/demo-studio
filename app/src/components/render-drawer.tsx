import { ExternalLink, FolderSearch, Square, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { api, type OutputFile, type RenderState } from '../api';
import { mediaUrl } from '../lib/player';

const STATUS: Record<RenderState['status'], string> = {
  running: 'Running', done: 'Done', failed: 'Failed', cancelled: 'Cancelled',
};

function OutputView({ file, onError }: { file: OutputFile; onError: (m: string) => void }) {
  const ext = file.path.split('.').pop()?.toLowerCase();
  const act = (action: 'reveal' | 'open') => api.reveal(file.path, action).catch((e: Error) => onError(e.message));
  return (
    <div className="output" data-testid="render-output">
      {file.rel && (ext === 'mp4' || ext === 'mov') && <video src={mediaUrl(file.rel)} controls muted playsInline preload="metadata" />}
      {file.rel && ext === 'png' && <img src={mediaUrl(file.rel)} alt={file.rel} />}
      <div className="path">{file.rel ?? file.path}</div>
      <div className="actions">
        <button className="btn" onClick={() => act('reveal')}><FolderSearch size={14} />Reveal in Finder</button>
        {!file.isDir && <button className="btn" onClick={() => act('open')}><ExternalLink size={14} />Open</button>}
      </div>
    </div>
  );
}

export function RenderDrawer({ job, onClose, onError }: { job: RenderState; onClose: () => void; onError: (m: string) => void }) {
  const log = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.log.length]);
  const p = job.progress;
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : null;
  const files = job.outputFiles ?? [];
  // A render can print dozens of outputs (every title card); show the last few.
  const shown = files.slice(-6);
  return (
    <aside className="drawer" aria-label="Render" data-testid="render-drawer" data-status={job.status}>
      <div className="panel-head">
        <span style={{ color: 'var(--text)' }}>{job.label}</span>
        <span className={job.status === 'failed' ? 'status-reject' : job.status === 'done' ? 'status-keep' : ''} data-testid="render-status">{STATUS[job.status]}</span>
        <span style={{ flex: 1 }} />
        <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="drawer-body">
        <div className={`progress${job.status === 'running' && pct === null ? ' indeterminate' : ''}`} role="progressbar"
          aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100} data-testid="render-progress">
          <div style={{ width: job.status === 'done' ? '100%' : pct === null ? undefined : `${pct}%` }} />
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {p ? `${p.stage} ${p.done}/${p.total}` : job.status === 'running' ? 'Starting' : ''}
          {job.error ? ` ${job.error}` : ''}
        </div>
        {job.status === 'running' && (
          <div><button className="btn danger" onClick={() => api.cancel().catch((e: Error) => onError(e.message))}><Square size={13} />Cancel</button></div>
        )}
        {shown.length > 0 && (
          <div className="outputs">
            {files.length > shown.length && <div className="faint" style={{ fontSize: 12 }}>{files.length} files written; the last {shown.length} are shown.</div>}
            {shown.map((f) => <OutputView key={f.path} file={f} onError={onError} />)}
          </div>
        )}
        <pre className="log mono" ref={log} data-testid="render-log">
          {job.log.map((l, i) => <div key={i} className={l.stream === 'err' ? 'err' : ''}>{l.line}</div>)}
        </pre>
      </div>
    </aside>
  );
}
