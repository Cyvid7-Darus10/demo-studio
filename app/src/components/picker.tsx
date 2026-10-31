import { Film } from 'lucide-react';
import type { DemoEntry } from '../api';

export function Picker({ demos, onOpen }: { demos: DemoEntry[]; onOpen: (path: string) => void }) {
  const groups = [...new Set(demos.map((d) => d.group))];
  return (
    <main className="picker">
      <div className="picker-inner">
        <h1>Open a demo</h1>
        <p className="muted">Pick a demo folder. The editor reads and writes its handoff.json and demo.json.</p>
        {demos.length === 0 && (
          <p className="note">
            No demos found. Start one with <code>new-demo.sh</code>, or run <code>npm run studio path/to/demo</code>. Demos are
            looked up in <code>$DEMO_ROOT</code> (default <code>./demos</code>) and the repo's examples.
          </p>
        )}
        {groups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            <div className="picker-list">
              {demos.filter((d) => d.group === group).map((d) => (
                <button key={d.path} className="picker-item" onClick={() => onOpen(d.path)} data-testid="demo-item">
                  <Film size={18} />
                  <span>
                    <div className="title">{d.title ?? d.name}</div>
                    <div className="path">{d.path}</div>
                  </span>
                  <span className="files">{[d.hasHandoff && 'handoff.json', d.hasDemo && 'demo.json'].filter(Boolean).join(', ')}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
