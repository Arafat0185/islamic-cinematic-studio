// Video 003 "The Sirat" (the bridge over Hell): a remake of the template's beats (sirat_guide.mp4) in our style. The
// Traveller among a faceless crowd on a cliff at the edge of the abyss; the eruption; the stare; the crowd pushing him
// to the bridge; his bare feet on the burning line; iron and rock rising from the lava; the line crumbling; the fall; the
// question "How fast will you cross?"; the end card. Nothing from the unseen is shown: no beings, no hooks, nothing alive-looking.
// Timing: videos/003-the-sirat/timing.json (the recitation captions), shots.json (shots, transitions, events).
// Camera: a new angle every 1.5-3 s, never still; shots framing a character up close never look down more than 45
// degrees (pure environment shots may look straight down into the pit).
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { walker, stoop, front, back, jalsa, reachArm, LOOKS, type Card } from "../../characters/people";
import { cam, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, Frame, TravellerCard, FrameFx } from "../../story/story";
import { ABYSS } from "../../sets/abyss";
import { zoomCard, anchorH, bareFoot, openHand, shakingHands, CROWD } from "./art";
import TIMING from "../../../../videos/003-the-sirat/timing.json";
import STORY from "../../../../videos/003-the-sirat/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export const CONTINUE_FROM = F(TIMING.continueFrom);
export type PShot = { kind: string; from: number; to: number; tpl: number | null };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, tpl: s.tpl, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const TRANSITIONS = (STORY.events.transitions as [number, string][]).map(([t, k]) => ({ f: F(t), kind: k }));
const E = STORY.events;
export const CRUMBLE = E.crumble;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const q = (v: number, n: number) => Math.round(v * n) / n;
const OFF = SET_OFFSET.abyss;
const W = (p: V3): V3 => add(p, OFF);
const glideU = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const ease = (u: number) => glideU(u) * 0.6 + clamp01(u) * 0.4;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const noise1 = (t: number, seed: number) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 17.3), hash(i + 1 + seed * 17.3), u) * 2 - 1; };

// ---------------- the light state ----------------
/** the eruption level at t (0..1) */
export const eruptAt = (t: number) => {
  const [a, b, c, d] = E.erupt as number[], [ra, rb, rc] = E.rise as number[];
  const main = t < a ? 0 : t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : t < d ? 1 - 0.85 * smooth((t - c) / (d - c)) : 0.15 * (1 - smooth((t - d) / 4));
  const rise = t < ra ? 0 : t < rb ? 0.7 * smooth((t - ra) / (rb - ra)) : 0.7 * (1 - smooth((t - rb) / (rc - rb)));   // the flames surging again (19:70)
  return Math.max(main, rise);
};
/** red lightning: each strike flickers twice and fades (0..1) */
export const lightningAt = (t: number) => Math.max(0, ...(E.lightning as number[]).map((l) => { const d = t - l; return d < 0 || d > 0.6 ? 0 : (d < 0.06 ? 1 : d < 0.12 ? 0.3 : d < 0.18 ? 0.85 : Math.exp(-(d - 0.18) / 0.12)); }));
const CLOSE = new Set(["hourglass", "hands", "sideTrack", "otsBridge", "fearUp", "fearTight", "ots", "otsErupt", "stareA", "stareB", "lookDown", "lookDown2", "sideFace", "breaking", "breaking2", "feetEdge", "feetSide", "feetVertigo", "feetToes", "feetFast", "feetFire", "itemsFall", "matFire"]);
export const EV = { underGlow: (f: number) => (CLOSE.has(shotOf(f).kind) ? (shotOf(f).kind.startsWith("feet") ? 7 : 5) : 0) };

// ---------------- where he is ----------------
export const CLIFF_T: V3 = [-2.2, 0, 1.1];
const T0 = E.bridgeFrom as number, TB = E.toBridge as number;
/** his x on the bridge (slow: about 0.22 m/s, a little faster in the fast feet section) */
export const bridgeX = (t: number) => 0.12 + 0.22 * Math.max(0, t - T0) + 0.06 * clamp01((t - T0 - 14) / 4) * Math.max(0, t - T0 - 14);
const travPos = (t: number): V3 => (t < TB ? CLIFF_T : t < T0 ? lerp3(CLIFF_T, [-0.25, 0, 0.05], smooth((t - TB) / (T0 - TB))) : [bridgeX(t), ABYSS.Y(bridgeX(t)), 0]);

// ---------------- the crowd on the cliff ----------------
const KNEEL = 26.4;
const CROWD_POS: [number, number, string, number][] = (() => {
  const out: [number, number, string, number][] = []; let s = 5;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  while (out.length < 34) {
    const x = -1.1 - 11 * r() ** 1.3, z = -7 + 14 * r();
    if (Math.hypot(x - CLIFF_T[0], z - CLIFF_T[2]) < 0.9 || Math.abs(z) < 0.6 && x > -2) continue;
    if (out.some(([a, b]) => Math.hypot(a - x, b - z) < 0.75)) continue;
    out.push([x, z, CROWD[out.length % CROWD.length], r()]);
  }
  return out;
})();

// ---------------- the ruins (no hooks: only iron and rock rising out of the lava) ----------------
export type Ruin = { x: number; z: number; h: number; tipY: number; ph: number; rise: number; collapse?: number };
export const EVT = E as unknown as { pass: number; snatch: number; strike: number; collapse: number[] };
export const RUINS: Ruin[] = [
  ...[15, 21, 28, 36, 45, 56, 69, 84, 102, 125, 153, 186].map((x, i) => ({ x, z: (i % 2 ? -1 : 1) * (17 + 5 * hash(i)), h: 26 + 16 * hash(i + 9), tipY: 1.5 + 2.5 * hash(i + 3), ph: 6.28 * hash(i + 5), rise: (E.pillarRise as number[])[0] + 0.25 * i,
    ...(i === 2 ? { collapse: (E.collapse as number[])[0] } : {}) })),
  { x: 0, z: 0, h: 1, tipY: 0, ph: 0, rise: 0 },      // 12: (unused: the boulder is its own object)
  { x: 0, z: 0, h: 1, tipY: 0, ph: 0, rise: 0 },      // 13: (unused)
  { x: 0, z: -9, h: 40, tipY: 4, ph: 1, rise: 0, collapse: (E.collapse as number[])[1] },   // 14: the pillar behind him as he breaks
];
/** where a ruin is: rising out of the lava (19:69), swaying a little; collapse 0..1 = its top part cracking and falling */
export const ruinState = (i: number, f: number): { visible: boolean; pos: V3; rot: V3; collapse: number } => {
  const t = f / FPS, rn = RUINS[i], k = shotOf(f).kind;
  const col = rn.collapse !== undefined ? smooth((t - rn.collapse) / 2.2) : 0;
  if (i < 12) {
    const up = smooth((t - rn.rise) / 1.6);
    return { visible: up > 0.001, pos: [rn.x, rn.tipY + 0.08 * rn.h - 110 * (1 - up), rn.z], rot: [0.03 * Math.sin(t * 0.5 + rn.ph), rn.ph, 0.02 * Math.sin(t * 0.7 + rn.ph)], collapse: col };
  }
  if (i === 14) return { visible: k === "breaking", pos: [bridgeX(t) + 3.5, rn.tipY, rn.z], rot: [0, 0.4, 0], collapse: col };
  return { visible: false, pos: [0, -3000, 0], rot: [0, 0, 0], collapse: 0 };
};
export const SNATCH_X = 24, PASS_X = 20;
const shotFrom = (k: string) => (SHOTS.find((x) => x.kind === k)?.from ?? 0) / FPS;

// ---------------- the crossers (Sahih al-Bukhari 7439: like the wink of an eye, lightning, wind, fast horses) ----------------
export type Streak = { t0: number; speed: number; len: number; w: number; y: number; col: string; x0: number };
export const STREAKS: Streak[] = [
  { t0: 63.1, speed: 650, len: 60, w: 0.1, y: 0.35, col: "#ffffff", x0: 2 }, { t0: 63.6, speed: 240, len: 26, w: 0.2, y: 0.25, col: "#fff2d0", x0: 2 },
  { t0: 64.2, speed: 90, len: 11, w: 0.32, y: 0.05, col: "#ffc070", x0: 2 }, { t0: 64.8, speed: 38, len: 5, w: 0.45, y: -0.05, col: "#ff8a40", x0: 2 },
  { t0: 83.0, speed: 160, len: 18, w: 0.22, y: 0.3, col: "#fff2d0", x0: -1 }, { t0: 83.7, speed: 420, len: 40, w: 0.12, y: 0.4, col: "#ffffff", x0: -1 }, { t0: 84.3, speed: 70, len: 8, w: 0.3, y: 0.1, col: "#ffc070", x0: -1 },
  { t0: 88.9, speed: 220, len: 24, w: 0.2, y: 0.25, col: "#fff2d0", x0: 14 },
  { t0: 92.6, speed: 600, len: 60, w: 0.1, y: 0.35, col: "#ffffff", x0: 3 }, { t0: 93.1, speed: 300, len: 30, w: 0.18, y: 0.25, col: "#fff2d0", x0: 3 }, { t0: 93.7, speed: 120, len: 12, w: 0.28, y: 0.1, col: "#ffd27a", x0: 3 },
];
export const streakX = (s: Streak, t: number) => { const x = s.x0 + s.speed * (t - s.t0); return t < s.t0 || x - s.len > ABYSS.BRIDGE_LEN ? null : x; };
export const ITEMS_AT = { t0: E.items as number, pos: [9.3, 0.95, 0.35] as V3 };
export const MAT_X = 10.6;
export const HOURGLASS = E.hourglass as V3;
/** the fire's light from below dips for a moment, as if something passed in front of it (nothing is ever shown) */
export const occludeAt = (t: number) => Math.max(0, ...(E.occlude as number[]).map((o) => { const d = (t - o) / 0.45; return Math.abs(d) < 1 ? Math.cos(d * Math.PI / 2) ** 2 : 0; }));

// ---------------- helpers ----------------
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
/** the key light comes from the fire below (and a little from the pit's side) */
const FIRE_DIR = new THREE.Vector3(0.45, -1, 0.15).normalize();
const lightOf = (c: Cam, mirror = false) => q(light2D(FIRE_DIR, camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
const put = (c: Card, p: V3, o: { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null; roll?: number } = {}): TravellerCard =>
  ({ pos: W(p), key: c.key, draw: c.draw, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob === undefined ? null : o.blob, roll: o.roll });
const T = "sirat";
const STRIDE = 0.36;
const walkC = (look: string, dist: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}) =>
  walker(look, { phase: q(0.25 + dist / (2 * STRIDE), 120), k: 1, stride: Math.round(STRIDE / SU), light: L, shawlNear: mirror, swing: 0.7, barefoot: true, ...extra });
/** the crowd standing on the cliff, facing the pit (some turned a little) */
const crowdCards = (c: Cam, t: number, skipNear = 0): TravellerCard[] => CROWD_POS.filter(([x, z]) => Math.hypot(x - c.pos[0], z - c.pos[2]) > skipNear).map(([x, z, lk, r]) => {
  const mir = mirrorFor(c, 1, (r - 0.5) * 0.6);
  if (t > KNEEL + r * 2.4 && t < TB) return put(jalsa(lk, lightOf(c, mir), mir), [x, 0, z], { mirror: mir });   // "upon their knees"
  return put(walker(lk, { light: lightOf(c, mir), shawlNear: mir, headRot: q(0.1 * Math.sin(t * 0.6 + r * 6) + (r - 0.5) * 0.2, 20), barefoot: true }), [x, 0, z], { mirror: mir });
});
/** the Traveller standing (side view, facing the pit) */
const travStand = (c: Cam, p: V3, headRot = 0.05): TravellerCard => { const mir = mirrorFor(c, 1, 0); return put(walker(T, { light: lightOf(c, mir), shawlNear: mir, headRot: q(headRot, 20), barefoot: true }), p, { mirror: mir }); };
/** busts: his front / back / side redrawn larger (zoom k about the chest), trembling */
const ZK = 1.8, ZA: [number, number] = [300, 620];
const bust = (kind: "front" | "back" | "side", c: Cam, p: V3, t: number, tremble = 0, headRot = 0): TravellerCard => {
  const mir = kind === "side" ? mirrorFor(c, 1, 0) : false, L = lightOf(c, mir);
  const base = kind === "front" ? front(T, "down", L) : kind === "back" ? back(T, L) : walker(T, { light: L, shawlNear: mir, headRot: q(headRot, 20), barefoot: true });
  const j = tremble * 0.004;
  return put(zoomCard(base, ZK, ...ZA, kind), [p[0] + j * noise1(t * 22, 1), p[1] + anchorH(ZA[1]) + j * noise1(t * 25, 2), p[2] + j * noise1(t * 19, 3)], { mirror: mir, scale: 1 / ZK, roll: tremble * 0.006 * noise1(t * 9, 4) });
};
const HEAD = (p: V3): V3 => [p[0], p[1] + 1.72, p[2]];
/** his two bare feet on the line: step cycle P seconds; returns the cards and the body's x (foot cards are 1/4 scale) */
const FS = 0.25;
const feet = (c: Cam, t: number, P: number, x0: number, shake = 0): { cards: TravellerCard[]; x: number } => {
  const mir = mirrorFor(c, 1, 0), stride = 0.3, cards: TravellerCard[] = [];
  const body = x0 + (2 * stride / P) * t;
  [0, 0.5].forEach((ph, i) => {
    const cyc = t / P + ph, u = cyc - Math.floor(cyc), n = Math.floor(cyc), sw = smooth((u - 0.6) / 0.4);
    const x = x0 + 2 * stride * (n + sw) - stride * ph * 2 + (i ? 0 : 0), lift = u > 0.6 ? 0.05 * Math.sin(Math.PI * (u - 0.6) / 0.4) : 0;
    const heel = u > 0.42 && u < 0.6 ? smooth((u - 0.42) / 0.18) : u >= 0.6 ? 1 - smooth((u - 0.6) / 0.3) : 0, grip = u < 0.5 ? 0.6 + 0.4 * Math.sin(t * 3 + i) : 0.2;
    const jit = shake * 0.004 * noise1(t * 30, i + 7);
    cards.push(put(bareFoot({ lift: heel * 0.8, grip, sway: Math.sin(t * 2 + i) }), [x, (x < 0.4 ? 0.05 : ABYSS.Y(x)) + lift + jit, i ? -0.025 : 0.025], { mirror: mir, scale: FS }));
  });
  return { cards, x: body };
};
/** people passing close in front of the camera (C toward the target S), out of focus */
const passers = (C: V3, S: V3, t: number, list: [string, number, number, number][]): TravellerCard[] => {
  const d = new THREE.Vector3(S[0] - C[0], 0, S[2] - C[2]).normalize(), p = new THREE.Vector3(-d.z, 0, d.x);
  return list.map(([lk, dist, v, ph]) => {
    const s = ph + v * t, pos: V3 = [C[0] + d.x * dist + p.x * s, 0, C[2] + d.z * dist + p.z * s];
    const cc = cam(C, S, 45), mir = mirrorFor(cc, p.x * Math.sign(v), p.z * Math.sign(v));
    return put(walkC(lk, Math.abs(v * t) + ph, lightOf(cc, mir), mir, { swing: 1.1 }), pos, { mirror: mir });
  });
};

// ---------------- the shots ----------------
type Shot = { cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3; shake?: number; glow?: number };
const NOHEAD: V3 = [0, -50, 0];
const mv = (a: Cam, b: Cam, u: number): Cam => ({ pos: lerp3(a.pos, b.pos, ease(u)), look: lerp3(a.look, b.look, ease(u)), fov: lerp(a.fov, b.fov, ease(u)), roll: lerp(a.roll, b.roll, ease(u)) });
const rollC = (c: Cam, r: number): Cam => ({ ...c, roll: r });
export const shotAt0 = (f: number): Shot => {
  const sh = shotOf(f), t = f / FPS, u = clamp01((f - sh.from) / Math.max(1, sh.to - sh.from)), tl = (f - sh.from) / FPS;
  const P = travPos(t);
  switch (sh.kind) {
    // ======================= 0-5 s: the reveal =======================
    case "burst": { const c = mv(cam([-7.5, 2.2, 0.8], [20, -1, 0], 72), cam([7, 7.5, 5.5], [70, -10, -2], 54), u);
      return { cam: c, focus: [40, -5, 0], cInf: 2, trav: travStand(c, CLIFF_T), others: crowdCards(c, t), head: NOHEAD }; }
    case "bridgeFly": { const x = lerp(10, 46, ease(u)), c = rollC(cam([x, 2.4 - 0.8 * u, 2.2], [x + 30, -3.5, -0.5], 50), 0.06 * Math.sin(u * 3));
      return { cam: c, focus: [x + 12, 0, 0], cInf: 2, trav: null, head: NOHEAD }; }
    // ======================= 5-10 s: the edge =======================
    case "cliffOrbit": { const a = lerp(62, 108, ease(u)) * Math.PI / 180, C: V3 = [-4.5, 1.3, 0.5], c = cam([C[0] + 10.5 * Math.sin(a), 2.9, C[2] + 10.5 * Math.cos(a)], C, 42);
      return { cam: c, focus: C, cInf: 3, trav: travStand(c, CLIFF_T), others: crowdCards(c, t), head: HEAD(CLIFF_T) }; }
    case "cliffLow": { const c = mv(cam([4.5, -5.5, 7.5], [-3, 2.8, 0.5], 48), cam([4.2, -3.8, 6.8], [-3, 3.2, 0.5], 44), u);
      return { cam: c, focus: [-2.5, 1.5, 0.8], cInf: 3, trav: travStand(c, CLIFF_T), others: crowdCards(c, t), head: HEAD(CLIFF_T) }; }
    // ======================= 10-15 s: fear =======================
    case "fearUp": { const H = HEAD(CLIFF_T), c = mv(cam([H[0] + 1.35, 1.2, H[2] + 0.55], [H[0], H[1] + 0.12, H[2]], 46), cam([H[0] + 0.95, 1.28, H[2] + 0.4], [H[0], H[1] + 0.08, H[2]], 42), u);
      return { cam: c, focus: H, cInf: 6, trav: bust("front", c, CLIFF_T, t, 1), others: crowdCards(c, t, 2.5).slice(0, 10), head: H, glow: 1.3 }; }
    case "fearTight": { const H = HEAD(CLIFF_T), c = rollC(mv(cam([H[0] + 0.6, 1.4, H[2] - 0.7], [H[0], H[1] + 0.05, H[2]], 40), cam([H[0] + 0.45, 1.45, H[2] - 0.55], [H[0], H[1], H[2]], 38), u), -0.12);
      return { cam: c, focus: H, cInf: 7, trav: bust("front", c, CLIFF_T, t, 1.4), head: H, glow: 1.3 }; }
    // ======================= 15-27 s: over the shoulder, the eruption =======================
    case "ots": case "otsErupt": { const H = HEAD(CLIFF_T), e = sh.kind === "otsErupt" ? u : 0;
      const c = mv(cam([H[0] - 1.9, H[1] + 0.3, H[2] + 1.05], [40, -14, -22], 46), cam([H[0] - 1.6, H[1] + 0.26, H[2] + 0.95], [40, -16, -24], sh.kind === "otsErupt" ? 50 : 44), sh.kind === "ots" ? u : 0.5 + 0.5 * e);
      return { cam: c, focus: [30, -20, -20], cInf: 3, trav: bust("back", c, CLIFF_T, t, sh.kind === "otsErupt" ? 1.2 : 0.4), others: crowdCards(c, t, 2.5).slice(0, 8), head: H, shake: sh.kind === "otsErupt" ? 0.5 + 0.8 * u : 0 }; }
    case "eruptWide": { const c = mv(cam([-1.5, 3.2, 9], [ABYSS.ERUPT[0], -30, ABYSS.ERUPT[2]], 62), cam([6, 2.6, 6], [ABYSS.ERUPT[0], -10, ABYSS.ERUPT[2]], 40), u);
      return { cam: c, focus: [ABYSS.ERUPT[0], -20, ABYSS.ERUPT[2]], cInf: 1, trav: null, others: crowdCards(c, t).slice(0, 14), head: NOHEAD, shake: 1.2 }; }
    case "underBridge": { const c = mv(cam([16, -16, 5.5], [21, 0.5, 0], 52), cam([22, -12, 4], [27, 0.6, 0], 48), u);
      return { cam: c, focus: [22, 0, 0], cInf: 2, trav: null, head: NOHEAD, shake: 0.6 }; }
    case "emberLens": { const c = mv(cam([3.5, 2.2, 3.2], [ABYSS.ERUPT[0], -6, ABYSS.ERUPT[2]], 48), cam([1.2, 2.4, 4.2], [ABYSS.ERUPT[0], -2, ABYSS.ERUPT[2]], 58), u);
      return { cam: c, focus: [10, 0, -5], cInf: 2, trav: null, head: NOHEAD, shake: 0.9 }; }
    // ======================= 27-32 s: the stare =======================
    case "stareA": case "stareB": { const H = HEAD(CLIFF_T), a = (sh.kind === "stareA" ? lerp(70, 115, u) : lerp(-60, -100, u)) * Math.PI / 180, R = 1.25;
      const c = cam([H[0] + R * Math.sin(a), H[1] - 0.12, H[2] + R * Math.cos(a)], [H[0], H[1] - 0.1, H[2]], 40);
      return { cam: c, focus: H, cInf: 6, trav: bust("front", c, CLIFF_T, t, 0.6), others: crowdCards(c, t, 2.5).slice(0, 10), head: H, glow: 1.2 }; }
    // ======================= 32-42.6 s: the crowd moves =======================
    case "crowdPush": case "pushA": { const C: V3 = [-6.4, 1.5, 4.4], S: V3 = [CLIFF_T[0], 1.55, CLIFF_T[2]], c = mv(cam(C, S, 44), cam(add(C, [0.4, 0, -0.3]), S, 40), u);
      return { cam: c, focus: S, cInf: 4, trav: travStand(c, CLIFF_T, 0.1), others: [...crowdCards(c, t, 3).slice(0, 14), ...passers(c.pos, S, tl, [["h3", 1.0, 1.6, -2.6], ["h1", 1.6, -1.3, 2.2], ["h5", 2.4, 1.1, -3.4]])], head: HEAD(CLIFF_T) }; }
    case "pushB": { const C: V3 = [-5.6, 1.6, -3.4], S: V3 = [CLIFF_T[0], 1.6, CLIFF_T[2]], c = mv(cam(C, S, 42), cam(add(C, [0.5, 0, 0.4]), S, 38), u);
      return { cam: c, focus: S, cInf: 4, trav: travStand(c, CLIFF_T, 0.05), others: [...crowdCards(c, t, 3).slice(0, 14), ...passers(c.pos, S, tl, [["h6", 0.8, -1.5, 2.4], ["h2", 1.3, 1.4, -2.9], ["h4", 2.0, -1.0, 2.6]])], head: HEAD(CLIFF_T) }; }
    case "pushC": { const C: V3 = [-6.0, 1.45, 2.6], S: V3 = [CLIFF_T[0], 1.6, CLIFF_T[2]], c = mv(cam(C, S, 40), cam(add(C, [0.3, 0.05, -0.2]), S, 37), u);
      return { cam: c, focus: S, cInf: 4, trav: travStand(c, CLIFF_T, 0.15), others: [...crowdCards(c, t, 3).slice(0, 12), ...passers(c.pos, S, tl, [["h4", 0.55, 1.05, -1.4], ["h1", 1.5, -0.9, 1.7]])], head: HEAD(CLIFF_T) }; }
    case "toBridge": { const c = mv(cam([-11, 4.2, 4.5], [8, -1.5, -0.5], 48), cam([-6.5, 3.2, 3.2], [10, -2, -0.5], 44), u), p = travPos(t), mir = mirrorFor(c, 1, -0.3);
      const surge = CROWD_POS.slice(0, 22).map(([x, z, lk, r], i) => { const k = smooth(u * 1.3 - r * 0.3), xx = Math.min(-0.9 - 0.4 * (i % 3), x + 4.5 * k), zz = z * (1 - 0.35 * k);
        return put(walkC(lk, 4 * k + r, lightOf(c, mir), mir), [xx, 0, zz], { mirror: mir }); });
      return { cam: c, focus: p, cInf: 3, trav: put(walkC(T, 2.2 * u, lightOf(c, mir), mir), p, { mirror: mir }), others: surge, head: HEAD(p) }; }
    // ======================= 42.6-52.6 s: the feet =======================
    case "feetEdge": { const fx = 0.0, c = mv(cam([fx + 1.0, 0.42, 1.25], [fx - 0.15, 0.1, 0], 40), cam([fx + 0.85, 0.38, 1.05], [fx - 0.05, 0.1, 0], 36), u);
      return { cam: c, focus: [fx + 0.2, 0.05, 0], cInf: 7, trav: null, others: feet(c, tl, 1.25, -0.35).cards, head: NOHEAD, shake: 0.2, glow: 1.2 }; }
    case "feetSide": { const ft0 = feet(cam([0, 0, 1], [0, 0, 0], 40), tl, 1.15, 0.45), x = ft0.x, c = cam([x + 0.1, 0.4, 1.55], [x + 0.1, 0.12, 0], 36);
      return { cam: c, focus: [x, 0.05, 0], cInf: 7, trav: null, others: feet(c, tl, 1.15, 0.45).cards, head: NOHEAD, shake: 0.3, glow: 1.2 }; }
    case "feetVertigo": { const x = 1.0 + 0.25 * tl, d = lerp(1.0, 2.4, ease(u)), fov = 2 * Math.atan(Math.tan(32 * Math.PI / 180) * 1.0 / d) * 180 / Math.PI;
      const dir = new THREE.Vector3(0.55, -0.86, 0.75).normalize(), c = cam([x - dir.x * d, 0.05 - dir.y * d, -dir.z * d], [x + 0.15, 0.0, 0], fov);
      return { cam: c, focus: [x, 0, 0], cInf: 6, trav: null, others: feet(c, tl, 1.3, x - 0.25).cards, head: NOHEAD, shake: 0.2, glow: 1.4 }; }
    case "feetToes": { const x = 1.7 + 0.1 * tl, c = mv(cam([x - 0.95, 0.34, 0.95], [x + 0.6, 0.06, -0.1], 42), cam([x - 0.8, 0.32, 0.85], [x + 0.7, 0.07, -0.1], 38), u);
      return { cam: c, focus: [x, 0.04, 0], cInf: 6, trav: null, others: feet(c, tl * 0.4, 1.6, x - 0.15).cards, head: NOHEAD, glow: 1.2 }; }
    // ======================= 52.6-57.6 s: looking down =======================
    case "lookDown": { const p = travPos(t), H = HEAD(p), c = mv(cam([p[0] - 0.75, H[1] + 0.2, 0.55], [p[0] + 2.4, H[1] - 2.75, -0.35], 46), cam([p[0] - 0.6, H[1] + 0.15, 0.48], [p[0] + 2.2, H[1] - 2.45, -0.3], 42), u);
      return { cam: c, focus: [p[0] + 3, -4, 0], cInf: 4, trav: bust("back", c, p, t, 0.8), head: H }; }
    case "lookDown2": { const p = travPos(t), H = HEAD(p), c = mv(cam([p[0] + 0.85, H[1] - 0.25, 0.75], [p[0], H[1] - 0.1, 0], 42), cam([p[0] + 0.65, H[1] - 0.22, 0.6], [p[0], H[1] - 0.12, 0], 38), u);
      return { cam: c, focus: H, cInf: 7, trav: bust("side", c, p, t, 1.2, 0.4), head: H, glow: 1.4 }; }
    // ======================= the things left behind =======================
    case "feetFast": { const x = travPos(t)[0], c = rollC(mv(cam([x - 0.7, 0.42, 1.45], [x + 0.3, 0.1, -0.1], 42), cam([x - 0.4, 0.4, 1.3], [x + 0.6, 0.1, -0.1], 38), u), 0.05 * Math.sin(t * 3));
      return { cam: c, focus: [x, 0.05, 0], cInf: 6, trav: null, others: feet(c, tl, 0.8, x - 0.3, 1).cards, head: NOHEAD, shake: 0.7, glow: 1.3 }; }
    case "stumbleAhead": case "stumble": { const x = travPos(t)[0], m = x + 2.6 + 0.3 * tl, c = cam([x - 0.4, 0.35, 0.55], [m + 1, 0.9, 0], 44), mir = mirrorFor(c, 1, 0), L = lightOf(c, mir);
      const k = 0.5 + 0.35 * Math.abs(Math.sin(tl * 2.6));
      return { cam: c, focus: [m, 0.9, 0], cInf: 4, trav: null, others: [put(stoop("h2", k, L), [m, ABYSS.Y(m), 0], { mirror: mir }), ...feet(c, tl, 0.9, x - 0.3, 1).cards], head: [m, 1.5, 0], shake: 0.6 }; }
    case "itemsFall": { const [hx, hy, hz] = ITEMS_AT.pos, c = mv(cam([hx + 0.55, hy + 0.35, hz + 1.25], [hx - 0.15, hy - 0.75, hz], 46), cam([hx + 0.6, hy + 0.2, hz + 1.35], [hx - 0.1, hy - 1.05, hz], 48), u);
      const open = smooth((t - ITEMS_AT.t0 + 0.4) / 0.5), mir = mirrorFor(c, -1, 0);
      return { cam: c, focus: [hx, hy - 0.4, hz], cInf: 5, trav: null, others: [put(openHand(open), [hx + 0.02, hy - anchorH(520) * 0.25, hz], { mirror: mir, scale: 0.25 })], head: NOHEAD, glow: 1.2 }; }
    case "matFire": { const c = mv(cam([MAT_X - 1.9, 0.75, 1.5], [MAT_X, 0.0, 0], 44), cam([MAT_X - 1.5, 0.65, 1.25], [MAT_X, 0.02, 0], 40), u);
      return { cam: c, focus: [MAT_X, 0.05, 0], cInf: 5, trav: null, head: NOHEAD }; }
    case "sideFace": { const p = travPos(t), H = HEAD(p), c = mv(cam([p[0] + 0.15, H[1] - 0.05, 1.15], [p[0] + 0.05, H[1] - 0.05, 0], 40), cam([p[0] + 0.1, H[1] - 0.07, 0.9], [p[0] + 0.05, H[1] - 0.06, 0], 36), u);
      return { cam: c, focus: H, cInf: 7, trav: bust("side", c, p, t, 1.4, 0.1 + 0.05 * Math.sin(t * 4.5)), head: H, glow: 1.5 }; }
    case "feetFire": { const x = travPos(t)[0], c = mv(cam([x - 0.45, -0.75, 1.35], [x + 0.2, 0.1, 0], 50), cam([x - 0.25, -0.6, 1.2], [x + 0.35, 0.12, 0], 46), u);
      return { cam: c, focus: [x, 0.05, 0], cInf: 6, trav: null, others: feet(c, tl, 0.85, x - 0.3, 1).cards, head: NOHEAD, shake: 0.6, glow: 2 }; }
    case "crawlDrag": { const x = 15 + 1.2 * tl, c = mv(cam([x - 5, 2.6, 3.0], [x + 4, -0.3, 0], 46), cam([x - 3, 2.3, 2.6], [x + 5, -0.2, 0], 42), u), mir = mirrorFor(c, 1, 0), L = lightOf(c, mir);
      const crawler = put(stoop("h4", 0.92, L), [x + 3 + 0.12 * tl, ABYSS.Y(x + 3), 0], { mirror: mir });
      const dragged = put(walker("h6", { light: L, shawlNear: mir, armN: reachArm(0, 1), barefoot: true }), [x + 0.5 + 0.25 * tl, ABYSS.Y(x) + 0.12, 0], { mirror: mir, roll: (mir ? -1 : 1) * Math.PI / 2 });
      const walkerA = put(walkC("h1", 1.0 * tl, L, mir), [x + 7 + 1.0 * tl, ABYSS.Y(x + 7), 0], { mirror: mir });
      return { cam: c, focus: [x + 3, 0, 0], cInf: 3, trav: null, others: [crawler, dragged, walkerA], head: [x + 3, 1.0, 0] }; }
    // ======================= 73.6-79.35 s: breaking =======================
    case "breaking": case "breaking2": { const p = travPos(t), H = HEAD(p), b2 = sh.kind === "breaking2";
      const c = rollC(b2 ? mv(cam([p[0] - 0.75, H[1] - 0.15, 0.55], [p[0], H[1] - 0.05, 0], 38), cam([p[0] - 0.5, H[1] - 0.12, 0.4], [p[0], H[1] - 0.05, 0], 34), u)
        : mv(cam([p[0] - 1.2, H[1] - 0.3, 0.95], [p[0], H[1] - 0.05, 0], 44), cam([p[0] - 0.8, H[1] - 0.22, 0.65], [p[0], H[1] - 0.05, 0], 38), u), b2 ? 0.08 * Math.sin(t * 2) : 0);
      return { cam: c, focus: H, cInf: 7, trav: bust("front", c, p, t, b2 ? 2.2 : 1.5), head: H, shake: b2 ? 1.0 : 0.4, glow: 1.6 }; }
    // ======================= the variety shots =======================
    case "skyBolt": case "skyBolt2": case "skyEnd": { const x = sh.kind === "skyBolt" ? 18 : sh.kind === "skyBolt2" ? 40 : 14, c = mv(cam([x - 8, 1.2, 9], [x + 10, 16, -14], 56), cam([x - 6, 1.0, 8], [x + 12, 18, -14], 52), u);
      return { cam: c, focus: [x + 30, 30, -30], cInf: 1, trav: null, head: NOHEAD }; }
    case "topDown": { const x = lerp(30, 52, u), c = rollC(cam([x, 70 - 8 * u, 7], [x + 2, 0, 0], 50), 0.3 + 0.15 * u);
      return { cam: c, focus: [x, 0, 0], cInf: 1, trav: null, head: NOHEAD }; }
    case "hands": { const p = CLIFF_T, H: V3 = [p[0], 1.08, p[2]], c = mv(cam([p[0] + 0.62, 1.5, p[2] + 0.35], [p[0] - 0.05, 1.02, p[2]], 44), cam([p[0] + 0.5, 1.45, p[2] + 0.3], [p[0] - 0.05, 1.03, p[2]], 40), u);
      const sh2 = 0.004 * noise1(t * 18, 5);
      return { cam: c, focus: H, cInf: 7, trav: put(shakingHands(t), [p[0] + sh2, 0.62, p[2]], { scale: 0.32 }), head: NOHEAD, glow: 1.4 }; }
    case "smokeDevils": { const c = mv(cam([0.5, 3.5, 4], [40, -10, -20], 52), cam([1.2, 3.2, 3.5], [40, -8, -22], 48), u);
      return { cam: c, focus: [30, -10, -20], cInf: 2, trav: null, others: crowdCards(c, t).slice(0, 12), head: NOHEAD }; }
    case "kneelEdge": { const C: V3 = [-6.2, 1.2, 3.6], S: V3 = [-2.5, 0.9, 0.6], c = mv(cam(C, S, 46), cam(add(C, [0.6, -0.1, -0.4]), S, 42), u);
      return { cam: c, focus: S, cInf: 4, trav: travStand(c, CLIFF_T, 0.2), others: [...crowdCards(c, t, 2.5), ...passers(c.pos, S, tl, [["h2", 1.2, 1.4, -2.4], ["h6", 2.0, -1.1, 2.0]])], head: HEAD(CLIFF_T) }; }
    case "kneelWide": { const a = lerp(130, 155, ease(u)) * Math.PI / 180, C: V3 = [-5, 0.6, 0], c = cam([C[0] + 15 * Math.sin(a), 4.5, C[2] + 15 * Math.cos(a)], C, 40);
      return { cam: c, focus: C, cInf: 2, trav: travStand(c, CLIFF_T), others: crowdCards(c, t), head: HEAD(CLIFF_T) }; }
    case "pillarsRise": { const c = mv(cam([8, 1.6, 4.5], [30, -5, 12], 54), cam([9, 1.2, 3.5], [32, 0, 14], 50), u);
      return { cam: c, focus: [21, 0, 17], cInf: 2, trav: null, head: NOHEAD, shake: 0.5 }; }
    case "debrisPass": { const x = PASS_X, c = cam([x - 1.0, 1.5, 3.4], [x + 3, 0.6, 0], 48);
      return { cam: c, focus: [x + 1, 1, 1.3], cInf: 3, trav: null, head: NOHEAD, shake: Math.max(0.3, 2 * (1 - Math.abs(t - E.pass) / 0.6)) }; }
    case "wideLone": { const x = 30 + 1.2 * tl, c = mv(cam([x - 30, 14, 85], [x + 10, -6, 0], 36), cam([x - 26, 12, 80], [x + 12, -6, 0], 32), u), mir = mirrorFor(c, 1, 0);
      return { cam: c, focus: [x, 0, 0], cInf: 1, trav: null, others: [put(walkC("h1", 1.2 * tl, lightOf(c, mir), mir), [x, ABYSS.Y(x), 0], { mirror: mir })], head: NOHEAD }; }
    case "crossers": case "crossersSafe": { const x = sh.kind === "crossers" ? 6 : bridgeX(t) + 1.5, c = mv(cam([x - 1.5, 0.9, 2.6], [x + 12, 0.2, -0.3], 50), cam([x - 1.0, 0.8, 2.2], [x + 14, 0.2, -0.3], 44), u), mir = mirrorFor(c, 1, 0);
      const fig = sh.kind === "crossersSafe" ? [put(walkC(T, 0.22 * t, lightOf(c, mir), mir), travPos(t), { mirror: mir })] : [];
      return { cam: c, focus: [x + 6, 0.3, 0], cInf: 3, trav: null, others: fig, head: NOHEAD, shake: 0.4 }; }
    case "eruptRise": { const c = mv(cam([12, -9, 6], [ABYSS.ERUPT[0], -30, ABYSS.ERUPT[2]], 56), cam([14, -6, 5], [ABYSS.ERUPT[0], -20, ABYSS.ERUPT[2]], 50), u);
      return { cam: c, focus: [ABYSS.ERUPT[0], -30, ABYSS.ERUPT[2]], cInf: 1, trav: null, head: NOHEAD, shake: 0.9 }; }
    case "sideTrack": { const p = travPos(t), c = cam([p[0] + 0.2, 1.25, 2.9], [p[0] + 0.25, 1.05, 0], 44), mir = mirrorFor(c, 1, 0);
      return { cam: c, focus: [p[0], 1.1, 0], cInf: 5, trav: put(walkC(T, bridgeX(t), lightOf(c, mir), mir), p, { mirror: mir }), head: HEAD(p), glow: 1.2 }; }
    case "otsBridge": { const p = travPos(t), c = mv(cam([p[0] - 1.9, 1.95, 0.24], [p[0] + 30, -6.0, -0.6], 44), cam([p[0] - 1.6, 1.92, 0.2], [p[0] + 30, -5.6, -0.6], 40), u);
      return { cam: c, focus: [p[0], 1.4, 0], cInf: 2, trav: put(back(T, lightOf(c)), p, {}), head: HEAD(p) }; }
    case "underCross": { const x = bridgeX(t), c = mv(cam([x + 2.2, -4.6, 3.4], [x + 4, 0.9, 0], 52), cam([x + 2.8, -3.8, 3.0], [x + 4.6, 0.9, 0], 48), u), mir = mirrorFor(c, 1, 0), L = lightOf(c, mir);
      const figs = [0, 1, 2, 3].map((i) => { const fx = x + 1 + 2.2 * i + (0.6 + 0.3 * i) * tl; return put(walkC(CROWD[i], (0.6 + 0.3 * i) * tl + i, L, mir), [fx, ABYSS.Y(fx), 0], { mirror: mir }); });
      return { cam: c, focus: [x + 4, 0, 0], cInf: 2, trav: put(walkC(T, bridgeX(t), L, mir), travPos(t), { mirror: mir }), others: figs, head: NOHEAD, shake: 0.4 }; }
    case "crossersPast": { const p = travPos(t), c = cam([p[0] + 1.8, 1.35, 1.9], [p[0] - 0.4, 1.0, -0.2], 46), mir = mirrorFor(c, 1, 0);
      return { cam: c, focus: [p[0], 1.1, 0], cInf: 4, trav: put(walkC(T, bridgeX(t), lightOf(c, mir), mir), p, { mirror: mir }), head: HEAD(p), shake: 0.5 }; }
    case "hourglass": { const H = HOURGLASS, c = mv(cam([H[0] + 0.75, H[1] + 0.32, H[2] + 0.42], [H[0] - 0.3, H[1] + 0.18, H[2] - 0.15], 40), cam([H[0] + 0.55, H[1] + 0.3, H[2] + 0.32], [H[0] - 0.3, H[1] + 0.18, H[2] - 0.15], 34), u);
      return { cam: c, focus: [H[0], H[1] + 0.2, H[2]], cInf: 8, trav: null, head: NOHEAD, glow: 1.3 }; }
    case "smash1": case "smash2": { const c = cam([0, 1, 2], [10, 0, 0], 40); return { cam: c, focus: [10, 0, 0], cInf: 2, trav: null, head: NOHEAD }; }
    // ======================= 79.6-89.4 s: the strike, the fall =======================
    case "crumbleSnatch": case "engulf": { const eng = sh.kind === "engulf", s = t - (eng ? E.strike : E.snatch), c = mv(cam([SNATCH_X - 2.5, 1.3, 7.5], [SNATCH_X, 0.8, 0], 46), cam([SNATCH_X - 2.0, 1.6, 6.5], [SNATCH_X, 1.5, 0], 44), u), mir = mirrorFor(c, 1, 0), L = lightOf(c, mir);
      // crumble: the line breaks under him and he drops straight down; engulf: the fire burst covers him and he is gone
      const drop = Math.max(0, s - 0.08), pos: V3 = [SNATCH_X + 0.05, ABYSS.Y(SNATCH_X) - 0.5 * 9.8 * drop * drop, 0];
      const lk = eng ? "h5" : "h3", card = s < 0.05 ? walkC(lk, 0.6 * tl, L, mir) : walker(lk, { light: L, shawlNear: mir, armN: reachArm(0, 1), barefoot: true });
      const fig = eng ? (s < 0.25 ? [put(card, [SNATCH_X, ABYSS.Y(SNATCH_X), 0], { mirror: mir })] : []) : [put(card, pos, { mirror: mir, roll: -2.4 * drop })];
      return { cam: c, focus: [SNATCH_X, 1, 0], cInf: 3, trav: null, others: fig, head: [SNATCH_X, 1.6, 0], shake: s > 0 && s < 0.5 ? 1.5 : 0.3 }; }
    case "fallWith": { const s = tl, y = -2 - 0.5 * 9.0 * s * s * 1.6, fx0 = SNATCH_X - 6, c = rollC(cam([fx0 - 2.2, y + 2.0, 3.6], [fx0, y - 0.3, 1.0], 56), 0.9 * s + 0.3 * Math.sin(s * 5)), mir = mirrorFor(c, 1, 0);
      const fig = put(walker("h3", { light: lightOf(c, mir), shawlNear: mir, armN: reachArm(0, 1), barefoot: true }), [fx0, y, 1.0], { mirror: mir, roll: 2.6 * s + 0.7 });
      return { cam: c, focus: [fx0, y, 1], cInf: 3, trav: null, others: [fig], head: NOHEAD, shake: 1.2, glow: 1 + 2 * s }; }
    case "continue": { const c = cam([30, -40, 40], [60, -95, -60], 50); return { cam: c, focus: [60, -95, -60], cInf: 1, trav: null, head: NOHEAD }; }
    default: { const c = cam([30, -40, 40], [60, -95, -60], 50); return { cam: c, focus: [60, -95, -60], cInf: 1, trav: null, head: NOHEAD }; }
  }
};

/** camera shake: smooth noise, stronger on the eruption, the breaking and the strike */
const shakeAt = (f: number, k: number) => { const t = f / FPS; return [k * 0.02 * noise1(t * 14, 1), k * 0.02 * noise1(t * 15, 2), k * 0.012 * noise1(t * 13, 3)] as V3; };
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.9), t = f / FPS, sk = shakeAt(f, (s.shake ?? 0) + 1.6 * lightningAt(t));   // thunder shakes the frame
  const c = { ...s.cam, pos: add(add(W(s.cam.pos), hh.pos), sk), look: add(add(W(s.cam.look), hh.look), [sk[0] * 2.5, sk[1] * 2.5, sk[2] * 2.5] as V3) };
  const near = sh.kind.startsWith("feet") || sh.kind === "itemsFall" || sh.kind === "matFire" || sh.kind === "stumble" ? 1 : 0;
  const dim = (sh.kind === "smokeDevils" ? 0.45 * smooth((f - sh.from) / 40) : 0) + 0.6 * occludeAt(t);   // the smoke thickening at "the devils"; something passing in front of the light
  const state = `hell:${q(eruptAt(t), 50)}:${q(lightningAt(t), 20)}:${q((s.glow ?? 1) * (1 - Math.min(0.8, dim)), 20)}:${near}`;
  return { frame: { set: "abyss", state, t, plan: { cam: c, focus: W(s.focus), cInf: s.cInf, nearScale: 1.8 }, traveller: s.trav, others: s.others, hooks: {} }, head: W(s.head), shot: sh };
};

// ---------------- picture effects ----------------
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
export const fxAt = (f: number): FrameFx => {
  const s = shotOf(f), first = f - s.from, t = f / FPS;
  let bx = first < 6 ? 3 * (1 - first / 6) : 0, by = bx, ca = 0.8, zoom: FrameFx["zoom"], flash = 0;
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "whip" && d > -6 && d < 5) { const k = 1 - Math.abs(d + 0.5) / 6; bx = Math.max(bx, 70 * k); by = Math.max(by, 3 * k); ca = Math.max(ca, 10 * k); }
    if (tr.kind === "heart" && Math.abs(d) < 6) { const k = 1 - Math.abs(d) / 6; zoom = { scale: 1 + 0.05 * k, x: 540, y: 900, blur: 2 * k }; ca = Math.max(ca, 5 * k); }
    if (tr.kind === "impact" && d >= 0 && d < 14) { const k = 1 - d / 14; ca = Math.max(ca, 22 * k); zoom = { scale: 1 + 0.08 * k, x: 540, y: 960, blur: 3 * k }; flash = Math.max(flash, 0.6 * Math.max(0, 1 - d / 4)); }
    if (tr.kind === "flashHot" && Math.abs(d) < 8) flash = Math.max(flash, 0.75 * (1 - Math.abs(d) / 8));
  }
  const strike = t - E.strike; if (strike > -0.3 && strike < 0.15) { bx = Math.max(bx, 60 * (1 - Math.abs(strike) / 0.3)); }
  const er = eruptAt(t), haze = 5 + 14 * er + (s.kind.startsWith("feet") || s.kind === "fallWith" ? 8 : 0);
  if (s.kind === "fallWith") { const u = (f - s.from) / (s.to - s.from); flash = Math.max(flash, Math.max(0, (u - 0.75) / 0.25) * 0.85); }
  return { blurX: bx, blurY: by, ca, glitch: 0, flash, vignette: 0, grain: true, zoom, haze, css: "contrast(1.14) saturate(1.12)" };
};
/** the steepest downward look of the camera (degrees) */
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
/** shots that frame a character up close (the 45-degree rule applies) */
export const CHARACTER_SHOTS = new Set(["hands", "kneelEdge", "sideTrack", "otsBridge", "crossersPast", "crossersSafe", "engulf", "crumbleSnatch", "crowdPush", "stumbleAhead", "fearUp", "fearTight", "ots", "otsErupt", "stareA", "stareB", "pushA", "pushB", "pushC", "lookDown", "lookDown2", "sideFace", "breaking", "breaking2",
  "feetEdge", "feetSide", "feetVertigo", "feetToes", "feetFast", "feetFire", "stumble", "itemsFall", "snatch", "fallWith"]);
void LOOKS;
