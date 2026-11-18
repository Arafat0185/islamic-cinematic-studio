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
| `npm run final` | Render it at full size (1080 x 1920) to `out/final.mp4` |

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
├── characters/            character drawings (traveller.ts)
└── scenes/courtyard-test/ the 10 s test: look.ts (palette + lights), courtyard.ts, lamp.ts, shot.ts (camera),
                           CourtyardTest.tsx (puts it all together with the effects)
```

Files in `draw/`, `render/` and `camera/` are adapted from Claude Animated Shorts (MIT). Each says so at the top;
see `../NOTICE.md`.

## Good to know

- To tune the mood (moonlight, lamp strength, how bright the Traveller is), edit `scenes/courtyard-test/look.ts`.
- A test still can switch effects off: `--props='{"post":{"ink":false}}'` (also `lens`, `bloom`, `grade`, `grain`).
- three.js 0.175 bug: `ExtrudeGeometry` with `bevelEnabled: false` builds no front or back faces. Use a zero-size
  bevel instead (see `courtyard.ts`).
