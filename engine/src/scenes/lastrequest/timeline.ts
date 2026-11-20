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
import { travellerLying, travellerBedPhoneWide } from "../../characters/travellerPoses";
import { walker, stoop, LOOKS, type Card } from "../../characters/people";
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
export const EV = {
  lightOut: F(STORY.events.lightOut), phoneOff: F(STORY.events.phoneOff), hospDark: F(STORY.events.hospitalDark),
  lightning: STORY.events.lightning.map(F), soil: STORY.events.soil.map(F), flicker: STORY.events.flicker.map(F),
};
export type PShot = { kind: string; set: SetId; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, set: s.set as SetId, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const SETS: SetId[] = ["bedroom", "hospital", "cemetery"];

const q = (v: number, n: number) => Math.round(v * n) / n;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (id: SetId, p: V3): V3 => add(p, SET_OFFSET[id]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LDIR: Record<string, V3> = { room: [0.9, 0.8, -1.2], hosp: [-0.9, 1.0, 1.0], cem: [0.4, 1.2, 0.6], street: [0.3, 1.3, 0.8] };
const camRight = (c: Cam) => { const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
const lightOf = (k: string, c: Cam, mirror = false) => q(light2D(new THREE.Vector3(...LDIR[k]).normalize(), camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
const put = (set: SetId, c: Card, p: V3, o: { mirror?: boolean; scale?: number; yaw?: number; wide?: boolean; blob?: string | null; shadow?: boolean } = {}): TravellerCard =>
  ({ pos: W(set, p), key: c.key, draw: c.draw as (p: Pen) => void, mirror: o.mirror, scale: o.scale, yaw: o.yaw, wide: o.wide, blob: o.blob, castShadow: o.shadow });
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
const mourners = (c: Cam, leave: number): TravellerCard[] => {
  const spots: [string, number, number, number][] = [["m3", -1.6, -1.9, -1], ["m6", -0.6, -2.05, -1], ["m2", 0.5, -2.0, 1], ["m1", 1.6, -1.85, 1], ["m4", -2.3, 1.2, -1], ["m5", 2.3, 1.25, 1]];
  const um = ["#1d2128", "#2a2d33", "#16191e", "#24272c", "#1d2128", "#2a2d33"];
  return spots.map(([lk, x, z, dir], i) => {
    const d = Math.max(0, leave - 0.25 * i) * 0.55, mir = mirrorFor(c, dir, 0), L = lightOf("cem", c, mir);
    return put("cemetery", d > 0 ? walkC(lk, d, L, mir, { umbrella: um[i] }) : walker(lk, { light: L, shawlNear: mir, umbrella: um[i], headRot: 0.15 }), [x + dir * d, 0, z], { mirror: mir });
  });
};

// ---------------- the shots ----------------
type Shot = { set: SetId; state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; others?: TravellerCard[]; head: V3; hooks?: Frame["hooks"] };
/** the clock of the voice part (seconds to minutes past 3 a.m.) */
export const shotAt0 = (f: number): Shot => {
  const sh = shotOf(f), t = f / FPS, a = sh.from, b = sh.to, u = clamp01((f - a) / Math.max(1, b - a)), mv = (c0: Cam, c1: Cam) => move(c0, c1, a, b)(f);
  const roomState = f < EV.phoneOff ? "night" : "nightOff";
  const bedPhone = (c: Cam, dark = false): TravellerCard => {
    const L = lightOf("room", c), sc = q((t * 0.7) % 1, 10);
    return put("bedroom", { key: `bedphone|${sc}|${dark}|${L}`, draw: (p) => withLook(MUTED, () => travellerBedPhoneWide(p, { light: L, scroll: sc, dark })) }, BEDROOM.SIT, { wide: true, blob: null });
  };
  const HEAD_SIT: V3 = [BEDROOM.SIT[0] - 0.3, 1.25, BEDROOM.SIT[2]];
  switch (sh.kind) {
    case "rainWindow": return { set: "bedroom", state: roomState, cam: mv(cam([1.1, 1.62, -0.75], [1.05, 1.58, -2.2], 42), cam([1.08, 1.6, -1.1], [1.05, 1.58, -2.2], 38)), focus: [1.05, 1.6, -2.18], cInf: 3, trav: null, head: [0, -5, 0] };
    case "dustyMat": return { set: "bedroom", state: roomState, cam: mv(cam([1.9, 1.05, 1.6], [1.0, 0.05, 0.25], 42), cam([1.6, 0.85, 1.2], [1.0, 0.03, 0.25], 38)), focus: [1.0, 0.03, 0.25], cInf: 5, trav: null, head: [0, -5, 0] };
    case "scroll3am": { const c = mv(cam([0.9, 1.45, 1.45], [-1.0, 1.25, -1.5], 44), cam([0.7, 1.4, 1.15], [-1.05, 1.25, -1.5], 42)); return { set: "bedroom", state: roomState, cam: c, focus: HEAD_SIT, cInf: 4, trav: bedPhone(c), head: HEAD_SIT }; }
    case "mushaf": return { set: "bedroom", state: roomState, cam: mv(cam([-1.85, 2.05, -0.8], [-2.62, 1.92, -2.03], 40), cam([-2.0, 2.02, -1.0], [-2.63, 1.92, -2.03], 36)), focus: [-2.63, 1.93, -2.03], cInf: 7, trav: null, head: [0, -5, 0] };
    case "clockSpin": return { set: "bedroom", state: roomState, cam: mv(cam([-1.15, 2.0, -0.95], [-1.3, 2.18, -2.19], 40), cam([-1.2, 2.05, -1.2], [-1.3, 2.19, -2.19], 36)), focus: [-1.3, 2.2, -2.18], cInf: 6, trav: null, head: [0, -5, 0] };
    case "tasbih": { const c = mv(cam([0.15, 0.88, -0.45], [-1.0, 0.75, -1.3], 42), cam([0.05, 0.85, -0.55], [-1.05, 0.74, -1.3], 40)); return { set: "bedroom", state: roomState, cam: c, focus: HEAD_SIT, cInf: 6, trav: bedPhone(c), head: HEAD_SIT }; }
    case "roomDim": { const c = mv(cam([1.9, 1.75, 2.1], [-0.9, 0.85, -1.3], 44), cam([2.4, 1.95, 2.7], [-0.9, 0.85, -1.3], 46)); return { set: "bedroom", state: roomState, cam: c, focus: HEAD_SIT, cInf: 3, trav: bedPhone(c), head: HEAD_SIT }; }
    case "lightOut": { const c = mv(cam([0.45, 1.35, 1.1], [-1.1, 1.0, -1.3], 42), cam([0.3, 1.3, 0.85], [-1.12, 1.0, -1.3], 40)); return { set: "bedroom", state: roomState, cam: c, focus: HEAD_SIT, cInf: 5, trav: bedPhone(c, f >= EV.phoneOff), head: HEAD_SIT }; }
    // ---- the recitation ----
    case "hospRain": return { set: "hospital", state: "on", cam: mv(cam([-1.55, 1.55, -1.1], [-1.6, 1.5, -2.38], 40), cam([-1.58, 1.52, -1.45], [-1.6, 1.5, -2.38], 36)), focus: [-1.6, 1.5, -2.37], cInf: 3, trav: null, head: [0, -5, 0] };
    case "monitor": return { set: "hospital", state: "on", cam: mv(cam([0.2, 1.55, -0.55], [0.95, 1.42, -2.05], 38), cam([0.32, 1.52, -0.8], [0.95, 1.42, -2.05], 34)), focus: [0.95, 1.45, -2.04], cInf: 6, trav: null, head: [0, -5, 0] };
    case "hospitalWide": case "emptyBed": {
      const wide = sh.kind === "hospitalWide";
      const c = wide ? mv(cam([2.2, 1.65, 1.0], [-0.1, 0.8, -1.4], 44), cam([1.8, 1.55, 0.6], [-0.1, 0.8, -1.45], 42)) : mv(cam([-0.4, 1.35, 1.3], [0.0, 0.7, -1.3], 44), cam([-0.35, 1.3, 1.0], [0.0, 0.7, -1.3], 42));
      const L = lightOf("hosp", c, true), st = q(0.1 + 0.05 * Math.sin(t * 0.8), 20);
      const trav = wide ? put("hospital", { key: `hlie|${st}|${L}`, draw: (p) => withLook(MUTED, () => travellerLying(p, { light: L, stir: st })) }, [HOSPITAL.BED[0], 0.72, HOSPITAL.BED[2] + 0.03], { wide: true, blob: null, yaw: Math.PI / 2, mirror: true, scale: 0.88 }) : null;
      return { set: "hospital", state: wide && f < EV.hospDark ? "on" : "dark", cam: c, focus: [0, 0.8, -1.4], cInf: 4, trav, head: wide ? [0, 0.95, -2.1] : [0, -5, 0] };
    }
    case "phoneGlow": { const c = mv(cam([0.0, 1.32, 0.3], [-1.35, 1.05, -1.3], 42), cam([-0.15, 1.28, 0.05], [-1.38, 1.05, -1.3], 38)); return { set: "bedroom", state: "night", cam: c, focus: [-0.85, 1.05, -1.3], cInf: 6, trav: bedPhone(c), head: HEAD_SIT }; }
    case "laptopBank": { const c = mv(cam([1.0, 1.05, 0.05], [0.12, 0.66, -1.2], 42), cam([0.8, 0.98, -0.2], [0.12, 0.66, -1.22], 38)); return { set: "bedroom", state: "night", cam: c, focus: [0.12, 0.7, -1.22], cInf: 5, trav: bedPhone(c), head: HEAD_SIT }; }
    case "laptopClose": return { set: "bedroom", state: "night", cam: mv(cam([0.55, 0.98, -0.42], [0.12, 0.72, -1.25], 34), cam([0.48, 0.95, -0.55], [0.12, 0.72, -1.25], 30)), focus: [0.12, 0.72, -1.25], cInf: 7, trav: null, head: [0, -5, 0] };
    case "mushafDust": return { set: "bedroom", state: "night", cam: mv(cam([-1.7, 2.1, -0.65], [-2.62, 1.92, -2.03], 40), cam([-1.95, 2.05, -0.95], [-2.63, 1.92, -2.03], 34)), focus: [-2.63, 1.93, -2.03], cInf: 7, trav: null, head: [0, -5, 0] };
    case "beadsBed": { const c = mv(cam([0.3, 1.0, -0.15], [-0.55, 0.62, -1.05], 40), cam([0.2, 0.95, -0.3], [-0.5, 0.6, -1.0], 36)); return { set: "bedroom", state: "night", cam: c, focus: [-0.45, 0.58, -0.95], cInf: 6, trav: bedPhone(c), head: HEAD_SIT }; }
    case "trackerRoom": { const c = mv(cam([2.1, 2.05, 1.6], [-0.8, 0.8, -1.3], 44), cam([1.9, 2.15, 1.3], [-0.85, 0.8, -1.3], 42)); return { set: "bedroom", state: "night", cam: c, focus: HEAD_SIT, cInf: 3, trav: bedPhone(c), head: HEAD_SIT }; }
    case "matPhone": return { set: "bedroom", state: "nightOff", cam: mv(cam([1.75, 0.65, 1.05], [1.0, 0.05, 0.25], 42), cam([1.6, 0.58, 0.9], [1.0, 0.04, 0.25], 38)), focus: [1.0, 0.05, 0.25], cInf: 6, trav: null, head: [0, -5, 0] };
    case "leftBehind": { const e = smooth(u); return { set: "bedroom", state: "nightOff", cam: cam([0.8 - 0.3 * e, 1.4, 1.6], [lerp(-0.6, -2.45, e), lerp(0.7, 1.5, e), lerp(-1.3, -2.0, e)], 42), focus: [lerp(-0.6, -2.45, e), 1.0, lerp(-1.3, -2.0, e)], cInf: 4, trav: null, head: [0, -5, 0] }; }
    case "stillWindow": return { set: "bedroom", state: "nightOff", cam: mv(cam([2.05, 1.3, 0.35], [1.0, 1.5, -2.2], 42), cam([1.95, 1.32, 0.05], [1.0, 1.52, -2.2], 40)), focus: [1.0, 1.5, -2.2], cInf: 3, trav: null, head: [0, -5, 0] };
    case "lightning": return { set: "bedroom", state: "nightOff", cam: mv(cam([1.6, 1.6, 2.2], [-0.6, 0.9, -1.3], 46), cam([1.55, 1.58, 2.1], [-0.6, 0.9, -1.3], 46)), focus: [-0.6, 0.8, -1.3], cInf: 3, trav: null, head: [0, -5, 0] };
    case "janazah": { const x = procX(t), c = cam([x - 0.5, 1.5, 7.9], [x - 0.3, 1.25, PROC.z], 46); return { set: "cemetery", state: "rain", cam: c, focus: [x, 1.3, PROC.z], cInf: 4, trav: null, others: procession(c, t), head: [x, 1.8, PROC.z] }; }
    case "janazahLow": { const x = procX(t), c = cam([x + 0.75, 0.36, 5.3], [x + 0.6, 0.95, PROC.z], 46); return { set: "cemetery", state: "rain", cam: c, focus: [x, 0.6, PROC.z], cInf: 5, trav: null, others: procession(c, t), head: [x, 1.8, PROC.z] }; }
    case "burial": { const c = mv(cam([0.65, 1.65, 2.05], [0.0, 0.05, 0.2], 46), cam([0.55, 1.6, 1.9], [0.0, 0.05, 0.2], 44));
      const [s0, s1] = EV.soil, fill = 0.65 * smooth((f - s0) / (s1 - s0));
      const dig = (x: number, dir: number, ph: number) => { const k = 0.35 + 0.25 * Math.max(0, Math.sin(t * 2.4 + ph)), mir = mirrorFor(c, dir, 0); return put("cemetery", stoop(["m1", "m4"][ph], k, lightOf("cem", c, mir)), [x, 0, -0.05], { mirror: mir }); };
      return { set: "cemetery", state: "rain", cam: c, focus: [0, 0, 0], cInf: 4, trav: null, others: [dig(-1.45, 1, 0), dig(1.45, -1, 1), ...mourners(c, 0).slice(0, 4)], head: [0, -5, 0], hooks: { graveFill: fill } };
    }
    case "leaving": { const e = smooth(u * 0.95), c = cam([lerp(0.8, 0.6, e), lerp(1.4, 5.0, e), lerp(3.0, 6.0, e)], [0, 0.05, lerp(0.4, 0.2, e)], lerp(44, 46, e));
      return { set: "cemetery", state: "rain", cam: c, focus: [0, 0, 0], cInf: 3, trav: null, others: mourners(c, (f - a) / FPS - 0.6), head: [0, -5, 0], hooks: { graveFill: 1 } };
    }
    case "emptyCity": return { set: "street", state: "dark", cam: mv(cam([19.2, 1.15, 6.4], [21.5, 2.2, -0.2], 44), cam([19.6, 1.2, 6.3], [21.8, 2.3, -0.2], 44)), focus: [21, 1.2, 1], cInf: 2, trav: null, head: [0, -5, 0], hooks: { streetX: 21, officeBanner: null } };
    case "houseDark": return { set: "street", state: "dark", cam: mv(cam([26.2, 1.6, 5.0], [27.0, 2.6, -0.2], 44), cam([26.4, 1.7, 4.4], [27.0, 2.7, -0.2], 42)), focus: [27, 2.2, -0.2], cInf: 2, trav: null, head: [0, -5, 0], hooks: { streetX: 27, officeBanner: null } };
    case "emptyStreet": return { set: "street", state: "dark", cam: mv(cam([9.0, 1.7, 6.0], [30, 1.5, 1.2], 42), cam([10.0, 1.6, 6.0], [31, 1.45, 1.2], 42)), focus: [20, 1.5, 1.5], cInf: 1.5, trav: null, head: [0, -5, 0], hooks: { streetX: 20, officeBanner: null } };
    default: { // graveFog: the camera pulls far back and up into the dark
      const e = Math.pow(u, 0.8), c = cam([lerp(0.5, 0.3, e), lerp(1.2, 3.6, e), lerp(2.6, 17, e)], [0, 0.15, 0.3], lerp(42, 40, e));
      return { set: "cemetery", state: "fog", cam: c, focus: [0, 0.2, 0], cInf: 2, trav: null, head: [0, -5, 0], hooks: { graveFill: 1 } };
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
  // each cut eases in from a slow dissolve-like soft blur (no zooms, no whooshes)
  const soft = first < 8 ? 2.5 * (1 - first / 8) : 0;
  return { blurX: soft, blurY: soft, ca: 0, glitch: 0, flash: 0, vignette: 1.1, grain: true, css: "saturate(0.42) contrast(1.05) brightness(1.08)" };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
