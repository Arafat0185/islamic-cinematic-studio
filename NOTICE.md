# Notices and credits

This project is MIT-licensed (see [LICENSE](LICENSE)). It builds on the open-source work listed below.

## Claude Animated Shorts

- Project: **Claude Animated Shorts**, https://github.com/mromidev/claude-animated-shorts
- Copyright (c) 2026 Mr omi
- Licence: MIT (full text below)

How this repo uses it:

- **`engine/src/`** reuses parts of that project's `templates/bridge/` engine. Each copied file starts with a comment
  naming its source file, this copyright line, and what was changed:
  - `draw/toon.ts` (the Pen drawing tool and colour helpers) and `draw/paint.ts` (canvas-texture helpers)
  - `render/shade.ts`, `render/cardshade.ts`, `render/card.ts` (from `cast.ts`), `render/ink.ts`,
    `render/lensblur.ts`, `render/grade.ts`
  - `camera/ease.ts` (easing and camera helpers from `story.ts`)
- [`engine/src/characters/traveller.ts`](engine/src/characters/traveller.ts) (The Traveller) is our own character
  design, drawn with that project's `Pen` toolkit (`engine/src/draw/toon.ts`).
- The reference images [`traveller_v7.png`](characters/traveller/traveller_v7.png) and
  [`traveller_v7_head.png`](characters/traveller/traveller_v7_head.png) were rendered with that project's bridge-short
  template (Remotion + three.js). `traveller_v7.png` shows its bridge scene, town and soldier characters around The
  Traveller.

### MIT License (Claude Animated Shorts)

```
MIT License

Copyright (c) 2026 Mr omi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

Also copied from Claude Animated Shorts (MIT): `engine/tools/short_qa.py` (from `templates/scripts/short_qa.py`, adapted
to use Remotion's bundled ffmpeg and to skip intended dark spans).

## Recitation audio (video 002, "The Last Request")

`engine/public/audio/recitation/063010.mp3`, `063011.mp3`: Surat Al-Munafiqun 63:10-11 recited by
Sheikh Yasser Ad-Dussary (Al-Dossari), 128 kbps, downloaded unchanged from EveryAyah.com
(https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/063010.mp3, .../063011.mp3; folder listed as
"Yasser_Ad-Dussary" in https://everyayah.com/data/recitations.js), 2026-11-20. Used as the recitation inside the
video's own sound track (joined with 0.7 s gaps); the reciter is credited on the end card.
