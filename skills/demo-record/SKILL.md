---
name: demo-record
description: Record demo footage scene by scene. Sets up the 2x Playwright recording rig and frame receiver, writes and wraps scene bodies, drives the logged-in browser (or several demo windows) with human-looking pointer and typing, masks secrets in the page, QAs frames on contact sheets, encodes 1080p 30fps takes, keeps the take log and handles re-shoots. Use when recording, re-shooting or QA-ing demo takes.
---

# Demo record

`P` is this plugin's root, `${CLAUDE_PLUGIN_ROOT}` (if unfilled, `ls -d ~/.claude/plugins/cache/*/demo-studio/*/ | tail -1`).
Read `$P/references/learnings.md` and `$P/references/secrets.md` first. Scene code examples are in
`$P/references/scene-patterns.md`.

## 1. Rig (once per browser session)

```bash
export PLAYWRIGHT_MCP_OUT="$PWD/.playwright-mcp"   # the Claude session's cwd, NOT the demo dir
cd <demo>/recordings && node "$P/scripts/frame-receiver.mjs" .   # run_in_background: true
DEMO_TIMEZONE=Europe/London bash "$P/scripts/mk-setup.sh" https://site-a/... https://site-b/...
```

Call `browser_run_code` with `filename` set to the printed `_setup.run.js`. It clones the logged-in
MCP session into a DPR 2, 1440x810 context with one tab per URL and reports where each tab landed.
If a tab landed on a login page, ask the user to log in **in the MCP browser** (not their everyday
Chrome), then re-run setup. Re-run setup whenever the MCP browser restarts.

Optional, to keep payloads small: `bash "$P/scripts/mk-lib.sh"` then run `_lib.run.js` once, and wrap
scenes with `--use-lib` below. Re-run it after every setup.

**Multi-person demos** (two people in a chat, an admin and a member): open one Chrome window per
person with `bash "$P/scripts/open-window.sh" <name> <port> <url>`, have the user log in once in each,
list them under `windows` in demo.json, and record with `node "$P/scripts/rec.mjs" <name> scenes/<body>.js`
instead of the MCP. Use a separate `rx_port` (and a second receiver with `DEMO_RX_PORT`) to film two
windows at once. `node "$P/scripts/run.mjs" <name> <script.mjs>` runs off-camera helpers in a window.

Before filming, check: `df -h` has 10 GB or more free (the receiver refuses below 4 GB), only one
instance of any bot or server runs, seed data exists and stray test data is cleared, and the smoke
run passed.

## 2. Shoot one scene per run

1. **Scout** an unfamiliar UI first: a body that returns button labels plus a screenshot.
2. **Write** `recordings/scenes/<NN-name>.body.js`: `prep(p)`, `ensure(p, urlPart)`,
   `stop = await record(p, '_tmpNN')`, the actions with `glide`/`click`/`typeHuman`, `park`, a hold,
   `stop()`, and return a summary (frames, latencies, what the mask caught).
3. **Wrap and run:** `bash "$P/scripts/mk-scene.sh" <NN-name>` (add `--use-lib` if installed), then
   `browser_run_code` with the printed filename. For windows: `node "$P/scripts/rec.mjs" <window> scenes/<NN-name>.body.js`.
4. **QA the raw frames before encoding:**
   `python3 -I "$P/scripts/tile-frames.py" frames/_tmpNN 0 30 /tmp/sheet.png every=8` and read the image.
   Check framing, clutter, pointer placement, whether the action completed, and **every frame across
   any secret reveal** (`every=1` with a crop).
5. **Encode:** `bash "$P/scripts/encode-take.sh" frames/_tmpNN NN-scene-name "what happened, latencies"`.
   Writes `raw/NN-scene-name-tN.mp4` (1920x1080, 30fps, CRF 14), moves the frames to
   `frames/NN-scene-name-tN`, and appends a `takes.csv` row with status `new`.
6. **Log:** set the row's `status` to `keep`, `alt` or `reject` with a reason in the notes. One `keep`
   per scene. Note trims ("wait 12s before reply, trim") for the edit.
7. **Throwaways:** record every item created on camera (apps, keys, repos, channels, records) in
   THROWAWAYS.md right away, with its id.

Contact sheet of an encoded take: `bash "$P/scripts/sheet.sh" raw/<clip>.mp4 /tmp/x.png 2`.

## 3. Masking secrets

- Token shapes and labels go in `_project.js` before the first take (`maskPatterns`, `maskLabels`).
- `prep(p)` applies the mask; call `maskSecrets(p)` again on pages that were already open.
- Canvas or image secrets: `const since = now()` before the revealing click, then
  `blur(locator, since)` or `blurRect(x, y, w, h, since)`. These become post-encode blur boxes.
- Return `maskedSummary(p)` from the scene and check it caught the token prefix.
- One unmasked frame is a leak: re-shoot rather than patch.

## 4. Re-shoot rules

- Re-shoot a take when the action failed, clutter showed, the pointer covered the content, a secret
  was visible for even one frame, or the timing is unusable. The next take number is automatic.
- If seed data changed, re-shoot **every scene that depends on it** (the shot list's "Depends on"
  column) so numbers match across scenes. Run the reset script between takes.
- Keep the "use" scenes in one continuous pass so ids, names and amounts line up.
- Keep frames until the take is approved; re-encodes are cheap, re-shoots are not.

## 5. Done when

Every scene has one `keep` take, THROWAWAYS.md is current, and the review reel (demo-edit) has been
shown to the user.
