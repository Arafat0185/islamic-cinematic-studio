# Notices and credits

This project is MIT-licensed (see [LICENSE](LICENSE)). It builds on the open-source work listed below.

## Claude Animated Shorts

- Project: **Claude Animated Shorts**, https://github.com/mromidev/claude-animated-shorts
- Copyright (c) 2026 Mr omi
- Licence: MIT (full text below)

How this repo uses it:

- [`characters/traveller/traveller.ts`](characters/traveller/traveller.ts) (The Traveller) is our own character
  design, but it is drawn with that project's cartoon drawing toolkit: it imports `Pen`, `blobPts`, `thickAngle`,
  `mul`, `mix`, `INK` and its types from **`toon.ts`** (`templates/bridge/toon.ts` in that project).
- **`toon.ts` is not copied into this repo yet**, so `traveller.ts` cannot run on its own here. When it is copied in,
  keep its copyright line and include the licence text below with it.
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
