import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatJson } from '../shared/format.mjs';
import { DocumentStore, hashText, readDocument, SaveError } from './documents.mjs';
import { isPassiveMedia, parseCsv, sendFile } from './media.mjs';
import { insideAny, PathError, resolveInside } from './paths.mjs';
import { renderCommand } from './render.mjs';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const EXAMPLE = join(REPO, 'examples', 'acme-invoice-bot');
let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'studio-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('path guard', () => {
  it('resolves paths inside the folder', () => {
    mkdirSync(join(dir, 'recordings', 'raw'), { recursive: true });
    writeFileSync(join(dir, 'recordings', 'raw', 'a.mp4'), 'x');
    expect(resolveInside(dir, 'recordings/raw/a.mp4').endsWith(join('recordings', 'raw', 'a.mp4'))).toBe(true);
  });

  it('rejects .., absolute paths, NUL bytes and empty paths', () => {
    for (const bad of ['../etc/passwd', 'recordings/../../x', '/etc/passwd', 'C:\\x', 'a\0b', '']) {
      expect(() => resolveInside(dir, bad)).toThrow(PathError);
    }
  });

  it('rejects a symlink that leaves the folder', () => {
    const outside = mkdtempSync(join(tmpdir(), 'studio-outside-'));
    writeFileSync(join(outside, 'secret.txt'), 'no');
    symlinkSync(outside, join(dir, 'link'));
    expect(() => resolveInside(dir, 'link/secret.txt')).toThrow(/leaves the demo folder/);
    rmSync(outside, { recursive: true, force: true });
  });

  it('accepts absolute OUTPUT paths only inside the roots', () => {
    writeFileSync(join(dir, 'out.mp4'), 'x');
    expect(insideAny([dir], join(dir, 'out.mp4'))).toBeTruthy();
    expect(insideAny([dir], '/etc/hosts')).toBeNull();
  });
});

describe('save and load', () => {
  it('round-trips the example without losing _ keys or key order', () => {
    const original = JSON.parse(readFileSync(join(EXAMPLE, 'handoff.json'), 'utf8'));
    const text = formatJson(original);
    const back = JSON.parse(text);
    expect(back).toEqual(original);
    expect(Object.keys(back)).toEqual(Object.keys(original));
    expect(back._comment).toBe(original._comment);
    expect(text.startsWith('{\n  "_comment": ')).toBe(true);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.split('\n').every((line) => line.length <= 120 || !line.trim().startsWith('{'))).toBe(true);
  });

  it('writes valid documents atomically and refuses invalid ones', () => {
    cpSync(join(EXAMPLE, 'handoff.json'), join(dir, 'handoff.json'));
    const changes = [];
    const store = new DocumentStore(dir, (doc) => changes.push(doc));
    try {
      const loaded = readDocument(dir, 'handoff');
      const edited = { ...loaded.data, title: 'Renamed', _note: 'kept' };
      const { hash } = store.save('handoff', edited, loaded.hash);
      const disk = readFileSync(join(dir, 'handoff.json'), 'utf8');
      expect(hashText(disk)).toBe(hash);
      expect(JSON.parse(disk)).toEqual(edited);

      const invalid = { ...edited, videos: [] };
      expect(() => store.save('handoff', invalid, hash)).toThrow(SaveError);
      expect(readFileSync(join(dir, 'handoff.json'), 'utf8')).toBe(disk);
    } finally {
      store.close();
    }
  });

  it('refuses to overwrite a file that changed on disk since it was loaded', () => {
    cpSync(join(EXAMPLE, 'handoff.json'), join(dir, 'handoff.json'));
    const store = new DocumentStore(dir, () => {});
    try {
      const loaded = readDocument(dir, 'handoff');
      writeFileSync(join(dir, 'handoff.json'), JSON.stringify({ ...loaded.data, title: 'Claude edit' }));
      let error;
      try {
        store.save('handoff', { ...loaded.data, title: 'Mine' }, loaded.hash);
      } catch (e) {
        error = e;
      }
      expect(error?.status).toBe(409);
      expect(JSON.parse(error.extra.text).title).toBe('Claude edit');
    } finally {
      store.close();
    }
  });

  it('reports an outside edit through the watcher', async () => {
    cpSync(join(EXAMPLE, 'demo.json'), join(dir, 'demo.json'));
    const changes = [];
    const store = new DocumentStore(dir, (doc) => changes.push(doc));
    try {
      const data = JSON.parse(readFileSync(join(dir, 'demo.json'), 'utf8'));
      writeFileSync(join(dir, 'demo.json'), JSON.stringify({ ...data, title: 'Outside' }));
      await new Promise((r) => setTimeout(r, 600));
      expect(changes.at(-1)?.data.title).toBe('Outside');
      const before = changes.length;
      store.save('demo', { ...data, title: 'Inside' }, changes.at(-1).hash);
      await new Promise((r) => setTimeout(r, 600));
      expect(changes.length).toBe(before);
    } finally {
      store.close();
    }
  });
});

describe('render commands', () => {
  it('builds argument arrays for known scripts only', () => {
    cpSync(join(EXAMPLE, 'handoff.json'), join(dir, 'handoff.json'));
    const [cmd, args] = renderCommand('cards', { repo: REPO, folder: dir });
    expect(cmd).toBe(process.execPath);
    expect(args).toEqual([join(REPO, 'scripts', 'title-cards.mjs'), 'handoff.json']);
    expect(renderCommand('quick', { repo: REPO, folder: dir, video: 'PROMO' })[1].slice(-2)).toEqual(['handoff.json', 'PROMO']);
    expect(() => renderCommand('quick', { repo: REPO, folder: dir, video: 'PROMO; rm -rf /' })).toThrow();
    expect(() => renderCommand('keynote', { repo: REPO, folder: dir })).toThrow(/no demo.json/);
    expect(() => renderCommand('shell', { repo: REPO, folder: dir })).toThrow(/unknown render/);
  });
});

describe('takes.csv', () => {
  it('reads quoted notes with commas and quotes', () => {
    const rows = parseCsv('file,scene,status,notes\nraw/a-t1.mp4,a,keep,"slow, then ""fast"""\n');
    expect(rows).toEqual([{ file: 'raw/a-t1.mp4', scene: 'a', status: 'keep', notes: 'slow, then "fast"' }]);
  });
});

describe('serving demo-folder files', () => {
  function fakeRes() {
    const res = { status: 0, headers: {}, writeHead(status, headers) { res.status = status; res.headers = headers; }, end() {} };
    return res;
  }

  it('serves video and images inline, sandboxed', () => {
    writeFileSync(join(dir, 'take.mp4'), 'x');
    const res = fakeRes();
    sendFile({ method: 'HEAD', headers: {} }, res, join(dir, 'take.mp4'), { untrusted: true });
    expect(res.headers['Content-Type']).toBe('video/mp4');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['Content-Security-Policy']).toMatch(/sandbox/);
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });

  it('never serves HTML, SVG or script from a demo folder as a page', () => {
    for (const name of ['evil.html', 'logo.svg', 'x.js']) {
      writeFileSync(join(dir, name), '<script>alert(1)</script>');
      const res = fakeRes();
      sendFile({ method: 'HEAD', headers: {} }, res, join(dir, name), { untrusted: true });
      expect(res.headers['Content-Type']).toBe('application/octet-stream');
      expect(res.headers['Content-Disposition']).toMatch(/^attachment/);
    }
  });

  it('opens only media and text in their app; anything else is revealed', () => {
    expect(isPassiveMedia('a/b.mp4')).toBe(true);
    expect(isPassiveMedia('a/b.PNG')).toBe(true);
    for (const name of ['run.command', 'x.app', 'evil.html', 'tool.sh']) expect(isPassiveMedia(name)).toBe(false);
  });
});
