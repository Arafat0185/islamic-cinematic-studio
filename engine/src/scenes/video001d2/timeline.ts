// Video 001 draft 2 - "A day of chasing": what every frame shows. All timing comes from plan.json
// (tools/plan_video001_d2.py), which also drives the sound mix, so picture and sound line up exactly.
// Day: bedroom (Fajr, alarm, jumps out of bed) -> street (rushing) -> office (Dhuhr, waves it off) -> street (Asr,
// on his phone) -> gym (Maghrib, keeps running) -> bedroom (Isha, scrolling; the phone goes dark; silence; the hook)
// -> flashbacks of the day -> star iris into the courtyard: hadith, the weight, the mercy, the turn, takbir, ending.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, glide, easeOut } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { endingAt } from "../../brand/sequences";
import { whipAt } from "../../brand/transitions";
import type { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import {
  travellerSide, travellerWalkPhase, travellerChair, travellerBedPhone, travellerThreeQuarterFront,
} from "../../characters/travellerPoses";
import { BEDROOM } from "../../sets/bedroom";
import { STREET, Vehicle } from "../../sets/street";
import { OFFICE } from "../../sets/office";
import { GYM } from "../../sets/gym";
import { MOON_FROM } from "../courtyard-beauty/world";
import { cam, move, orbit, chest, lerp3, settle, ramp, yawed, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, SetId, Frame, Plan, TravellerCard } from "../../story/story";
import PLAN from "../../../../videos/001-the-first-question/draft2/plan.json";

export const FPS = PLAN.fps;
export const FRAMES = PLAN.frames;
const { mends: MENDS, ...ANCH } = PLAN.anchors;
/** the story's named moments (seconds); MENDS: when each cracked dot is mended */
export const A = ANCH as Record<string, number>;
export { MENDS };
export const F = (s: number) => Math.round(s * FPS);
const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** a camera in a set's local coordinates -> world */
const inSet = (id: SetId, c: Cam): Cam => ({ ...c, pos: add(c.pos, SET_OFFSET[id]), look: add(c.look, SET_OFFSET[id]) });
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);

type Word = { section: number; word: string; start: number; end: number };
export const SENTENCES = PLAN.sentences as { index: number; section: number; start: number; end: number; words: Word[] }[];
export const wordAt = (sec: number, w: string) => {
  for (const s of SENTENCES) for (const x of s.words) if (x.section === sec && x.word.replace(/[^\p{L}']/gu, "").toLowerCase() === w) return x;
  throw new Error(`video001d2: no word "${w}" in section ${sec}`);
};

// ---------------- light directions (for the drawings' painted shading), per set ----------------
const SUN: Record<string, V3> = {
  dawn: [0.6, 1.2, 1.4], dawnAlarm: [0.6, 1.2, 1.4], morning: [0.8, 1.3, 1.2], night: [0.6, 1.2, 1.4], nightOff: [0.6, 1.2, 1.4],
  street_morning: [-0.55, 1.2, 0.9], street_afternoon: [1.0, 0.75, 0.7], noon: [0.5, 1.4, 1.1], sunset: [-0.6, 0.55, 1.0], courtyard: MOON_FROM,
};
const camRight = (c: Cam) => {
  const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize();
  return new THREE.Vector3(-f.z, 0, f.x);
};
const lightFor = (sunKey: string, c: Cam, mirror = false) => light2D(new THREE.Vector3(...SUN[sunKey]).normalize(), camRight(c), mirror);

// ---------------- the street: where he is, and the traffic timed to the sound ----------------
const MORNING = { x0: -4, t0: A.cutStreet - 0.28, speed: 1.9, stride: 0.6 };
const AFTERNOON = { x0: 18, t0: A.cutAsr, speed: 1.1, stride: 0.42 };
const streetX = (o: typeof MORNING, t: number) => o.x0 + o.speed * (t - o.t0);
export const TRAFFIC: Vehicle[] = [
  { kind: "car", passAt: A.car1, passX: streetX(MORNING, A.car1) + 0.9, speed: -12, lane: STREET.LANE_NEAR },
  { kind: "bus", passAt: A.bus, passX: streetX(MORNING, A.bus) + 0.9, speed: 8.5, lane: STREET.LANE_FAR, colour: "#c79c48" },
  { kind: "car", passAt: A.horn + 0.25, passX: streetX(MORNING, A.horn) - 6, speed: 10, lane: STREET.LANE_FAR, colour: "#2f5d8a" },
];

// ---------------- the day ----------------
type DayShot = { set: SetId; state: string; sun: string; plan: Plan; trav: TravellerCard | null; head: V3; streetX?: number; banner?: string | null };
const PHONE_FRAMES = (t: number, a: number, b: number) => smooth((t - a) / 0.15) * (1 - smooth((t - b) / 0.15));
const plan = (c: Cam, focus: V3, cInf = 5, nearScale = 1.6): Plan => ({ cam: c, focus, cInf, nearScale });

/** the day at film time t (seconds); also used, with remapped times, by the flashbacks */
const dayAt = (t: number): DayShot => {
  const tt = t;
  // ---- bedroom, Fajr and the morning rush out of bed ----
  if (tt < A.cutStreet) {
    const state = tt < A.alarmBuzz ? "dawn" : tt < 2.6 ? "dawnAlarm" : "morning";
    const sunKey = state;
    let c: Cam;
    if (tt < A.timeJump) c = inSet("bedroom", move(cam([-0.15, 1.6, 1.75], [-1.25, 0.92, -1.3], 44), cam([-0.32, 1.48, 1.35], [-1.3, 0.9, -1.3], 44), 0, F(A.timeJump))(F(tt)));
    else c = inSet("bedroom", move(cam([1.9, 1.5, 3.6], [0.5, 1.38, -1.0], 46), cam([2.1, 1.48, 3.1], [0.9, 1.38, -0.8], 46), F(A.timeJump), F(A.cutStreet))(F(tt)));
    const light = lightFor(sunKey, c);
    let trav: TravellerCard, head: V3;
    if (tt < A.jumpOut) {
      let roll = Math.PI / 2;
      if (tt > A.label1min && tt < A.label1min + 0.5) roll += 0.07 * Math.sin((tt - A.label1min) * 25) * (1 - (tt - A.label1min) / 0.5); // rolls over
      if (tt > A.alarmLoud) roll += 0.03 * Math.sin(tt * 70);                                                                         // startled
      trav = { pos: W("bedroom", BEDROOM.LYING), key: `lie|${light}`, draw: (p: Pen) => travellerSide(p, { light }), roll, blob: null };
      head = W("bedroom", [BEDROOM.LYING[0] - 1.65, BEDROOM.LYING[1] + 0.05, BEDROOM.LYING[2]]);
    } else if (tt < A.land) {                                                               // jumps out of bed
      const u = easeOut((tt - A.jumpOut) / (A.land - A.jumpOut));
      const p0 = W("bedroom", BEDROOM.LYING), p1 = W("bedroom", BEDROOM.STAND);
      const pos: V3 = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u + 0.35 * Math.sin(Math.PI * u), p0[2] + (p1[2] - p0[2]) * u];
      const ph = q(0.25 + 0.4 * u, 40);
      trav = { pos, key: `jump|${ph}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 0.8, 0.5 / SU, { light, swing: 1.8 }), roll: (Math.PI / 2) * (1 - u), blob: null };
      head = add(pos, [0, 1.8, 0]);
    } else {                                                                                // lands, and starts off
      const d = Math.max(0, tt - A.land - 0.08) * 1.6, ph = q(0.25 + d / 1.2, 60), k = smooth((tt - A.land) / 0.15);
      const pos = W("bedroom", [BEDROOM.STAND[0] + d, 0, BEDROOM.STAND[2]]);
      trav = { pos, key: `go|${ph}|${q(k, 10)}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, k, 0.6 / SU, { light, swing: 1.8, bob: -12 * (1 - smooth((tt - A.land) / 0.12)) }), roll: -0.05 * k };
      head = add(pos, [0, 1.8, 0]);
    }
    return { set: "bedroom", state, sun: sunKey, plan: plan(c, add(head, [0, -0.3, 0]), 6), trav, head };
  }
  // ---- street, morning: rushing ----
  if (tt < A.cutOffice) {
    const x = streetX(MORNING, tt), ph = q(0.25 + (x - MORNING.x0) / (2 * MORNING.stride), 240);
    const c = inSet("street", cam([x + 0.2, 1.6, 7.6], [x + 0.45, 2.3, 0.9], 48));
    const light = lightFor("street_morning", c), phone = q(PHONE_FRAMES(tt, A.phoneCheck, A.phoneCheck + 0.6), 10);
    const pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
    return {
      set: "street", state: "morning", sun: "street_morning", streetX: x, plan: plan(c, add(pos, [0, 1.3, 0]), 2.5),
      trav: { pos, key: `rush|${ph}|${phone}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 1, MORNING.stride / SU, { light, swing: 1.8 * (1 - phone), phone }), roll: -0.05 },
      head: add(pos, [0, 1.8, 0]),
    };
  }
  // ---- office, Dhuhr: on a call; the reminder; he waves it off ----
  if (tt < A.cutAsr) {
    let c: Cam;
    if (tt < 9.3) c = inSet("office", move(cam([0.9, 1.45, 2.9], [0.35, 1.2, -0.8], 42), cam([0.75, 1.42, 2.5], [0.35, 1.2, -0.8], 42), F(A.cutOffice), F(9.3))(F(tt)));
    else if (tt < 10.95) c = inSet("office", move(cam([2.2, 1.45, 2.2], [0.4, 1.18, -0.8], 42), cam([2.4, 1.5, 1.7], [0.45, 1.18, -0.8], 42), F(9.3), F(10.95))(F(tt)));
    else c = inSet("office", move(cam([1.25, 1.35, 1.3], [0.85, 1.08, -0.8], 38), cam([1.0, 1.25, 0.8], [0.88, 1.05, -0.82], 38), F(10.95), F(A.cutAsr))(F(tt)));
    const light = lightFor("noon", c);
    const waving = tt > A.wave && tt < A.wave + 1.0;
    const tilt = waving ? 0.1 : tt > A.dhuhrTone + 0.1 && tt < A.wave ? 0.35 : -0.15 + 0.05 * Math.sin(tt * 9);
    const wave = q(((tt - A.wave) * 2.6) % 1, 24), tq = q(tilt, 20);
    const pos = W("office", OFFICE.CHAIR);
    return {
      set: "office", state: "noon", sun: "noon", banner: tt > A.laptopPing ? "+3 meetings" : null,
      plan: plan(c, add(pos, [0.25, 1.05, 0]), 4),
      trav: { pos, key: `chair|${waving ? "w" + wave : "t"}|${tq}|${light}`, draw: (p: Pen) => travellerChair(p, { light, arms: waving ? "wave" : "type", wave, tilt: tq }), blob: null },
      head: add(pos, [0.05, 1.25, 0]),
    };
  }
  // ---- street, Asr: on his phone; notifications ----
  if (tt < A.cutGym) {
    const x = streetX(AFTERNOON, tt), ph = q(0.25 + (x - AFTERNOON.x0) / (2 * AFTERNOON.stride), 240);
    const c = inSet("street", cam([x - 0.7 + 0.1 * (tt - A.cutAsr), 1.65, 5.0], [x + 0.2, 2.0, 0.9], 44));
    const light = lightFor("street_afternoon", c);
    const phone = q(1 - 0.85 * PHONE_FRAMES(tt, A.asrTone + 0.1, A.asrTone + 0.55), 10); // glances up at the tone, then back down
    const pos = W("street", [x, STREET.KERB - 0.02, STREET.WALK_Z]);
    return {
      set: "street", state: "afternoon", sun: "street_afternoon", streetX: x, plan: plan(c, add(pos, [0, 1.55, 0]), 3),
      trav: { pos, key: `asr|${ph}|${phone}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 0.7, AFTERNOON.stride / SU, { light, phone }) },
      head: add(pos, [0, 1.8, 0]),
    };
  }
  // ---- gym, Maghrib: running on the treadmill, he keeps running ----
  if (tt < A.cutNight) {
    const stride = 0.65, ph = q(0.25 + (GYM.BELT_SPEED * (tt - A.cutGym)) / (2 * stride), 240);
    let c: Cam;
    if (tt < 16.9) c = inSet("gym", move(cam([0.6, 1.55, 2.6], [-0.1, 1.75, -0.9], 46), cam([0.85, 1.55, 2.25], [-0.05, 1.75, -0.9], 46), F(A.cutGym), F(16.9))(F(tt)));
    else c = inSet("gym", move(cam([1.4, 0.75, 2.7], [-0.2, 1.55, -0.9], 46), cam([1.5, 0.78, 2.35], [-0.15, 1.6, -0.9], 46), F(16.9), F(A.cutNight))(F(tt)));
    const light = lightFor("sunset", c), pos = W("gym", GYM.RUN);
    return {
      set: "gym", state: "sunset", sun: "sunset", plan: plan(c, add(pos, [0, 1.2, 0]), 4),
      trav: { pos, key: `run|${ph}|${light}`, draw: (p: Pen) => travellerWalkPhase(p, ph, 1, stride / SU, { light, swing: 1.9 }), roll: -0.06, blob: null },
      head: add(pos, [0, 1.8, 0]),
    };
  }
  // ---- bedroom, Isha and the night: scrolling; the phone goes dark; silence; the hook ----
  const off = tt >= A.phoneOff, state = off ? "nightOff" : "night";
  const c = tt < A.phoneOff
    ? inSet("bedroom", move(cam([0.9, 1.72, 1.95], [-1.0, 1.2, -1.3], 40), cam([0.6, 1.64, 1.6], [-1.0, 1.18, -1.3], 40), F(A.cutNight), F(A.phoneOff))(F(tt)))
    : inSet("bedroom", move(cam([0.6, 1.64, 1.6], [-1.0, 1.18, -1.3], 40), cam([1.2, 2.0, 3.0], [-0.8, 1.05, -1.3], 46), F(A.phoneOff), F(A.fb1))(F(tt)));
  const light = lightFor(state, c), scroll = off ? 0 : q(((tt - A.cutNight) * 1.4) % 1, 12);
  const pos = W("bedroom", BEDROOM.SIT);
  return {
    set: "bedroom", state, sun: state, plan: plan(c, add(pos, [0.2, 0.55, 0]), 7),
    trav: { pos, key: `bed|${scroll}|${off}|${light}`, draw: (p: Pen) => travellerBedPhone(p, { light, scroll, dark: off }), blob: null },
    head: add(pos, [0.05, 0.8, 0]),
  };
};

/** the flashbacks replay moments of the day (film time -> the day's time) */
const FLASH: [number, number, number][] = [
  [A.fb1, A.fb2, 4.0], [A.fb2, A.fb3, A.wave - 0.15], [A.fb3, A.fbDeadlines, 16.3],
  [A.fbDeadlines, A.fbNotif, 11.0], [A.fbNotif, A.fbPlans, A.asrTone + 0.8], [A.fbPlans, A.iris + 0.5, A.phoneCheck - 0.2],
];
const flashTime = (t: number) => { for (const [a, b, src] of FLASH) if (t >= a && t < b) return src + (t - a); return t; };

// ---------------- the courtyard ----------------
const P1: V3 = [0.15, 0, -0.6], P2: V3 = [1.3, 0, -1.55], MARK: V3 = [0.75, 0, -0.7], HEAD1: V3 = [P1[0], 1.72, P1[2]];
const IRIS_LEN = 14, WHIP_LEN = 10;
const WALK = { from: F(A.walk), to: F(A.walkEnd), steps: 4 };
const STRIDE_M = (P2[0] - P1[0]) / WALK.steps;
const walkProgress = (f: number) => {
  const T = WALK.to - WALK.from, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - WALK.from));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
const QUOTE = { from: F(SENTENCES[9].start) - 2, to: F(SENTENCES[9].end) + 14 };
const matCam = move(cam([1.6, 2.15, 0.95], [1.25, 1.1, -1.9], 42), cam([1.5, 1.25, 0.5], [0.9, 0.08, -1.6], 42), QUOTE.from, F(A.whip1));
const introCam = orbit(HEAD1, 2.3, 1.55, -50, -40, F(A.iris) - 7, QUOTE.from, 30, 0.2);
type CBeat = { from: number; cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number };
const CB: CBeat[] = [
  { from: F(A.iris), cInf: 8, cam: (f) => (f < QUOTE.from ? introCam(f) : matCam(f)),
    focus: (f) => (f < QUOTE.from ? HEAD1 : lerp3([1.4, 1.3, -2.2], [0.95, 0.1, -1.55], ramp(f, QUOTE.from, QUOTE.from + 60))) },
  { from: F(A.whip1), cInf: 4, cam: move(cam([-0.6, 1.9, 4.3], [0.3, 1.0, -1.0], 50), cam([-0.45, 5.0, 6.8], [0.4, 0.2, -1.3], 50), F(A.whip1), F(A.whip2)), focus: () => chest(P1) },
  { from: F(A.whip2), cInf: 3, cam: move(cam([-1.1, 3.6, 2.95], [-0.3, 0.3, -0.05], 48), cam([-0.95, 3.4, 2.6], [-0.28, 0.35, -0.1], 48), F(A.whip2), F(A.whip3)), focus: () => [P1[0], 0.9, P1[2]] },
  { from: F(A.whip3), cInf: 5, cam: move(cam([-0.9, 1.35, 3.6], [0.4, 1.35, -1.0], 46), cam([-0.2, 1.35, 3.2], [1.1, 1.35, -1.4], 46), F(A.whip3), F(72.4)), focus: (f) => chest(lerp3(P1, P2, walkProgress(f))) },
  { from: F(72.4), cInf: 6, cam: move(cam([1.0, 1.05, 2.4], [1.2, 1.75, -1.55], 40), cam([1.02, 1.1, 2.0], [1.2, 1.78, -1.55], 40), F(72.4), F(A.ending)), focus: () => chest(P2) },
];
const cbeatAt = (f: number) => { let b = CB[0]; for (const x of CB) if (f >= x.from) b = x; return b; };
const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };
const ENDING = { from: F(A.ending), len: 90 };
const WHIPS = [A.whip1, A.whip2, A.whip3].map((s, i) => ({ from: F(s) - WHIP_LEN / 2, len: WHIP_LEN, out: CB[i], in: CB[i + 1] }));
const mercyAt = F(A.mercyWord), allahAt = F(wordAt(6, "allah").start), withAt = F(wordAt(6, "with").start);
const lostAt = F(A.lostWord), sentenceStart = (i: number) => F(SENTENCES[i].start);
const TURN_Q = F(A.turnQibla), TAKBIR = F(A.takbir);

const courtTraveller = (f: number, c: Cam): { trav: TravellerCard; head: V3 } => {
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
  let pos: V3 = P1, d: { key: string; draw: (p: Pen) => void; mirror: boolean };
  const endPhase = 0.25 + WALK.steps / 2;
  // small actions keep him alive inside the long sentences: looks up at the sky (36.2 s), bows further during the
  // quote (42.2 s), turns toward the pool (49.6 s), lifts his head toward the mat (68.7 s); a nod (35.0 s), back to
  // the lamp (37.6 s), a hand on his chest (47.6 - 49.4 s)
  const up = ramp(f, F(36.2), F(36.2) + 18), bow = ramp(f, F(42.2), F(42.2) + 16), pool = ramp(f, F(49.6), F(49.6) + 18);
  const nod = ramp(f, F(35.0), F(35.0) + 12) * (1 - ramp(f, F(35.8), F(35.8) + 12)), back = ramp(f, F(37.6), F(37.6) + 16);
  const heart = f >= F(47.6) && f < F(49.4);
  if (f < F(A.whip1)) d = f < QUOTE.from ? front(0.6 - 0.45 * up + 0.4 * back, 0.15 - 0.25 * nod + 0.35 * up - 0.3 * back) : front(0.25, -0.3 - 0.25 * bow, "chest");
  else if (f < F(A.whip2)) d = front(-0.45 * pool * (1 - ramp(f, lostAt - 10, lostAt + 6)), -0.4 - 0.3 * ramp(f, lostAt, lostAt + 16), heart ? "chest" : "down");
  else if (f < F(A.whip3)) {
    if (f < mercyAt + 30) { const u = ramp(f, mercyAt - 6, mercyAt + 14); d = front(0.4 * u, -0.45 + 0.7 * u); }
    else if (f < allahAt) d = front(0.1, -0.4);
    else if (f < withAt) d = front(0.1, -0.25, "chest");
    else d = front(0.2, 0.05 + 0.15 * ramp(f, withAt, withAt + 20));
  } else {
    const ph = 0.25 + (lerp3(P1, P2, walkProgress(f))[0] - P1[0]) / (2 * STRIDE_M);
    if (f < WALK.from - 3) { const lift = ramp(f, F(68.7), F(68.7) + 16); d = front(0.15 + 0.3 * lift, -0.2 + 0.3 * lift); }
    else if (f < WALK.from) d = q34(false);
    else if (f < WALK.to) { pos = lerp3(P1, P2, walkProgress(f)); d = side(false, ph, ramp(f, WALK.from, WALK.from + 10) * ramp(f, WALK.to, WALK.to - 10), 0, settle(f - WALK.from)); }
    else if (f < TURN_Q) { pos = P2; d = side(false, endPhase, 0, 0, settle(f - WALK.to)); }
    else if (f < TURN_Q + 3) { pos = P2; d = q34(false); }
    else if (f < TURN_Q + 6) { pos = P2; d = front(0, 0); }
    else if (f < TURN_Q + 9) { pos = P2; d = q34(true); }
    else { pos = P2; d = side(true, endPhase, 0, clamp01((f - TAKBIR) / 24), settle(f - (TURN_Q + 9))); }
  }
  const p2: V3 = [pos[0] + idle.sway, 0, pos[2]];
  return { trav: { pos: p2, ...d }, head: [p2[0], 1.8, p2[2]] };
};

// ---------------- accents ----------------
const ACCENTS: { at: number; how: "punch" | "shake"; k: number; warm: boolean }[] = [
  ...["fajrCrack", "dhuhrCrack", "asrCrack", "maghribCrack", "ishaCrack"].map((k) => ({ at: F(A[k]), how: "shake" as const, k: 0.6, warm: false })),
  { at: F(A.alarmLoud), how: "shake", k: 0.7, warm: true }, { at: F(A.land), how: "shake", k: 0.8, warm: true },
  { at: F(A.firstWord), how: "punch", k: 1, warm: true }, { at: F(A.lostWord), how: "shake", k: 1, warm: false },
  { at: F(A.mercyWord), how: "punch", k: 1, warm: true },
  ...MENDS.map((s) => ({ at: F(s), how: "punch" as const, k: 0.35, warm: true })),
];
export const accentAt = (f: number): Accent => {
  let punch = 0, shake = 0, flash = 0, warm = true;
  for (const a of ACCENTS) {
    const d = f - a.at;
    if (d < 0 || d > 30) continue;
    const env = d < 3 ? d / 3 : Math.exp(-(d - 3) / 7);
    if (a.how === "punch") punch = Math.max(punch, env * a.k);
    else shake = Math.max(shake, (d < 12 ? Math.exp(-d / 4) : 0) * a.k);
    const fl = (d < 10 ? (d < 2 ? d / 2 : Math.exp(-(d - 2) / 3)) : 0) * a.k;
    if (fl > flash) { flash = fl; warm = a.warm; }
  }
  return { punch, shake, flash, warm };
};

// ---------------- the frame ----------------
export type Shot = { frame: Frame; head: V3; tracker: boolean };
export const shotAt = (f: number, outgoing = false): Shot => {
  const t = f / FPS;
  const inIris = f >= F(A.iris) && f < F(A.iris) + IRIS_LEN;
  let fr: Frame, head: V3;
  if (t < A.fb1 || (outgoing && inIris) || (t < A.iris && t >= A.fb1)) {
    const src = t >= A.fb1 ? flashTime(t) : t;
    const d = dayAt(src);
    fr = { set: d.set, state: d.state, t: src, plan: d.plan, traveller: d.trav, hooks: { streetX: d.streetX, officeBanner: d.banner ?? null } };
    head = d.head;
  } else {
    // the courtyard
    let beat = cbeatAt(f), c = beat.cam(f), focus = beat.focus(f), cInf = beat.cInf, anchor: V3 | undefined;
    for (const w of WHIPS) { const r = whipAt(f, w.from, w.len); if (r) { const b = r.side === "out" ? w.out : w.in, bc = b.cam(f); anchor = bc.look; c = yawed(bc, r.yaw); focus = b.focus(f); cInf = b.cInf; beat = b; } }
    type Five = [number, number, number, number, number];
    let levels = { main: 1, lanterns: 1, night: 1 }, grooves: Five | undefined, mark: Five | undefined;
    if (f >= ENDING.from) {
      const u = (f - ENDING.from) / ENDING.len, e = endingAt(u, CB[4].cam(ENDING.from), MARK, ENDING_TOP);
      const dim = 1 - 0.85 * smooth((f - F(A.card) + 6) / 14);
      c = e.cam; cInf = 2; focus = [MARK[0], 0, MARK[2]];
      levels = { main: e.main, lanterns: e.lanterns, night: e.night };
      grooves = [MARK[0], MARK[2], e.grooveRadius, e.grooveIntensity * dim, 0.15];
      mark = [MARK[0], MARK[2], 1.9, e.markProgress, e.markIntensity * dim];
    }
    const ct = courtTraveller(f, c);
    fr = { set: "courtyard", state: "night", t, plan: { cam: c, focus, cInf, nearScale: 1.6, anchor }, traveller: ct.trav, courtyard: { levels, grooves, mark } };
    head = ct.head;
  }
  // handheld drift and the accents, on every shot
  const acc = accentAt(f), hh = handheld(f, f >= ENDING.from ? Math.max(0, 1 - (f - ENDING.from) / 40) : 1), sh = acc.shake * 0.014;
  const c = fr.plan.cam;
  fr.plan = {
    ...fr.plan,
    cam: { ...c, pos: [c.pos[0] + hh.pos[0] + sh * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + sh * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]], look: add(c.look, hh.look), fov: c.fov * (1 - 0.05 * acc.punch) },
    anchor: fr.plan.anchor ? add(fr.plan.anchor, hh.look) : undefined,
  };
  const tracker = t < A.trackerHide || (t >= A.trackerShow && t < A.ending);
  return { frame: fr, head, tracker };
};

export const IRISES = [{ from: F(A.iris), len: IRIS_LEN }];
export const WHIP_LIST = [
  ...["cutStreet", "cutOffice", "cutAsr", "cutGym", "cutNight"].map((k) => ({ from: F(A[k]) - 4, len: 8 })),
  ...WHIPS.map(({ from, len }) => ({ from, len })),
];
void glide;
