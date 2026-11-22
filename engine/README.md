# Engine

The animation engine: **Remotion** turns React code into video frame by frame, and **three.js** draws the 3D world
inside each frame. Characters are flat 2D drawings standing in that 3D world.

## Run it

Run these from this `engine/` folder. Do the first one once; it downloads the packages into `node_modules/`.

| Command | What it does |
| --- | --- |
| `npm install` | Install the packages (same versions as the scratch-render test project) |
| `npm run studio` | Open Remotion Studio in the browser to scrub through the video |
| `npm run typecheck` | Check the TypeScript code for mistakes without rendering anything |
| `npm run stills` | Render frames 0, 150 and 299 at half size to `out/frame000.png` and so on (about 10 s each) |
| `npm run preview` | Render the whole 10 s test at half size to `out/preview.mp4` |
| `npm run fullsize-test` | Render frames 150-210 (2 s) at full size to `out/fullsize_test.mp4`, to judge fine detail such as floor shimmer |
| `npm run final` | Render it at full size (1080 x 1920) to `out/final.mp4` |
| `npm run pose-sheet` | Every Traveller pose side by side to `out/pose_sheet.png` |
| `npm run motion-test` | The 12 s Traveller motion test (stand, turn, walk, turn to the qibla, takbir) to `out/motion_test.mp4` |
| `npm run beauty` | The rich courtyard: three stills to `out/beauty_wide.png`, `beauty_low.png`, `beauty_close.png` |
| `npm run toolkit-stills` | One full-size still of each brand piece to `out/toolkit_*.png` |
| `npm run toolkit` | The 25 s brand toolkit demo at full size to `out/toolkit_demo.mp4` |

Render settings for this PC (1 browser tab, installed Chrome, the "angle" GL setting, temp files in
`.remotion-tmp/`) are in `remotion.config.ts`.

## What's where

```
src/
├── index.ts, Root.tsx     entry point and the list of videos
├── draw/                  2D drawing on canvases: toon.ts (Pen, colour helpers), paint.ts (textures)
├── render/                3D look: shade.ts (two-tone world light), cardshade.ts + card.ts (lit character
│                          cards), ink.ts (outlines), lensblur.ts (depth of field), grade.ts (colour grade)
├── camera/ease.ts         easing curves and camera moves (glide, push-in, dolly, zoom)
├── characters/            traveller.ts (front views, takbir, qiyam), travellerPoses.ts (side, back, 3/4, walk,
│                          ruku, sujood, sitting)
├── text/                  on-screen text: fonts.ts (OFL fonts), Captions, ArabicLine, SourceTag, SourcesCard
├── brand/                 signature pieces: floorFx.ts (tile grooves, star mark, tile gaps), levels.ts (darkness /
│                          ignite / dim), sequences.ts (opening + ending timing), StarWipe.tsx, mercy.ts
└── scenes/
    ├── courtyard-test/    the first 10 s test (look.ts = palette + lights, courtyard.ts, lamp.ts, shot.ts)
    ├── pose-sheet/        the pose sheet still
    ├── motion-test/       the 12 s Traveller motion test (timeline.ts, mat.ts = the prayer mat)
    ├── courtyard-beauty/  the rich courtyard (world.ts builds it, set.ts = the dressing, shots.ts = 3 stills)
    └── toolkit/           the brand toolkit demo (content.ts = ALL its text, timeline.ts, TextSample stills)
```

Files in `draw/`, `render/` and `camera/` are adapted from Claude Animated Shorts (MIT). Each says so at the top;
see `../NOTICE.md`.

## Good to know

- To tune the mood (moonlight, lamp strength, how bright the Traveller is), edit `scenes/courtyard-test/look.ts`.
- A test still can switch effects off: `--props='{"post":{"ink":false}}'` (also `lens`, `bloom`, `grade`, `grain`).
- Floor textures and shimmer: use power-of-two canvases (1024 x 1024), keep mipmaps on with
  `LinearMipmapLinearFilter` and `anisotropy = 16`, make every painted mark wrap across the tile edges (no seam
  lines), and keep fine high-contrast detail out of the pattern. Half-size previews exaggerate shimmer; judge it with
  `npm run fullsize-test`.
- three.js 0.175 bug: `ExtrudeGeometry` with `bevelEnabled: false` builds no front or back faces. Use a zero-size
  bevel instead (see `courtyard.ts`).
- On-screen text: every line must come verbatim from the video's script and references.yaml (see
  `scenes/toolkit/content.ts`). Captions are at most 2 lines; a longer quote is shown as consecutive exact phrases.
