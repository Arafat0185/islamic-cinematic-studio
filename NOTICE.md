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
