# Secrets in demo footage

One unmasked frame is a leak. Video gets downloaded, re-posted and paused frame by frame, and a
blurred-in-post box that starts one frame late shows the whole token.

## Rules

1. **Sandbox or test accounts only.** Never film a production account with real money, real
   customers or real personal data. If the product has no sandbox, use a dedicated demo account
   with seeded mock data.
2. **Mask in the page, not in post.** `lib.js` installs `MASK_FN` on every page load in the
   recording context. It CSS-blurs token-shaped text and inputs the moment they render, so the blur
   follows scrolling and animation. Post-encode blur boxes start late (the reveal paints before the
   box timestamp) and do not follow scrolling.
3. **Teach the mask the product's secrets before the first take.** Add token shapes to
   `PROJECT.maskPatterns` (regex sources) and form labels to `PROJECT.maskLabels` in
   `recordings/scenes/_project.js`. The init script is installed once per context, so after changing
   them re-run setup to get a fresh context.
4. **Canvas UIs cannot be masked in the DOM** (terminals, hosted consoles, some editors). Keep secrets
   out of them, or use `blur(locator, since)` / `blurRect(x, y, w, h, since)` with `since = now()`
   taken **before** the click that reveals the secret. These write `blur.jsonl`, which
   `encode-take.sh` applies through `blur-filter.py`.
5. **Verify, don't trust.** After every take that could show a secret, build a zoomed contact sheet
   across the reveal with `every=1` and a crop, and look at every frame:
   `python3 "$P/scripts/tile-frames.py" frames/_tmp05 8 14 /tmp/check.png every=1 cols=6 crop=1400:500:700:600`
   `maskedSummary(p)` in the scene returns the first 6 characters of what the mask caught, so the
   scene can assert before recording ends.
6. **Never open "Edit as JSON", "raw" or "reveal" views** of secret stores on camera.
7. **Privacy is part of it.** Blur or hide sidebars with other chats, real names, emails, avatars,
   notification previews and browser profile pictures. Add their selectors or text to the clutter list.
8. **Never commit secrets.** The only place a secret may live in a demo folder is a gitignored
   `app/.env`. Not in README, PREP, scene bodies, `_project.js`, takes.csv notes or chat.
   Passwords stay in a password manager; write where to find them, not what they are.
9. **THROWAWAYS.md.** Every key, app, repo, channel, user or record created on camera goes in
   THROWAWAYS.md the moment it exists, with its id. Delete them after sign-off, and revoke any key
   that appeared on screen even blurred.
10. **Rotate what was shared.** If anyone pasted a key into the chat with Claude, tell them to
    rotate it when the shoot is done.

## The editor hears this too

The handoff README tells the editor that blurred areas are deliberate: do not sharpen or unblur
them, and keep the blur when re-cropping or zooming. Anything the editor must crop (a test-mode
banner, a sandbox entity name) goes in `brief.fixes` in handoff.json.
