// The other faceless characters of the story films, and the Traveller's everyday poses. Everyone is drawn by the
// Traveller's own pose code (same proportions, ink and shading) in their own colours (withLook), so they all belong to
// one world. Men and boys only; blank faces; beards on the men, none on the boys. Side views face screen right
// (mirror the card to face left). Design space 600 x 1000 units, soles at y = 975.
//   LOOKS        the cast's colours: friend, oldMan, father, brother (little), boy, shopkeeper, hugger, worshippers, kids
//   stand/walk   standing or walking, with posed arms: wave, reach (handshake, opening a window), wudu, carrying bags
//   stoop        bending down to pick something up from the floor
//   sit          sitting cross-legged on the floor: rest, eat, cup (tea), read, point (teaching along the page), pass,
//                receive, laugh
//   hug          two men embracing (one drawing)
//   cat          a small ginger cat: walking, drinking, sitting
import { Pen, INK, mul, thickAngle } from "../draw/toon";
import { withLook, type Look, SKIN_T, THOBE, SH_CLOTH, SOLE, OW, qc, skinHand, P2 } from "./traveller";
import { uprightSide, travellerWalkPhase, travellerRuku, travellerSujood, travellerBack, travellerJalsa, profileHead, cap, unionFill, sleeve, neck, drapeShawl, cw, type ArmPose, type UprightCfg } from "./travellerPoses";
import { traveller } from "./traveller";

export const LOOKS: Record<string, Look> = {
  traveller: {},
  friend: { skin: "#a8744f", thobe: "#e4dccb", shawl: "#2f5d73", kufi: "#ffffff", beard: "#1a1416" },
  oldMan: { skin: "#b58660", thobe: "#8a8478", shawl: "#5b4a3a", kufi: "#f2eee3", beard: "#e3ded6", strand: "#bdb6ab" },
  father: { skin: "#b07a54", thobe: "#3f4f6b", shawl: "#c79c48", kufi: "#f2eee3", beard: "#5a5050", strand: "#8a8080" },
  brother: { skin: "#c08a5e", thobe: "#e9e1cf", shawl: null, kufi: "#ffffff", beard: "#1a1416", beardless: true },
  boy: { skin: "#8d5b3c", thobe: "#6f8fb0", shawl: null, kufi: "#ffffff", beard: "#1a1416", beardless: true },
  shopkeeper: { skin: "#9a6a48", thobe: "#556b4a", shawl: "#e9e1cf", kufi: "#e9e1cf", beard: "#2a2020" },
  hugger: { skin: "#7a4e34", thobe: "#d2c4a8", shawl: "#7a2f2c", kufi: "#ffffff", beard: "#1a1416" },
  w1: { skin: "#a8744f", thobe: "#efe9dc", shawl: "#8a9aa8", kufi: "#ffffff", beard: "#1a1416" },
  w2: { skin: "#7a4e34", thobe: "#9a9384", shawl: "#4a5a4a", kufi: "#f2eee3", beard: "#2a2020" },
  w3: { skin: "#c49a74", thobe: "#5f6e8a", shawl: "#d9cdb4", kufi: "#ffffff", beard: "#3a2a20" },
  w4: { skin: "#8d5b3c", thobe: "#d9cdb4", shawl: "#6b3a3a", kufi: "#efe9dc", beard: "#1a1416" },
  w5: { skin: "#b07a54", thobe: "#7a8a6a", shawl: "#e4dccb", kufi: "#ffffff", beard: "#d9d4cc", strand: "#aaa39a" },
  w6: { skin: "#a0704c", thobe: "#c9b48a", shawl: "#3f4f6b", kufi: "#ffffff", beard: "#1a1416" },
  // muted mourners (video 002): dark and grey thobes, no bright colours
  m1: { skin: "#a8744f", thobe: "#2e3236", shawl: "#4a4e52", kufi: "#d9d6cf", beard: "#1a1416" },
  m2: { skin: "#7a4e34", thobe: "#d6d2c8", shawl: "#5a5e62", kufi: "#ffffff", beard: "#2a2020" },
  m3: { skin: "#b07a54", thobe: "#4a4f58", shawl: "#2e3236", kufi: "#e8e4dc", beard: "#cfcac2", strand: "#9a948c" },
  m4: { skin: "#8d5b3c", thobe: "#5e5a52", shawl: "#3a3e44", kufi: "#ffffff", beard: "#1a1416" },
  m5: { skin: "#c49a74", thobe: "#22262c", shawl: "#55595e", kufi: "#d9d6cf", beard: "#3a2a20" },
  m6: { skin: "#a0704c", thobe: "#8a8880", shawl: "#33373c", kufi: "#ffffff", beard: "#1a1416" },
  /** the Traveller in video 002: his brand colours muted (dark rust scarf, a darker thobe) */
  travellerMuted: { shawl: "#5c2a1f", thobe: "#5a4232" },
  /** video 006: the young man with everything (dark clothes, no scarf) */
  youth: { skin: "#b98a62", thobe: "#23262e", shawl: null, kufi: "#2a2420", beard: "#1a1416" },
  /** video 007: the Traveller in a pale hospital gown (no scarf) */
  gown: { thobe: "#c3c9ce", shawl: null },
  kid1: { skin: "#c08a5e", thobe: "#c94f3a", shawl: null, kufi: "#ffffff", beard: "#1a1416", beardless: true },
  kid2: { skin: "#8d5b3c", thobe: "#3f8a6a", shawl: null, kufi: "#ffffff", beard: "#1a1416", beardless: true },
  kid3: { skin: "#b07a54", thobe: "#e0b04a", shawl: null, kufi: "#ffffff", beard: "#2a1e1a", beardless: true },
};
const DEF_LIGHT = (-120 * Math.PI) / 180;
const sm = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const STAND_N = { heel: [262, SOLE] as P2, ang: 0 }, STAND_F = { heel: [254, SOLE - 2] as P2, ang: 0 };

// ---------------- arm poses (standing figure; shoulder joint ~ (302, 320)) ----------------
/** wave: the near hand raised beside the head, palm out, waggling (w = phase of the waggle) */
export const waveArm = (w: number): ArmPose => { const a = 0.3 * Math.sin(w * Math.PI * 2); return { E: [398, 412], W: [432, 262], hand: "open", ang: -Math.PI / 2 + a }; };
/** reach forward at chest height (handshake: shake = up/down 0..1 phase) */
export const reachArm = (shake = 0, up = 0): ArmPose => ({ E: [366, 452 - 40 * up], W: [452, 448 - 120 * up + 10 * Math.sin(shake * Math.PI * 2)], hand: "open", ang: -0.15 - 0.7 * up });
/** wudu: both hands forward at the basin, palms cupped (the far hand a little behind) */
export const wuduArms = (k: number): { N: ArmPose; F: ArmPose } => ({
  N: { E: [344, 456], W: [436 + 6 * Math.sin(k * 9), 478 - 10 * Math.sin(k * 6)], hand: "open", ang: 0.35 },
  F: { E: [336, 458], W: [424 - 6 * Math.sin(k * 9), 486 + 8 * Math.sin(k * 6)], hand: "open", ang: 0.5 },
});
/** holding an umbrella: the near hand up in front of the chest, the shaft up past the head, a dark canopy above */
const UMBRELLA_ARM: ArmPose = { E: [354, 440], W: [346, 340], hand: "dot" };
const umbrellaFront = (c: string) => (p: Pen) => {
  p.line([[346, 336], [334, 64]], "#2a2a2c", 7);
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (Math.PI * i) / 24; pts.push([334 + 200 * Math.cos(a), 92 + 74 * Math.sin(a)]); }
  for (let i = 5; i >= 0; i--) { const x = 134 + (400 * i) / 5; pts.push([x, 92 + (i % 2 ? 0 : 10)]); }
  p.poly(cw(pts), c, OW * 0.7);
  for (const k of [-0.6, -0.2, 0.2, 0.6]) p.stroke([[334, 20], [334 + 200 * k, 96]], 3, mul(c, [0.6, 0.6, 0.66]));
};
/** du'a: both hands raised in front of the chest, palms up and open */
export const duaArms = (): { N: ArmPose; F: ArmPose } => ({ N: { E: [350, 452], W: [404, 392], hand: "open", ang: -1.2 }, F: { E: [340, 456], W: [392, 400], hand: "open", ang: -1.35 } });
/** an arm round a friend's back (hug): forward and a little up */
const hugArm: ArmPose = { E: [372, 400], W: [470, 360], hand: "dot" };

export type Card = { key: string; draw: (p: Pen) => void };
const k3 = (x: number) => Math.round(x * 1000) / 1000;

/** standing still or walking (phase, k = how much the walk is on, stride in design units), with options */
export const walker = (look: string, o: { phase?: number; k?: number; stride?: number; light?: number; shawlNear?: boolean; armN?: ArmPose; armF?: ArmPose; headRot?: number; bags?: string; swing?: number; fold?: number; barefoot?: boolean; tag?: string; umbrella?: string; phone?: number } = {}): Card => {
  const ph = k3(o.phase ?? 0.25), k = k3(o.k ?? 0), L = o.light ?? DEF_LIGHT;
  const lk = { ...LOOKS[look], ...(o.barefoot ? { sandal: LOOKS[look].skin ?? SKIN_T } : {}) };
  return {
    key: `walker|${look}|${ph}|${k}|${o.stride ?? 0}|${L}|${!!o.shawlNear}|${JSON.stringify(o.armN ?? 0)}|${JSON.stringify(o.armF ?? 0)}|${k3(o.headRot ?? 0)}|${o.bags ?? ""}|${o.swing ?? 1}|${k3(o.fold ?? 0)}|${!!o.barefoot}|${o.tag ?? ""}|${o.umbrella ?? ""}|${o.phone ?? 0}`,
    draw: (p) => withLook(lk, () => {
      const um = o.umbrella ? umbrellaFront(o.umbrella) : undefined, armN = o.umbrella ? UMBRELLA_ARM : o.armN;
      if (!armN && !o.armF && !o.headRot && !o.bags && !o.phone) { travellerWalkPhase(p, ph, k, o.stride ?? 90, { light: L, shawlNear: o.shawlNear, swing: o.swing, fold: o.fold }); return; }
      if (k > 0) {
        // walking with posed arms: the walk's own feet, the arms posed
        const cfg: Partial<UprightCfg> = { armN, armF: o.armF, headRot: o.headRot, bags: o.bags, front: um, phone: o.phone };
        walkWith(p, ph, k, o.stride ?? 90, L, !!o.shawlNear, cfg);
      } else uprightSide(p, { near: STAND_N, far: STAND_F, armNear: 0, armFar: 0, bob: 0, light: L, seed: 1, shawlNear: o.shawlNear, armN, armF: o.armF, headRot: o.headRot, bags: o.bags, fold: o.fold, front: um, phone: o.phone });
    }),
  };
};
/** the walk cycle's feet (as travellerWalkPhase) with extra upright options */
const walkWith = (p: Pen, phase: number, k: number, A: number, light: number, shawlNear: boolean, extra: Partial<UprightCfg>) => {
  const LEN = 104, LIFT = 30 * k;
  const foot = (u0: number) => {
    const u = ((u0 % 1) + 1) % 1;
    let xh: number, ang: number, lift = 0;
    if (u < 0.5) { xh = A / 2 - (u / 0.5) * A; ang = -0.25 * k * (1 - sm(u / 0.08)) + 0.45 * k * sm((u - 0.4) / 0.1); }
    else { const v = (u - 0.5) / 0.5; xh = -A / 2 + A * sm(v); lift = LIFT * Math.sin(Math.PI * v); ang = 0.45 * k * (1 - sm(v * 3)) - 0.25 * k * sm((v - 0.7) / 0.3); }
    const heel: P2 = ang > 0 ? [262 + xh + LEN - LEN * Math.cos(ang), SOLE - lift - LEN * Math.sin(ang)] : [262 + xh, SOLE - lift];
    return { heel, ang };
  };
  uprightSide(p, { near: foot(phase), far: foot(phase + 0.5), armNear: -0.18 * k * Math.cos(2 * Math.PI * phase), armFar: 0.18 * k * Math.cos(2 * Math.PI * phase),
    bob: 0.006 * 870 * k * Math.cos(4 * Math.PI * phase), light, seed: 1, shawlNear, ...extra });
};

/** the front view, standing (qiyam / hands down / takbir) in a look */
export const front = (look: string, arms: "down" | "qiyam" | "takbir", light = DEF_LIGHT, bob = 0): Card => ({
  key: `front|${look}|${arms}|${light}|${k3(bob)}`, draw: (p) => withLook(LOOKS[look], () => traveller(p, { mode: "stand", light, seed: 1, arms, headTurn: 0, headTilt: 0, bob, wind: 0 })),
});
/** standing, seen from behind (a row of worshippers from the back) */
export const back = (look: string, light = DEF_LIGHT): Card => ({ key: `back|${look}|${light}`, draw: (p) => withLook(LOOKS[look], () => travellerBack(p, { light })) });
export const jalsa = (look: string, light = DEF_LIGHT, shawlNear = false): Card => ({ key: `jalsa|${look}|${light}|${shawlNear}`, draw: (p) => withLook(LOOKS[look], () => travellerJalsa(p, { light, shawlNear })) });
export const ruku = (look: string, light = DEF_LIGHT, shawlNear = false): Card => ({ key: `ruku|${look}|${light}|${shawlNear}`, draw: (p) => withLook(LOOKS[look], () => travellerRuku(p, { light, shawlNear })) });
export const sujood = (look: string, light = DEF_LIGHT, shawlNear = false): Card => ({ key: `sujood|${look}|${light}|${shawlNear}`, draw: (p) => withLook(LOOKS[look], () => travellerSujood(p, { light, shawlNear })) });

// ---------------- bending down to pick something up ----------------
/** stoop: k 0..1 how far down (0 = standing), holding: draw something in the hand once it is up (a bag colour or "ball") */
export const stoop = (look: string, k: number, light = DEF_LIGHT, holding = ""): Card => {
  const kk = k3(k);
  return {
    key: `stoop|${look}|${kk}|${light}|${holding}`,
    draw: (p) => withLook(LOOKS[look], () => {
      const e = sm(kk), lerp = (a: P2, b: P2): P2 => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
      const hip = lerp([272, 520], [222, 640]), sh = lerp([292, 320], [430, 600]), knee = lerp([290, 740], [320, 780]), ankle: P2 = [272, 952];
      const thick = thickAngle(light);
      // far arm, then the body (thobe over hips, thigh and shin), the near arm reaching to the floor, the head
      const W: P2 = lerp([304, 600], [470, 930]), E: P2 = lerp([298, 460], [460, 770]);
      sleeve(p, [sh[0] - 4, sh[1] + 10], [E[0] - 10, E[1]], [W[0] - 16, W[1] - 6]); p.dot(W[0] - 16, W[1] - 2, 12);
      p.poly([[ankle[0] - 10, SOLE], [ankle[0] + 94, SOLE], [ankle[0] + 100, SOLE - 8], [ankle[0] - 12, SOLE - 16]], "#6b4a33", 4.5);
      neck(p, [sh[0] + 10, sh[1] - 6], [sh[0] + 44 * e + 6, sh[1] - 50 + 30 * e], light);
      const shawl = drapeShawl(sh[0], sh[1], 150 * (1 - e) + 40, light);
      shawl.panel(p); shawl.cap(p);
      const skirt: P2[] = cw([[hip[0] - 50, hip[1]], [hip[0] - 46, 800], [ankle[0] - 40, 955], [ankle[0] + 70, 955], [knee[0] + 50, knee[1]], [sh[0] - 20, sh[1] + 40]] as P2[]);
      unionFill(p, [cap(hip, sh, 62, 52), skirt], THOBE, mul(THOBE, SH_CLOTH), light);
      profileHead(p, sh[0] + 70 * e + 10, sh[1] - 128 + 108 * e, 1.25 * e, light, 1);
      sleeve(p, [sh[0] + 4, sh[1] + 14], E, W);
      if (holding === "ball") { p.ell(W[0] + 18, W[1] - 4, 26, 26, "#e05a3a", OW * 0.6); p.stroke(qc([W[0] - 4, W[1] - 4], [W[0] + 18, W[1] - 16], [W[0] + 40, W[1] - 4]), 3, "#f4e8d8"); }
      else if (holding) { const b = cw([[W[0] - 30, W[1] + 10], [W[0] + 34, W[1] + 10], [W[0] + 40, W[1] + 96], [W[0] - 36, W[1] + 96]] as P2[]); p.gradFill(b, holding, mul(holding, [0.78, 0.78, 0.84]), light, 0.3); p.inkRing(b, OW * 0.7, thick); }
      p.dot(W[0], W[1] + 4, 12.5);
    }),
  };
};

// ---------------- sitting cross-legged on the floor ----------------
export type SitArms = "rest" | "eat" | "cup" | "read" | "point" | "pass" | "receive" | "laugh" | "listen";
/** sitting cross-legged, side view; t animates the gesture (seconds), bob = a small body bounce (laughing) */
export const sit = (look: string, arms: SitArms, t = 0, light = DEF_LIGHT, shawlNear = false): Card => {
  const tq = Math.round(t * 8) / 8;
  return {
    key: `sit|${look}|${arms}|${tq}|${light}|${shawlNear}`,
    draw: (p) => withLook(LOOKS[look], () => {
      const bounce = arms === "laugh" ? 6 * Math.abs(Math.sin(tq * 7)) : 0;
      const hip: P2 = [262, 905], knee: P2 = [432, 912], sh: P2 = [276, 708 - bounce], hc = 568 - bounce;
      const thick = thickAngle(light);
      const S: P2 = [sh[0] + 10, sh[1] + 18];
      // arm targets (near N, far F)
      let N: ArmPose = { E: [318, 822], W: [404, 880], hand: "dot" }, F: ArmPose = { E: [308, 826], W: [392, 884], hand: "dot" }, head = 0.1;
      const g = Math.sin(tq * 3);
      if (arms === "eat") { const up = 0.5 + 0.5 * Math.sin(tq * 2.4); N = { E: [336, 806], W: [360 + 60 * (1 - up), 656 + 170 * (1 - up)], hand: "dot" }; F = { E: [312, 820], W: [430, 872], hand: "dot" }; head = 0.05; }
      if (arms === "cup") { N = { E: [334, 800], W: [384 + 4 * g, 744 - 6 * g], hand: "dot" }; head = 0.12; }
      if (arms === "read") { N = { E: [338, 806], W: [420, 790], hand: "dot" }; F = { E: [326, 812], W: [412, 796], hand: "dot" }; head = 0.42; }
      if (arms === "point") { N = { E: [344, 800], W: [432 + 26 * Math.sin(tq * 1.6), 800], hand: "dot" }; F = { E: [326, 812], W: [404, 800], hand: "dot" }; head = 0.38; }
      if (arms === "pass") { const f = 0.5 + 0.5 * Math.sin(tq * 2); N = { E: [356, 780], W: [430 + 60 * f, 760], hand: "dot" }; F = { E: [346, 786], W: [420 + 60 * f, 766], hand: "dot" }; head = 0.15; }
      if (arms === "receive") { N = { E: [356, 784], W: [462, 768], hand: "dot" }; head = 0.12; }
      if (arms === "laugh") { N = { E: [322, 790], W: [338, 740], hand: "dot" }; head = -0.22 - 0.08 * Math.abs(Math.sin(tq * 7)); }
      if (arms === "listen") head = 0.28;
      // far arm
      sleeve(p, [S[0] - 6, S[1]], F.E, F.W); if (F.hand !== "none") p.dot(F.W[0], F.W[1] + 4, 11.5);
      // the crossed shin and the bare feet (in front of the far arm, under the body)
      const foot = (x: number, y: number) => p.poly(cw([[x - 30, y + 10], [x + 30, y + 6], [x + 36, y - 6], [x - 26, y - 10]] as P2[]), SKIN_T, OW * 0.5);
      foot(300, 958);
      neck(p, [sh[0] + 8, sh[1] - 6], [sh[0] + 18, hc + 50], light);
      const shawl = drapeShawl(sh[0] + 6, sh[1] - 4, 150, light);
      if (!shawlNear) { shawl.panel(p); shawl.cap(p); }
      unionFill(p, [cap(hip, sh, 64, 52), cap(hip, knee, 56, 46), cap(knee, [300, 950], 44, 36)], THOBE, mul(THOBE, SH_CLOTH), light);
      foot(440, 940);
      if (shawlNear) shawl.panel(p);
      // props in front of the body, under the near hand
      if (arms === "read" || arms === "point") { // an open book held in front (seen from the side: two leaves in a shallow V)
        p.poly(cw([[392, 796], [470, 770], [476, 780], [400, 808]] as P2[]), "#f3ecd9", OW * 0.5);
        p.poly(cw([[392, 796], [450, 812], [446, 822], [390, 806]] as P2[]), "#e8dfc6", OW * 0.5);
        p.poly(cw([[388, 804], [480, 776], [484, 784], [392, 812]] as P2[]), "#2f5d3a", OW * 0.4); // its green cover under the pages
      }
      if (arms === "pass" || arms === "receive") { const x = N.W[0] + 20, y = N.W[1] - 8; p.ell(x, y, 56, 14, "#e9e1cf", OW * 0.6); p.ell(x, y - 10, 36, 12, arms === "pass" ? "#c9783a" : "#d9a35a", OW * 0.4); }
      if (shawlNear) shawl.cap(p);
      profileHead(p, 300 + 14 * head, hc + 10 * Math.abs(head), head, light, 1);
      sleeve(p, S, N.E, N.W);
      if (arms === "eat") p.ell(N.W[0] + 16, N.W[1] - 10, 22, 14, "#d9a35a", OW * 0.5);   // a piece of bread
      if (arms === "cup") { const c = cw([[N.W[0] + 4, N.W[1] - 40], [N.W[0] + 34, N.W[1] - 40], [N.W[0] + 30, N.W[1] + 6], [N.W[0] + 8, N.W[1] + 6]] as P2[]); p.poly(c, "#b8622a", OW * 0.5); }
      if (arms === "point") { p.stroke([[N.W[0] + 6, N.W[1] - 2], [N.W[0] + 34, N.W[1] + 2]], 9, INK); p.stroke([[N.W[0] + 6, N.W[1] - 2], [N.W[0] + 32, N.W[1] + 2]], 5, SKIN_T); }
      p.dot(N.W[0], N.W[1] + 4, 12.5);
      void thick;
    }),
  };
};

// ---------------- two men embracing (one drawing) ----------------
/** the Traveller (facing right, at the left) hugs another man (facing left): chests together, heads side by side,
 *  each one's arm across the other's back. pat = 0..1 the hand patting. The pivot is between them. */
export const hug = (other: string, pat = 0, light = DEF_LIGHT): Card => {
  const pq = Math.round(pat * 6) / 6;
  return {
    key: `hug|${other}|${pq}|${light}`,
    draw: (p) => {
      const g = p.g;
      // the other man (mirrored: facing left), shifted right; his near arm goes round the Traveller's back (drawn last)
      g.save(); g.translate(300 + 70, 0); g.scale(-1, 1); g.translate(-300, 0);
      withLook(LOOKS[other], () => uprightSide(p, { near: STAND_N, far: STAND_F, armNear: 0, armFar: 0, bob: 0, light: Math.PI - light, seed: 2, armN: { E: [360, 420], W: [380, 380], hand: "none" }, armF: hugArm, shawlNear: true }));
      g.restore();
      // the Traveller, shifted left, his near arm round the other man's back
      g.save(); g.translate(-70, 0);
      uprightSide(p, { near: STAND_N, far: STAND_F, armNear: 0, armFar: 0, bob: 0, light, seed: 1, armN: { E: [390, 410], W: [470, 390 + 8 * Math.sin(pq * Math.PI * 2)], hand: "dot" } });
      g.restore();
      // the other man's arm across the Traveller's back (over everything)
      g.save(); g.translate(300 + 70, 0); g.scale(-1, 1); g.translate(-300, 0);
      withLook(LOOKS[other], () => { sleeve(p, [310, 330], [376, 404], [462, 392]); p.dot(466, 394 + 8 * Math.sin(pq * Math.PI * 2 + 1), 12.5); });
      g.restore();
    },
  };
};

// ---------------- the cat ----------------
/** a small ginger cat, side view facing right, standing on y = 975: "walk" (phase), "drink" (head down, lapping), "sit" */
export const cat = (mode: "walk" | "drink" | "sit", phase = 0, light = DEF_LIGHT): Card => {
  const ph = Math.round(phase * 12) / 12;
  return {
    key: `cat|${mode}|${ph}|${light}`,
    draw: (p) => {
      const fur = "#d08a4a", dark = mul(fur, [0.72, 0.68, 0.66]), base = SOLE, thick = thickAngle(light);
      const s = Math.sin(ph * Math.PI * 2);
      const leg = (x: number, sw: number, far: boolean) => p.line([[x, base - 70], [x + sw, base - 4]], far ? dark : fur, 13);
      if (mode === "sit") {
        p.line(qc([220, base - 10], [170, base - 30], [190, base - 90]), fur, 12);      // tail curled round
        const body = cw([[230, base], [330, base], [340, base - 60], [300, base - 120], [250, base - 100], [226, base - 40]] as P2[]);
        p.gradFill(body, fur, dark, light, 0.3); p.inkRing(body, OW * 0.6, thick);
        catHead(p, 318, base - 140, 0, fur, dark, light);
        return;
      }
      const drink = mode === "drink";
      leg(232, -10 * s, true); leg(332, 10 * s, true);                                    // far legs
      p.line(qc([200, base - 74], [150, base - 110 + 10 * s], [160, base - 160]), fur, 12); // tail up
      const body = cw([[200, base - 60], [210, base - 95], [330, base - 100], [356, base - 72], [340, base - 52], [210, base - 50]] as P2[]);
      p.gradFill(body, fur, dark, light, 0.3);
      p.clip(body, () => { for (const x of [240, 270, 300]) p.stroke([[x, base - 98], [x - 6, base - 70]], 6, dark); });
      p.inkRing(body, OW * 0.6, thick);
      leg(222, 10 * s, false); leg(342, -10 * s, false);                                  // near legs
      if (drink) catHead(p, 388, base - 34 + 3 * Math.sin(ph * Math.PI * 8), 0.9, fur, dark, light);
      else catHead(p, 370, base - 116, 0, fur, dark, light);
    },
  };
};
const catHead = (p: Pen, x: number, y: number, rot: number, fur: string, dark: string, light: number) => {
  const g = p.g; g.save(); g.translate(x, y); g.rotate(rot);
  p.poly(cw([[-20, -18], [-14, -48], [0, -22]] as P2[]), dark, OW * 0.5);                // ears
  p.poly(cw([[6, -22], [18, -50], [26, -16]] as P2[]), fur, OW * 0.5);
  p.ell(0, 0, 34, 28, fur, OW * 0.6);
  p.ell(30, 8, 10, 8, fur, OW * 0.4);                                                     // muzzle
  g.restore(); void light;
};

// ---------------- a pigeon ----------------
/** a pigeon, side view facing right, on y = 975: "peck" (phase: the head bobs down), "fly" (phase: wings beat; lift in
 *  design units raises it off the ground) */
export const pigeon = (mode: "peck" | "fly", phase = 0, lift = 0, crow = false): Card => {
  const ph = Math.round(phase * 8) / 8, lq = Math.round(lift / 10) * 10;
  return {
    key: `pigeon|${mode}|${ph}|${lq}|${crow}`,
    draw: (p) => {
      const g = p.g, grey = crow ? "#1c1d22" : "#8d93a0", dark = crow ? "#0c0d10" : "#5c6270", base = SOLE - lq;
      g.save();
      if (mode === "peck") { p.line([[296, base - 6], [298, base - 26]], "#c0675a", 5); p.line([[310, base - 6], [312, base - 26]], "#c0675a", 5); }
      const body = cw([[262, base - 40], [282, base - 62], [330, base - 64], [350, base - 46], [332, base - 28], [282, base - 26]] as P2[]);
      p.poly(cw([[262, base - 40], [232, base - 52], [236, base - 34], [270, base - 32]] as P2[]), dark, OW * 0.4);   // tail
      p.poly(body, grey, OW * 0.5);
      const dn = mode === "peck" ? Math.max(0, Math.sin(ph * Math.PI * 2)) : 0;
      const hx = 352 + 8 * dn, hy = base - 70 + 40 * dn;
      p.line([[336, base - 56], [hx - 4, hy + 8]], crow ? grey : "#6f8a7a", 14);                                                     // the neck (a green sheen)
      p.ell(hx, hy, 13, 12, grey, OW * 0.4);
      p.poly(cw([[hx + 11, hy - 2], [hx + 22, hy + 2], [hx + 11, hy + 5]] as P2[]), "#3a3030", 0);                   // beak
      if (mode === "fly") { const w = Math.sin(ph * Math.PI * 2); p.poly(cw([[290, base - 56], [318, base - 58], [296 - 10 * w, base - 56 - 70 * w], [280, base - 60 - 50 * w]] as P2[]), dark, OW * 0.4); }
      else p.poly(cw([[288, base - 58], [330, base - 60], [318, base - 40], [276, base - 38]] as P2[]), dark, OW * 0.4); // folded wing
      g.restore();
    },
  };
};

// a card drawn by people.ts never changes the Traveller's own look
export { skinHand };
