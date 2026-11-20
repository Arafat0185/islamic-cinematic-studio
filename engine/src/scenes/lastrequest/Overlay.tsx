// The 2D layer of video 002 "The Last Request" (dark, cold, quiet):
//  - a cold blue-grey tint over everything (with the CSS grade in fxAt: desaturated, grain, a heavy vignette)
//  - the voice part: minimal white captions, word by word on the transcript's timings (geometric capitals, wide
//    tracking), key words in a dim red #E5484D
//  - the recitation: Arabic (Amiri) with the Saheeh International English under it, centred in the TikTok safe zone
//    (760 px wide, centre 40 px left of the middle), slow fades in and out, key words dim red; never over a head
//  - the prayer tracker at 0/5 ("clockSpin"), notifications nobody answers on the phone lying on his mat ("matPhone"),
//    the lightning's cold flash ("No!"), the dark end card (the logo + the credits)
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { applyCam, smooth, clamp01 } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, SHOTS, EV, shotAt, shotOf, pitchAt } from "./timeline";
import TIMING from "../../../../videos/002-the-last-request/timing.json";
import { SET_OFFSET } from "../../story/story";

const W = 1080, H = 1920, RED = "#E5484D", CAP_CX = W / 2 - 40, MAXW = 760;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
const SHADOW = "0 2px 16px rgba(2,4,10,0.95), 0 0 5px rgba(2,4,10,0.8)";
const pcam = new THREE.PerspectiveCamera(45, W / H, 0.1, 600), v3 = new THREE.Vector3();
const toScreen = (f: number, p: [number, number, number]) => { applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix(); v3.set(...p).project(pcam); return { x: ((v3.x + 1) / 2) * W, y: ((1 - v3.y) / 2) * H, behind: v3.z > 1 }; };

// ---------------- the voice: word by word ----------------
type Word = { w: string; start: number; end: number; key: boolean };
const WORDS = TIMING.voice as Word[];
/** the voice in chunks (a chunk ends after a word ending in . , ? and is shown until the next chunk starts) */
const CHUNKS = (() => {
  const out: Word[][] = []; let cur: Word[] = [];
  for (const w of WORDS) { cur.push(w); if (/[.,?!]$/.test(w.w) && cur.length >= 2) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out;
})();
const VoiceCaption: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const ci = CHUNKS.findIndex((c, i) => t >= c[0].start - 0.05 && (i + 1 >= CHUNKS.length ? t < c[c.length - 1].end + 1.2 : t < CHUNKS[i + 1][0].start - 0.05));
  if (ci < 0 || t > TIMING.voiceEnd) return null;
  const c = CHUNKS[ci], last = c[c.length - 1], out = ci + 1 >= CHUNKS.length ? 1 - smooth((t - last.end - 0.6) / 0.6) : 1 - smooth((t - CHUNKS[ci + 1][0].start + 0.2) / 0.15);
  return (
    <div style={{ position: "absolute", left: CAP_CX - MAXW / 2, width: MAXW, top: H * 0.72, transform: "translateY(-50%)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 18px", opacity: out }}>
      {c.map((w, i) => {
        const k = smooth((t - w.start + 0.04) / 0.16);
        return (
          <span key={i} style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 52, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.2,
            color: w.key ? RED : "#F2F2EE", textShadow: SHADOW, opacity: k, transform: `translateY(${(1 - k) * 10}px)`, filter: `blur(${(1 - k) * 4}px)` }}>{w.w}</span>
        );
      })}
    </div>
  );
};

// ---------------- the recitation captions ----------------
type Phrase = { i: number; verse: string; ar: string; arKeys: number[]; en: string; keys: string[]; start: number; end: number };
const PH = (TIMING.phrases as Phrase[]).map((p) => ({ ...p, from: F(p.start), to: Math.min(F(p.end), CARD_FROM) }));
const AR_SIZE = 84, AR_LH = 1.6, EN_SIZE = 38, EN_LH = 1.32, GAP = 24;
const lines = (text: string, font: string) => { let n = 1, cur = ""; for (const w of text.split(" ")) { const tt = cur ? cur + " " + w : w; if (measure(tt, font) > MAXW && cur) { n++; cur = w; } else cur = tt; } return n; };
const half = (p: Phrase) => (lines(p.ar, `700 ${AR_SIZE}px ${FONT.arabic}`) * AR_SIZE * AR_LH + GAP + lines(p.en, `600 ${EN_SIZE}px ${FONT.caption}`) * EN_SIZE * EN_LH) / H / 2;
/** heads on screen (the Traveller and everyone else) over [a, b): boxes in frame fractions */
const heads = (a: number, b: number) => {
  const boxes: { y0: number; y1: number; x0: number; x1: number }[] = [];
  for (let f = a; f < b; f += 4) {
    const s = shotAt(f), pts: [number, number, number][] = [];
    if (s.frame.traveller && s.head[1] > -1) pts.push(s.head);
    for (const o of s.frame.others ?? []) if (!o.key.startsWith("cat") && !o.key.startsWith("pigeon")) pts.push([o.pos[0], o.pos[1] + (o.key.startsWith("stoop") ? 1.3 : 1.78), o.pos[2]]);
    for (const p of pts) { const lo = toScreen(f, [p[0], p[1] - 0.3, p[2]]), hi = toScreen(f, [p[0], p[1] + 0.2, p[2]]); if (lo.behind) continue; boxes.push({ y0: hi.y / H, y1: lo.y / H, x0: (lo.x - 70) / W, x1: (lo.x + 70) / W }); }
  }
  return boxes;
};
const placeOf = (p: Phrase & { from: number; to: number }) => {
  const h = half(p), bx = heads(p.from, p.to), X0 = (CAP_CX - MAXW / 2) / W, X1 = (CAP_CX + MAXW / 2) / W;
  const cost = (c: number) => bx.reduce((s, b) => s + Math.max(0, Math.min(c + h + 0.02, b.y1) - Math.max(c - h - 0.02, b.y0)) * Math.max(0, Math.min(X1, b.x1) - Math.max(X0, b.x0)), 0);
  const C = [0.72, 0.68, 0.76, 0.32, 0.36, 0.5].filter((c) => c - h >= 0.24 && c + h <= 0.86);
  return C.find((c) => cost(c) === 0) ?? C.sort((x, y) => cost(x) - cost(y))[0];
};
const enParts = (en: string, keys: string[]) => {
  const marks: [number, number][] = []; for (const k of keys) { const i = en.indexOf(k); if (i >= 0) marks.push([i, i + k.length]); }
  marks.sort((a, b) => a[0] - b[0]); const out: { s: string; key: boolean }[] = []; let at = 0;
  for (const [a, b] of marks) { if (a > at) out.push({ s: en.slice(at, a), key: false }); out.push({ s: en.slice(a, b), key: true }); at = b; }
  if (at < en.length) out.push({ s: en.slice(at), key: false }); return out;
};
const RecCaption: React.FC<{ p: (typeof PH)[number]; f: number; y: number }> = ({ p, f, y }) => {
  const k = Math.min(smooth((f - p.from) / 14), 1 - smooth((f - p.to + 12) / 12)), ke = Math.min(smooth((f - p.from - 8) / 16), 1 - smooth((f - p.to + 12) / 12));
  const words = p.ar.split(" "), red = { color: RED, textShadow: `0 0 10px rgba(229,72,77,0.35), ${SHADOW}` };
  return (
    <div style={{ position: "absolute", left: CAP_CX - MAXW / 2, width: MAXW, top: H * y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: GAP }}>
      <div style={{ position: "absolute", left: -(CAP_CX - MAXW / 2), width: W, top: -80, bottom: -80, background: "linear-gradient(rgba(4,6,12,0), rgba(4,6,12,0.55) 30%, rgba(4,6,12,0.55) 70%, rgba(4,6,12,0))", opacity: k }} />
      <div dir="rtl" lang="ar" style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: AR_SIZE, lineHeight: AR_LH, color: "#EDEBE6", textShadow: SHADOW, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
        {words.map((w, i) => <React.Fragment key={i}>{p.arKeys.includes(i) ? <span style={red}>{w}</span> : w}{i < words.length - 1 ? " " : ""}</React.Fragment>)}
      </div>
      <div style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: EN_SIZE, lineHeight: EN_LH, color: "#D9D9D4", textShadow: SHADOW, opacity: ke }}>
        {enParts(p.en, p.keys).map((x, i) => (x.key ? <span key={i} style={red}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};
const VerseTag: React.FC<{ f: number }> = ({ f }) => {
  const p = PH.find((x) => f >= x.from && f < x.to); if (!p) return null;
  const k = smooth((f - F(TIMING.recStart)) / 20) * (1 - smooth((f - CARD_FROM + 20) / 20));
  return <div style={{ position: "absolute", left: 56, top: 176, opacity: 0.85 * k, fontFamily: FONT.caption, fontWeight: 700, fontSize: 24, letterSpacing: "0.2em", color: "#cfcfca", border: "1.5px solid rgba(229,72,77,0.6)", borderRadius: 999, padding: "8px 20px", background: "rgba(10,12,18,0.6)" }}>AL-MUNAFIQUN {p.verse}</div>;
};

// ---------------- the tracker at 0/5, the phone nobody answers, the lightning ----------------
const span = (k: string) => SHOTS.find((s) => s.kind === k);
const Tracker0: React.FC<{ f: number }> = ({ f }) => {
  const s = [span("clockSpin"), span("trackerRoom")].find((x) => x && f >= x.from && f < x.to); if (!s) return null;
  const k = Math.min(smooth((f - s.from) / 10), 1 - smooth((f - s.to + 10) / 10));
  return (
    <div style={{ position: "absolute", left: W / 2, top: 400, transform: "translate(-50%, -50%)", opacity: k, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 30px", borderRadius: 26, background: "rgba(18,20,26,0.82)", border: "1.5px solid rgba(229,72,77,0.55)" }}>
      <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 20, letterSpacing: "0.2em", color: "#cfcfca" }}>TODAY · 0 / 5</div>
      <div style={{ display: "flex", gap: 44 }}>
        {["FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA"].map((n) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", border: "4px solid rgba(200,200,200,0.28)", background: "rgba(255,255,255,0.03)" }} />
            <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 14, letterSpacing: "0.12em", color: "rgba(220,220,215,0.5)" }}>{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
const NOTES = ["12 missed calls", "Mum: are you awake?", "New message", "Are you okay?", "Missed call"];
const MatNotes: React.FC<{ f: number }> = ({ f }) => {
  const s = span("matPhone"); if (!s || f < s.from || f >= s.to + 6) return null;
  const tt = (f - s.from) / FPS, ph = toScreen(f, [SET_OFFSET.bedroom[0] + 1.12, 0.04, 0.3]);
  const out = 1 - smooth((f - s.to) / 6);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {[0.15, 0.95, 1.6].map((d, i) => {
        const x = tt - d; if (x < 0) return null;
        const k = smooth(x / 0.25) * (1 - 0.55 * smooth((x - 0.8) / 0.6));
        return <div key={i} style={{ position: "absolute", left: Math.min(W - 420, Math.max(60, ph.x - 170)), top: ph.y - 140 - i * 64, width: 340, opacity: 0.8 * k, transform: `scale(${0.85 + 0.15 * smooth(x / 0.25)})`,
          display: "flex", alignItems: "center", gap: 12, background: "rgba(225,228,234,0.82)", borderRadius: 18, padding: "10px 14px", fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, color: "#20242c" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: ["#5a6a80", "#7a5050", "#5a6a80"][i] }} />{NOTES[i]}</div>;
      })}
    </AbsoluteFill>
  );
};
const WORK = ["Meeting moved to 08:00", "Q4 targets - urgent", "Invoice #2291 paid", "Bonus approved", "12 unread emails"];
const WorkNotes: React.FC<{ f: number }> = ({ f }) => {
  const a = span("laptopBank"); if (!a) return null; const b = span("laptopClose") ?? a; if (f < a.from || f >= b.to) return null;
  const tt = (f - a.from) / FPS, k = 1 - smooth((f - b.to + 8) / 8);
  return (
    <AbsoluteFill style={{ opacity: k }}>
      {WORK.map((n, i) => {
        const x = tt - 0.15 - i * 0.38; if (x < 0) return null;
        const s2 = Math.min(i, WORK.length) , kk = smooth(x / 0.3) * 1;
        return <div key={n} style={{ position: "absolute", right: 150, top: 470 + ((i % 3) * 78) - Math.floor(i / 3) * 30, width: 360, opacity: 0.85 * kk, transform: `translateX(${(1 - smooth(x / 0.3)) * 40}px)`,
          display: "flex", alignItems: "center", gap: 12, background: "rgba(225,228,234,0.86)", borderRadius: 18, padding: "10px 14px", fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, color: "#20242c" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: ["#4a6a96", "#8a5a3a", "#3f7a5a", "#4a6a96", "#6a5a8a"][i] }} />{n}{void s2}</div>;
      })}
    </AbsoluteFill>
  );
};
const Lightning: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = EV.lightning, p = (x: number) => (x >= 0 && x < 6 ? Math.exp(-x / 1.8) : 0), k = Math.max(p(f - a), 0.7 * p(f - b));
  return k > 0.01 ? <AbsoluteFill style={{ background: "radial-gradient(circle at 60% 30%, rgba(210,225,255,1), rgba(150,170,210,0.4) 50%, rgba(0,0,0,0) 85%)", opacity: 0.5 * k, mixBlendMode: "screen" }} /> : null;
};

// ---------------- the end card ----------------
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const pre = smooth((f - CARD_FROM + 30) / 30);                                    // the last shot sinks into darkness first
  if (pre <= 0) return null;
  const k = smooth((f - CARD_FROM) / 24), lk = smooth((f - CARD_FROM - 8) / 20);
  const line = (s: string, i: number) => <div key={s} style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 34, lineHeight: 1.55, color: "#c9c9c4", opacity: smooth((f - CARD_FROM - 16 - 4 * i) / 12) }}>{s}</div>;
  return (
    <AbsoluteFill style={{ background: `rgba(6,7,10,${Math.max(0.85 * pre, k)})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <Img src={staticFile(LOGO)} style={{ width: 400, height: 400, objectFit: "contain", opacity: 0.75 * lk, filter: "grayscale(0.75) brightness(0.8)" }} />
        <div style={{ height: 60 }} />
        <div style={{ width: 110, height: 2, background: "rgba(229,72,77,0.7)", margin: "0 auto 30px", opacity: lk }} />
        <div style={{ textAlign: "center" }}>{[`Quran ${TIMING.range}`, `Recitation: ${TIMING.reciter}`, `Translation: ${TIMING.translation}`].map(line)}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- the whole layer ----------------
export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame();
  const ys = useMemo(() => {
    if (!ready) return [] as number[];
    const y = PH.map(placeOf);
    const post = (getInputProps() as { post?: { pitchReport?: boolean; camReport?: boolean } }).post;
    if (post?.pitchReport || post?.camReport) {
      PH.forEach((p, i) => console.log(`TEXT LAYOUT: ${p.i} ${p.verse} ${p.from}-${p.to} @${y[i].toFixed(2)} half ${half(p).toFixed(3)}`));
      let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
    }
    return y;
  }, [ready]);
  if (!ready) return null;
  const pi = PH.findIndex((p) => f >= p.from && f < p.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "#24344c", mixBlendMode: "soft-light", opacity: 0.55 }} />
      <AbsoluteFill style={{ background: "#2a3446", mixBlendMode: "color", opacity: 0.22 }} />
      <Lightning f={f} />
      <MatNotes f={f} />
      <WorkNotes f={f} />
      <Tracker0 f={f} />
      <VoiceCaption f={f} />
      {pi >= 0 ? <RecCaption p={PH[pi]} f={f} y={ys[pi]} /> : null}
      <VerseTag f={f} />
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
void clamp01;
