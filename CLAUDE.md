# Islamic Cinematic Studio

Read this first. Full detail lives in `docs/phase-1-plan.md` and `characters/traveller/DESIGN.md`.

## What this project is
- A studio for short Islamic cinematic videos (about 65–90 s each), built with **Remotion** (React → video) and
  **Three.js** (3D).
- Technique: **flat 2D faceless characters standing inside lit 3D environments**, with cinematic camera moves.
- The engine is adapted from the MIT-licensed **claude-animated-shorts** project. Keep its copyright notice in any
  copied file (see `NOTICE.md`).
- Original kept separately at `..\reference\claude-animated-shorts` (read-only, do not edit).
  Scratch render tests live at `..\reference\scratch-render`.
- Never copy the original's `references/` screenshots into this repo; they are another creator's frames.

## Content rules (non-negotiable)
- **Faceless characters only:** blank face, no eyes, nose, mouth, brows or lips. Emotion comes from posture,
  hands, camera and light.
- **Never depict** Allah, any prophet (including the Prophet ﷺ), or angels, not even as light or a glow.
  Avoid portraying named Companions or the Prophet's family; use places and objects instead.
- **Never invent** Quran text, hadith, or scholarly quotes. Never write them from memory.
  Quran Arabic and translation come verbatim from Quran.com or Tanzil.
- **Every source needs a reference and a grade:** source, number, grade, grader, link, exact translation,
  recorded in the video's `references.yaml`. Only sahih or hasan hadith. Unchecked sources are marked **verify**.
- Audio is instrument-free by default (voice, ambience, a soft signature sound).

## Brand
- **Concept A, "The Courtyard":** every video happens in one imagined, empty courtyard and the rooms around it.
  Time of day mirrors the theme (pre-dawn for salah, night rain for tawbah, dusk stone room for death).
  Desert exteriors may be borrowed for death and sabr stories.
- **Palette:** night indigo `#0E1430`, lapis `#1F3B73`, limestone `#D9CBB0`, lamp gold `#E8B04B`,
  dawn rose `#C98B7A`.
- **Fonts:** Amiri or Noto Naskh Arabic (Arabic), Cormorant Garamond (English titles), Inter (subtitles).
- **The Traveller (v7, locked):** the recurring protagonist. Calm faceless man, 6 heads tall.
  - Skin `#C08A5E`, sand thobe `#CDB58C`, indigo shawl `#363C58`, off-white kufi `#F2EEE3`,
    near-black beard `#1A1416`, sandals `#6B4A33`, ink outlines `#241726`.
  - Head width 0.75 × height, slim jaw, rounded chin beard ("beard B"), snug kufi that never crosses the face.
  - Code: `engine/src/characters/traveller.ts`. Any redraw must match `characters/traveller/DESIGN.md` exactly.

## Machine notes (from the scratch project, Windows, Radeon 760M integrated GPU)
- **1 browser tab:** `Config.setConcurrency(1)`. 6 tabs was ~3× slower; 2 tabs crashed Chrome ("Target closed").
- **Use installed Chrome:**
  `Config.setBrowserExecutable("C:/Program Files/Google/Chrome/Application/chrome.exe")`.
- **WebGL:** `Config.setChromiumOpenGlRenderer("angle")`, plus `setDelayRenderTimeoutInMilliseconds(120000)`.
- **TEMP inside the project:** point `TEMP`/`TMP` at `.remotion-tmp` in the project folder before rendering
  (add it to `.gitignore`). Each render bundle copies the assets folder, which can fill the system drive.
- Use `--scale=0.5` previews for checks; full-quality renders are slow (~10 min).

## How to work with me
- I'm a beginner: explain simply, define jargon the first time, and say what a command does before running it.
- **One feature per git branch.** Branch off `main`, merge when it works.
- npm packages are fine to install. **Ask before installing anything else** (Python, system tools, fonts,
  browser builds, global installs).
- Preview the result (a still frame or low-res render) before calling visual work done.
