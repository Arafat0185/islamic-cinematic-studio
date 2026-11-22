// Video 001 draft 3: what every frame shows, from draft3/plan.json (tools/plan_video001_d3.py), which also drives the
// sound. 0-5 s recitation slot (courtyard, lamp, slow push-in; no text). The day (bedroom -> street -> office ->
// street -> gym -> bedroom), the silence and the hook, the flashbacks, then the courtyard with a camera change every
// 2-3 s on the words. Picture effects (motion blur, chromatic aberration, glitch, zoom-throughs, flash, vignette,
// grain) are computed here too (fxAt).
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, easeOut, glide, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { endingAt } from "../../brand/sequences";
import { whipAt } from "../../brand/transitions";
import type { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import {
  travellerWalkPhase, travellerChair, travellerBedPhoneWide, travellerLying, travellerThreeQuarterFront,
} from "../../characters/travellerPoses";
import { BEDROOM } from "../../sets/bedroom";
import { STREET, Vehicle } from "../../sets/street";
import { OFFICE } from "../../sets/office";
import { GYM } from "../../sets/gym";
import { MOON_FROM, MAIN } from "../courtyard-beauty/world";
import { cam, move, orbit, chest, lerp3, settle, ramp, yawed, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, SetId, Frame, Plan, TravellerCard, FrameFx } from "../../story/story";
import PLAN from "../../../../videos/001-the-first-question/draft3/plan.json";

export const FPS = PLAN.fps;
export const FRAMES = PLAN.frames;
const { mends: MENDS, fb: FB, ...ANCH } = PLAN.anchors;
export const A = ANCH as Record<string, number>;
export { MENDS, FB };
export const F = (s: number) => Math.round(s * FPS);
export const INTRO = PLAN.intro;
const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const inSet = (id: SetId, c: Cam): Cam => ({ ...c, pos: add(c.pos, SET_OFFSET[id]), look: add(c.look, SET_OFFSET[id]) });
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
export type Word = { section: number; word: string; start: number; end: number; block: string };
export const WORDS = PLAN.words as Word[];

// ---------------- speed ramps: story time from real time (slow first, then fast; endpoints fixed) ----------------
const R = (t: number) => { for (const [a, b, p] of PLAN.ramps as [number, number, number][]) if (t >= a && t <= b) return a + (b - a) * Math.pow((t - a) / (b - a), p); return t; };

// ---------------- light direction for the drawings' painted shading ----------------
const SUN: Record<string, V3> = {
  dawn: [0.6, 1.2, 1.4], dawnAlarm: [0.6, 1.2, 1.4], morning: [0.8, 1.3, 1.2], night: [0.6, 1.2, 1.4], nightOff: [0.6, 1.2, 1.4],
  street_morning: [-0.55, 1.2, 0.9], street_afternoon: [1.0, 0.75, 0.7], noon: [0.5, 1.4, 1.1], sunset: [-0.6, 0.55, 1.0], courtyard: MOON_FROM,
};
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightFor = (k: string, c: Cam, mirror = false) => light2D(new THREE.Vector3(...SUN[k]).normalize(), camRight(c), mirror);
const plan = (c: Cam, focus: V3, cInf = 5, nearScale = 1.6): Plan => ({ cam: c, focus, cInf, nearScale });

// ---------------- the street and its traffic (timed to the sound) ----------------
const MORNING = { x0: -4, t0: A.cutStreet - 0.28, speed: 1.9, stride: 0.6 };
const AFTERNOON = { x0: 18, t0: A.cutAsr, speed: 1.1, stride: 0.42 };
const streetX = (o: typeof MORNING, t: number) => o.x0 + o.speed * (t - o.t0);
export const TRAFFIC: Vehicle[] = [
  { kind: "car", passAt: A.car1, passX: streetX(MORNING, A.car1) + 0.9, speed: -12, lane: STREET.LANE_NEAR },
  { kind: "bus", passAt: A.bus, passX: streetX(MORNING, A.bus) + 0.9, speed: 8.5, lane: STREET.LANE_FAR, colour: "#c79c48" },
  { kind: "car", passAt: A.horn + 0.25, passX: streetX(MORNING, A.horn) - 6, speed: 10, lane: STREET.LANE_FAR, colour: "#2f5d8a" },
];

// ---------------- the day (story time s) ----------------
type Shot = { set: SetId; state: string; plan: Plan; trav: TravellerCard | null; head: V3; streetX?: number; banner?: string | null; screen?: V3 };
const PHONE = (t: number, a: number, b: number) => smooth((t - a) / 0.15) * (1 - smooth((t - b) / 0.15));

const dayAt = (s: number): Shot => {
  // ---- bedroom: lying (dawn), the alarm, sitting up on the edge, the leap ----
  if (s < A.cutStreet) {
    // the phone lights up from the first frame (the Fajr reminder), so the match cut lands on its glow
    const state = s < A.timeJump + 0.25 ? "dawnAlarm" : "morning";
    let c: Cam;
    if (s < A.fajrTone + 0.35) // match cut: the phone's glow where the lamp's glow was (almost still), then a cut to the bed
      c = inSet("bedroom", move(cam([-1.85, 1.0, -0.95], [-2.17, 0.6, -1.71], 36), cam([-1.82, 1.0, -0.98], [-2.17, 0.6, -1.71], 35), F(INTRO), F(A.fajrTone + 0.35))(F(s)));
    else if (s < A.timeJump) c = inSet("bedroom", move(cam([-0.55, 1.55, 1.7], [-1.0, 0.85, -1.3], 44), cam([-0.75, 1.45, 1.35], [-1.05, 0.82, -1.3], 44), F(A.fajrTone + 0.35), F(A.timeJump))(F(s)));
    else if (s < A.sitUp) c = inSet("bedroom", move(cam([0.9, 1.3, 1.6], [-0.6, 0.85, -1.3], 42), cam([0.8, 1.25, 1.3], [-0.6, 0.85, -1.3], 42), F(A.timeJump), F(A.sitUp))(F(s)));
    else c = inSet("bedroom", move(cam([1.7, 1.45, 2.6], [-0.2, 1.1, -0.6], 46), cam([2.05, 1.45, 2.4], [0.6, 1.2, -0.5], 46), F(A.sitUp), F(A.cutStreet))(F(s)));
    const light = lightFor(state, c);
    let trav: TravellerCard, head: V3;
    if (s < A.sitUp) {
      const stir = s > A.label1min && s < A.label1min + 0.6 ? Math.sin(((s - A.label1min) / 0.6) * Math.PI) : s > A.alarmLoud ? 0.6 + 0.4 * Math.sin(s * 40) : 0;
      const sq = q(stir, 10);
      trav = { pos: W("bedroom", BEDROOM.LYING), key: `lie|${sq}|${light}`, draw: (p: Pen) => travellerLying(p, { light, stir: sq }), wide: true, blob: null };
      head = W("bedroom", [BEDROOM.LYING[0] - 0.86, 0.85, BEDROOM.LYING[2]]);
    } else if (s < A.jumpOut) {                                                       // sitting on the edge, then up
      trav = { pos: W("bedroom", BEDROOM.EDGE), key: `edge|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "rest", tilt: -0.3 }), blob: null, yaw: 0 }; // parallel to the bed's edge
      head = W("bedroom", [BEDROOM.EDGE[0], 1.25, BEDROOM.EDGE[2]]);
    } else {                                                                          // the leap and the rush out
      const u = easeOut(clamp01((s - A.jumpOut) / (A.land - A.jumpOut)));
      const p0 = W("bedroom", BEDROOM.EDGE), p1 = W("bedroom", BEDROOM.STAND);
      const d = Math.max(0, s - A.land) * 1.7;
      const pos: V3 = [p0[0] + (p1[0] - p0[0]) * u + d, 0.013 + 0.22 * Math.sin(Math.PI * u), p0[2] + (p1[2] - p0[2]) * u];
      const ph = q(0.25 + 0.4 * u + d / 1.2, 60), k = s < A.land ? 0.9 : smooth((s - A.land) / 0.12);
      trav = { pos, key: `leap|${ph}|${q(k, 10)}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, k, 0.6 / SU, { light, swing: 1.9, bob: s > A.land ? -12 * (1 - smooth((s - A.land) / 0.12)) : 0 }), roll: -0.07 };
      head = add(pos, [0, 1.8, 0]);
    }
    const focus = s < A.fajrTone + 0.35 ? W("bedroom", BEDROOM.PHONE) : add(head, [0, -0.25, 0]);
    return { set: "bedroom", state, plan: plan(c, focus, s < A.fajrTone + 0.35 ? 2.5 : 7), trav, head };
  }
  // ---- street, morning: rushing ----
  if (s < A.cutOffice) {
    const x = streetX(MORNING, s), ph = q(0.25 + (x - MORNING.x0) / (2 * MORNING.stride), 240);
    const c = inSet("street", cam([x + 0.2, 1.6, 7.6], [x + 0.45, 2.3, 0.9], 48));
    const light = lightFor("street_morning", c), phone = q(PHONE(s, A.phoneCheck, A.phoneCheck + 0.6), 10);
    const pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
    return { set: "street", state: "morning", streetX: x, plan: plan(c, add(pos, [0, 1.3, 0]), 4),
      trav: { pos, key: `rush|${ph}|${phone}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 1, MORNING.stride / SU, { light, swing: 1.8 * (1 - phone), phone }), roll: -0.05 }, head: add(pos, [0, 1.8, 0]) };
  }
  // ---- office, Dhuhr ----
  if (s < A.cutAsr) {
    let c: Cam;
    if (s < A.cutOffice + 2.7) c = inSet("office", move(cam([0.9, 1.45, 2.9], [0.35, 1.2, -0.8], 42), cam([0.75, 1.42, 2.5], [0.35, 1.2, -0.8], 42), F(A.cutOffice), F(A.cutOffice + 2.7))(F(s)));
    else if (s < A.cutOffice + 4.35) c = inSet("office", move(cam([2.2, 1.45, 2.2], [0.4, 1.18, -0.8], 42), cam([2.4, 1.5, 1.7], [0.45, 1.18, -0.8], 42), F(A.cutOffice + 2.7), F(A.cutOffice + 4.35))(F(s)));
    else c = inSet("office", move(cam([1.25, 1.35, 1.3], [0.85, 1.08, -0.8], 38), cam([1.05, 1.25, 0.8], [0.88, 1.05, -0.82], 38), F(A.cutOffice + 4.35), F(A.cutAsr))(F(s)));
    const light = lightFor("noon", c), waving = s > A.wave && s < A.wave + 1.0;
    const tilt = waving ? 0.1 : s > A.dhuhrTone + 0.1 && s < A.wave ? 0.35 : -0.15 + 0.05 * Math.sin(s * 9);
    const wave = q(((s - A.wave) * 2.6) % 1, 24), tq = q(tilt, 20), pos = W("office", OFFICE.CHAIR);
    return { set: "office", state: "noon", banner: s > A.laptopPing ? "+3 meetings" : null, plan: plan(c, add(pos, [0.25, 1.05, 0]), 4), screen: W("office", [0.86, 0.95, -0.74]),
      trav: { pos, key: `chair|${waving ? "w" + wave : "t"}|${tq}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: waving ? "wave" : "type", wave, tilt: tq, chair: true }), blob: null },
      head: add(pos, [0.05, 1.25, 0]) };
  }
  // ---- street, Asr: on his phone ----
  if (s < A.cutGym) {
    const x = streetX(AFTERNOON, s), ph = q(0.25 + (x - AFTERNOON.x0) / (2 * AFTERNOON.stride), 240);
    const c = inSet("street", cam([x - 0.7 + 0.1 * (s - A.cutAsr), 1.65, 5.0], [x + 0.2, 2.0, 0.9], 44));
    const light = lightFor("street_afternoon", c), phone = q(1 - 0.85 * PHONE(s, A.asrTone + 0.1, A.asrTone + 0.55), 10);
    const pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
    // his phone (the zoom-through into the gym flies into its screen): in his near hand, in front of his chest
    return { set: "street", state: "afternoon", streetX: x, plan: plan(c, add(pos, [0, 1.55, 0]), 3), screen: add(pos, [0.2, 1.3, 0.05]),
      trav: { pos, key: `asr|${ph}|${phone}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 0.7, AFTERNOON.stride / SU, { light, phone }) }, head: add(pos, [0, 1.8, 0]) };
  }
  // ---- gym, Maghrib ----
  if (s < A.cutNight) {
    const stride = 0.65, ph = q(0.25 + (GYM.BELT_SPEED * (s - A.cutGym)) / (2 * stride), 240);
    const c = s < A.cutGym + 1.2
      ? inSet("gym", move(cam([0.6, 1.55, 2.6], [-0.1, 1.75, -0.9], 46), cam([0.85, 1.55, 2.25], [-0.05, 1.75, -0.9], 46), F(A.cutGym), F(A.cutGym + 1.2))(F(s)))
      : inSet("gym", move(cam([1.4, 0.75, 2.7], [-0.2, 1.55, -0.9], 46), cam([1.5, 0.78, 2.35], [-0.15, 1.6, -0.9], 46), F(A.cutGym + 1.2), F(A.cutNight))(F(s)));
    const light = lightFor("sunset", c), pos = W("gym", GYM.RUN);
    return { set: "gym", state: "sunset", plan: plan(c, add(pos, [0, 1.2, 0]), 4),
      trav: { pos, key: `run|${ph}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 1, stride / SU, { light, swing: 1.9 }), roll: -0.06, blob: null }, head: add(pos, [0, 1.8, 0]) };
  }
  // ---- bedroom, night: scrolling, the phone goes dark, the silence, the hook ----
  const off = s >= A.phoneOff, state = off ? "nightOff" : "night";
  const c = s < A.phoneOff
    ? inSet("bedroom", move(cam([0.9, 1.6, 1.6], [-1.1, 1.05, -1.3], 40), cam([0.6, 1.5, 1.25], [-1.1, 1.02, -1.3], 40), F(A.cutNight), F(A.phoneOff))(F(s)))
    : inSet("bedroom", move(cam([0.6, 1.5, 1.25], [-1.1, 1.02, -1.3], 40), cam([1.2, 1.95, 2.9], [-0.9, 1.0, -1.3], 46), F(A.phoneOff), F(FB[0]))(F(s)));
  const light = lightFor(state, c), scroll = off ? 0 : q(((s - A.cutNight) * 1.4) % 1, 12);
  const pos = W("bedroom", BEDROOM.SIT);
  return { set: "bedroom", state, plan: plan(c, add(pos, [-0.4, 0.55, 0]), 7),
    trav: { pos, key: `bed|${scroll}|${off}|${light}`, draw: (p: Pen) => travellerBedPhoneWide(p, { light, scroll, dark: off }), wide: true, blob: null },
    head: W("bedroom", [BEDROOM.SIT[0] - 0.37, 1.35, BEDROOM.SIT[2]]) };
};

/** the flashbacks replay moments of the day (story times) */
const FLASH_SRC = [INTRO + 4.0, A.wave - 0.15, INTRO + 16.3, A.laptopPing, A.asrTone + 0.8, A.phoneCheck - 0.2];
const flashTime = (t: number) => { for (let i = FB.length - 1; i >= 0; i--) if (t >= FB[i]) return FLASH_SRC[i] + (t - FB[i]); return t; };

// ---------------- the courtyard ----------------
const P1: V3 = [0.15, 0, -0.6], P2: V3 = [1.3, 0, -1.55], MARK: V3 = [0.75, 0, -0.7], HEAD1: V3 = [P1[0], 1.72, P1[2]];
const LAMP: V3 = [MAIN, 2.45, -3.5];
/** where cameras aim when they look at the lamp: just in front of it (a camera check from inside the lamp would hit its own glass) */
const LAMP_AIM: V3 = [MAIN, 2.4, -2.95];
const WALK = { from: F(A.walk), to: F(A.walkEnd), steps: 4 };
const STRIDE_M = (P2[0] - P1[0]) / WALK.steps;
const walkProgress = (f: number) => {
  const T = WALK.to - WALK.from, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - WALK.from));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
type CShot = { from: number; to: number; kind: string };
const CSHOTS: CShot[] = (PLAN.shots as { from: number; kinds: string[]; cuts: number[] }[]).flatMap((g, gi, all) => {
  const ends = [...g.cuts, gi + 1 < all.length ? all[gi + 1].from : A.ending];
  // a group that begins with the star iris starts at the iris (its incoming shot shows while the star opens)
  const start = Math.abs(g.from - A.iris) < 1e-6 ? g.from - 7 / FPS : g.from;
  return g.kinds.map((k, i) => ({ from: F(i === 0 ? start : g.cuts[i - 1]), to: F(ends[i]), kind: k }));
});
const cshotAt = (f: number) => { let s = CSHOTS[0]; for (const x of CSHOTS) if (f >= x.from) s = x; return s; };
type CB = { cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number; nearScale?: number };
const shotCam = (sh: CShot): CB => {
  const a = sh.from, b = sh.to;
  switch (sh.kind) {
    case "orbitHead": return { cInf: 9, cam: orbit(HEAD1, 2.6, 1.55, -52, -30, a, b, 32, 0.55), focus: () => HEAD1 }; // his head low in frame: room above it for the line
    case "archLow": return { cInf: 6, cam: move(cam([-1.75, 0.6, 0.55], [0.25, 2.1, -2.6], 44), cam([-1.45, 0.62, 0.35], [0.3, 2.2, -2.6], 44), a, b), focus: () => chest(P1) }; // clear of the pool
    case "lampClose": return { cInf: 10, nearScale: 1.2, cam: move(cam([1.15, 2.05, -1.4], LAMP_AIM, 32), cam([1.4, 2.15, -1.75], LAMP_AIM, 30), a, b), focus: () => LAMP };
    case "matDrift": return { cInf: 8, cam: move(cam([1.6, 2.15, 0.95], [1.25, 1.1, -1.9], 42), cam([1.5, 1.25, 0.5], [0.9, 0.08, -1.6], 42), a, b), focus: (f) => lerp3([1.4, 1.3, -2.2], [0.95, 0.1, -1.55], ramp(f, a, b)) };
    case "chestHand": return { cInf: 8, cam: move(cam([0.65, 1.4, 2.9], [0.15, 2.2, -0.6], 36), cam([0.55, 1.42, 2.55], [0.15, 2.22, -0.6], 36), a, b), focus: () => chest(P1) };
    case "poolLow": return { cInf: 5, nearScale: 1.2, cam: move(cam([-0.9, 0.9, 3.0], [0.3, 1.25, -0.8], 52), cam([-0.7, 0.92, 2.8], [0.3, 1.3, -0.8], 52), a, b), focus: () => chest(P1) };
    case "craneWide": return { cInf: 4, cam: move(cam([-0.6, 1.9, 4.3], [0.3, 1.0, -1.0], 50), cam([-0.45, 4.6, 6.6], [0.4, 0.3, -1.3], 50), a, b), focus: () => chest(P1) };
    case "lampFlicker": return { cInf: 6, cam: move(cam([2.6, 1.6, 1.4], [1.2, 1.8, -2.4], 44), cam([2.4, 1.65, 1.0], [1.1, 1.85, -2.4], 44), a, b), focus: () => LAMP };
    case "pushIn": return { cInf: 6, cam: move(cam([0.25, 1.5, 3.6], [0.15, 2.0, -0.6], 42), cam([0.2, 1.5, 2.7], [0.15, 2.1, -0.6], 40), a, b), focus: () => chest(P1) };
    case "craneThrough": return { cInf: 5, cam: (f) => { const u = glide((f - a) / (b - a)), az = ((20 + 40 * u) * Math.PI) / 180; return cam([P1[0] + 3.0 * Math.sin(az), 0.9 + 2.7 * u, P1[2] + 3.0 * Math.cos(az)], [P1[0], 1.3 + 0.2 * u, P1[2]], 46); }, focus: () => chest(P1) };
    case "highFloor": return { cInf: 3, cam: move(cam([-1.1, 3.6, 2.95], [-0.3, 0.3, -0.05], 48), cam([-0.95, 3.4, 2.6], [-0.28, 0.35, -0.1], 48), a, b), focus: () => [P1[0], 0.9, P1[2]] };
    case "trackerUp": return { cInf: 5, cam: move(cam([1.3, 0.7, 4.6], [0.15, 3.0, -0.6], 46), cam([1.2, 0.72, 4.3], [0.15, 3.1, -0.6], 46), a, b), focus: () => chest(P1) }; // wide, low: he is small at the bottom, the lights rise above him
    case "wideSwirl": return { cInf: 4, cam: move(cam([-1.9, 1.75, 4.6], [0.15, 1.75, -0.6], 44), cam([-1.2, 1.7, 4.9], [0.15, 1.8, -0.6], 44), a, b), focus: () => chest(P1) };
    case "healClose": return { cInf: 9, cam: orbit(HEAD1, 2.9, 1.5, 15, 35, a, b, 36, 0.95), focus: () => HEAD1 };
    case "mediumPush": return { cInf: 5, cam: move(cam([-0.9, 1.35, 3.6], [0.25, 1.35, -0.8], 44), cam([-0.6, 1.35, 3.1], [0.3, 1.35, -0.8], 44), a, b), focus: () => chest(P1) };
    case "walkTrack": return { cInf: 5, cam: (f) => { const x = lerp3(P1, P2, walkProgress(f)); return cam([x[0] - 0.7, 1.45, 3.6], [x[0] + 0.3, 1.85, x[2]], 46); }, focus: (f) => chest(lerp3(P1, P2, walkProgress(f))) };
    default: return { cInf: 6, cam: move(cam([1.0, 1.05, 2.4], [1.2, 1.75, -1.55], 40), cam([1.02, 1.1, 2.0], [1.2, 1.78, -1.55], 40), a, b), focus: () => chest(P2) }; // takbirSide
  }
};
const INTRO_CAM = move(cam([0.6, 1.55, 7.4], [1.55, 2.25, -3.0], 46), cam([1.35, 2.0, 1.4], LAMP_AIM, 38), 0, F(INTRO));
const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };
const ENDING = { from: F(A.ending), len: 90 };
const WHIP_TURN = { from: F(A.whipTurn) - 5, len: 10 };
const lostAt = F(A.lostWord), snuffAt = F(A.snuff), flashAt = F(A.flash), mercyAt = F(A.mercyWord);
const allahAt = F(WORDS.find((w) => w.block === "mercy" && w.word.toLowerCase().startsWith("allah"))!.start);
const withAt = F(WORDS.find((w) => w.block === "mercy" && w.word.toLowerCase().startsWith("with"))!.start);
const TURN_Q = F(A.turnQibla), TAKBIR = F(A.takbir);

/** the courtyard's lamp levels and the gold swirl at frame f */
const courtLevels = (f: number) => {
  const t = f / FPS;
  let main = 1, lan = 1, night = 1, swirl = 0;
  if (f < F(INTRO)) { const u = smooth(t / 1.2); main = 0.2 + 0.8 * u; lan = 0.3 + 0.7 * u; night = 0.6 + 0.4 * u; }
  // the hadith: the lamp flickers softly; the weight: more; "lost": snuffed out with a thud
  main *= 1 + 0.07 * Math.sin(f * 0.9) * Math.sin(f * 0.31 + 1) + (f >= F(A.iris) && f < flashAt ? 0.08 * Math.sin(f * 2.3) : 0);
  if (f >= snuffAt && f < flashAt) { const k = smooth((f - snuffAt) / 4); main *= 1 - 0.96 * k; lan *= 1 - 0.95 * k; night *= 1 - 0.4 * k; } // every lamp goes out
  if (f >= flashAt) { const k = smooth((f - flashAt) / 10); main *= 0.3 + 0.95 * k; lan *= 0.3 + 0.8 * k; } // re-lit, warmer
  if (f >= mercyAt - 6) swirl = smooth((f - mercyAt + 6) / 30) * (1 - smooth((f - F(A.whipTurn) + 10) / 20));
  return { levels: { main, lanterns: lan, night }, swirl };
};

const courtTraveller = (f: number, c: Cam): { trav: TravellerCard | null; head: V3 } => {
  if (f < F(INTRO)) return { trav: null, head: HEAD1 };
  const t = f / FPS;
  const idle = { bob: 1.8 * Math.sin((2 * Math.PI * t) / 3.8), sway: 0.006 * Math.sin((2 * Math.PI * t) / 7.3), wind: 0.55 * Math.sin(t * 1.1) + 0.3 * Math.sin(t * 2.7 + 1) };
  const bob = q(idle.bob, 4), wind = q(idle.wind, 20);
  const front = (turn: number, tilt: number, arms: "down" | "chest" = "down") => {
    const L = lightFor("courtyard", c), tq = q(turn, 40), lq = q(tilt, 40);
    return { key: `cf|${arms}|${tq}|${lq}|${bob}|${wind}|${L}`, draw: (p: Pen) => traveller(p, { mode: "stand", light: L, seed: 1, arms, headTurn: tq, headTilt: lq, bob, wind }), mirror: false };
  };
  const side = (mirror: boolean, ph: number, k: number, raise: number, st: number) => {
    const L = lightFor("courtyard", c, mirror), pq = q(ph, 240), kq = q(k, 60), rq = q(raise, 60), b = q(st + idle.bob, 4);
    return { key: `cs|${mirror}|${pq}|${kq}|${rq}|${b}|${wind}|${L}`, draw: (p: Pen) => travellerWalkPhase(p, pq, kq, STRIDE_M / SU, { light: L, raise: rq, bob: b, wind, shawlNear: mirror }), mirror };
  };
  const q34 = (mirror: boolean) => { const L = lightFor("courtyard", c, mirror); return { key: `cq|${mirror}|${L}`, draw: (p: Pen) => travellerThreeQuarterFront(p, { light: L, shawlNear: mirror }), mirror }; };
  const sh = cshotAt(f).kind;
  let pos: V3 = P1, d: { key: string; draw: (p: Pen) => void; mirror: boolean };
  const endPhase = 0.25 + WALK.steps / 2;
  if (f < F(A.iris)) {                                            // the hadith
    if (sh === "orbitHead") { const up = ramp(f, F(A.zoomDot + 1.8), F(A.zoomDot + 2.4)); d = front(0.6 - 0.3 * up, 0.15 + 0.3 * up); }
    else if (sh === "archLow") d = front(0.2, 0.35);
    else d = front(0.25, -0.3 - 0.2 * ramp(f, F(A.quoteStart + 3), F(A.quoteStart + 3.6)), "chest");
  } else if (f < flashAt) {                                       // the weight, "lost", the dark
    const turnPool = sh === "lampFlicker" ? 0.6 : sh === "poolLow" ? -0.3 : 0;
    d = front(turnPool * (1 - ramp(f, lostAt - 10, lostAt + 6)), -0.35 - 0.45 * ramp(f, lostAt, lostAt + 14));
  } else if (f < F(A.whipTurn)) {                                 // the mercy
    if (f < mercyAt + 36) { const u = ramp(f, mercyAt - 6, mercyAt + 14); d = front(0.35 * u, -0.6 + 1.0 * u); }
    else if (f < allahAt) d = front(0.1, 0.1);
    else if (f < withAt) d = front(0.1, -0.2, "chest");
    else d = front(0.2, 0.15 + 0.2 * ramp(f, withAt, withAt + 20));
  } else {                                                        // the turn
    const ph = 0.25 + (lerp3(P1, P2, walkProgress(f))[0] - P1[0]) / (2 * STRIDE_M);
    if (f < WALK.from - 3) { const lift = ramp(f, WALK.from - 30, WALK.from - 14); d = front(0.15 + 0.3 * lift, -0.2 + 0.3 * lift); }
    else if (f < WALK.from) d = q34(false);
    else if (f < WALK.to) { pos = lerp3(P1, P2, walkProgress(f)); d = side(false, ph, ramp(f, WALK.from, WALK.from + 10) * ramp(f, WALK.to, WALK.to - 10), 0, settle(f - WALK.from)); }
    else if (f < TURN_Q) { pos = P2; d = side(false, endPhase, 0, 0, settle(f - WALK.to)); }
    else if (f < TURN_Q + 3) { pos = P2; d = q34(false); }
    else if (f < TURN_Q + 6) { pos = P2; d = front(0, 0); }
    else if (f < TURN_Q + 9) { pos = P2; d = q34(true); }
    else { pos = P2; d = side(true, endPhase, 0, clamp01((f - TAKBIR) / 24), settle(f - (TURN_Q + 9))); }
  }
  // on the prayer mat his soles rest on its top (1 cm up), never inside it
  const onMat = Math.abs(pos[0] - 0.85) < 0.66 && Math.abs(pos[2] + 1.6) < 0.38;
  const p2: V3 = [pos[0] + idle.sway, onMat ? 0.012 : 0, pos[2]];
  return { trav: { pos: p2, ...d }, head: [p2[0], 1.8, p2[2]] };
};

// ---------------- accents ----------------
type Acc = { at: number; how: "punch" | "shake"; k: number; warm: boolean; ca?: number };
const ACCENTS: Acc[] = [
  ...["fajrCrack", "dhuhrCrack", "asrCrack", "maghribCrack", "ishaCrack"].map((k) => ({ at: F(A[k]), how: "shake" as const, k: 0.6, warm: false })),
  { at: F(A.alarmLoud), how: "shake", k: 0.7, warm: true }, { at: F(A.land), how: "shake", k: 0.9, warm: true },
  { at: F(A.dotsCentre), how: "punch", k: 0.8, warm: false, ca: 9 }, { at: F(A.firstWord), how: "punch", k: 1, warm: true, ca: 6 },
  { at: lostAt, how: "shake", k: 1.2, warm: false, ca: 10 }, { at: mercyAt, how: "punch", k: 1, warm: true },
  ...MENDS.map((s) => ({ at: F(s), how: "punch" as const, k: 0.35, warm: true })),
];
export const accentAt = (f: number): Accent & { ca: number } => {
  let punch = 0, shake = 0, flash = 0, warm = true, ca = 0;
  for (const a of ACCENTS) {
    const d = f - a.at;
    if (d < 0 || d > 30) continue;
    const env = d < 3 ? d / 3 : Math.exp(-(d - 3) / 7);
    if (a.how === "punch") punch = Math.max(punch, env * a.k);
    else shake = Math.max(shake, (d < 14 ? Math.exp(-d / 4) : 0) * a.k);
    const fl = (d < 10 ? (d < 2 ? d / 2 : Math.exp(-(d - 2) / 3)) : 0) * a.k;
    if (fl > flash) { flash = fl; warm = a.warm; }
    if (a.ca) ca = Math.max(ca, a.ca * (d < 2 ? 1 : Math.exp(-(d - 2) / 3)));
  }
  return { punch, shake, flash, warm, ca };
};

// ---------------- the frame ----------------
export type FrameInfo = { frame: Frame; head: V3; screen?: V3 };
export const IRIS = { from: F(A.iris) - 7, len: 14 };
export const shotAt = (f: number, outgoing = false): FrameInfo => {
  const t = f / FPS;
  let fr: Frame, head: V3, screen: V3 | undefined;
  const inCourt = f < F(INTRO) || t >= A.zoomDot;
  const dayShot = (src: number) => { const d = dayAt(src); return { fr: { set: d.set, state: d.state, t: src, plan: d.plan, traveller: d.trav, hooks: { streetX: d.streetX, officeBanner: d.banner ?? null } } as Frame, head: d.head, screen: d.screen }; };
  if (!inCourt) {
    const src = t >= FB[0] ? flashTime(t) : R(t);
    ({ fr, head, screen } = dayShot(src));
  } else {
    let c: Cam, focus: V3, cInf = 6, nearScale = 1.6, anchor: V3 | undefined;
    if (f < F(INTRO)) { c = INTRO_CAM(f); focus = LAMP; cInf = 7; }
    else {
      // the star iris: its outgoing view shows the shot before the iris (the hadith's last shot)
      const sh = outgoing && f >= IRIS.from && f < IRIS.from + IRIS.len ? cshotAt(IRIS.from - 1) : cshotAt(f);
      const b = shotCam(sh); c = b.cam(f); focus = b.focus(f); cInf = b.cInf; nearScale = b.nearScale ?? 1.6;
      const r = !outgoing ? whipAt(f, WHIP_TURN.from, WHIP_TURN.len) : null;
      if (r) { const bb = shotCam(r.side === "out" ? cshotAt(WHIP_TURN.from - 1) : cshotAt(F(A.whipTurn))); const bc = bb.cam(f); anchor = bc.look; c = yawed(bc, r.yaw); focus = bb.focus(f); cInf = bb.cInf; }
    }
    const lv = courtLevels(f);
    let grooves: [number, number, number, number, number] | undefined, mark: [number, number, number, number, number] | undefined, levels = lv.levels;
    if (!outgoing && f >= ENDING.from) {
      const u = (f - ENDING.from) / ENDING.len, e = endingAt(u, shotCam(cshotAt(ENDING.from - 1)).cam(ENDING.from), MARK, ENDING_TOP);
      const dim = 1 - 0.85 * smooth((f - F(A.card) + 6) / 14);
      c = e.cam; cInf = 2; focus = [MARK[0], 0, MARK[2]];
      levels = { main: e.main, lanterns: e.lanterns, night: e.night };
      grooves = [MARK[0], MARK[2], e.grooveRadius, e.grooveIntensity * dim, 0.15];
      mark = [MARK[0], MARK[2], 1.9, e.markProgress, e.markIntensity * dim];
    }
    const ct = courtTraveller(f, c);
    fr = { set: "courtyard", state: "night", t, plan: { cam: c, focus, cInf, nearScale, anchor }, traveller: ct.trav, courtyard: { levels, grooves, mark, swirl: lv.swirl } };
    head = ct.head;
  }
  // handheld drift and the accents on every shot
  const acc = accentAt(f), hh = handheld(f, f >= ENDING.from ? Math.max(0, 1 - (f - ENDING.from) / 40) : 1), sh = acc.shake * 0.016;
  const c = fr.plan.cam;
  fr.plan = { ...fr.plan,
    cam: { ...c, pos: [c.pos[0] + hh.pos[0] + sh * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + sh * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]], look: add(c.look, hh.look), fov: c.fov * (1 - 0.05 * acc.punch) },
    anchor: fr.plan.anchor ? add(fr.plan.anchor, hh.look) : undefined };
  return { frame: fr, head, screen };
};

// ---------------- transitions and picture effects ----------------
const TRANS = PLAN.transitions as { type: string; at: number; into?: string }[];
export const WHIP_LIST = [...TRANS.filter((x) => x.type === "whip" && x.at < A.zoomDot).map((x) => ({ from: F(x.at) - 4, len: 8 })), WHIP_TURN];
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
/** where a world point lands on screen (px) for frame f's camera */
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920 }; };
const isCut = (f: number) => TRANS.some((x) => F(x.at) === f) || CSHOTS.some((s) => s.from === f) || FB.some((s) => F(s) === f)
  || f === F(A.timeJump) || f === F(A.sitUp) || f === F(INTRO + 0.25 + 0.35) || f === F(A.cutOffice + 2.7) || f === F(A.cutOffice + 4.35) || f === F(A.cutGym + 1.2);
export const fxAt = (f: number): FrameFx => {
  const acc = accentAt(f);
  let blurX = 0, blurY = 0, glitch = 0, flash = 0, zoom: FrameFx["zoom"];
  // motion blur: how far the previous frame's look point moves on screen (camera turns and sideways moves; a push
  // straight in barely moves it), never across a cut
  if (f > 0 && !isCut(f)) {
    const fp = shotAt(f - 1).frame.plan.cam.look, a = project(f - 1, fp), b = project(f, fp);
    blurX = Math.min(40, Math.abs(b.x - a.x) * 0.45); blurY = Math.min(30, Math.abs(b.y - a.y) * 0.45);
    if (blurX < 1.2) blurX = 0; if (blurY < 1.2) blurY = 0;
  }
  for (const tr of TRANS) {
    const d = f - F(tr.at);
    if (tr.type === "glitch" && d >= -4 && d < 4) glitch = Math.max(glitch, 1 - Math.abs(d + 0.5) / 4.5);
    if (tr.type === "flash") { if (d >= -6 && d < 0) flash = Math.max(flash, (d + 6) / 6); if (d >= 0 && d < 14) flash = Math.max(flash, 1 - d / 14); }
    if (tr.type === "zoom" && tr.into === "phone") {
      if (d >= -10 && d < 0) { const s = shotAt(F(tr.at) - 1).screen!, p = project(F(tr.at) - 1, s), u = (d + 10) / 10; zoom = { scale: 1 + 5 * u * u, x: p.x, y: p.y, blur: 8 * u }; }
      if (d >= 0 && d < 9) { const u = 1 - d / 9; zoom = { scale: 1 + 1.4 * u * u, x: 540, y: 960, blur: 6 * u }; }
    }
    if (tr.type === "zoom" && tr.into === "dot" && d >= 0 && d < 12) { const u = 1 - d / 12; zoom = { scale: 1 + 1.2 * u * u, x: 540, y: 330, blur: 5 * u }; }
    if (tr.type === "match" && d >= 0 && d < 6) flash = Math.max(flash, 0.25 * (1 - d / 6));
  }
  if (zoom) { blurX += zoom.blur; blurY += zoom.blur; }
  return { blurX, blurY, ca: acc.ca + glitch * 4, glitch: f < F(A.zoomDot) ? glitch : 0, flash, vignette: f < F(INTRO) ? 1 : 0.7, grain: true, zoom };
};
