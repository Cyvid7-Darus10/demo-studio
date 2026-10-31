// Shared by rec.mjs, run.mjs and title-cards.mjs: finds playwright-core and reads demo.json.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Resolves from the plugin folder first (after `npm install` there), then from the current folder.
export async function loadPlaywright() {
  try {
    return await import('playwright-core');
  } catch {
    try {
      return createRequire(join(process.cwd(), 'noop.js'))('playwright-core');
    } catch {
      console.error(`playwright-core is not installed. Fix:\n  npm install --prefix "${PLUGIN_ROOT}"`);
      process.exit(1);
    }
  }
}

// Headless Chrome for rendering stills. CHROME_PATH overrides the installed Chrome.
export async function launchChrome(chromium) {
  const options = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
  try {
    return await chromium.launch({ ...options, headless: true });
  } catch (error) {
    console.error(`Could not start Chrome (${error.message.split('\n')[0]}). Install Google Chrome or set CHROME_PATH.`);
    process.exit(1);
  }
}

// demo.json next to recordings/ (or DEMO_CONFIG). Returns {} when there is none.
export function loadDemoConfig() {
  const candidates = [process.env.DEMO_CONFIG, '../demo.json', 'demo.json'].filter(Boolean);
  const file = candidates.find((f) => existsSync(f));
  if (!file) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`${file} is not valid JSON: ${error.message}`);
    process.exit(1);
  }
}

export function windowConfig(name) {
  const windows = loadDemoConfig().windows || {};
  const win = windows[name];
  if (!win) {
    const known = Object.keys(windows).join(', ') || 'none';
    console.error(`unknown window "${name}". Windows in demo.json: ${known}. Add {"windows": {"${name}": {"port": 9333}}}.`);
    process.exit(1);
  }
  return win;
}
