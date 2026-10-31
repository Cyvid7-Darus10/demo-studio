import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';

export class PathError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
  }
}

function realOrParent(full) {
  try {
    return realpathSync(full);
  } catch {
    // Not there yet (a file about to be written): check the folder it would land in.
    return resolve(realpathSync(dirname(full)), full.slice(dirname(full).length + 1));
  }
}

function within(root, path) {
  return path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);
}

// Resolves a relative path inside root. Rejects absolute paths, `..` segments, NUL bytes and
// symlinks whose target leaves root. Returns the real absolute path.
export function resolveInside(root, relative) {
  if (typeof relative !== 'string' || relative.length === 0) throw new PathError('path is empty');
  if (relative.includes('\0')) throw new PathError('path has a NUL byte');
  if (isAbsolute(relative) || /^[a-zA-Z]:/.test(relative) || relative.startsWith('\\')) {
    throw new PathError(`absolute paths are not allowed: ${relative}`);
  }
  if (relative.split(/[\\/]+/).includes('..')) throw new PathError(`'..' is not allowed: ${relative}`);
  const realRoot = realpathSync(root);
  let real;
  try {
    real = realOrParent(resolve(realRoot, relative));
  } catch {
    throw new PathError(`not found: ${relative}`);
  }
  if (!within(realRoot, real)) throw new PathError(`path leaves the demo folder: ${relative}`);
  return real;
}

// For absolute paths a script printed (OUTPUT lines): allowed only inside one of the roots.
export function insideAny(roots, absolute) {
  let real;
  try {
    real = realpathSync(absolute);
  } catch {
    return null;
  }
  return roots.map((r) => realpathSync(r)).some((r) => within(r, real)) ? real : null;
}
