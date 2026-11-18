// "The Traveller": a faceless character drawn with the same toon.ts tools as the soldiers.
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
//   Body, arms, neck and shawl as version 4-6. Backups of earlier versions: backup/traveller_v*.ts.txt
import { Pen, Outfit, FrontOpts, INK, mul, mix, blobPts, Blob, thickAngle } from "./toon";

type P2 = [number, number];

// ---- palette (from the brief) ----
const SKIN_T = "#C08A5E";
const THOBE = "#CDB58C";
const SHAWL = "#363C58";   // deep dusty indigo (v2): greyer than #24346A on purpose, because the card light + grade push saturation up
const KUFI = "#F2EEE3";
const SANDAL = "#6b4a33";
const BEARD = "#1A1416";   // near-black
const BEARD_STRAND = "#3A3236"; // subtle lighter strands so the beard doesn't merge with the ink outline
// shadow ratios, same values as toon.ts uses for skin and cloth
const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84];
const SH_CLOTH: [number, number, number] = [0.64, 0.66, 0.74];
const SH_SHAWL: [number, number, number] = [0.72, 0.72, 0.76]; // shawl shade: darker, not bluer (dusty)

/** Outfit stand-in so cast.ts can tell the Traveller apart from the soldiers (checked by identity). */
export const TRAVELLER: Outfit = { jacket: THOBE, pants: THOBE, boots: SANDAL, hat: null, skin: SKIN_T };
/** which soldier of the marching column becomes the Traveller (2 = front row, nearest the lens in shot 3) */
export const TRAVELLER_I = 2;

// ---- proportions (design units) ----
const SOLE = 975;
const TALL = 870;            // sole to crown: ~1.88 m (1000 units = 2.16 m)
const HH = TALL / 6;         // one head-height: 6 heads tall
const OW = 11.8;             // body outline width, same as the soldiers' (5 u at their head width)
const OW_HEAD = OW * 0.7;    // head, beard and kufi outlines: 30 % thinner (v7)
const HEAD_RATIO = 0.75;     // head width / head height (v7, head option B)
const BEARD_LEN = HH / 4;    // chin beard length below the chin (v7, beard option B)

/** quadratic curve a -> (near) k -> b as a polyline (same idea as toon.ts `curve`) */
const qc = (a: P2, k: P2, b: P2, n = 12): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};
/** join polylines without repeating the shared end points */
const join = (...parts: P2[][]): P2[] => parts.reduce<P2[]>((acc, p, i) => acc.concat(i ? p.slice(1) : p), []);

/** Front view of the Traveller. Reads the same FrontOpts as bodyFront (phase = walk cycle, light = key light angle);
 *  expression / blink are ignored on purpose: the face is blank. */
export const traveller = (p: Pen, opts: FrontOpts) => {
  const { phase = 0, mode = "march", light = -2.094, seed = 1 } = opts;
  p.rot = null;
  const two = Math.PI * 2, walking = mode === "march" || mode === "stroll";
  const thick = thickAngle(light);
  // calm walk: small bob (1.2 % of the height, vs 5 % for the marching soldiers) and a gentle arm swing
  const bob = walking ? 0.012 * TALL * Math.cos(2 * two * phase) : 0;
  const sw = walking ? Math.sin(two * phase) : 0;

  const crown = SOLE - TALL + bob;
  const headB = 0.5 * HH, headA = HEAD_RATIO * headB; // half height / half width
  const hc = crown + headB, chin = hc + headB;
  const neckY = chin + 12;                           // top of the thobe at the neck
  const shY = neckY + 38;                            // shoulder line
  const shX = 72;                                    // half shoulder width (narrow, calm)
  const hemY = SOLE - 24;                            // ankle length: just the sandals show
  const hemX = 100;                                  // the thobe flares a little toward the hem
  const waistY = crown + 2.75 * HH;
  const shawlDark = mul(SHAWL, SH_SHAWL);

  // ---- shawl, back end: hangs down his back from the left shoulder (screen right); only a sliver shows ----
  const bx = 300 + shX;
  const back: P2[] = join(
    qc([bx - 30, shY - 22], [bx + 10, shY - 26], [bx + 30, shY - 4]),
    qc([bx + 30, shY - 4], [bx + 36, shY + 0.4 * HH], [bx + 30, shY + 0.85 * HH]),
    qc([bx + 30, shY + 0.85 * HH], [bx + 16, shY + 0.9 * HH], [bx + 2, shY + 0.82 * HH]),
    qc([bx + 2, shY + 0.82 * HH], [bx - 6, shY + 0.3 * HH], [bx - 30, shY - 22]),
  );
  p.gradFill(back, shawlDark, mul(shawlDark, [0.85, 0.85, 0.88]), light);
  p.inkRing(back, OW * 0.85, thick);

  // ---- sandals (not bobbing: planted on the deck), alternate small lift with the walk ----
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
  const sleeveCol = mul(THOBE, [0.9, 0.9, 0.94]);
  for (const side of [-1, 1]) {
    const S: P2 = [300 + side * (shX - 10), shY + 4];
    const E: P2 = [300 + side * (shX + 12), shY + 1.1 * HH];
    const H: P2 = [300 + side * (shX + 16) + side * 2 * sw, crown + 3.55 * HH - 8 * Math.abs(sw) + 10 * side * sw];
    p.line(qc(S, E, H), sleeveCol, 26);
    p.dot(H[0], H[1] + 6, 12.5);
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
  );
  p.gradFill(front, SHAWL, shawlDark, light, 0.3);
  p.clip(front, () => {
    const f1 = mix(shawlDark, INK, 0.35), f2 = mix(SHAWL, "#b8b4a8", 0.14);
    p.stroke(qc([300 + 44, neckY + 18], [300 + 46, shY + 0.9 * HH], [300 + 42, waistY + 8]), 4, f1);
    p.stroke(qc([300 + 62, shY + 6], [300 + 56, shY + 1.0 * HH], [300 + 54, waistY + 10]), 3, f1);
    p.stroke(qc([300 + 58, shY], [300 + 58, shY + 0.9 * HH], [300 + 54, waistY + 8]), 4, f2);
  });
  p.inkRing(front, OW, thick);
  for (let k = 0; k < 6; k++) { // fringe along the bottom edge
    const t = (k + 0.5) / 6, x = 300 + 24 + t * 40, y = waistY + 8 - 4 * t;
    p.stroke([[x, y], [x + 1, y + 13]], 3.2);
  }

  // ---- head: blank (no eyes, nose, mouth or brows); a less full lower half (nBot 1.75) narrowing toward the chin
  //      (egg -0.16) = slimmer, longer jaw ----
  const H: Blob = { a: headA, b: headB, nTop: 2.0, nBot: 1.75, egg: -0.16, asym: 0, rot: 0, noise: 0, seed };
  const hp = blobPts(300, hc, H);
  const faceFill = () => p.shadedFill(hp, SKIN_T, mul(SKIN_T, SH_SKIN), light, headA);
  faceFill();
  p.inkRing(hp, OW_HEAD, thick);

  // ---- facial hair: near-black, one shape, one ink outline.
  //      Sideburns: thin strips (1/20 of the head width) on the very edge of the jaw, from ear level; cheeks bare.
  //      Moustache: medium (twice the sideburn width), slightly angular; its ends drop to the beard as thin strips.
  //      Chin beard: tapers from the jaw and ends 1/4 head-height below the chin in a smooth rounded bottom. ----
  const u = headA, v = headB;
  /** x of the head outline on the right side at height y (interpolated along the head contour) */
  const edgeX = (y: number) => {
    const r = hp.filter(([x]) => x > 300).sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < r.length; i++) if (r[i][1] >= y) {
      const [x0, y0] = r[i - 1], [x1, y1] = r[i], t = (y - y0) / Math.max(1e-6, y1 - y0);
      return x0 + (x1 - x0) * t - 300;
    }
    return r[r.length - 1][0] - 300;
  };
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
  // smooth rounded bottom (half ellipse, right -> lowest point -> left); the beard tapers to half width w first
  const w = 0.34 * u, yB = chin + 0.35 * L, bottom: P2[] = [];
  for (let i = 0; i <= 16; i++) { const a = (Math.PI * i) / 16; bottom.push([300 + w * Math.cos(a), yB + (chin + L - yB) * Math.sin(a)]); }
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
    [300 - dx, cb + 0.12 * v], [300 - dx, mT + 0.06 * v],               // in under the cheek, up the moustache end
    [300 - 0.12 * u, mT], [300, mT + 0.02 * v], [300 + 0.12 * u, mT],   // moustache top: slightly angular
    [300 + dx, mT + 0.06 * v], [300 + dx, cb + 0.12 * v],
    [300 + (edgeX(yJ) - SB), yJ], [300 + (edgeX(hc + 0.5 * v) - SB), hc + 0.5 * v], [300 + (edgeX(hc + 0.25 * v) - SB), hc + 0.25 * v],
    [300 + (edgeX(yEar) - SB), yEar],
  ];
  const beardDark = mul(BEARD, [0.72, 0.72, 0.76]);
  p.gradFill(beard, BEARD, beardDark, light, 0.35);
  p.clip(beard, () => { // 3 subtle lighter strands on the chin
    for (const s of [-1, 0, 1]) p.stroke([[300 + s * 0.2 * u, cb + 0.14 * v], [300 + s * 0.08 * u, chin + 0.75 * L]], 2.5, BEARD_STRAND);
  });
  p.inkRing(beard, OW_HEAD * 0.55, thick); // thinner than the head outline so the thin sideburns still show as hair
  // the mouth gap: a small, narrow, flat opening in the beard, painted with the head's own shading (clipped to the
  // gap) so it is exactly the face's tone there; no outline, no mouth, lips or teeth - reads as a gap, not a mouth
  const gap: P2[] = [];
  const gapRx = 0.8 * (gx + 2), gapRy = 0.32 * gapH;
  for (let i = 0; i < 32; i++) { const a = (2 * Math.PI * i) / 32; gap.push([300 + gapRx * Math.cos(a), (mB + cb) / 2 + gapRy * Math.sin(a)]); }
  p.clip(gap, faceFill);

  // ---- kufi: a small white skull cap, snug on the crown: its base sits on the head outline and the dome rises
  //      only ~7 units above the crown ----
  const kBase = crown + 0.13 * HH;
  const kRx = edgeX(kBase) + 2.5, kRy = kBase - crown + 7;
  const kufi: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; kufi.push([300 + kRx - 2 * kRx * t, kBase + 3 * Math.sin(Math.PI * t)]); } // base edge, right -> left
  for (let i = 1; i < 32; i++) { const a = Math.PI + (Math.PI * i) / 32; kufi.push([300 + kRx * Math.cos(a), kBase + kRy * Math.sin(a)]); } // dome, left -> top -> right
  p.gradFill(kufi, KUFI, mul(KUFI, [0.86, 0.86, 0.9]), light);
  p.clip(kufi, () => p.stroke(qc([300 - kRx, kBase - 6], [300, kBase], [300 + kRx, kBase - 6]), 3, mix(KUFI, INK, 0.2))); // stitched band
  p.inkRing(kufi, OW_HEAD * 0.85, thick);
};
