// Adapted from Claude Animated Shorts (templates/bridge/story.ts), https://github.com/mromidev/claude-animated-shorts
// Copyright (c) 2026 Mr omi. MIT License; full licence text in NOTICE.md at the repo root.
// Changes in this copy: kept only the easing curves and the camera grammar helpers (Cam, glide, keyed moves, push-in,
// dolly, zoom). Removed the bridge story, physics and shot list. Added pushEase() and applyCam().

// Camera grammar (measured in the original project's reference study): every move is a symmetric smootherstep glide
// of 18-40 frames; a reframe bigger than about half a frame width is a hard cut instead. Holds never freeze: the
// camera keeps creeping in (0.15-0.35 % per frame).
import * as THREE from "three";

export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** symmetric smootherstep: slow start, slow stop (the camera ease for glides) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

/** where the camera is, what it looks at, its vertical field of view (degrees) and roll (radians) */
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** a camera key: from frame f, glide over `dur` frames (default 24) to s(f), or cut to it */
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

export const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
/** the camera at frame f from a list of keys (first key = starting framing) */
export const runKeys = (keys: Key[], f: number): Cam => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};

/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (with 8 f soft edges) for the first n frames */
export const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** like pushK, but the speed eases up from 0 over the first `ramp` frames (no jolt on the first frame) */
export const pushEase = (f: number, f0: number, rate: number, ramp = 30) => {
  const x = Math.max(0, f - f0);
  const s = x < ramp ? (rate * x * x) / (2 * ramp) : rate * (x - ramp / 2);
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put): tan(fov/2) shrinks by k */
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

/** put a three.js camera where a Cam says */
export const applyCam = (cam: THREE.PerspectiveCamera, c: Cam) => {
  cam.position.set(...c.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...c.look);
  if (c.roll) cam.rotateZ(c.roll);
  if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
};
