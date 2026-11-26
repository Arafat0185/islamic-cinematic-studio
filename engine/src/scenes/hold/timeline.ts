// Video 006 "Hold On To This": calm, golden, slow. 0 .. speechEnd: a sheikh's talk (a TikTok sound, added in TikTok);
// then Sheikh Yasser Al-Dossari recites Ar-Ra'd 13:28-29 (in our file). Every shot is a nature world of sets/nature.ts
// matching its caption; the camera never stops (glides, push-ins, orbits, crane-ups); never steeper than 45 degrees down
// on a person. Men only on screen (the Traveller and the young man); no face anywhere.
// Timing: videos/006-hold-on/timing.json; shots: shots.json.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import type { Pen } from "../../draw/toon";
import { withLook } from "../../characters/traveller";
import { travellerChair } from "../../characters/travellerPoses";
import { walker, back, front, stoop, ruku, sujood, LOOKS, reachArm, type Card } from "../../characters/people";
import { openHand } from "../rest/art";
import { cam, move, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, Frame, TravellerCard, FrameFx } from "../../story/story";
import { NATURE, NAT } from "../../sets/nature";
import TIMING from "../../../../videos/006-hold-on/timing.json";
import STORY from "../../../../videos/006-hold-on/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export const EV = STORY.events;
export type PShot = { kind: string; world: string; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, world: s.world, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const CUTS = SHOTS.slice(1).map((s) => s.from);
/** shots that frame a person (the 45-degree rule) */
export const CHARACTER_SHOTS = new Set(["forestWalk", "quranHands", "cliffRise", "cliffOrbit", "canyonChair", "wheelOrbit", "valleyView", "sofaCall", "pentDawn", "wudu", "walkMasjid", "pray", "walkHome"]);

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const Wd = (w: string, p: V3): V3 => add(add(p, SET_OFFSET.nature), NATURE[w]);
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
/** the side the sun lights a card from (q-quantised so the card cache stays small) */
const SUN: Record<string, V3> = { forest: [-0.5, 0.35, -1], cliff: [0.2, 0.25, -1], canyon: [-0.8, 0.3, -0.6], stream: [0.4, 0.8, -0.6], valley: [0.3, 0.45, -1], lake: [0.1, 0.25, -1], pent: [0.4, 0.3, -1], wheat: [0, 0.15, -1], window: [0.2, 0.6, -1] };
const lightOf = (w: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...(SUN[w] ?? [0.3, 0.6, -1])).normalize(), camRight(c), mirror), 30);
/** true when a profile card facing (dx, dz) must be mirrored for camera c */
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
type PutO = { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null };
const put = (w: string, c: Card, p: V3, o: PutO = {}): TravellerCard => ({ pos: Wd(w, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob });
const STRIDE = 0.36;
const walkC = (look: string, dist: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}) =>
  walker(look, { phase: q(0.25 + dist / (2 * STRIDE), 240), k: 1, stride: Math.round(STRIDE / SU), light: L, shawlNear: mirror, swing: 0.5, ...extra });
const seated = (look: string, arms: "rest" | "call" | "phone", L: number): Card => ({ key: `sit|${look}|${arms}|${L}`, draw: (p) => withLook(LOOKS[look], () => travellerChair(p, { light: L, arms, tilt: 0, chair: false })) });
const T = "traveller", Y = "youth";

type Shot = { state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3 };
const NOHEAD: V3 = [0, -1000, 0];
export const shotAt0 = (f: number): Shot & { world: string } => {
  const sh = shotOf(f), t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), tl = (f - a) / FPS, mv = (c0: Cam, c1: Cam) => move(c0, c1, a, b)(f), w = sh.world;
  const r = (s: Shot) => ({ ...s, world: w });
  switch (sh.kind) {
    // ======================= the talk =======================
    case "forestWalk": { const z = 8.5 - 0.9 * tl, p: V3 = [NAT.forestPath(z), 0, z];
      const c = mv(cam([1.8, 2.6, 17], [0.2, 3.2, -24], 46), cam([1.1, 1.7, z + 4.6], [0.1, 2.2, -18], 44)), mir = mirrorFor(c, 0, -1);
      return r({ state: "forest:0", cam: c, focus: add(p, [0, 1.4, 0]), cInf: 3, trav: put(w, walkC(T, 0.9 * tl, lightOf(w, c, mir), mir), p, { mirror: mir }), head: add(p, [0, 1.8, 0]) }); }
    case "quranHands": { const z = NAT.mushaf[2], x = NAT.forestPath(z), p: V3 = [x, 0, z];
      const c = mv(cam([x + 0.5, 1.3, z + 1.9], [x, 1.15, z], 34), cam([x + 0.32, 1.24, z + 1.4], [x, 1.12, z], 32));
      return r({ state: "forest:1", cam: c, focus: [x, 1.08, z + 0.1], cInf: 6, trav: put(w, front(T, "qiyam", lightOf(w, c)), p), head: add(p, [0, 1.8, 0]) }); }
    case "cliffRise": { const c = mv(cam([1.3, 0.9, 3.4], [0, 1.35, 0], 40), cam([1.5, 3.2, 4.6], [-0.2, 1.6, -3], 42));
      return r({ state: "cliff", cam: c, focus: [0, 1.4, 0], cInf: 2, trav: put(w, back(T, lightOf(w, c)), [0, 0, 0]), head: [0, 1.8, 0] }); }
    case "cliffOrbit": { const ang = lerp(0.35, 1.25, smooth(u)), c = cam([3.4 * Math.sin(ang), 1.5 + 0.3 * u, 3.4 * Math.cos(ang)], [0, 1.45, 0], 38), mir = mirrorFor(c, 0, -1);
      return r({ state: "cliff", cam: c, focus: [0, 1.45, 0], cInf: 4, trav: put(w, walker(T, { light: lightOf(w, c, mir), shawlNear: mir, headRot: 0.25 }), [0, 0, 0], { mirror: mir }), head: [0, 1.8, 0] }); }
    case "canyonChair": { const ch = NAT.chair, p: V3 = [ch[0] + 0.62, 0, ch[2] - 0.1], c = mv(cam([3.3, 1.6, 2.7], [-1.9, 0.35, -2.0], 46), cam([2.8, 1.45, 2.2], [-1.9, 0.3, -1.9], 44)), mir = mirrorFor(c, -1, 0);
      return r({ state: "canyon", cam: c, focus: [ch[0], 0.5, ch[2]], cInf: 3, trav: put(w, stoop(T, 0.15 + 0.35 * smooth(u * 1.4), lightOf(w, c, mir)), p, { mirror: mir }), head: add(p, [0, 1.7, 0]) }); }
    case "window": { const s0 = NAT.sill, c = mv(cam([0.45, 1.3, -0.9], [0.05, 1.08, s0[2]], 40), cam([0.25, 1.22, -1.55], [0.1, 1.06, s0[2]], 34));
      return r({ state: "window:0", cam: c, focus: [s0[0] + 0.2, 1.08, s0[2]], cInf: 5, trav: null, head: NOHEAD }); }
    case "coins": { const H: V3 = [0.05, 0.92, 0.05], c = mv(cam([0.8, 0.5, 1.9], [0, 0.5, -0.3], 40), cam([0.6, 0.42, 1.5], [0, 0.45, -0.3], 38));
      return r({ state: `stream:${q(clamp01((t - EV.coinsFrom) / 1.4), 60)}`, cam: c, focus: [0, 0.3, 0], cInf: 4, trav: null, others: [put(w, openHand(t), [H[0], H[1] - (975 - 380) * SU * 0.3, H[2]], { scale: 0.3 })], head: NOHEAD }); }
    case "homeDusk": { const c = mv(cam([-1.6, 1.3, 4.4], [1.2, 1.0, -5], 42), cam([-0.7, 1.05, 2.3], [1.6, 0.9, -5], 40));
      return r({ state: "home", cam: c, focus: [1.5, 0.8, -3.5], cInf: 2, trav: null, head: NOHEAD }); }
    case "wheelOrbit": case "valleyView": { const C = NAT.wheelchair, orbit = sh.kind === "wheelOrbit";
      const ang = orbit ? lerp(1.45, 0.75, smooth(u)) : 0;
      const c = orbit ? cam([C[0] + 2.3 * Math.sin(ang), 1.3, C[2] + 2.3 * Math.cos(ang)], [C[0], 0.9, C[2] - 0.4], 40) : mv(cam([1.15, 1.35, 1.2], [-0.4, 0.85, -3.4], 42), cam([0.85, 1.25, 0.5], [-0.3, 0.8, -3.4], 40));
      const mir = mirrorFor(c, 0, -1);
      return r({ state: "valley", cam: c, focus: [C[0], 0.9, C[2]], cInf: orbit ? 3 : 2, trav: put(w, seated(T, "rest", lightOf(w, c, mir)), [C[0], 0, C[2] + 0.04], { mirror: mir }), head: add(C, [0, 1.35, 0]) }); }
    case "lakeOut": { const out = clamp01((t - EV.lanternOut) / 0.5), fog = 0.15 + 0.85 * smooth((t - EV.lanternOut - 0.3) / 1.8);
      const c = mv(cam([3.4, 2.1, 9.0], [-0.8, 1.7, -11], 40), cam([2.5, 1.9, 6.2], [-1.4, 1.8, -10], 38));
      return r({ state: `lake:0:${q(1 - out, 30)}:${q(fog, 30)}:0`, cam: c, focus: [-2.9, 2.4, -9.2], cInf: 2, trav: null, head: NOHEAD }); }
    case "bambooCar": { const x = 6 + 6.5 * tl, c = cam([2.3 - 0.4 * u, 1.05, -x + 6.0 - 1.0 * u], [-1.4, 0.6, -x - 1.0], 42);
      return r({ state: `bamboo:${q(x, 60)}`, cam: c, focus: [-1.4, 0.7, -x], cInf: 2, trav: null, head: NOHEAD }); }
    case "pentCards": { const T0 = NAT.table, c = mv(cam([0.75, 0.95, 0.75], [-0.15, 0.44, T0[2]], 32), cam([0.25, 0.82, 0.55], [-0.2, 0.44, T0[2]], 30));
      return r({ state: "pent:0", cam: c, focus: [-0.12, 0.44, T0[2]], cInf: 6, trav: null, head: NOHEAD }); }
    case "pentWide": { const c = mv(cam([3.8, 1.7, 4.4], [-1.2, 1.0, -4.2], 50), cam([2.2, 1.55, 4.9], [-1.6, 1.0, -4.2], 50));
      return r({ state: "pent:0", cam: c, focus: [0, 0.8, 0], cInf: 1, trav: null, head: NOHEAD }); }
    case "sofaCall": case "pentDawn": { const S0 = NAT.sofa, p: V3 = [S0[0] - 0.2, 0, S0[2] - 0.3], dawn = sh.kind === "pentDawn";
      const c = dawn ? mv(cam([2.3, 1.15, -1.9], [-0.1, 0.8, 0.6], 40), cam([1.6, 1.05, -1.4], [-0.15, 0.8, 0.6], 38)) : mv(cam([1.7, 2.0, 2.9], [-0.3, 0.75, 0.1], 44), cam([2.8, 2.4, 4.3], [-0.4, 0.7, -0.6], 50));
      const mir = mirrorFor(c, 0, -1), arms = dawn ? (t < EV.phoneDown ? "phone" : "rest") : "call";
      return r({ state: `pent:${dawn ? 1 : 0}`, cam: c, focus: add(p, [0, 1.0, 0]), cInf: dawn ? 4 : 2, trav: put(w, seated(Y, arms, lightOf(w, c, mir)), p, { mirror: mir }), head: add(p, [0, 1.35, 0]) }); }
    case "wheatSun": { const c = mv(cam([0.5, 1.15, 7], [0, 5.5, -160], 34), cam([0.3, 1.1, 2.5], [0, 6.5, -160], 26));
      return r({ state: "wheat:1", cam: c, focus: [0, 6, -160], cInf: 0, trav: null, head: NOHEAD }); }
    // ======================= the recitation =======================
    case "wudu": { const B0: V3 = [2.0, 0.2, 0.4], c = mv(cam([4.6, 1.5, 3.6], [0.8, 0.45, -0.2], 40), cam([4.0, 1.35, 3.0], [0.9, 0.45, -0.2], 38)), mir = mirrorFor(c, -1, 0);
      return r({ state: "stream:0", cam: c, focus: [0.8, 0.5, 0.5], cInf: 3, trav: put(w, stoop(Y, 0.72 + 0.05 * Math.sin(t * 2.2), lightOf("stream", c, mir)), B0, { mirror: mir }), head: add(B0, [0, 1.2, 0]) }); }
    case "walkMasjid": { const z = -0.5 - 1.0 * tl, p: V3 = [0.15, 0, z], dawn = 0.55 + 0.35 * u, fog = 0.7 - 0.55 * u;
      const c = cam([0.9, 1.45, z + 3.6], [0, 1.5, z - 8], 42), mir = mirrorFor(c, 0, -1);
      return r({ state: `lake:${q(dawn, 30)}:0.5:${q(fog, 30)}:0`, cam: c, focus: add(p, [0, 1.4, 0]), cInf: 3, trav: put(w, walkC(Y, 1.0 * tl, lightOf(w, c, mir), mir), p, { mirror: mir }), head: add(p, [0, 1.8, 0]) }); }
    case "pray": { const P0 = NAT.prayer, c = mv(cam([3.4, 1.4, P0[2] + 3.4], [P0[0] - 0.3, 0.7, P0[2] - 0.6], 40), cam([2.8, 1.25, P0[2] + 2.8], [P0[0] - 0.3, 0.6, P0[2] - 0.6], 38)), mir = mirrorFor(c, 0, -1);
      const L = lightOf(w, c, mir), pose = (lk: string) => (tl < 1.3 ? ruku(lk, L, mir) : sujood(lk, L, mir));
      return r({ state: "lake:0.95:0.3:0.12:0", cam: c, focus: [P0[0], 0.7, P0[2]], cInf: 3, trav: put(w, pose(T), [P0[0] - 0.45, 0, P0[2]], { mirror: mir }), others: [put(w, pose(Y), [P0[0] + 0.45, 0, P0[2]], { mirror: mir })], head: [P0[0], 1.3, P0[2]] }); }
    case "birds": { const c = mv(cam([6.5, 1.4, 5.5], [-1.5, 2.0, -12], 44), cam([5.5, 1.6, 4.2], [-1.5, 4.2, -12], 46));
      return r({ state: `lake:1:0.2:0.08:${q(clamp01((t - EV.birdsFrom) / 3), 60)}`, cam: c, focus: [0, 2, -12], cInf: 1, trav: null, head: NOHEAD }); }
    case "droneLavender": { const c = mv(cam([-7, 8.5, 12], [0, 1, -36], 46), cam([1.5, 5.5, -10], [3, 0.5, -48], 46));
      return r({ state: "lavender", cam: c, focus: [0, 0.5, -30], cInf: 0, trav: null, head: NOHEAD }); }
    case "droneWheat": { const c = mv(cam([-9, 8, 12], [0, 2, -60], 44), cam([-2, 5, -12], [0, 3, -90], 44));
      return r({ state: "wheat:0.55", cam: c, focus: [0, 1, -40], cInf: 0, trav: null, head: NOHEAD }); }
    case "walkHome": case "craneUp": { const t0 = SHOTS.find((s) => s.kind === "walkHome")!.from / FPS, d = 0.75 * (t - t0), z = -1 - d, x = NAT.wheatPath(z);
      const crane = sh.kind === "craneUp", k = crane ? smooth(u) : 0;
      const c0 = cam([x + 0.9, 1.5, z + 4.6], [x, 1.3, z - 8], 42), c = crane ? cam([x + 0.9 - 0.9 * k, 1.5 + 13 * k, z + 4.6 + 6 * k], [x, 1.3 + 26 * k, z - 8 - 60 * k], 42 + 8 * k) : c0, mir = mirrorFor(c, 0, -1);
      const L = lightOf(w, c, mir), dx = 0.32;
      return r({ state: "wheat:0.6", cam: c, focus: [x, 1.3, z], cInf: crane ? 0 : 3, trav: put(w, walkC(T, d, L, mir), [x - dx, 0, z], { mirror: mir }), others: [put(w, walkC(Y, d + 0.18, L, mir), [x + dx, 0, z + 0.15], { mirror: mir })], head: [x, 1.8, z] }); }
  }
  throw new Error("no shot " + sh.kind);
};
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.25);
  const c = { ...s.cam, pos: add(Wd(s.world, s.cam.pos), hh.pos), look: add(Wd(s.world, s.cam.look), hh.look) };
  return { frame: { set: "nature", state: s.state, t: f / FPS, plan: { cam: c, focus: Wd(s.world, s.focus), cInf: s.cInf, nearScale: 1.5 }, traveller: s.trav, others: s.others }, head: Wd(s.world, s.head), shot: sh };
};
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 1200), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
/** a warm film look; the mood drains when the lantern goes out (never to black); soft at every cut */
export const fxAt = (f: number): FrameFx => {
  const t = f / FPS; let b = 0; for (const c of CUTS) { const d = Math.abs(f - c); if (d < 9) b = Math.max(b, 3.5 * (1 - d / 9)); }
  const lo = SHOTS.find((s) => s.kind === "lakeOut")!, drain = f >= lo.from && f < lo.to ? smooth((t - EV.lanternOut + 0.2) / 1.6) : 0;
  const sat = 1.08 - 0.55 * drain, br = 1.03 - 0.16 * drain;
  return { blurX: b, blurY: b, ca: 0, glitch: 0, flash: 0, vignette: 0.75 + 0.3 * drain, grain: true, css: `saturate(${sat.toFixed(3)}) contrast(1.04) brightness(${br.toFixed(3)}) sepia(0.05)` };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
void lerp; void reachArm;
