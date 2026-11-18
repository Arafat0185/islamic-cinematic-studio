# Islamic Cinematic Studio — Phase 1: Research, Creative Direction & Technical Plan

Nov 18, 2026 · @Arafat

## Summary

The original project is a strong technical engine but the wrong creative template for you: keep its pipeline (Three.js inside Remotion, timeline-driven shots, post-processing, synthesized sound, automated QA) and redraw its characters and worlds for your stories. Its core technique, flat 2D characters inside a 3D world, carries over directly; the characters are redrawn as faceless Muslims (section 4b). Its style, story code and script formula need replacing.

What I inspected: I opened the ZIP you uploaded (98 files) and read README.md, SKILL.md, LICENSE, every file in `templates/scripts/`, `Bridge.tsx`, `story.ts`, `lights.ts`, `toon.ts` (header), the audio `timeline.py`, `mix.py` and `cues.md`, `STYLE_BIBLE.md`, the shared research brief `CONTEXT.md`, and one reference frame. I skimmed the remaining code by its imports and exports. I did not read the seven long research reports line by line.

Five things to know before anything else:

- **The repo is not a runnable project on its own.** It has no `package.json`, no `Root.tsx`/`index.ts`, and no `public/` assets. The 3D props it loads (Kenney `.glb` models) and the voice files are not included. You set up a fresh Remotion project and drop these files in.
- **It was built on Windows** (hard-coded Chrome path, C:/D: drive notes). Paths need adjusting on Mac or Linux.
- **Its own rules conflict with yours.** SKILL.md says "no captions" and "music +3 dB"; you need subtitles, and many Muslim viewers prefer no instruments. Both rules get replaced.
- **Do not copy `references/` into your repo.** Those 38 frames and 20 contact sheets are screenshots of another creator's channel, included "for style study only". Your public portfolio should contain none of them.
- **The code is MIT-licensed**, so you may reuse and modify it, provided you keep the copyright notice in any copied files.

## 1. How the original project works

It is a Claude skill: an instruction manual (`SKILL.md`) plus the full source code of one finished video, which Claude Code follows to build a 55–70 second vertical cartoon short entirely from code on your own computer. No AI video generator is involved; every frame is drawn by a program.

### The five ideas you need first

- **Claude skill.** A folder Claude Code reads before a task. `SKILL.md` starts with a name (`cartoon-3d-short`) and a description; when your request matches the description, Claude loads the file and follows its rules. You install it by copying the folder to `~/.claude/skills/cartoon-3d-short/`. It runs in Claude Code on your computer, not in this browser chat.
- **Three.js.** A JavaScript library for drawing 3D scenes in a web browser. Think of it as a virtual film set: you place buildings, lights and a camera, and it photographs the scene.
- **Remotion.** A tool that turns web code (React) into video. In Remotion a video is a function: "given frame number N, draw this picture". It opens a hidden Chrome browser, draws every frame, and stitches them into an MP4.
- **@remotion/three.** The bridge between the two. On every frame Remotion tells the 3D set "it is frame 812"; the set moves everything into place, and Remotion takes the picture.
- **Post-processing.** Filters applied to each finished image, like photo filters stacked in order: black ink outlines, lens blur, glow (bloom), tone mapping, then a colour grade.

### What is in the folder

| Path | What it is | Size |
| --- | --- | --- |
| `SKILL.md` | The skill: pipeline, rules, fixes, final look values | 1 file |
| `templates/bridge/` | Full source of the bridge short (the animation engine) | 13 TypeScript files, \~4,800 lines |
| `templates/audio/` | Sound effects, music, final mix | 7 Python files, \~2,500 lines, plus `cues.md` |
| `templates/scripts/` | Still renders, side-by-side sheets, merging, frame-by-frame QA | 5 small helpers |
| `templates/SCRIPT_example.md` | The bridge script with facts and source at the top | 22 lines |
| `templates/sandbox_index_example.tsx` | Entry file for rendering an isolated test copy | 7 lines |
| `references/STYLE_BIBLE.md` | Script and visual formula measured from 20 shorts of another channel | 44 lines |
| `references/reports/` | Seven measured reports (motion, depth, textures, characters, lighting, outlines, grade) plus a shared brief | \~4,400 lines |
| `references/frames/`, `references/sheets/` | 38 frames and 20 contact sheets of the other channel | 58 images |

### The engine, file by file

| File | Its job, in plain words |
| --- | --- |
| `Bridge.tsx` | The main video. Wires the 3D scene to Remotion and sets the filter order: ink, lens blur, bloom, tone map, grade. |
| `story.ts` | The director's script in code: 15 shots with start/end frames, camera moves, crossfades, a white flash, blur per beat, all timed to the narration. |
| `world.ts` | Builds and poses the set every frame: sky, fog, river, sun direction. |
| `build.ts` | Places the town and 3D props; removes anything that blocks a camera. |
| `paint.ts` | Paints textures (brick, stone, planks, water) with code instead of photos. |
| `lights.ts` | Two lighting moods, "day" and "golden", as lists of colours and angles. |
| `shade.ts` | Cartoon-style two-tone shading. |
| `toon.ts`, `cast.ts`, `cardshade.ts` | Draw the flat 2D cartoon people, stand them in the 3D world, animate walking and blinking, and light them. |
| `ink.ts` | Draws the black outlines on the 3D world. |
| `lensblur.ts` | Depth of field (background blur), plus an unused film grain. |
| `grade.ts` | Final colour grade per lighting mood. |

### How the animation works

Nothing is keyframed by hand in a visual editor. For each frame number the code asks: which shot is this (`SHOTS`)? What is the story time? Where is every object (small maths functions, e.g. how much the bridge bounces)? Where is the camera (`CAMS`)? Then it renders and applies the filters. The camera follows measured rules: smooth glides of 18–40 frames, a slow push-in during every hold so nothing looks frozen, short shakes on impacts, and crossfades when the place or time changes.

### How rendering works

- **Quick checks:** `bridge-stills.mjs` renders chosen frames at half size, about 3–8 seconds each after a \~40 second setup.
- **Final render:** `npx remotion render … --codec h264 --crf 16 --scale 1.3333` makes a 1440×2560 MP4 at about 4 frames per second, roughly 10 minutes for 67 seconds.
- **Add sound:** ffmpeg combines the video with `mix.wav` (Remotion writes a silent track that must be replaced).
- **Automatic QA:** `short_qa.py` checks every frame for black, white, frozen or jumpy frames, measures loudness, and makes contact sheets.
- **Disk warning:** every render bundle copies the assets folder (\~1.3 GB) into a temp folder; the author filled 60+ GB this way.

### How the sound works

All sound is generated by Python maths (numpy and scipy), not downloaded. `sfx_gen.py` synthesises effects, `instruments.py` and `music.py` compose an original march, `timeline.py` mirrors the picture's shot timings so each sound lands on its frame, and `mix.py` lowers the music under the voice and finishes at −15 LUFS loudness. The voice is not included: you supply `voice.wav` and `words.json` (each word's start and end time from any speech-to-text tool).

### Software it needs

| Software | Version on the author's machine | Used for |
| --- | --- | --- |
| Node.js | not stated | Running Remotion and the scripts |
| Remotion + `@remotion/three` | 4.0.290 | Turning code into video |
| three | 0.175 | The 3D scene |
| @react-three/fiber | 9.1.2 | Writing Three.js scenes in React |
| @react-three/postprocessing / postprocessing | 3.0.4 / 6.37.2 | The filter chain |
| Python 3 + numpy, scipy, Pillow | numpy 2.4, scipy 1.18, Pillow 12 | Sound, QA, image sheets |
| ffmpeg / ffprobe | not stated | Encoding, muxing, analysis |
| Google Chrome | not stated | Remotion's renderer (path hard-coded for Windows) |
| Claude Code | — | Running the skill |

Versions come from `references/reports/CONTEXT.md`; the repo itself pins nothing because it has no `package.json`.

### What happens when you ask Claude for a video

1. In Claude Code you say "Use the cartoon short skill and make a short about …". Claude matches the skill's description and loads `SKILL.md`.
2. **Topic and facts:** one surprising true story with visible cause and effect; facts and source go at the top of `SCRIPT.md`.
3. **Script:** a fixed beat formula (hook, setting, escalation, snap, joke, "You see…" explanation, consequence, twist) at \~3.7 words per second. You approve it; after that Claude proceeds without asking.
4. **Voice:** you record or generate `voice.wav`, then produce and hand-correct `words.json`.
5. **Shot plan:** Claude copies `templates/bridge/` into a new folder and rewrites `story.ts` with new shots and cameras.
6. **World and characters:** Claude edits the set, lights and cartoon cast.
7. **Sound:** the Python scripts generate effects and music and mix them to the locked timing.
8. **Look checks:** Claude renders stills, puts them side by side with the reference frames, and asks a separate Claude agent to score them out of 10 and list fixes; this loop repeats. For big passes, several agents each own a few files in separate copies, and a merge script combines their work.
9. **Final render, mux and QA,** then fixes for anything QA finds.
10. Claude sends you the finished MP4.

Steps 8–9 lean on many parallel Claude agents, which uses a lot of your plan's usage. Expect to run a lighter version of that loop.

## 2. Strengths and weaknesses for your use

The engineering transfers well; the art direction, characters and script formula do not.

### Strengths

- **Original by construction.** Every pixel and sound comes from code you own: no stock footage, no AI video clips, no licensing questions.
- **Frame-accurate sync to narration** through `words.json`, which suits verse-by-verse and phrase-by-phrase storytelling.
- **Already in the right format:** vertical 1080×1920 at 30 fps, exported at 2K.
- **A professional filter chain** that scales with resolution, so quick previews and final renders match.
- **Automated QA** (frozen frames, black frames, loudness). Rare in creator projects and a strong CV point.
- **A disciplined "measure, then match" method** for reaching a target look with numbers rather than opinions.
- **MIT licence:** you may reuse and change the code with attribution.

### Weaknesses

- **Its characters have expressive cartoon faces.** About 1,500 lines (`toon.ts`, `cast.ts`, `cardshade.ts`) draw them. The drawing and staging system carries over, but faces, outfits and proportions must be redrawn as faceless Muslim characters.
- **Comedic, saturated cartoon look** with thick ink outlines. Your themes need a quieter, reverent, cinematic tone.
- **Not a reusable engine.** The bridge story is hard-coded into the maths; each new video is made by copying the last one. You need components and per-video data files instead.
- **No subtitles and no Arabic.** The skill forbids captions, and nothing handles right-to-left Arabic text or fonts.
- **The music is a brass-band march.** Many in your audience prefer no instruments, so the sound design needs a new default.
- **The script formula is built for jokes** (deadpan lines, ironic twist). The hook and the "pivot to meaning" transfer; the comedy does not.
- **No accuracy pipeline.** Facts are noted in a script header, but nothing checks references, which is essential for Quran and hadith.
- **Incomplete and Windows-specific setup:** missing project files and 3D assets, hard-coded Chrome path, heavy disk use, \~10-minute renders.
- **Needs a computer with a decent GPU and Claude Code;** none of it runs from a phone or this browser chat.

## 3. What to reuse, what to change, what to build

Roughly a third of the code is reusable with light changes, a third is a pattern to rewrite, and a third (characters, cartoon style, the bridge story) is dropped.

| Part of the original | Verdict | Why / what changes |
| --- | --- | --- |
| Remotion + Three.js wiring in `Bridge.tsx` | Adapt | Becomes a generic scene renderer that any video can use. |
| Timeline ideas in `story.ts` (shots, crossfades, per-shot blur, camera keys) | Adapt | Rewritten as a data-driven timeline; each video supplies its own shot list. |
| Camera maths (smooth glides, creeping push-ins) | Reuse | Exactly the slow, deliberate motion your style needs. Impact shakes mostly dropped. |
| `lensblur.ts`, bloom, tone mapping | Reuse | Depth of field and glowing lamps suit cinematic scenes. |
| `grade.ts` | Adapt | Same mechanism, your own colour grades. |
| `lights.ts` | Adapt | Same structure; new presets such as pre-dawn, night, desert noon, maghrib. |
| `world.ts` (sky, fog, water) | Adapt | Sky and water shaders are valuable; the river becomes pools, rain and reflections. |
| `paint.ts` (textures painted in code) | Adapt | The technique is ideal for generating geometric tile patterns. Content replaced. |
| `build.ts` | Replace | A town of houses becomes an architecture kit: arches, domes, columns, lamps. |
| `shade.ts` (cartoon two-tone) and `ink.ts` (outlines) | Adapt | Keep the technique so the 2D characters and 3D world look like one picture; retune line weight, shading and colours to your palette. |
| `toon.ts`, `cast.ts`, `cardshade.ts` | Adapt | Keep the system: the Pen drawing tool, camera-facing character cards, walk cycles, contact shadows, crowds and scene lighting on cards. Redraw the characters faceless and in Islamic dress; drop blinks and the face library. |
| Kenney 3D models | Not included | Use your own procedural geometry or CC0 models you check yourself. |
| `dsp.py`, `mix.py`, `timeline.py` | Reuse | Loudness targeting, voice ducking and the limiter are general-purpose. |
| `sfx_gen.py` | Adapt | Re-aim at ambience: rain, wind, water, fire, footsteps on stone. |
| `music.py`, `instruments.py` | Optional | Likely dropped if you choose instrument-free audio. |
| `short_qa.py`, `sbs_sheet.py` | Reuse | Compare renders against your own brand reference frames instead. |
| `bridge-stills.mjs`, `bridge_merge.py`, `bridge_shots.py` | Adapt | Remove Windows paths and bridge-specific names. |
| `SKILL.md` | Rewrite | Your own skill with your rules: accuracy, no depictions, subtitles, audio policy. |
| `references/` (style bible, reports, frames) | Do not copy | Another creator's material. Write your own brand bible instead. |

### What we build ourselves

- A **subtitle system** with English phrases, Arabic lines, right-to-left layout and safe zones for each app's buttons.
- **Arabic typography** with properly licensed fonts, and Quran text pulled verbatim from a trusted source, never retyped.
- A **geometric pattern generator** (8-point stars, interlacing girih-style patterns) usable as textures, transitions and the logo.
- An **architecture kit** of reusable parts, plus **weather and atmosphere**: rain, mist, sand, dust in light shafts.
- **Brand components:** intro, transition, ending and reference card, used identically in every video.
- A **religious reference database** (one `references.yaml` per video) and a verification checklist with sign-off by a knowledgeable reviewer.
- A **narration workflow:** recording or text-to-speech, then automatic word alignment to replace the hand-made `words.json`.
- **Per-video config files** so a new video is a folder of data, not a copied engine.
- **Python analytics** for views, retention and follower growth, and a proper README, docs and tests for the portfolio.

## 4. Three visual identity concepts

My recommendation is Concept A as the core identity, because a single recurring place is the fastest route to "recognised before the username", and it can borrow Concept B's desert exteriors for death and sabr stories. All three now share one faceless 2D cast standing in 3D worlds (section 4b), and none depicts the unseen. Light, space and weather still carry most of the meaning.

### Concept A — "The Courtyard"

Every video takes place in one imagined, empty courtyard and the rooms around it. Time of day mirrors the theme: pre-dawn for salah, rain at night for tawbah, a bare stone room at dusk for death. Viewers learn the place and recognise it instantly.

- **Palette:** night indigo #0E1430, lapis #1F3B73, limestone #D9CBB0, lamp gold #E8B04B, dawn rose #C98B7A.
- **Signature opening (2 s):** total darkness; one oil-lamp flame ignites; light runs along the grooves of a star-pattern floor and reveals the series title.
- **Recurring motif:** a thin golden line of light on the floor, always pointing the same way, like the direction of prayer. It appears somewhere in every scene.
- **Signature transition:** a pattern wipe. An 8-point star tessellation grows from the centre and each tile flips to reveal the next scene (about 12 frames).
- **Ending:** the camera rises above the courtyard, the floor pattern completes into the brand mark, the lamp dims, and a reference card lists every source.
- **Camera:** slow, low, symmetrical push-ins through arches; never handheld.

### Concept B — "Signs in the Land"

No buildings: vast dunes, black mountains, night skies and rain on sand, in a painterly matte style. It draws on the Quran's repeated invitation to reflect on creation.

- **Palette:** sand ochre #C99A5B, burnt sienna #8A4B2A, night teal #0F2E35, starlight #F2EEE3, storm slate #4A5560.
- **Signature opening:** wind lifts sand off a dune to uncover one Arabic word, the theme of the video.
- **Recurring motif:** a single line of footprints walking forward. Human presence without showing a human; in death stories the footprints stop.
- **Signature transition:** a sand gust sweeps across the frame and settles into the next landscape.
- **Ending:** the footprints lead to the horizon as the sun sets; stars appear and form the sources card.
- **Risk:** desert imagery is common in Islamic content, so the footprint motif and grade must do the distinguishing work.

### Concept C — "Ink and Rain"

A stylised world of layered parchment and carved stone relief, like an illuminated manuscript in 3D. Almost monochrome, with one gold accent.

- **Palette:** ink black #121212, parchment #E9DFC8, gold leaf #C9A227, muted teal #3E6B6A, rain grey #8C9399.
- **Signature opening:** a single drop falls onto parchment and blooms into an 8-point star, which opens into the scene.
- **Recurring motif:** the single drop: rain, ink, a drop into water. It suits tawbah and mercy especially well.
- **Signature transition:** ink bloom. Ink spreads across the frame, then clears into the next scene.
- **Ending:** the drop lands in still water and the ripple draws the brand mark.
- **Risk:** the most original look, but the slowest to build and hardest to keep consistent.

### Shared systems (whichever concept you choose)

- **Subtitles:** one phrase at a time, never word-by-word, which reads as calm rather than hype. Off-white on a soft shadow, at most two lines of \~38 characters, centred at 62–70% of frame height to clear TikTok and Reels buttons. Fade in and out over 6 frames.
- **Quran and hadith on screen:** Arabic line above, English below in a different weight, a small source tag such as "Al-Zumar 39:53" or "Sahih Muslim 2759", and a short hold so it can be read.
- **Fonts (free, SIL Open Font License):** Amiri or Noto Naskh Arabic for Arabic text; Cormorant Garamond for English titles; Inter for subtitles.
- **Audio identity:** instrument-free by default: voice, ambience (rain, wind, lamp flicker, stone footsteps) and a recurring soft sound under the opening, such as a single water drop. This is a recommendation; the choice is yours.
- **Series identities:** each series gets its own time of day and accent colour within the palette. Examples: *Before Fajr* (salah, deep blue, lamp gold), *The Open Door* (tawbah, night rain), *The Last Page* (death and the akhirah, dusk stone), *Like the Birds* (sabr and tawakkul, dawn), *Ayah* (Quranic reflections, parchment light).

## 4b. The faceless 2D cast in 3D worlds

Characters are flat 2D drawings of Muslims with completely blank faces, standing inside fully 3D environments, the same technique as the original project. Faceless figures are an established convention in Islamic animation, and they let every viewer see themselves in the story.

### Design rules

- **Face:** a smooth blank oval in skin tone, with no eyes, nose, mouth or brows. Emotion comes from posture, head angle, hands, camera distance and light.
- **Look:** flat colour with a clean outline, lit by the 3D scene like the original's cards, but with longer proportions (about 6 head-heights) instead of its bean-heads, so they read as your own cast rather than a copy.
- **Wardrobe library** of swappable parts:
  - Men: thobe or dishdasha, ghutra with agal, kufi or taqiyah, bisht for formal scenes, ordinary work clothes for everyday stories.
  - Women: abaya, hijab or khimar, loose modest dress.
  - Travellers: cloak, head-wrap, sandals.
  - Children: simple thobe and kufi, or a small hijab.
- **Variety:** different ages, builds and skin tones, reflecting Muslims worldwide; the scenario decides who appears.
- **A recurring protagonist:** one faceless figure, "the Traveller", in signature colours (sand thobe, indigo shawl), appearing in most videos. A recurring character is one of the strongest recognition cues you can have.

### Limits to keep

- Never the Prophet ﷺ, other prophets, angels, or anything representing Allah, as your original brief said.
- Avoid portraying named Companions or the Prophet's family, which most scholars object to. Tell those stories through places and objects instead.
- Characters are ordinary, unnamed Muslims or the unnamed figures of a parable.
- Salah postures (standing, ruku', sujood, sitting) must be accurate. Have a knowledgeable person check them, because wrong posture draws correction comments.
- Decide a policy for female characters up front. My suggestion: present, fully modest, mostly in mid and wide shots.

### How we would build them

1. **Draw them with the original's system.** `toon.ts` draws each character in code on a 600×1000 canvas; we swap its faces for a blank oval and add outfit parts (thobe, kufi, ghutra, abaya, hijab, shawl). `cast.ts` stands them in the 3D world as camera-facing cards with walk cycles and shadows, and `cardshade.ts` lights them with the scene's sun.
2. **Add the poses your stories need:** standing in prayer, ruku', sujood, sitting, raising hands in du'a, walking into the wind. Side views need their own drawings, as in the original.
3. **Later, optionally:** draw characters in a vector tool and load them as images, keeping the same card and lighting system.

### Video ideas that gain a character

- \#2 Five Rivers: a man making wudu at the river, seen from the side or behind.
- \#3 Happier Than the Traveller: the Traveller himself, lost and then found in the desert.
- \#6 What Walks Back: family members walking away from the grave while the lantern of deeds stays.
- \#8 Like the Birds: a worker leaving home at dawn and returning at dusk.
- \#10 The Last Third: a lone figure praying beside the lit window.

## 5. Ten video ideas

Each idea is built on one authentic source and one visual metaphor, at 65–90 seconds. I checked six hadith references on sunnah.com today; the rest are marked **verify** and must be confirmed before scripting. Quran references are given by surah and ayah only: take the Arabic and translation verbatim from Quran.com or Tanzil, never from memory or from me.

### 1. The First Question — *Before Fajr*

- **Hook:** "Before your money, your work, your followers — there is one thing you will be asked about first."
- **Arc:** the courtyard at night, an empty prayer space; what we chase all day; the hadith; the reassurance that voluntary prayers can make up shortfalls; an invitation to the next prayer.
- **Source:** "the first deed for which a servant will be called to account on the Day of Resurrection is his salah" — [Jami\` at-Tirmidhi 413](https://sunnah.com/tirmidhi:413), graded sahih (Darussalam). Checked.
- **Supporting:** Quran 20:14 (prayer for Allah's remembrance).

### 2. Five Rivers — *Before Fajr*

- **Hook:** "Imagine a river ran past your front door, and you washed in it five times a day."
- **Arc:** one doorway beside a river, lit five ways as the day turns; dust washed away each time; the meaning of the parable.
- **Source:** the parable of bathing five times a day in a river — Sahih al-Bukhari 528, Sahih Muslim 667. **Verify.**

### 3. Happier Than the Traveller — *The Open Door*

- **Hook:** "Allah is more pleased with your repentance than a man who found his only way to survive."
- **Arc:** a desert, an empty saddle and food bags, a lone camel lost then found at dawn; told entirely through objects and footprints.
- **Source:** the man who lost and found his camel in the desert — Sahih al-Bukhari 6309, Sahih Muslim 2747. **Verify.**

### 4. Open Every Night — *The Open Door*

- **Hook:** "There is a door that has been open every single night of your life."
- **Arc:** a heavy wooden door in the rain, open at night and by day; the hadith; the limit (until the sun rises from the west); Quran 39:53 as the ending.
- **Source:** Allah stretches out His Hand by night to accept the repentance of those who sinned by day, and by day for those who sinned by night — [Sahih Muslim 2759](https://sunnah.com/muslim:2759a). Checked.
- **Care:** show the door and the sky only, never anything representing Allah.

### 5. Replaced — *The Open Door*

- **Hook:** "The Prophet ﷺ said that if you never sinned, Allah would replace you."
- **Arc:** a rain-streaked window; the shock of the hook; the actual point, that Allah loves those who return and seek forgiveness; a call to istighfar.
- **Source:** [Sahih Muslim 2749](https://sunnah.com/muslim:2749). Checked.
- **Care:** the narration must state plainly that this encourages seeking forgiveness, not sinning. Run the script past a scholar.

### 6. What Walks Back — *The Last Page*

- **Hook:** "Three things will walk with you to your grave. Only one will stay."
- **Arc:** three lanterns travel down a desert path at dusk; two turn back; one remains beside a mound of earth; Quran 3:185 closes.
- **Source:** family, wealth and deeds follow the dead; two return, deeds remain — [Sahih al-Bukhari 6514](https://sunnah.com/bukhari:6514). Checked; also reported in Sahih Muslim.

### 7. The Destroyer of Pleasures — *The Last Page*

- **Hook:** "The Prophet ﷺ told us to remember one thing often. Most of us avoid thinking about it."
- **Arc:** a richly lit banquet room with no people; lamps go out one by one; the hadith; Quran 63:10 (spend before death comes).
- **Source:** "Remember often the destroyer of pleasures", meaning death — [Jami\` at-Tirmidhi 2307](https://sunnah.com/tirmidhi/36/4), graded hasan (Darussalam). Checked.

### 8. Like the Birds — *Like the Birds*

- **Hook:** "Every morning, millions of birds leave home with nothing, and every evening they come back full."
- **Arc:** dawn over a minaret-less skyline, birds leave empty nests, return at dusk; the hadith; tawakkul includes effort, because the birds still fly out; Quran 65:3.
- **Source:** [Jami\` at-Tirmidhi 2344](https://sunnah.com/tirmidhi:2344), graded hasan (Darussalam); Tirmidhi called it hasan sahih. Checked.

### 9. Two Kinds of Weather — *Like the Birds*

- **Hook:** "For a believer, there is no such thing as a bad day that is only bad."
- **Arc:** one tree in sunlight, then the same tree in a storm; gratitude in ease, patience in hardship, good in both; Quran 94:5–6.
- **Source:** "How wonderful is the affair of the believer" — Sahih Muslim 2999. **Verify.**

### 10. The Last Third — *Ayah*

- **Hook:** "There is a time every night when almost everyone is asleep, and it may be the best moment to ask."
- **Arc:** a sleeping city under stars; one lit window; the hadith about the last third of the night; Quran 2:186 ("I am near").
- **Source:** Sahih al-Bukhari 1145, Sahih Muslim 758. **Verify.**
- **Care:** absolutely no visual of the descent; only the night, the sky and the lit window.

### The accuracy rule for every video

1. Each video has a `references.yaml`: source, number, grade, grader, link, and the exact translation used.
2. Only sahih or hasan hadith, with the grade shown in the reference card.
3. Narration paraphrases are marked as paraphrases; quotation marks only for exact translations.
4. Nothing ships without sign-off from a knowledgeable reviewer, such as a local imam or a qualified student of knowledge.

## 6. Repository architecture

One repository with clear top-level areas: the engine is shared code, each video is a folder of data, and Python handles audio, QA and analytics.

```text
islamic-cinematic-studio/
├── README.md                  showcase: demo GIFs, how it works, tech stack
├── LICENSE                    MIT for code
├── CONTENT_LICENSE.md         videos, scripts, brand: all rights reserved
├── NOTICE.md                  credit to the original MIT project
├── docs/                      getting started, architecture, rendering, accuracy policy
├── brand/                     brand bible, palette.json, typography, logo, series identities
├── engine/                    TypeScript: Remotion + Three.js
│   ├── package.json
│   ├── public/                fonts, textures, models (large files via Git LFS)
│   └── src/
│       ├── Root.tsx           registers every video from videos/
│       ├── core/              timeline, camera, easing, shot layering
│       ├── scenes/            courtyard, desert, rain-window, night-sky
│       ├── components/        architecture, patterns, weather, water, lamps
│       ├── post/              lens blur, bloom, grade
│       ├── typography/        Subtitles, ArabicVerse, ReferenceCard
│       └── brand/             Intro, Transition, Outro
├── videos/
│   └── 001-the-first-question/
│       ├── video.config.ts    shots, cameras, scene choices, timings
│       ├── script.md          narration with beat markers
│       ├── references.yaml    every source, grade, link, reviewer sign-off
│       └── voice/words.json   word timings (audio files kept out of git)
├── audio/                     Python: dsp, mix, ambience generators, alignment
├── tools/                     render, stills, QA, new-video scaffold, reference checker
├── analytics/                 Python: import platform exports, metrics, notebooks, reports
├── skills/islamic-cinematic-studio/SKILL.md   your own Claude skill
└── .github/workflows/         type-check, lint, Python tests on every push
```

Four decisions shape it:

- **Videos are data.** A new video is `tools/new-video` plus a config and a script, so the engine improves without being copied.
- **Large files stay out of normal git:** renders, WAVs and models go in Git LFS or GitHub Releases; `out/` is ignored.
- **Two licences:** code open (MIT, crediting the original), creative content and brand reserved.
- **Portfolio signals:** CI checks, docs, a clear README with before/after renders, and the analytics notebooks show engineering beyond video-making.

## 7. Development roadmap

At a few evenings a week, a realistic target is a first verified pilot video in about ten weeks, then one video a week. Each gate must pass before the next phase starts.

&#91;embedded content: Roadmap · 7 phases, 4 gates\]

The weeks are estimates for part-time work; the gates matter more than the dates.

### Decide now, from your phone

- [ ] Pick Concept A, B or C (I recommend A).
- [ ] Decide the audio policy: instrument-free, or something else.
- [ ] Decide the policy for female characters.
- [ ] Find a reviewer for religious accuracy.
- [ ] Choose your narration: your own voice, or text-to-speech you disclose.

### Your first evening at home

1. Install Node.js (LTS), Python 3, ffmpeg, Git and VS Code.
2. Install Claude Code and sign in; check that your plan includes it.
3. Create the GitHub repository `islamic-cinematic-studio` with a README and an MIT licence.
4. Run `npx create-video@latest` in a scratch folder and render Remotion's starter video.
5. Unzip the original project into a separate scratch folder, not your new repo.
6. Open it with Claude Code and have it explain each file in `templates/bridge/` while you read along.

## 8. Reference study: the 13 @tanzil\_quran videos

Every video takes one authentic text (a hadith, a short surah or a dhikr) and turns its meaning into a single, concrete visual idea. They are explainers that make the viewer see something familiar differently, not dramatic stories. Most run 60–72 seconds (range 24–120).

How I studied them: one frame every 2 seconds from each video, plus automatic cut detection. I could not listen to the audio, because speech recognition isn't available here, so what I say about narration comes from the on-screen captions. Source numbers below are read from small on-screen text; verify each before reusing it.

### What each video does

| Topic | Source shown on screen | The one visual idea |
| --- | --- | --- |
| The man who killed 100 and repented | Sahih al-Bukhari, Sahih Muslim | A kill counter (99, then 100), signposts, and two progress bars measuring the road to each land |
| Dry heels in wudu | Sahih al-Bukhari, Sahih Muslim | A heat-map foot: red where water missed, blue where it reached |
| Surat al-Ma'un (107) | Quran 107:1–7 | "Count the red flags": one house scene per verse, with a verse progress bar |
| Wiping over socks | Bukhari, Abu Dawud, Muslim | Checklists, clocks counting the time limit, and a note that the four madhhabs differ |
| Tasbih after prayer | Sahih Muslim | A live counter, 33 / 33 / 33 then 100, with the colour changing for each phrase: a follow-along tool |
| The hadith of Jibreel | Sahih Muslim, Sahih al-Bukhari | "1,400 years ago" against today's skyline, using a height chart from tents to a 1 km tower |
| Treating your parents | Quran 17:23–24, Sahih al-Bukhari | A sigh as a sound wave crossed out; "your mother" three times as stacked cards |
| Surat an-Nasr (110) | Quran 110 | "The last full surah revealed": gates open, crowds enter, ends in sujood |
| Al-Fatiha as a conversation | Quran 1, Sahih Muslim | Word-by-word Arabic breakdown, with "Allah answers" after each verse |
| Sleeping like the Prophet ﷺ | Sahih al-Bukhari | Six numbered steps on a top-down bed, opening with "Most of us fall asleep scrolling" |
| A man as shepherd of his family | Bukhari, Quran 66:6, Muslim, Tirmidhi | A house shielded from fire, and a grid of four coins showing which spending is rewarded most |
| What you will look like in Jannah | Bukhari, Muslim, Tirmidhi, Quran 35 | A height chart, an age counter fixed at 33, and a battery at 20% here versus 100% there |
| The meaning of the tashahhud | Sahih al-Bukhari | "Every time you sit, you greet every righteous person", shown as a globe of lights |

### The premise behind them

1. **Reframe the familiar.** Most videos start from something viewers already do (wudu, tasbih, tashahhud, Al-Fatiha, going to sleep) and reveal a meaning or detail they missed. The hook is essentially: "You do this every day, but…"
2. **One idea, one source.** Each video sticks to a single text, and the source stays on screen the whole time.
3. **Warning, then mercy and a fix.** A warning (dry heels, the fire) is always followed by the practical remedy or a door of hope, as in the man who killed 100.
4. **Something to do tonight.** Many end with a checklist or routine the viewer can act on straight away.
5. **A modern contrast.** Scrolling in bed, today's skyline, "next time she asks": the 1,400-year-old text lands in the viewer's own life.
6. **Make the unseen measurable.** Counters, timers, charts, batteries and progress bars turn abstract rewards and warnings into numbers you can watch.
7. **Series and a follow prompt.** For example, "Short surahs, part 1. Follow to learn the next one."

The messages they return to are mercy and repentance, doing worship properly, the meaning of what we already say in salah, responsibility to family and parents, and hope in the akhirah.

### Editing and on-screen text

- **Almost no hard cuts:** 0–4 per video by automatic detection. Scenes evolve continuously while the captions change about every 1.5–2 seconds. That matches the GitHub reference style.
- **Kinetic captions in the top third:** bold uppercase sans-serif, 1–3 lines, with a small grey label above ("THE PROPHET ﷺ SAID").
- **Keywords coloured by meaning:** red for danger or sin, gold for Allah, reward or the key term, green for the right action, blue for water and calm.
- **Arabic above English,** with the word being recited highlighted in gold, and a tiny source tag such as "SAHIH MUSLIM".
- **Infographic devices:** counters, ticked checklists, progress dots, cards, charts and timers.
- **Dark, low-saturation night palettes** with warm lamp glows. Characters are simple and small in frame, often seen from behind or from above.

### What we take, and what we do better

- **Take:** the "reframe the familiar" premise, one text per video, warning balanced with mercy, a practical ending, numbers that make the unseen visible, keyword colour-coding, and series with a follow prompt.
- **Do better:** their visuals are flat 2D vector art. Ours put faceless 2D characters inside lit 3D worlds with cinematic camera moves, the GitHub look, which should feel far more premium.
- **Do differently:** two of their videos show angels as light beams or a glow. Your brief rules that out, so in those moments we tell the story with text and environment only.
- **Build into the engine:** reusable counter, checklist, progress-dot, card and chart components, styled to your palette. That is also a strong portfolio feature.

### New ideas in this spirit (sources to verify)

- **"Two words heavy on the scale"**: the two phrases light on the tongue but heavy on the scale, shown with scales and a counter. Sahih al-Bukhari 6406, Sahih Muslim 2694. Verify.
- **"What you say in ruku'"**: the meaning of *Subhana Rabbiyal 'Azim*, word by word. Sahih Muslim 772. Verify.
- **"Three verses that sum up a life"**: Surat al-'Asr, verse by verse, with a draining hourglass. Quran 103.
- **"Before you sleep"**: Ayat al-Kursi at night, building on the bedtime-routine format. Sahih al-Bukhari 2311. Verify.
- **"The minutes nobody uses"**: du'a between the adhan and the iqamah, with a countdown timer. Sunan Abi Dawud 521, Jami' at-Tirmidhi 212. Verify.
