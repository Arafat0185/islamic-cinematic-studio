// Video 001, final version: what every frame shows. All timing comes from final/plan.json (tools/plan_final001.py),
// which also drives the sound, so cuts, cracks, pop-outs and sound effects land together on the words.
// The day: a night shopping street (crash-zoom in), the office, the feed world, the freeze and the shatter, the void,
// the wall of deadlines, the phone, the airport, then one continuous time-lapse through the bedroom, a taxi in traffic
// and the sofa. From the hadith on: the courtyard, a different framing every 2-3 s. Then the crane up and the star mark,
// a 5 s quiet moment and the end card. Picture effects (motion blur, chromatic aberration, glitch, zoom-throughs,
// flash, vignette, grain) are computed here too (fxAt), and the shatter (shatterAt).
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, glide, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { endingAt } from "../../brand/sequences";
import { whipAt } from "../../brand/transitions";
import type { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import { travellerWalkPhase, travellerChair, travellerLying, travellerThreeQuarterFront, travellerBack } from "../../characters/travellerPoses";
import { BEDROOM } from "../../sets/bedroom";
import { STREET } from "../../sets/street";
import { OFFICE } from "../../sets/office";
import { VOID } from "../../sets/void";
import { DEADLINES } from "../../sets/deadlines";
import { AIRPORT } from "../../sets/airport";
import { CAR } from "../../sets/car";
import { SOFA } from "../../sets/sofa";
import { MOON_FROM, MAIN } from "../courtyard-beauty/world";
import { cam, move, orbit, chest, lerp3, settle, ramp, yawed, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, SetId, Frame, Plan, TravellerCard, FrameFx, Shatter } from "../../story/story";
import PLAN from "../../../../videos/001-the-first-question/final/plan.json";

export const FPS = PLAN.fps;
export const FRAMES = PLAN.frames;
export const A = PLAN.anchors as Record<string, number>;
export const F = (s: number) => Math.round(s * FPS);
export type Word = { block: number; word: string; start: number; end: number };
export const WORDS = PLAN.words as Word[];
export const SETS: SetId[] = ["street", "office", "feed", "void", "deadlines", "airport", "bedroom", "car", "sofa", "courtyard"];
const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const inSet = (id: SetId, c: Cam): Cam => ({ ...c, pos: add(c.pos, SET_OFFSET[id]), look: add(c.look, SET_OFFSET[id]) });
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
const withRoll = (c: Cam, roll: number): Cam => ({ ...c, roll });

// ---------------- the shots of the plan ----------------
type PShot = { kind: string; set: SetId; from: number; to: number };
export const SHOTS = (PLAN.shots as { kind: string; set: string; from: number; to: number }[]).map((s) => ({ kind: s.kind, set: s.set as SetId, from: F(s.from), to: F(s.to) }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
const shotNamed = (k: string) => SHOTS.find((s) => s.kind === k)!;

// ---------------- the clock (one smooth time-lapse, minutes) ----------------
const CLOCK = PLAN.clock as [number, number][];
/** minutes at time t: a monotone cubic through the keys (never jumps, never runs backward) */
export const minutesAt = (t: number) => {
  const k = CLOCK;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[k.length - 1][0]) return k[k.length - 1][1];
  let i = 1; while (t > k[i][0]) i++;
  const [t0, m0] = k[i - 1], [t1, m1] = k[i], u = (t - t0) / (t1 - t0);
  const sl = (j: number) => (j <= 0 || j >= k.length - 1 ? 0 : 0.5 * ((k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0]) + (k[j][1] - k[j - 1][1]) / (k[j][0] - k[j - 1][0])));
  const s0 = Math.min(sl(i - 1), 3 * (m1 - m0) / (t1 - t0)), s1 = Math.min(sl(i), 3 * (m1 - m0) / (t1 - t0)), h = t1 - t0;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * m0 + (u3 - 2 * u2 + u) * h * s0 + (-2 * u3 + 3 * u2) * m1 + (u3 - u2) * h * s1;
};

// ---------------- light directions for the drawings' painted shading ----------------
const SUN: Record<string, V3> = {
  streetNight: [0.3, 1.3, 0.8], office: [0.5, 1.4, 1.1], feed: [-0.6, 1.0, 0.4], void: [0.05, 1.0, 0.05], deadlines: [0.1, 1.2, 1.0],
  airport: [-1.0, 0.45, 0.2], bedroom: [0.7, 1.2, 1.2], car: [0.2, 0.8, 0.9], sofa: [0.8, 0.9, 0.4], courtyard: MOON_FROM,
};
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightFor = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...SUN[k]).normalize(), camRight(c), mirror), 30);
const plan = (c: Cam, focus: V3, cInf = 5, nearScale = 1.6): Plan => ({ cam: c, focus, cInf, nearScale });
/** u = 0..1 through a shot */
const U = (f: number, s: PShot) => clamp01((f - s.from) / Math.max(1, s.to - s.from));

type Shot = { set: SetId; state: string; plan: Plan; trav: TravellerCard | null; head: V3; streetX?: number; banner?: string | null; t: number; screen?: V3 };

// ---------------- the day ----------------
const STREET_WALK = { x0: -2.6, speed: 1.6, stride: 0.55 };
const streetX = (t: number) => STREET_WALK.x0 + STREET_WALK.speed * t;
const walkCard = (pos: V3, x: number, x0: number, stride: number, light: number, o: { swing?: number; phone?: number; k?: number } = {}): Omit<TravellerCard, "pos"> => {
  const ph = q(0.25 + (x - x0) / (2 * stride), 240), k = o.k ?? 1, phone = q(o.phone ?? 0, 10);
  return { key: `walk|${ph}|${k}|${phone}|${o.swing ?? 1}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, k, stride / SU, { light, swing: o.swing, phone }), roll: -0.05 * k };
};

const dayAt = (f: number, sh: PShot): Shot => {
  const t = f / FPS, u = U(f, sh);
  switch (sh.kind) {
    case "crash": case "shopsTrack": {
      // the street at night: he walks fast along the shop fronts; the crash-zoom dives from above the far pavement
      const x = streetX(t), pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
      let c: Cam;
      if (sh.kind === "crash") {
        const e = Math.pow(u, 2.4);                                 // accelerating all the way down: it lands on "money"
        const a = cam([x - 7, 24, 27], [x + 0.4, 1.4, 0.9], 62), b = cam([x + 1.3, 1.3, 3.3], [x + 0.15, 1.5, 0.9], 40);
        c = { pos: lerp3(a.pos, b.pos, e), look: lerp3(a.look, b.look, Math.min(1, e * 1.4)), fov: a.fov + (b.fov - a.fov) * e, roll: 0.25 * (1 - e) };
      } else c = withRoll(cam([x - 1.0 + 0.5 * u, 0.55, 2.5], [x + 0.35, 1.75, 0.6], 50), -0.09);
      c = inSet("street", c);
      const light = lightFor("streetNight", c);
      return { set: "street", state: "night", streetX: x, t, plan: plan(c, add(pos, [0, 1.4, 0]), 4), trav: { pos, ...walkCard(pos, x, STREET_WALK.x0, STREET_WALK.stride, light, { swing: 1.6 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "officeDutch": {
      const c = inSet("office", withRoll(move(cam([1.75, 1.25, 2.0], [0.4, 1.1, -0.8], 44), cam([1.25, 1.18, 1.25], [0.45, 1.08, -0.8], 40), sh.from, sh.to)(f), 0.13));
      const light = lightFor("office", c), pos = W("office", OFFICE.CHAIR), tq = q(-0.2 + 0.08 * Math.sin(t * 22), 20);
      return { set: "office", state: "noon", banner: "+3 meetings", t, plan: plan(c, add(pos, [0.25, 1.05, 0]), 4), screen: W("office", [0.86, 0.95, -0.74]),
        trav: { pos, key: `type|${tq}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "type", tilt: tq, chair: true }), blob: null }, head: add(pos, [0.05, 1.25, 0]) };
    }
    case "feedOrbit": case "freeze": {
      // the feed world: low orbit round him; he stands holding his phone, looking up at the towering screens.
      // freeze: time stops on the orbit's last frame, the camera creeps in a little (the shatter is drawn on top)
      const fo = shotNamed("feedOrbit"), ff = sh.kind === "freeze" ? fo.to - 1 : f;
      const base = orbit([0, 1.35, 0], 3.1, 0.55, -38, 4, fo.from, fo.to, 50, 0.85)(ff);
      const creep = sh.kind === "freeze" ? 0.08 * smooth(U(f, sh) / 0.6) : 0;
      const c = inSet("feed", { ...base, pos: lerp3(base.pos, [0, 1.35, 0], creep), roll: -0.06 });
      const tt = ff / FPS, light = lightFor("feed", c), pos = W("feed", [0, 0, 0]);
      return { set: "feed", state: "on", t: tt, plan: plan(c, add(pos, [0, 1.45, 0]), 4),
        trav: { pos, key: `feed|${light}`, draw: (p: Pen) => travellerWalkPhase(p, 0.25, 0, 0.5 / SU, { light, phone: 1 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "voidLow": case "voidHigh": case "phonePOV": {
      const pos = W("void", VOID.SPOT);
      if (sh.kind === "phonePOV") { // the phone close-up (drawn in 2D on top): the void's far lights out of focus behind it
        const c = inSet("void", move(cam([0.2, 1.5, 4.0], [0.6, 1.9, -12], 40), cam([0.0, 1.55, 3.6], [-0.4, 1.8, -12], 38), sh.from, sh.to)(f));
        return { set: "void", state: "phone", t, plan: plan(c, add(c.pos, [0, 0, -0.4]), 30, 1.6), trav: null, head: add(pos, [0, 1.8, 0]) };
      }
      const c = sh.kind === "voidLow"
        ? inSet("void", move(cam([0.35, 0.5, 4.3], [0, 1.6, 0], 42), cam([0.2, 0.6, 3.1], [0, 1.65, 0], 38), sh.from, sh.to)(f))
        : inSet("void", move(cam([-2.3, 2.5, 4.4], [0, 1.15, 0], 44), cam([-1.5, 3.7, 4.1], [0, 1.4, 0], 46), sh.from, sh.to)(f));
      const L = lightFor("void", c);
      const tilt = sh.kind === "voidLow" ? q(-0.45 + 0.6 * ramp(f, sh.from + 6, sh.from + 26), 30) : 0.3, turn = sh.kind === "voidHigh" ? 0.1 : 0;
      return { set: "void", state: "on", t, plan: plan(c, add(pos, [0, 1.5, 0]), 6),
        trav: { pos, key: `void|${tilt}|${L}`, draw: (p: Pen) => traveller(p, { mode: "stand", light: L, seed: 1, arms: "down", headTurn: turn, headTilt: tilt, bob: 0, wind: 0 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "deadlinesTrack": {
      const x = -3 + 2.2 * (t - sh.from / FPS), pos = W("deadlines", [x, 0, DEADLINES.WALK_Z]);
      const c = inSet("deadlines", withRoll(cam([x + 1.7 - 0.4 * u, 0.95, 3.3], [x + 0.5, 1.6, 0.2], 48), 0.1));
      const light = lightFor("deadlines", c);
      return { set: "deadlines", state: "on", t, plan: plan(c, add(pos, [0, 1.4, 0]), 4), trav: { pos, ...walkCard(pos, x, -3, 0.62, light, { swing: 1.9 }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "airportBoard": {
      const pos = W("airport", AIRPORT.STAND);
      const c = inSet("airport", move(cam([1.1, 0.75, 3.9], [-0.1, 3.6, -3.95], 46), cam([0.7, 1.15, 3.2], [-0.05, 4.0, -3.95], 44), sh.from, sh.to)(f));
      const light = lightFor("airport", c);
      return { set: "airport", state: "on", t, plan: plan(c, AIRPORT.BOARD.map((v, i) => v + SET_OFFSET.airport[i]) as V3, 3),
        trav: { pos, key: `back|${light}`, draw: (p: Pen) => travellerBack(p, { light }) }, head: add(pos, [0, 1.8, 0]) };
    }
    case "bedLapse": case "bedClose": {
      const state = `lapse:${q(minutesAt(t), 4)}`;
      const c = sh.kind === "bedLapse"
        ? inSet("bedroom", move(cam([1.75, 1.55, 2.5], [-0.7, 0.9, -1.4], 46), cam([1.05, 1.45, 2.05], [-0.75, 0.85, -1.4], 44), sh.from, sh.to)(f))
        : inSet("bedroom", move(cam([0.15, 1.35, 1.35], [-1.35, 0.78, -1.4], 40), cam([-0.12, 1.3, 1.02], [-1.4, 0.78, -1.42], 37), sh.from, sh.to)(f));
      const light = lightFor("bedroom", c);
      // he stirs, pulls the blanket up and settles back ("one more minute"): the near hand moves on his chest only
      const st = sh.kind === "bedClose" ? q(Math.sin(Math.PI * clamp01((f - sh.from) / 16)) * 0.9 + 0.2 * smooth((f - sh.from - 16) / 6), 10) : q(0.15 + 0.15 * Math.sin(t * 2.2), 10);
      const pos = W("bedroom", BEDROOM.LYING);
      return { set: "bedroom", state, t, plan: plan(c, sh.kind === "bedClose" ? W("bedroom", [BEDROOM.LYING[0] - 0.86, 0.8, BEDROOM.LYING[2]]) : add(pos, [0, 0.3, 0]), 7),
        trav: { pos, key: `lie|${st}|${light}`, draw: (p: Pen) => travellerLying(p, { light, stir: st }), wide: true, blob: null }, head: W("bedroom", [BEDROOM.LYING[0] - 0.86, 0.85, BEDROOM.LYING[2]]) };
    }
    case "carCall": {
      const state = `lapse:${q(minutesAt(t), 4)}`, pos = W("car", CAR.SEAT);
      const c = inSet("car", move(cam([0.35, 1.35, 4.6], [-0.4, 1.15, 0], 42), cam([-0.15, 1.3, 4.0], [-0.42, 1.18, 0], 40), sh.from, sh.to)(f));
      const light = lightFor("car", c), tilt = q(0.1 * Math.sin(t * 3), 20);
      return { set: "car", state, t, plan: plan(c, add(pos, [0.0, 1.0, 0]), 5),
        trav: { pos, key: `call|${tilt}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "call", tilt }), blob: null, yaw: 0 }, head: add(pos, [0.03, 1.25, 0]) };
    }
    default: { // sofaPhone: on the sofa at night, scrolling; the camera ends pushed into the phone's glow (the match cut)
      const state = `lapse:${q(minutesAt(t), 4)}`, pos = W("sofa", SOFA.SEAT), ph = W("sofa", SOFA.PHONE);
      const push = Math.pow(clamp01((f - (sh.to - 10)) / 10), 2);
      const base = move(cam([1.5, 1.25, 2.3], [0.15, 0.95, 0], 42), cam([1.05, 1.1, 1.55], [0.22, 0.86, 0], 38), sh.from, sh.to - 10)(Math.min(f, sh.to - 10));
      const c0: Cam = { pos: lerp3(base.pos, [SOFA.PHONE[0] + 0.25, SOFA.PHONE[1] + 0.03, SOFA.PHONE[2] + 0.55], push), look: lerp3(base.look, SOFA.PHONE, push), fov: base.fov - 10 * push, roll: 0 };
      const c = inSet("sofa", c0), light = lightFor("sofa", c), sc = q((t * 1.7) % 1, 12);
      return { set: "sofa", state, t, plan: plan(c, push > 0 ? ph : add(pos, [0.15, 1.0, 0]), 6), screen: ph,
        trav: { pos, key: `sofa|${sc}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: "phone", scroll: sc }), blob: null, yaw: 0 }, head: add(pos, [0.03, 1.25, 0]) };
    }
  }
};

// ---------------- the courtyard ----------------
const P1: V3 = [0.15, 0, -0.6], P2: V3 = [1.3, 0, -1.55], MARK: V3 = [0.75, 0, -0.7], HEAD1: V3 = [P1[0], 1.72, P1[2]];
const LAMP: V3 = [MAIN, 2.45, -3.5];
const LAMP_AIM: V3 = [MAIN, 2.4, -2.95];
const WALK = { from: F(A.walk), to: F(A.walkEnd), steps: 4 };
const STRIDE_M = (P2[0] - P1[0]) / WALK.steps;
const walkProgress = (f: number) => {
  const T = WALK.to - WALK.from, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - WALK.from));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
type CB = { cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number; nearScale?: number };
const shotCam = (sh: PShot): CB => {
  const a = sh.from, b = sh.to;
  switch (sh.kind) {
    case "lampClose": return { cInf: 10, nearScale: 1.2, cam: move(cam([1.15, 2.05, -1.4], LAMP_AIM, 34), cam([1.45, 2.15, -1.8], LAMP_AIM, 30), a, b), focus: () => LAMP };
    case "archLow": return { cInf: 6, cam: move(cam([-1.75, 0.6, 0.55], [0.25, 2.1, -2.6], 44), cam([-1.45, 0.62, 0.35], [0.3, 2.2, -2.6], 44), a, b), focus: () => chest(P1) };
    case "orbitHead": return { cInf: 9, cam: orbit(HEAD1, 2.6, 1.55, -52, -30, a, b, 32, 0.55), focus: () => HEAD1 };
    case "chestHand": return { cInf: 8, cam: move(cam([0.65, 1.4, 2.9], [0.15, 2.2, -0.6], 36), cam([0.55, 1.42, 2.55], [0.15, 2.22, -0.6], 36), a, b), focus: () => chest(P1) };
    case "poolLow": return { cInf: 5, nearScale: 1.2, cam: move(cam([-0.9, 0.9, 3.0], [0.3, 1.25, -0.8], 52), cam([-0.7, 0.92, 2.8], [0.3, 1.3, -0.8], 52), a, b), focus: () => chest(P1) };
    case "lampFlicker": return { cInf: 6, cam: move(cam([2.6, 1.6, 1.4], [1.2, 1.8, -2.4], 44), cam([2.35, 1.66, 0.95], [1.1, 1.85, -2.4], 44), a, b), focus: () => LAMP };
    case "wideSwirl": return { cInf: 4, cam: move(cam([-1.9, 1.75, 4.6], [0.15, 1.75, -0.6], 44), cam([-1.2, 1.7, 4.9], [0.15, 1.8, -0.6], 44), a, b), focus: () => chest(P1) };
    case "trackerUp": return { cInf: 5, cam: move(cam([1.3, 0.7, 4.6], [0.15, 3.0, -0.6], 46), cam([1.2, 0.72, 4.3], [0.15, 3.1, -0.6], 46), a, b), focus: () => chest(P1) };
    case "healClose": return { cInf: 9, cam: orbit(HEAD1, 2.9, 1.5, 15, 35, a, b, 36, 0.95), focus: () => HEAD1 };
    case "mediumPush": return { cInf: 5, cam: move(cam([-0.9, 1.35, 3.6], [0.25, 1.35, -0.8], 44), cam([-0.6, 1.35, 3.1], [0.3, 1.35, -0.8], 44), a, b), focus: () => chest(P1) };
    case "walkTrack": return { cInf: 5, cam: (f) => { const x = lerp3(P1, P2, walkProgress(f)); return cam([x[0] - 0.7, 1.45, 3.6], [x[0] + 0.3, 1.85, x[2]], 46); }, focus: (f) => chest(lerp3(P1, P2, walkProgress(f))) };
    default: return { cInf: 6, cam: move(cam([1.0, 1.05, 2.4], [1.2, 1.75, -1.55], 40), cam([1.02, 1.1, 2.0], [1.2, 1.78, -1.55], 40), a, b), focus: () => chest(P2) }; // takbirSide
  }
};
const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };   // ~40 degrees down, never steeper than 45
const QUIET_TOP: Cam = { pos: [1.25, 4.85, 4.55], look: [0.8, 0.0, -0.75], fov: 44, roll: 0 };
const ENDING = shotNamed("ending"), QUIET = shotNamed("quiet"), CARD = shotNamed("card");
const WHIPS = [{ from: F(A.your2) - 4, len: 8 }, { from: F(A.notifications) - 4, len: 8 }, { from: F(A.after) - 4, len: 8 }];
const lostAt = F(A.lost), mercyAt = F(A.mercy), allahAt = F(A.allah), withAt = F(A.and8);
const TURN_Q = F(A.turnQibla), TAKBIR = F(A.takbir);

/** the courtyard's lamp levels and the gold swirl at frame f */
const courtLevels = (f: number) => {
  let main = 1, lan = 1, night = 1, swirl = 0;
  const d = f - F(A.matchCut); if (d >= 0 && d < 12) main *= 1.25 - 0.25 * smooth(d / 12); // the glow it was matched from
  main *= 1 + 0.07 * Math.sin(f * 0.9) * Math.sin(f * 0.31 + 1) + (f >= F(A.failed) && f < lostAt ? 0.12 * Math.sin(f * 2.3) * Math.sin(f * 0.7) : 0);
  if (f >= lostAt && f < mercyAt) { const k = smooth((f - lostAt) / 4); main *= 1 - 0.96 * k; lan *= 1 - 0.95 * k; night *= 1 - 0.4 * k; } // every lamp goes out
  if (f >= mercyAt) { const k = smooth((f - mercyAt) / 10); main *= 0.3 + 0.95 * k; lan *= 0.3 + 0.8 * k; } // re-lit, warmer
  if (f >= allahAt - 6) swirl = smooth((f - allahAt + 6) / 30) * (1 - smooth((f - F(A.turn) + 10) / 20));
  return { levels: { main, lanterns: lan, night }, swirl };
};

const courtTraveller = (f: number, c: Cam): { trav: TravellerCard | null; head: V3 } => {
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
  const sh = shotOf(f).kind;
  let pos: V3 = P1, d: { key: string; draw: (p: Pen) => void; mirror: boolean };
  const endPhase = 0.25 + WALK.steps / 2;
  if (f < F(A.weight)) {                                          // the hadith: listening, then a hand to his chest on "his Salat"
    if (sh === "orbitHead") { const up = ramp(f, F(A.deed), F(A.deed) + 18); d = front(0.6 - 0.3 * up, 0.15 + 0.3 * up); }
    else if (sh === "archLow" || sh === "lampClose") d = front(0.2 + 0.15 * ramp(f, F(A.split), F(A.split) + 20), 0.35);
    else d = front(0.25, -0.3 - 0.2 * ramp(f, F(A.salat), F(A.salat) + 18), f >= F(A.salat) - 6 ? "chest" : "down");
  } else if (f < mercyAt) {                                       // the weight, "lost", the dark
    const turnPool = sh === "lampFlicker" ? 0.6 : sh === "poolLow" ? -0.3 : 0;
    d = front(turnPool * (1 - ramp(f, lostAt - 10, lostAt + 6)), -0.35 - 0.45 * ramp(f, lostAt, lostAt + 14));
  } else if (f < F(A.turn)) {                                     // the mercy: he lifts his head; a hand to his chest
    if (f < mercyAt + 36) { const u = ramp(f, mercyAt - 6, mercyAt + 14); d = front(0.35 * u, -0.6 + 1.0 * u); }
    else if (f < allahAt + 40) d = front(0.1, 0.1);
    else if (f < withAt) d = front(0.1, -0.2, "chest");
    else d = front(0.2, 0.15 + 0.2 * ramp(f, withAt, withAt + 20));
  } else {                                                        // the turn: the walk to the mat, the qibla, takbir
    const ph = 0.25 + (lerp3(P1, P2, walkProgress(f))[0] - P1[0]) / (2 * STRIDE_M);
    if (f < WALK.from - 3) { const lift = ramp(f, WALK.from - 30, WALK.from - 14); d = front(0.15 + 0.3 * lift, -0.2 + 0.3 * lift); }
    else if (f < WALK.from) d = q34(false);
    else if (f < WALK.to) { pos = lerp3(P1, P2, walkProgress(f)); d = side(false, ph, ramp(f, WALK.from, WALK.from + 10) * ramp(f, WALK.to, WALK.to - 10), 0, settle(f - WALK.from)); }
    else if (f < TURN_Q) { pos = P2; d = side(false, endPhase, 0, 0, settle(f - WALK.to)); }
    else if (f < TURN_Q + 3) { pos = P2; d = q34(false); }
    else if (f < TURN_Q + 6) { pos = P2; d = front(0, 0); }
    else if (f < TURN_Q + 9) { pos = P2; d = q34(true); }
    else { pos = P2; d = side(true, endPhase, 0, clamp01((f - TAKBIR) / 14), settle(f - (TURN_Q + 9))); } // takbir: hands up to the ears, held
  }
  const onMat = Math.abs(pos[0] - 0.85) < 0.66 && Math.abs(pos[2] + 1.6) < 0.38;
  const p2: V3 = [pos[0] + idle.sway, onMat ? 0.012 : 0, pos[2]];
  return { trav: { pos: p2, ...d }, head: [p2[0], 1.8, p2[2]] };
};

// ---------------- accents (camera punch / shake / flash), from the plan's hits ----------------
type Acc = { at: number; how: "punch" | "shake"; k: number; warm: boolean; ca?: number };
const CR = PLAN.cracks as Record<string, number>, MD = PLAN.mends as Record<string, number>;
const ACCENTS: Acc[] = [
  { at: F(A.money), how: "punch", k: 1.2, warm: true, ca: 9 }, { at: F(A.your2), how: "punch", k: 0.8, warm: true }, { at: F(A.your3), how: "punch", k: 0.8, warm: true },
  { at: F(A.first), how: "shake", k: 1.3, warm: false, ca: 12 }, { at: F(A.slam), how: "punch", k: 1.4, warm: true, ca: 10 },
  { at: F(A.chase), how: "shake", k: 0.6, warm: false }, { at: F(A.plans), how: "punch", k: 0.6, warm: true },
  ...Object.values(CR).map((s) => ({ at: F(s), how: "shake" as const, k: 0.7, warm: false, ca: 5 })),
  { at: lostAt, how: "shake", k: 1.2, warm: false, ca: 10 }, { at: F(A.merciful), how: "punch", k: 1.0, warm: true },
  { at: F(A.nextOne), how: "punch", k: 0.9, warm: true },
  ...Object.values(MD).map((s) => ({ at: F(s), how: "punch" as const, k: 0.35, warm: true })),
];
export const accentAt = (f: number): Accent & { ca: number } => {
  let punch = 0, shake = 0, flash = 0, warm = true, ca = 0;
  for (const a of ACCENTS) {
    const d = f - a.at;
    if (d < 0 || d > 30) continue;
    const env = d < 3 ? d / 3 : Math.exp(-(d - 3) / 7);
    if (a.how === "punch") punch = Math.max(punch, env * a.k);
    else shake = Math.max(shake, (d < 14 ? Math.exp(-d / 4) : 0) * a.k);
    const fl = (d < 10 ? (d < 2 ? d / 2 : Math.exp(-(d - 2) / 3)) : 0) * a.k * 0.6;
    if (fl > flash) { flash = fl; warm = a.warm; }
    if (a.ca) ca = Math.max(ca, a.ca * (d < 2 ? 1 : Math.exp(-(d - 2) / 3)));
  }
  return { punch, shake, flash, warm, ca };
};

// ---------------- the frame ----------------
export type FrameInfo = { frame: Frame; head: V3; screen?: V3; shot: PShot };
export const IRIS = { from: F(A.weight) - 7, len: 14 };
export const shotAt = (f: number, outgoing = false): FrameInfo => {
  const t = f / FPS;
  let sh = shotOf(f);
  if (outgoing && f >= IRIS.from && f < IRIS.from + IRIS.len) sh = shotOf(IRIS.from - 1);
  let fr: Frame, head: V3, screen: V3 | undefined;
  if (sh.set !== "courtyard") {
    const d = dayAt(f, sh);
    fr = { set: d.set, state: d.state, t: d.t, plan: d.plan, traveller: d.trav, hooks: { streetX: d.streetX, officeBanner: d.banner ?? null } };
    head = d.head; screen = d.screen;
    // whip pans in the day: the outgoing shot swings away, the incoming one swings in
    const wp = WHIPS.map((w) => ({ w, r: whipAt(f, w.from, w.len, 0.7) })).find((x) => x.r);
    if (wp?.r) {
      fr.plan = { ...fr.plan, cam: yawed(fr.plan.cam, wp.r.yaw), anchor: fr.plan.cam.look };
    }
  } else {
    let c: Cam, focus: V3, cInf = 6, nearScale = 1.6;
    let grooves: [number, number, number, number, number] | undefined, mark: [number, number, number, number, number] | undefined;
    const lv = courtLevels(f);
    let levels = lv.levels;
    if (f >= ENDING.from) {
      // the crane up and the star mark, then the quiet: the camera keeps drifting slowly up and round
      const from = shotCam(shotOf(ENDING.from - 1)).cam(ENDING.from);
      const u = clamp01((f - ENDING.from) / (ENDING.to - ENDING.from)), e = endingAt(Math.min(1, u), from, MARK, ENDING_TOP);
      const qk = glide(clamp01((f - QUIET.from) / (CARD.to - QUIET.from)));
      c = f < QUIET.from ? e.cam : { pos: lerp3(ENDING_TOP.pos, QUIET_TOP.pos, qk), look: lerp3(ENDING_TOP.look, QUIET_TOP.look, qk), fov: ENDING_TOP.fov + (QUIET_TOP.fov - ENDING_TOP.fov) * qk, roll: 0 };
      cInf = 2; focus = [MARK[0], 0, MARK[2]];
      const hold = f >= QUIET.from ? 1 : 0;
      const markInt = hold ? 0.85 + 0.15 * Math.sin(t * 1.3) : e.markIntensity, mainL = hold ? 0.32 : e.main;
      levels = { main: hold ? mainL : e.main, lanterns: hold ? 0.3 : e.lanterns, night: hold ? 0.72 : e.night };
      grooves = [MARK[0], MARK[2], hold ? 0 : e.grooveRadius, hold ? 0 : e.grooveIntensity, 0.15];
      mark = [MARK[0], MARK[2], 1.9, hold ? 1 : e.markProgress, markInt * (f >= CARD.from ? 1 - 0.6 * smooth((f - CARD.from) / 20) : 1)];
    } else {
      const b = shotCam(sh); c = b.cam(f); focus = b.focus(f); cInf = b.cInf; nearScale = b.nearScale ?? 1.6;
    }
    const ct = courtTraveller(f, c);
    fr = { set: "courtyard", state: "night", t, plan: { cam: c, focus, cInf, nearScale }, traveller: ct.trav, courtyard: { levels, grooves, mark, swirl: lv.swirl } };
    head = ct.head;
  }
  // handheld drift (more in the day) and the accents on every shot
  const day = sh.set !== "courtyard";
  const acc = accentAt(f), hh = handheld(f, day ? 2.2 : f >= ENDING.from ? 0.4 : 1), shk = acc.shake * 0.02;
  const c = fr.plan.cam;
  fr.plan = { ...fr.plan,
    cam: { ...c, pos: [c.pos[0] + hh.pos[0] + shk * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + shk * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]], look: add(c.look, hh.look), fov: c.fov * (1 - 0.06 * acc.punch), roll: (c.roll ?? 0) + shk * 2 * Math.sin(f * 3.3) },
    anchor: fr.plan.anchor ? add(fr.plan.anchor, hh.look) : undefined };
  return { frame: fr, head, screen, shot: sh };
};

// ---------------- the shatter ----------------
const FREEZE = shotNamed("freeze");
export const shatterAt = (f: number): Shatter | null => {
  if (f < FREEZE.from || f >= FREEZE.to) return null;
  const first = F(A.first), end = F(A.shatterEnd);
  const crack = clamp01((f - FREEZE.from - 2) / Math.max(1, first - FREEZE.from - 2));
  const fly = f < first ? 0 : clamp01((f - first) / Math.max(1, end - first));
  return { crack: 0.12 + 0.88 * Math.pow(crack, 0.7), fly: f >= end ? 1.02 : fly, black: f < first ? 0 : 0.6 + 0.4 * smooth((f - first) / 4), x: 560, y: 820 };
};

// ---------------- transitions and picture effects ----------------
const TRANS = PLAN.transitions as { type: string; at: number; into?: string }[];
export const WHIP_LIST = WHIPS;
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
/** where a world point lands on screen (px) for frame f's camera */
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
const CUTS = new Set(SHOTS.map((s) => s.from));
export const fxAt = (f: number): FrameFx => {
  const acc = accentAt(f), sh = shotOf(f);
  let blurX = 0, blurY = 0, glitch = 0, flash = 0, zoom: FrameFx["zoom"];
  // motion blur: how far the previous frame's look point moves on screen, never across a cut or in the frozen frame
  if (f > 0 && !CUTS.has(f) && sh.kind !== "freeze") {
    const fp = shotAt(f - 1).frame.plan.cam.look, a = project(f - 1, fp), b = project(f, fp);
    blurX = Math.min(40, Math.abs(b.x - a.x) * 0.45); blurY = Math.min(30, Math.abs(b.y - a.y) * 0.45);
    if (blurX < 1.2) blurX = 0; if (blurY < 1.2) blurY = 0;
  }
  // the crash-zoom: a radial rush of blur toward the landing
  if (sh.kind === "crash") { const u = U(f, sh); blurY = Math.max(blurY, 14 * u * u); zoom = { scale: 1 + 0.12 * u * u, x: 540, y: 900, blur: 6 * u * u }; }
  for (const tr of TRANS) {
    const d = f - F(tr.at);
    if (tr.type === "glitch" && d >= -4 && d < 4) glitch = Math.max(glitch, 1 - Math.abs(d + 0.5) / 4.5);
    if (tr.type === "flash") { if (d >= -5 && d < 0) flash = Math.max(flash, (d + 5) / 5); if (d >= 0 && d < 14) flash = Math.max(flash, 1 - d / 14); }
    if (tr.type === "crashLand" && d >= 0 && d < 6) zoom = { scale: 1.1 - 0.1 * (d / 6), x: 540, y: 900, blur: 6 * (1 - d / 6) };
    if (tr.type === "zoom") {
      if (d >= -9 && d < 0) {
        const at = F(tr.at) - 1, s = shotAt(at), p = tr.into === "laptop" && s.screen ? project(at, s.screen) : { x: 540, y: 1000 };
        const u = (d + 9) / 9; zoom = { scale: 1 + 5 * u * u, x: p.x, y: p.y, blur: 8 * u };
      }
      if (d >= 0 && d < 8) { const u = 1 - d / 8; zoom = { scale: 1 + 1.3 * u * u, x: 540, y: 960, blur: 6 * u }; }
    }
    if (tr.type === "punch" && d >= 0 && d < 6) zoom = { scale: 1.12 - 0.12 * (d / 6), x: 540, y: 900, blur: 3 * (1 - d / 6) };
    if (tr.type === "match" && d >= 0 && d < 8) flash = Math.max(flash, 0.35 * (1 - d / 8));
  }
  if (zoom) { blurX += zoom.blur; blurY += zoom.blur; }
  const dayPart = f < F(A.matchCut);
  return { blurX, blurY, ca: acc.ca + glitch * 4, glitch: dayPart ? glitch : 0, flash, vignette: dayPart ? 0.75 : 0.85, grain: true, zoom };
};
