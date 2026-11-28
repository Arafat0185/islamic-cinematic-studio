// The 2D layer of video 005 "The Dunya" (sad, rainy, calm):
//  - a cold blue-grey tint (as in video 002)
//  - captions: Arabic (Amiri 50) over English (Inter 24), centred, inside the safe zone, never over a head; key words in
//    brand orange. The voice part uses the channel owner's text (timing.json "voice"); the recitation uses exact slices
//    of the quran.com text (timing.json "phrases"); small tags: QURAN 9:51 (voice line 5), AL-HADID 57:22 / 57:23
//  - every cut: a soft dissolve through rain on glass
//  - the lightning's cold flash (002's "lightning2" shot), the dark rainy end card
import React, { useMemo } from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { smooth } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, CUTS, shotAt, shotOf, pitchAt, project as toScreen } from "./timeline";
import { EV } from "../lastrequest/timeline";
import TIMING from "../../../../videos/005-the-dunya/timing.json";

const W = 1080, H = 1920, ORANGE = "#FB5606", MAXW = 760, CX = W / 2;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const SHADOW = "0 2px 16px rgba(2,4,10,0.95), 0 0 5px rgba(2,4,10,0.8)";
const AR_SIZE = 50, AR_LH = 1.6, EN_SIZE = 24, EN_LH = 1.32, GAP = 40;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

type Cap = { ar: string; en: string; keys: string[]; arKeys: number[]; from: number; to: number; tag?: string; repeatAt?: number; fadeIn: number };
type V = { ar: string; en: string; keys: string[]; start: number; end: number; tag?: string };
type P = { ar: string; en: string; keys: string[]; arKeys: number[]; start: number; end: number; verse: string; repeatAt?: number };
const CAPS: Cap[] = [
  ...(TIMING.voice as V[]).map((v) => ({ ar: v.ar, en: v.en, keys: v.keys, arKeys: [], from: F(v.start), to: F(v.end), tag: v.tag, fadeIn: 8 })),
  ...(TIMING.phrases as P[]).map((p, i) => ({ ar: p.ar, en: p.en, keys: p.keys, arKeys: p.arKeys, from: F(p.start), to: Math.min(F(p.end), CARD_FROM), tag: `AL-HADID ${p.verse}`, repeatAt: p.repeatAt, fadeIn: i === 0 ? 18 : 12 })),
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
      <div style={{ position: "absolute", left: -(CX - MAXW / 2), width: W, top: -50, bottom: -50, background: "linear-gradient(rgba(4,6,12,0), rgba(4,6,12,0.5) 30%, rgba(4,6,12,0.5) 70%, rgba(4,6,12,0))", opacity: k }} />
      <div dir="rtl" lang="ar" style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: AR_SIZE, lineHeight: AR_LH, color: "#EDEBE6", textShadow: SHADOW, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
        {words.map((w, i) => <React.Fragment key={i}>{c.arKeys.includes(i) ? <span style={key}>{w}</span> : w}{i < words.length - 1 ? " " : ""}</React.Fragment>)}
      </div>
      <div style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: EN_SIZE, lineHeight: EN_LH, color: "#E2E2DE", textShadow: SHADOW, opacity: ke }}>
        {enParts(c.en, c.keys).map((x, i) => (x.key ? <span key={i} style={key}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};
const Tag: React.FC<{ c: Cap; f: number }> = ({ c, f }) => {
  if (!c.tag) return null;
  const k = Math.min(smooth((f - c.from) / 14), 1 - smooth((f - Math.min(c.to, CARD_FROM) + 14) / 14));
  return <div style={{ position: "absolute", left: 56, top: 176, opacity: 0.85 * k, fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: "#d6d6d1", border: "1.5px solid rgba(251,86,6,0.6)", borderRadius: 999, padding: "8px 20px", background: "rgba(10,12,18,0.6)" }}>{c.tag}</div>;
};

/** a soft dissolve through rain on glass at every cut: the picture blurs (fxAt), drops and a cold film run over it */
const Glass: React.FC<{ f: number }> = ({ f }) => {
  let g = 0, near = 0; for (const c of CUTS) { const d = Math.abs(f - c); if (d < 12 && 1 - d / 12 > g) { g = 1 - d / 12; near = c; } }
  if (g < 0.01) return null; g = smooth(g);
  return (
    <AbsoluteFill style={{ opacity: g, background: "linear-gradient(rgba(120,140,170,0.22), rgba(50,60,80,0.32))" }}>
      {Array.from({ length: 34 }, (_, i) => { const s = near * 7 + i, x = hash(s) * W, y0 = hash(s + 1) * H, r = 6 + 16 * hash(s + 2), fall = (f - near + 12) * (2 + 10 * hash(s + 3));
        return <div key={i} style={{ position: "absolute", left: x, top: y0 + fall, width: r, height: r * 1.25, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "radial-gradient(circle at 35% 30%, rgba(235,242,255,0.55), rgba(160,180,210,0.15) 60%, rgba(20,30,45,0.25))", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />; })}
    </AbsoluteFill>
  );
};
const Lightning: React.FC<{ f: number }> = ({ f }) => {
  if (shotOf(f).kind !== "lightning2") return null;
  const sf = shotAt(f).src, [a, b] = EV.lightning, p = (x: number) => (x >= 0 && x < 6 ? Math.exp(-x / 1.8) : 0), k = Math.max(p(sf - a), 0.7 * p(sf - b));
  return k > 0.01 ? <AbsoluteFill style={{ background: "radial-gradient(circle at 60% 30%, rgba(210,225,255,1), rgba(150,170,210,0.4) 50%, rgba(0,0,0,0) 85%)", opacity: 0.45 * k, mixBlendMode: "screen" }} /> : null;
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const pre = smooth((f - CARD_FROM + 24) / 24); if (pre <= 0) return null;
  const k = smooth((f - CARD_FROM) / 20), lk = smooth((f - CARD_FROM - 6) / 18), t = f / FPS;
  return (
    <AbsoluteFill style={{ background: `rgba(14,18,26,${Math.max(0.6 * pre, k)})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5 * k }}>
        {Array.from({ length: 90 }, (_, i) => { const x = hash(i) * W, sp = 1500 + 900 * hash(i + 1), y = ((hash(i + 2) * (H + 200) + sp * t) % (H + 200)) - 100;
          return <div key={i} style={{ position: "absolute", left: x - 0.18 * y, top: y, width: 2, height: 40 + 40 * hash(i + 3), background: "linear-gradient(rgba(190,205,230,0), rgba(190,205,230,0.6))", transform: "rotate(10deg)" }} />; })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <Img src={staticFile(LOGO)} style={{ width: 380, height: 380, objectFit: "contain", opacity: 0.85 * lk, filter: "grayscale(0.6) brightness(0.9)" }} />
        <div style={{ width: 110, height: 2, background: "rgba(251,86,6,0.75)", margin: "50px auto 30px", opacity: lk }} />
        <div style={{ textAlign: "center", maxWidth: 820 }}>
          {[`Quran ${TIMING.range}`, `Recitation: ${TIMING.reciter}`, `Translation: ${TIMING.translation}`].map((s, i) =>
            <div key={s} style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 34, lineHeight: 1.55, color: "#d4d4cf", opacity: smooth((f - CARD_FROM - 12 - 4 * i) / 12) }}>{s}</div>)}
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
      let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!shotAt(g).frame.traveller) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look on him ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
      CAPS.forEach((c, i) => console.log(`TEXT LAYOUT: ${c.from}-${c.to} @${y[i].toFixed(2)} ${c.en}`));
    }
    return y;
  }, [ready]);
  if (!ready) return null;
  const ci = CAPS.findIndex((c) => f >= c.from && f < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "#24344c", mixBlendMode: "soft-light", opacity: 0.5 }} />
      <AbsoluteFill style={{ background: "#2a3446", mixBlendMode: "color", opacity: 0.2 }} />
      <Lightning f={f} />
      <Glass f={f} />
      {ci >= 0 ? <Caption c={CAPS[ci]} f={f} y={ys[ci]} /> : null}
      {ci >= 0 ? <Tag c={CAPS[ci]} f={f} /> : null}
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
