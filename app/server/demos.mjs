import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function isDemoFolder(dir) {
  return existsSync(join(dir, 'handoff.json')) || existsSync(join(dir, 'demo.json'));
}

function titleOf(dir) {
  for (const name of ['handoff.json', 'demo.json']) {
    try {
      const title = JSON.parse(readFileSync(join(dir, name), 'utf8')).title;
      if (typeof title === 'string' && title) return title;
    } catch { /* missing or broken; the folder name stands in */ }
  }
  return null;
}

function scan(root, group) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => !name.startsWith('.'))
    .map((name) => join(root, name))
    .filter((dir) => statSync(dir).isDirectory() && isDemoFolder(dir))
    .map((dir) => ({
      path: dir,
      name: dir.split('/').pop(),
      title: titleOf(dir),
      group,
      hasHandoff: existsSync(join(dir, 'handoff.json')),
      hasDemo: existsSync(join(dir, 'demo.json')),
      modified: statSync(dir).mtimeMs,
    }))
    .sort((a, b) => b.modified - a.modified);
}

// Demos under $DEMO_ROOT (default ./demos where the command ran) and the repo's examples.
export function listDemos({ cwd, repo }) {
  const demoRoot = resolve(cwd, process.env.DEMO_ROOT ?? 'demos');
  return [...scan(demoRoot, 'Your demos'), ...scan(join(repo, 'examples'), 'Examples')];
}
