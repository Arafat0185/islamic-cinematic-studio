// The 2D layer of video 003 "The Sirat":
//  - the hell grade: a blood-red soft-light wash, crushed blacks, a red-black vignette pulsing with the heartbeat
//  - smoke rolling across the lens, embers flying up past the camera, red lightning bolts in the sky
//  - the transitions: fire-burn wipes, smoke wipes, red lightning flash cuts, smash to black (<= 0.3 s)
//  - the recitation captions: Arabic (Amiri) over the Saheeh International English, white, key words blood red, a faint
//    dark band behind them, centred in the TikTok safe zone (760 px wide, centre 40 px left of the middle), never over a
//    head; the verse tag (top left); hadith tags (top right) only while those visuals are on screen
//  - CONTINUE: a near-black frame, embers, a fire glow pulsing at the bottom: "PART 1" / "How fast will you cross?"
//  - the end card (dark red): the logo and the credits
import React, { useMemo } from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { smooth, clamp01 } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, CONTINUE_FROM, TRANSITIONS, shotAt, shotOf, project, lightningAt, pitchAt, CHARACTER_SHOTS } from "./timeline";
import TIMING from "../../../../videos/003-the-sirat/timing.json";
import STORY from "../../../../videos/003-the-sirat/shots.json";

const W = 1080, H = 1920, RED = "#c4161c", BLOOD = "#8B0000", CAP_CX = W / 2 - 40, MAXW = 760;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const SHADOW = "0 2px 14px rgba(10,0,0,0.95), 0 0 4px rgba(10,0,0,0.85)";
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---------------- the heartbeat (shared with the sound: shots.json events.heartRate) ----------------
const RATE = STORY.events.heartRate as [number, number, number, number][];
export const BEATS: number[] = (() => { const out: number[] = []; for (const [a, b, r0, r1] of RATE) { let t = a; while (t < b) { out.push(t); const bpm = r0 + (r1 - r0) * (t - a) / (b - a); t += 60 / bpm; } } return out; })();
const pulseAt = (t: number) => { let k = 0; for (const b of BEATS) { const d = t - b; if (d >= 0 && d < 0.5) k = Math.max(k, Math.exp(-d / 0.09) + 0.6 * Math.exp(-Math.max(0, d - 0.22) / 0.08) * (d > 0.22 ? 1 : 0)); } return Math.min(1, k); };

// ---------------- the recitation captions ----------------
type Phrase = { i: number; verse: string; ar: string; arKeys: number[]; en: string; keys: string[]; start: number; end: number };
const PH = (TIMING.phrases as Phrase[]).map((p) => ({ ...p, from: F(p.start), to: F(p.end) }));   // the last phrase runs to the end, over the ending
const AR_SIZE = 50, AR_LH = 1.6, EN_SIZE = 24, EN_LH = 1.32, GAP = 52;
const lines = (text: string, font: string) => { let n = 1, cur = ""; for (const w of text.split(" ")) { const tt = cur ? cur + " " + w : w; if (measure(tt, font) > MAXW && cur) { n++; cur = w; } else cur = tt; } return n; };
const half = (p: Phrase) => (lines(p.ar, `700 ${AR_SIZE}px ${FONT.arabic}`) * AR_SIZE * AR_LH + GAP + lines(p.en, `600 ${EN_SIZE}px ${FONT.caption}`) * EN_SIZE * EN_LH) / H / 2;
/** heads on screen over [a, b): boxes in frame fractions */
const heads = (a: number, b: number) => {
  const boxes: { y0: number; y1: number; x0: number; x1: number }[] = [];
  for (let f = a; f < b; f += 3) {
    const s = shotAt(f);
    if (s.head[1] < -20) continue;
    const lo = project(f, [s.head[0], s.head[1] - 0.32, s.head[2]]), hi = project(f, [s.head[0], s.head[1] + 0.22, s.head[2]]), mid = project(f, s.head);
    if (lo.behind) continue;
    const half = Math.max(70, Math.abs(lo.y - hi.y) * 0.55);
    boxes.push({ y0: Math.min(hi.y, lo.y) / H, y1: Math.max(hi.y, lo.y) / H, x0: (mid.x - half) / W, x1: (mid.x + half) / W });
  }
  return boxes;
};
const placeOf = (p: Phrase & { from: number; to: number }) => {
  const h = half(p), bx = heads(p.from, p.to), X0 = (CAP_CX - MAXW / 2) / W, X1 = (CAP_CX + MAXW / 2) / W;
  const cost = (c: number) => bx.reduce((s, b) => s + Math.max(0, Math.min(c + h + 0.02, b.y1) - Math.max(c - h - 0.02, b.y0)) * Math.max(0, Math.min(X1, b.x1) - Math.max(X0, b.x0)), 0);
  const C = [0.72, 0.68, 0.76, 0.64, 0.32, 0.36, 0.5].filter((c) => c - h >= 0.2 && c + h <= 0.86);
  return C.find((c) => cost(c) === 0) ?? C.sort((x, y) => cost(x) - cost(y))[0];
};
const enParts = (en: string, keys: string[]) => {
  const marks: [number, number][] = []; for (const k of keys) { const i = en.indexOf(k); if (i >= 0) marks.push([i, i + k.length]); }
  marks.sort((a, b) => a[0] - b[0]); const out: { s: string; key: boolean }[] = []; let at = 0;
  for (const [a, b] of marks) { if (a > at) out.push({ s: en.slice(at, a), key: false }); out.push({ s: en.slice(a, b), key: true }); at = b; }
  if (at < en.length) out.push({ s: en.slice(at), key: false }); return out;
};
const RecCaption: React.FC<{ p: (typeof PH)[number]; f: number; y: number }> = ({ p, f, y }) => {
  const k = Math.min(smooth((f - p.from) / 10), 1 - smooth((f - p.to + 10) / 10)), ke = Math.min(smooth((f - p.from - 6) / 12), 1 - smooth((f - p.to + 10) / 10));
  const words = p.ar.split(" "), red = { color: RED, textShadow: `0 0 12px rgba(196,22,28,0.45), ${SHADOW}` };
  return (
    <div style={{ position: "absolute", left: CAP_CX - MAXW / 2, width: MAXW, top: H * y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: GAP }}>
      <div style={{ position: "absolute", left: -(CAP_CX - MAXW / 2), width: W, top: -50, bottom: -50, background: "linear-gradient(rgba(8,0,0,0), rgba(8,0,0,0.5) 30%, rgba(8,0,0,0.5) 70%, rgba(8,0,0,0))", opacity: k }} />
      <div dir="rtl" lang="ar" style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: AR_SIZE, lineHeight: AR_LH, color: "#FFFFFF", textShadow: SHADOW, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
        {words.map((w, i) => <React.Fragment key={i}>{p.arKeys.includes(i) ? <span style={red}>{w}</span> : w}{i < words.length - 1 ? " " : ""}</React.Fragment>)}
      </div>
      <div style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: EN_SIZE, lineHeight: EN_LH, color: "#F4F0EC", textShadow: SHADOW, opacity: ke }}>
        {enParts(p.en, p.keys).map((x, i) => (x.key ? <span key={i} style={red}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};
const VerseTag: React.FC<{ f: number }> = ({ f }) => {
  const p = PH.find((x) => f >= x.from && f < x.to); if (!p) return null;
  const k = smooth(f / 20) * (1 - smooth((f - CARD_FROM + 10) / 12));
  return <div style={{ position: "absolute", left: 56, top: 176, opacity: 0.85 * k, fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, letterSpacing: "0.18em", color: "#e8dcd8", border: `1.5px solid rgba(196,22,28,0.7)`, borderRadius: 999, padding: "8px 18px", background: "rgba(14,2,2,0.6)" }}>MARYAM {p.verse}</div>;
};
/** hadith tags (top right), only while those visuals are on screen */
const TAGS: { kinds: string[]; text: string }[] = [
  { kinds: ["hooksRise", "snatch", "hooksPass", "stumbleAhead", "breaking", "snatchStrike", "fallWith"], text: "SAHIH AL-BUKHARI 6573" },
  { kinds: ["crossers", "crossersPast", "crossersSafe", "stumbleAhead"], text: "SAHIH AL-BUKHARI 7439 · MUSLIM 183" },
  { kinds: ["crawlDrag"], text: "SAHIH AL-BUKHARI 7439 · MUSLIM 183 · MUSLIM 195" },
];
const HadithTags: React.FC<{ f: number }> = ({ f }) => {
  const sh = shotOf(f), on = TAGS.filter((t) => t.kinds.includes(sh.kind));
  if (!on.length) return null;
  const k = Math.min(smooth((f - sh.from) / 10), 1 - smooth((f - sh.to + 8) / 8));
  return <div style={{ position: "absolute", right: 120, top: 176, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, opacity: 0.85 * k }}>
    {on.map((t) => <div key={t.text} style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 17, letterSpacing: "0.14em", color: "#e8dcd8", border: "1.2px solid rgba(232,170,60,0.55)", borderRadius: 999, padding: "6px 14px", background: "rgba(14,2,2,0.6)" }}>{t.text}</div>)}
  </div>;
};

// ---------------- smoke, embers, lightning ----------------
const LensSmoke: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  if (k < 0.01) return null;
  const t = f / FPS;
  return <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: 9 }, (_, i) => { const sp = 120 + 160 * hash(i), x = ((hash(i + 3) * 1600 + sp * t * (i % 2 ? 1 : -1)) % 1700 + 1700) % 1700 - 300, y = 200 + 1500 * hash(i + 7) + 60 * Math.sin(t * 0.7 + i);
      const r = 380 + 420 * hash(i + 11); return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", opacity: k * (0.45 + 0.4 * hash(i + 5)),
        background: `radial-gradient(circle, rgba(${i % 3 ? "22,4,3" : "48,10,6"},0.95) 0%, rgba(20,3,2,0.6) 40%, rgba(10,0,0,0) 70%)`, filter: "blur(18px)" }} />; })}
  </AbsoluteFill>;
};
const Embers: React.FC<{ f: number; n: number; speed?: number }> = ({ f, n, speed = 1 }) => {
  const t = f / FPS;
  return <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
    {Array.from({ length: n }, (_, i) => { const v = (380 + 900 * hash(i + 1)) * speed, y = H + 80 - (((hash(i + 2) * (H + 160) + v * t) % (H + 160))), x = hash(i + 3) * W + 60 * Math.sin(t * (1 + hash(i)) + i), s = 3 + 9 * hash(i + 4) ** 2;
      const near = hash(i + 6) > 0.85, sz = near ? s * 3.5 : s;
      return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz * (near ? 2.6 : 1.6), borderRadius: "50%", background: i % 4 ? "#ff7a1a" : "#ffd27a", boxShadow: `0 0 ${sz * 2}px ${sz * 0.6}px rgba(255,90,10,0.7)`, filter: near ? "blur(3px)" : "none", opacity: 0.85 }} />; })}
  </AbsoluteFill>;
};
const Bolt: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS, k = lightningAt(t); if (k < 0.05) return null;
  const L = (STORY.events.lightning as number[]).reduce((a, b) => (b <= t ? b : a), 0), seed = Math.round(L * 10);
  let x = 200 + 680 * hash(seed), y = -20; const pts: string[] = [`${x},${y}`];
  while (y < 620 + 300 * hash(seed + 1)) { x += (hash(seed + y) - 0.5) * 120; y += 30 + 50 * hash(seed + y + 1); pts.push(`${x.toFixed(0)},${y.toFixed(0)}`); }
  return <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: "screen", opacity: k }}>
    <polyline points={pts.join(" ")} fill="none" stroke="rgba(255,60,40,0.55)" strokeWidth={22} strokeLinejoin="round" style={{ filter: "blur(10px)" }} />
    <polyline points={pts.join(" ")} fill="none" stroke="#ffd0c8" strokeWidth={4} strokeLinejoin="round" />
  </svg>;
};

/** 19:68 "and the devils": NOTHING is shown. The smoke rolls in thicker and darker, the edges of the frame close in, the
 *  light dims (timeline) and the wind howls louder (sound): the sense of a presence, never a shape. */
const Presence: React.FC<{ f: number }> = ({ f }) => {
  const sh = shotOf(f); if (sh.kind !== "smokeDevils" && sh.kind !== "kneelWide") return null;
  const k = Math.min(smooth((f - sh.from) / 30), 1 - smooth((f - sh.to + 10) / 10)) * (sh.kind === "kneelWide" ? 0.5 : 1);
  return <AbsoluteFill style={{ pointerEvents: "none", opacity: k, background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 30%, rgba(8,0,0,0.65) 75%, rgba(3,0,0,0.92) 100%)" }} />;
};

// ---------------- the transitions ----------------
const Transitions: React.FC<{ f: number }> = ({ f }) => {
  let burn = 0, burnDir = 1, smoke = 0, red = 0, black = 0;
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "burn" && d > -10 && d < 10) { burn = d < 0 ? smooth((d + 10) / 9) : 1 - smooth(d / 9); burnDir = tr.f % 2 ? 1 : -1; }
    if (tr.kind === "smoke" && d > -12 && d < 14) smoke = Math.max(smoke, d < 0 ? smooth((d + 12) / 12) : 1 - smooth(d / 14));
    if (tr.kind === "flash" && Math.abs(d) < 7) red = Math.max(red, d < 0 ? smooth((d + 3) / 3) : Math.exp(-d / 2.5));
  }
  if (shotOf(f).kind.startsWith("smash")) black = 1;   // the smash to black lasts exactly its own (0.2-0.25 s) shot
  // the fire-burn wipe: a ragged front of burning char sweeps over the frame and back off it (the cut hides under the char)
  const front = burn * 1.25;
  return <>
    {burn > 0.01 ? <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <filter id="burnEdge" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={f % 50} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={140} /></filter>
        <linearGradient id="burnG" gradientTransform={`rotate(${burnDir > 0 ? 70 : 110})`}>
          <stop offset={Math.max(0, front - 0.25)} stopColor="#120202" stopOpacity={1} />
          <stop offset={Math.max(0, front - 0.13)} stopColor="#3a0602" stopOpacity={1} />
          <stop offset={Math.max(0, front - 0.06)} stopColor="#ff6a10" stopOpacity={1} />
          <stop offset={Math.max(0, front - 0.02)} stopColor="#ffe08a" stopOpacity={1} />
          <stop offset={front} stopColor="#ff3a00" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="url(#burnG)" filter="url(#burnEdge)" />
    </svg> : null}
    {smoke > 0.01 ? <LensSmoke f={f + 40} k={1.6 * smoke} /> : null}
    {red > 0.01 ? <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,70,50,1), rgba(160,0,0,0.75) 55%, rgba(60,0,0,0.6))", mixBlendMode: "screen", opacity: 0.8 * red }} /> : null}
    {black > 0 ? <AbsoluteFill style={{ background: "#000" }} /> : null}
  </>;
};

// ---------------- CONTINUE and the end card ----------------
const Continue: React.FC<{ f: number }> = ({ f }) => {
  if (f < CONTINUE_FROM - 12 || f >= CARD_FROM + 12) return null;
  const t = f / FPS, k = smooth((f - CONTINUE_FROM + 12) / 12) * (1 - smooth((f - CARD_FROM) / 12)), glow = 0.75 + 0.25 * Math.sin(t * 5.5) * Math.sin(t * 2.1 + 1);
  const ti = smooth((f - CONTINUE_FROM - 10) / 20), pt = smooth((f - CONTINUE_FROM) / 14);
  return <AbsoluteFill style={{ opacity: k }}>
    <AbsoluteFill style={{ background: "#0a0101" }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 95% 46% at 50% 104%, rgba(255,110,20,${glow}) 0%, rgba(200,24,0,${0.9 * glow}) 34%, rgba(110,8,0,${0.7 * glow}) 66%, rgba(10,1,1,0) 100%)` }} />
    <Embers f={f} n={46} speed={0.45} />
    <div style={{ position: "absolute", left: CAP_CX - 400, width: 800, top: 760, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 24, letterSpacing: "0.5em", color: RED, opacity: pt, textShadow: "0 0 12px rgba(196,22,28,0.5)" }}>PART 1</div>
      <div style={{ fontFamily: FONT.title, fontWeight: 700, fontStyle: "italic", fontSize: 76, color: "#fff4ec", textAlign: "center", lineHeight: 1.1, opacity: ti, filter: `blur(${(1 - ti) * 8}px)`, textShadow: "0 0 24px rgba(255,80,20,0.45), 0 2px 10px rgba(0,0,0,0.9)" }}>How fast will you cross?</div>
    </div>
  </AbsoluteFill>;
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < CARD_FROM) return null;
  const k = smooth((f - CARD_FROM) / 14), lk = smooth((f - CARD_FROM - 6) / 16), t = f / FPS;
  const line = (s: string, i: number) => <div key={s} style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 30, lineHeight: 1.55, color: "#efe2dc", opacity: smooth((f - CARD_FROM - 8 - 4 * i) / 10) }}>{s.split(" · ").map((x, j) => <React.Fragment key={j}>{j ? " · " : ""}<span style={{ whiteSpace: "nowrap" }}>{x}</span></React.Fragment>)}</div>;
  return <AbsoluteFill style={{ opacity: k, background: `radial-gradient(ellipse at 50% 45%, #6a0c0a 0%, #3e0606 55%, #220303 100%)`, alignItems: "center", justifyContent: "center" }}>
    <Embers f={f} n={24} speed={0.35} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `translateX(-40px) scale(${1 + 0.01 * Math.sin(t * 2)})` }}>
      <Img src={staticFile(LOGO)} style={{ width: 360, height: 360, objectFit: "contain", opacity: 0.9 * lk }} />
      <div style={{ height: 48 }} />
      <div style={{ width: 110, height: 2, background: "rgba(255,140,60,0.75)", margin: "0 auto 28px", opacity: lk }} />
      <div style={{ textAlign: "center" }}><div style={{ maxWidth: 760, margin: "0 auto" }}>{line(`Quran ${TIMING.range} · Recitation: ${TIMING.reciter} · Translation: ${TIMING.translation}`, 0)}</div></div>
    </div>
  </AbsoluteFill>;
};

// ---------------- the whole layer ----------------
export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame(), t = f / FPS;
  const ys = useMemo(() => {
    if (!ready) return [];
    if ((getInputProps() as { post?: { pitchReport?: boolean } }).post?.pitchReport) {
      let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!CHARACTER_SHOTS.has(shotOf(g).kind)) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look in a character shot ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
    }
    return PH.map(placeOf);
  }, [ready]);
  if (!ready) return null;
  const pi = PH.findIndex((p) => f >= p.from && f < p.to), sh = shotOf(f), pulse = pulseAt(t);
  const smokeK = sh.kind === "burst" ? 1 - smooth((f - sh.from) / 22) : 0.22 + 0.1 * Math.sin(t * 0.4);
  const emberN = sh.kind === "emberLens" ? 70 : sh.kind === "fallWith" ? 60 : sh.kind.startsWith("erupt") || sh.kind === "otsErupt" ? 50 : 22;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: BLOOD, mixBlendMode: "soft-light", opacity: 0.55 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(255,120,30,0.35), rgba(0,0,0,0) 60%)", mixBlendMode: "screen", opacity: 0.6 + 0.4 * Math.sin(t * 6.1) * Math.sin(t * 2.3) }} />
      <Bolt f={f} />
      <LensSmoke f={f} k={sh.kind === "smokeDevils" ? 0.35 + 0.9 * smooth((f - sh.from) / 45) : sh.kind === "kneelWide" ? 0.6 : smokeK} />
      <Presence f={f} />
      <Embers f={f} n={emberN} speed={sh.kind === "emberLens" ? 2.2 : 1} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) ${46 - 10 * pulse}%, rgba(25,0,0,${0.55 + 0.3 * pulse}) 80%, rgba(5,0,0,${0.85 + 0.1 * pulse}) 100%)` }} />
      <Transitions f={f} />
      <Continue f={f} />
      <EndCard f={f} />
      {pi >= 0 ? <RecCaption p={PH[pi]} f={f} y={f >= CONTINUE_FROM ? 0.76 : ys[pi]} /> : null}
      <VerseTag f={f} />
      <HadithTags f={f} />
    </AbsoluteFill>
  );
};
void clamp01; void FRAMES;
