// "The Traveller": our signature faceless character. His look is locked: characters/traveller/DESIGN.md is the source
// of truth; match it exactly if you change anything here. Drawn with the toon.ts tools (Pen) from the original
// project's bridge short, so he matches its cast ("the soldiers" below).
// Same design space as every card (600 x 1000 units, soles at y = 975, centre x = 300), same plum ink, same
// thick-thin outline (Pen.inkRing) and the same light-driven shading (gradFill / shadedFill).
// Proportions: about 6 head-heights tall (the soldiers are ~3.5), ankle-length sand thobe, dusty indigo shawl over
// his left shoulder (one end down the back, the front end loose to the waist), small snug white kufi, no eyes, nose,
// mouth or brows.
// Version 7 (picked from out/beard_options.png "B" and out/head_options.png "B"):
//   - head width 0.75 x head height, slimmer jaw narrowing to the chin
//   - near-black facial hair: thin sideburns on the jaw edge from ear level (cheeks bare), medium slightly angular
//     moustache whose ends drop to the beard as thin strips, chin beard tapering to a rounded bottom 1/4
//     head-height below the chin, a small narrow gap where a mouth would be, in exactly the face's own tone
//   - 30 % thinner ink on the head, beard and kufi; snug, slightly smaller kufi; slightly narrower shoulders
//   Body, arms, neck and shawl as version 4-6. Backups of earlier versions: ../reference/scratch-render/backup/
// The front view's head is split into frontHeadShape / frontBeard / frontKufi so the back view and the prayer poses
// (travellerPoses.ts) reuse exactly the same pieces. The default front view draws exactly as before.
import { Pen, FrontOpts, INK, mul, mix, blobPts, Blob, thickAngle } from "../draw/toon";

export type P2 = [number, number];

// ---- palette (from the brief) ----
export let SKIN_T = "#C08A5E";
export let THOBE = "#7B5238";   // warm brown (channel brand, 2026-11-19)
export let SHAWL = "#EE5A0A";   // brand orange scarf (2026-11-19); earlier versions: deep dusty indigo #363C58
export let KUFI = "#F2EEE3";
export let SANDAL = "#6b4a33";
export let BEARD = "#1A1416";   // near-black
export let BEARD_STRAND = "#3A3236"; // subtle lighter strands so the beard doesn't merge with the ink outline
// shadow ratios, same values as toon.ts uses for skin and cloth
export const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84];
export const SH_CLOTH: [number, number, number] = [0.66, 0.66, 0.74]; // the brown thobe: shade darker, a touch cooler
export const SH_SHAWL: [number, number, number] = [0.74, 0.68, 0.66]; // the orange scarf: shade darker and a little deeper red

// ---- proportions (design units) ----
export const SOLE = 975;
export const TALL = 870;            // sole to crown: ~1.88 m (1000 units = 2.16 m)
export const HH = TALL / 6;         // one head-height: 6 heads tall
export const OW = 11.8;             // body outline width, same as the soldiers' (5 u at their head width)
export const OW_HEAD = OW * 0.7;    // head, beard and kufi outlines: 30 % thinner (v7)
export const HEAD_RATIO = 0.75;     // head width / head height (v7, head option B)
export const BEARD_LEN = HH / 4;    // chin beard length below the chin (v7, beard option B)
/** sleeve colour and width (sleeves are loose thobe cloth: a thick line with an ink rim, like the soldiers' arms) */
export let SLEEVE = mul(THOBE, [0.9, 0.9, 0.94]);
/** other faceless characters drawn with the Traveller's own pose code, in their own colours (the Traveller is unchanged:
 *  every drawing outside withLook uses his palette). beardless: boys (no beard; the hair keeps the `beard` colour);
 *  shawl null: no shawl. */
export type Look = { skin?: string; thobe?: string; shawl?: string | null; kufi?: string; sandal?: string; beard?: string; strand?: string; beardless?: boolean };
export let NO_BEARD = false, NO_SHAWL = false;
export const withLook = <T>(l: Look | null | undefined, fn: () => T): T => {
  if (!l) return fn();
  const saved = [SKIN_T, THOBE, SHAWL, KUFI, SANDAL, BEARD, BEARD_STRAND, SLEEVE] as const, sb = NO_BEARD, ss = NO_SHAWL;
  SKIN_T = l.skin ?? SKIN_T; THOBE = l.thobe ?? THOBE; SHAWL = l.shawl ?? SHAWL; KUFI = l.kufi ?? KUFI; SANDAL = l.sandal ?? SANDAL;
  BEARD = l.beard ?? BEARD; BEARD_STRAND = l.strand ?? BEARD_STRAND; SLEEVE = mul(THOBE, [0.9, 0.9, 0.94]);
  NO_BEARD = !!l.beardless; NO_SHAWL = l.shawl === null;
  try { return fn(); } finally {
    [SKIN_T, THOBE, SHAWL, KUFI, SANDAL, BEARD, BEARD_STRAND, SLEEVE] = saved; NO_BEARD = sb; NO_SHAWL = ss;
  }
};
export const SLEEVE_W = 26;

/** quadratic curve a -> (near) k -> b as a polyline (same idea as toon.ts `curve`) */
export const qc = (a: P2, k: P2, b: P2, n = 12): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};
/** join polylines without repeating the shared end points */
export const join = (...parts: P2[][]): P2[] => parts.reduce<P2[]>((acc, p, i) => acc.concat(i ? p.slice(1) : p), []);

// ---- the front-view head, in pieces ----
/** head outline of the front view (also the back view), centred on x = 300, head centre at y = hc */
export const frontHeadShape = (hc: number, seed = 1) => {
  const headB = 0.5 * HH, headA = HEAD_RATIO * headB; // half height / half width
  // blank (no eyes, nose, mouth or brows); a less full lower half (nBot 1.75) narrowing toward the chin
  // (egg -0.16) = slimmer, longer jaw
  const H: Blob = { a: headA, b: headB, nTop: 2.0, nBot: 1.75, egg: -0.16, asym: 0, rot: 0, noise: 0, seed };
  const hp = blobPts(300, hc, H);
  /** x of the head outline on the right side at height y (interpolated along the head contour), from x = 300 */
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

/** facial hair of the front view: near-black, one shape, one ink outline, plus the mouth gap in the face's tone.
 *  Sideburns: thin strips (1/20 of the head width) on the very edge of the jaw, from ear level; cheeks bare.
 *  Moustache: medium (twice the sideburn width), slightly angular; its ends drop to the beard as thin strips.
 *  Chin beard: tapers from the jaw and ends 1/4 head-height below the chin in a smooth rounded bottom. */
/** turn / tilt (optional, -1..1): the moustache, mouth gap and chin beard move toward where the face points, while
 *  the sideburns stay on the jaw edges, so a turned or lowered blank face still reads cleanly */
export const frontBeard = (p: Pen, h: ReturnType<typeof frontHeadShape>, hc: number, light: number, faceFill: () => void, turn = 0, tilt = 0) => {
  if (NO_BEARD) return;
  const { hp, edgeX, headA, headB } = h, thick = thickAngle(light);
  const u = headA, v = headB, chin = hc + headB;
  const SB = (2 * headA) / 20;               // sideburn width: 1/20 of the head width
  const yEar = hc + 0.02 * v;                // ear level: about halfway down the head
  const ySide = [yEar, hc + 0.25 * v, hc + 0.5 * v, hc + 0.72 * v]; // sideburn samples down the jaw edge
  const yJ = hc + 0.7 * v;                   // the sideburn's inner edge turns in toward the chin beard here
  const mT = hc + 0.3 * v;                   // moustache top (well below where eyes would be)
  const mB = mT + 2 * SB;                    // moustache: medium = twice the sideburn width
  const gapH = 0.14 * v, cb = mB + gapH;     // the space for the mouth gap, then the chin beard starts
  const gx = 0.3 * u;                        // half width of the space between the moustache ends
  const dx = gx + 0.9 * SB;                  // outer x of the moustache ends: thin strips down to the beard
  const L = BEARD_LEN;
  const sx = turn * 0.3 * headA, sy = -tilt * 0.12 * headB; // where the face's centre moves
  // smooth rounded bottom (half ellipse, right -> lowest point -> left); the beard tapers to half width w first
  const w = 0.34 * u, yB = chin + 0.35 * L, bottom: P2[] = [];
  for (let i = 0; i <= 16; i++) { const a = (Math.PI * i) / 16; bottom.push([300 + sx + w * Math.cos(a), yB + 0.5 * sy + (chin + L - yB) * Math.sin(a)]); }
  // jaw corner where the beard leaves the head and tapers, on the slim jaw
  const yJc = hc + 0.86 * v, jaw: P2 = [edgeX(yJc) + 2, yJc];
  const beard: P2[] = [
    ...ySide.map((y): P2 => [300 + edgeX(y) + 2, y]),                   // right sideburn, on the jaw edge
    [300 + jaw[0], jaw[1]],                                             // jaw corner, then the beard tapers
    ...bottom,
    [300 - jaw[0], jaw[1]],
    ...ySide.slice().reverse().map((y): P2 => [300 - edgeX(y) - 2, y]), // left sideburn, up the jaw edge
    [300 - (edgeX(yEar) - SB), yEar],                                   // sideburn top (thin)
    [300 - (edgeX(hc + 0.25 * v) - SB), hc + 0.25 * v], [300 - (edgeX(hc + 0.5 * v) - SB), hc + 0.5 * v], [300 - (edgeX(yJ) - SB), yJ],
    [300 + sx - dx, cb + sy + 0.12 * v], [300 + sx - dx, mT + sy + 0.06 * v], // in under the cheek, up the moustache end
    [300 + sx - 0.12 * u, mT + sy], [300 + sx, mT + sy + 0.02 * v], [300 + sx + 0.12 * u, mT + sy], // moustache top: slightly angular
    [300 + sx + dx, mT + sy + 0.06 * v], [300 + sx + dx, cb + sy + 0.12 * v],
    [300 + (edgeX(yJ) - SB), yJ], [300 + (edgeX(hc + 0.5 * v) - SB), hc + 0.5 * v], [300 + (edgeX(hc + 0.25 * v) - SB), hc + 0.25 * v],
    [300 + (edgeX(yEar) - SB), yEar],
  ];
  const beardDark = mul(BEARD, [0.72, 0.72, 0.76]);
  p.gradFill(beard, BEARD, beardDark, light, 0.35);
  p.clip(beard, () => { // 3 subtle lighter strands on the chin
    for (const s of [-1, 0, 1]) p.stroke([[300 + sx + s * 0.2 * u, cb + sy + 0.14 * v], [300 + sx + s * 0.08 * u, chin + 0.5 * sy + 0.75 * L]], 2.5, BEARD_STRAND);
  });
  p.inkRing(beard, OW_HEAD * 0.55, thick); // thinner than the head outline so the thin sideburns still show as hair
  // the mouth gap: a small, narrow, flat opening in the beard, painted with the head's own shading (clipped to the
  // gap) so it is exactly the face's tone there; no outline, no mouth, lips or teeth - reads as a gap, not a mouth
  const gap: P2[] = [];
  const gapRx = 0.8 * (gx + 2), gapRy = 0.32 * gapH;
  for (let i = 0; i < 32; i++) { const a = (2 * Math.PI * i) / 32; gap.push([300 + sx + gapRx * Math.cos(a), (mB + cb) / 2 + sy + gapRy * Math.sin(a)]); }
  p.clip(gap, faceFill);
  void hp;
};

/** kufi seen from the front or the back: a small white skull cap, snug on the crown: its base sits on the head
 *  outline and the dome rises only ~7 units above the crown */
export const frontKufi = (p: Pen, h: ReturnType<typeof frontHeadShape>, crown: number, light: number) => {
  const thick = thickAngle(light);
  const kBase = crown + 0.13 * HH;
  const kRx = h.edgeX(kBase) + 2.5, kRy = kBase - crown + 7;
  const kufi: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; kufi.push([300 + kRx - 2 * kRx * t, kBase + 3 * Math.sin(Math.PI * t)]); } // base edge, right -> left
  for (let i = 1; i < 32; i++) { const a = Math.PI + (Math.PI * i) / 32; kufi.push([300 + kRx * Math.cos(a), kBase + kRy * Math.sin(a)]); } // dome, left -> top -> right
  p.gradFill(kufi, KUFI, mul(KUFI, [0.86, 0.86, 0.9]), light);
  p.clip(kufi, () => p.stroke(qc([300 - kRx, kBase - 6], [300, kBase], [300 + kRx, kBase - 6]), 3, mix(KUFI, INK, 0.2))); // stitched band
  p.inkRing(kufi, OW_HEAD * 0.85, thick);
};

/** What the arms are doing in a front view. "down" is the original standing / walking pose. */
export type FrontArms = "down" | "takbir" | "qiyam" | "chest";
/** acting options (all optional; the defaults draw the original front view exactly):
 *  bob: body drop in design units (+ = down; breathing / weight shift; the feet stay planted)
 *  wind: -1..1 breeze on the shawl's hanging ends (+ = toward screen right)
 *  headTurn: -1..1 the face turned toward screen left / right; headTilt: -1 (looking down) .. +1 (looking up)
 *  arms "chest": his right hand placed on his chest, over the heart; the left arm hangs */
export type TravellerOpts = FrontOpts & { arms?: FrontArms; bob?: number; wind?: number; headTurn?: number; headTilt?: number };

/** Ink "mitten" hand for poses where the hand's shape matters (takbir, qiyam, ruku, sujood, sitting). Same ink as
 *  the round ink-dot hands, a little larger, fingers together and the thumb apart, so palm direction can be read
 *  from the thumb side. (x, y) = centre of the palm, ang = direction the fingers point (canvas radians, 0 = right),
 *  thumb = +1 / -1: which side of the fingers the thumb sits on (looking along the fingers, +1 = left of them). */
export const inkHand = (p: Pen, x: number, y: number, ang: number, thumb: 1 | -1, s = 1) => {
  // local: fingers toward +x, palm centre at the origin, thumb on the -y side for thumb = +1
  const loc: P2[] = [[-24, -13], [-6, -15], [14, -14], [26, -11], [33, -5], [34, 2], [30, 9], [14, 13], [-6, 14], [-22, 13], [-28, 6], [-28, -6]];
  const th: P2[] = [[-14, -13], [-2, -24], [8, -28], [12, -24], [6, -16], [0, -10]];
  const c = Math.cos(ang), sn = Math.sin(ang);
  const tr = ([lx, ly]: P2): P2 => { const yy = ly * thumb; return [x + s * (lx * c - yy * sn), y + s * (lx * sn + yy * c)]; };
  p.poly(loc.map(tr), INK, 0);
  p.poly(th.map(tr), INK, 0);
};

/** Open hand in skin tone, palm toward the viewer: fingers together, thumb apart, a soft palm crease, the same
 *  thinner head ink. Used where an open palm must read (takbir). (x, y) = palm centre, ang = direction the fingers
 *  point (canvas radians), thumb = +1 / -1: which side of the fingers the thumb is on (as for inkHand), s = scale. */
export const skinHand = (p: Pen, x: number, y: number, ang: number, thumb: 1 | -1, light: number, s = 1, squash = 1) => {
  // local: fingers toward +x, wrist at -x, thumb on the -y side for thumb = +1
  const loc: P2[] = [
    [-26, 13], [-6, 16], [14, 16], [32, 15], [42, 11], [46, 4], [45, -4], [41, -11], [30, -14], [16, -14],
    [8, -17], [14, -25], [18, -33], [14, -38], [6, -35], [-6, -25], [-16, -16], [-26, -12],
  ];
  const c = Math.cos(ang), sn = Math.sin(ang);
  // squash < 1 narrows the hand across the fingers (a hand seen partly edge-on, e.g. from the side)
  const tr = ([lx, ly]: P2): P2 => { const yy = ly * thumb * squash; return [x + s * (lx * c - yy * sn), y + s * (lx * sn + yy * c)]; };
  let pts = loc.map(tr);
  const a2 = pts.reduce((acc, q, i) => { const r = pts[(i + 1) % pts.length]; return acc + q[0] * r[1] - r[0] * q[1]; }, 0);
  if (a2 < 0) pts = pts.reverse(); // clockwise on screen for inkRing
  p.gradFill(pts, SKIN_T, mul(SKIN_T, SH_SKIN), light, 0.3);
  const line = mix(SKIN_T, INK, 0.45);
  p.clip(pts, () => {
    for (const fy of [-6.5, 0.5, 7.5]) p.stroke([tr([24, fy]), tr([44, fy])], 2.2, line); // fingers together
    p.stroke(qc(tr([-14, -8]), tr([-2, 0]), tr([4, 10]), 8), 2.2, line);                    // palm crease
  });
  p.inkRing(pts, OW_HEAD * 0.8, thickAngle(light));
};

/** Front view of the Traveller. Reads the same FrontOpts as bodyFront (phase = walk cycle, light = key light angle);
 *  expression / blink are ignored on purpose: the face is blank. `arms` picks the arm pose (default "down"). */
export const traveller = (p: Pen, opts: TravellerOpts) => {
  const { phase = 0, mode = "march", light = -2.094, seed = 1, arms = "down" } = opts;
  p.rot = null;
  const two = Math.PI * 2, walking = arms === "down" && (mode === "march" || mode === "stroll");
  const thick = thickAngle(light);
  // calm walk: small bob (1.2 % of the height, vs 5 % for the marching soldiers) and a gentle arm swing
  const bob = walking ? 0.012 * TALL * Math.cos(2 * two * phase) : 0;
  const sw = walking ? Math.sin(two * phase) : 0;

  const crown = SOLE - TALL + bob + (opts.bob ?? 0);
  const wind = opts.wind ?? 0, turn = opts.headTurn ?? 0, tilt = opts.headTilt ?? 0;
  const headB = 0.5 * HH, headA = HEAD_RATIO * headB; // half height / half width
  const hc = crown + headB, chin = hc + headB;
  const neckY = chin + 12;                           // top of the thobe at the neck
  const shY = neckY + 38;                            // shoulder line
  const shX = 72;                                    // half shoulder width (narrow, calm)
  const hemY = SOLE - 24;                            // ankle length: just the sandals show
  const hemX = 100;                                  // the thobe flares a little toward the hem
  const waistY = crown + 2.75 * HH;
  const shawlDark = mul(SHAWL, SH_SHAWL);
  /** the breeze: hanging cloth moves more the further it is below the shoulder */
  const blow = (pts: P2[], k = 7): P2[] => wind === 0 ? pts : pts.map(([x, y]): P2 => [x + wind * k * Math.max(0, Math.min(1, (y - shY) / (waistY - shY))) ** 1.5, y]);

  // ---- shawl, back end: hangs down his back from the left shoulder (screen right); only a sliver shows ----
  const bx = 300 + shX;
  const back: P2[] = join(
    qc([bx - 30, shY - 22], [bx + 10, shY - 26], [bx + 30, shY - 4]),
    qc([bx + 30, shY - 4], [bx + 36, shY + 0.4 * HH], [bx + 30, shY + 0.85 * HH]),
    qc([bx + 30, shY + 0.85 * HH], [bx + 16, shY + 0.9 * HH], [bx + 2, shY + 0.82 * HH]),
    qc([bx + 2, shY + 0.82 * HH], [bx - 6, shY + 0.3 * HH], [bx - 30, shY - 22]),
  ).map((q) => q);
  if (wind) back.splice(0, back.length, ...blow(back, 5));
  if (!NO_SHAWL) {
    p.gradFill(back, shawlDark, mul(shawlDark, [0.85, 0.85, 0.88]), light);
    p.inkRing(back, OW * 0.85, thick);
  }

  // ---- sandals (not bobbing: planted on the ground), alternate small lift with the walk ----
  for (const side of [-1, 1]) {
    const lift = walking ? 7 * Math.max(0, side * Math.sin(two * phase)) : 0;
    const x = 300 + side * 26, y = SOLE - 6 - lift;
    p.stroke([[x - 14, y], [x + 14, y]], 16 + 4, INK);
    p.stroke([[x - 14, y], [x + 14, y]], 16, SANDAL);
  }

  // ---- neck (behind the thobe collar and the head) ----
  p.poly([[286, chin - 20], [314, chin - 20], [316, neckY + 16], [284, neckY + 16]], mul(SKIN_T, SH_SKIN), 0);
  p.stroke([[286, chin - 6], [285, neckY + 10]], 5);
  p.stroke([[314, chin - 6], [315, neckY + 10]], 5);

  // ---- sleeves (behind the body, like the soldiers' arms), long and loose, ink-dot hands ----
  if (arms === "down" || arms === "chest") {
    for (const side of arms === "chest" ? [1] : [-1, 1]) {
      const S: P2 = [300 + side * (shX - 10), shY + 4];
      const E: P2 = [300 + side * (shX + 12), shY + 1.1 * HH];
      const H: P2 = [300 + side * (shX + 16) + side * 2 * sw, crown + 3.55 * HH - 8 * Math.abs(sw) + 10 * side * sw];
      p.line(qc(S, E, H), SLEEVE, SLEEVE_W);
      p.dot(H[0], H[1] + 6, 12.5);
    }
  }

  // ---- thobe: one long shape, clockwise on screen (right side down, hem, left side up, neckline) ----
  const thobe = join(
    qc([322, neckY], [300 + shX * 0.75, neckY + 6], [300 + shX, shY]),          // right shoulder
    qc([300 + shX, shY], [300 + shX + 8, (shY + hemY) / 2], [300 + hemX, hemY]), // right side
    qc([300 + hemX, hemY], [300, hemY + 10], [300 - hemX, hemY]),                // hem
    qc([300 - hemX, hemY], [300 - shX - 8, (shY + hemY) / 2], [300 - shX, shY]), // left side
    qc([300 - shX, shY], [300 - shX * 0.75, neckY + 6], [278, neckY]),           // left shoulder
    qc([278, neckY], [300, neckY + 16], [322, neckY]),                           // neckline
  );
  p.gradFill(thobe, THOBE, mul(THOBE, SH_CLOTH), light);
  p.clip(thobe, () => {
    const fold = mix(THOBE, INK, 0.28);
    // a few long soft folds and the collar placket
    p.stroke(qc([262, shY + 1.4 * HH], [256, (shY + hemY) / 2 + 60], [248, hemY + 4]), 3.5, fold);
    p.stroke(qc([338, shY + 2.2 * HH], [344, hemY - 120], [352, hemY + 4]), 3.5, fold);
    p.stroke(qc([300, hemY - 160], [298, hemY - 80], [302, hemY + 4]), 3, fold);
    p.stroke([[300, neckY + 12], [300, neckY + 70]], 3.5, fold);
  });
  p.inkRing(thobe, OW, thick);

  // ---- shawl, front end: over the left shoulder (screen right), falls loosely down the chest to the waist ----
  const front: P2[] = join(
    qc([300 + 20, neckY - 4], [300 + shX - 18, neckY - 12], [300 + shX + 12, shY + 10]),   // over the shoulder top
    qc([300 + shX + 12, shY + 10], [300 + shX - 8, shY + 0.7 * HH], [300 + 66, waistY]),   // outer edge
    qc([300 + 66, waistY], [300 + 46, waistY + 12], [300 + 22, waistY + 4]),               // loose bottom edge
    qc([300 + 22, waistY + 4], [300 + 16, shY + 0.8 * HH], [300 + 20, neckY - 4]),         // inner edge
  ).map((q) => q);
  if (wind) front.splice(0, front.length, ...blow(front));
  if (!NO_SHAWL) {
  p.gradFill(front, SHAWL, shawlDark, light, 0.3);
  p.clip(front, () => {
    const f1 = mix(shawlDark, INK, 0.35), f2 = mix(SHAWL, "#b8b4a8", 0.14);
    p.stroke(qc([300 + 44, neckY + 18], [300 + 46, shY + 0.9 * HH], [300 + 42, waistY + 8]), 4, f1);
    p.stroke(qc([300 + 62, shY + 6], [300 + 56, shY + 1.0 * HH], [300 + 54, waistY + 10]), 3, f1);
    p.stroke(qc([300 + 58, shY], [300 + 58, shY + 0.9 * HH], [300 + 54, waistY + 8]), 4, f2);
  });
  p.inkRing(front, OW, thick);
  for (let k = 0; k < 6; k++) { // fringe along the bottom edge
    const t = (k + 0.5) / 6, x = 300 + 24 + t * 40 + wind * 7, y = waistY + 8 - 4 * t;
    p.stroke([[x, y], [x + 1, y + 13]], 3.2);
  }
  }

  // ---- qiyam: forearms across the chest, right hand over the left (his right = screen left) ----
  if (arms === "qiyam") {
    const yC = shY + 0.95 * HH; // where the hands rest on the chest
    // left arm (screen right) first: its hand lies under the right hand
    p.line(qc([300 + shX - 6, shY + 6], [300 + shX + 14, shY + 0.9 * HH], [300 + 14, yC + 8]), SLEEVE, SLEEVE_W);
    inkHand(p, 300 - 8, yC + 6, Math.PI, -1, 0.95);
    p.line(qc([300 - shX + 6, shY + 6], [300 - shX - 14, shY + 0.9 * HH], [300 - 22, yC - 2]), SLEEVE, SLEEVE_W);
    inkHand(p, 300 + 4, yC - 6, 0, 1, 1.0);
  }

  // ---- hand on the chest: his right arm (screen left) bends across, the open hand flat over the heart ----
  if (arms === "chest") {
    p.line(qc([300 - shX + 8, shY + 6], [300 - shX - 10, shY + 1.0 * HH], [300 + 4, shY + 0.98 * HH]), SLEEVE, SLEEVE_W);
    skinHand(p, 300 + 34, shY + 0.8 * HH, -0.55, 1, light, 0.95, 0.9);
  }

  // ---- head: blank face, beard, kufi. headTurn / headTilt move the moustache, mouth gap and chin beard (the sideburns
  //      stay on the jaw) and nudge the kufi, inside the same head outline, so the blank face reads as turned, raised
  //      or lowered ----
  const h = frontHeadShape(hc, seed);
  const faceFill = () => p.shadedFill(h.hp, SKIN_T, mul(SKIN_T, SH_SKIN), light, headA);
  faceFill();
  p.inkRing(h.hp, OW_HEAD, thick);
  const g = p.g, moved = turn !== 0 || tilt !== 0;
  frontBeard(p, h, hc, light, faceFill, turn, tilt);
  if (moved) { g.save(); g.translate(turn * 0.12 * headA, 0); }
  frontKufi(p, h, crown - tilt * 5, light);
  if (moved) g.restore();

  // ---- takbir: hands raised to ear level, open palms facing forward (thumbs toward the head, by the ear lobes) ----
  if (arms === "takbir") {
    for (const side of [-1, 1] as const) {
      const S: P2 = [300 + side * (shX - 8), shY + 6];
      const E: P2 = [300 + side * (shX + 40), shY + 0.8 * HH];
      const W: P2 = [300 + side * (headA + 34), hc + 0.5 * HH];
      p.line(qc(S, [300 + side * (shX + 44), shY + 0.55 * HH], E), SLEEVE, SLEEVE_W + 4);
      p.line(qc(E, [300 + side * (shX + 30), hc + 0.75 * HH], W), SLEEVE, SLEEVE_W);
      // fingers up; palms toward the viewer, so each thumb points in toward the head
      // open hands in skin tone, palms toward the viewer, thumbs by the ear lobes
      skinHand(p, 300 + side * (headA + 40), hc + 0.16 * HH, -Math.PI / 2, side === -1 ? -1 : 1, light, 1.15);
    }
  }
};
