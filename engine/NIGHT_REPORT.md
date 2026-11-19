# Night report (2026-11-19)

All work is on the `phase-2-engine-core` branch, committed and pushed after each task. Nothing was merged or pushed
to `main`. The only installs were npm packages (three font packages). Nothing outside `engine/out` was deleted.

## What was done

| # | Task | Commit | Result |
|---|---|---|---|
| 0 | Commit the beauty-shot courtyard | `b5d8684` | Already committed and pushed before tonight, with exactly that message. Nothing to do. |
| 1 | Polish | `c8c25f7` | Fountain filled nearly to the brim; the red streaks in the low shot fixed; leafy shrubs; softer sleeves; back-of-head hair band. |
| 2 | Captions | `dfbec92` | Phrase-by-phrase captions with keyword colours; OFL fonts from npm. |
| 3 | Arabic line, source tag, sources card | `e8e7dc2` | All three components, plus sample stills. |
| 4 | Brand pieces | `d4d5e02` | Signature opening, star-wipe transition, signature ending. |
| 5 | Mercy effect | `3945de2` | Lights rise and fill empty tile stars one by one. |
| 6 | BrandToolkitDemo (25 s) | `317c79a` | Every piece in the courtyard with the Traveller. |
| 7 | Renders | (outputs are not committed: `engine/out` is ignored by git) | 9 full-size stills `out/toolkit_*.png` and `out/toolkit_demo.mp4` (1080 x 1920, 750 frames, 25.0 s, 21.6 MB). |
| 8 | This report | (this commit) | |

### Details worth knowing

- **Red streaks (task 1):** they were the lamp-lit orange arch edges reflected in the pool. three.js's `Reflector`
  tints its reflection with an "overlay" blend, which pushes warm colours to red. Replaced with a gentle
  desaturate-and-cool water tint (`scenes/courtyard-beauty/set.ts`, `fountain`).
- **Captions (task 2):** at most 2 lines is guaranteed: lines never wrap, the font steps down from 58 to 42 px if
  needed, and a phrase that still does not fit must be split. The hadith quote is too long for 2 lines, so it is
  shown as **two consecutive phrases** that together are exactly the quote (a check in `content.ts` fails the
  render if they ever stop matching). Centred at 66 % of the frame height; 6-frame fades.
- **Fonts:** `@fontsource/inter`, `@fontsource/cormorant-garamond`, `@fontsource/amiri`, all SIL OFL 1.1, pinned to
  5.3.0. Renders wait until the fonts have loaded. The ﷺ sign inside English captions is drawn by the browser from
  Amiri (Inter has no glyph for it); it renders correctly.
- **Text accuracy (task 6):** every English line in the demo is in `engine/src/scenes/toolkit/content.ts`, copied
  from `videos/001-the-first-question/script.md` and `references.yaml` on `main`. I checked mechanically that each
  line appears word for word in those files. No other Quran, hadith or Arabic text was typed. The only Arabic is the
  single word الصلاة.
- **Brand floor effects (tasks 4-5):** one floor shader computes the star-tile pattern mathematically, so the
  glowing grooves line up exactly with the painted tiles at any resolution.
- **Refactor:** the rich courtyard's construction moved to `scenes/courtyard-beauty/world.ts` so the demo can reuse
  it. I verified the beauty stills render byte-for-byte identically before and after.

## Skipped or interrupted

- No task was skipped, and nothing failed three times.
- **The video render was stopped by Claude Code** because the computer ran low on memory. The render had already
  finished writing `toolkit_demo.mp4` (the log shows it complete); only the check after it was cut off. I checked the
  file afterwards: 750 frames, 25.0 s, 1080 x 1920, so it is complete. If it ever needs redoing:
  `npm run toolkit` (about 10 minutes; close other heavy programs first).
- **Not re-rendered:** because memory was short, I did not start more renders afterwards. `beauty_wide.png`,
  `beauty_low.png` and `beauty_close.png` are therefore from yesterday, **before** tonight's polish (the full pool,
  the fixed reflections and the leafy shrubs). Run `npm run beauty` (about 30 s) to refresh them. The pose sheet
  already includes tonight's changes.

## Files to look at

Renders (in `engine/out`):
- `toolkit_demo.mp4`: the 25 s demo (full size, 1080 x 1920)
- `toolkit_opening.png`, `toolkit_grooves.png`: darkness, the lamp ignites, light runs along the tile grooves
- `toolkit_captions.png`: the hook caption with "first" in gold
- `toolkit_wipe.png`: the star wipe mid-flip
- `toolkit_hadith.png`: Arabic line, exact quote (first half), source tag
- `toolkit_warning.png`: "failed" and "lost" in red
- `toolkit_mercy.png`: empty tile stars (dark sockets) being filled by rising lights
- `toolkit_ending.png`: camera above the courtyard, the star mark tracing itself, "stand up" in green
- `toolkit_sources.png`: the sources card
- `pose_sheet.png`: includes tonight's softer sleeves and back-of-head hair band
- `toolkit_low` view of the polished pool: see `toolkit_warning.png` (the pool is in the foreground); the `beauty_*.png`
  stills are older, see above

Code:
- `engine/src/text/`: Captions, ArabicLine, SourceTag, SourcesCard, fonts
- `engine/src/brand/`: floorFx, levels, sequences, StarWipe, mercy
- `engine/src/scenes/toolkit/`: `content.ts` (all demo text), `timeline.ts`, `BrandToolkitDemo.tsx`
- `engine/README.md`: updated with the new commands and folders

## Needs your decision

1. **Arabic in the real video.** The demo shows the single word الصلاة above the hadith caption, only to
   demonstrate the Arabic line component. In video 001 the Arabic must be the hadith's own Arabic text, copied
   verbatim from sunnah.com (still a TODO in `references.yaml`). Please do not ship the demo's Arabic as-is.
2. **Sources card wording.** It says "DRAFT · NOT YET REVIEWED", because `references.yaml` has
   `reviewer.approved: false`. Tell me the wording you want once a reviewer has signed off.
3. **Keyword colours I chose.** The script names "first" (gold), "succeeded" (green), "lost" (red) and "voluntary
   prayers" (gold). I also coloured "mercy", "completed" and "his Salat" gold, "failed" red, and "stand up" green,
   following your colour rules. Change any of them in `content.ts`.
4. **Where the hadith is split.** It is shown as "…will be called to account" / "on the Day of Resurrection is his
   Salat." Say if you prefer another break.
5. **Back of the head.** As asked: skin under the kufi, hair as a band across the back and nape. At small sizes the
   dark lower band can read a little like a beard seen from the front. Worth a look on the pose sheet.
6. **The mouth gap at close-up** (from yesterday): in the beauty close-up the small gap in the beard reads a bit like
   an oval mouth. It is the locked v7 design, so I left it.
7. **Caption over the mercy effect.** In the mercy shot the caption sits over the floor where stars flare. It stays
   readable (it has a shadow), but a framing with the effect higher in the picture may be cleaner.
8. **Merging.** `main` still has no engine; all of it lives on `phase-2-engine-core`. Merging is your call.
