// "The First Question - QURAN", 11-61 s: a little life story under the recitation (shots.json, 1-4 s each; something
// is always happening, the camera follows the action). Every shot returns the frame: set, state, camera, the Traveller
// and the other faceless characters (characters/people.ts). Props and background motion: life.ts.
//   19:60 except those who repent ...   alarm -> phone face-down -> gets up -> wudu -> out into the pre-dawn street
//   ... will enter Paradise (twice)     a friend joins him -> sandals off at the masjid door -> the row: standing, ruku, sujood
//   ... not be wronged at all           an old man drops his bags; he picks them up and carries them for him
//   19:61 gardens ... in the unseen     kids round the fountain, a cat drinking, their ball -> night: praying alone
//   His promise ...                     sunrise time-lapse; he opens the window, the light falls on him
//   19:62 no ill speech, only peace     waving to the shopkeeper, a hug at the masjid door, a handshake
//   ... provision morning and afternoon breakfast with his father and little brother -> match cut: a sunset meal with friends
//   19:63 That is Paradise ...          reading the Quran under the lamp, teaching a boy
// Rules: men and boys only, faceless; the camera never looks down more than 45 degrees; nothing between the lens and him.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import type { Pen } from "../../draw/toon";
import { travellerLying, travellerChair } from "../../characters/travellerPoses";
import { walker, waveArm, reachArm, wuduArms, stoop, sit, hug, cat, pigeon, back, ruku, sujood, jalsa, type Card, type SitArms } from "../../characters/people";
import { BEDROOM } from "../../sets/bedroom";
import { STREET } from "../../sets/street";
import { MOON_FROM } from "../courtyard-beauty/world";
import { cam, move } from "../toolkit/timeline";
import { SET_OFFSET, SetId, Frame, TravellerCard } from "../../story/story";
import TIMING from "../../../../videos/001-the-first-question/quran/timing.json";
import STORY from "../../../../videos/001-the-first-question/quran/shots.json";

const FPS = TIMING.fps, F = (s: number) => Math.round(s * FPS);
const EVS = STORY.events as unknown as { flip: number; bagDrop: number; ball: number[]; window: number };
const FLIP = F(EVS.flip), BAG_DROP = F(EVS.bagDrop), BALL = EVS.ball.map(F), WINDOW = F(EVS.window);
export const MID_KINDS = new Set(["alarm", "phoneDown", "rise", "wudu", "door", "friend", "shoes", "rowStand", "rowRuku", "rowSujood", "bags", "help",
  "garden", "ball", "nightPray", "nightSujood", "lapse", "window", "wave", "hug", "handshake", "breakfast", "sunsetMeal", "reading", "teaching"]);

type Sh = { kind: string; set: SetId; from: number; to: number };
const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
const inSet = (id: SetId, c: Cam): Cam => ({ ...c, pos: W(id, c.pos), look: W(id, c.look) });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ramp = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

// ---------------- light and facing ----------------
const LDIR: Record<string, V3> = {
  bedDawn: [0.7, 1.2, 1.2], bedNight: [-1.4, 0.7, -0.9], bedMorning: [0.35, 0.9, -1.2], wash: [0.5, 1.3, 0.6],
  streetDawn: [0.3, 1.3, 0.8], streetDay: [-0.55, 1.2, 0.9], court: MOON_FROM as V3,
};
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightOf = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...LDIR[k]).normalize(), camRight(c), mirror), 30);
/** a side view facing world direction (dx, dz) is mirrored when that direction points to the screen's left */
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };

// ---------------- cards ----------------
type PutOpts = { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null; shadow?: boolean };
const put = (set: SetId, c: Card, p: V3, o: PutOpts = {}): TravellerCard => ({ pos: W(set, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob, castShadow: o.shadow });
const STRIDE = 0.42;                                                     // metres per step (calm walk)
/** a walker card for someone who has walked `dist` metres (phase follows the distance so feet do not slide) */
const walkC = (look: string, dist: number, k: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}, strideM = STRIDE, scale = 1) =>
  walker(look, { phase: q(0.25 + dist / (2 * strideM), 240), k: q(k, 20), stride: Math.round(strideM / (SU * scale)), light: L, shawlNear: mirror, ...extra });
const BAGS = "#d9c7a0", HOLD: Parameters<typeof walker>[1] = { armN: { E: [300, 460], W: [306, 600], hand: "dot" }, armF: { E: [296, 462], W: [300, 602], hand: "dot" } };

export type Mid = { frame: Frame; head: V3 };
const COURT_LEVELS = { main: 1.05, lanterns: 1.0, night: 0.9 };

/** the frame of a mid-section shot */
export const midAt = (f: number, sh: Sh): Mid => {
  const t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), tl = (f - a) / FPS;
  const mk = (set: SetId, state: string, c: Cam, focus: V3, cInf: number, trav: TravellerCard | null, others: TravellerCard[], head: V3, extra: Partial<Frame> = {}): Mid => ({
    frame: { set, state, t, plan: { cam: inSet(set, c), focus: W(set, focus), cInf, nearScale: 1.5 }, traveller: trav, others, ...(set === "courtyard" ? { courtyard: { levels: COURT_LEVELS } } : {}), ...extra },
    head: W(set, head),
  });
  switch (sh.kind) {
    // ======================= home, before Fajr =======================
    case "alarm": { // he stirs in bed; the phone glows on the nightstand; the cat sits by the window
      const c = move(cam([0.95, 1.2, 1.15], [-1.3, 0.75, -1.45], 44), cam([0.55, 1.08, 0.7], [-1.45, 0.72, -1.5], 40), a, b)(f);
      const L = lightOf("bedDawn", c), st = q(0.35 + 0.35 * Math.sin(tl * 5) * smooth(u * 3), 10);
      const trav = put("bedroom", { key: `lie|${st}|${L}`, draw: (p) => travellerLying(p, { light: L, stir: st }) }, BEDROOM.LYING, { wide: true, blob: null });
      return mk("bedroom", "dawnAlarm", c, [BEDROOM.LYING[0] - 0.86, 0.8, BEDROOM.LYING[2]], 6, trav,
        [put("bedroom", cat("sit", 0, lightOf("bedDawn", c, true)), [1.25, 0.012, -1.55], { mirror: true })], [BEDROOM.LYING[0] - 0.86, 0.85, BEDROOM.LYING[2]]);
    }
    case "phoneDown": { // close on the nightstand (the phone itself is drawn in 2D on top, Overlay.tsx)
      const c = move(cam([-2.35, 1.2, -0.45], [-2.17, 0.6, -1.71], 42), cam([-2.3, 1.08, -0.75], [-2.17, 0.58, -1.71], 38), a, b)(f);
      return mk("bedroom", f < FLIP + 8 ? "dawnAlarm" : "dawn", c, BEDROOM.PHONE, 8, null, [], [0, 1.2, 0]);
    }
    case "rise": { // sitting up on the edge of the bed, then getting up and walking off to wash
      const c = move(cam([0.6, 0.95, 1.75], [-0.45, 0.88, -0.3], 44), cam([0.8, 1.22, 1.6], [-0.15, 1.22, -0.3], 44), a, b)(f);
      const L = lightOf("bedDawn", c), E = BEDROOM.EDGE, sUp = a + 14, sGo = a + 26;
      let trav: TravellerCard, head: V3;
      if (f < sUp) { const tilt = q(-0.15 + 0.1 * Math.sin(tl * 4), 20); trav = put("bedroom", { key: `edge|${tilt}|${L}`, draw: (p) => travellerChair(p, { light: L, arms: "rest", tilt, chair: false }) }, E, { yaw: 0, blob: null }); head = [E[0] + 0.05, 1.25, E[2]]; }
      else if (f < sGo) { const k = 0.7 * (1 - smooth((f - sUp) / (sGo - sUp))); trav = put("bedroom", stoop("traveller", k, L), E, { yaw: 0 }); head = [E[0], 1.8 - 0.6 * k, E[2]]; }
      else { const d = 0.8 * Math.pow((f - sGo) / FPS, 1.3); trav = put("bedroom", walkC("traveller", d, ramp(f, sGo, sGo + 8), L, false), [E[0] + d, E[1], E[2]], { yaw: 0 }); head = [E[0] + d, 1.8, E[2]]; }
      return mk("bedroom", "dawn", c, add(trav.pos.map((v, i) => v - SET_OFFSET.bedroom[i]) as V3, [0, 1.1, 0]), 5, trav, [], head);
    }
    case "wudu": { // the wash corner (built at x ~ 12 in the bedroom's world): water from the tap over his hands
      const c = move(cam([11.85, 1.5, 1.75], [11.72, 1.25, -0.85], 42), cam([11.8, 1.45, 1.45], [11.74, 1.22, -0.85], 40), a, b)(f);
      const L = lightOf("wash", c), w = wuduArms(q(tl, 15));
      const trav = put("bedroom", walker("traveller", { armN: w.N, armF: w.F, headRot: 0.22, light: L }), WASH.STAND);
      return mk("bedroom", "dawn", c, [11.8, 1.05, -0.85], 6, trav, [], [WASH.STAND[0], 1.75, WASH.STAND[2]]);
    }
    // ======================= the street before Fajr =======================
    case "door": { // out of his front door, onto the pavement, walking toward the masjid
      const go = a + 6, d = Math.max(0, (f - go) / FPS) * 0.82, x = DOOR_X + d, z = lerp(0.12, STREET.WALK_Z, smooth(d / 0.7));
      const c = cam([x - 1.75, 1.55, 4.6], [x + 0.3, 1.42, 0.6], 40);
      const L = lightOf("streetDawn", c), pos: V3 = [x, STREET.KERB - 0.02, z];
      const trav = put("street", walkC("traveller", d, ramp(f, go, go + 8), L, false), pos);
      const others = [
        put("street", walkC("w2", 3 + tl * 0.8, 1, L, false), [x + 3.0 + tl * 0.05, STREET.KERB - 0.02, 0.45]),            // a man ahead, also walking to the masjid
        put("street", cat("walk", tl * 1.6, lightOf("streetDawn", c, true)), [x + 2.6 - tl * 0.55, STREET.KERB - 0.02, 0.15], { mirror: true }),
      ];
      return mk("street", "dawn", c, add(pos, [0, 1.3, 0]), 4, trav, others, add(pos, [0, 1.8, 0]), { hooks: { streetX: x, officeBanner: null } });
    }
    case "friend": { // a friend waiting under the lamp waves, falls into step beside him
      const x = 31.0 + tl * 0.82, join = a + 18, fx = f < join ? 32.05 : 32.05 + (f - join) / FPS * 0.82;
      const m = (x + fx) / 2, c = cam([m - 1.75, 1.55, 4.6], [m + 0.25, 1.42, 0.6], 40);
      const L = lightOf("streetDawn", c), y = STREET.KERB - 0.02;
      const trav = put("street", walkC("traveller", tl * 0.82, 1, L, false), [x, y, 1.0]);
      const friend = f < join
        ? put("street", walker("friend", { armN: waveArm(q(tl * 2.2, 12)), light: lightOf("streetDawn", c, true), shawlNear: true }), [fx, y, 0.5], { mirror: true })
        : put("street", walkC("friend", fx - 32.05, ramp(f, join, join + 8), L, false), [fx, y, 0.5]);
      const others = [friend, put("street", walkC("w6", tl * 0.9, 1, lightOf("streetDawn", c, true), true), [m + 2.4 - tl * 0.9, y, 0.2], { mirror: true })];
      return mk("street", "dawn", c, [m, 1.3, 0.8], 4, trav, others, [x, 1.8, 1.0], { hooks: { streetX: m, officeBanner: null } });
    }
    // ======================= the masjid =======================
    case "shoes": { // low at the threshold: sandals off by the rack, barefoot inside
      const c = move(cam([1.2, 0.55, 3.1], [-0.35, 0.72, 6.45], 44), cam([1.35, 0.55, 3.15], [0.05, 0.72, 6.45], 42), a, b)(f);
      const L = lightOf("court", c), stop = a + 26, off = SHOE_OFF, resume = a + 42;
      const xAt = (g: number) => g < stop ? -0.85 + 0.82 * (g - a) / FPS * 1.0 : g < resume ? -0.85 + 0.82 * (stop - a) / FPS : -0.85 + 0.82 * (stop - a) / FPS + 0.82 * (g - resume) / FPS;
      const x = xAt(f);
      const trav = put("courtyard", walkC("traveller", x + 0.85, f < stop ? 1 - ramp(f, stop - 6, stop) : ramp(f, resume, resume + 6), L, false, { barefoot: f >= off }), [x, 0, 6.35]);
      const fx = xAt(f - 12) - 0.8, fr2 = put("courtyard", walkC("friend", fx + 1.65, (f - 12 < stop ? 1 - ramp(f - 12, stop - 6, stop) : ramp(f - 12, resume, resume + 6)), L, false, { barefoot: f - 12 >= off }), [fx, 0, 6.55]);
      const others = [fr2, put("courtyard", walkC("w4", 2 + tl * 0.8, 1, L, false, { barefoot: true }), [0.3 + tl * 0.8, 0, 5.6])];
      return mk("courtyard", "night", c, [x, 0.3, 6.35], 6, trav, others, [x, 1.8, 6.35]);
    }
    case "rowStand": case "rowRuku": case "rowSujood": { // the row, shoulder to shoulder, facing the arcade
      const looks = ["w1", "w2", "w3", "w6", "traveller", "friend", "w4", "w5", "oldMan"];
      let c: Cam;
      if (sh.kind === "rowStand") c = move(cam([-1.0, 1.38, 2.0], [-0.45, 1.25, -1.85], 44), cam([0.9, 1.38, 1.8], [0.3, 1.25, -1.85], 42), a, b)(f);
      else if (sh.kind === "rowRuku") c = move(cam([3.1, 1.15, 1.5], [-0.3, 0.75, -1.85], 44), cam([2.8, 1.1, 1.25], [-0.2, 0.72, -1.85], 42), a, b)(f);
      else c = move(cam([2.6, 0.62, 1.0], [-0.3, 0.32, -1.85], 44), cam([2.4, 0.58, 0.8], [-0.2, 0.3, -1.85], 42), a, b)(f);
      const mir = mirrorFor(c, 0, -1), L = lightOf("court", c, mir);
      const cards = looks.map((lk, i): TravellerCard | null => {
        const x = -2.4 + 0.6 * i, p: V3 = [x, lk === "traveller" ? 0.012 : 0, -1.85];
        if (sh.kind !== "rowStand" && x > 2.0) return null;                               // nobody right at the lens
        const card = sh.kind === "rowStand" ? back(lk, L) : sh.kind === "rowRuku" ? ruku(lk, L, mir) : sujood(lk, L, mir);
        return put("courtyard", card, p, { mirror: sh.kind === "rowStand" ? false : mir });
      });
      const ti = looks.indexOf("traveller"), trav = cards[ti]!, others = cards.filter((x, i) => x && i !== ti) as TravellerCard[];
      const hy = sh.kind === "rowStand" ? 1.8 : sh.kind === "rowRuku" ? 1.15 : 0.35;
      return mk("courtyard", "night", c, [0, hy - 0.4, -1.85], sh.kind === "rowStand" ? 4 : 6, trav, others, [0, hy, -1.85]);
    }
    case "bags": { // an old man's bags split and fall; he stops, looking down; the Traveller comes over
      const c = move(cam([-1.7, 1.38, 6.75], [-1.8, 1.0, 3.1], 48), cam([-1.8, 1.32, 6.7], [-1.85, 0.98, 3.1], 48), a, b)(f);
      const ox = OLD_X0 + (Math.min(f, BAG_DROP) - a) / FPS * 0.55;
      const Lr = lightOf("court", c), Ll = lightOf("court", c, true);
      const old = f < BAG_DROP
        ? put("courtyard", walkC("oldMan", (f - a) / FPS * 0.55, 1, Lr, false, { ...HOLD, bags: BAGS }), [ox, 0, OLD_Z])
        : put("courtyard", stoop("oldMan", 0.3 * smooth((f - BAG_DROP) / 10), Lr), [ox, 0, OLD_Z]);
      const tx = Math.max(TX_HELP, -1.05 - tl * 0.9), trav = put("courtyard", walkC("traveller", Math.min(tl * 0.9, -1.05 - TX_HELP), tx > TX_HELP + 0.01 ? 1 : 0, Ll, true), [tx, 0, T_Z], { mirror: true });
      const others = [old, put("courtyard", walkC("w2", tl * 0.8, 1, Ll, true), [0.4 - tl * 0.8, 0, -0.2], { mirror: true }), put("courtyard", walkC("w5", tl * 0.7, 1, Lr, false), [-3.4 + tl * 0.7, 0, 0.2])];
      return mk("courtyard", "night", c, [(ox + tx) / 2, 1.0, 3.1], 5, trav, others, [tx, 1.8, T_Z]);
    }
    case "help": { // he picks the bag up and carries it, walking with the old man
      const c = move(cam([-1.75, 1.3, 6.7], [-1.8, 0.95, 3.1], 48), cam([-1.45, 1.32, 6.7], [-1.5, 1.0, 3.1], 48), a, b)(f);
      const Lr = lightOf("court", c), s0 = a + 4, s1 = a + 16, s2 = a + 28, go = a + 30;
      const TX = TX_HELP, d = Math.max(0, (f - go) / FPS * 0.6);
      let trav: TravellerCard;
      const Ll = lightOf("court", c, true);
      if (f < s0) trav = put("courtyard", walker("traveller", { light: Ll, shawlNear: true }), [TX, 0, T_Z], { mirror: true });
      else if (f < go) { const k = f < s1 ? smooth((f - s0) / (s1 - s0)) : 1 - smooth((f - s2) / (go - s2)); trav = put("courtyard", stoop("traveller", f < s2 ? Math.min(1, k) : k, Ll, f >= s1 ? BAGS : ""), [TX, 0, T_Z], { mirror: true }); }
      else trav = put("courtyard", walkC("traveller", d, ramp(f, go, go + 8), Lr, false, { ...HOLD, bags: BAGS }), [TX + d, 0, T_Z]);
      const old = put("courtyard", f < go ? walker("oldMan", { light: Lr, headRot: 0.15 }) : walkC("oldMan", d, ramp(f, go, go + 8), Lr, false), [OLD_X + d, 0, OLD_Z]);
      return mk("courtyard", "night", c, [TX + d, 0.9, 3.1], 5, trav, [old], [TX + d - (f < go && f >= s0 ? 0.3 : 0), f < go && f >= s0 ? 1.2 : 1.8, T_Z]);
    }
    case "garden": { // kids running round the fountain, a cat drinking at its rim; he walks by with his friend
      const c = move(cam([1.9, 2.4, 6.3], [-0.6, 0.15, 2.4], 46), cam([1.45, 2.05, 5.9], [-0.7, 0.25, 2.3], 44), a, b)(f);
      const L = lightOf("court", c), d = tl * 0.7;
      const trav = put("courtyard", walkC("traveller", d, 1, L, false), [-2.6 + d, 0, 4.05]);
      return mk("courtyard", "night", c, [-0.6, 0.8, 3.0], 3, trav, [put("courtyard", walkC("friend", d, 1, L, false), [-2.1 + d, 0, 3.75]), ...kidsAround(c, t), poolCat(c, t)], [-2.6 + d, 1.8, 4.05]);
    }
    case "ball": { // their ball rolls to him; he picks it up and tosses it back
      const c = move(cam([-0.3, 0.72, 6.8], [-0.25, 0.85, 3.45], 44), cam([-0.15, 0.75, 6.75], [-0.2, 0.86, 3.45], 42), a, b)(f);
      const Ll = lightOf("court", c, true), Lr = lightOf("court", c), [b0] = BALL, s0 = b0 + 18, s1 = b0 + 30, up = b0 + 40, toss = b0 + 46;
      let trav: TravellerCard;
      const P: V3 = BALL_T;
      if (f < s0) trav = put("courtyard", walker("traveller", { light: Ll, shawlNear: true, headRot: 0.1 }), P, { mirror: true });
      else if (f < up) { const k = f < s1 ? smooth((f - s0) / (s1 - s0)) : 1 - smooth((f - s1) / (up - s1)); trav = put("courtyard", stoop("traveller", k, Ll, f >= s1 ? "ball" : ""), P, { mirror: true }); }
      else trav = put("courtyard", walker("traveller", { light: Ll, shawlNear: true, armN: reachArm(0, smooth((f - up) / (toss - up)) * (1 - smooth((f - toss - 6) / 8))) }), P, { mirror: true });
      const catchK = smooth((f - b0 - 50) / 8) * (1 - smooth((f - b0 - 64) / 8)), run = Math.max(0, (f - b0 - 66) / FPS);
      const kid = run > 0
        ? put("courtyard", walkC("kid1", run * 2.0, 1, Ll, true, { swing: 1.7 }, 0.5, 0.62), [BALL_KID[0] - run * 2.0, 0, BALL_KID[2]], { mirror: true, scale: 0.62 })
        : put("courtyard", walker("kid1", { light: Lr, armN: reachArm(0, 0.9 * catchK) }), BALL_KID, { scale: 0.62 });
      return mk("courtyard", "night", c, [-0.2, 0.8, 3.45], 5, trav, [kid, ...kidsAround(c, t).slice(1), poolCat(c, t)], [P[0], f >= s0 && f < up ? 1.15 : 1.8, P[2]]);
    }
    // ======================= night: alone, unseen =======================
    case "nightPray": { // standing in prayer, then ruku, by the lamp; nobody else in the room
      const c = move(cam([2.4, 1.42, 2.3], [0.3, 1.05, 0.1], 42), cam([1.85, 1.3, 1.75], [0.3, 1.0, 0.15], 40), a, b)(f);
      const mir = mirrorFor(c, -1, 0), L = lightOf("bedNight", c, mir), r0 = a + 34;
      const card = f < r0 ? walker("traveller", { fold: 1, light: L, shawlNear: mir }) : ruku("traveller", L, mir);
      return mk("bedroom", "night", c, [0.35, 1.0, 0.25], 6, put("bedroom", card, RUG_PRAY, { mirror: mir }), [], [RUG_PRAY[0], f < r0 ? 1.8 : 1.15, RUG_PRAY[2]]);
    }
    case "nightSujood": {
      const c = move(cam([2.5, 0.98, 2.45], [0.0, 0.42, 0.25], 42), cam([2.3, 0.92, 2.25], [0.0, 0.42, 0.25], 40), a, b)(f);
      const mir = mirrorFor(c, -1, 0), L = lightOf("bedNight", c, mir), j0 = a + 36;
      const card = f < j0 ? sujood("traveller", L, mir) : jalsa("traveller", L, mir);
      return mk("bedroom", "night", c, [0.25, 0.4, 0.25], 7, put("bedroom", card, RUG_PRAY, { mirror: mir }), [], [RUG_PRAY[0] - 0.3, f < j0 ? 0.3 : 1.25, RUG_PRAY[2]]);
    }
    // ======================= sunrise =======================
    case "lapse": { // outside his house before sunrise: from his lit window the camera tilts up past the roof to the sky
      const e = smooth(u * 1.1), c = cam([48.15, 1.5 - 0.1 * e, 5.0], [48.9, lerp(4.3, 13.5, e), -0.2], lerp(44, 48, e));
      return mk("street", "dawn", c, [48.9, lerp(4.3, 30, e), lerp(-0.2, -8, e)], 1.5, null, [], [48.9, 4.3, -0.2], { hooks: { streetX: 48.7, officeBanner: null } });
    }
    case "window": { // he walks to the window, opens it, the morning light falls on his face
      const c = move(cam([2.35, 1.5, -0.25], [0.95, 1.4, -1.85], 44), cam([2.2, 1.46, -0.55], [0.95, 1.45, -1.9], 40), a, b)(f);
      const L = lightOf("bedMorning", c), arrive = a + 26, k = smooth((f - a) / (arrive - a));
      const p0: V3 = [0.55, 0.013, -1.0], p1: V3 = WIN_STAND, pos: V3 = [lerp(p0[0], p1[0], k), 0.013, lerp(p0[2], p1[2], k)];
      const dist = Math.hypot(pos[0] - p0[0], pos[2] - p0[2]);
      const upK = smooth((f - WINDOW + 8) / 12) * (1 - smooth((f - WINDOW - 14) / 12));
      const card = f < arrive ? walkC("traveller", dist, 1 - ramp(f, arrive - 6, arrive), L, mirrorFor(c, 0.45, -0.55)) : walker("traveller", { light: L, armN: reachArm(0, upK), headRot: -0.12 * smooth((f - WINDOW - 10) / 15) });
      return mk("bedroom", `lapse:${q(lerp(395, 470, u), 2)}`, c, add(pos, [0, 1.2, 0]), 4, put("bedroom", card, pos, { mirror: f < arrive ? mirrorFor(c, 0.45, -0.55) : false }), [], add(pos, [0, 1.8, 0]));
    }
    // ======================= greetings =======================
    case "wave": { // morning street: the shopkeeper waves, he waves back without breaking step; a kid runs past
      const x = 25.95 + tl * 0.82, c = cam([x - 1.7, 1.6, 4.6], [x + 0.35, 1.45, 0.6], 40), y = STREET.KERB - 0.02;
      const L = lightOf("streetDay", c), Ll = lightOf("streetDay", c, true), w = smooth((f - a - 18) / 8) * (1 - smooth((f - b + 4) / 6));
      const trav = put("street", walkC("traveller", tl * 0.82, 1, L, false, w > 0.05 ? { armN: waveArm(q(tl * 2.4, 12)) } : {}), [x, y, STREET.WALK_Z]);
      const others = [
        put("street", walker("shopkeeper", { light: Ll, shawlNear: true, ...(f > a + 8 && f < b - 6 ? { armN: waveArm(q(tl * 2.2 + 0.3, 12)) } : {}) }), [28.35, y, 0.22], { mirror: true }),
        put("street", walkC("w5", tl * 1.0, 1, Ll, true), [x + 2.8 - tl * 1.0, y, 0.45], { mirror: true }),
        put("street", walkC("w4", tl * 0.75, 1, Ll, true), [x + 3.6 - tl * 0.75, y, 0.3], { mirror: true }),
        ...pigeons(c, t, [x + 1.6, y, 1.55], -1),
      ];
      return mk("street", "morning", c, [x, 1.3, 0.8], 4, trav, others, [x, 1.8, STREET.WALK_Z], { hooks: { streetX: x, officeBanner: null } });
    }
    case "hug": { // at the masjid door a brother comes up; they embrace
      const c = move(cam([1.6, 1.42, 11.0], [0.25, 1.35, 8.5], 40), cam([1.2, 1.42, 10.4], [0.25, 1.4, 8.5], 38), a, b)(f);
      const L = lightOf("court", c), Ll = lightOf("court", c, true), meet = a + 14;
      let trav: TravellerCard, others: TravellerCard[];
      if (f < meet) {
        trav = put("courtyard", walker("traveller", { light: L, armN: reachArm(0, 0.35 * smooth((f - a) / 10)) }), [-0.15, 0, 8.5]);
        const d = (f - a) / FPS * 1.1;
        others = [put("courtyard", walkC("hugger", d, 1, Ll, true), [1.25 - d, 0, 8.5], { mirror: true })];
      } else { trav = put("courtyard", hug("hugger", q(((f - meet) / FPS) * 1.6 % 1, 6), L), [0.3, 0, 8.5]); others = []; }
      others.push(put("courtyard", walkC("w3", tl * 0.8, 1, L, false), [-1.5 + tl * 0.8, 0, 5.2]));
      return mk("courtyard", "night", c, [0.25, 1.4, 8.5], 4, trav, others, [f < meet ? -0.15 : 0.15, 1.8, 8.5]);
    }
    case "handshake": { // a handshake with a friend, low; kids run past behind them, a cat on the step
      const c = move(cam([37.55, 0.85, 4.4], [37.9, 1.25, 0.9], 42), cam([37.75, 0.88, 4.2], [37.9, 1.28, 0.9], 40), a, b)(f);
      const L = lightOf("streetDay", c), Ll = lightOf("streetDay", c, true), y = STREET.KERB - 0.02, sk = q(((f - a) / FPS) * 2.2 % 1, 8);
      const trav = put("street", walker("traveller", { light: L, armN: reachArm(sk) }), [37.6, y, STREET.WALK_Z]);
      const others = [
        put("street", walker("friend", { light: Ll, shawlNear: true, armN: reachArm(sk) }), [38.2, y, STREET.WALK_Z], { mirror: true }),
        put("street", walkC("w3", tl * 1.1, 1, Ll, true), [39.9 - tl * 1.1, y, 0.3], { mirror: true }),
        put("street", walkC("w6", tl * 0.9, 1, L, false), [35.6 + tl * 0.9, y, 0.2]),
        put("street", cat("sit", 0, L), [37.15, y, 0.15]),
        ...pigeons(c, t, [38.55, y, 1.55], (f - a) / FPS - 0.6),
      ];
      return mk("street", "morning", c, [37.96, 1.4, 0.9], 5, trav, others, [37.6, 1.8, STREET.WALK_Z], { hooks: { streetX: 37.9, officeBanner: null } });
    }
    // ======================= provision, morning and evening =======================
    case "breakfast": { // at home at sunrise: father passes the bread, the little brother eats, tea steams
      const c = move(cam([-0.15, 1.45, 3.9], [0.0, 0.55, 0.3], 46), cam([0.15, 1.38, 3.6], [0.0, 0.55, 0.3], 46), a, b)(f);
      const L = lightOf("bedMorning", c), Ll = lightOf("bedMorning", c, true), pass = a + 30;
      const others = [
        put("bedroom", sit("father", f < pass ? "pass" : "cup", tl, Ll, true), [0.45, 0.013, 0.15], { mirror: true }),
        put("bedroom", sit("brother", "eat", tl + 0.7, L), [-0.4, 0.013, -0.25], { scale: 0.62 }),
      ];
      const trav = put("bedroom", sit("traveller", f < pass + 6 ? "receive" : "eat", tl, L), [-0.45, 0.013, 0.65]);
      return mk("bedroom", `lapse:${q(lerp(480, 520, u), 2)}`, c, [0, 0.7, 0.35], 4, trav, others, [-0.45, 1.25, 0.65]);
    }
    case "sunsetMeal": { // match cut: the same framing at sunset, a long meal with friends, plates passed, laughter
      const c = move(cam([2.45, 1.95, 5.0], [2.6, 0.45, 0.6], 46), cam([2.7, 1.85, 4.7], [2.6, 0.45, 0.6], 46), a, b)(f);
      const L = lightOf("court", c), Ll = lightOf("court", c, true), pass = a + 34;
      const seat = (lk: string, arms: SitArms, x0: number, z: number, right: boolean, ph = 0) => put("courtyard", sit(lk, arms, tl + ph, right ? L : Ll, !right), [x0 < 2.6 ? 2.22 : 2.98, 0, z], { mirror: !right });
      const trav = seat("traveller", f < pass ? "receive" : f < pass + 40 ? "eat" : "laugh", 2.15, 1.5, true);
      const others = [
        seat("friend", f < pass ? "pass" : "laugh", 3.05, 1.5, false, 0.3), seat("w3", f > a + 20 ? "laugh" : "eat", 2.15, 0.75, true, 0.6), seat("w5", f > a + 50 ? "laugh" : "cup", 3.05, 0.75, false, 1.1),
        seat("w1", "eat", 2.15, 0.0, true, 1.4), seat("w6", "pass", 3.05, 0.0, false, 0.2),
        ...kidsAlong(c, t),
      ];
      return mk("courtyard", "night", c, [2.6, 0.7, 1.0], 3, trav, others, [2.22, 1.25, 1.5]);
    }
    // ======================= that is Paradise =======================
    case "reading": case "teaching": { // under the lamp, reading; a boy sits by him and he points along the page
      const c = sh.kind === "reading"
        ? move(cam([1.75, 1.02, -0.2], [1.72, 0.72, -2.4], 42), cam([1.73, 0.98, -0.55], [1.72, 0.72, -2.4], 40), a, b)(f)
        : move(cam([1.72, 1.22, -1.0], [1.72, 0.66, -2.4], 42), cam([1.72, 1.18, -1.15], [1.72, 0.66, -2.4], 40), a, b)(f);
      const L = lightOf("court", c), Ll = lightOf("court", c, true);
      const trav = put("courtyard", sit("traveller", sh.kind === "reading" && u < 0.55 ? "read" : "point", tl, L), [1.45, 0, -2.45]);
      const boyArms: SitArms = sh.kind === "teaching" && Math.sin(tl * 2.6) > 0.3 ? "rest" : "listen";
      const boy = put("courtyard", sit("boy", sh.kind === "reading" && u < 0.4 ? "rest" : boyArms, tl, Ll, true), [2.0, 0, -2.3], { mirror: true, scale: 0.68 });
      return mk("courtyard", "night", c, [1.7, 0.75, -2.4], sh.kind === "teaching" ? 8 : 5, trav, [boy, ...gallery(c, t).slice(0, sh.kind === "reading" ? 2 : 1)], [1.45, 1.25, -2.45]);
    }
  }
  throw new Error(`story.ts: no shot "${sh.kind}"`);
};

// ---------------- where things are (set-local metres) ----------------
export const WASH = { X: 12, STAND: [11.5, 0.012, -0.85] as V3, TAP: [12.16, 1.06, -0.85] as V3 };
export const DOOR_X = 27.0;
/** where the old man's bags fall (he walks 0.55 m/s from x -2.8 until they drop) */
export const OLD_X0 = -2.45, OLD_Z = 3.15, T_Z = 3.4, TX_HELP = -1.5;
export const OLD_X = OLD_X0 + (BAG_DROP - F(TIMING.phrases[6].start)) / FPS * 0.55;
export const SHOE_OFF = F(20.83) + 32;
export const BALL_T: V3 = [0.4, 0, 3.45], BALL_KID: V3 = [-0.95, 0, 3.4];
export const RUG_PRAY: V3 = [0.35, 0.013, 0.25];
export const WIN_STAND: V3 = [1.0, 0.013, -1.6];
export const POOL_C = { x: -0.6, z: 2.2 };

// ---------------- background people (and pigeons) ----------------
/** three pigeons pecking on the pavement; scare >= 0: seconds since the kids ran at them (they fly up and away) */
const pigeons = (c: Cam, t: number, at: V3, scare: number): TravellerCard[] => [0, 1, 2].map((i) => {
  const s = scare - 0.1 * i, mir = i === 1;
  if (s > 0) { const up = Math.min(1, s / 1.2); return put("street", pigeon("fly", (t * 3 + i * 0.3) % 1, 0), [at[0] + 0.25 * i + 1.6 * up * (mir ? -1 : 1), at[1] + 1.8 * up * up + 0.1, at[2] - 0.6 * up], { mirror: mir, blob: null }); }
  return put("street", pigeon("peck", (t * 0.9 + i * 0.37) % 1), [at[0] + 0.25 * i, at[1], at[2] + 0.1 * Math.sin(i * 2)], { mirror: mir, blob: null });
});
/** three kids running round the fountain (anticlockwise seen from above) */
const kidsAround = (c: Cam, t: number): TravellerCard[] => ["kid1", "kid2", "kid3"].map((lk, i) => {
  const R = 1.55, w = 0.95, ang = w * t + (i * 2 * Math.PI) / 3, x = POOL_C.x + R * Math.cos(ang), z = POOL_C.z + R * Math.sin(ang);
  const dx = -Math.sin(ang), dz = Math.cos(ang), mir = mirrorFor(c, dx, dz), sc = [0.62, 0.58, 0.66][i];
  return put("courtyard", walkC(lk, R * w * t, 1, lightOf("court", c, mir), mir, { swing: 1.7 }, 0.48, sc), [x, 0, z], { mirror: mir, scale: sc });
});
/** the cat on the fountain's rim, drinking */
const poolCat = (c: Cam, t: number): TravellerCard => {
  const mir = mirrorFor(c, -1, 0);
  return put("courtyard", cat("drink", (t * 1.5) % 1, lightOf("court", c, mir)), [POOL_C.x + 1.0, 0.47, POOL_C.z + 0.1], { mirror: mir, blob: null });
};
/** kids running along the arcade behind the meal */
const kidsAlong = (c: Cam, t: number): TravellerCard[] => ["kid2", "kid1"].map((lk, i) => {
  const x = -3 + ((t * 1.9 + i * 2.2) % 9), mir = mirrorFor(c, 1, 0);
  return put("courtyard", walkC(lk, t * 1.9, 1, lightOf("court", c, mir), mir, { swing: 1.7 }, 0.48, 0.6), [x, 0, -2.75 + 0.2 * i], { mirror: mir, scale: 0.6 });
});
/** two men in the lamp-lit gallery behind (one reading, one walking past) */
const gallery = (c: Cam, t: number): TravellerCard[] => {
  const mir = mirrorFor(c, -1, 0), x = 3.2 - ((t * 0.5) % 6);
  return [put("courtyard", sit("w2", "read", t, lightOf("court", c)), [0.0, 0, -5.4]), put("courtyard", walkC("w1", t * 0.5, 1, lightOf("court", c, mir), mir), [x, 0, -5.0], { mirror: mir })];
};
