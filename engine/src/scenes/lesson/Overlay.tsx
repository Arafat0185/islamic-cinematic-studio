// The 2D layer of video 007 "The Lesson" (Black & Gold Noir):
//  - a cinematic letterbox: black bars top and bottom, the picture 1080 x 1350 in the middle
//  - captions INSIDE the bottom bar (centred in the TikTok-safe width): Arabic (Amiri 44) over English (Inter SemiBold 26,
//    white, key words in gold); the channel owner's text, timed to the talk (timing.json "talk"); never over the picture
//  - small tags inside the top bar (the place and the hour: no verses)
//  - heavy film grain over everything; lightning; the transitions: a wall of blowing sand sweeping across (sand), a
//    dissolve through rain on glass (rain), a fade through black (black)
//  - the end card inside the letterbox: the logo in gold on black, the closing line
import React from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { smooth, clamp01 } from "../../camera/ease";
import { FONT, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, EV, TRANSITIONS, CHARACTER_SHOTS, shotOf, pitchAt } from "./timeline";
import TIMING from "../../../../videos/007-the-lesson/timing.json";

const W = 1080, H = 1920, BAR = 285, PIC = H - 2 * BAR, GOLD = "#E8B04B", MAXW = 760, CX = W / 2 - 40;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
type V = { ar: string; en: string; keys: string[]; start: number; end: number };
const CAPS = (TIMING.talk as V[]).map((v) => ({ ...v, from: F(v.start), to: Math.min(F(v.end), CARD_FROM) }));

const enParts = (en: string, keys: string[]) => {
  const marks: [number, number][] = []; for (const k of keys) { const i = en.indexOf(k); if (i >= 0) marks.push([i, i + k.length]); }
  marks.sort((a, b) => a[0] - b[0]); const out: { s: string; key: boolean }[] = []; let at = 0;
  for (const [a, b] of marks) { if (a > at) out.push({ s: en.slice(at, a), key: false }); out.push({ s: en.slice(a, b), key: true }); at = b; }
  if (at < en.length) out.push({ s: en.slice(at), key: false }); return out;
};
const Caption: React.FC<{ c: (typeof CAPS)[number]; f: number }> = ({ c, f }) => {
  const out = 1 - smooth((f - c.to + 6) / 6), k = Math.min(smooth((f - c.from) / 7), out), ke = Math.min(smooth((f - c.from - 3) / 8), out);
  return (
    <div style={{ position: "absolute", left: CX - MAXW / 2, width: MAXW, top: H - BAR + 26, height: BAR - 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 10 }}>
      <div dir="rtl" lang="ar" style={{ maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: 44, lineHeight: 1.42, color: "#F4F1EA", opacity: k, filter: `blur(${(1 - k) * 4}px)` }}>{c.ar}</div>
      <div style={{ maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: "#FFFFFF", opacity: ke }}>
        {enParts(c.en, c.keys).map((x, i) => (x.key ? <span key={i} style={{ color: GOLD, textShadow: "0 0 12px rgba(232,176,75,0.35)" }}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};
/** the place and the hour, in the top bar */
const TAGS: Record<string, string> = { room: "WARD 7  ·  3:12 AM", corridor: "WARD 7  ·  3:40 AM", dunes: "THE DUNYA", exterior: "5:51 AM  ·  FIRST LIGHT" };
const Tags: React.FC<{ f: number }> = ({ f }) => {
  const sh = shotOf(f), dawn = sh.kind === "footprints" || sh.kind === "foundation" || sh.kind === "crestSun";
  const tag = dawn ? "FIRST LIGHT" : sh.kind === "roomGold" || sh.kind === "chestGold" ? "WARD 7  ·  5:30 AM" : TAGS[sh.world];
  const k = smooth((f - sh.from) / 10) * (1 - smooth((f - CARD_FROM + 16) / 16)) * smooth(f / 12);
  const st: React.CSSProperties = { position: "absolute", top: BAR - 62, fontFamily: FONT.caption, fontWeight: 600, fontSize: 19, letterSpacing: "0.34em", color: "#b9bcc0" };
  return (<>
    <div style={{ ...st, left: 64, opacity: 0.8 * smooth(f / 12) * (1 - smooth((f - CARD_FROM + 16) / 16)) }}>THE LESSON</div>
    <div style={{ ...st, right: 64, color: dawn || sh.kind === "roomGold" ? GOLD : "#b9bcc0", opacity: 0.85 * k }}>{tag}</div>
  </>);
};
const Grain: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.34 }}>
    <svg width={W} height={H}>
      <filter id="g7"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 61} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={W} height={H} filter="url(#g7)" />
    </svg>
  </AbsoluteFill>
);
/** the transitions around each planned cut */
const Transition: React.FC<{ f: number }> = ({ f }) => {
  for (const tr of TRANSITIONS) {
    const d = f - tr.f;
    if (tr.kind === "black" && Math.abs(d) < 10) { const k = d < 0 ? smooth((d + 10) / 8) : 1 - smooth((d - 1) / 9); return <AbsoluteFill style={{ background: "#000", opacity: k }} />; }
    if (tr.kind === "sand" && Math.abs(d) < 15) {
      const cx = 540 + d * 118, core = 1260;                             // a wall of blowing sand, its core wider than the frame at the cut
      return (
        <AbsoluteFill>
          <div style={{ position: "absolute", top: BAR, height: PIC, left: cx - core / 2 - 420, width: core + 840,
            background: `linear-gradient(90deg, rgba(38,35,31,0), rgba(38,35,31,0.85) 22%, rgba(44,40,35,0.99) 33%, rgba(52,47,41,1) 50%, rgba(44,40,35,0.99) 67%, rgba(38,35,31,0.85) 78%, rgba(38,35,31,0))` }} />
          <svg width={W} height={H} style={{ position: "absolute" }}>
            {Array.from({ length: 260 }, (_, i) => { const y = BAR + hash(i) * PIC, x = cx - core / 2 - 420 + hash(i + 1) * (core + 840) + d * 30 * hash(i + 2), len = 40 + 160 * hash(i + 3);
              return <line key={i} x1={x - len} y1={y} x2={x} y2={y + 6 * (hash(i + 4) - 0.5)} stroke={hash(i + 5) < 0.15 ? "rgba(232,176,75,0.55)" : "rgba(170,162,150,0.5)"} strokeWidth={1 + 2.5 * hash(i + 6)} />; })}
          </svg>
        </AbsoluteFill>
      );
    }
    if (tr.kind === "rain" && Math.abs(d) < 16) {
      const k = 1 - Math.abs(d) / 16, kk = smooth(k);
      return (
        <AbsoluteFill style={{ opacity: kk }}>
          <AbsoluteFill style={{ background: `rgba(70,76,84,${0.92 * smooth(clamp01((k - 0.25) / 0.75))})` }} />
          <svg width={W} height={H} style={{ position: "absolute" }}>
            <defs><radialGradient id="drp"><stop offset="0" stopColor="rgba(225,232,242,0.85)" /><stop offset="0.6" stopColor="rgba(160,172,188,0.35)" /><stop offset="1" stopColor="rgba(120,130,145,0)" /></radialGradient></defs>
            {Array.from({ length: 140 }, (_, i) => { const x = hash(i) * W, y = BAR + ((hash(i + 1) * PIC + (hash(i + 2) > 0.6 ? (f % 300) * 6 * hash(i + 3) : 0)) % PIC), r = 4 + 18 * Math.pow(hash(i + 4), 2);
              return <g key={i}>{hash(i + 2) > 0.6 ? <line x1={x} y1={y - 90 * hash(i + 5)} x2={x} y2={y} stroke="rgba(200,210,225,0.25)" strokeWidth={r * 0.5} /> : null}<circle cx={x} cy={y} r={r} fill="url(#drp)" /></g>; })}
          </svg>
        </AbsoluteFill>
      );
    }
  }
  return null;
};
const Lightning: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS, fl = Math.max(...(EV.lightning as number[]).map((l) => (t >= l && t < l + 0.5 ? Math.exp(-(t - l) / 0.1) : 0)));
  return fl > 0.01 ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 25% 40%, rgba(225,235,255,0.9), rgba(200,215,240,0.35) 60%, rgba(200,215,240,0.1))", mixBlendMode: "screen", opacity: 0.45 * fl }} /> : null;
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const pre = smooth((f - CARD_FROM + 18) / 18); if (pre <= 0) return null;
  const k = smooth((f - CARD_FROM) / 14), lk = smooth((f - CARD_FROM - 6) / 20), t = f / FPS;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: BAR, width: W, height: PIC, overflow: "hidden", background: `rgba(4,4,5,${Math.max(pre, k)})` }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 42%, rgba(120,84,30,0.34), rgba(40,28,10,0.12) 45%, rgba(0,0,0,0) 72%)", opacity: k }} />
        {Array.from({ length: 46 }, (_, i) => { const y = PIC - ((hash(i) * (PIC + 60) + (14 + 26 * hash(i + 1)) * t) % (PIC + 60)), s = 3 + 4 * hash(i + 3);
          return <div key={i} style={{ position: "absolute", left: hash(i + 2) * W + 22 * Math.sin(t * 0.5 + i), top: y, width: s, height: s, borderRadius: "50%", background: "#f0c070", boxShadow: "0 0 10px 3px rgba(232,176,75,0.45)", opacity: 0.55 * k * (0.5 + 0.5 * Math.sin(t * 1.7 + i)) }} />; })}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: k }}>
          <Img src={staticFile(LOGO)} style={{ width: 320, height: 320, objectFit: "contain", opacity: lk, filter: "grayscale(1) sepia(1) saturate(2.4) hue-rotate(-6deg) brightness(1.25) contrast(1.1) drop-shadow(0 0 20px rgba(232,176,75,0.4))" }} />
          <div style={{ width: 110, height: 2, background: GOLD, margin: "46px auto 34px", opacity: lk }} />
          {["The dunya is lowly.", "The Hereafter is the foundation."].map((s, i) => (
            <div key={s} style={{ fontFamily: FONT.title, fontWeight: 600, fontSize: 52, lineHeight: 1.3, color: i ? GOLD : "#ECEAE4", textShadow: i ? "0 0 18px rgba(232,176,75,0.4)" : "none", opacity: smooth((f - CARD_FROM - 12 - 14 * i) / 14), textAlign: "center" }}>{s}</div>))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame();
  React.useMemo(() => {
    if (!(getInputProps() as { post?: { pitchReport?: boolean } }).post?.pitchReport) return;
    let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!CHARACTER_SHOTS.has(shotOf(g).kind)) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
    console.log(`PITCH REPORT: steepest downward look on him ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
  }, []);
  if (!ready) return null;
  const ci = CAPS.findIndex((c) => f >= c.from && f < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Lightning f={f} />
      <Transition f={f} />
      <EndCard f={f} />
      {/* the letterbox */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: BAR, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, top: H - BAR, width: W, height: BAR, background: "#000" }} />
      <Grain f={f} />
      <Tags f={f} />
      {ci >= 0 ? <Caption c={CAPS[ci]} f={f} /> : null}
    </AbsoluteFill>
  );
};
void FRAMES;
