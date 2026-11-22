// Video 004 "The Man Who Never Rested": one man, the Traveller, alone in a vast library at night. He pulls book after
// book off the shelves; each time we are carried INTO the book (the narrator's words pour out of the page as gold
// letters, the camera dives through them into a world that acts them out), then pulled back out into the library.
// THE RULE: he never rests, sits or stops moving (running, climbing, rowing, walking) until the last shot, where he
// finally sits down by the lamp. Never steeper than 45 degrees on him; faceless; no prophet, angel or Paradise shown.
// Timing: videos/004-never-rested/timing.json (narration words), shots.json (shots, transitions, events).
import * as THREE from "three";
import { Cam, V3, clamp01, smooth, applyCam } from "../../camera/ease";
import { SU, light2D } from "../../render/card";
import { walker, stoop, reachArm, type Card } from "../../characters/people";
import { withLook } from "../../characters/traveller";
import { travellerChair } from "../../characters/travellerPoses";
import { LOOKS } from "../../characters/people";
import { cam, handheld } from "../toolkit/timeline";
import type { Accent } from "../../film/film";
import { SET_OFFSET, Frame, TravellerCard, FrameFx, SetId } from "../../story/story";
import { LIB } from "../../sets/library";
import { WORLD, seaY } from "../../sets/bookworlds";
import { openHand } from "./art";
import TIMING from "../../../../videos/004-never-rested/timing.json";
import STORY from "../../../../videos/004-never-rested/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export type PShot = { kind: string; set: SetId; from: number; to: number };
export const SHOTS: PShot[] = STORY.shots.map((s, i, a) => ({ kind: s.kind, set: s.set as SetId, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES }));
export const shotOf = (f: number): PShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
export const TRANSITIONS = (STORY.events.transitions as [number, string][]).map(([t, k]) => ({ f: F(t), kind: k }));
export const EV = STORY.events as unknown as { bookThud: number[]; crumble: number[]; lightning: number[]; sit: number; exhale: number; closeBook: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const q = (v: number, n: number) => Math.round(v * n) / n;
const glideU = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const ease = (u: number) => glideU(u) * 0.6 + clamp01(u) * 0.4;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const noise1 = (t: number, seed: number) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 17.3), hash(i + 1 + seed * 17.3), u) * 2 - 1; };
/** world position of a point in a set (library) or in one of the book worlds */
const Wl = (p: V3): V3 => add(p, SET_OFFSET.library);
const Ww = (area: V3, p: V3): V3 => add(add(p, area), SET_OFFSET.bookworlds);

// ---------------- the lightning (storm at sea) ----------------
export const flashAt = (t: number) => Math.max(0, ...EV.lightning.map((l) => { const d = t - l; return d < 0 || d > 0.5 ? 0 : d < 0.05 ? 1 : d < 0.1 ? 0.3 : d < 0.16 ? 0.8 : Math.exp(-(d - 0.16) / 0.1); }));

// ---------------- the hero book (pulled, opened toward the camera, flipped to an ink drawing, dived into, closed) ----------------
/** normal: the direction the open pages face (toward the camera); flip 0..1: the pages flipping fast; drawing: which ink
 *  drawing the pages land on (the scene we are about to enter, or have just left) */
export type BookState = { visible: boolean; pos: V3; normal: V3; open: number; flip: number; drawing: string };
const RUNG = 1.9, LADX = 1.55;
const nrm = (v: V3): V3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const N_LADDER = nrm([-1, 0.62, 0.25]), N_FLOOR = nrm([0.55, 0.62, 0.55]), N_NOOK = nrm([0.75, 0.62, 0.45]);
const PAGES = STORY.events.pages as { enter: [number, string][]; exit: [number, string][]; enterLen: number; exitLen: number; flipLen: number };
/** the page sequence at t: entering a book (k 0..1 over enterLen after the cut), leaving one (k 0..1 over exitLen before the cut) */
export const pageAt = (t: number): { mode: "enter" | "exit" | null; k: number } => {
  for (const [a] of PAGES.enter) if (t >= a && t < a + PAGES.enterLen) return { mode: "enter", k: (t - a) / PAGES.enterLen };
  for (const [a] of PAGES.exit) if (t >= a - PAGES.exitLen && t < a) return { mode: "exit", k: (t - (a - PAGES.exitLen)) / PAGES.exitLen };
  return { mode: null, k: 0 };
};
export const bookState = (f: number): BookState => {
  const t = f / FPS, k = shotOf(f).kind;
  const ladderHand: V3 = [LADX - 0.42, RUNG + 1.22, LIB.LADDER.z + 0.05];
  if (t < 6.1) {                                                       // book 1: off the high shelf, opened toward us, flips to the comforts
    const pull = smooth((t - 1.0) / 0.5), shelf: V3 = LIB.BOOK, back = t > 5.85;
    return { visible: !back && (k === "slamAisle" || k === "ladderPull" || k === "lettersPour" || k === "pullOut"), pos: lerp3(shelf, ladderHand, pull), normal: pull < 1 ? lerp3([-1, 0, 0], N_LADDER, pull) : N_LADDER,
      open: t > 5.5 ? 1 - smooth((t - 5.5) / 0.3) : smooth((t - EV.bookThud[0] + 0.25) / 0.3), flip: clamp01((t - 2.3) / PAGES.flipLen), drawing: "comfort" };
  }
  if (t < 11.0) {                                                      // book 2: grabbed on the ladder, flips to the storm; we come out of it on the floor
    const pull = smooth((t - 6.2) / 0.25), shelf: V3 = [LIB.BOOK[0], LIB.BOOK[1] + 0.46, LIB.BOOK[2] + 0.6], hand2: V3 = [LADX - 0.42, RUNG + 0.32 + 1.22, LIB.LADDER.z + 0.05];
    const floor: V3 = [-1.2, 1.2, -6.4];
    return { visible: k === "grabBook2" || (k === "libWalk" && t < 10.95), pos: t >= 10.6 ? floor : lerp3(shelf, hand2, pull), normal: t >= 10.6 ? N_FLOOR : pull < 1 ? lerp3([-1, 0, 0], N_LADDER, pull) : N_LADDER,
      open: t >= 10.6 ? 1 - smooth((t - 10.8) / 0.15) : smooth((t - 6.42) / 0.12), flip: clamp01((t - 6.5) / 0.3), drawing: "storm" };
  }
  if (t < 50.4) {                                                      // book 3: from the left shelf at eye level, flips to the desert road
    const pull = smooth((t - 11.2) / 0.35), shelf: V3 = [-LIB.SHELF_X - 0.12, 1.55, -9.6], inHand: V3 = [-1.2, 1.22, -9.45];
    return { visible: k === "libWalk" || k === "bookDive", pos: lerp3(shelf, inHand, pull), normal: pull < 1 ? lerp3([1, 0, 0], N_FLOOR, pull) : N_FLOOR,
      open: smooth((t - 11.65) / 0.2), flip: clamp01((t - 11.9) / PAGES.flipLen), drawing: "desert" };
  }
  // the last book: open on the stars as we come out of it, closed softly, laid on the table
  const close = smooth((t - EV.closeBook) / 0.45), down = smooth((t - EV.closeBook - 0.5) / 0.7), held: V3 = [-0.25, 1.15, -16.55], table: V3 = [0.15, 0.81, -17.0];
  return { visible: true, pos: lerp3(held, table, down), normal: lerp3(N_NOOK, [0, 1, 0], down), open: 1 - close, flip: 1, drawing: "stars" };
};
/** a camera looking straight at the open page from distance d (the page facing it) */
const pageCam = (f: number, d: number, fov: number): Cam => { const b = bookState(f); return cam(add(b.pos, [b.normal[0] * d, b.normal[1] * d + 0.02, b.normal[2] * d]), b.pos, fov); };

// ---------------- helpers ----------------
const camRight = (c: Cam) => { const fw = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-fw.z, 0, fw.x); };
const lightOf = (c: Cam, dir: V3, mirror = false) => q(light2D(new THREE.Vector3(...dir).normalize(), camRight(c), mirror), 30);
const mirrorFor = (c: Cam, dx: number, dz: number) => { const r = camRight(c); return dx * r.x + dz * r.z < 0; };
const put = (c: Card, p: V3, o: { mirror?: boolean; scale?: number; yaw?: number; roll?: number; blob?: string | null } = {}): TravellerCard =>
  ({ pos: p, key: c.key, draw: c.draw, mirror: o.mirror, scale: o.scale, yaw: o.yaw, roll: o.roll, blob: o.blob === undefined ? null : o.blob });
const T = "traveller", STRIDE = 0.36;
const walkC = (dist: number, L: number, mirror: boolean, extra: Parameters<typeof walker>[1] = {}) =>
  walker(T, { phase: q(0.25 + dist / (2 * STRIDE), 120), k: 1, stride: Math.round(STRIDE / SU), light: L, shawlNear: mirror, ...extra });
const LAMP_DIR: V3 = [0.2, 1, 0.3], DUSK_DIR: V3 = [-0.6, 0.35, -0.8];
const HEAD = (p: V3): V3 => [p[0], p[1] + 1.72, p[2]];
const mv = (a: Cam, b: Cam, u: number): Cam => ({ pos: lerp3(a.pos, b.pos, ease(u)), look: lerp3(a.look, b.look, ease(u)), fov: lerp(a.fov, b.fov, ease(u)), roll: lerp(a.roll, b.roll, ease(u)) });
const rollC = (c: Cam, r: number): Cam => ({ ...c, roll: r });

type Shot = { set: SetId; state: string; cam: Cam; focus: V3; cInf: number; trav: TravellerCard | null; head: V3; shake?: number };
const NOHEAD: V3 = [0, -500, 0];
export const shotAt0 = (f: number): Shot => {
  const sh = shotOf(f), t = f / FPS, u = clamp01((f - sh.from) / Math.max(1, sh.to - sh.from)), tl = (f - sh.from) / FPS;
  const lib = (c: Cam, focus: V3, trav: TravellerCard | null, head: V3, cInf = 4, state = "lib:1:1", shake = 0): Shot => ({ set: "library", state, cam: { ...c, pos: Wl(c.pos), look: Wl(c.look) }, focus: Wl(focus), cInf, trav: trav ? { ...trav, pos: Wl(trav.pos) } : null, head: Wl(head), shake });
  const wld = (area: V3, state: string, c: Cam, focus: V3, trav: TravellerCard | null, head: V3, cInf = 3, shake = 0): Shot => ({ set: "bookworlds", state, cam: { ...c, pos: Ww(area, c.pos), look: Ww(area, c.look) }, focus: Ww(area, focus), cInf, trav: trav ? { ...trav, pos: Ww(area, trav.pos) } : null, head: Ww(area, head), shake });
  const onLadder = (c: Cam, y: number, up: number, climb = 0): TravellerCard => { const mir = mirrorFor(c, 1, 0), L = lightOf(c, LAMP_DIR, mir);
    return put(walker(T, { light: L, shawlNear: mir, armN: reachArm(0, up), armF: climb ? reachArm(0, 0.5 + 0.5 * Math.sin(climb)) : undefined, headRot: -0.15 }), [LADX, y, LIB.LADDER.z], { mirror: mir }); };
  switch (sh.kind) {
    // ======================= the library =======================
    case "slamAisle": { const c = mv(cam([0, 1.7, 11], [0, 2.4, -6], 62), cam([0.1, 2.2, -1.2], [1.2, 3.0, -6], 44), Math.pow(u, 0.7));
      return lib(c, [LADX, 3, LIB.LADDER.z], onLadder(c, RUNG, 0.9), HEAD([LADX, RUNG, LIB.LADDER.z]), 3, "lib:1:1", 0.4); }
    case "ladderPull": { const c = mv(cam([-0.6, 1.5, -3.6], [1.6, 3.4, -6.1], 48), cam([-0.4, 1.7, -4.1], [1.6, 3.45, -6.1], 44), u);
      return lib(c, LIB.BOOK, onLadder(c, RUNG, t < 1.5 ? 1 : 0.4), HEAD([LADX, RUNG, LIB.LADDER.z]), 5, "lib:1:1", t > 1.0 && t < 1.25 ? 1 : 0.2); }
    case "lettersPour": { // he opens the book toward us; the pages flip and land on the ink drawing; the camera pushes into it
      const b = bookState(f), c0 = cam([LADX - 1.9, RUNG + 1.55, LIB.LADDER.z + 0.9], [LADX - 0.2, RUNG + 1.3, LIB.LADDER.z], 46), c1 = pageCam(f, 0.95, 40), c2 = pageCam(f, 0.3, 36);
      const c = t < 2.75 ? mv(c0, c1, smooth((t - 2.2) / 0.55)) : mv(c1, c2, (t - 2.75) / 0.45);
      return lib(c, b.pos, onLadder(c, RUNG, 0.35), HEAD([LADX, RUNG, LIB.LADDER.z]), 6); }
    case "pullOut": { // out of the page: the camera pulls back from the drawing to him on the ladder; he climbs on
      const y = RUNG + 0.32 * smooth((t - 5.9) / 0.6), cFar = mv(cam([0.6, 3.6, -6.0], [LADX, 3.4, -6.0], 30), cam([-0.8, 2.6, -3.8], [LADX, 3.1, -6.0], 50), u);
      const c = t < 5.9 ? mv(pageCam(f, 0.3, 36), cam([LADX - 1.9, RUNG + 1.55, LIB.LADDER.z + 0.9], [LADX - 0.2, RUNG + 1.3, LIB.LADDER.z], 46), (t - 5.2) / 0.7) : cFar;
      return lib(c, [LADX, 3, LIB.LADDER.z], onLadder(c, y, 0.8, t > 5.9 ? tl * 9 : 0), HEAD([LADX, y, LIB.LADDER.z]), 4); }
    case "grabBook2": { const c0 = mv(cam([0.2, 2.6, -4.6], [1.9, 4.0, -5.6], 46), cam([0.3, 2.9, -4.9], [1.4, 3.6, -5.8], 42), smooth(tl / 0.3));
      const c = t < 6.5 ? c0 : t < 6.8 ? mv(c0, pageCam(f, 0.9, 40), (t - 6.5) / 0.3) : mv(pageCam(f, 0.9, 40), pageCam(f, 0.3, 36), (t - 6.8) / 0.2);
      return lib(c, bookState(f).pos, onLadder(c, RUNG + 0.32, t < 6.4 ? 1 : 0.35), HEAD([LADX, RUNG + 0.32, LIB.LADDER.z]), 5); }
    case "libWalk": { // out of the storm page (book 2 in his hands), he snaps it shut and strides on, pulls a third book
      const z = lerp(-6.4, -9.5, smooth((t - 10.95) / 0.5)), p: V3 = [-1.55, 0, z], cFar = mv(cam([0.6, 1.4, -4.2], [-1.6, 1.4, -9.5], 46), cam([0.5, 1.45, -6.6], [-1.7, 1.45, -9.6], 42), u), mir = mirrorFor(cFar, 0, -1), L = lightOf(cFar, LAMP_DIR, mir);
      const c = t < 10.95 ? mv(pageCam(f, 0.3, 36), cam([0.4, 1.5, -4.6], [-1.4, 1.3, -6.6], 46), (t - 10.6) / 0.35) : cFar;
      const reaching = t > 11.0, card = t < 10.95 ? walker(T, { light: L, shawlNear: mir, armN: reachArm(0, 0.3), headRot: 0.3 }) : reaching ? walker(T, { light: L, shawlNear: mir, armN: reachArm(0, t < 11.4 ? 0.6 : 0.3), headRot: 0.1 }) : walkC(3.1 * smooth(tl / 0.7), L, mir, { swing: 1.0 });
      return lib(c, HEAD(p), put(card, p, { mirror: mir }), HEAD(p), 5); }
    case "bookDive": { const b = bookState(f), p: V3 = [-1.55, 0, -9.5], c0 = mv(cam([0.4, 1.6, -8.4], [-1.25, 1.25, -9.45], 46), pageCam(f, 0.95, 40), smooth((t - 11.9) / 0.55)), mir = mirrorFor(c0, 0, -1);
      const c = t < 12.6 ? c0 : mv(pageCam(f, 0.95, 40), pageCam(f, 0.3, 36), (t - 12.6) / 0.7);
      return lib(c, b.pos, put(walker(T, { light: lightOf(c, LAMP_DIR, mir), shawlNear: mir, armN: reachArm(0, 0.3), headRot: 0.3 }), p, { mirror: mir }), HEAD(p), 6); }
    case "pullOutFinal": { const p: V3 = [-0.55, 0, -16.45], cFar = mv(cam([0.4, 1.5, -14.4], [-0.3, 1.1, -16.8], 34), cam([1.0, 1.55, -14.0], [-0.3, 1.0, -16.8], 46), u), mir = mirrorFor(cFar, 1, -0.4), L = lightOf(cFar, LAMP_DIR, mir);
      const c = t < 51.1 ? mv(pageCam(f, 0.3, 36), cam([0.4, 1.5, -14.4], [-0.3, 1.1, -16.8], 34), (t - 50.4) / 0.7) : cFar, down = smooth((t - EV.closeBook - 0.5) / 0.7);
      return lib(c, [-0.3, 1.1, -16.7], put(down > 0.05 ? stoop(T, 0.35 * Math.sin(Math.PI * down), L) : walker(T, { light: L, shawlNear: mir, armN: reachArm(0, 0.3), headRot: 0.35 }), p, { mirror: mir }), HEAD(p), 5); }
    case "sitDown": case "craneUp": case "endCard": { const C = LIB.CHAIR, crane = sh.kind !== "sitDown";
      const c = crane ? mv(cam([1.2, 1.4, -14.6], [-0.6, 0.9, -16.6], 40), cam([1.7, 5.4, -10.6], [-0.5, 0.6, -16.6], 46), ease(u)) : mv(cam([1.3, 1.15, -15.1], [-0.6, 0.95, -16.6], 42), cam([1.0, 1.1, -15.4], [-0.65, 0.95, -16.6], 38), u);
      const mir = mirrorFor(c, 1, -0.5), L = lightOf(c, LAMP_DIR, mir), sitK = smooth((t - EV.sit) / 0.8);
      const card = sitK < 0.5 ? put(stoop(T, 0.5 * sitK * 2, L), [C[0] + 0.15, 0, C[2] + 0.2], { mirror: mir }) : put({ key: `sit|${L}|${mir}`, draw: (p) => withLook(LOOKS[T], () => travellerChair(p, { light: L, arms: "rest", tilt: 0, chair: false })) }, [C[0] + 0.05, 0, C[2] + 0.05], { mirror: mir, yaw: Math.atan2(c.pos[0] - C[0], c.pos[2] - C[2]) });
      return lib(c, [C[0], 0.9, C[2]], card, [C[0] + 0.1, 1.25, C[2]], crane ? 3 : 5, `lib:${q(1 - 0.15 * smooth((t - 53) / 4), 20)}:${q(1 - 0.3 * smooth((t - 53) / 4), 20)}`); }
    // ======================= inside the books =======================
    case "comfortRun": case "comfortWind": { const A = WORLD.COMFORT, z = -3 - 4.2 * (t - 3.2), p: V3 = [0.2, 0, z];
      const c = sh.kind === "comfortRun" ? mv(cam([1.7, 1.2, z + 3.2], [0, 1.0, z - 3], 50), cam([1.9, 1.1, z + 2.8], [0, 1.0, z - 3], 46), u) : mv(cam([-6.5, 3.2, -3.5], [1.2, 0.8, -10.5], 50), cam([-7.0, 3.8, -2.8], [1.6, 1.2, -11], 46), u);
      const mir = mirrorFor(c, 0, -1), L = lightOf(c, DUSK_DIR, mir), cr = EV.crumble.map((e) => q(clamp01((t - e) / 1.4), 60));
      return wld(A, `comfort:${cr[0]}:${cr[1]}:${cr[2]}:${cr[3]}`, c, HEAD(p), put(walkC(4.2 * (t - 3.2) * 0.6, L, mir, { swing: 1.9 }), p, { mirror: mir }), HEAD(p), 3); }
    case "stormWide": case "stormOrbit": case "dawnBreak": case "dawnRain": {
      const B = WORLD.SEA, dawn = sh.kind === "dawnBreak" ? smooth(u * 1.1) * 0.6 : sh.kind === "dawnRain" ? 0.6 + 0.4 * smooth(u * 2) : 0, storm = 1 - 0.75 * dawn;
      const by = seaY(0, 0, t, storm) + 0.1, p: V3 = [0.0, by - 0.17, -0.75];   // standing on the deck, ahead of the thwart
      let c: Cam;
      if (sh.kind === "stormWide") c = mv(cam([14, 4.5, 16], [0, 1, 0], 50), cam([10, 3.2, 12], [0, 1, 0], 44), u);
      else if (sh.kind === "stormOrbit" || sh.kind === "dawnRain") { const a = (sh.kind === "stormOrbit" ? lerp(40, 150, ease(u)) : lerp(200, 280, ease(u))) * Math.PI / 180; c = cam([5.2 * Math.sin(a), by + 1.0 + 0.4 * Math.sin(t), 5.2 * Math.cos(a)], [0, by + 1.1, 0], 46); }
      else c = mv(cam([3, by + 1.4, 7], [0, by + 6, -20], 52), cam([2.4, by + 1.2, 6], [0, by + 9, -24], 50), u);
      const mir = mirrorFor(c, 0, -1), L = lightOf(c, dawn > 0.3 ? [0.1, 0.25, -1] : [0.4, 1, 0.3], mir), row = Math.sin(t * 2.6);
      const card = walker(T, { light: L, shawlNear: mir, armN: reachArm(0, 0.35 + 0.25 * row), armF: reachArm(0, 0.3 - 0.2 * row), headRot: q(0.15 * row, 20) });
      return wld(B, `sea:${q(storm, 20)}:${q(dawn, 40)}:${q(flashAt(t), 20)}`, rollC(c, 0.04 * storm * Math.sin(t * 1.3)), [0, by + 1.1, 0], put(card, p, { mirror: mir, roll: 0.08 * storm * Math.sin(1.1 * t + 1.3) }), HEAD(p), 3, 0.5 * storm); }
    case "desertTrack": case "desertDrone": case "rainWalk": case "starsLook": {
      const Cc = WORLD.DESERT, night = sh.kind === "desertTrack" || sh.kind === "desertDrone" ? 0 : 1, rain = sh.kind === "rainWalk" ? 1 : 0;
      const z = sh.kind === "starsLook" ? -30 : -2 - 0.9 * (t - 13.3), p: V3 = [0.35, 0, z];
      let c: Cam;
      if (sh.kind === "desertTrack" || sh.kind === "rainWalk") c = cam([2.5, 1.35, z + 0.5 - 0.3 * u], [0.3, 1.15, z - 0.25], 44);
      else if (sh.kind === "desertDrone") c = mv(cam([4, 6, z + 6], [0, 0.5, z - 20], 46), cam([18, 34, z + 34], [0, 0, z - 40], 50), ease(u));
      else c = mv(cam([1.5, 0.65, z + 1.5], [0.35, 2.1, z - 0.5], 46), cam([1.2, 0.6, z + 1.2], [0.35, 2.4, z - 0.7], 42), u);
      const mir = mirrorFor(c, 0, -1), L = lightOf(c, night ? [0.6, 0.8, 0.8] : [0.1, 0.25, -1], mir);
      const card = sh.kind === "starsLook" ? walker(T, { light: L, shawlNear: mir, headRot: -0.35, armN: reachArm(0, 0.15) }) : walkC(0.9 * (t - 13.3), L, mir, { headRot: 0.25, swing: 0.5 });
      return wld(Cc, `desert:${night}:${night ? 0.15 : 1}:${rain}`, c, HEAD(p), put(card, p, { mirror: mir }), HEAD(p), 3); }
    case "handRain": case "handLight": { const Cc = WORLD.DESERT, H: V3 = [0.1, 1.02, 0.65], c = mv(cam([0.55, 1.45, 1.55], [0.1, 1.05, 0.6], 40), cam([0.5, 1.4, 1.4], [0.1, 1.05, 0.6], 36), u);
      return wld(Cc, `desert:1:0:${sh.kind === "handRain" ? 1 : 0.7}`, c, H, put(openHand(t), [H[0], H[1] - (975 - 380) * SU * 0.3, H[2]], { scale: 0.3 }), NOHEAD, 7); }
    case "forge": case "forgeWater": { const D = WORLD.FORGE, p = sh.kind === "forge" ? 0.58 * u : 0.6 + 0.4 * u;
      const c = sh.kind === "forge" ? mv(cam([0.9, 1.25, 1.4], [-0.05, 0.75, 0], 40), cam([0.7, 1.15, 1.1], [-0.05, 0.75, 0], 36), u) : mv(cam([2.3, 1.3, 1.6], [1.4, 0.8, 0.2], 42), cam([2.1, 1.2, 1.4], [1.4, 0.85, 0.2], 38), u);
      return wld(D, `forge:${q(p, 60)}`, c, sh.kind === "forge" ? [-0.05, 0.75, 0] : [1.4, 0.8, 0.2], null, NOHEAD, 6); }
    case "oyster": { const c = mv(cam([1.35, 0.85, 1.5], [0, 0.12, -0.05], 40), cam([1.05, 0.7, 1.15], [0, 0.12, -0.05], 36), u); return wld(WORLD.OYSTER, `oyster:${q(u, 60)}`, c, [0, 0.12, 0], null, NOHEAD, 7); }
    case "seed": case "treeJoy": { const g = sh.kind === "seed" ? 0.55 * u : 0.55 + 0.45 * u;
      const c = sh.kind === "seed" ? mv(cam([1.2, 0.6, 1.6], [0, 0.4, 0], 42), cam([1.6, 1.2, 2.4], [0, 1.0, 0], 46), u) : mv(cam([3.2, 1.0, 4.4], [0, 2.2, 0], 48), cam([2.6, 0.8, 3.8], [0, 2.6, 0], 50), u);
      return wld(WORLD.SEED, `seed:${q(g, 60)}`, c, [0, 1, 0], null, NOHEAD, 4); }
    case "coal": { const c = mv(cam([1.1, 0.8, 1.4], [0, 0.35, 0], 40), cam([0.8, 0.6, 1.0], [0, 0.32, 0], 34), u); return wld(WORLD.COAL, `coal:${q(u, 60)}`, c, [0, 0.3, 0], null, NOHEAD, 7, u > 0.35 && u < 0.5 ? 1.2 : 0); }
    case "hourglass": case "hourStop": case "starBurst": { const p = sh.kind === "hourglass" ? 0.25 * u : sh.kind === "hourStop" ? 0.25 + 0.45 * u : 0.7 + 0.3 * u;
      const c = sh.kind === "starBurst" ? mv(cam([1.2, 1.2, 2.2], [0, 1.4, 0], 46), cam([3, 0.8, 7], [0, 6, -8], 60), u) : mv(cam([0.9, 1.0, 1.0], [0, 0.95, 0], 38), cam([0.7, 0.95, 0.8], [0, 0.95, 0], 32), u);
      return wld(WORLD.HOUR, `hour:${q(p, 60)}`, c, [0, 0.95, 0], null, NOHEAD, 6); }
    default: { const c = cam([0, 1.7, 0], [0, 1.7, -10], 50); return lib(c, [0, 1, -10], null, NOHEAD); }
  }
};

const shakeAt = (f: number, k: number) => { const t = f / FPS; return [k * 0.012 * noise1(t * 13, 1), k * 0.012 * noise1(t * 14, 2), k * 0.008 * noise1(t * 12, 3)] as V3; };
export type FrameInfo = { frame: Frame; head: V3; shot: PShot };
export const shotAt = (f: number): FrameInfo => {
  const s = shotAt0(f), sh = shotOf(f), hh = handheld(f, 0.8), sk = shakeAt(f, s.shake ?? 0);
  const c = { ...s.cam, pos: add(add(s.cam.pos, hh.pos), sk), look: add(add(s.cam.look, hh.look), [sk[0] * 2, sk[1] * 2, sk[2] * 2] as V3) };
  return { frame: { set: s.set, state: s.state, t: f / FPS, plan: { cam: c, focus: s.focus, cInf: s.cInf, nearScale: 1.6 }, traveller: s.trav, others: [], hooks: {} }, head: s.head, shot: sh };
};
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
/** how much the world still looks like an ink drawing (1 = ink on paper, 0 = full colour) */
export const inkAt = (t: number) => { const pg = pageAt(t); return pg.mode === "enter" ? 1 - smooth((pg.k - 0.3) / 0.55) : pg.mode === "exit" ? smooth(pg.k / 0.55) : 0; };
/** the page window: 1 = the world is seen only inside the page (paper margins and spine around it), 0 = full frame */
export const pageWindow = (t: number) => { const pg = pageAt(t); return pg.mode === "enter" ? 1 - smooth(pg.k / 0.75) : pg.mode === "exit" ? smooth((pg.k - 0.35) / 0.65) : 0; };
/** the page rectangle in screen fractions at window w (w = 1: the page as seen in the book; 0: the whole frame) */
export const pageRect = (w: number) => ({ l: 0.13 * w, r: 0.1 * w, t: 0.16 * w, b: 0.19 * w });
const clipOf = (w: number) => { const p = pageRect(w); return `inset(${(p.t * 100).toFixed(2)}% ${(p.r * 100).toFixed(2)}% ${(p.b * 100).toFixed(2)}% ${(p.l * 100).toFixed(2)}%)`; };
export const fxAt = (f: number): FrameFx => {
  const s = shotOf(f), first = f - s.from;
  let bx = first < 5 ? 2.2 * (1 - first / 5) : 0, by = bx, zoom: FrameFx["zoom"], ca = 0.4;
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "whip" && d > -6 && d < 5) { const k = 1 - Math.abs(d + 0.5) / 6; bx = Math.max(bx, 60 * k); ca = Math.max(ca, 6 * k); }
    if (tr.kind === "heart" && Math.abs(d) < 6) { const k = 1 - Math.abs(d) / 6; zoom = { scale: 1 + 0.04 * k, x: 540, y: 900, blur: 1.5 * k }; }
    if ((tr.kind === "lettersDive" || tr.kind === "pullOut") && Math.abs(d) < 8) { const k = 1 - Math.abs(d) / 8; zoom = { scale: tr.kind === "lettersDive" ? 1 + 0.25 * k : 1 + 0.18 * k, x: 540, y: 1000, blur: 6 * k }; }
  }
  if (s.kind === "slamAisle") bx = Math.max(bx, 8 * (1 - (f - s.from) / (s.to - s.from)));
  const pg = pageAt(f / FPS), ink = inkAt(f / FPS), win = pageWindow(f / FPS);
  const css = ink > 0.001 ? `grayscale(${ink.toFixed(3)}) sepia(${(0.55 * ink).toFixed(3)}) contrast(${(1.06 + 1.1 * ink).toFixed(3)}) brightness(${(1 + 0.45 * ink).toFixed(3)}) saturate(1.06)` : "contrast(1.06) saturate(1.06)";
  void pg;
  return { blurX: bx, blurY: by, ca, glitch: 0, flash: 0, vignette: 0, grain: true, zoom, haze: 0, css, clip: win > 0.001 ? clipOf(win) : undefined };
};
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
/** shots framing him (the 45-degree rule); the two dives end inside the page (only the page in frame) and are checked by hand */
export const CHARACTER_SHOTS = new Set(["slamAisle", "ladderPull", "pullOut", "grabBook2", "libWalk", "pullOutFinal", "sitDown", "craneUp", "comfortRun", "comfortWind", "stormWide", "stormOrbit", "dawnBreak", "dawnRain", "desertTrack", "rainWalk", "starsLook", "handRain", "handLight"]);
