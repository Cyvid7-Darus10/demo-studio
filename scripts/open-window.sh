#!/usr/bin/env bash
# Opens a separate Chrome window with its own profile and a remote debugging port, for demos that
# film two or more people (rec.mjs and run.mjs attach to it by port). Log in once by hand; the
# profile folder keeps the session for later takes. Keep profile folders out of git.
# Usage (from the demo dir): open-window.sh <name> <port> [url]
set -euo pipefail
name="${1:?window name}"; port="${2:?debugging port}"; url="${3:-about:blank}"
profile="$PWD/.browser-${name}"
if [ -n "${CHROME_PATH:-}" ]; then chrome="$CHROME_PATH"
elif [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else chrome="$(command -v google-chrome || command -v google-chrome-stable || true)"; fi
[ -n "$chrome" ] || { echo "open-window: Chrome not found; install it or set CHROME_PATH" >&2; exit 1; }
if curl -s "http://127.0.0.1:${port}/json/version" >/dev/null 2>&1; then
  echo "open-window: port ${port} is already in use by a debuggable browser" >&2; exit 1
fi
mkdir -p "$profile"
"$chrome" --user-data-dir="$profile" --remote-debugging-port="$port" --no-first-run \
  --no-default-browser-check --window-size=1600,1000 "$url" >/dev/null 2>&1 &
echo "window '${name}' on port ${port}, profile ${profile}"
