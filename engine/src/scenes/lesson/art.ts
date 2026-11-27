// Video 007 "The Lesson": close-up art in the Traveller's ink style.
//  gripHand(k)  his hand on the hospital sheet, seen from the side of the bed; k 0..1 the fingers tighten, curl and pull
//               the sheet into folds (on the deathbed lines). Drawn on a standard card (600 x 1000, base 975), the hand
//               about 300 units long, so put it with scale ~0.3.
import { mul, INK } from "../../draw/toon";
import { SKIN_T } from "../../characters/traveller";
import type { Card } from "../../characters/people";
import type { P2 } from "../../characters/traveller";

const fingerShape = (a: P2, ang: number, L: number, w: number, bend: number): P2[] => {
  const pts: P2[] = [], n = 10, c = Math.cos(ang), s = Math.sin(ang), side = (k: number, d: number): P2 => {
    const u = k / n, curl = bend * u * u * 0.9, ca = Math.cos(ang + curl), sa = Math.sin(ang + curl);
    const x = a[0] + c * L * u * (1 - 0.3 * bend * u), y = a[1] + s * L * u * (1 - 0.3 * bend * u) + 0.32 * L * curl;
    return [x - sa * d * w * (1 - 0.18 * u), y + ca * d * w * (1 - 0.18 * u)];
  };
  for (let k = 0; k <= n; k++) pts.push(side(k, 1));
  const tip = side(n, 0); for (let k = 1; k < 8; k++) { const th = Math.PI / 2 - (k / 8) * Math.PI, rr = w * 0.82; pts.push([tip[0] + Math.cos(ang + th) * rr * 0.9, tip[1] + Math.sin(ang + th) * rr * 0.9]); }
  for (let k = n; k >= 0; k--) pts.push(side(k, -1));
  return pts;
};

export const gripHand = (k0: number, light: number, sleeve = "#c3c9ce"): Card => {
  const k = Math.round(k0 * 24) / 24;
  return { key: `grip|${k}|${light}`, draw: (p) => {
    const g = p.g, skin = SKIN_T, dark = mul(skin, [0.7, 0.6, 0.58]), sheet = "#e9e6df", sheetD = mul(sheet, [0.72, 0.74, 0.8]);
    // the sheet: a wide pale field, pulled into folds toward the hand as it tightens
    const sh: P2[] = [[0, 975], [0, 760], [600, 760], [600, 975]];
    p.gradFill(sh, sheet, sheetD, light, 0.35);
    for (let i = 0; i < 7; i++) { const x = 40 + i * 85, pull = (300 - x) * 0.35 * k;
      p.stroke([[x, 975], [x + pull * 0.4, 880], [x + pull, 800 - 20 * k]], 4 + 2 * k, mul(sheetD, [0.8, 0.8, 0.85])); }
    p.poly(sh, null, 8);
    g.save(); g.translate(300, 820); g.rotate(-0.08 - 0.06 * k);
    // the sleeve of the gown, from the left
    const sl: P2[] = [[-330, -40], [-120, -70], [-90, 60], [-330, 90]];
    p.gradFill(sl, sleeve, mul(sleeve, [0.62, 0.64, 0.7]), light, 0.25); p.poly(sl, null, 10);
    // the back of the hand, then four fingers curling down into the sheet, the thumb over them
    const fingers: [P2, number, number, number][] = [[[40, -62], -0.15, 130, 26], [[52, -28], 0.0, 142, 27], [[50, 6], 0.12, 134, 26], [[40, 36], 0.24, 112, 23]];
    fingers.forEach(([a, ang, L, w], i) => { const f = fingerShape(a, ang + 0.02 * i, L, w, 0.35 + 2.2 * k + 0.05 * i); p.gradFill(f, skin, dark, light, 0.3); p.poly(f, null, 8); });
    const back: P2[] = [[-110, -60], [-40, -82], [40, -74], [70, -40], [72, 20], [52, 56], [-20, 66], [-100, 52]];
    p.gradFill(back, skin, dark, light, 0.3); p.poly(back, null, 10);
    for (const [x0, y0, x1, y1] of [[-60, -50, 20, -58], [-60, -20, 30, -18], [-60, 12, 28, 18]]) p.stroke([[x0, y0], [x1, y1]], 3.5, mul(dark, [0.85, 0.85, 0.85]));
    const th: P2[] = fingerShape([-40, -66], -0.55 + 0.25 * k, 120, 27, 0.2 + 0.9 * k); p.gradFill(th, skin, dark, light, 0.3); p.poly(th, null, 8);
    // the knuckles whiten as it tightens: soft pale marks
    if (k > 0.3) for (const [x, y] of [[66, -50], [76, -18], [74, 14]]) p.dot(x, y, 7 * (k - 0.3), mul(skin, [1.2, 1.15, 1.1]));
    g.restore();
    void INK;
  } };
};
