// An Arabic line shown above the English caption: right-to-left, Amiri, the word being recited highlighted in gold.
// The text must always come verbatim from a trusted source (Quran.com / Tanzil for Quran, sunnah.com for hadith);
// never type it from memory. `wordAt` gives the frame (relative to `from`) at which each word starts, so the gold
// highlight follows the recitation; omit it to spread the words evenly over the line's time.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, useFonts } from "./fonts";
import { CAPTION, KEY_COLOR } from "./Captions";

export type ArabicLineProps = { words: string[]; from: number; to: number; wordAt?: number[]; centreY?: number; size?: number };

export const ArabicLine: React.FC<ArabicLineProps> = ({ words, from, to, wordAt, centreY = 0.575, size = 76 }) => {
  const ready = useFonts();
  const f = useCurrentFrame(), { height } = useVideoConfig();
  if (!ready || f < from || f >= to) return null;
  const F = CAPTION.fade, rel = f - from;
  const a = Math.min(interpolate(f, [from, from + F], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(f, [to - F, to], [1, 0], { extrapolateLeft: "clamp" }));
  const starts = wordAt ?? words.map((_, i) => Math.round(((to - from - 2 * F) * i) / words.length) + F);
  let active = -1;
  for (let i = 0; i < words.length; i++) if (rel >= starts[i]) active = i;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div dir="rtl" lang="ar" style={{
        position: "absolute", left: 60, right: 60, top: height * centreY, transform: "translateY(-50%)",
        textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: size, lineHeight: 1.5, opacity: a,
        textShadow: "0 2px 12px rgba(5,8,22,0.85)",
      }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{
              color: i === active ? KEY_COLOR.gold : "rgba(251,246,236,0.9)",
              textShadow: i === active ? "0 0 18px rgba(232,176,75,0.55), 0 2px 12px rgba(5,8,22,0.85)" : undefined,
            }}>{w}</span>{i < words.length - 1 ? " " : ""}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};
