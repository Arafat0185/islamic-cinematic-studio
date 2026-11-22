// Video 003 "The Sirat": the close-up drawings and the looks.
//  zoomCard   any card redrawn k times larger about an anchor point (head and shoulders, the feet), so close-ups stay
//             sharp: place it at the anchor's height above his soles, with scale 1/k
//  bareFoot   a big bare foot in side view (toes to the right), the thobe's ragged hem above it; lit from below by the
//             fire; the heel lifting about the ball of the foot, the toes gripping the edge
//  openHand   a big hand, palm down, its fingers opening (things slipping out of it)
//  LOOKS      the Traveller in hell (near-black thobe, blood-red scarf, a dirty grey kufi, barefoot) and the crowd:
//             faceless people in dark, burnt colours. Nobody has a face; no eyes are ever drawn.
import { Pen, INK, mul, mix } from "../../draw/toon";
import { LOOKS, type Card } from "../../characters/people";
import { withLook, skinHand, SKIN_T } from "../../characters/traveller";
import type { P2 } from "../../characters/traveller";

Object.assign(LOOKS, {
  sirat: { thobe: "#1d1514", shawl: "#7d0a06", kufi: "#6f6863", sandal: "#C08A5E" },
  h1: { skin: "#a8744f", thobe: "#2a1c18", shawl: "#4a0c08", kufi: "#5a5450", beard: "#1a1416", sandal: "#a8744f" },
  h2: { skin: "#7a4e34", thobe: "#3a2a22", shawl: null, kufi: "#4a4440", beard: "#2a2020", sandal: "#7a4e34" },
  h3: { skin: "#b07a54", thobe: "#141010", shawl: "#5a1410", kufi: "#6a625c", beard: "#3a3030", sandal: "#b07a54" },
  h4: { skin: "#8d5b3c", thobe: "#4a2a1e", shawl: "#1a1010", kufi: "#5e5650", beard: "#1a1416", sandal: "#8d5b3c" },
  h5: { skin: "#c49a74", thobe: "#22180f", shawl: "#6a1a0e", kufi: "#504a46", beard: "#3a2a20", sandal: "#c49a74" },
  h6: { skin: "#a0704c", thobe: "#30201a", shawl: null, kufi: "#625a54", beard: "#cfcac2", strand: "#9a948c", sandal: "#a0704c" },
});
export const CROWD = ["h1", "h2", "h3", "h4", "h5", "h6"];
export const SKIN = "#C08A5E";

/** a card redrawn k times larger about (ax, ay) (design units of the 600 x 1000 card, soles at y = 975) */
export const zoomCard = (c: Card, k: number, ax: number, ay: number, tag = ""): Card => ({
  key: `zoom|${k}|${ax}|${ay}|${tag}|${c.key}`,
  draw: (p) => { const g = p.g; g.save(); g.translate(300, 975); g.scale(k, k); g.translate(-ax, -ay); c.draw(p); g.restore(); },
});
/** height (m) of a design point above the soles (SU = 0.00216 m per unit) */
export const anchorH = (ay: number) => (975 - ay) * 0.00216;

const rotP = (pts: P2[], a: number, cx: number, cy: number): P2[] => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const smoothPath = (pts: P2[], n = 6): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  return out;
};

/** the bare foot: heel at x = 70, toes reaching x ~ 560, sole on y = 975 (lift: 0..1 heel raised about the ball;
 *  grip: 0..1 toes curling down over the edge; sway: the hem's movement) */
export const bareFoot = (o: { lift?: number; grip?: number; sway?: number; skin?: string; hem?: string } = {}): Card => {
  const lift = Math.round((o.lift ?? 0) * 40) / 40, grip = Math.round((o.grip ?? 0) * 20) / 20, sway = Math.round((o.sway ?? 0) * 20) / 20;
  const skin = o.skin ?? SKIN, hem = o.hem ?? "#1d1514";
  return {
    key: `foot|${lift}|${grip}|${sway}|${skin}|${hem}`,
    draw: (p) => {
      const X = 70, Y = 975, ball: P2 = [X + 330, Y], a = -0.55 * lift;
      // the foot (without the toes), heel lifting about the ball of the foot
      let foot: P2[] = [[X + 20, Y], [X + 200, Y + 2], [X + 330, Y], [X + 400, Y - 6], [X + 405, Y - 60], [X + 300, Y - 100], [X + 205, Y - 150], [X + 160, Y - 225], [X + 150, Y - 330],
        [X + 10, Y - 330], [X + 18, Y - 210], [X - 4, Y - 120], [X - 18, Y - 55]];
      foot = rotP(smoothPath(foot), a, ...ball);
      const toes = (dy: number, len: number, h: number, kk: number): P2[] => rotP(rotP(smoothPath([[X + 380, Y - 4 - dy], [X + 380 + len, Y - 8 - dy], [X + 388 + len, Y - 8 - dy - h * 0.6], [X + 370 + len, Y - 8 - dy - h], [X + 380, Y - 6 - dy - h]], 5), 0.55 * grip * kk, X + 385, Y - 20), a, ...ball);
      const dark = mul(skin, [0.32, 0.22, 0.2]), lit = mix(skin, "#ffb070", 0.35);
      const fill = (pts: P2[]) => { p.gradFill(pts, lit, dark, Math.PI / 2, 0.15); p.poly(pts, null, 9); };
      // the far toes peek behind, then the foot, then the big toe in front
      fill(toes(10, 70, 46, 1.2)); fill(foot); fill(toes(0, 100, 60, 1));
      // the creases: the ankle bone, the toe joint, a tendon
      const c = (pts: P2[]) => p.stroke(rotP(pts, a, ...ball), 5, mul(INK, [1, 1, 1]));
      c(smoothPath([[X + 70, Y - 175], [X + 92, Y - 190], [X + 112, Y - 178], [X + 98, Y - 160]], 4).slice(0, 14));
      c([[X + 300, Y - 70], [X + 330, Y - 58]]); c([[X + 190, Y - 130], [X + 240, Y - 108]]);
      // the ragged hem of his thobe over the ankle, swaying
      const hy = Y - 300, hemPts: P2[] = [[X - 90 + 10 * sway, hy - 200], [X + 240 + 10 * sway, hy - 200], [X + 250 + 18 * sway, hy - 30], [X + 210 + 22 * sway, hy + 22], [X + 160 + 20 * sway, hy - 4],
        [X + 110 + 22 * sway, hy + 30], [X + 50 + 20 * sway, hy - 2], [X - 10 + 18 * sway, hy + 26], [X - 70 + 16 * sway, hy - 10], [X - 100 + 12 * sway, hy - 60]];
      p.gradFill(hemPts, mix(hem, "#8a2a10", 0.35), mul(hem, [0.5, 0.5, 0.5]), Math.PI / 2, 0.1); p.poly(hemPts, null, 10);
      p.stroke([[X + 40 + 14 * sway, hy - 190], [X + 60 + 18 * sway, hy - 20]], 5); p.stroke([[X + 150 + 14 * sway, hy - 180], [X + 140 + 20 * sway, hy - 10]], 5);
    },
  };
};

/** a big hand seen from the side, palm down, fingers opening (open 0..1) */
export const openHand = (open: number, look = "sirat"): Card => {
  const k = Math.round(open * 20) / 20;
  return { key: `hand|${k}|${look}`, draw: (p) => withLook(LOOKS[look], () => {
    const g = p.g; g.save(); g.translate(300, 520); g.scale(4.2, 4.2);
    // the sleeve, then the hand turning open
    p.poly([[-140, -40], [-20, -32], [-14, 22], [-140, 30]], "#1d1514", 3);
    skinHand(p, -10, -4, 0.15 + 0.9 * k, 1, Math.PI / 2, 1.25, 1);
    g.restore();
    void SKIN_T;
  }) };
};

/** his two hands held out in front of him, palms up, shaking, the fingers curling on nothing (t: time for the
 *  tremble). Sleeves come up from the card's bottom; the hands sit around design y = 310 (place the card's soles about
 *  0.46 m below the hands with scale 0.32). */
export const shakingHands = (t: number, look = "sirat"): Card => {
  const k = Math.round(t * 15) / 15, tr = (s: number) => 0.06 * Math.sin(k * 31 + s) + 0.03 * Math.sin(k * 53 + 2 * s);
  return { key: `hands2|${k}|${look}`, draw: (p) => withLook(LOOKS[look], () => {
    const g = p.g;
    for (const [x, side] of [[190, 1], [410, -1]] as [number, 1 | -1][]) {
      const curl = 0.5 + 0.4 * Math.sin(k * 4 + side);
      g.save(); g.translate(x + 6 * Math.sin(k * 37 + side), 330 + 5 * Math.sin(k * 29 + side)); g.rotate(side * 0.18 + tr(side));
      p.poly([[-70, 60], [70, 60], [92, 760], [-92, 760]], "#1d1514", 10);                       // the sleeve, from the bottom
      p.stroke([[-30, 120], [-40, 700]], 5); p.stroke([[35, 140], [42, 700]], 5);
      g.scale(3.4, 3.4);
      skinHand(p, 0, 10, -Math.PI / 2 + side * (0.25 + 0.35 * curl), side, Math.PI / 2, 1.35, 1);
      g.restore();
    }
  }) };
};
