<div align="center">

<img src="brand/logo/traveller_logo_transparent.svg" alt="The Traveller" width="160" />

# Islamic Cinematic Studio

**An AI-directed, code-native animation pipeline for faceless Islamic short-form cinema.**

*Procedural 3D worlds · hand-drawn 2D characters · scripture-verified captions · deterministic frame-accurate rendering*

<br />

<img src="docs/showcase/hero.gif" alt="Moments from The Man Who Never Rested, The Sirat and The Last Request" width="300" />

<sub>Moments from <i>The Man Who Never Rested</i>, <i>The Sirat</i> and <i>The Last Request</i>, every frame rendered from code</sub>

<br />

![Remotion](https://img.shields.io/badge/Remotion-4.0-4D312C?style=flat-square)
![Three.js](https://img.shields.io/badge/Three.js-r175-4D312C?style=flat-square&logo=threedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-4D312C?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-4D312C?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-audio%20%26%20QA-4D312C?style=flat-square&logo=python&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-FB5606?style=flat-square)

<br />

> *"Be in this world as if you were a stranger or a traveler."*
> — Sahih al-Bukhari 6416

</div>

<br />

## ✦ Overview

**Islamic Cinematic Studio** is a programmatic film studio. Every frame is generated from code: no stock footage, no timeline editor, no generative video models. Each film is a React composition rendered frame by frame through a WebGL scene graph. That makes the output **deterministic, versionable and reproducible**: the same commit always renders the same film.

The studio produces 60–90 second vertical films (1080 × 1920, 30 fps) for TikTok, Reels and Shorts, about salah, tawbah, death and the akhirah. The films follow one recurring character, **the Traveller**, a faceless figure moving through cinematic 3D worlds.

Development is **AI-directed**. Scripts, shot design, engine features and quality control are developed together with an AI agent (Claude Code) working directly in this repository. A human reviewer signs off on all religious content before release.

<br />

## ✦ Pipeline

```mermaid
flowchart LR
    A[📜 Script &amp;<br/>verified sources] --> B[🎙️ Audio<br/>recitation · VO · SFX]
    B --> C[⏱️ Alignment<br/>word-level timing]
    C --> D[🎬 Shot design<br/>camera · staging]
    D --> E[🧊 3D world render<br/>Three.js / R3F]
    E --> F[🎨 Post stack<br/>ink · DoF · bloom · grade]
    F --> G[🔍 Automated QA<br/>frames · audio · captions]
    G --> H[📦 Master<br/>H.264 · −14 LUFS]
```

| Stage | What happens |
|---|---|
| **Source** | Quran text is fetched from the quran.com API (Uthmani script + Saheeh International) and stored as raw JSON. Captions are checked against it character by character, so nothing is typed by hand. |
| **Audio** | Recitations, a local neural TTS voice (Kokoro-82M) and procedurally synthesised sound design. Loudness is normalised to −14 LUFS integrated, −1 dBTP. **No music or instruments.** |
| **Alignment** | Local Whisper inference produces word-level timestamps. These are cross-checked against breath and onset detection to place captions and cuts exactly. |
| **World** | Procedural 3D environments (courtyards, cities, interiors, graveyards) built in Three.js through React Three Fiber, with a physically motivated camera rig. |
| **Characters** | The cast is drawn in 2D as vector "cards" in a 600 × 1000 design space. They're billboarded into the 3D scene with lamp-aware shading and walk cycles, and they turn by swapping drawings rather than being squashed. |
| **Post** | A custom shader chain: ink outlines → lens depth of field → bloom → tone mapping → film grade, grain and vignette. |
| **QA** | Scripted checks for frozen and black frames, flicker maps, motion energy, camera pitch limits, collision, caption safe zones and loudness. |

<br />

## ✦ Engine architecture

```
engine/
├── src/
│   ├── draw/          # vector "pen" toolkit for 2D character art
│   ├── characters/    # the Traveller + supporting cast, poses & turnarounds
│   ├── render/        # shaders: ink, card lighting, lens blur, grade
│   ├── camera/        # easing curves, rigs, collision & pitch guards
│   ├── sets/          # procedural 3D worlds (library, bridge, cemetery, city…)
│   ├── story/         # story player: shots, sets and per-frame effects
│   ├── scenes/        # one folder per film: timeline, overlay, life
│   └── text/          # kinetic captions, Arabic lines, source tags
├── tools/             # chunked render, QA, audio mix, Whisper alignment
├── public/audio/      # local-only audio (git-ignored)
└── remotion.config.ts # Windows/ANGLE-safe render config
```

**Key engineering decisions**

- **2D-in-3D compositing.** The characters keep the warmth of hand-drawn art while the camera moves freely through real 3D space with parallax, depth of field and lighting.
- **Camera guardrails.** A collision solver and a 45° downward-pitch limit stop the flat-card look from showing.
- **Anti-aliasing discipline.** Mipmapped, anisotropically filtered textures (power-of-two sizes for the tiled environment textures), polygon-offset decals instead of z-fighting, a fixed-pattern lens blur and camera-driven motion blur give stable, flicker-free frames on phone screens.
- **Memory-bounded rendering.** Renders run in chunks of 300–600 frames, one process per chunk, resumable and auto-retried with smaller chunks, so long films finish reliably on integrated GPUs.

The hardest problems and how they were solved are written up in **[docs/ENGINEERING.md](docs/ENGINEERING.md)**.

<br />

## ✦ Filmography

| # | Title | Scripture | Length | Showcase | Status |
|:-:|---|---|:-:|:-:|:-:|
| 001 | **The First Question**: a day of chasing, and the first question on the Day of Judgement | Jami' at-Tirmidhi 413 · Surat Maryam 19:59–63 | 1:06 | [▶ clip](docs/showcase/001-the-first-question.mp4) | ✅ Released |
| 002 | **The Last Request**: a man who kept delaying, a funeral in the rain | Surat Al-Munafiqun 63:10–11 | 1:13 | [▶ clip](docs/showcase/002-the-last-request.mp4) | 🎬 Final cut |
| 003 | **The Sirat**: the bridge over Hell, set to a Taraweeh recitation | Surat Maryam 19:66–72 | 1:55 | [▶ clip](docs/showcase/003-the-sirat.mp4) | 🎬 Final cut |
| 004 | **The Man Who Never Rested**: a library whose books carry him into other worlds | Quran 35:34 · 13:24 · scholars' sayings | 1:02 | [▶ clip](docs/showcase/004-the-man-who-never-rested.mp4) | 🎬 Final cut |
| 005 | **The Dunya**: one rainy night re-lived in slow motion, ending in a crane up into the rain | Quran 9:51 · Surat Al-Hadid 57:22–23 | 1:25 | [▶ clip](docs/showcase/005-the-dunya.mp4) | 🎬 Final cut |
| 006 | **Hold On To This**: a talk on holding on to the deen, across calm golden-hour worlds | Surat Ar-Ra'd 13:28–29 | 1:12 | [▶ clip](docs/showcase/006-hold-on-to-this.mp4) | 🎬 Final cut |

<table>
<tr><td align="center"><b>001 · The First Question</b><br/><img src="docs/showcase/001-the-first-question_sheet.jpg" alt="Contact sheet: The First Question" /></td></tr>
<tr><td align="center"><b>002 · The Last Request</b><br/><img src="docs/showcase/002-the-last-request_sheet.jpg" alt="Contact sheet: The Last Request" /></td></tr>
<tr><td align="center"><b>003 · The Sirat</b><br/><img src="docs/showcase/003-the-sirat_sheet.jpg" alt="Contact sheet: The Sirat" /></td></tr>
<tr><td align="center"><b>004 · The Man Who Never Rested</b><br/><img src="docs/showcase/004-the-man-who-never-rested_sheet.jpg" alt="Contact sheet: The Man Who Never Rested" /></td></tr>
<tr><td align="center"><b>005 · The Dunya</b><br/><img src="docs/showcase/005-the-dunya_sheet.jpg" alt="Contact sheet: The Dunya" /></td></tr>
<tr><td align="center"><b>006 · Hold On To This</b><br/><img src="docs/showcase/006-hold-on-to-this_sheet.jpg" alt="Contact sheet: Hold On To This" /></td></tr>
</table>

<sub>Showcase clips are silent: recitations and narration are third-party audio and are never committed.</sub>

<br />

## ✦ Getting started

```bash
cd engine
npm install

npm run studio      # open Remotion Studio (live preview)
npm run typecheck   # strict TypeScript check
npm run stills      # render QA stills / contact sheets
npm run rest        # full chunked render of video 004 (also: lastrequest, sirat)
npm run rest-qa     # automated QA of the finished render
```

> **Requirements:** Node 18+, Python 3.10+ (audio & QA), Google Chrome. Tested on Windows 11 with integrated Radeon graphics.

<br />

## ✦ Content principles

<table>
<tr><td>🕌</td><td><b>Authenticity first</b>: no invented Quran, hadith or scholarly quotes. Every reference is verifiable, graded where applicable, and listed in each film's <code>references.yaml</code>.</td></tr>
<tr><td>👤</td><td><b>Faceless by design</b>: characters have no facial features. Allah, prophets and angels are never depicted.</td></tr>
<tr><td>🔇</td><td><b>No music</b>: only recitation, voice and natural sound design.</td></tr>
<tr><td>✅</td><td><b>Human sign-off</b>: nothing ships until <code>reviewer.approved: true</code>.</td></tr>
</table>

<br />

## ✦ Credits

- Engine foundation adapted from **[claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts)** by mromidev (MIT).
- Quran text via the **quran.com API**; English translation: **Saheeh International**.
- Voice: **Kokoro-82M** (Apache 2.0). Alignment: **Whisper**.
- Fonts: **Amiri**, **Inter**, **Cormorant Garamond** (SIL Open Font License).
- Third-party audio sources are listed in [`NOTICE.md`](NOTICE.md).

<br />

<div align="center">

<sub>Built frame by frame, for the road home.</sub>

<sub>MIT © Islamic Cinematic Studio</sub>

</div>
