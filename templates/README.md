# <demo-name>

**Goal:** <what the viewer should be able to do or believe after watching>
**Audience:** <who watches, what they already know>
**Source:** <repo or product URL> (cloned into `app/` if we run our own copy)
**Recorded:** <dates>

## Deliverables

- [ ] Raw takes: `recordings/raw/`, logged in `recordings/takes.csv`
- [ ] Review reel: `recordings/exports/review-reel.mp4`
- [ ] Keynote cut (optional): `recordings/exports/<slug>-keynote-cut.mp4`
- [ ] Promo (~1:30) and how-to (~3:00) cuts with scripts and voiceover: `recordings/editor-handoff/`
- [ ] Social versions (optional): `recordings/editor-handoff/social/`
- [ ] Handoff zip: `recordings/<slug>-editor-handoff.zip`

## Status

- [ ] Brief agreed (`BRIEF.md`)
- [ ] Run sheet and shot list agreed (`RUN-SHEET.md`, `SHOT-LIST.md`)
- [ ] Prep done and smoke run passed (`PREP.md`)
- [ ] Scenes recorded and QA'd
- [ ] Editor handoff built, voiceover fits
- [ ] THROWAWAYS.md cleaned up after sign-off
- [ ] `recordings/frames/` deleted after sign-off

## Accounts and ids (no secrets here)

| What | Value |
| --- | --- |
| | |

Secrets live only in `app/.env` (gitignored) or the platform's secret store. Passwords stay in a
password manager, never in this folder.

## How to re-shoot

- Reset data: <command, for example `node tools/reset.mjs`>
- Scenes that depend on each other: <for example 04 to 07 share one invoice number>

## Local changes to the app

- none yet
