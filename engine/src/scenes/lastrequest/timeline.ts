// Video 002, "The Last Request": gloomy, heavy, slow. 0 .. voiceEnd: a voice clip (added in TikTok) about a life
// wasted and delayed, in his room at night. Then Sheikh Yasser Al-Dossari recites Al-Mu'minun 23:99-101 (in our file):
// a hospital room going dark and an empty bed (no being is ever shown), the things he left behind, a janazah in the
// rain, the grave, the empty city and his family's dark house, the grave in fog as the camera pulls back into darkness.
// Timing: videos/002-the-last-request/timing.json; shots: shots.json. Every camera move is slow; never steeper than 45.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import type { Pen } from "../../draw/toon";
import { withLook } from "../../characters/traveller";
import { travellerLying, travellerBedPhoneWide, travellerChair } from "../../characters/travellerPoses";
import { walker, stoop, LOOKS, duaArms, reachArm, pigeon, type Card } from "../../characters/people";
import { BEDROOM } from "../../sets/bedroom";
import { STREET } from "../../sets/street";
import { HOSPITAL } from "../../sets/hospital";
import { CEMETERY } from "../../sets/cemetery";
import { cam, move, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, SetId, Frame, TravellerCard, FrameFx } from "../../story/story";
import TIMING from "../../../../videos/002-the-last-request/timing.json";
import STORY from "../../../../videos/002-the-last-request/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
const EVJ = STORY.events as unknown as Record<string, unknown>;
export const EV = {
  lightOut: F(EVJ.lightOut as number), phoneOff: F(EVJ.phoneOff as number), hospDark: F(EVJ.hospitalDark as number),
  lightning: (EVJ.lightning as number[]).map(F), soil: (EVJ.soil as number[]).map(F), flicker: (EVJ.flicker as number[]).map(F),
  phoneDrop: F(EVJ.phoneDrop as number), stumble: F(EVJ.stumble as number), fall: F(EVJ.fall as number), collapseBed: F(EVJ.collapseBed as number),
  beads: F(EVJ.beads as number), flat: F(EVJ.flat as number),
  phonePick: F(EVJ.phonePick as number), blow: F(EVJ.blow as number), wallet: F(EVJ.wallet as number), kufi: F(EVJ.kufi as number), crows: F(EVJ.crows as number),
  laptop: (EVJ.laptopClose as number[]).map(F), familyLightOut: F(EVJ.familyLightOut as number),
};
export const TRANSITIONS = (EVJ.transitions as [number, string][]).map(([t, k]) => ({ f: F(t), kind: k }));
export type PShot = { kind: string; set: SetId; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, set: s.set as SetId, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const SETS: SetId[] = ["bedroom", "hospital", "cemetery", "street"];

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LDIR: Record<string, V3> = { room: [0.9, 0.8, -1.2], hosp: [-0.9, 1.0, 1.0], cem: [0.4, 1.2, 0.6], street: [0.3, 1.3, 0.8] };
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightOf = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...LDIR[k]).normalize(), camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
const put = (set: SetId, c: Card, p: V3, o: { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null; shadow?: boolean; roll?: number } = {}): TravellerCard =>
  ({ pos: W(set, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob, castShadow: o.shadow, roll: o.roll });
const MUTED = LOOKS.travellerMuted;

// ---------------- the janazah: where the procession is at time t (shared with life.ts: the bier) ----------------
export const PROC = { x0: -4.6, v: 0.5, t0: STORY.events.janazah, z: CEMETERY.PATH_Z };
export const procX = (t: number) => PROC.x0 + PROC.v * Math.max(0, t - PROC.t0);
const STRIDE = 0.36;
const walkC = (look: string, dist: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}) =>
  walker(look, { phase: q(0.25 + dist / (2 * STRIDE), 240), k: 1, stride: Math.round(STRIDE / SU), light: L, shawlNear: mirror, swing: 0.6, ...extra });
/** carriers (shoulders under the bier's poles) and mourners with umbrellas behind */
const CARRY = { E: [352, 420] as [number, number], W: [332, 300] as [number, number] };
const procession = (c: Cam, t: number): TravellerCard[] => {
  const x = procX(t), d = x - PROC.x0, mir = mirrorFor(c, 1, 0), L = lightOf("cem", c, mir), out: TravellerCard[] = [];
  const carrier = (lk: string, dx: number, dz: number) => out.push(put("cemetery", walkC(lk, d + dx, L, mir, { armN: { ...CARRY, hand: "dot" } }), [x + dx, 0, PROC.z + dz], { mirror: mir }));
  carrier("m1", 0.95, -0.42); carrier("m4", -0.95, -0.42); carrier("m2", 0.95, 0.42); carrier("m5", -0.95, 0.42);
  const um = ["#1d2128", "#2a2d33", "#16191e", "#24272c", "#1d2128", "#2a2d33"];
  ["m3", "m6", "m2", "m1", "m4", "m5"].forEach((lk, i) => out.push(put("cemetery", walkC(lk, d - 2.2 - 0.9 * i, L, mir, { umbrella: um[i] }), [x - 2.3 - 0.95 * Math.floor(i / 2) - 0.2 * (i % 2), 0, PROC.z + (i % 2 ? 0.45 : -0.4)], { mirror: mir })));
  return out;
};
/** mourners standing round the grave with umbrellas; leaving: they walk away (k = seconds since they turned) */
const mourners = (c: Cam, leave: number, oneByOne = false): TravellerCard[] => {
  const spots: [string, number, number, number][] = [["m3", -1.6, -1.9, -1], ["m6", -0.6, -2.05, -1], ["m2", 0.5, -2.0, 1], ["m1", 1.6, -1.85, 1], ["m4", -2.3, 1.2, -1], ["m5", 2.3, 1.25, 1]];
  const um = ["#1d2128", "#2a2d33", "#16191e", "#24272c", "#1d2128", "#2a2d33"];
  return spots.map(([lk, x, z, dir], i) => {
    const d = Math.max(0, leave - (oneByOne ? 0.7 : 0.25) * i) * 0.55, mir = mirrorFor(c, dir, 0), L = lightOf("cem", c, mir);
    return put("cemetery", d > 0 ? walkC(lk, d, L, mir, { umbrella: um[i] }) : walker(lk, { light: L, shawlNear: mir, umbrella: um[i], headRot: 0.15 }), [x + dir * d, 0, z], { mirror: mir });
  });
};

// ---------------- the people at the grave and in his room ----------------
/** the man holding the lantern (life.ts hangs the lantern from his hand: LANTERN_HAND below); leave = seconds since he turned to go */
export const LANTERN_MAN = { x: -0.95, z: 0.95 };
export const lanternHand = (f: number): V3 => { const sh = shotOf(f); const leave = sh.kind === "walkAway" ? Math.max(0, (f - sh.from) / FPS - 0.3) : 0; return [LANTERN_MAN.x - 0.45 * leave + 0.12, 0.62, LANTERN_MAN.z + 0.05]; };
const lanternMan = (c: Cam, leave: number): TravellerCard => {
  const d = Math.max(0, leave) * 0.45, dir = d > 0 ? -1 : 1, mir = mirrorFor(c, dir, 0), L = lightOf("cem", c, mir);
  const arm = { E: [306, 470] as [number, number], W: [318, 618] as [number, number], hand: "dot" as const };
  return put("cemetery", d > 0 ? walkC("m6", d, L, mir, { armN: arm }) : walker("m6", { light: L, shawlNear: mir, armN: arm, headRot: 0.2 }), [LANTERN_MAN.x - d, 0, LANTERN_MAN.z], { mirror: mir });
};
const DUA_MEN: [string, number, number, number][] = [["m3", -1.55, -0.95, 1], ["m1", -0.65, -1.25, 1], ["m2", 0.6, -1.25, -1], ["m4", 1.5, -0.95, -1], ["m5", 1.7, 0.75, -1]];
const CROW_X = [-5.2, -4.6, -4.1, -3.5, -2.9];
export const MUSHAF_BOY: V3 = [-2.5, 0.013, -1.45];
const lerp3v = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- the shots ----------------
type Shot = { set: SetId; state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3; hooks?: Frame["hooks"] };
const NOHEAD: V3 = [0, -5, 0];
const KERB = STREET.KERB - 0.02;
/** where he runs in the opening (street): x at time t (accelerating a little, then braking at the stop) */
/** the bus that pulls away in the opening (the street set's vehicle: x = passX + speed * (t - passAt), in the far lane) */
export const BUS = { passAt: 2.0, passX: 40.0, speed: 3.5, lane: 5.3 };
export const runX = (t: number) => 36.2 + 1.75 * Math.min(t, 1.65) - 0.4 * Math.max(0, Math.min(t, 1.65) - 1.1) ** 2;
/** people rushing past him on the pavement (both ways, some under umbrellas) */
const crowd = (c: Cam, t: number, x0: number): TravellerCard[] => {
  const ppl: [string, number, number, number, string][] = [["m1", 1.35, 1.25, 0, ""], ["m5", -1.25, 0.6, 2.1, "#1d2128"], ["m2", 1.15, 0.35, 4.3, "#24272c"], ["m4", -1.45, 1.0, 1.0, ""], ["m6", 1.3, 0.75, 5.6, ""], ["m3", -1.2, 0.25, 3.3, "#16191e"]];
  return ppl.map(([lk, v, z, ph, um]) => {
    const span = 9, x = x0 - span / 2 + (((v * t + ph * 1.7) % span) + span) % span, mir = mirrorFor(c, Math.sign(v), 0);
    return put("street", walkC(lk, Math.abs(v) * t + ph, lightOf("street", c, mir), mir, { swing: 1.3, ...(um ? { umbrella: um } : {}) }), [x, KERB, z], { mirror: mir });
  });
};
export const shotAt0 = (f: number): Shot => {
  const sh = shotOf(f), t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), tl = (f - a) / FPS, mv = (c0: Cam, c1: Cam) => move(c0, c1, a, b)(f);
  const bedPhone = (c: Cam, dark = false): TravellerCard => {
    const L = lightOf("room", c), sc = q((t * 0.7) % 1, 10);
    return put("bedroom", { key: `bedphone|${sc}|${dark}|${L}`, draw: (p) => withLook(MUTED, () => travellerBedPhoneWide(p, { light: L, scroll: sc, dark })) }, BEDROOM.SIT, { wide: true, blob: null });
  };
  const lying = (c: Cam, st: number): TravellerCard => { const L = lightOf("room", c), s2 = q(st, 10); return put("bedroom", { key: `lie|${s2}|${L}`, draw: (p) => withLook(MUTED, () => travellerLying(p, { light: L, stir: s2 })) }, BEDROOM.LYING, { wide: true, blob: null }); };
  const HEAD_SIT: V3 = [BEDROOM.SIT[0] - 0.3, 1.25, BEDROOM.SIT[2]], HEAD_LIE: V3 = [BEDROOM.LYING[0] - 0.86, 0.85, BEDROOM.LYING[2]];
  const T = "travellerMuted";
  switch (sh.kind) {
    // ======================= the voice: his life falling apart =======================
    case "runRain": { // running through the night rain, splashing, late
      const x = runX(t), c = cam([x - 0.9, 1.45, 3.65], [x + 0.05, 1.25, 1.3], 46), mir = mirrorFor(c, 1, 0);
      const trav = put("street", walker(T, { phase: q(0.25 + (x - 36.2) / 1.3, 240), k: 1, stride: Math.round(0.65 / SU), swing: 1.9, light: lightOf("street", c, mir), shawlNear: mir }), [x, KERB, 1.5], { mirror: mir });
      return { set: "street", state: "dark", cam: c, focus: [x, 1.1, 1.5], cInf: 4, trav, others: crowd(c, t, x + 2).slice(0, 2), head: [x, 1.8, 1.5], hooks: { streetX: x, officeBanner: null } };
    }
    case "missBus": { // he reaches the stop as the bus pulls away; he stops, slumps
      const x = runX(t), stopK = clamp01((t - 2.5) / 0.4), c = mv(cam([36.6, 1.4, 0.38], [41.5, 1.7, 4.8], 50), cam([36.8, 1.45, 0.4], [42.8, 1.8, 5.0], 50)), mir = mirrorFor(c, 1, 0);
      const card = stopK < 1 ? walker(T, { phase: q(0.25 + (x - 36.2) / 1.3, 240), k: 1 - stopK, stride: Math.round(0.65 / SU), swing: 1.9, light: lightOf("street", c, mir), shawlNear: mir })
        : walker(T, { light: lightOf("street", c, mir), shawlNear: mir, headRot: 0.3 });
      return { set: "street", state: "dark", cam: c, focus: [x, 1.2, 1.5], cInf: 4, trav: put("street", card, [x, KERB, 1.5 + 0.3 * stopK], { mirror: mir }), head: [x, 1.8, 1.6], hooks: { streetX: x, officeBanner: null } };
    }
    case "lookClosely": { // slow push into his soaked silhouette, standing still while the crowd rushes past
      const x = runX(99), c = mv(cam([x + 0.1, 1.5, 3.7], [x, 1.55, 1.8], 44), cam([x + 0.05, 1.6, 2.95], [x, 1.62, 1.8], 34)), mir = mirrorFor(c, 1, 0);
      const trav = put("street", walker(T, { light: lightOf("street", c, mir), shawlNear: mir, headRot: 0.3 }), [x, KERB, 1.8], { mirror: mir });
      return { set: "street", state: "dark", cam: c, focus: [x, 1.6, 1.8], cInf: 6, trav, others: crowd(c, t, x), head: [x, 1.8, 1.8], hooks: { streetX: x, officeBanner: null } };
    }
    case "toss3am": { const c = mv(cam([0.75, 1.3, 1.2], [-1.2, 0.75, -1.4], 44), cam([0.55, 1.22, 0.9], [-1.25, 0.75, -1.4], 42)); return { set: "bedroom", state: "night", cam: c, focus: HEAD_LIE, cInf: 5, trav: lying(c, 0.5 + 0.5 * Math.sin(tl * 9) * Math.sin(tl * 3.1)), head: HEAD_LIE }; }
    case "grabPhone": { const c = mv(cam([0.55, 1.22, 0.9], [-1.1, 1.0, -1.4], 42), cam([0.35, 1.25, 0.6], [-1.1, 1.05, -1.4], 40)); return { set: "bedroom", state: "night", cam: c, focus: HEAD_SIT, cInf: 5, trav: bedPhone(c), head: HEAD_SIT }; }
    case "pastShelf": { // he walks past the shelf without looking
      const x = -2.55 + 0.75 * tl, c = mv(cam([0.45, 1.6, 1.9], [-2.2, 1.35, -1.3], 44), cam([0.55, 1.6, 1.8], [-1.8, 1.3, -1.1], 44)), mir = mirrorFor(c, 1, 0);
      return { set: "bedroom", state: "night", cam: c, focus: [x, 1.2, -0.35], cInf: 4, trav: put("bedroom", walkC(T, tl * 0.75, lightOf("room", c, mir), mir, { headRot: 0.25 }), [x, 0.013, -0.35], { mirror: mir }), head: [x, 1.8, -0.35] };
    }
    case "pastMasjid": { // past the masjid door in the rain, men going in, warm light spilling; he keeps walking into the dark
      const x = 26.9 + 1.3 * tl, c = cam([x - 1.6, 1.45, 4.4], [x + 0.5, 1.3, 0.6], 44), mir = mirrorFor(c, 1, 0), mirL = mirrorFor(c, -1, 0);
      const men = [0, 1, 2].map((i) => { const d = Math.max(0, tl - 0.45 * i), mx = 30.6 + 0.9 * i - 1.0 * d, zz = 0.9 - Math.max(0, (29.2 - mx)) * 0.9;
        return put("street", walkC(["m2", "m4", "m6"][i], d, lightOf("street", c, mirL), mirL), [Math.max(28.85, mx), KERB, Math.max(0.05, zz)], { mirror: mirL }); }).filter((_, i) => tl - 0.45 * i < 2.1);
      return { set: "street", state: "dark", cam: c, focus: [x, 1.3, 1.0], cInf: 4, trav: put("street", walkC(T, tl * 1.3, lightOf("street", c, mir), mir, { headRot: 0.2 }), [x, KERB, 1.15], { mirror: mir }), others: men, head: [x, 1.8, 1.15], hooks: { streetX: x, officeBanner: null } };
    }
    case "beadsFall": return { set: "bedroom", state: "night", cam: mv(cam([-1.95, 0.62, -0.1], [-2.08, 0.18, -1.15], 44), cam([-1.95, 0.58, -0.22], [-2.08, 0.15, -1.15], 40)), focus: [-2.0, 0.3, -1.4], cInf: 6, trav: null, head: NOHEAD };
    case "drainWave": { const c = mv(cam([1.9, 1.8, 2.3], [-0.6, 0.9, -1.3], 46), cam([1.7, 1.75, 2.0], [-0.5, 0.9, -1.4], 44)); return { set: "bedroom", state: "night", cam: c, focus: HEAD_SIT, cInf: 3, trav: bedPhone(c), head: HEAD_SIT }; }
    case "drainClose": return { set: "bedroom", state: "night", cam: mv(cam([1.08, 1.42, -0.55], [1.05, 1.1, -2.15], 44), cam([1.06, 1.38, -0.75], [1.05, 1.1, -2.15], 42)), focus: [1.05, 1.1, -2.12], cInf: 6, trav: null, head: NOHEAD };
    case "collapseBed": { // standing by the bed, he folds and falls onto it
      const c = mv(cam([1.4, 1.5, 1.9], [-0.4, 0.85, -1.0], 44), cam([1.25, 1.4, 1.6], [-0.45, 0.8, -1.05], 42)), mir = mirrorFor(c, -1, 0), L = lightOf("room", c, mir);
      const P: V3 = [0.75, 0.013, -0.25], k = smooth((f - EV.collapseBed + 8) / 10);
      const trav = f < EV.collapseBed + 4 ? put("bedroom", stoop(T, 0.7 * k, L), P, { mirror: mir }) : lying(c, 0.05);
      return { set: "bedroom", state: "night", cam: c, focus: [0, 0.9, -0.8], cInf: 4, trav, head: f < EV.collapseBed + 4 ? [P[0], 1.7 - 0.5 * k, P[2]] : HEAD_LIE };
    }
    case "black": return { set: "bedroom", state: "nightOff", cam: cam([0.5, 1.3, 1.0], [-1.0, 0.8, -1.3], 44), focus: [-1, 0.8, -1.3], cInf: 3, trav: null, head: NOHEAD };
    // ======================= 63:10 =======================
    case "bankPanic": { const c = mv(cam([0.6, 1.08, 1.3], [-0.4, 0.8, -0.55], 46), cam([0.5, 1.05, 1.1], [-0.42, 0.8, -0.55], 44)); const L = lightOf("room", c);
      return { set: "bedroom", state: "night", cam: c, focus: [-0.4, 0.9, -0.3], cInf: 5, trav: put("bedroom", { key: `edgehead|${L}`, draw: (p) => withLook(MUTED, () => travellerChair(p, { light: L, arms: "head", tilt: 0, chair: false })) }, BEDROOM.EDGE, { yaw: 0, blob: null }), head: [BEDROOM.EDGE[0] + 0.05, 1.15, BEDROOM.EDGE[2]] }; }
    case "walkHome": { const x = 36.0 + 0.55 * tl, c = cam([x - 0.8, 1.45, 3.7], [x + 0.05, 1.25, 1.3], 44), mir = mirrorFor(c, 1, 0);
      return { set: "street", state: "dark", cam: c, focus: [x, 1.2, 1.3], cInf: 4, trav: put("street", walkC(T, tl * 0.55, lightOf("street", c, mir), mir, { headRot: 0.3 }), [x, KERB, 1.3], { mirror: mir }), head: [x, 1.8, 1.3], hooks: { streetX: x, officeBanner: null } }; }
    case "phoneDrop": { const x = 40.15 + 0.45 * tl, c = mv(cam([41.0, 0.42, 2.35], [40.6, 0.2, 1.25], 42), cam([40.95, 0.4, 2.25], [40.6, 0.2, 1.25], 40)), mir = mirrorFor(c, 1, 0);
      return { set: "street", state: "dark", cam: c, focus: [43.0, 0.2, 1.25], cInf: 6, trav: put("street", walkC(T, tl * 0.45, lightOf("street", c, mir), mir, { headRot: 0.3 }), [x, KERB, 1.0], { mirror: mir }), head: [x, 1.8, 1.0], hooks: { streetX: 40.6, officeBanner: null } }; }
    case "collapseStreet": { // he stumbles and falls on the wet street, seen from across the road
      const c = mv(cam([41.75, 1.2, 7.4], [42.1, 0.55, 1.2], 44), cam([41.8, 1.15, 7.0], [42.15, 0.5, 1.2], 42)), mir = mirrorFor(c, 1, 0), L = lightOf("street", c, mir);
      const x = Math.min(42.3, 41.5 + 0.5 * tl);
      let card: TravellerCard;
      if (f < EV.stumble) card = put("street", walkC(T, tl * 0.5, L, mir, { swing: 0.4, headRot: 0.35 }), [x, KERB, 1.2], { mirror: mir });
      else if (f < EV.fall) card = put("street", stoop(T, smooth((f - EV.stumble) / (EV.fall - EV.stumble)) * 0.8, L), [x, KERB, 1.2], { mirror: mir });
      else { const k = smooth((f - EV.fall) / 9); card = put("street", stoop(T, 0.8 * (1 - k), L), [x, KERB + 0.16 * k, 1.2], { mirror: mir, roll: (mir ? 1 : -1) * (Math.PI / 2) * k }); }
      return { set: "street", state: "dark", cam: c, focus: [x, 0.5, 1.2], cInf: 3, trav: card, head: [x, f < EV.fall ? 1.6 : 0.4, 1.2], hooks: { streetX: 42, officeBanner: null } };
    }
    case "bedRail": case "flatline": { // the heart slowing on the monitor, then flat; the camera along the bed rail
      const beatPhase = (g: number) => { const s = g / FPS - 32.8; return 32.8 * 1.1 + 1.1 * s - 0.2 * s * s * 0.5; };   // the rate falls from 1.1 to ~0.75 beats/s
      const flat = f >= EV.flat, amp = flat ? 0 : 1 - 0.35 * clamp01((t - 32.8) / 1.8);
      const c = sh.kind === "bedRail" ? mv(cam([0.88, 1.12, 0.2], [0.55, 0.9, -1.9], 40), cam([0.88, 1.1, -0.55], [0.6, 0.95, -2.2], 38)) : mv(cam([0.2, 1.55, -0.55], [0.95, 1.42, -2.05], 38), cam([0.32, 1.52, -0.8], [0.95, 1.42, -2.05], 34));
      const L = lightOf("hosp", c, true), trav = sh.kind === "bedRail" ? put("hospital", { key: `hlie|0.1|${L}`, draw: (p) => withLook(MUTED, () => travellerLying(p, { light: L, stir: 0.1 })) }, [HOSPITAL.BED[0], 0.72, HOSPITAL.BED[2] + 0.03], { wide: true, blob: null, yaw: Math.PI / 2, mirror: true, scale: 0.88 }) : null;
      return { set: "hospital", state: `mon:${q(beatPhase(f), 100)}:${q(amp, 20)}`, cam: c, focus: sh.kind === "bedRail" ? [0.5, 0.85, -1.4] : [0.95, 1.45, -2.04], cInf: 5, trav, head: sh.kind === "bedRail" ? [0, 0.95, -2.1] : NOHEAD };
    }
    case "emptyCurtain": return { set: "hospital", state: "dark", cam: mv(cam([-0.3, 1.35, 1.3], [-0.6, 0.9, -1.6], 44), cam([-0.3, 1.32, 1.0], [-0.7, 0.95, -1.8], 42)), focus: [-0.4, 0.8, -1.5], cInf: 4, trav: null, head: NOHEAD };
    // ---- the people he left behind (no empty rooms) ----
    case "fatherBed": case "lightning2": { // his father on the bed in the dark, his prayer beads in his hands, shoulders shaking
      const c = sh.kind === "fatherBed" ? mv(cam([0.85, 1.1, 1.3], [-0.5, 0.82, -0.25], 44), cam([0.55, 1.05, 0.95], [-0.52, 0.85, -0.25], 40))
        : (f >= EV.lightning[1] - 1 ? cam([-1.6, 1.7, 1.6], [0.2, 0.8, -1.4], 46) : cam([1.6, 1.6, 2.2], [-0.6, 0.9, -1.3], 46));
      const L = lightOf("room", c), shake = q(0.006 * Math.sin(t * 21) * Math.abs(Math.sin(t * 2.3)), 1000), E = BEDROOM.EDGE;
      const dad = put("bedroom", { key: `fbeads|${L}`, draw: (p) => withLook(LOOKS.father, () => travellerChair(p, { light: L, arms: "beads", tilt: -0.35, chair: false })) }, [E[0], E[1] + shake, E[2]], { yaw: 0, blob: null });
      return { set: "bedroom", state: "nightOff", cam: c, focus: [E[0], 0.95, E[2]], cInf: 5, trav: null, others: [dad], head: [E[0] + 0.05, 1.15, E[2]] };
    }
    case "phoneMat": { // his little brother picks the buzzing phone up off the mat and looks at it
      const c = mv(cam([1.95, 0.95, 1.55], [0.95, 0.42, 0.4], 44), cam([1.8, 0.95, 1.4], [0.95, 0.5, 0.42], 42)), mir = mirrorFor(c, -1, 0), L = lightOf("room", c, mir);
      const P0: V3 = [1.55, 0.013, 0.75], P1: V3 = [1.3, 0.013, 0.45], k = smooth((f - a) / (EV.phonePick - a - 4)), pos: V3 = [lerp(P0[0], P1[0], k), 0.013, lerp(P0[2], P1[2], k)];
      const pick = clamp01((f - EV.phonePick) / 8) * (1 - clamp01((f - EV.phonePick - 12) / 8));
      const card = f < EV.phonePick - 4 ? walkC("brother", Math.hypot(pos[0] - P0[0], pos[2] - P0[2]), L, mir, {}) : f < EV.phonePick + 20 ? stoop("brother", 0.8 * pick, L) : walker("brother", { light: L, shawlNear: mir, phone: 1 });
      return { set: "bedroom", state: "nightOff", cam: c, focus: [1.1, 0.4, 0.4], cInf: 5, trav: null, others: [put("bedroom", card, pos, { mirror: mir, scale: 0.68 })], head: [pos[0], 1.15, pos[2]] };
    }
    case "mushafBlow": { // he reaches the dusty mushaf down from the shelf and blows the dust off
      const c = mv(cam([-1.35, 1.25, -0.15], [-2.5, 1.2, -1.75], 42), cam([-1.5, 1.2, -0.3], [-2.5, 1.15, -1.75], 40)), mir = mirrorFor(c, -0.3, -1), L = lightOf("room", c, mir);
      const up = smooth((f - a) / 10) * (1 - smooth((f - a - 18) / 8));
      const card = walker("brother", { light: L, shawlNear: mir, armN: reachArm(0, up), headRot: f > EV.blow - 6 ? 0.2 : -0.3 });
      return { set: "bedroom", state: "nightOff", cam: c, focus: [-2.5, 1.2, -1.5], cInf: 5, trav: null, others: [put("bedroom", card, MUSHAF_BOY, { mirror: mir, scale: 0.8 })], head: [MUSHAF_BOY[0], 1.4, MUSHAF_BOY[2]] };
    }
    case "laptopClose": { // his father opens the laptop (the balance still there) and slowly closes it
      const c = mv(cam([0.55, 1.2, 0.65], [-0.15, 0.72, -0.75], 40), cam([0.45, 1.15, 0.45], [-0.3, 0.82, -0.4], 40)), L = lightOf("room", c), E = BEDROOM.EDGE;
      const dad = put("bedroom", { key: `ftype|${L}`, draw: (p) => withLook(LOOKS.father, () => travellerChair(p, { light: L, arms: "type", tilt: -0.3, chair: false })) }, E, { yaw: 0, blob: null });
      return { set: "bedroom", state: "nightOff", cam: c, focus: lerp3v([-0.1, 0.65, -0.7], [E[0], 1.0, E[2]], smooth(u * 1.4 - 0.2)), cInf: 7, trav: null, others: [dad], head: [E[0] + 0.05, 1.15, E[2]] };
    }
    case "walletBox": { // his wallet goes into a box with his things
      const c = mv(cam([1.45, 0.95, 2.1], [0.4, 0.45, 0.72], 44), cam([1.3, 0.9, 1.9], [0.38, 0.42, 0.72], 42)), mir = mirrorFor(c, 1, 0), L = lightOf("room", c, mir);
      const k = smooth((f - a) / 12) * (1 - smooth((f - EV.wallet - 8) / 14));
      return { set: "bedroom", state: "nightOff", cam: c, focus: [0.6, 0.35, 0.75], cInf: 6, trav: null, others: [put("bedroom", stoop("father", 0.75 * k, L), [0.0, 0.013, 0.7], { mirror: mir })], head: [0.0, 1.7 - 0.6 * k, 0.7] };
    }
    case "kufiDoor": { // his kufi is hung on the door, and the light goes out
      const c = mv(cam([-1.55, 1.5, 1.75], [-2.9, 1.45, 0.4], 42), cam([-1.7, 1.48, 1.55], [-2.92, 1.5, 0.4], 40)), mir = mirrorFor(c, -1, 0), L = lightOf("room", c, mir);
      const up = smooth((f - a) / 10) * (1 - smooth((f - EV.kufi - 6) / 10));
      return { set: "bedroom", state: "nightOff", cam: c, focus: [-2.9, 1.5, 0.4], cInf: 5, trav: null, others: [put("bedroom", walker("father", { light: L, shawlNear: mir, armN: reachArm(0, 0.85 * up), headRot: 0.15 }), [-2.45, 0.013, 0.42], { mirror: mir })], head: [-2.45, 1.8, 0.42] };
    }
    case "matPhone": return { set: "bedroom", state: "nightOff", cam: mv(cam([1.75, 0.65, 1.05], [1.0, 0.05, 0.25], 42), cam([1.6, 0.58, 0.9], [1.0, 0.04, 0.25], 38)), focus: [1.0, 0.05, 0.25], cInf: 6, trav: null, head: NOHEAD };
    case "matBuzz": return { set: "bedroom", state: "nightOff", cam: mv(cam([1.4, 0.44, 0.66], [1.12, 0.04, 0.3], 34), cam([1.36, 0.41, 0.6], [1.12, 0.04, 0.3], 30)), focus: [1.12, 0.04, 0.3], cInf: 8, trav: null, head: NOHEAD };
    case "windowRain": return { set: "bedroom", state: "nightOff", cam: mv(cam([1.08, 1.6, -0.8], [1.05, 1.58, -2.2], 40), cam([1.06, 1.6, -1.2], [1.05, 1.58, -2.2], 36)), focus: [1.05, 1.6, -2.18], cInf: 3, trav: null, head: NOHEAD };
    case "leftBehind": { const e = smooth(u); return { set: "bedroom", state: "nightOff", cam: cam([lerp(-0.2, 0.95, e), lerp(1.4, 1.55, e), lerp(1.4, -1.05, e)], [lerp(-1.6, 1.05, e), lerp(0.9, 1.55, e), lerp(-1.6, -2.2, e)], lerp(44, 38, e)), focus: [lerp(-1.6, 1.05, e), 1.2, lerp(-1.6, -2.2, e)], cInf: 4, trav: null, head: NOHEAD }; }
    case "lightning2": { const second = f >= EV.lightning[1] - 1;
      const c = second ? cam([-1.6, 1.7, 1.6], [0.2, 0.8, -1.4], 46) : cam([1.6, 1.6, 2.2], [-0.6, 0.9, -1.3], 46);
      return { set: "bedroom", state: "nightOff", cam: c, focus: [-0.5, 0.8, -1.2], cInf: 3, trav: null, head: NOHEAD }; }
    // ======================= 63:11 =======================
    case "janazahTrack": { const x = procX(t), c = cam([x + 0.35, 1.6, PROC.z + 3.4], [x + 0.35, 1.35, PROC.z], 46); return { set: "cemetery", state: "rain", cam: c, focus: [x + 0.95, 1.4, PROC.z + 0.42], cInf: 5, trav: null, others: procession(c, t), head: [x, 1.8, PROC.z] }; }
    case "mudFeet": { const x = procX(t), c = cam([x + 0.75, 0.4, 5.0], [x + 0.6, 0.6, PROC.z], 46); return { set: "cemetery", state: "rain", cam: c, focus: [x, 0.4, PROC.z], cInf: 5, trav: null, others: procession(c, t), head: [x, 1.8, PROC.z] }; }
    case "umbrellaLine": { const x = procX(t), c = cam([x - 2.6, 1.7, 9.0], [x - 1.4, 1.2, PROC.z], 44); return { set: "cemetery", state: "rain", cam: c, focus: [x - 1.4, 1.2, PROC.z], cInf: 2, trav: null, others: procession(c, t), head: [x, 1.8, PROC.z] }; }
    case "graveSoil": { const c = mv(cam([1.6, 1.3, 3.3], [0.0, 0.8, 0.0], 48), cam([1.35, 1.3, 3.05], [0.0, 0.78, 0.0], 46));
      const [s0, s1] = EV.soil, fill = 0.85 * smooth((f - s0) / (s1 - s0));
      const dig = (x: number, dir: number, ph: number) => { const k = 0.35 + 0.25 * Math.max(0, Math.sin(t * 2.4 + ph)), mir = mirrorFor(c, dir, 0); return put("cemetery", stoop(["m1", "m4"][ph], k, lightOf("cem", c, mir)), [x, 0, -0.05], { mirror: mir }); };
      return { set: "cemetery", state: "rain", cam: c, focus: [0, 0, 0], cInf: 4, trav: null, others: [dig(-1.45, 1, 0), dig(1.45, -1, 1), ...mourners(c, 0).slice(0, 4), lanternMan(c, 0)], head: NOHEAD, hooks: { graveFill: fill } }; }
    case "duaGrave": { // men round the grave raise their hands in du'a, in the rain
      const c = mv(cam([1.7, 1.3, 2.5], [0.0, 0.95, -0.5], 46), cam([1.25, 1.35, 2.7], [-0.1, 0.95, -0.5], 46)), d = duaArms();
      const men = DUA_MEN.map(([lk, x, z, dir]) => { const mir = mirrorFor(c, dir, 0); return put("cemetery", walker(lk, { light: lightOf("cem", c, mir), shawlNear: mir, armN: d.N, armF: d.F, headRot: 0.2 }), [x, 0, z], { mirror: mir }); });
      return { set: "cemetery", state: "rain", cam: c, focus: [0, 0.9, -0.6], cInf: 4, trav: null, others: [...men, lanternMan(c, 0)], head: NOHEAD, hooks: { graveFill: 1 } };
    }
    case "waterGrave": { // a man sprinkles water on the grave, then smooths the soil with his hands
      const c = mv(cam([1.0, 0.75, 1.55], [0.05, 0.2, 0.05], 42), cam([0.85, 0.72, 1.35], [0.05, 0.18, 0.05], 40)), mir = mirrorFor(c, -1, 0), L = lightOf("cem", c, mir);
      const k = 0.55 + 0.35 * smooth((f - a - 26) / 10) + 0.04 * Math.sin(t * 6);
      return { set: "cemetery", state: "rain", cam: c, focus: [0.1, 0.2, 0.1], cInf: 6, trav: null, others: [put("cemetery", stoop("m2", k, L), [0.95, 0, 0.55], { mirror: mir }), lanternMan(c, 0)], head: [0.95, 1.2, 0.55], hooks: { graveFill: 1 } };
    }
    case "gravesTrack": { // slowly along the rows of graves, the wind driving the rain sideways; crows on a wall fly off
      const x = -1.2 - 1.4 * u, c = cam([x, 0.95, -3.65], [x - 2.2, 0.95, -8.1], 44);
      const crows = [0, 1, 2, 3, 4].map((i) => { const s = (f - EV.crows) / FPS - 0.12 * i, mir = mirrorFor(c, i % 2 ? 1 : -1, 0);
        return s > 0 ? put("cemetery", pigeon("fly", (t * 3.4 + i * 0.3) % 1, 0, true), [CROW_X[i] + (i % 2 ? 1 : -1) * 1.4 * s, 1.15 + 1.6 * s * s, -8.25 + 0.6 * s], { mirror: mir, blob: null, scale: 1.4 })
          : put("cemetery", pigeon("peck", (t * 0.7 + i * 0.37) % 1, 0, true), [CROW_X[i], 1.15, -8.25], { mirror: mir, blob: null, scale: 1.4 }); });
      return { set: "cemetery", state: "rain", cam: c, focus: [x - 1.5, 0.9, -7.5], cInf: 3, trav: null, others: crows, head: NOHEAD };
    }
    case "walkAway": { const c = mv(cam([0.8, 1.45, 3.0], [0, 0.4, 0.2], 44), cam([0.7, 1.5, 3.3], [0, 0.35, 0.2], 44));
      return { set: "cemetery", state: "rain", cam: c, focus: [0, 0.3, 0.3], cInf: 3, trav: null, others: [...mourners(c, (f - a) / FPS * 1.3 - 0.2, true), lanternMan(c, (f - a) / FPS - 0.3)], head: NOHEAD, hooks: { graveFill: 1 } }; }
    default: { // fogPullback: the camera pulls far back and up into the dark
      const e = Math.pow(u, 0.8), c = cam([lerp(0.5, 0.3, e), lerp(1.2, 3.6, e), lerp(2.6, 17, e)], [0, 0.15, 0.3], lerp(42, 40, e));
      return { set: "cemetery", state: `fog:${q(smooth(u * 1.2), 50)}`, cam: c, focus: [0, 0.2, 0], cInf: 2, trav: null, head: NOHEAD, hooks: { graveFill: 1 } };
    }
  }
};

export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.5);
  const c = { ...s.cam, pos: add(W(s.set, s.cam.pos), hh.pos), look: add(W(s.set, s.cam.look), hh.look) };
  return { frame: { set: s.set, state: s.state, t: f / FPS, plan: { cam: c, focus: W(s.set, s.focus), cInf: s.cInf, nearScale: 1.5 }, traveller: s.trav, others: s.others, hooks: s.hooks }, head: W(s.set, s.head), shot: sh };
};

// ---------------- picture effects: cold, desaturated, grainy, heavy vignette ----------------
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
export const fxAt = (f: number): FrameFx => {
  const s = shotOf(f), first = f - s.from;
  // each cut eases in from a soft blur; a smear stretches the picture sideways into the dark; a heartbeat cut thumps
  let bx = first < 8 ? 2.5 * (1 - first / 8) : 0, by = bx, zoom: FrameFx["zoom"];
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "smear" && d > -12 && d < 0) bx = Math.max(bx, 30 * smooth((d + 12) / 12));
    if (tr.kind === "heart" && Math.abs(d) < 5) { const k = 1 - Math.abs(d) / 5; zoom = { scale: 1 + 0.035 * k, x: 540, y: 960, blur: 2 * k }; }
  }
  // the barakah drains: the picture loses its colour (and stays colder afterwards)
  const dw = SHOTS.find((x) => x.kind === "drainWave")!, cb = SHOTS.find((x) => x.kind === "collapseBed")!;
  const sat = f < dw.from ? 0.42 : f < cb.to ? 0.42 - 0.34 * smooth((f - dw.from) / (cb.from - dw.from)) : 0.3;
  return { blurX: bx, blurY: by, ca: 0, glitch: 0, flash: 0, vignette: 1.1, grain: true, zoom, css: `saturate(${sat.toFixed(3)}) contrast(1.05) brightness(1.08)` };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
