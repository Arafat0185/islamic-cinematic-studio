# Engineering notes

The hardest problems met while building the studio, and how each one was solved. Every film is rendered
frame by frame from code (Remotion + Three.js) on a Windows laptop with an **integrated Radeon 760M GPU**.
That one constraint shaped most of the decisions below.

---

## 1. Memory-bounded chunked rendering on an integrated GPU

**Problem.** A 60–115 s film at 1080 × 1920 is 1,800–3,500 WebGL frames, each one pushed through a multi-pass
post stack. Rendered in a single headless-Chrome process, memory climbs until Chrome dies ("Target closed"), or the
OS kills the job under memory pressure. One crash used to throw away the whole render.

**What was measured first**
- 1 browser tab (`Config.setConcurrency(1)`). Six tabs ran about 3× *slower* on the shared-memory GPU, and two tabs
  crashed Chrome.
- The installed Chrome with the ANGLE GL backend, and a 120 s render timeout per frame.
- `TEMP`/`TMP` redirected into the project: each render bundle copies the assets folder, and that filled the system drive.

**Solution: [`engine/tools/render-chunks.mjs`](../engine/tools/render-chunks.mjs)**
- The film is split into fixed chunks (300–600 frames). **Each chunk renders in its own process**, so all memory is
  released between chunks.
- Each chunk's frame count is checked with `ffprobe` (which prints e.g. `600,`, so the output is parsed defensively).
  A half-written chunk from a killed run is deleted and rendered again. Finished chunks are never redone.
- `--max N` renders N chunks and exits with code 3 ("more to do"). Long renders run as short foreground slices that
  each finish well inside the OS's memory budget, and a crash costs at most one chunk.
- The chunks are joined **losslessly** (stream copy, no re-encode), then the audio is muxed in. The joined file's frame
  count must equal the composition's exactly.
- [`render_retry.sh`](../engine/tools/render_retry.sh) adds automatic retry: if a pass fails, it starts again with
  smaller chunks (600 → 400 → 300 → 200 → 150 → 100).

Because every frame is a pure function of its frame number (no wall clock, no `Math.random()`, seeded hashes
everywhere), chunks rendered hours apart join without a visible seam.

## 2. Aliasing, z-fighting and flicker

Phone screens are unforgiving: anything that shimmers between frames looks cheap. The fixes:

- **Character cards shrink smoothly.** The 2D characters are canvas drawings on 3D planes. The canvas is always
  larger than it appears on screen, then mipmapped with trilinear filtering and maximum anisotropy
  ([`render/card.ts`](../engine/src/render/card.ts)). The one exception is the soft contact shadow, which has no
  mipmaps, because at grazing angles the mip chain averaged the blob with its white surround and made it vanish.
- **Z-fighting removed by construction.** Decals that lie on other surfaces (the glowing floor grooves, card shading
  layers) use `polygonOffset` instead of tiny position nudges, so they hold at every camera distance.
- **Procedural patterns are computed, not textured.** The star-tile floor shader computes the tile geometry
  mathematically, so the glowing grooves line up with the painted tiles at any resolution, with no texture
  sampling shimmer.
- **Noise-free depth of field.** The lens blur uses a fixed sample pattern renormalised by the accepted weights.
  There is no per-pixel random jitter, so there is no frame-to-frame crawl
  ([`render/lensblur.ts`](../engine/src/render/lensblur.ts)).
- **Anti-aliased ink outlines.** The outline mask is tent-filtered (1-2-1) before compositing, and the ink is blended
  in display gamma, like hand-drawn Canvas2D lines ([`render/ink.ts`](../engine/src/render/ink.ts)).
- **The red-streak bug.** Pool reflections showed red streaks. three.js's `Reflector` tints its reflection with an
  overlay blend, which pushes warm lamp-lit edges toward red. It was replaced with a gentle desaturate-and-cool water
  tint.
- **Automated detection.** [`short_qa.py`](../engine/tools/short_qa.py) flags frozen spans, white and black frames,
  and unplanned frame-difference spikes ("pops") against each shot's motion baseline. Planned cuts and lightning are
  whitelisted from the shot list.

## 3. The 45-degree camera rule for 2D cards

**Problem.** A flat character card in a 3D world falls apart when the camera looks down on it steeply: it reads as
a sheet of paper lying in the scene.

**Solution**
- Cards are yaw-billboarded toward the camera, and a turn swaps to a different drawing (front, three-quarter, back)
  instead of squashing the card.
- **No shot that frames a character may look down more than 45°.** Every film's timeline exposes a `pitchAt(frame)`
  function. A pitch report renders one still and scans *every frame of every character shot*, then reports the
  steepest look and where it happens. It runs in QA before each release; the latest film peaks at 42.3°.
- **Camera collision** ([`camera/collision.ts`](../engine/src/camera/collision.ts)) raycasts from the subject to the
  camera and pulls the camera in front of any wall, shelf or prop in between. Objects that are hidden or move through
  the shot on purpose (crumbling props, a press plate, a book the camera dives into) are tagged `noCollide`. A
  report lists every correction and every object the camera passes through.

## 4. Caption sync: Whisper + breath detection

**Problem.** Captions must land on the exact word the reciter is saying. Recitations are melodic, with long
held vowels, phrases repeated, and room tone or crowd noise underneath. Plain silence detection finds no gaps at all.

**Solution**
- Local **Whisper** inference gives word-level timestamps ([`align_words.py`](../engine/tools/align_words.py)).
  When Whisper's words and the script disagree, the script's words win and Whisper only supplies the timing.
- Phrase starts are then **snapped to the reciter's breaths**. These are found as dips in the voice-band loudness
  (150–3,500 Hz, 10 ms hops) relative to a rolling floor, followed by the next voice onset
  ([`build_quran_timing.py`](../engine/tools/build_quran_timing.py)). Where the reciter joins two phrases without a
  breath, the snap is constrained to a window after the previous phrase.
- Videos end *inside* a breath, so a platform's audio cut never lands mid-word.
- For videos narrated by an external voice, QA proves the narration is **not** in the upload file. It correlates the
  loudness envelope of the upload mix and of the preview mix against the narration track. The upload must be
  near zero (+0.05) and the preview near one (+0.96).

## 5. Scripture verification against the quran.com API

**Rule:** no Quran text, hadith or scholarly quote is ever typed by hand, and nothing is written from memory.

- The Uthmani Arabic and the Saheeh International translation are fetched from the **quran.com API** and stored
  as raw JSON in each film's `quran/` folder. Hadith come from a hadith API (`hadith/`).
- The timing builders **assert** that every caption is an exact substring of the saved API text. Translator footnote
  markers are stripped, nothing else is changed. A build with a mismatched caption fails.
- QA re-checks the rendered captions against the same JSON before upload.
- Scholarly quotes that show Arabic use exact slices of a traced source, with the copied text and its URL recorded
  in `references.yaml`. Quotes whose wording could not be traced are labelled **"attributed"** on screen and shown
  in English only.
- Every source is recorded in the film's `references.yaml` with its reference, grade and grader where applicable,
  link and exact translation. Nothing ships until a human reviewer sets `approved: true`.

## 6. Content rules enforced in code

- **Faceless characters.** The character drawing code has no face features at all: no eyes, nose, mouth or brows.
  Emotion comes from posture, hands, camera and light.
- **No depiction** of Allah, prophets or angels, not even as light. Scenes about Paradise or the unseen use objects,
  places and light only. Named Companions and the Prophet's family are not portrayed.
- **No music or instruments.** Every sound effect is synthesised from noise (risers, shimmer, wind, rain, foley),
  never from tonal or instrument samples. The mix tools build each sound from filtered noise and envelopes.
- **Loudness and safety limits** are checked automatically: integrated LUFS, true peak under −1 dBFS, no black
  stretch over 0.3 s, no silence over 0.5 s.

## 7. Smaller problems worth recording

- **Captions never exceed two lines.** Lines never wrap. Each line is measured with the real font, and a phrase that
  does not fit is split into two consecutive captions. A check fails the render if the split phrases ever stop
  matching the source text exactly.
- **Fonts before frames.** Renders wait until the OFL fonts (Inter, Amiri, Cormorant Garamond) have loaded, so no
  frame is drawn in a fallback font. The ﷺ sign inside English captions falls back to Amiri, because Inter has no
  glyph for it.
- **Refactors verified byte for byte.** When the courtyard's construction was moved into a reusable module, the
  beauty stills were re-rendered and compared byte for byte with the originals before the change was kept.
- **Limiter make-up gain.** The audio limiter normalises its ceiling to 0 dBFS, so the headroom is applied inside the
  mix loop. Otherwise a −20 LUFS sound-design bed would quietly come out hot.
- **Page-dive transitions (video 004).** The 3D picture is clipped to a page-shaped window with a CSS `clip-path`.
  The window opens to full frame while an ink filter (greyscale, sepia, contrast) fades out, so a drawing printed in
  a book appears to come alive as the camera pushes through the paper.
