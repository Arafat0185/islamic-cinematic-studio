// Video 008 "The Prison" (teal & orange film): an Arabic narration (a TikTok sound, added in TikTok; not in our file) on
// the hadith "The world is a prison for the believer and a paradise for the disbeliever" (Sahih Muslim 2956), over an
// old Islamic city at dusk, night and golden hour (sets/city.ts). The Traveller walks through it, turning away from
// what pulls at him. Faceless people, men only. The camera is always moving and never steeper than 45 degrees down on
// a person. Timing: videos/008-the-prison/timing.json; shots: shots.json.
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { light2D } from "../../render/card";
import type { Pen } from "../../draw/toon";
import { withLook } from "../../characters/traveller";
import { travellerChair } from "../../characters/travellerPoses";
import { walker, back, LOOKS, reachArm, type Card } from "../../characters/people";
import { cam, move, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, Frame, TravellerCard, FrameFx } from "../../story/story";
import { CITY_AREAS, CITY } from "../../sets/city";
import TIMING from "../../../../videos/008-the-prison/timing.json";
import STORY from "../../../../videos/008-the-prison/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export const EV = STORY.events;
export type PShot = { kind: string; world: string; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, world: s.world, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const spanOf = (k: string) => SHOTS.find((s) => s.kind === k) ?? { from: -1e9, to: -1e9, kind: k, world: "" };
export const TRANSITIONS = (EV.transitions as [number, string][]).map(([t, k]) => ({ f: F(t), kind: k }));
export const CHARACTER_SHOTS = new Set(["gateBars", "gateLook", "marketWalk", "marketLow", "emptyStreet", "redLight", "shopReach", "shopPull", "gazeDown", "cafeArgue", "cafeLeave", "crossroads", "turnMinaret", "billboards", "scarfWalk", "scarfClose", "rainSteady", "canalWind", "marketPull", "courtEnter", "doves", "matchRed", "matchShop", "matchCafe", "matchNeon", "bridgeGold", "rooftop"]);

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const W = (world: string, p: V3): V3 => add(add(p, SET_OFFSET.city), CITY_AREAS[world]);
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const LIGHT: Record<string, V3> = { street: [0.3, 0.8, 0.4], court: [0.2, 0.6, -0.6], canal: [-0.3, 0.7, 0.4], gold: [0.3, 0.25, -1], roof: [0, 0.3, -1] };
const lightOf = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...LIGHT[k]).normalize(), camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
type PutO = { mirror?: boolean; scale?: number; yaw?: number; blob?: string | null };
const STRIDE = 0.36;
const walkC = (look: string, dist: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}) =>
  walker(look, { phase: q(0.25 + dist / (2 * STRIDE), 240), k: 1, stride: Math.round(STRIDE / 0.00216), light: L, shawlNear: mirror, swing: 0.5, ...extra });
const seated = (look: string, arms: "rest" | "call" | "phone" | "head", L: number, tilt = 0): Card => ({ key: `sit8|${look}|${arms}|${L}|${q(tilt, 20)}`, draw: (p) => withLook(LOOKS[look], () => travellerChair(p, { light: L, arms, tilt, chair: false })) });
/** the scarf pulled closer: the near hand up at the collar */
const SCARF_ARM = (k: number) => ({ E: [338, 462 - 30 * k] as [number, number], W: [356 + 10 * k, 420 - 52 * k] as [number, number], hand: "dot" as const });
const T = "traveller", MEN = ["m1", "m2", "m3", "m4", "m5", "m6", "w1", "w2", "w3", "w4", "w5", "w6", "friend", "shopkeeper"];

// ---------------- where people are ----------------
const PATH_X = 1.45;
/** where he starts across the bridge (x), walking +x at 0.95 m/s */
export const BRIDGE_X0 = -4.7;                                                     // his line through the market (between tables and stalls)
/** his position through the market (z), the empty street and the crossing */
const marketZ = (t: number) => -1 - 0.85 * (t - 8.63);
const streetZ = (t: number) => -58 - 0.9 * (t - 14.37);
const stopZ = (t: number) => Math.max(CITY.STOP_Z + 0.55, -82.75 - 0.9 * (t - 17.77));          // he reaches the line as the light turns red
/** the feast: seated men at the tables (x, z, look, facing +x?) */
const FEAST: [number, number, string][] = [];
for (let i = 0; i < 6; i++) { const z = -4 - i * 6; FEAST.push([-1.3, z - 0.2, MEN[i % MEN.length]], [-1.3, z + 0.35, MEN[(i + 5) % MEN.length]]); if (i % 2) FEAST.push([0.0, z - 0.75, MEN[(i + 3) % MEN.length]]); }
/** standing men at the stalls */
const STALL: [number, number, string][] = Array.from({ length: 12 }, (_, i) => [i % 2 ? 2.0 : -2.0, -3 - i * 3, MEN[(i + 2) % MEN.length]] as [number, number, string]);

type Shot = { state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3 };
const NOHEAD: V3 = [0, -1000, 0];
const lightAt = (t: number) => (t < EV.amber ? 0 : t < EV.redLight ? 1 : 2);

export const shotAt0 = (f: number): Shot & { world: string } => {
  const sh = shotOf(f), t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), tl = (f - a) / FPS, mv = (c0: Cam, c1: Cam) => move(c0, c1, a, b)(f), w = sh.world;
  const r = (s: Shot) => ({ ...s, world: w });
  const put = (c: Card, p: V3, o: PutO = {}): TravellerCard => ({ pos: W(w, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, blob: o.blob });
  const crowd = (c: Cam, z0: number, z1: number) => {                     // the market's people between z0 and z1 (laughing: a small bob)
    const out: TravellerCard[] = [];
    FEAST.forEach(([x, z, lk], i) => { if (z > z0 || z < z1) return; const mir = mirrorFor(c, x < 0 ? 1 : -1, 0), bob = 0.02 * Math.max(0, Math.sin(t * 7 + i * 1.7));
      out.push(put(seated(lk, i % 3 === 0 ? "phone" : i % 3 === 1 ? "call" : "rest", lightOf("street", c, mir), -0.15 + 0.3 * Math.max(0, Math.sin(t * 5 + i))), [x, 0.02 + bob, z], { mirror: mir })); });
    STALL.forEach(([x, z, lk], i) => { if (z > z0 || z < z1) return; const mir = mirrorFor(c, -Math.sign(x), 0.2);
      out.push(put(walker(lk, { light: lightOf("street", c, mir), shawlNear: mir, armN: i % 3 === 0 ? reachArm(t * 0.7 + i, 0.4) : undefined, headRot: -0.15 + 0.1 * Math.sin(t * 4 + i) }), [x, 0, z], { mirror: mir })); });
    return out;
  };
  const him = (c: Cam, p: V3, walking: number | null, dir: [number, number], extra: Parameters<typeof walker>[1] = {}, lk = "street") => {
    const mir = mirrorFor(c, dir[0], dir[1]), L = lightOf(lk, c, mir);
    return put(walking === null ? walker(T, { light: L, shawlNear: mir, ...extra }) : walkC(T, walking, L, mir, extra), p, { mirror: mir });
  };
  switch (sh.kind) {
    // ======================= the gate (dusk) =======================
    case "gateBars": { const p: V3 = [0.25, 0, 9.6], c = mv(cam([0.75, 1.55, 14.2], [0.2, 1.45, 9.2], 34), cam([0.45, 1.5, 12.4], [0.2, 1.45, 9.2], 32));
      return r({ state: "court:0.15", cam: c, focus: add(p, [0, 1.5, 0]), cInf: 7, trav: him(c, p, null, [0, 1], { headRot: 0.05 }, "court"), head: add(p, [0, 1.8, 0]) }); }
    case "gateLook": { const p: V3 = [0.25, 0, 9.6], c = mv(cam([-0.5, 1.75, 7.6], [0.6, 1.4, 40], 40), cam([-0.2, 1.65, 8.4], [0.6, 1.5, 40], 38));
      return r({ state: "court:0.25", cam: c, focus: [0.6, 1.5, 60], cInf: 2, trav: put(back(T, lightOf("court", c)), p), head: add(p, [0, 1.8, 0]) }); }
    // ======================= the market (night) =======================
    case "marketWide": { const c = mv(cam([-2.6, 3.4, 6.5], [0.4, 1.2, -22], 46), cam([-1.6, 3.0, 3.2], [0.6, 1.2, -24], 44));
      return r({ state: "street:0", cam: c, focus: [0, 1.2, -10], cInf: 3, trav: null, others: crowd(c, 2, -36), head: NOHEAD }); }
    case "marketWalk": { const z = marketZ(t), p: V3 = [PATH_X, 0, z], c = cam([-1.05, 1.5, z + 1.6], [PATH_X + 2, 1.3, z - 1.2], 42);
      return r({ state: "street:0", cam: c, focus: add(p, [0, 1.3, 0]), cInf: 5, trav: him(c, p, Math.abs(z + 1), [0, -1]), others: crowd(c, z + 4, z - 14), head: add(p, [0, 1.8, 0]) }); }
    case "marketLow": { const z = marketZ(t), p: V3 = [PATH_X, 0, z], c = cam([1.15, 0.42, z - 3.3], [PATH_X - 0.2, 2.6, z + 1.5], 50);
      return r({ state: "street:0", cam: c, focus: add(p, [0, 1.2, 0]), cInf: 4, trav: him(c, p, Math.abs(z + 1), [0, -1]), others: crowd(c, z + 6, z - 10), head: add(p, [0, 1.8, 0]) }); }
    case "marketPull": { const p: V3 = [0.6, 0, 5.2], c = mv(cam([0.95, 1.6, 7.4], [0.2, 1.35, -14], 40), cam([0.85, 1.55, 6.6], [0.2, 1.35, -14], 36));
      return r({ state: "street:0", cam: c, focus: add(p, [0, 1.5, 0]), cInf: 9, trav: put(back(T, lightOf("street", c)), p), others: crowd(c, 0, -26), head: add(p, [0, 1.8, 0]) }); }
    // ======================= the empty street, the crossing =======================
    case "emptyStreet": { const z = streetZ(t), p: V3 = [0.4, 0, z], c = cam([1.25, 0.8, z + 3.4 - 0.6 * u], [0.0, 1.3, z - 6], 42);
      return r({ state: "street:0", cam: c, focus: add(p, [0, 1.2, 0]), cInf: 4, trav: him(c, p, Math.abs(z + 58), [0, -1]), head: add(p, [0, 1.8, 0]) }); }
    case "redLight": { const z = stopZ(t), p: V3 = [0.6, 0, z], walking = z > CITY.STOP_Z + 0.56;
      const c = mv(cam([-0.7, 0.75, CITY.STOP_Z - 3.6], [1.3, 1.9, CITY.STOP_Z + 1], 42), cam([-0.55, 0.7, CITY.STOP_Z - 3.1], [1.35, 1.95, CITY.STOP_Z + 1], 40));
      return r({ state: `street:${lightAt(t)}`, cam: c, focus: add(p, [0, 1.3, 0]), cInf: 5, trav: him(c, p, walking ? Math.abs(z + 60) : null, [0, -1]), head: add(p, [0, 1.8, 0]) }); }
    // ======================= the shop window =======================
    case "shopReach": case "shopPull": { const S0 = CITY.SHOP, p: V3 = [S0[0] + 0.85, 0, S0[2] + 0.2];
      const k = sh.kind === "shopReach" ? smooth((t - EV.reach[0]) / (EV.reach[1] - EV.reach[0])) : 1 - smooth((t - EV.pullBack) / 1.2);
      const c = sh.kind === "shopReach" ? mv(cam([S0[0] + 1.9, 1.55, S0[2] + 2.4], [S0[0] + 0.3, 1.35, S0[2] - 0.3], 40), cam([S0[0] + 1.7, 1.5, S0[2] + 1.9], [S0[0] + 0.3, 1.35, S0[2] - 0.2], 36))
        : mv(cam([S0[0] + 1.45, 1.42, S0[2] + 1.15], [S0[0] + 0.35, 1.3, S0[2] + 0.05], 32), cam([S0[0] + 1.35, 1.4, S0[2] + 0.95], [S0[0] + 0.4, 1.3, S0[2] + 0.1], 28));
      return r({ state: "street:2", cam: c, focus: [S0[0] + 0.4, 1.3, S0[2] + 0.2], cInf: 8, trav: him(c, p, null, [-1, 0], { armN: reachArm(0, 0.15 + 0.3 * k), headRot: 0.05 + 0.15 * (1 - k) }), head: add(p, [0, 1.8, 0]) }); }
    case "gazeDown": { const p: V3 = [0.2, 0, -101], k = smooth((t - 26.3) / 0.9), c = mv(cam([1.6, 1.0, -98.4], [0.1, 1.6, -101.2], 40), cam([1.25, 1.05, -99.1], [0.15, 1.6, -101.2], 34));
      return r({ state: "street:2", cam: c, focus: add(p, [0, 1.6, 0]), cInf: 7, trav: him(c, p, null, [0, -1], { headRot: 0.45 * k }), head: add(p, [0, 1.8, 0]) }); }
    case "wetStones": { const k = smooth(u), c = cam([0.3, 1.5 - 1.22 * k, -101.6 - 0.6 * k], [0.3, 0.55 - 0.5 * k, -106 - 8 * k], 40);   // down with his eyes, then low over the wet stones
      return r({ state: "street:2", cam: c, focus: [0.35, 0, -104], cInf: 6, trav: null, head: NOHEAD }); }
    // ======================= the cafe =======================
    case "cafeArgue": case "cafeLeave": { const C0 = CITY.CAFE, seats: [number, string][] = [[0.4, "m3"], [0.4 + Math.PI / 2, "m5"], [0.4 + Math.PI, T], [0.4 + 1.5 * Math.PI, "w2"]];
      const leave = sh.kind === "cafeLeave", up = leave ? clamp01((t - EV.standUp) / 0.5) : 0;
      const c = leave ? mv(cam([C0[0] + 2.4, 1.3, C0[2] + 1.6], [C0[0] - 0.6, 1.0, C0[2] - 0.2], 40), cam([C0[0] + 2.2, 1.35, C0[2] + 2.1], [C0[0] - 1.2, 1.15, C0[2] - 0.2], 40))
        : cam([C0[0] + 2.6 * Math.cos(1.05 + 0.3 * u), 1.4, C0[2] + 2.6 * Math.sin(1.05 + 0.3 * u)], [C0[0], 0.95, C0[2]], 40);
      const others = seats.filter(([, lk]) => lk !== T).map(([a0, lk], i) => { const x = C0[0] + Math.cos(a0) * 0.9, z = C0[2] + Math.sin(a0) * 0.9, mir = mirrorFor(c, -Math.cos(a0), -Math.sin(a0));
        return put(seated(lk, ["call", "rest", "call"][i] as "call" | "rest", lightOf("street", c, mir), 0.25 * Math.sin(t * 6 + i * 2)), [x, 0.02 + 0.015 * Math.abs(Math.sin(t * 8 + i)), z], { mirror: mir }); });
      const a0 = seats[2][0], x = C0[0] + Math.cos(a0) * 0.9, z = C0[2] + Math.sin(a0) * 0.9, mir = mirrorFor(c, -Math.cos(a0), -Math.sin(a0));
      const trav = up < 0.5 ? put(seated(T, "rest", lightOf("street", c, mir), leave ? -0.25 : -0.12), [x, 0.02, z], { mirror: mir })
        : him(c, [x - 0.6 * Math.max(0, t - EV.standUp - 0.5), 0, z + 0.2], t > EV.standUp + 0.6 ? 0.6 * (t - EV.standUp - 0.5) : null, [-1, 0.3]);
      return r({ state: "street:2", cam: c, focus: [C0[0], 1.0, C0[2]], cInf: 6, trav, others, head: [x, 1.4, z] }); }
    // ======================= the crossroads =======================
    case "crossroads": { const p: V3 = [0.3, 0, CITY.FORK_Z + 6], c = mv(cam([0.6, 2.6, CITY.FORK_Z + 16], [0.2, 6, CITY.FORK_Z - 30], 62), cam([0.5, 2.3, CITY.FORK_Z + 13], [0.2, 6.5, CITY.FORK_Z - 30], 60));
      return r({ state: "street:2", cam: c, focus: add(p, [0, 1.5, 0]), cInf: 3, trav: put(back(T, lightOf("street", c)), p), head: add(p, [0, 1.8, 0]) }); }
    case "turnMinaret": { const d = Math.max(0, tl - 0.6) * 0.9, p: V3 = [0.3 + d * 0.8, 0, CITY.FORK_Z + 6 - d * 0.6];
      const c = mv(cam([-1.4, 1.5, CITY.FORK_Z + 9.5], [6, 4.5, CITY.FORK_Z - 4], 44), cam([-0.6, 1.4, CITY.FORK_Z + 8.4], [12, 7, CITY.FORK_Z - 8], 44));
      return r({ state: "street:2", cam: c, focus: add(p, [0, 1.5, 0]), cInf: 3, trav: tl < 0.6 ? put(back(T, lightOf("street", c)), p) : him(c, p, d, [0.8, -0.6]), head: add(p, [0, 1.8, 0]) }); }
    // ======================= billboards, the scarf =======================
    case "billboards": { const z = -121 - 0.8 * tl, p: V3 = [0.5, 0, z], c = cam([-1.8, 0.7, z - 5.0 + 0.8 * u], [0.6, 3.2, z + 2], 50);
      const passers = [0, 1, 2].map((i) => { const pz = z - 3 + i * 2.2 + 0.9 * tl * (i % 2 ? 1 : -1), px = i % 2 ? -2.1 : 2.4, mir = mirrorFor(c, 0, i % 2 ? 1 : -1); return put(walkC(MEN[i + 4], Math.abs(pz), lightOf("street", c, mir), mir), [px, 0, pz], { mirror: mir }); });
      return r({ state: "street:2", cam: c, focus: add(p, [0, 1.4, 0]), cInf: 4, trav: him(c, p, 0.8 * tl, [0, -1]), others: passers, head: add(p, [0, 1.8, 0]) }); }
    case "scarfWalk": { const z = -126 - 0.75 * tl, p: V3 = [0.4, 0, z], k = smooth((tl - 0.2) / 0.8) * (1 - 0.6 * smooth((tl - 1.8) / 0.6)), c = cam([2.6, 1.5, z + 1.2], [0.2, 1.45, z - 0.6], 38);
      return r({ state: "street:2", cam: c, focus: add(p, [0, 1.5, 0]), cInf: 6, trav: him(c, p, 0.75 * tl, [0, -1], { armN: SCARF_ARM(k) }), head: add(p, [0, 1.8, 0]) }); }
    // ======================= the canal: wind and rain =======================
    case "scarfClose": { const p: V3 = [5.2, 0, 2], k = smooth((tl - 0.3) / 1.6), c = mv(cam([6.6, 1.62, 0.6], [5.15, 1.58, 2.1], 34), cam([6.25, 1.6, 0.95], [5.15, 1.6, 2.1], 30));
      return r({ state: "canal:0:0.6", cam: c, focus: add(p, [0, 1.55, 0]), cInf: 8, trav: him(c, p, null, [0, -1], { armN: SCARF_ARM(k), headRot: 0.12 }, "canal"), head: add(p, [0, 1.8, 0]) }); }
    case "rainSteady": { const z = 0 - 0.7 * tl, p: V3 = [5.0, 0, z], c = cam([7.2, 1.3, z + 1.8], [4.6, 1.5, z - 1.4], 40);
      return r({ state: "canal:0:0.75", cam: c, focus: add(p, [0, 1.4, 0]), cInf: 5, trav: him(c, p, 0.7 * tl, [0, -1], { armN: SCARF_ARM(0.7) }, "canal"), head: add(p, [0, 1.8, 0]) }); }
    case "canalWind": { const z = -4 - 0.55 * tl, p: V3 = [5.0, 0, z], c = mv(cam([-4.2, 1.1, z + 6.5], [4.2, 1.6, z - 1.5], 40), cam([-4.0, 1.0, z + 4.0], [4.2, 1.6, z - 1.5], 38));
      return r({ state: "canal:0:1", cam: c, focus: add(p, [0, 1.4, 0]), cInf: 3, trav: him(c, p, 0.55 * tl, [0, -1], { armN: SCARF_ARM(0.85), headRot: 0.2 }, "canal"), head: add(p, [0, 1.8, 0]) }); }
    // ======================= the masjid courtyard (night) =======================
    case "courtEnter": { const z = 9.3 - 0.85 * tl, p: V3 = [0.2, 0, z], c = mv(cam([1.4, 0.75, z - 4.2], [0.1, 1.9, z + 2], 44), cam([1.2, 0.8, 9.3 - 0.85 * 2.47 - 3.4], [0.1, 1.9, z + 2], 44));
      return r({ state: "court:1", cam: c, focus: add(p, [0, 1.4, 0]), cInf: 5, trav: him(c, p, 0.85 * tl, [0, -1], {}, "court"), head: add(p, [0, 1.8, 0]) }); }
    case "doves": { const p: V3 = [0.3, 0, 3.6], c = mv(cam([0.9, 0.7, 7.4], [0.0, 4.2, -14], 46), cam([0.7, 0.65, 6.6], [0.0, 6.5, -14], 48));
      return r({ state: "court:1", cam: c, focus: [0, 3, -4], cInf: 3, trav: put(back(T, lightOf("court", c)), p), head: add(p, [0, 1.8, 0]) }); }
    // ======================= match cuts: each temptation fading behind him =======================
    case "matchRed": case "matchShop": case "matchCafe": case "matchNeon": {
      const at: Record<string, V3> = { matchRed: [0.6, 0, CITY.STOP_Z + 4.5], matchShop: [-2.0, 0, CITY.SHOP[2] + 5], matchCafe: [1.0, 0, CITY.CAFE[2] + 5.5], matchNeon: [1.6, 0, CITY.FORK_Z + 2] };
      const P0 = at[sh.kind], zz = P0[2] + 0.75 * tl, xx = sh.kind === "matchNeon" ? P0[0] + 0.75 * tl : P0[0], p: V3 = [xx, 0, sh.kind === "matchNeon" ? P0[2] : zz];
      const dir: [number, number] = sh.kind === "matchNeon" ? [1, 0] : [0, 1];
      const c = sh.kind === "matchNeon" ? cam([p[0] + 3.6, 1.45, p[2] + 0.9], [p[0] - 4, 1.9, p[2] - 0.6], 42) : cam([p[0] + 0.5, 1.5, p[2] + 3.6], [p[0] - 0.1, 1.7, p[2] - 6], 42);
      return r({ state: `street:${sh.kind === "matchRed" ? 2 : 0}:${q(0.85 * smooth(u), 30)}`, cam: c, focus: add(p, [0, 1.5, 0]), cInf: 9, trav: him(c, p, 0.75 * tl + 3, dir), head: add(p, [0, 1.8, 0]) }); }
    // ======================= golden hour, sunrise =======================
    case "bridgeGold": { const x = BRIDGE_X0 + 0.95 * tl, p: V3 = [x, CITY.deckY(x), CITY.BRIDGE_Z - 0.1];
      const c = mv(cam([-2.6, 0.35, CITY.BRIDGE_Z + 7.6], [-2.2, 1.0, CITY.BRIDGE_Z], 40), cam([-0.6, 0.45, CITY.BRIDGE_Z + 6.8], [-0.9, 1.1, CITY.BRIDGE_Z], 38));
      return r({ state: "canal:1:0", cam: c, focus: add(p, [0, 1.3, 0]), cInf: 4, trav: him(c, p, 0.85 * tl, [1, 0], {}, "gold"), head: add(p, [0, 1.8, 0]) }); }
    case "rooftop": { const p: V3 = [0.2, 0, -4.6], ang = lerp(0.45, 0.12, smooth(u)), cp: V3 = [0.2 + 3.6 * Math.sin(ang), 1.55, -4.6 + 3.6 * Math.cos(ang)];
      const c = cam(cp, [p[0] - Math.sin(ang) * 24, 3.6, p[2] - Math.cos(ang) * 24], 42);   // looking past him toward the sunrise
      return r({ state: `roof:${q(0.2 + 0.25 * u, 30)}`, cam: c, focus: add(p, [0, 1.5, 0]), cInf: 3, trav: put(back(T, lightOf("roof", c)), p), head: add(p, [0, 1.8, 0]) }); }
    case "riseLight": { const p: V3 = [0.2, 0, -4.6], k = smooth(clamp01((t - 77.0) / 5.5)), c = cam([0.25 + 0.8 * k, 1.7 + 22 * k, -0.6 + 6 * k], [0, 2.6 + 34 * k, -30 - 30 * k], 42 + 8 * k);
      return r({ state: `roof:${q(0.45 + 0.4 * k, 30)}`, cam: c, focus: add(p, [0, 1.5, 0]), cInf: 2, trav: put(back(T, lightOf("roof", c)), p), head: add(p, [0, 1.8, 0]) }); }
  }
  throw new Error("no shot " + sh.kind);
};
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.4);
  const c = { ...s.cam, pos: add(W(s.world, s.cam.pos), hh.pos), look: add(W(s.world, s.cam.look), hh.look) };
  return { frame: { set: "city", state: s.state, t: f / FPS, plan: { cam: c, focus: W(s.world, s.focus), cInf: s.cInf, nearScale: 1.7 }, traveller: s.trav, others: s.others }, head: W(s.world, s.head), shot: sh };
};
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 1200), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
/** the film look: grain, a soft vignette, gentle lens breathing; a whip-pan blur on the beats; soft blur on dissolves;
 *  "the dunya pulling": the frame's edges smear outward (zoom blur) in marketPull */
export const fxAt = (f: number): FrameFx => {
  const t = f / FPS; let bx = 0, by = 0;
  for (const tr of TRANSITIONS) { const d = Math.abs(f - tr.f);
    if (tr.kind === "whip" && d < 6) bx = Math.max(bx, 46 * (1 - d / 6));
    if (tr.kind === "dissolve" && d < 9) { bx = Math.max(bx, 4 * (1 - d / 9)); by = Math.max(by, 4 * (1 - d / 9)); } }
  const sh = shotOf(f), pull = sh.kind === "marketPull" ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0;
  const breathe = 1.008 + 0.005 * Math.sin(t * 0.6) + 0.025 * pull;
  return { blurX: bx, blurY: by, ca: 0.8 + 3.5 * pull, glitch: 0, flash: 0, vignette: 0.95, grain: true, zoom: { scale: breathe, x: 540, y: 900, blur: 2.5 * pull }, css: "contrast(1.07) saturate(1.06)" };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
void lerp;
