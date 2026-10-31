#!/usr/bin/env node
// Makes small synthetic takes for every raw take a demo folder's handoff.json and demo.json name
// but do not have, so the editor and its tests can run without real footage.
// Clips are 320x180 test patterns, about 1 second longer than the furthest out point used.
// Usage: node app/scripts/example-media.mjs <demo-folder> [--size 320x180]
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MIN_SECONDS = 6;
const HEADER = 'file,scene,take,duration_s,resolution,fps,recorded_at,status,notes\n';

function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

// file name -> furthest out point any shot uses
export function neededTakes(handoff, demo) {
  const need = new Map();
  const use = (file, out) => need.set(file, Math.max(need.get(file) ?? 0, out ?? 0));
  for (const shot of Object.values(handoff?.shots ?? {})) use(shot.source, shot.out);
  for (const video of handoff?.videos ?? []) {
    for (const scene of video.scenes) {
      for (const shot of scene.shots) {
        if (shot.source) use(shot.source, shot.out);
        if (shot.ref && handoff.shots?.[shot.ref]) use(handoff.shots[shot.ref].source, shot.out ?? handoff.shots[shot.ref].out);
      }
    }
  }
  for (const item of demo?.sequence ?? []) {
    if (item.stem) use(`${item.stem}-t${item.take ?? 1}.mp4`, item.trim?.[1] ?? 0);
  }
  return need;
}

function main() {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith('--'));
  if (!folder) {
    console.error('usage: example-media.mjs <demo-folder> [--size 320x180]');
    process.exit(2);
  }
  const size = args.includes('--size') ? args[args.indexOf('--size') + 1] : '320x180';
  const root = resolve(folder);
  const handoff = readJson(join(root, 'handoff.json'));
  const demo = readJson(join(root, 'demo.json'));
  const raw = join(root, handoff?.paths?.raw ?? 'recordings/raw');
  mkdirSync(raw, { recursive: true });
  const csv = join(root, 'recordings', 'takes.csv');
  if (!existsSync(csv)) writeFileSync(csv, HEADER);
  let made = 0;
  [...neededTakes(handoff, demo)].forEach(([file, out], index) => {
    const target = join(raw, file);
    if (existsSync(target)) return;
    const seconds = Math.max(MIN_SECONDS, Math.ceil(out + 1));
    const hue = (index * 47) % 360;
    const [w, h] = size.split('x').map(Number);
    // A light, mostly still frame with one moving test block, like a screen recording of an app.
    const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `color=c=0xF3F3F6:s=${size}:r=30:d=${seconds}`,
      '-f', 'lavfi', '-i', `testsrc2=s=${Math.round(w / 3)}x${Math.round(h / 3)}:r=30:d=${seconds}`,
      '-filter_complex', `[1:v]hue=h=${hue}[b];[0:v][b]overlay=x='${Math.round(w / 10)}+t*${Math.round(w / 30)}':y=${Math.round(h / 3)}`,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target],
    { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`example-media: ffmpeg failed for ${file}`);
      process.exit(1);
    }
    const scene = file.replace(/-t\d+\.mp4$/, '');
    const take = /-t(\d+)\.mp4$/.exec(file)?.[1] ?? '1';
    appendFileSync(csv, `raw/${file},${scene},${take},${seconds}.0,${size},30,2026-01-01T00:00,keep,"synthetic test pattern"\n`);
    made += 1;
  });
  console.log(`example-media: made ${made} synthetic take(s) in ${raw}`);
}

main();
