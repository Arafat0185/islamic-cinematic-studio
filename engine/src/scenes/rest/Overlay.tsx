// The 2D layer of video 004 "The Man Who Never Rested":
//  - the narration captions: WHOLE phrases (max 6 words a line, 2 lines), Inter SemiBold 40 px, white with a soft dark
//    shadow, key words in brand orange; a quick clean reveal (a gold shimmer + a burst of gold dust, the letters settling
//    in under 0.3 s) and then completely still; always horizontally centred (max width 760 px); the vertical position
//    changes per shot to keep clear of his head
//  - while a scholar's quote is said: his name as a gold small-caps label above the caption (the Arabic name under it,
//    "attributed" in tiny text for the two unverified quotes), and for the two verified quotes the ORIGINAL ARABIC (an
//    exact slice of the source, Amiri) above the English; the source tag top left
//  - the Quran captions (35:34, 13:24): Arabic (Amiri 50) + Saheeh International (24), with the verse tag
//  - the page: when the camera pushes into a book (or comes back out), the paper margins and the spine around the page
//    window, and the paper grain over the ink drawing while it comes to life
//  - the transitions (page-turn, ink, paper-burn, gold flash) and the end card
import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { smooth } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, TRANSITIONS, shotAt, shotOf, project, pitchAt, CHARACTER_SHOTS, inkAt, pageWindow, pageRect } from "./timeline";
import TIMING from "../../../../videos/004-never-rested/timing.json";

const W = 1080, H = 1920, CX = W / 2, MAXW = 760, GOLD = "#E8B04B", ORANGE = "#FB5606";
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const SHADOW = "0 2px 14px rgba(6,4,2,0.95), 0 0 6px rgba(6,4,2,0.85), 0 0 24px rgba(6,4,2,0.55)";
const EN_FONT = `600 40px ${FONT.caption}`;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

type Word = { w: string; at: number };
type Phrase = { i: number; text: string; start: number; end: number; words: Word[]; keys: string[]; quote?: string; ar?: string };
type Spk = { ar: string; en: string; died: string; label: string; attributed: boolean };
const PH = TIMING.phrases as Phrase[];
const SPK = TIMING.speakers as Record<string, Spk>;
/** a phrase cut into screens (max 12 words: 2 lines of max 6), each line's words with their colour */
type Screen = { from: number; to: number; lines: { w: string; key: boolean }[][]; quote?: string; ar?: string; id: number };
const SCREENS: Screen[] = (() => {
  const out: Screen[] = [];
  PH.forEach((p) => {
    const words = p.words, keyAt = (j: number) => { const before = words.slice(0, j).map((x) => x.w).join(" ").length + (j ? 1 : 0); return p.keys.some((k) => { const at = p.text.indexOf(k); return at >= 0 && before >= at && before < at + k.length; }); };
    const n = Math.ceil(words.length / 10), per = Math.ceil(words.length / n);
    for (let c = 0; c < n; c++) {
      const ws = words.slice(c * per, (c + 1) * per).map((w, j) => ({ w: w.w, key: keyAt(c * per + j) }));
      // balanced lines: at most 6 words and 760 px each (measured), two lines when it does not fit on one
      const fits = (l: { w: string }[]) => l.length <= 6 && measure(l.map((x) => x.w).join(" "), EN_FONT) <= MAXW;
      let lines = [ws];
      if (!fits(ws)) { let best = 1, bestD = 1e9; for (let k = 1; k < ws.length; k++) { const A = ws.slice(0, k), B = ws.slice(k); if (fits(A) && fits(B)) { const d = Math.abs(measure(A.map((x) => x.w).join(" "), EN_FONT) - measure(B.map((x) => x.w).join(" "), EN_FONT)); if (d < bestD) { bestD = d; best = k; } } } lines = [ws.slice(0, best), ws.slice(best)]; }
      const from = c === 0 ? p.start : words[c * per].at, to = c + 1 < n ? words[(c + 1) * per].at : p.end + 0.3;
      out.push({ from, to, lines, quote: p.quote, ar: p.ar, id: out.length });
    }
  });
  return out;
})();
const blockH = (s: Screen) => (s.quote ? 92 : 0) + (s.ar ? 92 : 0) + s.lines.length * 52;
const heads = (a: number, b: number) => { const bx: { y0: number; y1: number }[] = []; for (let f = a; f < b; f += 4) { const s = shotAt(f); if (s.head[1] < -100) continue;
  const lo = project(f, [s.head[0], s.head[1] - 0.35, s.head[2]]), hi = project(f, [s.head[0], s.head[1] + 0.25, s.head[2]]); if (lo.behind) continue; bx.push({ y0: Math.min(lo.y, hi.y) / H, y1: Math.max(lo.y, hi.y) / H }); } return bx; };
const placeY = (a: number, b: number, half: number) => { const bx = heads(a, b); return [0.72, 0.3, 0.76, 0.26, 0.5, 0.62].find((c) => c - half > 0.12 && c + half < 0.88 && !bx.some((x) => c + half > x.y0 && c - half < x.y1)) ?? 0.72; };

const Dust: React.FC<{ k: number; seed: number; w: number }> = ({ k, seed, w }) => k <= 0 || k >= 1 ? null : <>{Array.from({ length: 26 }, (_, i) => {
  const a = hash(i + seed) * 6.28, r = (60 + 160 * hash(i + seed + 3)) * k, x = (hash(i + seed + 7) - 0.5) * w;
  return <div key={i} style={{ position: "absolute", left: CX + x + Math.cos(a) * r * 0.6, top: Math.sin(a) * r * 0.5, width: 5, height: 5, borderRadius: "50%", background: "#ffe2a0", boxShadow: "0 0 10px 3px rgba(255,200,100,0.7)", opacity: (1 - k) * 0.9 }} />; })}</>;
const Caption: React.FC<{ s: Screen; f: number; y: number }> = ({ s, f, y }) => {
  const t = f / FPS, k = smooth((t - s.from) / 0.28), out = smooth((t - s.to + 0.18) / 0.18), vis = k * (1 - out);
  const sp = s.quote ? SPK[s.quote] : null, shimmer = Math.max(0, 1 - (t - s.from) / 0.45);
  const top = H * y - blockH(s) / 2;
  return <div style={{ position: "absolute", left: 0, width: W, top, opacity: vis }}>
    <div style={{ position: "relative", top: blockH(s) / 2 }}><Dust k={Math.min(1, (t - s.from) / 0.5)} seed={s.id * 31} w={560} /></div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `translateY(${(1 - k) * 10}px)`, filter: `blur(${(1 - k) * 3}px)` }}>
      {sp ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 26, letterSpacing: "0.2em", color: GOLD, textShadow: SHADOW }}>{sp.label}</div>
        <div dir="rtl" style={{ fontFamily: FONT.arabic, fontWeight: 700, fontSize: 30, lineHeight: 1.3, color: GOLD, textShadow: SHADOW }}>{sp.ar}</div>
        {sp.attributed ? <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontStyle: "italic", fontSize: 15, letterSpacing: "0.12em", color: "rgba(240,225,195,0.85)", textShadow: SHADOW }}>attributed</div> : null}
      </div> : null}
      {s.ar ? <div dir="rtl" lang="ar" style={{ maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: 46, lineHeight: 1.55, color: "#FFF6E4", textShadow: `0 0 16px rgba(255,190,80,${0.3 + 0.5 * shimmer}), ${SHADOW}` }}>{s.ar}</div> : null}
      {s.lines.map((ln, li) => <div key={li} style={{ maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: "#FFFFFF", textShadow: `0 0 18px rgba(255,200,90,${0.85 * shimmer}), ${SHADOW}`, whiteSpace: "nowrap" }}>
        {ln.map((w, wi) => <React.Fragment key={wi}>{wi ? " " : ""}<span style={{ color: w.key ? ORANGE : shimmer > 0.5 ? "#FFE9B8" : "#FFFFFF" }}>{w.w}</span></React.Fragment>)}
      </div>)}
    </div>
  </div>;
};

type Q = { key: string; ar: string; en: string; start: number; end: number; tag: string };
const QURAN = TIMING.quran as Q[];
const QuranCaption: React.FC<{ q: Q; f: number; y: number }> = ({ q, f, y }) => {
  const t = f / FPS, k = Math.min(smooth((t - q.start) / 0.3), 1 - smooth((t - q.end + 0.3) / 0.3)), ke = Math.min(smooth((t - q.start - 0.15) / 0.3), 1 - smooth((t - q.end + 0.3) / 0.3));
  return <div style={{ position: "absolute", left: CX - MAXW / 2, width: MAXW, top: H * y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
    <div style={{ position: "absolute", left: -(CX - MAXW / 2), width: W, top: -60, bottom: -60, background: "linear-gradient(rgba(10,6,2,0), rgba(10,6,2,0.5) 30%, rgba(10,6,2,0.5) 70%, rgba(10,6,2,0))", opacity: k }} />
    <div dir="rtl" lang="ar" style={{ position: "relative", textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: 50, lineHeight: 1.6, color: "#FFF6E4", textShadow: `0 0 18px rgba(255,190,80,0.55), ${SHADOW}`, opacity: k, filter: `blur(${(1 - k) * 4}px)` }}>{q.ar}</div>
    <div style={{ position: "relative", textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: 24, lineHeight: 1.35, color: "#FFFFFF", textShadow: SHADOW, opacity: ke }}>{q.en}</div>
  </div>;
};
const Tag: React.FC<{ text: string; k: number }> = ({ text, k }) => k < 0.01 ? null :
  <div style={{ position: "absolute", left: 56, top: 176, opacity: 0.92 * k, fontFamily: FONT.caption, fontWeight: 700, fontSize: 20, letterSpacing: "0.18em", color: "#f2e6cc", border: `1.5px solid ${GOLD}`, borderRadius: 999, padding: "7px 18px", background: "rgba(20,14,6,0.6)" }}>{text}</div>;
const SOURCE_TAGS: { from: number; to: number; text: string }[] = [{ from: 12.2, to: 17.35, text: "TABAQAT AL-HANABILA 2/290" }, { from: 33.5, to: 42.6, text: "MIFTAH DAR AL-SA'ADA" }];

/** the page around the world while we pass through it: paper margins, the spine's shadow, the book around it, the grain */
const PageFrame: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS, w = pageWindow(t), ink = inkAt(t); if (w < 0.001 && ink < 0.001) return null;
  const p = pageRect(w), x0 = p.l * W, x1 = W - p.r * W, y0 = p.t * H, y1 = H - p.b * H, m = 46 * w, sp = 70 * w;
  const hole = (a: number, b: number, c: number, d: number) => `M0 0H${W}V${H}H0Z M${a} ${b}H${c}V${d}H${a}Z`;
  return <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
    <defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.18  0 0 0 0.55 0" /></filter>
      <linearGradient id="spine" x1="0" x2="1"><stop offset="0" stopColor="rgba(60,36,14,0.75)" /><stop offset="1" stopColor="rgba(60,36,14,0)" /></linearGradient></defs>
    {w > 0.001 ? <>
      <path d={hole(x0 - m, y0 - m, x1 + m, y1 + m)} fill="#24160c" fillRule="evenodd" />
      <path d={`M${x0 - m} ${y0 - m}H${x1 + m}V${y1 + m}H${x0 - m}Z M${x0} ${y0}H${x1}V${y1}H${x0}Z`} fill="#e6d6b4" fillRule="evenodd" />
      <rect x={x0 - m} y={y0 - m} width={sp + m} height={y1 - y0 + 2 * m} fill="url(#spine)" />
    </> : null}
    <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} filter="url(#grain)" opacity={0.9 * ink} style={{ mixBlendMode: "multiply" }} />
  </svg>;
};

const Transitions: React.FC<{ f: number }> = ({ f }) => {
  const els: React.ReactNode[] = [];
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "pageTurn" && d > -9 && d < 9) {
      const u = (d + 9) / 18, x = W * (1.05 - 2.1 * u);
      els.push(<div key={"pt" + tr.f} style={{ position: "absolute", left: x, top: -40, width: W * 1.1, height: H + 80, background: "linear-gradient(90deg, rgba(60,40,20,0.65) 0%, #d8c8a4 6%, #ece0c4 40%, #e2d4b4 92%, rgba(0,0,0,0) 100%)", transform: `skewX(${-8 + 10 * u}deg)`, boxShadow: "-30px 0 60px rgba(0,0,0,0.5)" }} />);
    }
    if (tr.kind === "inkSpread" && d > -6 && d < 7) {        // warm sepia ink washing across (never near-black)
      const k = d < 0 ? smooth((d + 6) / 6) : 1 - smooth(d / 7);
      els.push(<svg key={"ink" + tr.f} width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><filter id={"inkF" + tr.f}><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves={3} seed={tr.f % 40} /><feDisplacementMap in="SourceGraphic" scale={220} /></filter>
          <radialGradient id={"inkG" + tr.f}><stop offset={Math.max(0, k * 1.1 - 0.12)} stopColor="#8a6438" /><stop offset={Math.max(0, k * 1.1 - 0.04)} stopColor="#b88a50" /><stop offset={Math.min(1, k * 1.1)} stopColor="#f0c878" stopOpacity={0.9} /><stop offset={Math.min(1, k * 1.1 + 0.02)} stopColor="#000" stopOpacity={0} /></radialGradient></defs>
        <rect x={-300} y={-300} width={W + 600} height={H + 600} fill={`url(#inkG${tr.f})`} filter={`url(#inkF${tr.f})`} opacity={0.85} />
      </svg>);
    }
    if (tr.kind === "paperBurn" && d > -9 && d < 9) {
      const front = (d < 0 ? smooth((d + 9) / 8) : 1 - smooth(d / 9)) * 1.25;
      els.push(<svg key={"pb" + tr.f} width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs><filter id={"pbF" + tr.f}><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={tr.f % 30} /><feDisplacementMap in="SourceGraphic" scale={150} /></filter>
          <linearGradient id={"pbG" + tr.f} gradientTransform="rotate(65)"><stop offset={Math.max(0, front - 0.25)} stopColor="#5a3a1a" /><stop offset={Math.max(0, front - 0.12)} stopColor="#8a5a28" /><stop offset={Math.max(0, front - 0.05)} stopColor="#ff9a3a" /><stop offset={Math.max(0, front - 0.015)} stopColor="#ffe0a0" /><stop offset={front} stopColor="#ff7a20" stopOpacity={0} /></linearGradient></defs>
        <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#pbG${tr.f})`} filter={`url(#pbF${tr.f})`} /></svg>);
    }
    if (tr.kind === "flashGold" && Math.abs(d) < 8) els.push(<AbsoluteFill key={"fg" + tr.f} style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,236,190,1), rgba(255,196,96,0.55) 55%, rgba(255,160,60,0.2))", mixBlendMode: "screen", opacity: 0.85 * (1 - Math.abs(d) / 8) }} />);
  }
  return <>{els}</>;
};

const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < CARD_FROM - 6) return null;
  const k = smooth((f - CARD_FROM + 6) / 18), lk = smooth((f - CARD_FROM - 4) / 16), t = f / FPS;
  return <AbsoluteFill style={{ opacity: k, background: "radial-gradient(ellipse at 50% 42%, #3a2812 0%, #1c1208 62%, #100a04 100%)", alignItems: "center", justifyContent: "center" }}>
    {Array.from({ length: 36 }, (_, i) => { const y = (H + 40) - ((hash(i) * (H + 80) + (30 + 50 * hash(i + 1)) * t) % (H + 80)); return <div key={i} style={{ position: "absolute", left: hash(i + 2) * W + 30 * Math.sin(t * 0.6 + i), top: y, width: 4 + 4 * hash(i + 3), height: 4 + 4 * hash(i + 3), borderRadius: "50%", background: "#f2c878", boxShadow: "0 0 10px 3px rgba(240,190,100,0.5)", opacity: 0.6 }} />; })}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Img src={staticFile(LOGO)} style={{ width: 380, height: 380, objectFit: "contain", opacity: lk }} />
      <div style={{ width: 140, height: 3, background: GOLD, margin: "44px auto 30px", opacity: lk }} />
      <div style={{ maxWidth: 800, textAlign: "center", fontFamily: FONT.caption, fontWeight: 700, fontSize: 40, lineHeight: 1.5, color: "#FFF3D8", textShadow: "0 0 18px rgba(255,190,90,0.45)", opacity: smooth((f - CARD_FROM - 8) / 12) }}>
        {["Quran 35:34 · 13:24", "Ibn al-Jawzi · Sufyan al-Thawri", "Imam Ahmad · Ibn al-Qayyim"].map((s) => <div key={s}>{s}</div>)}
      </div>
    </div>
  </AbsoluteFill>;
};

export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame(), t = f / FPS;
  const ys = useMemo(() => {
    if (!ready) return [] as number[];
    if ((getInputProps() as { post?: { pitchReport?: boolean } }).post?.pitchReport) {
      let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!CHARACTER_SHOTS.has(shotOf(g).kind)) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look in a character shot ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
    }
    for (const s of SCREENS) for (const ln of s.lines) { const wdt = measure(ln.map((x) => x.w).join(" "), EN_FONT); if (wdt > MAXW) console.warn(`caption line wider than ${MAXW}px: ${wdt.toFixed(0)}: ${ln.map((x) => x.w).join(" ")}`); }
    return SCREENS.map((s) => placeY(F(s.from), F(s.to), blockH(s) / 2 / H));
  }, [ready]);
  const qY = useMemo(() => (ready ? QURAN.map((q) => placeY(F(q.start), F(q.end), 0.08)) : []), [ready]);
  if (!ready) return null;
  const si = SCREENS.findIndex((s) => t >= s.from && t < s.to), qi = QURAN.findIndex((q) => t >= q.start && t < q.end);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 58%, rgba(6,4,2,0.45) 100%)" }} />
      <PageFrame f={f} />
      <Transitions f={f} />
      {si >= 0 ? <Caption s={SCREENS[si]} f={f} y={ys[si]} /> : null}
      {qi >= 0 ? <QuranCaption q={QURAN[qi]} f={f} y={qY[qi]} /> : null}
      {qi >= 0 ? <Tag text={QURAN[qi].tag} k={Math.min(smooth((t - QURAN[qi].start) / 0.4), 1 - smooth((t - QURAN[qi].end + 0.3) / 0.3))} /> : null}
      <Tag text={TIMING.cf.tag} k={Math.min(smooth((t - TIMING.cf.start) / 0.4), 1 - smooth((t - TIMING.cf.end + 0.3) / 0.3))} />
      {SOURCE_TAGS.map((st) => <Tag key={st.text} text={st.text} k={Math.min(smooth((t - st.from) / 0.4), 1 - smooth((t - st.to + 0.3) / 0.3))} />)}
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
