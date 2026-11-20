// Video 001, "The First Question - QURAN": the picture for the recitation of Maryam 19:59-63 (Sheikh Yasser
// Al-Dossari; the recitation itself is added in TikTok, never in our file). Timing: quran/timing.json (each phrase's
// start, from the guide audio), story: quran/shots.json (one shot per phrase, shared with the sound mix).
// The meaning drives the picture: neglect (the night street, the office) -> the warning (the void, cold) -> "except
// those who repent" (before Fajr: the phone face-down, the walk to the mat, takbir, the warm light returns) -> the
// reward (the lamp-lit courtyard in gold, a new angle every phrase) -> during the last caption the crane up to the star
// mark, and the end card crossfading in over the last 1.5 s. The video ENDS in the breath after 19:63 (timing.json), so
// no part of 19:64 is heard when TikTok cuts its sound at the end of the video.
// Content rules: no glow standing for Allah. The camera never looks down more than 45 degrees (pitch report, Overlay).
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { endingAt } from "../../brand/sequences";
import type { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import { travellerWalkPhase, travellerChair, travellerThreeQuarterFront } from "../../characters/travellerPoses";
import { BEDROOM } from "../../sets/bedroom";
import { STREET } from "../../sets/street";
import { OFFICE } from "../../sets/office";
import { VOID } from "../../sets/void";
import { MOON_FROM, MAIN } from "../courtyard-beauty/world";
import { cam, move, orbit, chest, lerp3, settle, ramp, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, SetId, Frame, Plan, TravellerCard, FrameFx } from "../../story/story";
import TIMING from "../../../../videos/001-the-first-question/quran/timing.json";
import STORY from "../../../../videos/001-the-first-question/quran/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
/** the video ends in the breath between 19:63 and 19:64 (a whole number of frames, computed by build_quran_timing.py) */
export const FRAMES = F(TIMING.guide.recitationEnd);
export const REC_END = FRAMES;
/** the end card crossfades in over the last seconds, inside the length */
export const CARD_FROM = FRAMES - F(STORY.events.cardFadeSeconds);

// ---------------- the phrases (captions) ----------------
export type Phrase = { i: number; verse: string; ar: string; arKeys: number[]; en: string; keys: string[]; repeat: boolean; voice: number; from: number; to: number };
export const PHRASES: Phrase[] = TIMING.phrases.map((p) => ({ i: p.i, verse: p.verse, ar: p.ar, arKeys: p.arKeys, en: p.en, keys: p.keys, repeat: p.repeat,
  voice: F(p.voice), from: F(p.start), to: F(p.end) }));
type Ev = number | { phrase: number; plus: number };
const ev = (e: Ev) => (typeof e === "number" ? e : TIMING.phrases[e.phrase].voice + e.plus);
export const EV = {
  dims: STORY.events.dims.map(F), flip: F(STORY.events.flip), walk: STORY.events.walk.map(F) as [number, number], turn: F(STORY.events.turn),
  takbir: F(ev(STORY.events.takbir)), fajrGlow: F(ev(STORY.events.fajrGlow)), craneUp: STORY.events.craneUp.map(F) as [number, number],
};

// ---------------- the shots ----------------
export type PShot = { kind: string; set: SetId; from: number; to: number };
export const SHOTS: PShot[] = (() => {
  const s = STORY.shots.map((x) => ({ kind: x.kind, set: x.set as SetId,
    from: "phrase" in x && x.phrase !== undefined ? PHRASES[x.phrase].from : F(Number(x.at)) }));
  return s.map((x, i) => ({ ...x, to: i + 1 < s.length ? s[i + 1].from : FRAMES }));
})();
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
const shotNamed = (k: string) => SHOTS.find((s) => s.kind === k)!;
export const SETS: SetId[] = ["street", "office", "void", "bedroom", "courtyard"];

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const inSet = (id: SetId, c: Cam): Cam => ({ ...c, pos: add(c.pos, SET_OFFSET[id]), look: add(c.look, SET_OFFSET[id]) });
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
const withRoll = (c: Cam, roll: number): Cam => ({ ...c, roll });
const U = (f: number, s: PShot) => clamp01((f - s.from) / Math.max(1, s.to - s.from));

// light directions for the drawings' painted shading
const SUN: Record<string, V3> = { streetNight: [0.3, 1.3, 0.8], office: [0.5, 1.4, 1.1], void: [0.05, 1.0, 0.05], bedroom: [0.7, 1.2, 1.2], courtyard: MOON_FROM };
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightFor = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...SUN[k]).normalize(), camRight(c), mirror), 30);
const plan = (c: Cam, focus: V3, cInf = 5, nearScale = 1.6): Plan => ({ cam: c, focus, cInf, nearScale });

type Shot = { set: SetId; state: string; plan: Plan; trav: TravellerCard | null; head: V3; t: number; banner?: string | null; streetX?: number };

// ---------------- before the courtyard ----------------
// he walks x -4.45 .. -0.3, between the tree at x -5 and the lamp post at x 0, so neither ever comes between the
// camera and him (the camera stands in the road beyond the parked cars, z 2.45-3.95, above their roofs' line)
const STREET_WALK = { x0: -4.45, speed: 0.85, stride: 0.48 };
const streetX = (t: number) => STREET_WALK.x0 + STREET_WALK.speed * t;
const walkCard = (x: number, x0: number, stride: number, light: number, o: { swing?: number; phone?: number; k?: number } = {}): Omit<TravellerCard, "pos"> => {
  const ph = q(0.25 + (x - x0) / (2 * stride), 240), k = o.k ?? 1, phone = q(o.phone ?? 0, 10);
  return { key: `walk|${ph}|${k}|${phone}|${o.swing ?? 1}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, k, stride / SU, { light, swing: o.swing, phone }), roll: -0.03 * k };
};

const dayAt = (f: number, sh: PShot): Shot => {
  const t = f / FPS, u = U(f, sh);
  switch (sh.kind) {
    case "street": {
      // the opening: already moving on frame 0. A tracking shot from across the parked cars that drifts in and rises
      // as he walks the night street with his phone glowing in his hand; the shop lights stream behind.
      const x = streetX(t), pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
      const e = smooth(u);
      const c = inSet("street", withRoll(cam([x - 1.7 + 0.5 * e, 1.6 + 0.35 * e, 4.7 - 0.1 * e], [x + 0.25 - 0.1 * e, 1.5, 0.7], 40 - 4 * e), -0.03 + 0.04 * e));
      const light = lightFor("streetNight", c);
      return { set: "street", state: "night", streetX: x, t, plan: plan(c, add(pos, [0, 1.4, 0]), 4), trav: { pos, ...walkCard(x, STREET_WALK.x0, STREET_WALK.stride, light, { swing: 0.9, phone: 1 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "office": {
      const c = inSet("office", withRoll(move(cam([1.9, 1.35, 2.2], [0.35, 1.1, -0.8], 46), cam([1.3, 1.2, 1.35], [0.45, 1.08, -0.8], 40), sh.from, sh.to)(f), 0.06));
      const light = lightFor("office", c), pos = W("office", OFFICE.CHAIR), tq = q(-0.2 + 0.06 * Math.sin(t * 14), 20);
      return { set: "office", state: "night", banner: null, t, plan: plan(c, add(pos, [0.25, 1.05, 0]), 4),
        trav: { pos, key: `type|${tq}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "type", tilt: tq, chair: true }), blob: null }, head: add(pos, [0.05, 1.25, 0]) };
    }
    case "void": {
      // the warning: cold, dark, one hard light; a slow push-in on him, head bowed
      const pos = W("void", VOID.SPOT);
      const c = inSet("void", move(cam([0.9, 1.05, 6.2], [0, 1.25, 0], 44), cam([0.3, 1.25, 3.4], [0, 1.45, 0], 38), sh.from, sh.to)(f));
      const L = lightFor("void", c), tilt = q(-0.25 - 0.3 * ramp(f, sh.from + 20, sh.to - 10), 30);
      return { set: "void", state: "on", t, plan: plan(c, add(pos, [0, 1.5, 0]), 6),
        trav: { pos, key: `void|${tilt}|${L}`, draw: (p: Pen) => traveller(p, { mode: "stand", light: L, seed: 1, arms: "down", headTurn: 0.1, headTilt: tilt, bob: 0, wind: 0 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "bedDawn": {
      // before Fajr: he sits up on the edge of the bed; the phone glows on the nightstand
      const pos = W("bedroom", BEDROOM.EDGE);
      const c = inSet("bedroom", move(cam([1.35, 1.3, 2.35], [-0.9, 0.85, -0.9], 46), cam([0.85, 1.2, 1.75], [-1.1, 0.85, -1.0], 42), sh.from, sh.to)(f));
      const light = lightFor("bedroom", c), tilt = q(-0.1 - 0.15 * ramp(f, sh.from + 10, sh.to), 20);
      return { set: "bedroom", state: "dawnAlarm", t, plan: plan(c, add(pos, [0, 0.95, 0]), 5),
        trav: { pos, key: `edge|${tilt}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "rest", tilt, chair: false }), blob: null, yaw: 0 }, head: add(pos, [0, 1.25, 0]) };
    }
    default: { // phoneDown: close on the nightstand (the phone itself is drawn in 2D on top); the glow goes when it turns over
      // between the headboard (x -1.86 .. -1.72) and the side wall (x -3.0): nothing stands between the lens and the phone
      const c = inSet("bedroom", move(cam([-2.35, 1.2, -0.45], [-2.17, 0.6, -1.71], 42), cam([-2.3, 1.08, -0.75], [-2.17, 0.58, -1.71], 38), sh.from, sh.to)(f));
      return { set: "bedroom", state: f < EV.flip + 8 ? "dawnAlarm" : "dawn", t, plan: plan(c, W("bedroom", BEDROOM.PHONE), 8, 1.4), trav: null, head: W("bedroom", [0, 1.2, 0]) };
    }
  }
};

// ---------------- the courtyard ----------------
const P1: V3 = [0.15, 0, -0.6], P2: V3 = [1.3, 0, -1.55], MARK: V3 = [0.75, 0, -0.7];
const HEAD2: V3 = [P2[0], 1.72, P2[2]];
const LAMP: V3 = [MAIN, 2.45, -3.5], LAMP_AIM: V3 = [MAIN, 2.4, -2.95];
const STEPS = 4, STRIDE_M = (P2[0] - P1[0]) / STEPS;
const walkProgress = (f: number) => {
  const [a, b] = EV.walk, T = b - a, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - a));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
type CB = { cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number; nearScale?: number };
const shotCam = (sh: PShot): CB => {
  const a = sh.from, b = sh.to;
  switch (sh.kind) {
    case "walk": return { cInf: 5, cam: (f) => { const x = lerp3(P1, P2, walkProgress(f)); const e = smooth(U(f, sh)); return cam([x[0] - 1.5 + 0.4 * e, 1.85 - 0.3 * e, 4.4 - 0.5 * e], [x[0] + 0.35, 1.35, x[2]], 46); }, focus: (f) => chest(lerp3(P1, P2, walkProgress(f))) };
    case "takbir": return { cInf: 6, cam: move(cam([0.15, 0.95, 2.6], [1.25, 1.55, -1.55], 44), cam([0.45, 1.05, 1.85], [1.25, 1.62, -1.55], 40), a, b), focus: () => chest(P2) };
    case "qiyamClose": return { cInf: 9, cam: orbit(HEAD2, 2.5, 1.5, 22, 42, a, b, 36, -0.3), focus: () => HEAD2 };
    case "wideGold": return { cInf: 3, cam: move(cam([-3.0, 2.05, 4.9], [0.5, 1.35, -1.3], 52), cam([-1.5, 1.9, 5.1], [0.8, 1.4, -1.4], 50), a, b), focus: () => chest(P2) };
    case "lampGold": return { cInf: 10, nearScale: 1.2, cam: move(cam([0.55, 1.7, -0.9], LAMP_AIM, 38), cam([0.95, 1.9, -1.55], LAMP_AIM, 32), a, b), focus: () => LAMP };
    case "archLow": return { cInf: 6, cam: move(cam([-1.5, 0.62, 0.85], [1.3, 1.95, -2.0], 46), cam([-1.15, 0.68, 0.55], [1.3, 2.0, -2.0], 44), a, b), focus: () => chest(P2) };
    case "poolLow": return { cInf: 5, nearScale: 1.2, cam: move(cam([-1.5, 0.85, 3.35], [1.1, 1.3, -1.5], 50), cam([-1.15, 0.9, 3.0], [1.15, 1.35, -1.5], 48), a, b), focus: () => chest(P2) };
    case "arcade": return { cInf: 4, cam: (f) => { const e = smooth(U(f, sh)); return cam([-2.1 + 1.3 * e, 1.75 - 0.15 * e, 3.5 - 0.2 * e], lerp3([0.0, 2.35, -2.9], [1.2, 1.45, -1.55], e), 46); }, focus: (f) => lerp3([0.0, 2.35, -2.9], chest(P2), smooth(U(f, sh))) };
    case "mediumPush": return { cInf: 5, cam: move(cam([3.0, 1.5, 2.3], [1.3, 1.35, -1.55], 44), cam([2.45, 1.45, 1.4], [1.3, 1.4, -1.55], 40), a, b), focus: () => chest(P2) };
    default: return { cInf: 5, cam: move(cam([-0.4, 1.45, 3.2], [1.0, 1.3, -1.3], 44), cam([-0.25, 1.5, 3.0], [1.0, 1.3, -1.3], 44), a, b), focus: () => chest(P2) }; // the start of the ending
  }
};
/** where the crane lands: high and back, ~40 degrees down to the star mark, never steeper than 45 */
const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };
const ENDING = shotNamed("ending");
const quietCam = (f: number): Cam => {
  const T = Math.max(1, FRAMES - EV.craneUp[1]), x = clamp01((f - EV.craneUp[1]) / T);
  const u = x < 0.15 ? (x * x) / 0.3 : (x - 0.075) / 0.925;
  const a = 0.42 * Math.min(1, u), r = 5.5 - 0.35 * u, h = 4.6 + 0.45 * u;
  return { pos: [MARK[0] + r * Math.sin(a), h, MARK[2] + r * Math.cos(a)], look: [MARK[0], 0.15 * u, MARK[2]], fov: 46 - 2 * u, roll: 0 };
};

/** the courtyard's light: dim and cool before dawn; at takbir the warm light returns; a touch more gold for the reward */
const courtLevels = (f: number) => {
  const k = smooth((f - EV.takbir) / 55), g = smooth((f - PHRASES[7].from) / 45);
  const flick = 1 + 0.06 * Math.sin(f * 0.9) * Math.sin(f * 0.31 + 1);
  return { main: (0.28 + 0.77 * k) * (1 + 0.1 * g) * flick, lanterns: (0.15 + 0.85 * k) * (1 + 0.15 * g), night: 0.72 + 0.28 * k };
};

const courtTraveller = (f: number, c: Cam): { trav: TravellerCard | null; head: V3 } => {
  const t = f / FPS;
  const idle = { bob: 1.6 * Math.sin((2 * Math.PI * t) / 3.8), sway: 0.005 * Math.sin((2 * Math.PI * t) / 7.3), wind: 0.5 * Math.sin(t * 1.1) + 0.25 * Math.sin(t * 2.7 + 1) };
  const bob = q(idle.bob, 4), wind = q(idle.wind, 20);
  const front = (turn: number, tilt: number, arms: "down" | "qiyam" = "down") => {
    const L = lightFor("courtyard", c), tq = q(turn, 40), lq = q(tilt, 40);
    return { key: `cf|${arms}|${tq}|${lq}|${bob}|${wind}|${L}`, draw: (p: Pen) => traveller(p, { mode: "stand", light: L, seed: 1, arms, headTurn: tq, headTilt: lq, bob, wind }), mirror: false };
  };
  const side = (mirror: boolean, ph: number, k: number, raise: number, st: number, fold = 0) => {
    const L = lightFor("courtyard", c, mirror), pq = q(ph, 240), kq = q(k, 60), rq = q(raise, 60), fq = q(fold, 30), b = q(st + idle.bob, 4);
    return { key: `cs|${mirror}|${pq}|${kq}|${rq}|${fq}|${b}|${wind}|${L}`, draw: (p: Pen) => travellerWalkPhase(p, pq, kq, STRIDE_M / SU, { light: L, raise: rq, fold: fq, bob: b, wind, shawlNear: mirror }), mirror };
  };
  const q34 = (mirror: boolean) => { const L = lightFor("courtyard", c, mirror); return { key: `cq|${mirror}|${L}`, draw: (p: Pen) => travellerThreeQuarterFront(p, { light: L, shawlNear: mirror }), mirror }; };
  const [wa, wb] = EV.walk, TURN = EV.turn, TAK = EV.takbir, endPhase = 0.25 + STEPS / 2;
  let pos: V3 = P1, d: { key: string; draw: (p: Pen) => void; mirror: boolean };
  if (f < wa - 3) { const lift = ramp(f, wa - 26, wa - 10); d = front(0.15 + 0.3 * lift, -0.35 + 0.4 * lift); }
  else if (f < wa) d = q34(false);
  else if (f < wb) { pos = lerp3(P1, P2, walkProgress(f)); const ph = 0.25 + (pos[0] - P1[0]) / (2 * STRIDE_M); d = side(false, ph, ramp(f, wa, wa + 10) * ramp(f, wb, wb - 10), 0, settle(f - wa)); }
  else if (f < TURN) { pos = P2; d = side(false, endPhase, 0, 0, settle(f - wb)); }
  else if (f < TURN + 3) { pos = P2; d = q34(false); }
  else if (f < TURN + 6) { pos = P2; d = front(0, 0); }
  else if (f < TURN + 9) { pos = P2; d = q34(true); }
  else { pos = P2; d = side(true, endPhase, 0, clamp01((f - TAK) / 14), settle(f - (TURN + 9)), smooth((f - TAK - 30) / 16)); } // takbir, then standing in prayer
  const onMat = Math.abs(pos[0] - 0.85) < 0.66 && Math.abs(pos[2] + 1.6) < 0.38;
  const p2: V3 = [pos[0] + idle.sway, onMat ? 0.012 : 0, pos[2]];
  return { trav: { pos: p2, ...d }, head: [p2[0], 1.8, p2[2]] };
};

// ---------------- accents: calm (only a soft breath of light at takbir) ----------------
export const accentAt = (f: number): Accent & { ca: number } => {
  const d = f - EV.takbir;
  const punch = d >= 0 && d < 30 ? (d < 4 ? d / 4 : Math.exp(-(d - 4) / 9)) * 0.25 : 0;
  return { punch, shake: 0, flash: d >= 0 && d < 12 ? 0.18 * (1 - d / 12) : 0, warm: true, ca: 0 };
};

// ---------------- the frame ----------------
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
/** two star irises: out of the warning into "except those who repent", and out of the bedroom into the courtyard */
export const IRISES = [{ from: PHRASES[3].from - 7, len: 14 }, { from: PHRASES[4].from - 7, len: 14 }];
export const shotAt = (f: number, outgoing = false): FrameInfo => {
  const t = f / FPS;
  let sh = shotOf(f);
  const ir = IRISES.find((r) => f >= r.from && f < r.from + r.len);
  if (outgoing && ir) sh = shotOf(ir.from - 1);
  let fr: Frame, head: V3;
  if (sh.set !== "courtyard") {
    const d = dayAt(f, sh);
    fr = { set: d.set, state: d.state, t: d.t, plan: d.plan, traveller: d.trav, hooks: { streetX: d.streetX, officeBanner: d.banner ?? null } };
    head = d.head;
  } else {
    let c: Cam, focus: V3, cInf = 6, nearScale = 1.6;
    let grooves: [number, number, number, number, number] | undefined, mark: [number, number, number, number, number] | undefined;
    let levels = courtLevels(f);
    if (sh.kind === "ending") {
      const [ca, cb] = EV.craneUp, pre = shotCam(ENDING);
      if (f < ca) { c = pre.cam(f); focus = pre.focus(f); cInf = pre.cInf; }
      else {
        const u = clamp01((f - ca) / (cb - ca)), e = endingAt(Math.min(1, u), pre.cam(ca), MARK, ENDING_TOP);
        c = f < cb ? e.cam : quietCam(f); cInf = 2; focus = [MARK[0], 0, MARK[2]];
        const flick = 1 + 0.05 * Math.sin(f * 0.9) * Math.sin(f * 0.31 + 1);
        levels = { main: 0.95 * flick, lanterns: 0.85, night: 0.95 };
        const mp = smooth((f - ca - 15) / (cb + F(0.6) - ca - 15));   // the star mark is complete before the card covers it
        grooves = [MARK[0], MARK[2], 6.5 * (1 - mp), 0.6 * smooth((f - ca) / 20) * (1 - smooth((mp - 0.75) / 0.25)), 0.15];
        mark = [MARK[0], MARK[2], 1.9, mp, (0.35 + 0.65 * mp) * smooth((f - ca - 10) / 20) * (0.92 + 0.08 * Math.sin(t * 1.3))];
      }
    } else {
      const b = shotCam(sh); c = b.cam(f); focus = b.focus(f); cInf = b.cInf; nearScale = b.nearScale ?? 1.6;
      // takbir: the warm light runs out along the floor's star grooves from the mat
      const d = f - EV.takbir;
      if (d >= -2 && d < F(2.6)) { const run = clamp01(d / F(2.0)); grooves = [P2[0], P2[2], 0.2 + 7.5 * (1 - (1 - run) ** 2), smooth(d / 6) * (1 - smooth((d - F(1.6)) / F(1.0))), 0.15]; }
    }
    const ct = courtTraveller(f, c);
    fr = { set: "courtyard", state: "night", t, plan: { cam: c, focus, cInf, nearScale }, traveller: ct.trav, courtyard: { levels, grooves, mark } };
    head = ct.head;
  }
  // a gentle handheld drift on every shot (less on the crane and the quiet), and the takbir's soft punch
  const acc = accentAt(f), hh = handheld(f, sh.kind === "ending" ? 0.35 : 0.9);
  const c = fr.plan.cam;
  fr.plan = { ...fr.plan, cam: { ...c, pos: add(c.pos, hh.pos), look: add(c.look, hh.look), fov: c.fov * (1 - 0.04 * acc.punch), roll: c.roll ?? 0 },
    anchor: fr.plan.anchor ? add(fr.plan.anchor, hh.look) : undefined };
  return { frame: fr, head, shot: sh };
};

// ---------------- picture effects ----------------
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
const CUTS = new Set(SHOTS.map((s) => s.from));
export const fxAt = (f: number): FrameFx => {
  let blurX = 0, blurY = 0, zoom: FrameFx["zoom"];
  // motion blur: how far the look point moves on screen since the previous frame (never across a cut)
  if (f > 0 && !CUTS.has(f)) {
    const fp = shotAt(f - 1).frame.plan.cam.look, a = project(f - 1, fp), b = project(f, fp);
    blurX = Math.min(24, Math.abs(b.x - a.x) * 0.4); blurY = Math.min(18, Math.abs(b.y - a.y) * 0.4);
    if (blurX < 1.2) blurX = 0; if (blurY < 1.2) blurY = 0;
  }
  // every cut lands with a soft settle: a 4 % scale and a little blur that clear in 7 frames
  for (const s of SHOTS) { const d = f - s.from; if (s.from > 0 && d >= 0 && d < 7) { const u = 1 - d / 7; zoom = { scale: 1 + 0.04 * u * u, x: 540, y: 900, blur: 3 * u }; } }
  if (zoom) { blurX += zoom.blur; blurY += zoom.blur; }
  return { blurX, blurY, ca: 0, glitch: 0, flash: accentAt(f).flash, vignette: 0.85, grain: true, zoom };
};

/** the steepest downward look of the camera at frame f (degrees; positive = looking down) */
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
