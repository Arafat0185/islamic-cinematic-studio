// The 2D layer of "The First Question - QURAN" (channel brand: brown #4D312C, orange #FB5606, white):
//  - the recitation captions: Arabic (Amiri, large, centred) with the Saheeh International translation below (Inter,
//    smaller). Text verbatim from quran/timing.json (built from the saved quran.com responses). Key words in orange.
//    Each caption pops in with a soft scale + blur reveal just as its phrase starts and stays until the next one; it is
//    placed so it never covers the Traveller's head (checked against his projected head every 3rd frame of the shot).
//  - the verse tag in the top-left corner ("MARYAM 19:59"), changing with the verse
//  - the prayer tracker: five dots dimming one by one while the day goes on; at takbir the Fajr dot glows orange
//  - the phone turned face-down (bedroom); the end card (the channel logo + the credits), crossfading in over the last
//    1.5 s while the last caption and the verse tag fade out
// Pitch report (render a still with --props='{"post":{"pitchReport":true}}' --log=verbose): the steepest downward look.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { applyCam, smooth, clamp01 } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { F, FPS, FRAMES, CARD_FROM, REC_END, PHRASES, Phrase, EV, SHOTS, shotAt, shotOf, pitchAt } from "./timeline";
import TIMING from "../../../../videos/001-the-first-question/quran/timing.json";

const W = 1080, H = 1920;
export const BRAND = { brown: "#4D312C", orange: "#FB5606", white: "#FFFFFF" };
const PANEL = "rgba(77,49,44,0.85)";
const LOGO = "brand/logo/traveller_logo_transparent.svg";

// ---------------- projection ----------------
const pcam = new THREE.PerspectiveCamera(45, W / H, 0.1, 600), v = new THREE.Vector3();
const toScreen = (f: number, p: [number, number, number]) => {
  applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix();
  v.set(...p).project(pcam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, behind: v.z > 1 };
};

// ---------------- caption layout ----------------
// the caption safe zone: 760 px wide, its centre 40 px left of the middle (clear of TikTok's buttons on the right)
const AR_SIZE = 88, AR_LH = 1.62, EN_SIZE = 40, EN_LH = 1.3, MAXW = 760, GAP = 26, CAP_CX = W / 2 - 40;
const arFont = `700 ${AR_SIZE}px ${FONT.arabic}`, enFont = `600 ${EN_SIZE}px ${FONT.caption}`;
/** greedy line breaking (the browser breaks the same way within the same width) */
const lineCount = (text: string, font: string, maxw: number) => {
  let n = 1, cur = "";
  for (const w of text.split(" ")) { const t = cur ? cur + " " + w : w; if (measure(t, font) > maxw && cur) { n++; cur = w; } else cur = t; }
  return n;
};
const blockHeight = (p: Phrase) => lineCount(p.ar, arFont, MAXW) * AR_SIZE * AR_LH + GAP + lineCount(p.en, enFont, MAXW) * EN_SIZE * EN_LH;

/** his head (and neck) on screen over frames [from, to): fractions of the frame, only what is inside it */
const headRange = (from: number, to: number) => {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (let f = from; f < to; f += 3) {
    const s = shotAt(f), tr = s.frame.traveller;
    if (!tr) continue;
    const c = s.frame.plan.cam, right = new THREE.Vector3(...c.look).sub(new THREE.Vector3(...c.pos)).cross(new THREE.Vector3(0, 1, 0)).setY(0).normalize();
    // sitting poses (bed edge, office chair): the head is lower; the "head" point given by the shot covers it
    const top = s.head[1] + (tr.wide ? 0.1 : 0.17), bottom = s.head[1] - 0.42;
    for (const h of [bottom, (bottom + top) / 2, top]) for (const k of [-0.22, 0, 0.22]) {
      const qq = toScreen(f, [s.head[0] + right.x * k, h, s.head[2] + right.z * k]);
      if (qq.behind || qq.x < 0 || qq.x > W || qq.y < 0 || qq.y > H) continue;
      y0 = Math.min(y0, qq.y / H); y1 = Math.max(y1, qq.y / H); x0 = Math.min(x0, qq.x / W); x1 = Math.max(x1, qq.x / W);
    }
  }
  return { y0, y1, x0, x1 };
};
const CANDIDATES = [0.5, 0.57, 0.43, 0.64, 0.7, 0.36, 0.76];
/** shots that show something below his head that the caption must not hide: try these first */
const PREFER: Record<string, number[]> = {};
const SAFE_TOP = 0.2, SAFE_BOT = 0.86;
/** the caption's centre (fraction of the frame height): as central as possible, never over his head */
const placeCaption = (p: Phrase) => {
  const half = blockHeight(p) / H / 2;
  if (shotOf(p.from).kind === "phoneDown" || shotOf(p.from + 6).kind === "phoneDown") return Math.min(SAFE_BOT - half, 0.8);
  const { y0, y1 } = headRange(p.from, p.to), M = 0.025;
  for (const c of [...(PREFER[shotOf(p.from + 6).kind] ?? []), ...CANDIDATES]) {
    if (c - half < SAFE_TOP || c + half > SAFE_BOT) continue;
    if (!isFinite(y0) || c + half < y0 - M || c - half > y1 + M) return c;
  }
  // nothing fits cleanly: the candidate farthest from the head
  return CANDIDATES.filter((c) => c - half >= SAFE_TOP && c + half <= SAFE_BOT).sort((a, b) => Math.abs(b - (y0 + y1) / 2) - Math.abs(a - (y0 + y1) / 2))[0];
};

// ---------------- captions ----------------
const reveal = (d: number) => { const k = clamp01(d / 10); const e = 1 - (1 - k) ** 3; return { e, sc: 0.9 + 0.1 * e + 0.025 * Math.sin(Math.PI * k), blur: 14 * (1 - e) }; };
const SHADOW = "0 2px 14px rgba(6,8,20,0.9), 0 0 4px rgba(6,8,20,0.75)";
const keySpan = (k: number, f: number, at: number) => {
  const d = f - at, g = d < 0 ? 0 : d < 6 ? d / 6 : Math.max(0, 1 - (d - 6) / 24);
  return { color: BRAND.orange, textShadow: `0 0 ${6 + 18 * g * k}px rgba(251,86,6,${0.35 + 0.4 * g * k}), ${SHADOW}` };
};
/** the English with its key words in orange (exact substrings of the translation) */
const englishParts = (en: string, keys: string[]) => {
  const marks: [number, number][] = [];
  for (const k of keys) { const i = en.indexOf(k); if (i >= 0) marks.push([i, i + k.length]); }
  marks.sort((a, b) => a[0] - b[0]);
  const out: { s: string; key: boolean }[] = []; let at = 0;
  for (const [a, b] of marks) { if (a > at) out.push({ s: en.slice(at, a), key: false }); out.push({ s: en.slice(a, b), key: true }); at = b; }
  if (at < en.length) out.push({ s: en.slice(at), key: false });
  return out;
};
/** 0..1: the end card's crossfade (the last caption and the tag fade out under it) */
const cardK = (f: number) => smooth((f - CARD_FROM) / 24);
const Caption: React.FC<{ p: Phrase; f: number; y: number }> = ({ p, f, y }) => {
  const d = f - p.from, out = 1 - cardK(f);
  const ra = reveal(d), re = reveal(d - 4);
  const words = p.ar.split(" ");
  return (
    <div style={{ position: "absolute", left: CAP_CX - MAXW / 2, width: MAXW, top: H * y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: GAP, opacity: out }}>
      {/* behind the text the busy background is softened (blurred and dimmed, fading out at the edges), so it reads easily */}
      <div style={{ position: "absolute", left: -(CAP_CX - MAXW / 2), width: W, top: -90, bottom: -90, backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)",
        background: "linear-gradient(rgba(8,10,26,0), rgba(8,10,26,0.34) 30%, rgba(8,10,26,0.34) 70%, rgba(8,10,26,0))",
        maskImage: "linear-gradient(rgba(0,0,0,0), #000 28%, #000 72%, rgba(0,0,0,0))", WebkitMaskImage: "linear-gradient(rgba(0,0,0,0), #000 28%, #000 72%, rgba(0,0,0,0))", opacity: ra.e }} />
      <div style={{ position: "absolute", left: -40, right: -40, top: -40, bottom: -40, borderRadius: 120, background: "radial-gradient(ellipse at center, rgba(8,10,26,0.45) 0%, rgba(8,10,26,0.25) 55%, rgba(8,10,26,0) 75%)", opacity: ra.e, filter: "blur(18px)" }} />
      <div dir="rtl" lang="ar" style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.arabic, fontWeight: 700, fontSize: AR_SIZE, lineHeight: AR_LH,
        color: "#FBF6EC", textShadow: SHADOW, opacity: Math.min(1, ra.e * 1.4), transform: `scale(${ra.sc})`, filter: `blur(${ra.blur.toFixed(1)}px)` }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>{p.arKeys.includes(i) ? <span style={keySpan(1, f, p.from + 4)}>{w}</span> : w}{i < words.length - 1 ? " " : ""}</React.Fragment>
        ))}
      </div>
      <div style={{ position: "relative", maxWidth: MAXW, textAlign: "center", fontFamily: FONT.caption, fontWeight: 600, fontSize: EN_SIZE, lineHeight: EN_LH,
        color: BRAND.white, textShadow: SHADOW, opacity: Math.min(1, re.e * 1.4), transform: `scale(${re.sc})`, filter: `blur(${(re.blur * 0.7).toFixed(1)}px)` }}>
        {englishParts(p.en, p.keys).map((x, i) => (x.key ? <span key={i} style={keySpan(0.8, f, p.from + 8)}>{x.s}</span> : <React.Fragment key={i}>{x.s}</React.Fragment>))}
      </div>
    </div>
  );
};

// ---------------- the verse tag ----------------
const VerseTag: React.FC<{ f: number }> = ({ f }) => {
  const p = PHRASES.find((x) => f >= x.from && f < x.to);
  if (!p) return null;
  const first = PHRASES.find((x) => x.verse === p.verse)!, d = f - first.from, e = reveal(d);
  const fade = 1 - cardK(f);
  return (
    <div style={{ position: "absolute", left: 56, top: 176, opacity: Math.min(1, e.e * 1.3) * fade, transform: `scale(${e.sc})`, transformOrigin: "left center", filter: `blur(${(e.blur * 0.5).toFixed(1)}px)` }}>
      <span style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 25, letterSpacing: "0.18em", color: BRAND.white, background: PANEL, border: `2px solid ${BRAND.orange}`, borderRadius: 999, padding: "9px 22px" }}>
        {TIMING.surah} {p.verse}
      </span>
    </div>
  );
};

// ---------------- the prayer tracker ----------------
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const DOT_R = 26, DOT_SPACING = 120, TRACK_Y = 372;
const TRACK_A = { on: F(0.35), off: PHRASES[3].from - 10 }, TRACK_B = { on: EV.takbir + 6, off: PHRASES[6].from - 10 };
const Tracker: React.FC<{ f: number }> = ({ f }) => {
  const inA = f >= TRACK_A.on && f < TRACK_A.off + 10, inB = f >= TRACK_B.on && f < TRACK_B.off + 10;
  if (!inA && !inB) return null;
  const r = inA ? TRACK_A : TRACK_B, k = Math.min(smooth((f - r.on) / 10), 1 - smooth((f - r.off) / 10));
  return (
    <div style={{ position: "absolute", left: W / 2, top: TRACK_Y, transform: `translate(-50%, -50%) scale(${0.94 + 0.06 * k})`, opacity: k }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 30px 14px", borderRadius: 28, background: PANEL, border: `2px solid ${BRAND.orange}`, boxShadow: "0 8px 30px rgba(20,8,4,0.45)" }}>
        <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 20, letterSpacing: "0.2em", color: BRAND.white, background: inB ? BRAND.orange : "rgba(255,255,255,0.14)", padding: "5px 14px", borderRadius: 999 }}>
          {inB ? "FAJR" : "TODAY"}</div>
        <div style={{ display: "flex", gap: DOT_SPACING - DOT_R * 2 }}>
          {PRAYERS.map((name, i) => {
            // A: lit (white) when the day starts, then dimmed one by one; B: all dim, then Fajr glows orange
            const dim = inA ? smooth((f - EV.dims[i]) / 8) : 1, glowK = inB && i === 0 ? smooth((f - EV.fajrGlow) / 8) : 0;
            const pop = inB && i === 0 ? Math.max(0, 1 - Math.abs(f - EV.fajrGlow - 4) / 6) : inA ? Math.max(0, 1 - Math.abs(f - EV.dims[i] - 2) / 5) * 0.4 : 0;
            const lit = 1 - dim;
            const fill = glowK > 0 ? `rgba(251,86,6,${0.25 + 0.75 * glowK})` : `rgba(255,255,255,${0.06 + 0.5 * lit})`;
            const ring = glowK > 0 ? `rgba(255,210,184,${0.5 + 0.5 * glowK})` : `rgba(255,255,255,${0.28 + 0.6 * lit})`;
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: DOT_R * 2, height: DOT_R * 2, borderRadius: "50%", background: fill, border: `5px solid ${ring}`, boxSizing: "border-box", transform: `scale(${1 + 0.18 * pop})`,
                  boxShadow: glowK > 0 ? `0 0 ${14 + 26 * glowK}px rgba(251,86,6,${0.85 * glowK})` : lit > 0.05 ? `0 0 ${12 * lit}px rgba(255,255,255,${0.45 * lit})` : "none" }} />
                <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", color: `rgba(255,255,255,${0.55 + 0.4 * Math.max(lit, glowK)})` }}>{name.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------- the phone turned face-down ----------------
const PhoneDown: React.FC<{ f: number }> = ({ f }) => {
  const s = SHOTS.find((x) => x.kind === "phoneDown")!;
  if (f < s.from || f >= s.to) return null;
  const inK = smooth((f - s.from) / 9), flip = smooth((f - EV.flip) / 14), settleK = smooth((f - EV.flip - 10) / 12);
  const ang = 180 * flip, faceUp = ang < 90, t = (f - s.from) / FPS;
  const dim = 0.25 + 0.45 * settleK;                                      // the room goes darker once the screen is down
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: `rgba(6,9,22,${dim * inK})` }} />
      <div style={{ position: "absolute", left: 540, top: 760, width: 500, height: 1000, perspective: 1600,
        transform: `translate(-50%, -50%) translateY(${(1 - inK) * 120 + 70 * settleK}px) scale(${0.96 + 0.04 * inK - 0.08 * settleK}) rotateZ(${-4 + 3 * flip}deg)`, opacity: inK }}>
        <div style={{ position: "absolute", inset: 0, transform: `rotateY(${ang}deg) rotateX(${12 * settleK}deg)`, transformStyle: "preserve-3d" }}>
          {faceUp ? (
            <div style={{ position: "absolute", inset: 0, borderRadius: 70, background: "#14161c", border: "7px solid #241726", boxShadow: `0 0 ${90 * (1 - flip)}px rgba(150,180,255,0.45), 0 30px 60px rgba(0,0,0,0.6)` }}>
              <div style={{ position: "absolute", left: 22, top: 22, right: 22, bottom: 22, borderRadius: 52, overflow: "hidden", background: "linear-gradient(#1d2442, #2a2346)" }}>
                <div style={{ marginTop: 120, textAlign: "center", fontFamily: FONT.caption, fontWeight: 300, fontSize: 120, color: "#fff", letterSpacing: "-0.02em" }}>05:12</div>
                {["12 notifications", "+48 likes", "New message"].map((x, i) => (
                  <div key={x} style={{ margin: "26px 22px 0", display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.92)", borderRadius: 26, padding: "18px 20px",
                    fontFamily: FONT.caption, fontWeight: 700, fontSize: 26, color: "#141824", opacity: clamp01((t - 0.1 - i * 0.12) / 0.15) }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: [BRAND.orange, "#3a7be0", "#7a5ad6"][i] }} />{x}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, borderRadius: 70, background: "linear-gradient(160deg, #5a3a31, #3a241f)", border: "7px solid #241726", transform: "scaleX(-1)", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ position: "absolute", left: 40, top: 40, width: 150, height: 150, borderRadius: 40, background: "#2b1c18", border: "5px solid #241726" }} />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- the busy opening: rain on the lens, notifications piling up around him ----------------
const STREET_SHOT = SHOTS.find((x) => x.kind === "street")!;
const RAIN_DROPS = (() => {
  let sd = 31; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  return Array.from({ length: 18 }, () => {
    const top = r() < 0.72, y = top ? 0.04 + 0.36 * r() : 0.84 + 0.12 * r();
    return { x: 0.03 + 0.94 * r(), y, r: 9 + 22 * r(), at: r() * 3.2, slide: r() < 0.3 ? 0.012 + 0.02 * r() : 0 };
  });
})();
const LensRain: React.FC<{ f: number }> = ({ f }) => {
  if (f >= STREET_SHOT.to) return null;
  const t = f / FPS, out = 1 - smooth((f - STREET_SHOT.to + 8) / 8);
  return (
    <AbsoluteFill>
      {RAIN_DROPS.map((d, i) => {
        const k = smooth((t - d.at) / 0.25) * out;
        if (k <= 0) return null;
        const y = (d.y + d.slide * Math.max(0, t - d.at)) * H, rr = d.r * (1 + 0.15 * smooth((t - d.at) / 0.25));
        return <div key={i} style={{ position: "absolute", left: d.x * W - rr, top: y - rr, width: rr * 2, height: rr * 2.15, borderRadius: "50% 50% 48% 48%", opacity: 0.75 * k,
          backdropFilter: "blur(2.5px) brightness(1.12)", WebkitBackdropFilter: "blur(2.5px) brightness(1.12)",
          background: "radial-gradient(circle at 50% 70%, rgba(255,255,255,0) 45%, rgba(220,232,255,0.28) 64%, rgba(255,255,255,0) 74%), radial-gradient(circle at 38% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 18%)" }} />;
      })}
    </AbsoluteFill>
  );
};
const NOTES: { at: number; txt: string; c: string }[] = [
  { at: 0.45, txt: "12 new messages", c: "#3a7be0" }, { at: 1.05, txt: "+48 likes", c: "#e0445a" }, { at: 1.65, txt: "Asr · prayer time", c: "#3FB37F" },
  { at: 2.2, txt: "Live now", c: "#7a5ad6" }, { at: 2.8, txt: "Sale ends tonight", c: BRAND.orange }, { at: 3.4, txt: "You were mentioned", c: "#3a7be0" },
];
const Notifications: React.FC<{ f: number }> = ({ f }) => {
  if (f >= STREET_SHOT.to) return null;
  const t = f / FPS, out = 1 - smooth((f - STREET_SHOT.to + 14) / 12), sh = shotAt(f), hd = toScreen(f, sh.head);
  const right = hd.x < W * 0.55, left0 = right ? hd.x + 95 : hd.x - 95 - 310;
  const shown = NOTES.filter((n) => t >= n.at), bottom = Math.min(860, hd.y + 70);
  return (
    <AbsoluteFill>
      {shown.map((n, i) => {
        const slot = shown.length - 1 - i, d = (t - n.at) * FPS, pop = clamp01(d / 8), sc = 0.55 + 0.45 * pop + 0.06 * Math.sin(Math.PI * pop);
        const yTarget = bottom - slot * 70, y = yTarget + (1 - pop) * 40, k = Math.min(pop, 1 - smooth(slot - 2.6)) * out;
        if (k <= 0.01 || y < 470) return null;
        return (
          <div key={n.txt} style={{ position: "absolute", left: left0, top: y, width: 310, transform: `scale(${sc})`, transformOrigin: right ? "left center" : "right center", opacity: 0.88 * k,
            display: "flex", alignItems: "center", gap: 12, background: "rgba(246,247,250,0.9)", borderRadius: 20, padding: "10px 14px", boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            fontFamily: FONT.caption, fontWeight: 700, fontSize: 21, color: "#141824" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: n.c, flex: "none" }} />{n.txt}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- the warning: the light slowly dying around him ----------------
const VOID_SHOT = SHOTS.find((x) => x.kind === "void")!;
const VoidDim: React.FC<{ f: number }> = ({ f }) => {
  if (f < VOID_SHOT.from || f >= VOID_SHOT.to) return null;
  const u = smooth((f - VOID_SHOT.from) / (VOID_SHOT.to - VOID_SHOT.from - 7)), k = u * (1 - smooth((f - VOID_SHOT.to + 9) / 9));
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 62% 48% at 50% 46%, rgba(2,3,8,0) 30%, rgba(2,3,8,${(0.62 * k).toFixed(3)}) 100%)` }} />;
};

// ---------------- the end card ----------------
// crossfades in over the last 1.5 s: the brown panel (0.8 s), the logo, then the credit line one part per row; all
// fully visible for the last ~0.5 s
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < CARD_FROM) return null;
  const a = CARD_FROM, k = cardK(f), lk = smooth((f - a - 5) / 16);
  const line = (s: string, i: number) => (
    <div key={s} style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 38, lineHeight: 1.5, color: BRAND.white, opacity: smooth((f - a - 12 - 3 * i) / 9) }}>{s}</div>
  );
  return (
    <AbsoluteFill style={{ background: `rgba(77,49,44,${0.96 * k})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <Img src={staticFile(LOGO)} style={{ width: 480, height: 480, objectFit: "contain", opacity: lk, transform: `scale(${0.94 + 0.06 * lk})` }} />
        <div style={{ height: 70 }} />
        <div style={{ width: 120, height: 3, background: BRAND.orange, margin: "0 auto 34px", opacity: lk }} />
        <div style={{ textAlign: "center" }}>
          {/* "Recitation: Sheikh Yasser Al-Dossari · Surat Maryam 19:59-63 · Translation: Saheeh International", one part per row */}
          {[`Recitation: ${TIMING.reciter}`, `Surat ${TIMING.surah[0] + TIMING.surah.slice(1).toLowerCase()} ${TIMING.range}`, "Translation: Saheeh International"].map(line)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- the whole layer ----------------
export const Overlay: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const ys = useMemo(() => {
    if (!ready) return [] as number[];
    const y = PHRASES.map(placeCaption);
    const post = (getInputProps() as { post?: { pitchReport?: boolean; camReport?: boolean } }).post;
    if (post?.pitchReport || post?.camReport) {
      PHRASES.forEach((p, i) => console.log(`TEXT LAYOUT: ${p.i} ${p.verse} frames ${p.from}-${p.to} centre ${y[i].toFixed(2)} half ${(blockHeight(p) / H / 2).toFixed(3)} head ${JSON.stringify(headRange(p.from, p.to))}`));
      let worst = -90, at = 0;
      for (let g = 0; g < FRAMES; g++) { const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
      console.log(`PITCH REPORT: steepest downward look ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
    }
    return y;
  }, [ready]);
  if (!ready) return null;
  const pi = PHRASES.findIndex((p) => f >= p.from && f < p.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <VoidDim f={f} />
      <LensRain f={f} />
      <Notifications f={f} />
      <PhoneDown f={f} />
      <Tracker f={f} />
      {pi >= 0 ? <Caption p={PHRASES[pi]} f={f} y={ys[pi]} /> : null}
      <VerseTag f={f} />
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
