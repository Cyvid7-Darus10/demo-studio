// Test helper: runs a snippet against the repo's Python scripts so the TypeScript math is checked
// against the real implementation, not a copy of it.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = fileURLToPath(new URL('../../../', import.meta.url));

const PRELUDE = `
import importlib.util, json, sys
from pathlib import Path
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(sys.argv[1]) / "scripts" / file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module
`;

export function runPython<T>(code: string, input: unknown = null): T {
  const result = spawnSync('python3', ['-I', '-c', PRELUDE + code, REPO], { input: JSON.stringify(input), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`python failed: ${result.stderr}`);
  return JSON.parse(result.stdout) as T;
}
