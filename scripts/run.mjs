// Runs a small Playwright script against one of the demo's Chrome windows (scouting, resets, checks).
// Usage: node run.mjs <window> <script.mjs> [args...]
// The script's default export gets (page, args, context) and may return a value to print.
// TAB=<url part> picks the tab; default is the window's "match" tab, else the last tab.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadPlaywright, windowConfig } from './pw.mjs';

const [who, script, ...args] = process.argv.slice(2);
if (!who || !script) {
  console.error('usage: node run.mjs <window> <script.mjs> [args...]');
  process.exit(1);
}
const win = windowConfig(who);
const { chromium } = await loadPlaywright();
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${win.port}`);
const context = browser.contexts()[0];
const pages = context.pages();
const part = process.env.TAB ?? win.match;
const page = (part && pages.find((p) => p.url().includes(part))) ?? pages.at(-1);
try {
  const run = (await import(pathToFileURL(resolve(script)).href)).default;
  const result = await run(page, args, context);
  if (result !== undefined) console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 1));
} finally {
  await browser.close().catch(() => {});
}
