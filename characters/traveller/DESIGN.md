# The Traveller: locked design (v7, Maktabatu Al-Ilm colours)

The Traveller is our signature character: a calm, faceless man in a warm brown thobe, an orange scarf and a small
cream kufi (the Maktabatu Al-Ilm brand colours, from 2026-11-19). This page describes his **official, locked** look. If you draw him again, in any tool, match this page.

- Code: [`engine/src/characters/traveller.ts`](../../engine/src/characters/traveller.ts) (draws him with the Pen tools in
  `engine/src/draw/toon.ts`, see [NOTICE.md](../../NOTICE.md))
- Reference images: [`traveller_v7_head.png`](traveller_v7_head.png) (close-up) and
  [`traveller_v7.png`](traveller_v7.png) (standing on the bridge, frame 300 of the test scene)

## The one rule: a blank face

He has **no eyes, no nose, no mouth, no eyebrows and no lips**. The only things on his face are his beard and his
kufi. Never add facial features, not even small ones.

## Colours

| Part | Colour | Hex |
|---|---|---|
| Skin | warm brown | `#C08A5E` |
| Thobe (long robe) | warm brown | `#7B5238` |
| Scarf (the shawl) | brand orange | `#EE5A0A` |
| Kufi (cap) | cream | `#F2EEE3` |
| Beard | near-black | `#1A1416` |
| Beard strands (3 subtle lines on the chin) | dark grey | `#3A3236` |
| Sandals | brown | `#6B4A33` |
| Ink outlines | dark plum | `#241726` (the same ink as every other character) |

Shadows are the same colour made darker, never a different hue.

**Back of the head (back and three-quarter-back views):** short near-black hair covers the **top half** of the back of
the head, from just under the kufi down to a hairline across the middle of the head (dipping slightly at the centre);
the **lower half is skin**, down to the neck.

## Proportions

Drawings use a box 600 units wide and 1000 units tall, with his feet at y = 975 (1000 units = 2.16 m).

- **Height:** 6 heads tall (870 units, about 1.88 m). The bean-head soldiers are only about 3.5 heads tall, so he
  looks longer and calmer than them.
- **Head:** 1 head-height = 145 units. Width = **0.75 × height**. The face narrows toward the chin (a slim, longer
  jaw), never round and full at the bottom.
- **Neck:** short; the collar sits just under the chin.
- **Shoulders:** fairly narrow (144 units across).
- **Arms:** thin, drawn behind the body like the soldiers' arms, ending in small ink-dot hands. No outlined sleeves.
- **Thobe:** ankle-length. Only the small sandals show under the hem.
- **Outlines:** body and clothes 11.8 units wide (same as the soldiers); the head and kufi 30 % thinner; the beard
  thinner again, so the thin sideburns still read as hair. Outlines are thicker on the shadow side.

## Kufi

A small, snug white skull cap sitting **on top** of the head. Its bottom edge rests on the head outline about
0.13 head-heights below the top of the head, and the dome rises only a little above it. Its edge must stay well
above where eyes would be: **no line ever crosses the face**.

## Beard ("beard B")

All near-black `#1A1416`, drawn as one shape with one outline:

- **Sideburns:** thin strips (1/20 of the head width) on the very edge of the jaw, starting at ear level (about
  halfway down the head). **The cheeks stay bare skin.**
- **Moustache:** medium thickness (twice the sideburn width), slightly angular. Its two ends drop down to the chin
  beard as thin strips.
- **Chin beard:** tapers as it goes down and ends in a **smooth rounded bottom**, 1/4 head-height below the chin.
  Three subtle lighter strands run down it.
- **Mouth gap:** between the moustache and the chin beard there is a small, narrow, flat opening, painted in
  **exactly the same tone as the face** around it, with **no outline**. It must read as a natural gap in the beard,
  never as an open mouth. Nothing is drawn inside it.

## Shawl

Deep dusty indigo, worn over his **left shoulder** (on the right side of the picture when he faces us):

- the **front end** falls loosely down the chest to about the waist, with a short fringe at the bottom;
- the **back end** hangs down his back; only a little of it shows behind the shoulder.

It does **not** cross the body like a sash.

## Movement

A calm walk: the body bobs only 1.2 % of his height (the soldiers bob 5 %), the arms swing gently, and the
sandals lift a little with each step. Only a **front view** exists so far: side views, sitting and falling poses
still need to be designed.

## Version history

How we got here. Each version was rendered standing in the bridge scene (frame 300) and judged by eye; v7 was picked
from two side-by-side comparison sheets.

| Version | What changed | Why |
|---|---|---|
| v1 | First design: blank oval face, sand thobe, bright indigo shawl worn diagonally like a sash, white kufi, 6 heads tall. | Starting point: a faceless character in the same cartoon style as the scene. |
| v2 | Wider shoulders, outlined sleeves with skin-tone hands, dusty indigo shawl over the left shoulder, rounder head, shorter neck, sandal tips. | The kufi crossed the face and the body looked too simple; the shawl colour was too bright. |
| v3 | Back to v1 exactly, with only the kufi raised onto the top of the head. | The v2 body changes were not wanted; only the kufi fix was. |
| v4 | v3 plus the v2 dusty shawl, plus a full dark-brown beard. | Combine the parts we liked and give him a beard. |
| v5 | Beard made near-black with lighter strands; a moustache joined to the beard as one shape. | Brown read wrong, and the beard needed a moustache with no gap. |
| v6 | Angular facial hair: sideburns from ear level, sharp V chin beard, notched moustache, open skin gap. | Wanted a crisper beard. Result was wrong: the sides covered the cheeks like a mask, the gap looked like a box, the point was too long. |
| v7 brand | Thobe `#7B5238`, scarf `#EE5A0A`, cream kufi; back of the head: hair on the top half, skin below. | The Maktabatu Al-Ilm brand colours; the back view had the hair the wrong way round. |
| v7 | Head width 0.75 × height with a slimmer jaw; thin sideburns; medium moustache with thin drops; rounded chin beard 1/4 head-height long; small gap in the face's own tone; 30 % thinner head and beard ink; snug, smaller kufi; narrower shoulders. | Picked from comparison sheets: beard length "B" of three, then head width "B" of three (the v6 head looked fat). **Locked.** |
