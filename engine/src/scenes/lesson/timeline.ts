// Video 007 "The Lesson" (Black & Gold Noir): a young man's talk about what he learned on his sickbed (a TikTok sound,
// added in TikTok; not in our file) over a near-monochrome film whose only colour is gold. The anchor is a dark hospital
// room at night (sets/hospital.ts, state "nm:"); between its shots, the desert of the dunya (sets/lesson.ts) where every
// worldly thing he names appears as a ghost of cold, fake gold and crumbles into sand (life.ts + fx3d.ts); a corridor;
// and at dawn the hospital doors, the walk to the sunrise, the foundation, the crest. Faceless people, men only; the
// camera slow and heavy; never steeper than 45 degrees down on him (the "top-down" over the bed is a high 40-degree angle;
// the true top-down shot is over empty dunes). Timing: videos/007-the-lesson/timing.json; shots: shots.json.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { light2D } from "../../render/card";
import type { Pen } from "../../draw/toon";
import { withLook } from "../../characters/traveller";
import { travellerLying } from "../../characters/travellerPoses";
import { walker, back, LOOKS, type Card } from "../../characters/people";
import { cam, move, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, Frame, TravellerCard, FrameFx, SetId } from "../../story/story";
import { LESSON_AREAS, duneH, peakNear, crestAlong, skylineFrom, HOLLOW_AT } from "../../sets/lesson";
import { gripHand } from "./art";
import TIMING from "../../../../videos/007-the-lesson/timing.json";
import STORY from "../../../../videos/007-the-lesson/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export const EV = STORY.events;
export type PShot = { kind: string; set: SetId; world: string; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, set: s.set as SetId, world: s.world, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const spanOf = (k: string) => SHOTS.find((s) => s.kind === k) ?? { from: -1e9, to: -1e9, kind: k, set: "lesson" as SetId, world: "" };
export const CUTS = SHOTS.slice(1).map((s) => s.from);
export const TRANSITIONS = (EV.transitions as [number, string][]).map(([t, k]) => ({ f: F(t), kind: k }));
/** shots that frame him (the 45-degree rule) */
export const CHARACTER_SHOTS = new Set(["windowPush", "bedStill", "chestOrbit", "rainGlass", "topDown", "chestGold", "roomGold", "aloneDune", "doorsDawn", "footprints", "crestSun"]);

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** local -> world for a set (and an area inside the lesson set) */
export const W = (set: SetId, world: string, p: V3): V3 => add(add(p, SET_OFFSET[set]), set === "lesson" ? LESSON_AREAS[world] : [0, 0, 0]);
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const LIGHT: Record<string, V3> = { room: [-0.8, 0.6, -0.6], dunes: [-0.45, 0.45, -0.9], dawn: [0.05, 0.25, -1], exterior: [0.3, 0.3, 1], corridor: [0, 1, 0] };
const lightOf = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...LIGHT[k]).normalize(), camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
type PutO = { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null };
const STRIDE = 0.36;
const walkC = (dist: number, L: number, mirror: boolean) => walker("traveller", { phase: q(0.25 + dist / (2 * STRIDE), 240), k: 1, stride: Math.round(STRIDE / 0.00216), light: L, shawlNear: mirror, swing: 0.45 });

// ---------------- where things are (local to their area) ----------------
export const BED_LYING: V3 = [0, 0.72, -1.22];
/** his chest (where the real gold light lives) and his hand on the sheet */
export const CHEST: V3 = [0.03, 0.93, -1.62];
export const GRIP: V3 = [0.3, 0.73, -0.72];
export const IV_DRIP: V3 = [-0.7, 1.42, -1.93];
/** the rainy pane the camera looks (and pushes) through: beside the bed at x = FRONT_GLASS_X, facing it */
export const FRONT_GLASS_X = 2.05;
export const CAR_AT: V3 = [0, 0, -8];
export const HOUSE_AT: V3 = [14, 0, -27];
export const PALACE_AT: V3 = [-6, 0, -74];
/** the row of worldly things (left to right): [kind, x, scale] at z = ROW_Z */
export const ROW_Z = -30;
export const ROW: [string, number, number][] = [["palace", -27, 0.34], ["car", -15.5, 1], ["servant", -10, 1], ["servant", -8.4, 1], ["servant", -6.8, 1], ["servant", -5.2, 1], ["car", 1.5, 1], ["palace", 13.5, 0.34]];
export const rowCrumbleAt = (i: number) => EV.rowCrumble + EV.rowGap * i;
/** the crest the wind lifts sand off, seen on the skyline from the pan */
export const CREST_EYE: V3 = [-24, 1.4, -38];
export const CREST = skylineFrom(CREST_EYE[0], CREST_EYE[1], CREST_EYE[2]);
/** the lone figure on the skyline as seen from the pan; the crest he stands on at sunrise */
export const LONE_EYE: V3 = [6, 1.3, -36];
export const LONE = skylineFrom(LONE_EYE[0], LONE_EYE[1], LONE_EYE[2]);
export const SUN_CREST = crestAlong(4, -60);
export const FOUNDATION: V3 = [0, 0, -36];
/** the walk to the sunrise: he starts at the pan's near side and walks toward -z */
export const WALK0 = 1.6;
export const walkZ = (t: number) => WALK0 - 0.72 * Math.max(0, t - STORY.shots.find((s) => s.kind === "footprints")!.at + 1.8);
export const HOLLOW: V3 = HOLLOW_AT;

type Shot = { state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3 };
const NOHEAD: V3 = [0, -1000, 0];
/** the monitor's beat: a phase that advances with the heart rate (bpm), slower on the deathbed lines */
const bpmAt = (t: number) => t < 36.6 ? 72 : t < 42.4 ? lerp(72, 48, clamp01((t - 36.6) / 5.8)) : t < 54.9 ? 50 : 58;
const BEATS: number[] = [0]; for (let f = 1; f <= 2400; f++) BEATS.push(BEATS[f - 1] + bpmAt(f / 30) / 60 / 30);
/** the heartbeat times (s) on the monitor (for the beeps in the mix) */
export const beatTimes = () => { const out: number[] = []; for (let f = 1; f < BEATS.length; f++) if (Math.floor(BEATS[f]) > Math.floor(BEATS[f - 1])) out.push(f / 30); return out; };
export const phaseAt = (f: number) => BEATS[Math.max(0, Math.min(BEATS.length - 1, f))];

export const shotAt0 = (f: number): Shot & { set: SetId; world: string } => {
  const sh = shotOf(f), t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), tl = (f - a) / FPS, mv = (c0: Cam, c1: Cam) => move(c0, c1, a, b)(f);
  const r = (s: Shot) => ({ ...s, set: sh.set, world: sh.world });
  const put = (c: Card, p: V3, o: PutO = {}): TravellerCard => ({ pos: W(sh.set, sh.world, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob });
  const mon = (amp = 1) => `nm:${q(phaseAt(f) % 1, 120)}:${q(amp, 20)}`;
  const lying = (c: Cam, st = 0) => { const L = lightOf("room", c, true), s2 = q(st, 10); return put({ key: `lie7|${s2}|${L}`, draw: (p) => withLook(LOOKS.gown, () => travellerLying(p, { light: L, stir: s2 })) }, BED_LYING, { wide: true, blob: null, yaw: Math.PI / 2, mirror: true, scale: 0.8 }); };
  const HEAD_LIE: V3 = [0, 0.95, -2.05];
  switch (sh.kind) {
    // ======================= the hospital room (the anchor) =======================
    case "windowPush": { const c = mv(cam([2.62, 1.52, -0.9], [0, 0.92, -1.5], 40), cam([1.4, 1.32, -1.15], [0, 0.88, -1.55], 40));
      return r({ state: mon(), cam: c, focus: c.pos[0] > FRONT_GLASS_X + 0.2 ? [FRONT_GLASS_X, 1.4, c.pos[2]] : [0, 0.9, -1.6], cInf: 5, trav: lying(c), head: HEAD_LIE }); }
    case "bedStill": { const c = mv(cam([2.45, 1.45, -0.55], [-0.1, 0.88, -1.6], 44), cam([2.15, 1.36, -0.85], [-0.1, 0.88, -1.62], 42));
      return r({ state: mon(), cam: c, focus: [0, 0.9, -1.6], cInf: 5, trav: lying(c), head: HEAD_LIE }); }
    case "chestOrbit": { const ang = (lerp(64, 108, smooth(u * 0.85 + 0.15 * u)) * Math.PI) / 180, R0 = 2.0;
      const c = cam([CHEST[0] + R0 * Math.sin(ang), 1.38 - 0.06 * u, CHEST[2] + R0 * Math.cos(ang)], [CHEST[0], CHEST[1] - 0.02, CHEST[2]], 36);
      return r({ state: mon(), cam: c, focus: CHEST, cInf: 7, trav: lying(c), head: HEAD_LIE }); }
    case "ivDrip": { const c = mv(cam([-0.3, 1.36, -1.5], [IV_DRIP[0], IV_DRIP[1] + 0.01, IV_DRIP[2]], 32), cam([-0.38, 1.37, -1.58], [IV_DRIP[0], IV_DRIP[1], IV_DRIP[2]], 28));
      return r({ state: mon(), cam: c, focus: IV_DRIP, cInf: 9, trav: null, head: NOHEAD }); }
    case "rainGlass": { const c = mv(cam([2.5, 1.5, -0.3], [0, 0.92, -1.45], 38), cam([2.45, 1.45, -2.0], [0, 0.92, -1.5], 38));
      return r({ state: mon(), cam: c, focus: [FRONT_GLASS_X, 1.4, c.pos[2]], cInf: 9, trav: lying(c), head: HEAD_LIE }); }
    case "topDown": { const c = mv(cam([1.78, 2.55, -1.15], [0, 0.78, -1.45], 44), cam([2.15, 2.7, -0.95], [0, 0.78, -1.45], 46));
      return r({ state: mon(0.8), cam: c, focus: [0, 0.85, -1.4], cInf: 3, trav: lying(c), head: HEAD_LIE }); }
    case "fingersSheet": { const c = mv(cam([0.92, 1.0, -0.32], [GRIP[0], GRIP[1] + 0.09, GRIP[2]], 32), cam([0.8, 0.97, -0.42], [GRIP[0], GRIP[1] + 0.08, GRIP[2]], 28)), L = lightOf("room", c);
      const k = smooth((t - 50.3) / 1.6) * 0.85 + 0.15 * smooth((t - EV.lightning[0]) / 0.3);
      return r({ state: mon(0.7), cam: c, focus: [GRIP[0], GRIP[1] + 0.08, GRIP[2]], cInf: 9, trav: null, others: [put(gripHand(k, L), GRIP, { scale: 0.3, blob: null })], head: NOHEAD }); }
    case "monitorLine": { const c = mv(cam([0.15, 1.38, -0.55], [0.95, 1.45, -2.1], 34), cam([0.42, 1.42, -1.0], [0.95, 1.45, -2.1], 30));
      return r({ state: mon(0.6), cam: c, focus: [0.95, 1.45, -2.08], cInf: 7, trav: lying(c), head: NOHEAD }); }
    case "chestGold": { const c = mv(cam([1.05, 1.26, -1.3], [CHEST[0], CHEST[1], CHEST[2]], 34), cam([0.82, 1.2, -1.45], [CHEST[0], CHEST[1], CHEST[2]], 30));
      return r({ state: mon(0.9), cam: c, focus: CHEST, cInf: 7, trav: lying(c), head: HEAD_LIE }); }
    case "roomGold": { const c = mv(cam([1.85, 1.95, 1.55], [-0.15, 0.85, -1.5], 44), cam([1.55, 1.82, 1.05], [-0.15, 0.85, -1.55], 42));
      return r({ state: mon(1), cam: c, focus: [0, 0.9, -1.5], cInf: 4, trav: lying(c), head: HEAD_LIE }); }
    // ======================= the corridor =======================
    case "corridor": { const c = mv(cam([0.15, 1.62, 1.6], [0, 1.45, -30], 44), cam([0.1, 1.58, -1.4], [0, 1.4, -30], 42));
      return r({ state: "corridor:0", cam: c, focus: [0, 1.4, -18], cInf: 2, trav: null, head: NOHEAD }); }
    // ======================= the dunes at night =======================
    case "duneCrest": { const C = CREST, E = CREST_EYE, c = mv(cam([E[0] + 2, E[1], E[2] + 6], [C[0], C[1] + 2.5, C[2]], 34), cam([E[0], E[1] + 0.1, E[2]], [C[0], C[1] + 2.2, C[2]], 26));
      return r({ state: `dunes:0:0:${q(C[0], 1)}:${q(C[2], 1)}`, cam: c, focus: [C[0], C[1], C[2]], cInf: 2, trav: null, head: NOHEAD }); }
    case "carCrumble": { const P = CAR_AT, c = mv(cam([P[0] + 6.2, 1.05, P[2] + 4.4], [P[0] + 0.4, 0.75, P[2]], 40), cam([P[0] + 5.2, 0.95, P[2] + 3.4], [P[0] + 0.2, 0.7, P[2]], 38));
      return r({ state: `dunes:0:0:${P[0]}:${P[2]}`, cam: c, focus: add(P, [0.8, 0.6, 0]), cInf: 3, trav: null, head: NOHEAD }); }
    case "houseRise": { const P = HOUSE_AT, c = mv(cam([P[0] - 15, 1.5, P[2] + 27], [P[0], 3.4, P[2]], 42), cam([P[0] - 13, 1.7, P[2] + 23.5], [P[0], 3.2, P[2]], 42));
      return r({ state: `dunes:0:0:${P[0]}:${P[2]}`, cam: c, focus: add(P, [0, 3, 0]), cInf: 2, trav: null, head: NOHEAD }); }
    case "palace": { const P = PALACE_AT, k = smooth(u), st = clamp01((t - EV.palaceCollapse - 0.6) / 1.4);
      const c = cam([P[0] + 10 - 4 * k, 1.6 + 26 * k, P[2] + 42 - 6 * k], [P[0], 9 + 24 * k - 8 * st, P[2]], 46);
      return r({ state: `dunes:0:${q(st * 0.85, 20)}:${P[0]}:${P[2]}`, cam: c, focus: add(P, [0, 15, 0]), cInf: 1, trav: null, head: NOHEAD }); }
    case "ghostRow": { const c = mv(cam([-24, 2.1, ROW_Z + 16], [-14, 2.6, ROW_Z], 44), cam([-1, 2.3, ROW_Z + 17], [3, 2.8, ROW_Z], 44));
      return r({ state: "dunes:0:0:-6:-30", cam: c, focus: [c.look[0], 1.5, ROW_Z], cInf: 2, trav: null, head: NOHEAD }); }
    case "crumbleRow": { const c = mv(cam([-6.5, 3.2, ROW_Z + 27], [-6.5, 3.4, ROW_Z], 50), cam([-6.5, 3.6, ROW_Z + 24], [-6.5, 3.4, ROW_Z], 50));
      return r({ state: `dunes:0:${q(0.25 * u, 20)}:-6:-30`, cam: c, focus: [-6.5, 2, ROW_Z], cInf: 1, trav: null, head: NOHEAD }); }
    case "windAway": { const X0 = 30 + 6 * u, Z0 = -150, y = 70 - 14 * smooth(u), c = cam([X0, y, Z0 + 3.5], [X0, 0, Z0], 50);   // straight down over the dune ridges
      c.roll = 0.35 * u - 0.2;
      return r({ state: `dunes:0:0.25:${X0}:${Z0}`, cam: c, focus: [X0, 8, Z0], cInf: 0, trav: null, head: NOHEAD }); }
    case "aloneDune": { const P = LONE, E = LONE_EYE, c = mv(cam([E[0] - 1, E[1] + 0.1, E[2] + 3], [P[0], P[1] + 0.9, P[2]], 11), cam([E[0], E[1], E[2]], [P[0], P[1] + 0.7, P[2]], 8.5));
      const mir = mirrorFor(c, 0, -1);
      return r({ state: `dunes:0:0:${q(P[0], 1)}:${q(P[2], 1)}`, cam: c, focus: P, cInf: 1, trav: put(back("traveller", lightOf("dunes", c, mir)), [P[0], P[1] - 0.05, P[2]], { blob: null }), head: add(P, [0, 1.8, 0]) }); }
    case "lowHollow": { const H = HOLLOW, sink = smooth(u), cp: V3 = [H[0] + 6.5 - 2.2 * sink, 0, H[2] - 6.5 + 2.2 * sink];
      const c = cam([cp[0], duneH(cp[0], cp[2]) + 1.5 - 1.2 * sink, cp[2]], [H[0], H[1] + 0.3 - 0.1 * sink, H[2]], 42 - 6 * sink);
      return r({ state: `dunes:0:0:${q(H[0], 1)}:${q(H[2], 1)}`, cam: c, focus: H, cInf: 6, trav: null, head: NOHEAD }); }
    // ======================= dawn =======================
    case "doorsDawn": { const z = lerp(-10.4, -5.6, clamp01((t - EV.doorsOpen - 0.15) / (b / FPS - EV.doorsOpen - 0.15))), p: V3 = [0.25, 0, z];
      const c = mv(cam([3.4, 1.45, -1.9], [0.1, 1.35, -8.6], 40), cam([3.1, 1.4, -2.6], [0.1, 1.35, -7.8], 40)), mir = mirrorFor(c, 0, 1);
      return r({ state: `exterior:${q(smooth((t - EV.doorsOpen) / 0.7), 30)}`, cam: c, focus: add(p, [0, 1.3, 0]), cInf: 4, trav: put(walkC(Math.abs(z + 10.4), lightOf("exterior", c, mir), mir), p, { mirror: mir }), head: add(p, [0, 1.8, 0]) }); }
    case "footprints": { const z = walkZ(t), p: V3 = [0.2, 0, z];
      const c = cam([3.3, 1.0, z + 3.6], [-0.4, 0.85, z - 1.6], 42), mir = mirrorFor(c, 0, -1);
      return r({ state: `dunes:1:0:0:${q(z - 4, 1)}`, cam: c, focus: add(p, [0, 1.0, 0]), cInf: 4, trav: put(walkC(Math.abs(z - WALK0), lightOf("dawn", c, mir), mir), p, { mirror: mir }), head: add(p, [0, 1.8, 0]) }); }
    case "foundation": { const P = FOUNDATION, ang = lerp(0.65, 0.25, smooth(u)), R0 = 6.8;
      const c = cam([P[0] + R0 * Math.sin(ang), 1.5 - 0.3 * u, P[2] + R0 * Math.cos(ang)], [P[0], 0.25, P[2]], 40);
      return r({ state: `dunes:1:0:${P[0]}:${P[2]}`, cam: c, focus: add(P, [0, 0.3, 0]), cInf: 4, trav: null, head: NOHEAD }); }
    case "crestSun": { const P = SUN_CREST, k = smooth(clamp01((t - 65.9) / 4.2)), tail = clamp01((f - CARD_FROM) / (FRAMES - CARD_FROM));
      const cx = P[0], cz = P[2] + 5.2, cy = Math.max(duneH(cx, cz) + 1.2, P[1] + 0.4);
      const c = cam([cx + 0.6 * k, cy + 16 * k, cz + 7 * k], [P[0] - 0.4, P[1] + 1.5 + 22 * k, P[2] - 30 - 40 * k], 42 + 6 * k);
      void tail;
      return r({ state: `dunes:1:0:${q(P[0], 1)}:${q(P[2], 1)}`, cam: c, focus: add(P, [0, 1.5, 0]), cInf: 2, trav: put(back("traveller", lightOf("dawn", c)), [P[0], P[1] - 0.04, P[2]], { blob: null }), head: add(P, [0, 1.8, 0]) }); }
  }
  throw new Error("no shot " + sh.kind);
};
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.35);
  const c = { ...s.cam, pos: add(W(s.set, s.world, s.cam.pos), hh.pos), look: add(W(s.set, s.world, s.cam.look), hh.look) };
  return { frame: { set: s.set, state: s.state, t: f / FPS, plan: { cam: c, focus: W(s.set, s.world, s.focus), cInf: s.cInf, nearScale: 1.6 }, traveller: s.trav, others: s.others }, head: W(s.set, s.world, s.head), shot: sh };
};
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 1200), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
/** the noir grade: grey everything but gold, deep blacks, heavy grain, gentle lens breathing; a soft blur at the
 *  transitions (the rain dissolve blurs more) */
export const fxAt = (f: number): FrameFx => {
  const t = f / FPS; let b = 0;
  for (const tr of TRANSITIONS) { const d = Math.abs(f - tr.f), w = tr.kind === "rain" ? 14 : 8; if (d < w) b = Math.max(b, (tr.kind === "rain" ? 6 : 2.5) * (1 - d / w)); }
  const breathe = 1.012 + 0.006 * Math.sin(t * 0.55) + 0.003 * Math.sin(t * 1.3 + 1);
  return { blurX: b, blurY: b, ca: 0.6, glitch: 0, flash: 0, vignette: 1.0, grain: true, zoom: { scale: breathe, x: 540, y: 960, blur: 0 },
    mono: 1, goldKeep: 1, crush: 0.55, css: "contrast(1.08) brightness(1.02)" };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
void lerp; void FRAMES;
