// The Traveller's other views and poses, in the same flat style as his front view (traveller.ts): same palette,
// proportions, thick-thin plum ink, light-driven shading, blank face, beard B, snug kufi, sand thobe and the dusty
// indigo shawl over his LEFT shoulder. Same design space: 600 x 1000 units, soles / floor at y = 975.
// Side views face screen right. Facing right, we see his RIGHT side, so his left shoulder (with the shawl) is the far
// one: the shawl is drawn behind the body and shows mainly as its front end along the chest. A drawing that will be
// MIRRORED to face left (we then see his left side) passes shawlNear: true, so the shawl lies over the near shoulder.
//
//   travellerSide      standing, side view
//   travellerBack      standing, back view
//   travellerWalkSide  walk cycle, side view, 4 key frames (key 0..3)
//   travellerRuku      bowing: back flat and level, head in line with the back, hands on the knees
//   travellerSujood    prostrating: forehead and nose on the floor, palms flat, elbows raised off the floor
//   travellerJalsa     sitting between the prostrations (left foot laid under him, right foot upright)
// Takbir and qiyam are front views: traveller(p, { arms: "takbir" | "qiyam" }).
//
// Bent poses are built from overlapping parts (torso, thigh, shin, ...). unionFill() inks every part first and then
// fills them all on top, so the parts merge into ONE silhouette with one outline, like the front-view thobe.
import { Pen, INK, mul, mix, blobPts, Blob, thickAngle } from "../draw/toon";
import {
  P2, SKIN_T, THOBE, SHAWL, KUFI, SANDAL, BEARD, BEARD_STRAND, SH_SKIN, SH_CLOTH, SH_SHAWL,
  SOLE, TALL, HH, OW, OW_HEAD, BEARD_LEN, SLEEVE, SLEEVE_W, qc, join, frontHeadShape, frontBeard, frontKufi, inkHand, skinHand,
} from "./traveller";

/** shawlNear: draw the shawl over the NEAR shoulder (only for drawings that will be mirrored to face left) */
export type PoseOpts = { light?: number; seed?: number; shawlNear?: boolean };
const DEF_LIGHT = (-120 * Math.PI) / 180;

// ---------------- geometry helpers ----------------
const add = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const unit = (a: P2): P2 => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const area = (pts: P2[]) => pts.reduce((s, q, i) => { const r = pts[(i + 1) % pts.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0);
/** clockwise on screen (what Pen.inkRing expects for its outward normal) */
const cw = (pts: P2[]) => (area(pts) < 0 ? pts.slice().reverse() : pts);
/** rounded, tapering limb from a (radius ra) to b (radius rb) */
const cap = (a: P2, b: P2, ra: number, rb: number, n = 12): P2[] => {
  const u = unit(sub(b, a)), nr: P2 = [-u[1], u[0]], pts: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = Math.PI / 2 - (Math.PI * i) / n; pts.push(add(b, add([u[0] * Math.cos(t), u[1] * Math.cos(t)], nr, Math.sin(t)), rb)); }
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 - (Math.PI * i) / n; pts.push(add(a, add([u[0] * Math.cos(t), u[1] * Math.cos(t)], nr, Math.sin(t)), ra)); }
  return pts;
};

/** several parts drawn as ONE shape: ink rings first (twice the width, so the half left outside = OW), then every
 *  part filled with one shared gradient along the light, covering the inner halves and the seams between parts */
const unionFill = (p: Pen, parts: P2[][], base: string, shadow: string, light: number, w = OW, flat = 0.22) => {
  const thick = thickAngle(light), g = p.g;
  const ps = parts.map(cw);
  for (const pts of ps) p.inkRing(pts, 2 * w, thick);
  const dx = Math.cos(light), dy = Math.sin(light);
  let lo = Infinity, hi = -Infinity, cx = 0, cy = 0, n = 0;
  for (const pts of ps) for (const [x, y] of pts) { const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); cx += x; cy += y; n++; }
  cx /= n; cy /= n;
  const dc = cx * dx + cy * dy;
  const gr = g.createLinearGradient(cx + dx * (hi - dc), cy + dy * (hi - dc), cx + dx * (lo - dc), cy + dy * (lo - dc));
  gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
  for (const pts of ps) { p.path(pts, true); g.fillStyle = gr; g.fill(); }
};

/** a sandal seen from the side: heel point, direction heel -> toe (canvas radians), 104 units long */
const sandal = (p: Pen, heel: P2, ang: number) => {
  const c = Math.cos(ang), s = Math.sin(ang), L = 104, T = 20;
  const loc: P2[] = [[0, 0], [L - 10, 0], [L, -6], [L - 6, -T + 4], [L - 40, -T], [8, -T], [-2, -T + 6]];
  p.poly(loc.map(([x, y]): P2 => [heel[0] + x * c - y * s, heel[1] + x * s + y * c]), SANDAL, 4.5);
};

/** a sleeve (loose thobe cloth with an ink rim) along a curve */
/** a sleeve as loose cloth: tapers from the shoulder to the wrist, sags softly on its underside (gravity), shaded,
 *  with one faint fold and a thin outline (not a uniform outlined tube) */
const sleeve = (p: Pen, a: P2, k: P2, b: P2, w = SLEEVE_W) => {
  const c = qc(a, k, b, 16), n = c.length, L: P2[] = [], R: P2[] = [];
  let nEnd: P2 = [0, 0], nStart: P2 = [0, 0], hEnd = 0, hStart = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p0 = c[Math.max(0, i - 1)], p1 = c[Math.min(n - 1, i + 1)];
    const tg = unit(sub(p1, p0)), nr: P2 = [-tg[1], tg[0]];
    const half = (w / 2) * (1.18 - 0.36 * t), sag = 0.2 * w * Math.sin(Math.PI * t);
    const hl = half + Math.max(0, nr[1]) * sag, hr = half + Math.max(0, -nr[1]) * sag;
    L.push(add(c[i], nr, hl)); R.push(add(c[i], nr, -hr));
    if (i === 0) { nStart = nr; hStart = half; }
    if (i === n - 1) { nEnd = nr; hEnd = half; }
  }
  const arc = (ctr: P2, nr: P2, h: number, out: P2): P2[] => { // half circle from +nr side to -nr side, bulging along `out`
    const pts: P2[] = [];
    for (let j = 1; j < 8; j++) { const th = (Math.PI * j) / 8; pts.push(add(add(ctr, nr, h * Math.cos(th)), out, h * Math.sin(th))); }
    return pts;
  };
  const tEnd = unit(sub(c[n - 1], c[n - 2])), tStart = unit(sub(c[0], c[1]));
  const poly = cw([...L, ...arc(c[n - 1], nEnd, hEnd, tEnd), ...R.slice().reverse(), ...arc(c[0], [-nStart[0], -nStart[1]], hStart, tStart)]);
  p.gradFill(poly, SLEEVE, mul(SLEEVE, [0.8, 0.8, 0.86]), DEF_LIGHT, 0.3);
  p.clip(poly, () => p.stroke(qc(add(a, unit(sub(b, a)), 10), k, b, 10), 2.5, mix(SLEEVE, INK, 0.25)));
  p.inkRing(poly, OW * 0.55, thickAngle(DEF_LIGHT));
};
/** a hand lying flat (seen from the side): a thin ink slab from the wrist along `ang` */
const flatHand = (p: Pen, wrist: P2, ang: number, L = 64) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  const loc: P2[] = [[-4, -8], [L - 10, -7], [L, -2], [L - 2, 5], [-4, 7]];
  p.poly(loc.map(([x, y]): P2 => [wrist[0] + x * c - y * s, wrist[1] + x * s + y * c]), INK, 0);
};

// ---------------- heads ----------------
/** Profile head, facing +x before rotation: blank face (no nose bump, no features), sideburn strip from ear level,
 *  medium moustache dropping to a chin beard with a rounded bottom 1/4 head-height below the chin, a small mouth gap
 *  in the face's own tone, snug kufi on the crown. (cx, cy) = head centre, rot = canvas rotation (0 = upright). */
export const profileHead = (p: Pen, cx: number, cy: number, rot: number, light: number, seed = 1) => {
  const g = p.g;
  g.save(); g.translate(cx, cy); g.rotate(rot);
  const L0 = light - rot, thick = thickAngle(L0);
  const u = 0.46 * HH, v = 0.5 * HH, L = BEARD_LEN;
  const H: Blob = { a: u, b: v, nTop: 2.1, nBot: 1.8, egg: -0.08, asym: 0.04, rot: 0, noise: 0, seed };
  const hp = blobPts(0, 0, H);
  const faceFill = () => p.shadedFill(hp, SKIN_T, mul(SKIN_T, SH_SKIN), L0, u);
  faceFill();
  p.inkRing(hp, OW_HEAD, thick);

  // facial hair: sideburn (inside the head outline, from ear level), jaw, rounded chin beard, mouth notch, moustache
  const beard: P2[] = [
    [-0.10 * u, 0.0 * v], [-0.16 * u, 0.45 * v], [-0.12 * u, 0.8 * v],                     // sideburn, back edge
    [0.05 * u, 1.02 * v], [0.25 * u, v + 0.7 * L], [0.5 * u, v + L], [0.75 * u, v + 0.85 * L], // under the jaw, rounded bottom
    [0.93 * u, v + 0.4 * L], [1.02 * u, 0.72 * v],                                          // front of the chin beard
    [0.9 * u, 0.6 * v],                                                                     // mouth gap (notch: the face shows)
    [1.03 * u, 0.47 * v], [1.04 * u, 0.36 * v], [0.8 * u, 0.33 * v], [0.66 * u, 0.4 * v],   // moustache
    [0.62 * u, 0.62 * v], [0.35 * u, 0.7 * v], [0.05 * u, 0.62 * v],                       // its end drops to the beard; cheek stays bare
    [0.02 * u, 0.4 * v], [0.0 * u, 0.05 * v],                                               // sideburn, front edge
  ];
  const bc = cw(beard);
  p.gradFill(bc, BEARD, mul(BEARD, [0.72, 0.72, 0.76]), L0, 0.35);
  p.clip(bc, () => {
    p.stroke([[0.45 * u, v + 0.05 * L], [0.5 * u, v + 0.75 * L]], 2.5, BEARD_STRAND);
    p.stroke([[0.65 * u, v + 0.0 * L], [0.68 * u, v + 0.6 * L]], 2.5, BEARD_STRAND);
  });
  p.inkRing(bc, OW_HEAD * 0.55, thick);

  // kufi: base on the head outline ~0.13 head-heights below the crown (a touch lower at the back), dome ~7 above
  const kb = -v + 0.13 * HH;
  const xAt = (front: boolean) => {
    const r = hp.filter(([x]) => (front ? x > 0 : x < 0)).sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < r.length; i++) if (r[i][1] >= kb) {
      const [x0, y0] = r[i - 1], [x1, y1] = r[i], t = (kb - y0) / Math.max(1e-6, y1 - y0);
      return x0 + (x1 - x0) * t;
    }
    return 0;
  };
  const xf = xAt(true) + 2.5, xb = xAt(false) - 2.5, mx = (xf + xb) / 2, rx = (xf - xb) / 2, ry = kb + v + 7;
  const kufi: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; kufi.push([xf - 2 * rx * t, kb + 5 * t + 3 * Math.sin(Math.PI * t)]); } // base, front -> back
  for (let i = 1; i < 32; i++) { const a = Math.PI + (Math.PI * i) / 32; kufi.push([mx + rx * Math.cos(a), kb + 3 + (ry + 3) * Math.sin(a)]); } // dome, back -> top -> front
  const kc = cw(kufi);
  p.gradFill(kc, KUFI, mul(KUFI, [0.86, 0.86, 0.9]), L0);
  p.clip(kc, () => p.stroke(qc([xb, kb - 2], [mx, kb + 4], [xf, kb - 6]), 3, mix(KUFI, INK, 0.2))); // stitched band
  p.inkRing(kc, OW_HEAD * 0.85, thick);
  g.restore();
};

/** back of the head: normal skin tone (the front-view head shape), a band of short near-black hair just under the
 *  kufi, across the back of the head down to the nape hairline (skin below it), a sliver of the beard at both jaw
 *  edges, the same kufi */
const backHead = (p: Pen, hc: number, crown: number, light: number, seed = 1) => {
  const h = frontHeadShape(hc, seed), thick = thickAngle(light), v = h.headB;
  // beard slivers: drawn first, a little wider than the jaw, so the head covers all but ~5 units on each side
  for (const side of [-1, 1]) {
    const ys = [0.28, 0.45, 0.6, 0.75, 0.88].map((k) => hc + k * v);
    const sl: P2[] = [...ys.map((y): P2 => [300 + side * (h.edgeX(y) + 5), y]), ...ys.slice().reverse().map((y): P2 => [300 + side * (h.edgeX(y) - 8), y])];
    const sc = cw(sl);
    p.gradFill(sc, BEARD, mul(BEARD, [0.72, 0.72, 0.76]), light, 0.35);
    p.inkRing(sc, OW_HEAD * 0.55, thick);
  }
  p.shadedFill(h.hp, SKIN_T, mul(SKIN_T, SH_SKIN), light, h.headA);
  // hair band: from under the kufi down to a nape hairline that dips at the centre; inset from the head's sides
  // hair only as a band across the back of the head and the nape: skin from under the kufi down to the band's upper
  // edge, the band, then the nape hairline that dips at the centre
  const top = hc - 0.12 * v, side0 = hc + 0.42 * v, nape = hc + 0.7 * v, IN = -4; // skin above the band
  const ysL = [top, hc + 0.05 * v, hc + 0.2 * v, hc + 0.32 * v, side0];
  const band: P2[] = [
    ...qc([300 - (h.edgeX(top) - IN), top + 6], [300, top - 0.12 * v], [300 + (h.edgeX(top) - IN), top + 6], 12).slice(0, -1),
    ...ysL.map((y): P2 => [300 + (h.edgeX(y) - IN), y]),
    ...qc([300 + (h.edgeX(side0) - IN), side0], [300, nape + 0.25 * v], [300 - (h.edgeX(side0) - IN), side0], 14).slice(1, -1),
    ...ysL.slice().reverse().map((y): P2 => [300 - (h.edgeX(y) - IN), y]),
  ];
  const bc = cw(band);
  p.clip(h.hp, () => {
    p.gradFill(bc, BEARD, mul(BEARD, [0.75, 0.75, 0.8]), light, 0.35);
    p.clip(bc, () => { // short-hair texture: a few tiny lighter ticks
      for (let i = 0; i < 18; i++) {
        const x = 300 + ((i * 37) % 70) - 35, y = top + 14 + ((i * 53) % Math.max(1, Math.round(nape - top - 30)));
        p.stroke([[x, y], [x + 2, y + 6]], 2, BEARD_STRAND);
      }
    });
  });
  p.inkRing(h.hp, OW_HEAD, thick);
  frontKufi(p, h, crown, light);
};

/** neck as a short skin column from the collar toward the head (drawn before the body and the head) */
const neck = (p: Pen, a: P2, b: P2, light: number) => {
  const pts = cw(cap(a, b, 15, 14));
  p.gradFill(pts, mul(SKIN_T, SH_SKIN), mul(SKIN_T, [0.86, 0.76, 0.74]), light);
  p.inkRing(pts, OW_HEAD, thickAngle(light));
};

// ---------------- shawl ----------------
/** The shawl seen from his left side, for any pose. S = shoulder (on the spine line), B = unit vector from the
 *  shoulder down the back toward the hips, F = half the chest depth toward the chest. The back end lies along the
 *  back; the front end falls from the chest with gravity (frontLen units, or to the floor); a band joins them over the
 *  shoulder. All three are one shape. */
const sideShawl = (p: Pen, S: P2, B: P2, F: P2, light: number, frontLen: number) => {
  const up: P2 = [-B[0], -B[1]];
  // seen from the side the shawl's two ends hang edge-on, so they are narrow strips (~20 units), not panels
  const backTop = add(S, F, -0.8), frontTop = add(S, F, 0.85), over = add(S, up, 12);
  const backEnd = add(backTop, B, 105);
  let frontEnd = add(frontTop, [0, 1], frontLen);
  if (frontEnd[1] > SOLE - 12) frontEnd = [frontEnd[0], SOLE - 12];
  const parts = [cap(backTop, over, 9, 10), cap(over, frontTop, 10, 10), cap(backTop, backEnd, 10, 9), cap(frontTop, frontEnd, 11, 10)];
  const dark = mul(SHAWL, SH_SHAWL);
  unionFill(p, parts, SHAWL, dark, light, OW * 0.85, 0.3);
  for (let k = 0; k < 5; k++) { // fringe at the hanging front end
    const x = frontEnd[0] - 8 + k * 4;
    p.stroke([[x, frontEnd[1] + 14], [x + 1, frontEnd[1] + 26]], 3.2);
  }
};

/** The shawl on an upright body seen from his left side (standing, walking, sitting): it drapes OVER the shoulder and
 *  its front end falls naturally down the front of the chest (a little proud of it, with gravity) to frontLen below
 *  the shoulder line; the back end shows only as a short tail behind the shoulder. (sx, sy) = the body axis at the
 *  shoulder line. Two pieces so the near arm can sit between them: draw `panel` before the arm and `cap` (the part
 *  lying over the top of the shoulder and the upper arm) after it. */
const drapeShawl = (sx: number, sy: number, frontLen: number, light: number, wind = 0) => {
  const thick = thickAngle(light), dark = mul(SHAWL, SH_SHAWL), fold = mix(dark, INK, 0.35);
  const fy = sy + frontLen;
  const panel = (p: Pen) => {
    const raw = join(
      qc([sx + 10, sy - 36], [sx + 42, sy - 32], [sx + 60, sy - 6]),                 // over the shoulder toward the chest
      qc([sx + 60, sy - 6], [sx + 71, sy + 0.6 * HH], [sx + 66, fy]),                // front edge, falling straight down
      qc([sx + 66, fy], [sx + 52, fy + 12], [sx + 36, fy + 4]),                       // loose bottom edge
      qc([sx + 36, fy + 4], [sx + 43, sy + 0.6 * HH], [sx + 36, sy + 24]),            // inner edge, on the chest
      qc([sx + 36, sy + 24], [sx + 8, sy + 16], [sx - 22, sy + 20]),                  // across the shoulder
      qc([sx - 22, sy + 20], [sx - 30, sy + 0.45 * HH], [sx - 40, sy + 0.62 * HH]),   // short tail down the back
      qc([sx - 40, sy + 0.62 * HH], [sx - 54, sy + 0.3 * HH], [sx - 48, sy]),
      qc([sx - 48, sy], [sx - 34, sy - 28], [sx + 10, sy - 36]),                      // back of the shoulder, to the neck
    );
    // the breeze moves the hanging end more the further down it is
    const pts = cw(wind ? raw.map(([x, y]): P2 => [x + wind * 6 * Math.max(0, Math.min(1, (y - sy) / frontLen)) ** 1.5, y]) : raw);
    p.gradFill(pts, SHAWL, dark, light, 0.3);
    p.clip(pts, () => {
      p.stroke(qc([sx + 52, sy + 10], [sx + 58, sy + 0.6 * HH], [sx + 52, fy + 2]), 3.5, fold);
      p.stroke(qc([sx + 44, sy + 30], [sx + 49, sy + 0.7 * HH], [sx + 44, fy]), 2.5, mix(SHAWL, "#b8b4a8", 0.14));
    });
    p.inkRing(pts, OW, thick);
    for (let k = 0; k < 6; k++) { const x = sx + 38 + k * 5.2 + wind * 6, y = fy + 8 - 3 * Math.abs(k - 2.5) / 2.5; p.stroke([[x, y], [x + 1, y + 13]], 3.2); } // fringe
  };
  const cap = (p: Pen) => {
    const pts = cw(join(
      qc([sx - 34, sy - 2], [sx - 2, sy - 36], [sx + 40, sy - 12]),
      qc([sx + 40, sy - 12], [sx + 48, sy + 2], [sx + 42, sy + 16]),
      qc([sx + 42, sy + 16], [sx + 4, sy + 42], [sx - 34, sy + 22]),
      qc([sx - 34, sy + 22], [sx - 40, sy + 10], [sx - 34, sy - 2]),
    ));
    p.gradFill(pts, SHAWL, dark, light, 0.35);
    p.clip(pts, () => p.stroke(qc([sx - 20, sy + 8], [sx + 6, sy + 22], [sx + 32, sy + 6]), 3, fold));
    p.inkRing(pts, OW * 0.85, thick);
  };
  return { panel, cap };
};

// ---------------- standing and walking, side view ----------------
type Foot = { heel: P2; ang: number };
/** raise: 0 = arms down, 1 = takbir (hands at ear level, open palms facing forward) */
type UprightCfg = { near: Foot; far: Foot; armNear: number; armFar: number; bob: number; light: number; seed: number; raise?: number; shawlNear?: boolean; wind?: number };

/** upright body from the side (standing and walking). Feet given as sandals; the thobe skirt spans the feet. */
const uprightSide = (p: Pen, c: UprightCfg) => {
  const { light, bob } = c, thick = thickAngle(light);
  const crown = SOLE - TALL + bob, hc = crown + 0.5 * HH, chin = hc + 0.5 * HH;
  const neckY = chin + 12, shY = neckY + 38, hemY = SOLE - 24, waistY = crown + 2.75 * HH;
  const ankle = (f: Foot): number => f.heel[0] + 22 * Math.cos(f.ang);
  const xs = [ankle(c.near), ankle(c.far)];
  const hb = Math.min(...xs) - 34, hf = Math.max(...xs) + 40;

  // arm geometry: shoulder joint, swing angle a (radians, + = forward); `raise` lifts it into takbir: elbow forward
  // and down, forearm up, the hand at ear level in front of the ear
  const r = Math.max(0, Math.min(1, c.raise ?? 0)), re = r * r * (3 - 2 * r);
  const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const arm = (a: number, dx: number) => {
    const S: P2 = [302 + dx, shY + 20];
    const rot = (q: P2, k: number): P2 => { const x = q[0] - S[0], y = q[1] - S[1], cs = Math.cos(k), sn = Math.sin(-k); return [S[0] + x * cs - y * sn, S[1] + x * sn + y * cs]; };
    const E0 = rot([298 + dx, shY + 1.1 * HH], a), W0 = rot([304 + dx, crown + 3.55 * HH - 6], a * 1.3);
    const E = lerp(E0, [334 + dx, shY + 0.62 * HH], re);
    // the wrist swings forward and up (through a point in front of the chest), not straight through the body
    const Wm: P2 = [372 + dx, shY + 0.9 * HH];
    const W = re < 0.5 ? lerp(W0, Wm, re * 2) : lerp(Wm, [300 + dx, hc + 0.52 * HH], (re - 0.5) * 2); // ends below the ear
    return { S, E, W };
  };
  /** the hand: an ink dot with the arms down; an open skin-tone hand once they rise (fingers turn from down,
   *  through forward, to up; palm facing forward, seen partly edge-on from the side, thumb toward the ear) */
  const hand = (w: P2) => {
    if (r <= 0) { p.dot(w[0], w[1] + 6, 12.5); return; }
    const ang = Math.PI / 2 - Math.PI * re, off = 30 * 0.95;
    skinHand(p, w[0] + Math.cos(ang) * off, w[1] + Math.sin(ang) * off, ang, 1, light, 0.95, 0.62); // by the ear, not over the face
  };

  // far side first: far arm, far sandal (behind the skirt)
  const fa = arm(c.armFar, -6);
  sleeve(p, fa.S, fa.E, fa.W);
  hand(fa.W);
  sandal(p, c.far.heel, c.far.ang);
  sandal(p, c.near.heel, c.near.ang);
  // shawl on the far shoulder: drawn behind the body (the front end shows along the chest)
  const shawl = drapeShawl(300, shY, waistY - shY, light, c.wind ?? 0);
  if (!c.shawlNear) { shawl.panel(p); shawl.cap(p); }

  neck(p, [302, neckY + 14], [308, chin - 18], light);

  // thobe: one shape, back of the neck -> down the back -> hem -> up the front -> collar
  const body = join(
    qc([290, neckY - 2], [262, shY - 6], [256, shY + 30]),            // back of the shoulder
    qc([256, shY + 30], [246, waistY - 60], [250, waistY + 40]),       // down the back
    qc([250, waistY + 40], [hb + 12, (waistY + hemY) / 2 + 80], [hb, hemY]),
    qc([hb, hemY], [(hb + hf) / 2, hemY + 10], [hf, hemY]),            // hem
    qc([hf, hemY], [356, (waistY + hemY) / 2 + 60], [350, waistY + 30]),
    qc([350, waistY + 30], [362, shY + 1.0 * HH], [342, shY + 4]),     // belly and chest
    qc([342, shY + 4], [334, neckY - 2], [318, neckY - 2]),            // front of the shoulder
    qc([318, neckY - 2], [304, neckY + 8], [290, neckY - 2]),          // collar
  );
  const bp = cw(body);
  p.gradFill(bp, THOBE, mul(THOBE, SH_CLOTH), light);
  p.clip(bp, () => {
    const fold = mix(THOBE, INK, 0.28);
    p.stroke(qc([300, waistY + 60], [(300 + hb) / 2 + 20, hemY - 150], [hb + 30, hemY + 4]), 3.5, fold);
    p.stroke(qc([318, waistY + 80], [(318 + hf) / 2, hemY - 120], [hf - 30, hemY + 4]), 3.5, fold);
  });
  p.inkRing(bp, OW, thick);

  // near shoulder: shawl front end (falls down the chest), near arm, shawl over the shoulder; then the head
  if (c.shawlNear) shawl.panel(p);
  const na = arm(c.armNear, 0);
  sleeve(p, na.S, na.E, na.W);
  if (c.shawlNear) shawl.cap(p);
  profileHead(p, 312, hc, 0, light, c.seed);
  hand(na.W); // after the head: the near hand is in front of the ear
};

/** standing, side view (facing screen right) */
export const travellerSide = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT;
  uprightSide(p, { near: { heel: [262, SOLE], ang: 0 }, far: { heel: [254, SOLE - 2], ang: 0 }, armNear: 0, armFar: 0, bob: 0, light, seed: o.seed ?? 1, shawlNear: o.shawlNear });
};

/** walk cycle, side view: key 0 = contact (right / far foot forward), 1 = passing, 2 = contact (left / near foot
 *  forward), 3 = passing. Calm stride; the body bobs 1.2 % of his height (low at contact, high at passing). */
export const travellerWalkSide = (p: Pen, key: number, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT, k = ((key % 4) + 4) % 4, bobA = 0.006 * TALL;
  const front: Foot = { heel: [338, SOLE], ang: -0.3 };                                   // heel strike, toes up
  const backToe: P2 = [262, SOLE], ba = 0.5;
  const back: Foot = { heel: [backToe[0] - 104 * Math.cos(ba), backToe[1] - 104 * Math.sin(ba)], ang: ba }; // pushing off, heel up
  const planted: Foot = { heel: [258, SOLE], ang: 0 };
  const lifted: Foot = { heel: [262, SOLE - 30], ang: 0.12 };                              // swinging through
  const cfg = [
    { near: back, far: front, armNear: 0.26, armFar: -0.26, bob: bobA },
    { near: lifted, far: planted, armNear: 0.0, armFar: 0.0, bob: -bobA },
    { near: front, far: back, armNear: -0.26, armFar: 0.26, bob: bobA },
    { near: planted, far: lifted, armNear: 0.0, armFar: 0.0, bob: -bobA },
  ][k];
  uprightSide(p, { ...cfg, light, seed: o.seed ?? 1, shawlNear: o.shawlNear });
};

/** Continuous walk, side view, for animation. phase: walk cycle (1 = two steps), k: 0..1 how much the walk is
 *  "on" (0 = standing still with the feet together, used to start and stop), stride: step length in design units,
 *  raise: takbir arms (0..1). Each foot is planted for half the cycle and slides BACK in the card exactly as fast as
 *  the body moves forward (one stride per half cycle), so if the card moves forward by `stride` per half cycle the
 *  planted foot stays still on the floor. Heel strike pivots on the heel, toe-off on the toe. phase 0.25 + n/2 =
 *  feet together. */
/** o.bob: extra body drop in design units (+ = down), e.g. a settle after a turn */
export const travellerWalkPhase = (p: Pen, phase: number, k: number, stride: number, o: PoseOpts & { raise?: number; bob?: number; wind?: number } = {}) => {
  const light = o.light ?? DEF_LIGHT, A = stride, LEN = 104, LIFT = 30 * k;
  const sm = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const foot = (u0: number): Foot => {
    const u = ((u0 % 1) + 1) % 1;
    let xh: number, ang: number, lift = 0;
    if (u < 0.5) {                                   // stance: flat-heel position moves back at body speed
      xh = A / 2 - (u / 0.5) * A;
      ang = -0.25 * k * (1 - sm(u / 0.08)) + 0.45 * k * sm((u - 0.4) / 0.1);
    } else {                                         // swing: forward again, lifted
      const v = (u - 0.5) / 0.5;
      xh = -A / 2 + A * sm(v);
      lift = LIFT * Math.sin(Math.PI * v);
      ang = 0.45 * k * (1 - sm(v * 3)) - 0.25 * k * sm((v - 0.7) / 0.3);
    }
    // toe-down angles pivot on the toe (where the flat toe would be), heel-down angles on the heel
    const heel: P2 = ang > 0
      ? [262 + xh + LEN - LEN * Math.cos(ang), SOLE - lift - LEN * Math.sin(ang)]
      : [262 + xh, SOLE - lift];
    return { heel, ang };
  };
  const un = phase, uf = phase + 0.5;
  uprightSide(p, {
    near: foot(un), far: foot(uf),
    armNear: -0.26 * k * Math.cos(2 * Math.PI * un), armFar: 0.26 * k * Math.cos(2 * Math.PI * un),
    bob: 0.006 * TALL * k * Math.cos(4 * Math.PI * phase) + (o.bob ?? 0), light, seed: o.seed ?? 1, raise: o.raise, shawlNear: o.shawlNear, wind: o.wind,
  });
};

// ---------------- three-quarter views (turned 45 degrees toward screen right) ----------------
/** head outline for a three-quarter view: a little wider than the front view (between front 0.75 and profile 0.92),
 *  fuller on the side it faces; same structure as frontHeadShape so frontBeard / frontKufi can use it */
const head34 = (hc: number, seed: number, faceSign: 1 | -1) => {
  const headB = 0.5 * HH, headA = 0.84 * headB;
  const H: Blob = { a: headA, b: headB, nTop: 2.0, nBot: 1.8, egg: -0.12, asym: 0.05 * faceSign, rot: 0, noise: 0, seed };
  const hp = blobPts(300, hc, H);
  const edgeX = (y: number) => {
    const r = hp.filter(([x]) => x > 300).sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < r.length; i++) if (r[i][1] >= y) {
      const [x0, y0] = r[i - 1], [x1, y1] = r[i], t = (y - y0) / Math.max(1e-6, y1 - y0);
      return x0 + (x1 - x0) * t - 300;
    }
    return r[r.length - 1][0] - 300;
  };
  return { hp, edgeX, headA, headB };
};

/** shared body of both three-quarter views: one thobe shape, slightly narrower than the front view, the neckline
 *  centred `nx` units toward the side he faces (front view) or a high back neckline (back view) */
const body34 = (p: Pen, light: number, crown: number, back: boolean) => {
  const thick = thickAngle(light);
  const chin = crown + HH, neckY = chin + 12, shY = neckY + 38, hemY = SOLE - 24;
  const nx = back ? -8 : 10; // neckline centre offset
  const thobe = cw(join(
    qc([300 + nx + 20, neckY], [300 + 50, neckY + 6], [300 + 62, shY]),                 // far shoulder (narrower)
    qc([300 + 62, shY], [300 + 78, (shY + hemY) / 2], [300 + 86, hemY]),                // far side / chest edge
    qc([300 + 86, hemY], [300 - 2, hemY + 10], [300 - 92, hemY]),                       // hem
    qc([300 - 92, hemY], [300 - 76, (shY + hemY) / 2], [300 - 70, shY]),                // near side
    qc([300 - 70, shY], [300 - 56, neckY + 4], [300 + nx - 20, neckY]),                 // near shoulder
    qc([300 + nx - 20, neckY], [300 + nx, neckY + (back ? 6 : 16)], [300 + nx + 20, neckY]), // neckline
  ));
  p.gradFill(thobe, THOBE, mul(THOBE, SH_CLOTH), light);
  p.clip(thobe, () => {
    const fold = mix(THOBE, INK, 0.28);
    p.stroke(qc([300 - 34, shY + 1.4 * HH], [300 - 42, (shY + hemY) / 2 + 60], [300 - 50, hemY + 4]), 3.5, fold);
    p.stroke(qc([300 + 34, shY + 2.2 * HH], [300 + 40, hemY - 120], [300 + 48, hemY + 4]), 3.5, fold);
    if (!back) p.stroke([[300 + nx, neckY + 12], [300 + nx + 2, neckY + 70]], 3.5, fold); // collar placket
  });
  p.inkRing(thobe, OW, thick);
  return { chin, neckY, shY, hemY, waistY: crown + 2.75 * HH };
};

/** arms of the three-quarter views: hanging, ink-dot hands; the near arm a little in front of the body's edge */
const arms34 = (p: Pen, crown: number, shY: number) => {
  const hy = crown + 3.55 * HH;
  sleeve(p, [300 - 60, shY + 4], [300 - 82, shY + 1.1 * HH], [300 - 84, hy]);
  p.dot(300 - 84, hy + 6, 12.5);
  sleeve(p, [300 + 54, shY + 4], [300 + 72, shY + 1.1 * HH], [300 + 76, hy - 4]);
  p.dot(300 + 76, hy + 2, 12.5);
};

/** feet of the three-quarter views: sandals pointing diagonally toward the facing side (front) or away (back) */
const feet34 = (p: Pen, back: boolean) => {
  const d = back ? -1 : 1;
  for (const [x, y] of [[322, SOLE - 9], [278, SOLE - 4]] as P2[]) {
    const a: P2 = [x - 16, y + 3 * d], b: P2 = [x + 18, y - 3 * d];
    p.stroke([a, b], 20, INK); p.stroke([a, b], 16, SANDAL);
  }
};

/** Three-quarter FRONT view, turned toward screen right (between the front and the side view). Facing right we see
 *  his front and his right side, so the shawl's shoulder (his left) is the far one: its front end lies on the far
 *  part of the chest. shawlNear (for a mirrored, left-facing card) puts it over the near shoulder instead. */
export const travellerThreeQuarterFront = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT, thick = thickAngle(light), seed = o.seed ?? 1;
  const crown = SOLE - TALL, hc = crown + 0.5 * HH;
  const shawlDark = mul(SHAWL, SH_SHAWL), near = !!o.shawlNear;
  const chin = crown + HH, neckY = chin + 12, shY = neckY + 38, waistY = crown + 2.75 * HH;
  // shawl back end: only shows behind the shoulder it hangs from (far: right edge; near: left edge)
  const bs = near ? -1 : 1, bx = 300 + bs * 62;
  const backEnd = cw(join(
    qc([bx - bs * 28, shY - 20], [bx + bs * 10, shY - 24], [bx + bs * 26, shY - 2]),
    qc([bx + bs * 26, shY - 2], [bx + bs * 32, shY + 0.4 * HH], [bx + bs * 26, shY + 0.85 * HH]),
    qc([bx + bs * 26, shY + 0.85 * HH], [bx + bs * 12, shY + 0.9 * HH], [bx, shY + 0.82 * HH]),
    qc([bx, shY + 0.82 * HH], [bx - bs * 6, shY + 0.3 * HH], [bx - bs * 28, shY - 20]),
  ));
  p.gradFill(backEnd, shawlDark, mul(shawlDark, [0.85, 0.85, 0.88]), light);
  p.inkRing(backEnd, OW * 0.85, thick);
  feet34(p, false);
  p.poly([[300 + 10 - 14, chin - 20], [300 + 10 + 14, chin - 20], [300 + 10 + 16, neckY + 16], [300 + 10 - 16, neckY + 16]], mul(SKIN_T, SH_SKIN), 0);
  arms34(p, crown, shY);
  body34(p, light, crown, false);
  // shawl front end on the chest: over the far shoulder (right) or the near shoulder (left), down to the waist
  const s = near ? -1 : 1, ix = 300 + 10 + s * 16, ox = near ? 300 - 62 : 300 + 56;
  const front = cw(join(
    qc([ix, neckY - 4], [(ix + ox) / 2, neckY - 12], [ox + s * 10, shY + 8]),
    qc([ox + s * 10, shY + 8], [ox - s * 4, shY + 0.7 * HH], [ox - s * 4, waistY]),
    qc([ox - s * 4, waistY], [(ix + ox) / 2, waistY + 12], [ix + s * 4, waistY + 4]),
    qc([ix + s * 4, waistY + 4], [ix - s * 2, shY + 0.8 * HH], [ix, neckY - 4]),
  ));
  p.gradFill(front, SHAWL, shawlDark, light, 0.3);
  p.clip(front, () => p.stroke(qc([(ix + ox) / 2, neckY + 18], [(ix + ox) / 2 + s * 2, shY + 0.9 * HH], [(ix + ox) / 2, waistY + 8]), 4, mix(shawlDark, INK, 0.35)));
  p.inkRing(front, OW, thick);
  for (let k = 0; k < 6; k++) { const x = Math.min(ix, ox) + 6 + k * (Math.abs(ox - ix) - 12) / 5; p.stroke([[x, waistY + 6], [x + 1, waistY + 19]], 3.2); }
  // head: wider outline, the face turned toward screen right (beard shifted that way and foreshortened)
  const h = head34(hc, seed, 1), hf = frontHeadShape(hc, seed);
  const faceFill = () => p.shadedFill(h.hp, SKIN_T, mul(SKIN_T, SH_SKIN), light, h.headA);
  faceFill();
  p.inkRing(h.hp, OW_HEAD, thick);
  const g = p.g;
  g.save(); g.translate(300 + 0.34 * h.headA, 0); g.scale(0.82, 1); g.translate(-300, 0);
  frontBeard(p, hf, hc, light, faceFill);
  g.restore();
  frontKufi(p, h, crown, light);
};

/** Three-quarter BACK view, turned away toward screen right (between the side and the back view): his back and right
 *  side. Back of the head (skin, hair band under the kufi) with the cheek, jaw and a sliver of beard at the right
 *  edge; the shawl's back end hangs down the far (left) part of his back. shawlNear: on the near part instead. */
export const travellerThreeQuarterBack = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT, thick = thickAngle(light), seed = o.seed ?? 1;
  const crown = SOLE - TALL, hc = crown + 0.5 * HH;
  const shawlDark = mul(SHAWL, SH_SHAWL), near = !!o.shawlNear;
  const chin = crown + HH, neckY = chin + 12, shY = neckY + 38;
  feet34(p, true);
  p.poly([[300 - 6 - 16, chin - 30], [300 - 6 + 16, chin - 30], [300 - 6 + 18, neckY + 16], [300 - 6 - 18, neckY + 16]], mul(SKIN_T, SH_SKIN), 0);
  arms34(p, crown, shY);
  body34(p, light, crown, true);
  // shawl back end hanging down the back from the far (left) or near (right) shoulder
  const s = near ? 1 : -1, bx = 300 + s * 52;
  const back = cw(join(
    qc([bx - s * 46, neckY - 6], [bx - s * 6, neckY - 12], [bx + s * 14, shY + 10]),
    qc([bx + s * 14, shY + 10], [bx + s * 8, shY + 0.6 * HH], [bx - s * 2, shY + 1.15 * HH]),
    qc([bx - s * 2, shY + 1.15 * HH], [bx - s * 24, shY + 1.25 * HH], [bx - s * 46, shY + 1.15 * HH]),
    qc([bx - s * 46, shY + 1.15 * HH], [bx - s * 44, shY + 0.5 * HH], [bx - s * 46, neckY - 6]),
  ));
  p.gradFill(back, SHAWL, shawlDark, light, 0.3);
  p.clip(back, () => p.stroke(qc([bx - s * 22, shY], [bx - s * 20, shY + 0.6 * HH], [bx - s * 24, shY + 1.15 * HH]), 4, mix(shawlDark, INK, 0.35)));
  p.inkRing(back, OW, thick);
  for (let k = 0; k < 6; k++) { const x = Math.min(bx, bx - s * 46) + 4 + k * 7.5; p.stroke([[x, shY + 1.2 * HH], [x + 1, shY + 1.2 * HH + 13]], 3.2); }
  // head: the far cheek and jaw show at the right edge with a sliver of beard; hair band under the kufi, offset left
  const h = head34(hc, seed, 1), v = h.headB;
  const ys = [0.15, 0.35, 0.55, 0.72, 0.86].map((k) => hc + k * v);
  const sl = cw([...ys.map((y): P2 => [300 + h.edgeX(y) + 6, y]), ...ys.slice().reverse().map((y): P2 => [300 + h.edgeX(y) - 12, y])]);
  p.gradFill(sl, BEARD, mul(BEARD, [0.72, 0.72, 0.76]), light, 0.35);
  p.inkRing(sl, OW_HEAD * 0.55, thick);
  p.shadedFill(h.hp, SKIN_T, mul(SKIN_T, SH_SKIN), light, h.headA);
  const top = hc - 0.12 * v, side0 = hc + 0.42 * v, nape = hc + 0.7 * v; // skin above the band, as in the back view
  p.clip(h.hp, () => {
    // hair from the far side across to ~1/4 of the way into the near (face) side; the cheek in front stays skin
    const band = cw([
      [300 - h.headA - 10, top], [300 + 0.28 * h.headA, top], [300 + 0.22 * h.headA, side0],
      ...qc([300 + 0.22 * h.headA, side0], [300 - 0.3 * h.headA, nape + 0.25 * v], [300 - h.headA - 10, side0], 12).slice(1),
    ]);
    p.gradFill(band, BEARD, mul(BEARD, [0.75, 0.75, 0.8]), light, 0.35);
  });
  p.inkRing(h.hp, OW_HEAD, thick);
  frontKufi(p, h, crown, light);
};

// ---------------- back view ----------------
/** standing, back view: same outline as the front; close-cropped hair under the kufi; the shawl's back end hangs
 *  down his back from his left shoulder (screen LEFT when we see his back) */
export const travellerBack = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT, thick = thickAngle(light);
  const crown = SOLE - TALL, hc = crown + 0.5 * HH, chin = hc + 0.5 * HH;
  const neckY = chin + 12, shY = neckY + 38, shX = 72, hemY = SOLE - 24, hemX = 100;
  for (const side of [-1, 1]) {
    const x = 300 + side * 26, y = SOLE - 6;
    p.stroke([[x - 14, y], [x + 14, y]], 20, INK);
    p.stroke([[x - 14, y], [x + 14, y]], 16, SANDAL);
  }
  // nape: a skin column under the head
  p.poly([[284, chin - 30], [316, chin - 30], [318, neckY + 16], [282, neckY + 16]], mul(SKIN_T, SH_SKIN), 0);
  p.stroke([[285, chin - 10], [284, neckY + 10]], 5);
  p.stroke([[315, chin - 10], [316, neckY + 10]], 5);
  for (const side of [-1, 1]) {
    const S: P2 = [300 + side * (shX - 10), shY + 4], E: P2 = [300 + side * (shX + 12), shY + 1.1 * HH], Hd: P2 = [300 + side * (shX + 16), crown + 3.55 * HH];
    sleeve(p, S, E, Hd);
    p.dot(Hd[0], Hd[1] + 6, 12.5);
  }
  const thobe = join(
    qc([322, neckY], [300 + shX * 0.75, neckY + 2], [300 + shX, shY]),
    qc([300 + shX, shY], [300 + shX + 8, (shY + hemY) / 2], [300 + hemX, hemY]),
    qc([300 + hemX, hemY], [300, hemY + 10], [300 - hemX, hemY]),
    qc([300 - hemX, hemY], [300 - shX - 8, (shY + hemY) / 2], [300 - shX, shY]),
    qc([300 - shX, shY], [300 - shX * 0.75, neckY + 2], [278, neckY]),
    qc([278, neckY], [300, neckY + 6], [322, neckY]),                 // the back neckline sits higher than the front
  );
  p.gradFill(thobe, THOBE, mul(THOBE, SH_CLOTH), light);
  p.clip(thobe, () => {
    const fold = mix(THOBE, INK, 0.28);
    p.stroke(qc([338, shY + 1.4 * HH], [344, (shY + hemY) / 2 + 60], [352, hemY + 4]), 3.5, fold);
    p.stroke(qc([262, shY + 2.2 * HH], [256, hemY - 120], [248, hemY + 4]), 3.5, fold);
    p.stroke(qc([300, hemY - 160], [302, hemY - 80], [298, hemY + 4]), 3, fold);
  });
  p.inkRing(thobe, OW, thick);
  // shawl back end: over the left shoulder (screen left), hanging down the back to below the shoulder blades
  const bx = 300 - shX, sDark = mul(SHAWL, SH_SHAWL);
  const back: P2[] = join(
    qc([bx + 52, neckY - 6], [bx + 10, neckY - 12], [bx - 12, shY + 10]),
    qc([bx - 12, shY + 10], [bx - 6, shY + 0.6 * HH], [bx + 4, shY + 1.15 * HH]),
    qc([bx + 4, shY + 1.15 * HH], [bx + 28, shY + 1.25 * HH], [bx + 52, shY + 1.15 * HH]),
    qc([bx + 52, shY + 1.15 * HH], [bx + 50, shY + 0.5 * HH], [bx + 52, neckY - 6]),
  );
  p.gradFill(cw(back), SHAWL, sDark, light, 0.3);
  p.clip(cw(back), () => p.stroke(qc([bx + 26, shY], [bx + 24, shY + 0.6 * HH], [bx + 28, shY + 1.15 * HH]), 4, mix(sDark, INK, 0.35)));
  p.inkRing(cw(back), OW, thick);
  for (let k = 0; k < 6; k++) { const x = bx + 8 + k * 8; p.stroke([[x, shY + 1.2 * HH], [x + 1, shY + 1.2 * HH + 13]], 3.2); }
  backHead(p, hc, crown, light, o.seed ?? 1);
};

// ---------------- prayer, side view ----------------
const thobeDark = mul(THOBE, SH_CLOTH);

/** ruku: hips over the heels, legs straight, back flat and level, head in line with the back (not raised or
 *  lowered), arms straight with the hands on the knees */
export const travellerRuku = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT;
  const hip: P2 = [196, 548], sh: P2 = [418, 548], knee: P2 = [206, 762];
  const head: P2 = [512, 536]; // raised so the back of the head continues the flat line of the back
  // far arm and hand (behind), sandals
  sleeve(p, [408, 560], [330, 652], [252, 742]);
  inkHand(p, 244, 768, Math.PI / 2 + 0.15, 1, 0.95);
  sandal(p, [176, SOLE - 2], 0); sandal(p, [184, SOLE], 0);
  neck(p, [430, 546], [470, 540], light);
  const shawl = () => sideShawl(p, sh, [-1, 0], [0, 52], light, 120);
  if (!o.shawlNear) shawl(); // far shoulder: behind the body
  const torso = cap(hip, sh, 60, 52);
  const skirt: P2[] = [[146, 560], [150, 760], [158, 951], [264, 951], [250, 800], [252, 660], [300, 600], [240, 520]];
  unionFill(p, [torso, skirt], THOBE, thobeDark, light);
  if (o.shawlNear) shawl();
  profileHead(p, head[0], head[1], 1.48, light, o.seed ?? 1); // crown forward, a touch above level: not hanging
  // near arm: straight from the shoulder to the knee, hand over the kneecap
  sleeve(p, [414, 566], [334, 656], [256, 746]);
  inkHand(p, knee[0] + 34, knee[1] + 8, Math.PI / 2 + 0.2, 1, 1.0);
};

/** sujood: forehead and nose on the floor, palms flat beside the head, elbows raised off the floor and away from the
 *  sides, knees and toes on the floor, hips raised */
export const travellerSujood = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT;
  const knee: P2 = [250, 952], hip: P2 = [232, 768], sh: P2 = [418, 842], ankle: P2 = [110, 935];
  // feet upright on the toes (heels up, soles facing back)
  sandal(p, [78, 866], 1.47); sandal(p, [88, 870], 1.47);
  // far arm: shoulder -> raised elbow -> wrist, palm flat (mostly hidden behind the head)
  sleeve(p, [408, 838], [430, 880], [462, 960]);
  flatHand(p, [466, 963], 0.05);
  neck(p, [430, 850], [480, 892], light);
  const B = unit(sub(hip, sh)), F: P2 = [-B[1] * 50, B[0] * 50]; // chest side faces the floor
  const shawl = () => sideShawl(p, sh, B, F[1] > 0 ? F : [-F[0], -F[1]], light, 200);
  if (!o.shawlNear) shawl(); // far shoulder: behind the body
  const parts = [cap(knee, hip, 48, 56), cap(knee, ankle, 40, 30), cap(hip, sh, 58, 50)];
  unionFill(p, parts, THOBE, thobeDark, light);
  if (o.shawlNear) shawl();
  profileHead(p, 505, 905, 1.75, light, o.seed ?? 1);
  // near arm on top: elbow raised clear of the floor, palm flat on the floor beside the head
  sleeve(p, [422, 846], [446, 878], [476, 958]);
  flatHand(p, [480, 962], 0.04);
};

/** sitting between the prostrations (iftirash): sitting on the left foot laid under him, the right foot upright on
 *  its toes behind, back straight, hands resting on the thighs near the knees */
export const travellerJalsa = (p: Pen, o: PoseOpts = {}) => {
  const light = o.light ?? DEF_LIGHT;
  const seat: P2 = [238, 880], knee: P2 = [432, 944], ankle: P2 = [226, 957], sh: P2 = [252, 652];
  // right foot (the near side, facing right) upright behind him; left foot laid flat under the seat
  sandal(p, [166, 884], 1.42);
  sandal(p, [146, SOLE - 2], 0.0);
  // far arm and hand
  sleeve(p, [246, 668], [262, 790], [356, 882]);
  flatHand(p, [352, 880], 0.32, 58);
  neck(p, [256, 630], [264, 590], light);
  const shawl = drapeShawl(254, 648, 150, light);
  if (!o.shawlNear) { shawl.panel(p); shawl.cap(p); } // far shoulder: behind the body
  const parts = [cap(seat, sh, 64, 52), cap(seat, knee, 52, 38), cap(knee, ankle, 34, 26)];
  unionFill(p, parts, THOBE, thobeDark, light);
  if (o.shawlNear) shawl.panel(p);
  // near arm: hand resting on the thigh, fingers toward the knee
  sleeve(p, [258, 668], [276, 800], [366, 886]);
  flatHand(p, [364, 884], 0.3, 60);
  if (o.shawlNear) shawl.cap(p);
  profileHead(p, 266, 548, 0.06, light, o.seed ?? 1);
};
