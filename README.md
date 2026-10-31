# demo-studio

A Claude Code plugin that makes product demo videos. Built for our product demos, so anyone on the
team can ask Claude "make a demo of X" instead of asking the one person who knows the pipeline.

You give Claude a goal (or a brief from a client), log in to a sandbox account, and it plans the
story, records the browser, cuts the videos, writes the voiceover and packages everything for an
editor. All footage is real screen recording; nothing is AI-generated.

## What it makes

| Deliverable | What it is |
| --- | --- |
| Plan | BRIEF, RUN-SHEET (beats and exact on-camera text), SHOT-LIST, VOICEOVER draft, PREP checklist |
| Raw takes | One clean clip per scene: 1920x1080, 30fps, H.264, crisp 2x capture, secrets blurred in the page, logged in `takes.csv` |
| Review reel | The keeper takes joined uncut in story order, for the first review |
| Keynote cut | Optional: footage in a floating rounded window, captions, title cards, eased zooms |
| Promo cut | About 1:30, the story, as numbered clips plus a rough assembly |
| How-to cut | About 3:00, the story plus setup steps and an edge case |
| Voiceover scripts | Spoken lines per scene with start times, a fit check, and a timing preview with a placeholder voice |
| Editor handoff zip | READ-ME-FIRST brief, scripts, clips, uncut source footage by story part, contact sheets, title cards, brand sheet |
| Social versions | Optional 4:5 (1080x1350) and 9:16 (1080x1920) cuts with a caption band |

## Requirements

We use **Playwright** (the Playwright MCP server and `playwright-core`), not Puppeteer.

| Need | Why | Install |
| --- | --- | --- |
| Claude Code with plugin support | Runs the skills | `npm i -g @anthropic-ai/claude-code` |
| GitHub access to this private repo | The plugin installs from it | Ask the owner for a collaborator invite, then be logged in with `gh auth login` or git credentials that can read the repo |
| Node.js 20+ (22 LTS recommended) | Frame receiver, recorder, title cards | `brew install node` |
| Google Chrome | The recorded browser and the title-card renderer | `brew install --cask google-chrome` or google.com/chrome |
| Playwright MCP | Claude drives and records the browser through it | See below |
| `playwright-core` | Used by `rec.mjs` (multi-window recording), `run.mjs` and `title-cards.mjs` | `npm install` in the plugin folder (below) |
| Python 3.10+ | Edit, handoff and QA scripts; standard library only, no pip | `brew install python` |
| ffmpeg with libx264 | All encoding | `brew install ffmpeg` |
| 10 GB+ free disk | Raw frames take several GB per demo | |
| macOS `say` (optional) | Voiceover fit check and timing preview; estimated from word count elsewhere | Built into macOS |
| Sandbox or test accounts (optional, per product) | Everything filmed must be safe to show | Per product |

### Playwright MCP

Add it to Claude Code (user scope), using real Chrome:

```bash
claude mcp add playwright --scope user -- npx -y @playwright/mcp --browser chrome
```

or in your MCP config:

```json
{ "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp", "--browser", "chrome"] } } }
```

Log in to the product's sandbox in the browser that the Playwright MCP opens (not your everyday
Chrome). If you use your own Playwright MCP profile, remember it is logged in as you.

## Install

1. Install the requirements above.
2. In Claude Code:

   ```
   /plugin marketplace add Cyvid7-Darus10/demo-studio
   /plugin install demo-studio@demo-studio
   ```

3. Install `playwright-core` into the plugin folder and run the health check:

   ```bash
   P="$(ls -d ~/.claude/plugins/cache/demo-studio/demo-studio/*/ | tail -1)"
   npm install --prefix "$P"
   bash "$P/scripts/doctor.sh"
   ```

   `doctor.sh` checks every requirement and prints the exact fix command for anything missing.

Working on the plugin itself? Clone the repo, run `npm install` there, and start Claude Code with
`claude --plugin-dir /path/to/demo-studio`.

## Quickstart (5 minutes to the first plan)

1. Make a folder for demos and start Claude Code there: `mkdir -p ~/demos && cd ~/demos && claude`.
2. Ask:

   > Make a demo of the Acme invoice bot. Goal: a sales person turns a chat thread into an invoice
   > in one click. Audience: agency owners. I'm logged in to the sandbox in the Playwright browser.

3. Claude runs the health check, asks one round of questions (accounts, brief, videos wanted), then
   scaffolds `demos/<name>/` and shows you the scene table. Say "go" or adjust it.
4. It preps, records each scene, shows you the review reel, then builds the cuts and the handoff zip.

The skill also triggers on "record a walkthrough of...", "film a product demo...", or "hand these
takes to an editor". See `examples/acme-invoice-bot/` for a filled-in plan.

## Stages

```
 goal or brief
      |
  [plan]      demo-plan     BRIEF, RUN-SHEET, SHOT-LIST, VOICEOVER, PREP, demo.json
      |
  [prep]      demo-plan     sandbox accounts, seeded demo user, reset scripts, smoke run
      |
  [record]    demo-record   2x screencast per scene, secrets masked, contact-sheet QA, takes.csv
      |
  [review]    demo-edit     review reel of keepers, agreed with you
      |
  [edit]      demo-edit     keynote cut (demo.json) / promo + how-to (handoff.json), title cards,
      |                     voiceover fit check, timing preview
  [handoff]   demo-handoff  editor folder + zip, READ-ME-FIRST, brand sheet
      |
  [social]    demo-edit     4:5 and 9:16 versions
      |
  [wrap-up]   demo-handoff  status, throwaways, key rotation, delete frames
```

The `demo-studio` skill orchestrates; each stage has its own skill you can also call directly.

## Repo layout

```
.claude-plugin/   plugin.json, marketplace.json
skills/           demo-studio (orchestrator), demo-plan, demo-record, demo-edit, demo-handoff
scripts/          every tool (recorder, QA, encode, edit, handoff, social, scaffold, doctor)
schemas/          demo.schema.json and handoff.schema.json (the config shapes the scripts check)
templates/        files new-demo.sh copies into a new demo
references/       learnings, scene patterns, voiceover, handoff spec, secrets
examples/         acme-invoice-bot: a small, fully filled fictional demo
tests/smoke.sh    end-to-end test on synthetic footage
docs/             CONTRIBUTING.md
```

## Local editor (coming)

A local browser-based editor (media bin, preview player, timeline, inspector, render button) is
planned under `app/`, started with `npm run studio`. It will read and write the same `handoff.json`
and `demo.json`, and stream the render scripts' `PROGRESS` and `OUTPUT` lines. TODO: not built yet.

## FAQ

**Where do files go?**
Each demo lives in `$DEMO_ROOT/<name>/` (default `./demos/<name>/` under the folder you started
Claude in). Raw takes in `recordings/raw/`, cuts in `recordings/exports/`, the editor folder in
`recordings/editor-handoff/` and the zip next to it. Nothing is written into the plugin folder.

**How long does it take?**
Planning 15 to 30 minutes. Recording about 5 to 10 minutes per scene including QA, so a 10-scene demo
is an afternoon. Rendering is about one second of CPU per second of output for the keynote cut, and
a few minutes for the full handoff.

**How much disk space?**
Have 10 GB free. A 60-second take is 0.5 to 1 GB of frames until it is approved; the encoded clips are
small. Delete `recordings/frames/` after sign-off (Claude asks first).

**How do I re-shoot one scene?**
Ask: "re-shoot scene 04, the bot reply was slow". Claude records a new take (`04-...-t2.mp4`), marks
it `keep` in `takes.csv`, and you rebuild with the same commands. If the scene shows seeded data that
changed, re-shoot every scene that depends on it (the shot list's "Depends on" column).

**How do I change branding?**
Edit `brand` and `cards` in the demo's `handoff.json` (colours, font, logo, taglines), then
`node "$P/scripts/title-cards.mjs" handoff.json` and rebuild. The keynote look's colours and type are
in `scripts/mk-assets.py` and `scripts/build-keynote.py`.

**How do I add voiceover?**
Put a `voiceover` line on each scene in `handoff.json` (spoken English, about 2.5 words per second, no
symbols). `build-handoff.py` checks each line fits and writes the voiceover file with start times for
an AI voice tool. On macOS it also renders a timing preview with a placeholder voice.

**Can I record two people at once (an admin and a member)?**
Yes. `scripts/open-window.sh` opens a Chrome window per person with its own profile; list them in
`demo.json` `windows` and Claude records each with `scripts/rec.mjs`.

**Is it safe to film?**
Only with sandbox or test accounts. Secrets are blurred in the page as they render and every reveal
is checked frame by frame. See `references/secrets.md`.

## Tests

```bash
npm install && bash tests/smoke.sh
```

## License

Proprietary, internal use only. See LICENSE.
