// The end card listing every source used in the video (from references.yaml), plus a review line. A dark panel with a
// gold border and an 8-point star at each corner; the title in Cormorant Garamond, the list in Inter.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT, useFonts } from "./fonts";
import { KEY_COLOR } from "./Captions";

const Star: React.FC<{ size: number }> = ({ size }) => {
  const pts: string[] = [], R = size / 2, ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8 - Math.PI / 2, r = k % 2 ? ri : R; pts.push(`${R + r * Math.cos(a)},${R + r * Math.sin(a)}`); }
  return <svg width={size} height={size}><polygon points={pts.join(" ")} fill={KEY_COLOR.gold} /></svg>;
};

export type SourcesCardProps = { title?: string; sources: string[]; note?: string; from: number; to: number };

export const SourcesCard: React.FC<SourcesCardProps> = ({ title = "Sources", sources, note, from, to }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready || f < from || f >= to) return null;
  const a = Math.min(interpolate(f, [from, from + 12], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(f, [to - 10, to], [1, 0], { extrapolateLeft: "clamp" }));
  const corner = (pos: React.CSSProperties) => <div style={{ position: "absolute", ...pos }}><Star size={34} /></div>;
  return (
    <AbsoluteFill style={{ background: `rgba(8,11,28,${0.55 * a})`, alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        position: "relative", width: 860, padding: "64px 70px", opacity: a, transform: `translateY(${(1 - a) * 16}px)`,
        background: "rgba(14,20,48,0.97)", border: `2px solid ${KEY_COLOR.gold}`, outline: "1px solid rgba(232,176,75,0.35)", outlineOffset: 10,
        textAlign: "center",
      }}>
        {corner({ left: -17, top: -17 })}{corner({ right: -17, top: -17 })}{corner({ left: -17, bottom: -17 })}{corner({ right: -17, bottom: -17 })}
        <div style={{ fontFamily: FONT.title, fontWeight: 700, fontSize: 72, color: KEY_COLOR.gold, letterSpacing: "0.04em" }}>{title}</div>
        <div style={{ width: 120, height: 2, background: KEY_COLOR.gold, opacity: 0.6, margin: "18px auto 34px" }} />
        {sources.map((s, i) => (
          <div key={i} style={{ fontFamily: FONT.caption, fontWeight: 500, fontSize: 34, lineHeight: 1.45, color: "#FBF6EC", marginBottom: 14 }}>{s}</div>
        ))}
        {note ? <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 22, letterSpacing: "0.16em", color: "rgba(233,223,200,0.7)", marginTop: 34 }}>{note}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
