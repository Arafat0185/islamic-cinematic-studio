// The 2D layer of video 006 "Hold On To This" (calm, golden):
//  - captions: Arabic (Amiri 50) over English (Inter SemiBold 26, soft shadow), centred, inside the safe zone, never
//    over a head; key words in brand orange. The talk uses the channel owner's text (timing.json "talk"); the recitation
//    uses exact slices of the quran.com text (timing.json "phrases"), tagged AR-RA'D 13:28 / 13:29
//  - every cut: a soft light leak (warm) or a dissolve through mist
//  - the warm gold end card
import React, { useMemo } from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { smooth } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, CUTS, CHARACTER_SHOTS, shotAt, shotOf, pitchAt, project as toScreen } from "./timeline";
import TIMING from "../../../../videos/006-hold-on/timing.json";

const W = 1080, H = 1920, ORANGE = "#FB5606", MAXW = 760, CX = W / 2;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const SHADOW = "0 2px 14px rgba(20,10,2,0.85), 0 0 6px rgba(20,10,2,0.6)";
const AR_SIZE = 50, AR_LH = 1.6, EN_SIZE = 26, EN_LH = 1.32, GAP = 36;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

type Cap = { ar: string; en: string; keys: string[]; arKeys: number[]; from: number; to: number; tag?: string; repeatAt?: number; fadeIn: number };
type V = { ar: string; en: string; keys: string[]; start: number; end: number; tag?: string };
type P = { ar: string; en: string; keys: string[]; arKeys: number[]; start: number; end: number; verse: string; repeatAt?: number };
const CAPS: Cap[] = [
  ...(TIMING.talk as V[]).map((v) => ({ ar: v.ar, en: v.en, keys: v.keys, arKeys: [], from: F(v.start), to: F(v.end), tag: v.tag, fadeIn: 8 })),
  ...(TIMING.phrases as P[]).map((p, i) => ({ ar: p.ar, en: p.en, keys: p.keys, arKeys: p.arKeys, from: F(p.start), to: Math.min(F(p.end), CARD_FROM), tag: `AR-RA'D ${p.verse}`, repeatAt: p.repeatAt, fadeIn: i === 0 ? 18 : 12 })),
];
const lines = (text: string, font: string) => { let n = 1, cur = ""; for (const w of text.split(" ")) { const tt = cur ? cur + " " + w : w; if (measure(tt, font) > MAXW && cur) { n++; cur = w; } else cur = tt; } return n; };
const half = (c: Cap) => (lines(c.ar, `700 ${AR_SIZE}px ${FONT.arabic}`) * AR_SIZE * AR_LH + GAP + lines(c.en, `600 ${EN_SIZE}px ${FONT.caption}`) * EN_SIZE * EN_LH) / H / 2;
/** heads on screen over [a, b) (the Traveller and everyone else), in frame fractions */
const heads = (a: number, b: number) => {
  const boxes: { y0: number; y1: number; x0: number; x1: number }[] = [];
  for (let f = a; f < b; f += 4) {
    const s = shotAt(f), pts: [number, number, number][] = [];
    if (s.frame.traveller && s.head[1] > -1) pts.push(s.head);
    for (const o of s.frame.others ?? []) if (!o.key.startsWith("cat") && !o.key.startsWith("pigeon")) pts.push([o.pos[0], o.pos[1] + (o.key.startsWith("stoop") ? 1.3 : 1.78), o.pos[2]]);
    for (const p of pts) {
      const lo = toScreen(f, [p[0], p[1] - 0.3, p[2]]), hi = toScreen(f, [p[0], p[1] + 0.2, p[2]]); if (lo.behind) continue;
      boxes.push({ y0: hi.y / H, y1: lo.y / H, x0: (lo.x - 70) / W, x1: (lo.x + 70) / W });
    }
  }
  return boxes;
};
const placeOf = (c: Cap) => {
  const h = half(c), bx = heads(c.from, c.to), X0 = (CX - MAXW / 2) / W, X1 = (CX + MAXW / 2) / W;
  const cost = (y: number) => bx.reduce((s, b) => s + Math.max(0, Math.min(y + h + 0.02, b.y1) - Math.max(y - h - 0.02, b.y0)) * Math.max(0, Math.min(X1, b.x1) - Math.max(X0, b.x0)), 0);
  const C = [0.72, 0.68, 0.76, 0.32, 0.36, 0.5].filter((y) => y - h >= 0.24 && y + h <= 0.86);
  return C.find((y) => cost(y) === 0) ?? C.sort((x, y) => cost(x) - cost(y))[0];
};
const enParts = (en: string, keys: string[]) => {
  const marks: [number, number][] = []; for (const k of keys) { const i = en.indexOf(k); if (i >= 0) marks.push([i, i + k.length]); }
  marks.sort((a, b) => a[0] - b[0]); const out: { s: string; key: boolean }[] = []; let at = 0;
  for (const [a, b] of marks) { if (a > at) out.push({ s: en.slice(at, a), key: false }); out.push({ s: en.slice(a, b), key: true }); at = b; }
  if (at < en.length) out.push({ s: en.slice(at), key: false }); return out;
};
const Caption: React.FC<{ c: Cap; f: number; y: number }> = ({ c, f, y }) => {
  const rep = c.repeatAt ? 1 - 0.5 * Math.max(0, 1 - Math.abs(f - F(c.repeatAt)) / 14) : 1;   // the Sheikh repeats the phrase: a soft breath
  const out = 1 - smooth((f - c.to + 10) / 10), k = rep * Math.min(smooth((f - c.from) / c.fadeIn), out), ke = rep * Math.min(smooth((f - c.from - 6) / (c.fadeIn + 2)), out);
  const words = c.ar.split(" "), key = { color: ORANGE, textShadow: `0 0 10px rgba(251,86,6,0.35), ${SHADOW}` };
  return (
    <div style={{ position: "absolute", left: CX - MAXW / 2, width: MAXW, top: H * y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: GAP }}>
      <div style={{ position: "absolute", left: -(CX - MAXW / 2), width: W, top: -50, bottom: -50, background: "linear-gradient(rgba(20,12,4,0), rgba(20,12,4,0.32) 30%, rgba(20,12,4,0.32) 70%, rgba(20,12,4,0))", opacity: k }} />
      <div dir="rtl" lang="ar" style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: AR_SIZE, lineHeight: AR_LH, color: "#FFF8EC", textShadow: SHADOW, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
        {words.map((w, i) => <React.Fragment key={i}>{c.arKeys.includes(i) ? <span style={key}>{w}</span> : w}{i < words.length - 1 ? " " : ""}</React.Fragment>)}
      </div>
      <div style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: EN_SIZE, lineHeight: EN_LH, color: "#FFFFFF", textShadow: SHADOW, opacity: ke }}>
        {enParts(c.en, c.keys).map((x, i) => (x.key ? <span key={i} style={key}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};
const Tag: React.FC<{ c: Cap; f: number }> = ({ c, f }) => {
  if (!c.tag) return null;
  const k = Math.min(smooth((f - c.from) / 14), 1 - smooth((f - Math.min(c.to, CARD_FROM) + 14) / 14));
  return <div style={{ position: "absolute", left: 56, top: 176, opacity: 0.85 * k, fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: "#d6d6d1", border: "1.5px solid rgba(232,176,75,0.75)", borderRadius: 999, padding: "8px 20px", background: "rgba(30,20,8,0.5)" }}>{c.tag}</div>;
};

/** at every cut: a warm light leak sweeping across, or (every other cut) a soft white mist the picture dissolves through */
const Leak: React.FC<{ f: number }> = ({ f }) => {
  let g = 0, i0 = 0; CUTS.forEach((c, i) => { const d = Math.abs(f - c); if (d < 12 && 1 - d / 12 > g) { g = 1 - d / 12; i0 = i; } });
  if (g < 0.01) return null; g = smooth(g); const c = CUTS[i0], x = 30 + 40 * ((f - c + 12) / 24);
  return i0 % 2 ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,250,240,0.85), rgba(240,232,220,0.55) 60%, rgba(230,220,205,0.35))", opacity: 0.75 * g }} />
    : <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${x}% 30%, rgba(255,196,120,0.9), rgba(255,140,60,0.45) 35%, rgba(255,120,40,0) 70%)`, mixBlendMode: "screen", opacity: 0.85 * g }} />;
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const pre = smooth((f - CARD_FROM + 24) / 24); if (pre <= 0) return null;
  const k = smooth((f - CARD_FROM) / 20), lk = smooth((f - CARD_FROM - 6) / 18), t = f / FPS;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(74,52,22,${Math.max(0.5 * pre, k)}), rgba(30,20,8,${Math.max(0.6 * pre, k)}) 75%)`, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: 40 }, (_, i) => { const y = (H + 40) - ((hash(i) * (H + 80) + (24 + 40 * hash(i + 1)) * t) % (H + 80));
        return <div key={i} style={{ position: "absolute", left: hash(i + 2) * W + 24 * Math.sin(t * 0.6 + i), top: y, width: 4 + 4 * hash(i + 3), height: 4 + 4 * hash(i + 3), borderRadius: "50%", background: "#f2c878", boxShadow: "0 0 10px 3px rgba(240,190,100,0.5)", opacity: 0.6 * k }} />; })}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <Img src={staticFile(LOGO)} style={{ width: 380, height: 380, objectFit: "contain", opacity: lk }} />
        <div style={{ width: 120, height: 3, background: "#E8B04B", margin: "46px auto 30px", opacity: lk }} />
        <div style={{ textAlign: "center", maxWidth: 840 }}>
          {[`Quran ${TIMING.range}`, `Recitation: ${TIMING.reciter}`, `Translation: ${TIMING.translation}`].map((s, i) =>
            <div key={s} style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 36, lineHeight: 1.55, color: "#FFF0D0", textShadow: "0 0 16px rgba(255,190,90,0.45)", opacity: smooth((f - CARD_FROM - 10 - 4 * i) / 12) }}>{s}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame();
  const ys = useMemo(() => {
    if (!ready) return [] as number[];
    const y = CAPS.map(placeOf);
    if ((getInputProps() as { post?: { pitchReport?: boolean } }).post?.pitchReport) {
      let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!CHARACTER_SHOTS.has(shotOf(g).kind)) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look on him ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
      CAPS.forEach((c, i) => console.log(`TEXT LAYOUT: ${c.from}-${c.to} @${y[i].toFixed(2)} ${c.en}`));
    }
    return y;
  }, [ready]);
  if (!ready) return null;
  const ci = CAPS.findIndex((c) => f >= c.from && f < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(255,200,120,0.10), rgba(255,170,90,0) 60%)", mixBlendMode: "screen" }} />
      <Leak f={f} />
      {ci >= 0 ? <Caption c={CAPS[ci]} f={f} y={ys[ci]} /> : null}
      {ci >= 0 ? <Tag c={CAPS[ci]} f={f} /> : null}
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
