// Project-specific settings, inlined before lib.js in every scene.
const PROJECT = {
  // 'dot' (default) or 'hand', a pointing-hand cursor that presses in on click
  cursor: 'dot',
  // Extra secret patterns (regex sources) and labels whose neighbouring value gets blurred
  maskPatterns: [],
  maskLabels: [],
  // Regex sources for banners, toasts and popups to hide during takes, e.g. 'Enable notifications'
  clutter: [],
  // Frame receiver port (default 8765); set per window when two windows record at once
  // port: 8765,
};
