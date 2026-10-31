# Editor handoff spec

What the video editor receives, and why each piece is there. `build-handoff.py` produces all of it
from `handoff.json` and the raw takes. The editor should be able to finish the videos without
asking us a single question.

## Layout

```
recordings/editor-handoff/
  1-READ-ME-FIRST.txt        the brief: videos, people, words, how to edit, fixes, do-not-say, claims
  2-PROMO-SCRIPT.txt         scene by scene: voiceover, each clip's start time, speed, on-screen text
  3-PROMO-VOICEOVER.txt      numbered lines with start times, then a full read
  4-HOW-TO-SCRIPT.txt        same for the second video (numbering continues per video)
  5-HOW-TO-VOICEOVER.txt
  PROMO_1m28/                clips cut to in/out and speed, numbered in timeline order
    00_ROUGH-ASSEMBLY.mp4    all clips joined: the intended edit, silent
    01_scene1_<name>.mp4 ...
  HOW-TO_2m56/
  source-footage/<part>/     every uncut take, grouped by story part (handoff.json "parts")
  assets/
    title-cards/card-*.png   placeholder cards with the final wording
    brand/BRAND.txt          names and spelling, colours, fonts, taglines
    logos/                   the logo from brand.logo
    social-captions/         caption bands for the social versions (when rendered)
  reference/
    <VIDEO>-VOICEOVER-TIMING-PREVIEW.mp4   rough assembly + placeholder voice at each line's time
    take-contact-sheets/<take>.jpg         a still every 2s of each uncut take
    (reference_files)                      review reel, style references
  social/<VIDEO>_4x5.mp4, _9x16.mp4        vertical versions (when "social" is set)
recordings/<slug>-editor-handoff.zip       all of the above
```

## Why each piece

| Piece | Why |
| --- | --- |
| READ-ME-FIRST | The editor reads one file first. It says what the videos are, who is on screen, the words to use and avoid, and what to fix. |
| Rough assembly | Shows the intended edit in one file, so the editor copies timing instead of guessing. |
| Numbered clips | Already trimmed and sped up, so the editor drops them on a timeline in order. |
| Script | Timecode per clip plus the on-screen text, so captions and zooms land on the right moment. |
| Voiceover file | Lines with start times for an AI voice tool, plus a full read for one-take tools. |
| Timing preview | Lets everyone hear the pacing before paying for the real voice. |
| Source footage | Uncut takes with handles, grouped by story part, for re-cuts and alternate shots. |
| Contact sheets | Find a moment in a long take without scrubbing. |
| Title cards | Final wording as placeholders; the editor designs over them and does not retype. |
| Brand sheet | Spelling, colours, fonts and taglines in one place, so the copy stays consistent. |
| Social versions | 4:5 and 9:16 starting points for feeds. |
| Claims checklist | Every claim the voiceover makes, ticked against what the footage shows. |
| Secrets note | Blurred areas are deliberate and must stay blurred. |

## Specs

- Clips: 1920x1080, 30fps constant, H.264 CRF 16, yuv420p, silent.
- Raw takes: 1920x1080, 30fps constant, H.264 CRF 14 `-preset slow`, from DPR 2 captures.
- Social: 1080x1350 (4:5) or 1080x1920 (9:16), 30fps, H.264 CRF 16.
- Each raw take starts with 1 to 1.5s of stillness and ends with a 2 to 3s hold.

## Keynote-only handoff

For a single keynote cut from `demo.json` (no promo/how-to split), `keynote-handoff.py` writes
`<demo>/editor-handoff/` with the final cut, raw footage in story order, the rendered segments,
graphics, SCRIPT.txt and VOICEOVER.txt.

## Before sending

- [ ] `voiceover fits` printed by build-handoff.py
- [ ] Rough assemblies watched end to end
- [ ] Contact sheets checked for secrets and personal data
- [ ] READ-ME-FIRST has fixes, do-not-say and the claims checklist filled in
- [ ] Zip size is reasonable for the transfer method (source footage dominates; drop parts if needed)
