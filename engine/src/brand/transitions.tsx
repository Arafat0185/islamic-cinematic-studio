// Transitions between shots. Neither ever shows a solid colour frame.
//   Star iris (12-14 frames): the NEXT shot is revealed through a single 8-point star that opens from the centre
//     (smooth ease, turning a little as it grows), edged with a thin glowing gold rim. The scene draws the outgoing
//     shot on top, clipped to "everything outside the star" (irisClip), and the incoming shot underneath.
//   Whip pan (8-10 frames): the camera swings fast sideways with horizontal motion blur and lands on the next shot:
//     the outgoing camera turns away (ease-in), the incoming one arrives from the other side (ease-out).
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { KEY_COLOR } from "../text/Captions";

const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * t * (t * (6 * t - 15) + 10); }; // smootherstep

/** points of an 8-point star {8/2} of outer radius R around (cx, cy), turned by `rot` radians */
const starPts = (cx: number, cy: number, R: number, rot: number) => {
  const ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8), pts: [number, number][] = [];
  for (let k = 0; k < 16; k++) { const a = rot + (k * Math.PI) / 8 - Math.PI / 2, r = k % 2 ? ri : R; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
};

/** iris state at frame f for an iris starting at `from` lasting `len` frames: star radius (px) and turn */
export const irisAt = (f: number, from: number, len: number, w: number, h: number) => {
  const u = ease((f - from) / len);
  const cover = Math.hypot(w, h) / 2 / 0.7654 + 8; // the star's INNER radius must pass the frame corners
  return { u, R: cover * u, rot: 0.35 * u };
};

/** CSS clip-path for the OUTGOING shot during an iris: the whole frame minus the star (even-odd rule) */
export const irisClip = (R: number, rot: number, w: number, h: number) => {
  const p = starPts(w / 2, h / 2, Math.max(0.01, R), rot).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return `path(evenodd, "M0 0 H${w} V${h} H0 Z ${p} Z")`;
};

/** the thin glowing gold rim along the opening star */
export const IrisRim: React.FC<{ R: number; rot: number; u: number }> = ({ R, rot, u }) => {
  const { width: w, height: h } = useVideoConfig();
  if (u <= 0 || u >= 1) return null;
  const pts = starPts(w / 2, h / 2, R, rot).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const a = Math.min(1, u / 0.15) * (1 - Math.max(0, (u - 0.75) / 0.25)); // fades in fast, out at the end
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs><filter id="irisGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter></defs>
        <polygon points={pts} fill="none" stroke={KEY_COLOR.gold} strokeWidth={10} opacity={0.55 * a} filter="url(#irisGlow)" />
        <polygon points={pts} fill="none" stroke="#FFE3A8" strokeWidth={2.5} opacity={a} />
      </svg>
    </AbsoluteFill>
  );
};

/** whip pan at frame f (starting at `from`, `len` frames): which side of the cut, the yaw offset (radians) to add to
 *  that shot's camera, and the horizontal blur (px) for the motion */
export const whipAt = (f: number, from: number, len: number, swing = 0.65) => {
  const half = len / 2, t = f - from;
  if (t < 0 || t >= len) return null;
  if (t < half) { const k = (t + 1) / half; return { side: "out" as const, yaw: swing * k * k * k, blur: 90 * k * k }; }      // accelerate away
  const k = (t + 1 - half) / half, r = 1 - k; return { side: "in" as const, yaw: -swing * r * r * r, blur: 90 * r * r };       // decelerate in
};

/** an SVG filter for horizontal-only motion blur; refer to it as filter: url(#whipBlur) */
export const WhipBlurDefs: React.FC<{ px: number }> = ({ px }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs><filter id="whipBlur" x="-5%" y="0%" width="110%" height="100%"><feGaussianBlur stdDeviation={`${px.toFixed(1)} 0`} /></filter></defs>
  </svg>
);
