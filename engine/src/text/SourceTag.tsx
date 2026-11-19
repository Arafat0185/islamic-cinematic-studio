// A small source tag under the caption while a source is quoted, e.g. "JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)".
// Small capitals, letter-spaced, between two thin gold rules. The text comes from the video's references.yaml.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, useFonts } from "./fonts";
import { CAPTION, KEY_COLOR } from "./Captions";

export const SourceTag: React.FC<{ text: string; from: number; to: number; centreY?: number }> = ({ text, from, to, centreY = 0.775 }) => {
  const ready = useFonts();
  const f = useCurrentFrame(), { height } = useVideoConfig();
  if (!ready || f < from || f >= to) return null;
  const F = CAPTION.fade;
  const a = Math.min(interpolate(f, [from, from + F], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(f, [to - F, to], [1, 0], { extrapolateLeft: "clamp" }));
  const rule = <div style={{ width: 54, height: 2, background: KEY_COLOR.gold, opacity: 0.8 }} />;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, top: height * centreY, transform: "translateY(-50%)", opacity: a,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
      }}>
        {rule}
        <div style={{
          fontFamily: FONT.caption, fontWeight: 600, fontSize: 25, letterSpacing: "0.14em", color: "#E9DFC8",
          textShadow: "0 1px 8px rgba(5,8,22,0.9)", whiteSpace: "nowrap",
        }}>{text}</div>
        {rule}
      </div>
    </AbsoluteFill>
  );
};
