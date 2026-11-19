// Star-wipe transition (12 frames): a grid of 8-point stars grows across the frame in a diagonal wave, each star
// holds while the frame is fully covered (the cut), then flips over (lapis front, indigo back with a gold rim) as it
// shrinks away to reveal the next scene. Cut to the next shot at `from + duration / 2` (the frame is fully covered then).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { KEY_COLOR } from "../text/Captions";

const STAR = (() => {
  const pts: string[] = [], R = 50, ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8 - Math.PI / 2, r = k % 2 ? ri : R; pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`); }
  return pts.join(" ");
})();
const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export const STAR_WIPE_FRAMES = 12;

export const StarWipe: React.FC<{ from: number; duration?: number; cols?: number }> = ({ from, duration = STAR_WIPE_FRAMES, cols = 6 }) => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig();
  const t = f - from;
  if (t < 0 || t >= duration) return null;
  const cell = width / cols, rows = Math.ceil(height / cell) + 1;
  const wave = 2; // frames between the first and the last star (small, so all stars are full together mid-wipe)
  const stars: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const delay = ((i + j) / (cols + rows - 2)) * wave;
    const p = (t + 0.5 - delay) / (duration - wave); // 0..1 for this star
    // grow face-on, hold full size through the middle frame (the cut), then flip over while shrinking away. (Flipping
    // at the cut would turn the stars edge-on and show the scene behind them.)
    const s = p < 0.3 ? ease(p / 0.3) : p > 0.65 ? 1 - ease((p - 0.65) / 0.35) : 1;
    const flip = 180 * ease((p - 0.6) / 0.4);
    const size = cell * 2.05 * s;                    // 2.05 cells: the stars overlap enough to cover every gap
    if (size <= 0.5) continue;
    const face = (back: boolean): React.CSSProperties => ({
      position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined,
    });
    stars.push(
      <div key={`${i}-${j}`} style={{
        position: "absolute", left: (i + 0.5) * cell - size / 2, top: (j + 0.5) * cell - size / 2, width: size, height: size,
        transformStyle: "preserve-3d", transform: `perspective(${cell * 6}px) rotateY(${flip}deg)`,
      }}>
        <svg style={face(false)} viewBox="0 0 100 100"><polygon points={STAR} fill="#1F3B73" /></svg>
        <svg style={face(true)} viewBox="0 0 100 100"><polygon points={STAR} fill="#0E1430" stroke={KEY_COLOR.gold} strokeWidth={2.2} /></svg>
      </div>,
    );
  }
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>{stars}</AbsoluteFill>;
};
