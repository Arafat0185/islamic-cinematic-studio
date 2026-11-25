// Video 005 "The Dunya": sad, rainy, calm. Nothing new is built: every shot is a shot of video 002 "The Last Request"
// (scenes/lastrequest/timeline.ts), played SLOWER - a 002 time window (its "source" frames) is stretched over this film's
// shot, so the camera moves and the people slow down, while the rain and the room keep their real speed (the frame's
// time t is this film's time). One new camera: "craneUp" rises from the masjid door into the rainy sky.
// Timing: videos/005-the-dunya/timing.json (tools/build_dunya_timing.py); shots: videos/005-the-dunya/shots.json.
import * as THREE from "three";
import { Cam, V3, smooth, applyCam } from "../../camera/ease";
import { SET_OFFSET, SetId, FrameFx } from "../../story/story";
import type { Accent } from "../../film/film";
import * as LR from "../lastrequest/timeline";
import TIMING from "../../../../videos/005-the-dunya/timing.json";
import STORY from "../../../../videos/005-the-dunya/shots.json";

export const FPS = TIMING.fps;
export const F = (s: number) => Math.round(s * FPS);
export const FRAMES = Math.round(TIMING.length * FPS);
export const CARD_FROM = F(TIMING.cardFrom);
export const SETS: SetId[] = LR.SETS;

type Raw = { at: number; kind: string; src?: number[] };
export type DShot = { kind: string; from: number; to: number; base: LR.PShot; sa: number; sb: number };
/** the 002 shot a kind comes from (craneUp: pastMasjid; windowRain is in 002's code but not in its cut: a synthetic one) */
const baseOf = (kind: string, src?: number[]): LR.PShot => {
  const k = kind === "craneUp" ? "pastMasjid" : kind, s = LR.SHOTS.find((x) => x.kind === k);
  return s ?? { kind: k, set: "bedroom", from: LR.F(src![0]), to: LR.F(src![1]) };
};
export const SHOTS: DShot[] = (STORY.shots as Raw[]).map((s, i, a) => {
  const base = baseOf(s.kind, s.src);
  return { kind: s.kind, from: F(s.at), to: i + 1 < a.length ? F(a[i + 1].at) : FRAMES, base, sa: s.src ? LR.F(s.src[0]) : base.from, sb: s.src ? LR.F(s.src[1]) : base.to };
});
export const CUTS = SHOTS.slice(1).map((s) => s.from);
export const shotOf = (f: number): DShot => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.from) s = x; return s; };
/** the 002 frame shown at frame f (fractional: the slowed camera stays smooth) */
export const srcFrame = (f: number) => { const s = shotOf(f), u = Math.min(1, Math.max(0, (f - s.from) / Math.max(1, s.to - s.from))); return s.sa + (s.sb - s.sa) * u; };

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const shotAt = (f: number): LR.FrameInfo & { src: number } => {
  const s = shotOf(f), sf = srcFrame(f), info = LR.withShot(s.base, () => LR.shotAt(sf));
  const frame = { ...info.frame, t: f / FPS };                           // the rain keeps its real speed
  if (s.kind === "craneUp") {                                         // rise from the street into the rain and the sky
    const k = smooth((f - s.from) / (s.to - s.from)), o = SET_OFFSET.street, c0 = info.frame.plan.cam;
    const pos = lerp3(c0.pos, add(o, [28.0, 9.0, 8.4]), k), look = lerp3(c0.look, add(o, [29.4, 30, -1.0]), k);
    frame.plan = { ...frame.plan, cam: { ...c0, pos, look, fov: c0.fov + 6 * k } as Cam };
  }
  return { ...info, frame, src: sf };
};
export const accentAt = (_f: number): Accent => ({ punch: 0, shake: 0, flash: 0, warm: false });
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600), v = new THREE.Vector3();
export const project = (f: number, p: V3) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v.set(...p).project(pcam); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, behind: v.z > 1 }; };
/** cold, desaturated, a soft blur into every cut (the rain-on-glass dissolve, Overlay.tsx) */
export const fxAt = (f: number): FrameFx => {
  let b = 0; for (const c of CUTS) { const d = Math.abs(f - c); if (d < 12) b = Math.max(b, 7 * (1 - d / 12)); }
  return { blurX: b, blurY: b, ca: 0, glitch: 0, flash: 0, vignette: 1.05, grain: true, css: "saturate(0.42) contrast(1.05) brightness(1.1)" };
};
/** the camera's downward look in degrees (the 45-degree rule) */
export const pitchAt = (f: number) => { const c = shotAt(f).frame.plan.cam, dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2]; return (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI; };
