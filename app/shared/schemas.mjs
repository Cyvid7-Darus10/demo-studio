// Node-side schema loader; the browser imports the same JSON files through Vite.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeValidator } from './validate.mjs';

const load = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../schemas/${name}.schema.json`, import.meta.url)), 'utf8'));

export const validators = {
  handoff: makeValidator(load('handoff')),
  demo: makeValidator(load('demo')),
};
