// Writes JSON with 2-space indentation, keeping small objects and arrays on one line so
// hand-written handoff.json and demo.json stay readable and diffs stay small.
export const LINE_WIDTH = 120;

function inline(value) {
  if (Array.isArray(value)) return value.length ? `[${value.map(inline).join(', ')}]` : '[]';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
}

function render(value, depth, prefixLength) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const pad = '  '.repeat(depth);
  const flat = inline(value);
  if (depth > 0 && pad.length + prefixLength + flat.length <= LINE_WIDTH) return flat;
  const inner = '  '.repeat(depth + 1);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return `[\n${value.map((v) => inner + render(v, depth + 1, 0)).join(',\n')}\n${pad}]`;
  }
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  const lines = entries.map(([k, v]) => {
    const key = `${JSON.stringify(k)}: `;
    return inner + key + render(v, depth + 1, key.length);
  });
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

export function formatJson(value) {
  return `${render(value, 0, 0)}\n`;
}
