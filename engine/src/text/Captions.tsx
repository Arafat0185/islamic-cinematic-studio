// Phrase-by-phrase English subtitles.
//  - One phrase at a time (never word by word), at most 2 lines: the phrase is split into two balanced lines when it
//    does not fit on one; if it still does not fit, the font size steps down (to a floor).
//  - Centred around 66 % of the frame height (inside the 62-70 % band), clear of TikTok / Reels / Shorts buttons.
//  - 6-frame fade in and out, with a tiny rise.
//  - Keywords are coloured by meaning: gold = Allah / reward / key term, red = warning, green = right action.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, measure, useFonts } from "./fonts";

export type KeyKind = "gold" | "red" | "green";
export const KEY_COLOR: Record<KeyKind, string> = { gold: "#E8B04B", red: "#E0605A", green: "#6CC08A" };
/** one subtitle: text, the frames it is on screen [from, to), and keywords (a word or a few words) -> meaning */
export type Phrase = { text: string; from: number; to: number; keys?: Record<string, KeyKind> };

export const CAPTION = { centreY: 0.66, maxWidth: 900, size: 58, minSize: 42, lineHeight: 1.22, fade: 6 };

type Tok = { word: string; kind?: KeyKind };
const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
/** split into words and mark the ones covered by a keyword phrase */
export const tokenize = (text: string, keys: Record<string, KeyKind> = {}): Tok[] => {
  const words = text.split(/\s+/).filter(Boolean), toks: Tok[] = words.map((w) => ({ word: w }));
  const nw = words.map(norm);
  for (const [k, kind] of Object.entries(keys)) {
    const kw = k.split(/\s+/).map(norm);
    for (let i = 0; i + kw.length <= nw.length; i++) if (kw.every((w, j) => nw[i + j] === w)) for (let j = 0; j < kw.length; j++) toks[i + j].kind = kind;
  }
  return toks;
};

/** the best way to show the phrase in <= 2 lines: font size and the line split (balanced, shortest longest line) */
const layout = (toks: Tok[], weight: number) => {
  for (let size = CAPTION.size; size >= CAPTION.minSize; size -= 2) {
    const font = `${weight} ${size}px ${FONT.caption}`, wd = (a: number, b: number) => measure(toks.slice(a, b).map((t) => t.word).join(" "), font);
    if (wd(0, toks.length) <= CAPTION.maxWidth) return { size, lines: [toks] };
    let best = -1, bestW = Infinity;
    for (let i = 1; i < toks.length; i++) { const w = Math.max(wd(0, i), wd(i, toks.length)); if (w < bestW) { bestW = w; best = i; } }
    if (bestW <= CAPTION.maxWidth) return { size, lines: [toks.slice(0, best), toks.slice(best)] };
  }
  // still too long at the smallest size: the phrase should be split into two phrases in the script
  const mid = Math.ceil(toks.length / 2);
  return { size: CAPTION.minSize, lines: [toks.slice(0, mid), toks.slice(mid)] };
};

const Line: React.FC<{ toks: Tok[] }> = ({ toks }) => (
  <div>
    {toks.map((t, i) => (
      <React.Fragment key={i}>
        <span style={{ color: t.kind ? KEY_COLOR[t.kind] : "#FBF6EC" }}>{t.word}</span>{i < toks.length - 1 ? " " : ""}
      </React.Fragment>
    ))}
  </div>
);

/** shows whichever phrase is on screen at the current frame */
export const Captions: React.FC<{ phrases: Phrase[] }> = ({ phrases }) => {
  const ready = useFonts();
  const f = useCurrentFrame(), { height } = useVideoConfig();
  const ph = phrases.find((p) => f >= p.from && f < p.to);
  if (!ready || !ph) return null;
  const F = CAPTION.fade;
  const a = Math.min(interpolate(f, [ph.from, ph.from + F], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(f, [ph.to - F, ph.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const rise = (1 - Math.min(1, (f - ph.from) / F)) * 10;
  const { size, lines } = layout(tokenize(ph.text, ph.keys), 600);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, top: height * CAPTION.centreY, transform: `translateY(calc(-50% + ${rise}px))`,
        textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: size, lineHeight: CAPTION.lineHeight,
        opacity: a, textShadow: "0 2px 10px rgba(5,8,22,0.85), 0 0 3px rgba(5,8,22,0.9)", letterSpacing: "0.005em",
      }}>
        {lines.map((l, i) => <Line key={i} toks={l} />)}
      </div>
    </AbsoluteFill>
  );
};
