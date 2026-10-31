#!/usr/bin/env bash
# Builds <mcp-out>/scenes/_setup.run.js: clones the logged-in Playwright MCP context into a
# second context at DPR 2 (1440x810 CSS = 2880x1620 capture) and opens one tab per URL.
# Re-run it whenever the MCP browser restarts (the 2x context dies with it).
# DEMO_TIMEZONE (for example Europe/London) and DEMO_LOCALE set the recording context's clock and
# locale, for UI that depends on the time of day.
# Usage: mk-setup.sh <url> [url...]
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: mk-setup.sh <url> [url...]" >&2; exit 1; }
out_dir="${PLAYWRIGHT_MCP_OUT:?set PLAYWRIGHT_MCP_OUT to <session cwd>/.playwright-mcp}/scenes"
mkdir -p "$out_dir"
extra="$(python3 -c 'import json,os; o={k:v for k,v in (("timezoneId",os.environ.get("DEMO_TIMEZONE")),("locale",os.environ.get("DEMO_LOCALE"))) if v}; print(json.dumps(o))')"
urls="$(printf '%s\n' "$@" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"
cat > "$out_dir/_setup.run.js" <<EOF
async (page) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const browser = page.context().browser();
  if (!browser) return { error: 'no browser handle: Playwright MCP runs a persistent context; restart it with --isolated or a CDP endpoint' };
  for (const c of browser.contexts()) if (c !== page.context()) await c.close();
  // Cookies + localStorage from the context the user logged into by hand
  const state = await page.context().storageState();
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, ...${extra} });
  const out = [];
  for (const url of ${urls}) {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => out.push({ url, error: e.message }));
    await sleep(4000);
    out.push({ url, landed: p.url(), title: await p.title(), dpr: await p.evaluate(() => devicePixelRatio) });
  }
  return { cookies: state.cookies.length, tabs: out };
}
EOF
echo "$out_dir/_setup.run.js"
