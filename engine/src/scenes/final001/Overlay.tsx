// The 2D layer of video 001's final version (Maktabatu Al-Ilm brand: brown #4D312C, orange #FB5606, white):
//  - kinetic captions: each phrase punches in; keywords pop (to ~115 %, then settle) in orange with a glow (warnings red,
//    good actions green); the biggest words (first, lost, merciful, next one) slam in. Placed clear of his head and
//    upper body and of the tracker.
//  - the prayer tracker (brown panel, orange accents): a clock that runs the time-lapse continuously and five dots that
//    light up, crack (red) when a prayer is let go, light orange when one is prayed, and are mended by the mercy
//  - pop-outs: coins, papers, notification bubbles, sticky notes, boarding passes flying at the lens and past the frame
//  - shockwave rings on the impacts; the giant FIRST; the phone flooded with pings; the hadith's source tag; the end
//    card with the source (the channel logo is left off until the new one is ready)
// All timing from final/plan.json via timeline.ts.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { applyCam, smooth, clamp01 } from "../../camera/ease";
import { FONT, measure, useFonts } from "../../text/fonts";
import { A, F, FPS, WORDS, shotAt, shotOf, minutesAt, Word } from "./timeline";
import PLAN from "../../../../videos/001-the-first-question/final/plan.json";

const W = 1080, H = 1920;
export const BRAND = { brown: "#4D312C", orange: "#FB5606", white: "#FFFFFF", red: "#E5484D", green: "#3FB37F" };
const PANEL = "rgba(77,49,44,0.85)";

// ---------------- projection ----------------
const pcam = new THREE.PerspectiveCamera(45, W / H, 0.1, 600), v = new THREE.Vector3();
const toScreen = (f: number, p: [number, number, number]) => {
  applyCam(pcam, shotAt(f).frame.plan.cam); pcam.updateProjectionMatrix();
  v.set(...p).project(pcam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, behind: v.z > 1 };
};
const rnd = (seed: number) => { let s = seed * 9301 + 49297; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const hhmm = (m: number) => { const x = ((Math.floor(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

// ---------------- the tracker ----------------
const PRAYERS = PLAN.prayers as [string, number][];
const CRACK = PLAN.cracks as Record<string, number>, MEND = PLAN.mends as Record<string, number>;
const PRAYED: Record<number, number> = { 1: PRAYERS[1][1] + 25, 3: PRAYERS[3][1] + 15 }; // minutes at which they light
const DOT_R = 30, DOT_SPACING = 132, TRACK_Y = 300;
const crackPaths = (i: number) => {
  const r = rnd(17 + i * 31), out: string[] = [];
  for (let k = 0; k < 4; k++) {
    let a = (k / 4) * Math.PI * 2 + r() * 0.9, x = 50 + (r() - 0.5) * 8, y = 50 + (r() - 0.5) * 8, d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 0.9; const L = 9 + r() * 7; x += Math.cos(a) * L; y += Math.sin(a) * L; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    out.push(d);
  }
  return out;
};
const CRACKS = PRAYERS.map((_, i) => crackPaths(i));
const DOTS_ON = A.about + 0.3;
/** the clock shown at time t: the plan's time-lapse, then real time in the courtyard */
const clockAt = (t: number) => (t < A.matchCut ? minutesAt(t) : minutesAt(A.matchCut) + (t - A.matchCut) / 60);

const Dot: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const t = f / FPS, on = clamp01((t - (DOTS_ON + i * 0.12)) / 0.12);
  const crackF = CRACK[i] !== undefined ? F(CRACK[i]) : Infinity, mendF = MEND[i] !== undefined ? F(MEND[i]) : Infinity;
  const cracked = f >= crackF, k = clamp01((f - crackF) / 5), mended = f >= mendF, mend = clamp01((f - mendF) / 12);
  const prayed = PRAYED[i] !== undefined && clockAt(t) >= PRAYED[i], pk = prayed ? clamp01((clockAt(t) - PRAYED[i]) / 20) : 0;
  let shake = cracked && f - crackF < 10 ? Math.sin((f - crackF) * 2.3) * 6 * (1 - (f - crackF) / 10) : 0;
  const dl = f - F(A.lost); if (dl >= 0 && dl < 20 && cracked && !mended) shake += Math.sin(dl * 2.1 + i) * 9 * (1 - dl / 20);
  const fill = mended ? "#5a3a2f" : cracked ? "#5a1d22" : prayed ? BRAND.orange : "rgba(255,255,255,0.08)";
  const ring = mended ? BRAND.orange : cracked ? BRAND.red : prayed ? "#ffd2b8" : "rgba(255,255,255,0.55)";
  const glow = mended ? `drop-shadow(0 0 ${10 + 14 * (1 - mend)}px rgba(251,86,6,0.9))` : cracked && f - crackF < 14 ? "drop-shadow(0 0 14px rgba(229,72,77,0.95))"
    : prayed ? `drop-shadow(0 0 ${6 + 10 * (1 - pk)}px rgba(251,86,6,0.8))` : "none";
  return (
    <div style={{ width: DOT_R * 2, height: DOT_R * 2, transform: `translateX(${shake}px) scale(${0.6 + 0.4 * on + (f >= crackF && f - crackF < 6 ? 0.15 : 0)})`, opacity: 0.25 + 0.75 * on, filter: glow }}>
      <svg viewBox="0 0 100 100" width={DOT_R * 2} height={DOT_R * 2}>
        <circle cx={50} cy={50} r={44} fill={fill} stroke={ring} strokeWidth={6} />
        {prayed && !cracked ? <path d="M30 52 L45 66 L71 36" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pk} /> : null}
        {cracked ? CRACKS[i].map((d, j) => (
          <path key={j} d={d} fill="none" stroke={mended ? BRAND.orange : "#ffb0a8"} strokeWidth={mended ? 5 : 3.5} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (mended ? 1 : k)} opacity={mended ? 0.5 + 0.5 * mend : 1} />
        )) : null}
        {mended ? CRACKS[i].map((d, j) => <path key={"g" + j} d={d} fill="none" stroke="#ffe0cc" strokeWidth={2} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - mend} />) : null}
      </svg>
    </div>
  );
};
const Tracker: React.FC<{ f: number; opacity: number }> = ({ f, opacity }) => {
  const t = f / FPS, m = clockAt(t), lapse = t >= A.pushBack && t < A.matchCut;
  let label = "", time = hhmm(m), sub = "";
  if (t >= A.your9) {
    const secsLeft = Math.max(0, Math.round((24 * 60 + 5 * 60 + 13 - m) * 60));
    label = "NEXT · FAJR"; time = "05:13";
    sub = `in ${String(Math.floor(secsLeft / 3600)).padStart(2, "0")}:${String(Math.floor((secsLeft % 3600) / 60)).padStart(2, "0")}:${String(secsLeft % 60).padStart(2, "0")}`;
  } else {
    const cur = PRAYERS.reduce((a, p, i) => (m >= p[1] ? i : a), -1);
    label = cur >= 0 ? PRAYERS[cur][0].toUpperCase() : "BEFORE FAJR";
  }
  const pop = 1 + 0.08 * Math.max(0, 1 - Math.abs(t - A.your9) / 0.2);
  return (
    <div style={{ position: "absolute", left: W / 2, top: TRACK_Y, transform: `translate(-50%, -50%) scale(${pop})`, opacity }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 34px 16px", borderRadius: 30,
        background: PANEL, border: `2px solid ${BRAND.orange}`, boxShadow: "0 8px 30px rgba(20,8,4,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 50, color: BRAND.white, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums", filter: lapse ? "blur(0.6px)" : "none" }}>{time}</div>
          <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 22, letterSpacing: "0.16em", color: BRAND.white, background: BRAND.orange, padding: "6px 14px", borderRadius: 999 }}>{label}</div>
          {sub ? <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>{sub}</div> : null}
        </div>
        <div style={{ display: "flex", gap: DOT_SPACING - DOT_R * 2 }}>
          {PRAYERS.map((p, i) => (
            <div key={p[0]} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Dot i={i} f={f} />
              <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 17, letterSpacing: "0.14em", color: "rgba(255,255,255,0.85)" }}>{p[0].toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const dotPx = (i: number) => ({ x: W / 2 + (i - 2) * DOT_SPACING, y: TRACK_Y + 18 });

// ---------------- the mercy: orange-gold lights rise from the floor to the cracked dots ----------------
const MercyLights: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS, FLY = 1.0;
  return (
    <>
      {Object.entries(MEND).map(([k, m]) => {
        const i = Number(k), u = (t - (m - FLY)) / FLY;
        if (u <= 0 || u >= 1.05) return null;
        const at = F(m - FLY), tr = shotAt(at).frame.traveller;
        const start = tr ? toScreen(at, [tr.pos[0] + (i - 2) * 0.35, 0.1, tr.pos[2] + 0.8]) : { x: 540, y: 1500 };
        const end = dotPx(i), e = smooth(Math.min(1, u));
        const x = start.x + (end.x - start.x) * e + 60 * Math.sin(u * Math.PI) * (i % 2 ? 1 : -1), y = start.y + (end.y - start.y) * e;
        return (
          <div key={k} style={{ position: "absolute", left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: 14, opacity: Math.min(1, u * 5) * (u > 1 ? 1 - (u - 1) / 0.05 : 1),
            background: "radial-gradient(circle, #fff6ea 0%, #ffb27a 40%, rgba(251,86,6,0) 72%)", boxShadow: "0 0 30px 10px rgba(251,86,6,0.5)" }} />
        );
      })}
    </>
  );
};

// ---------------- pop-outs: things flying at the lens ----------------
type PopKind = "coins" | "papers" | "bubbles" | "notes" | "pings" | "tickets";
const POPS = PLAN.pops as { kind: PopKind; from: number; to: number }[];
const BUBBLES = ["♥ 12.4k", "+1 follower", "♥ 980", "+48 likes", "New follower", "♥ 3.1k", "+212 followers"];
const PINGS = ["3 new messages", "Meeting in 5 min", "+48 likes", "Sale ends tonight", "You were mentioned", "12 notifications", "Reminder: report due", "New follower"];
const NOTE_COL = ["#f7d44a", "#ff9fb2", BRAND.orange, "#9ee6a8", "#7fd2ff"];
const PopItem: React.FC<{ kind: PopKind; i: number }> = ({ kind, i }) => {
  if (kind === "coins") return (
    <svg width={110} height={110} viewBox="0 0 110 110"><defs><radialGradient id={"cg" + i} cx="35%" cy="30%"><stop offset="0" stopColor="#ffe9a8" /><stop offset="0.55" stopColor="#f4b23a" /><stop offset="1" stopColor={BRAND.orange} /></radialGradient></defs>
      <circle cx={55} cy={55} r={48} fill={`url(#cg${i})`} stroke="#241726" strokeWidth={6} /><circle cx={55} cy={55} r={32} fill="none" stroke="#b8650f" strokeWidth={5} /><rect x={49} y={30} width={12} height={50} rx={6} fill="#fff2c8" opacity={0.75} /></svg>);
  if (kind === "papers") return (
    <div style={{ width: 150, height: 200, background: "#fbfaf6", border: "5px solid #241726", borderRadius: 6, padding: "22px 16px", boxSizing: "border-box" }}>
      {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} style={{ height: 8, width: `${60 + ((i * 13 + k * 29) % 40)}%`, background: k === 0 ? BRAND.brown : "#b9b4ad", borderRadius: 4, marginBottom: 16 }} />)}
    </div>);
  if (kind === "notes") return (
    <div style={{ width: 150, height: 150, background: NOTE_COL[i % NOTE_COL.length], border: "5px solid #241726", boxSizing: "border-box", padding: 18, fontFamily: FONT.caption, fontWeight: 900, fontSize: 34, color: "#241726" }}>
      {["DUE!", "ASAP", "TODAY", "URGENT", "5PM"][i % 5]}</div>);
  if (kind === "tickets") return (
    <div style={{ width: 300, height: 120, background: "#fbfaf6", border: "5px solid #241726", borderRadius: 14, display: "flex", overflow: "hidden", fontFamily: FONT.caption }}>
      <div style={{ flex: 1, padding: "14px 18px" }}><div style={{ fontWeight: 900, fontSize: 30, color: "#241726" }}>{["DXB", "IST", "LHR", "KUL", "CAI"][i % 5]} → {["NEXT YEAR", "2027", "SOMEDAY"][i % 3]}</div><div style={{ fontWeight: 700, fontSize: 18, color: "#6b6b6b", marginTop: 8 }}>BOARDING PASS</div></div>
      <div style={{ width: 70, background: BRAND.orange, borderLeft: "4px dashed #241726" }} /></div>);
  const text = kind === "bubbles" ? BUBBLES[i % BUBBLES.length] : PINGS[i % PINGS.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.97)", padding: "16px 26px 16px 16px", borderRadius: 999, border: "4px solid #241726",
      fontFamily: FONT.caption, fontWeight: 800, fontSize: 34, color: "#1b2030", whiteSpace: "nowrap" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: [BRAND.orange, "#e0457b", "#3a7be0", "#7a5ad6", BRAND.green][i % 5] }} />{text}
    </div>);
};
/** each piece: born in the middle of the frame, it rushes outward and grows (toward the lens) past the frame's edge */
const Pops: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  return (
    <>
      {POPS.flatMap((p, pi) => {
        if (t < p.from - 0.05 || t > p.to + 0.8) return [];
        const n = p.kind === "coins" ? 12 : p.kind === "pings" ? 0 : 7, life = 0.65, r = rnd(pi * 97 + 3);
        return Array.from({ length: n }, (_, i) => {
          const born = p.from + (i / n) * Math.max(0.2, Math.min(0.55, p.to - p.from - 0.1)), u = (t - born) / life;
          const sx = 540 + (r() - 0.5) * 420, sy = 880 + (r() - 0.5) * 520, ang = Math.atan2(sy - 900, sx - 540) + (r() - 0.5) * 0.8, spd = 900 + 700 * r(), spin = (r() - 0.5) * 2.6;
          if (u <= 0 || u >= 1 || t > p.to + 0.25 + u) return null;
          const e = u * u, x = sx + Math.cos(ang) * e * spd, y = sy + Math.sin(ang) * e * spd, sc = 0.25 + 2.9 * e;
          return (
            <div key={`${pi}-${i}`} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${sc}) rotate(${spin * u}rad)`,
              opacity: Math.min(1, u * 8) * (1 - smooth((u - 0.85) / 0.15)), filter: `blur(${(e * 5).toFixed(1)}px) drop-shadow(0 10px 18px rgba(0,0,0,0.4))` }}>
              <PopItem kind={p.kind} i={i + pi * 3} />
            </div>
          );
        });
      })}
    </>
  );
};

// ---------------- shockwave rings on the hits ----------------
const RING_KINDS = new Set(["impact_big", "impact", "slam", "shatter", "punch_hit", "relight"]);
const RINGS = (PLAN.sfx as { t: number; kind: string }[]).filter((e) => RING_KINDS.has(e.kind)).map((e) => ({ f: F(e.t), big: e.kind === "impact_big" || e.kind === "slam" || e.kind === "shatter", warm: e.kind === "relight" }));
const CRACK_RINGS = Object.entries(CRACK).map(([i, s]) => ({ f: F(s), i: Number(i) }));
const Shockwaves: React.FC<{ f: number }> = ({ f }) => (
  <>
    {RINGS.map((r, k) => {
      const d = f - r.f, L = r.big ? 14 : 10;
      if (d < 0 || d >= L) return null;
      const u = d / L, R = (r.big ? 1300 : 900) * (1 - (1 - u) ** 2.2);
      return <div key={k} style={{ position: "absolute", left: 540 - R, top: 940 - R, width: 2 * R, height: 2 * R, borderRadius: "50%",
        border: `${(r.big ? 14 : 8) * (1 - u)}px solid ${r.warm ? "rgba(255,200,150,0.8)" : u < 0.3 ? "rgba(255,255,255,0.9)" : "rgba(251,86,6,0.75)"}`, opacity: 1 - u, boxShadow: `0 0 ${40 * (1 - u)}px rgba(251,86,6,0.6)` }} />;
    })}
    {CRACK_RINGS.map((r) => {
      const d = f - r.f; if (d < 0 || d >= 10) return null;
      const u = d / 10, R = 160 * u, p = dotPx(r.i);
      return <div key={"c" + r.i} style={{ position: "absolute", left: p.x - R, top: p.y - R, width: 2 * R, height: 2 * R, borderRadius: "50%", border: `${6 * (1 - u)}px solid ${BRAND.red}`, opacity: 1 - u }} />;
    })}
  </>
);

// ---------------- the giant FIRST ----------------
const FirstSlam: React.FC<{ f: number }> = ({ f }) => {
  const a = F(A.slam), b = F(A.about) + 6, d = f - a;
  if (d < 0 || f >= b) return null;
  const sc = d < 5 ? 2.6 - 1.6 * (1 - (1 - d / 5) ** 3) : 1 + 0.02 * Math.sin(d * 0.25), shake = d < 10 ? Math.sin(d * 2.9) * 10 * (1 - d / 10) : 0;
  const out = clamp01((b - f) / 6);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.17, textAlign: "center", transform: `translate(${shake}px, 0) scale(${sc})`, opacity: Math.min(1, d / 2) * out }}>
      <span style={{ fontFamily: FONT.caption, fontWeight: 900, fontSize: 220, letterSpacing: "0.04em", color: BRAND.orange,
        textShadow: `0 0 ${30 + 40 * Math.max(0, 1 - d / 12)}px rgba(251,86,6,0.85), 0 8px 30px rgba(0,0,0,0.8)`, WebkitTextStroke: "3px #241726" }}>FIRST</span>
    </div>
  );
};

// ---------------- the phone, flooded with pings (point of view) ----------------
const PHONE_SHOT = () => { const s = (PLAN.shots as { kind: string; from: number; to: number }[]).find((x) => x.kind === "phonePOV")!; return { a: F(s.from), b: F(s.to) }; };
const PhonePOV: React.FC<{ f: number }> = ({ f }) => {
  const { a, b } = useMemo(PHONE_SHOT, []);
  if (f < a || f >= b) return null;
  const u = (f - a) / (b - a), t = (f - a) / FPS;
  const n = Math.min(PINGS.length + 6, Math.floor(t / 0.065) + 1), count = Math.min(99, 3 + Math.floor(t * 70));
  const sc = 1.0 + 0.1 * u, rot = -2 + 3 * u;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 540, top: 1010, width: 700, height: 1400, transform: `translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 90, background: "#14161c", border: "8px solid #241726", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }} />
        <div style={{ position: "absolute", left: 28, top: 28, right: 28, bottom: 28, borderRadius: 66, overflow: "hidden", background: "linear-gradient(#1d2236, #2b2140)" }}>
          <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 44px 18px", fontFamily: FONT.caption, fontWeight: 800, color: "#fff", fontSize: 34 }}>
            <span>{hhmm(clockAt(f / FPS))}</span>
            <span style={{ background: BRAND.red, borderRadius: 999, padding: "4px 16px", fontSize: 28 }}>{count === 99 ? "99+" : count}</span>
          </div>
          {Array.from({ length: n }, (_, i) => {
            const age = t - i * 0.065, k = clamp01(age / 0.12), j = n - 1 - i; // the newest on top, pushing the rest down
            return (
              <div key={i} style={{ position: "absolute", left: 24, right: 24, top: 140 + j * 128, transform: `translateY(${(1 - k) * -60}px) scale(${0.9 + 0.1 * k})`, opacity: k,
                display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.94)", borderRadius: 30, padding: "20px 24px", fontFamily: FONT.caption }}>
                <div style={{ width: 62, height: 62, borderRadius: 16, background: [BRAND.orange, "#e0457b", "#3a7be0", "#7a5ad6", BRAND.green][i % 5], flexShrink: 0 }} />
                <div><div style={{ fontWeight: 800, fontSize: 30, color: "#141824" }}>{PINGS[i % PINGS.length]}</div><div style={{ fontWeight: 600, fontSize: 22, color: "#6b7080" }}>now</div></div>
              </div>
            );
          })}
        </div>
        {/* his thumbs at the edges of the phone (skin, ink outline) */}
        {[-1, 1].map((s) => <div key={s} style={{ position: "absolute", top: 860 + 14 * Math.sin(t * 9 + s), [s < 0 ? "left" : "right"]: -70, width: 150, height: 300, borderRadius: 80, background: "#C08A5E", border: "7px solid #241726", transform: `rotate(${s * 18}deg)` }} />)}
      </div>
    </AbsoluteFill>
  );
};

// ---------------- kinetic captions ----------------
type Kind = "key" | "warn" | "good";
const COLOR: Record<Kind, string> = { key: BRAND.orange, warn: BRAND.red, good: BRAND.green };
const KEYS: Record<number, Record<string, Kind>> = {
  1: { money: "key", job: "key", followers: "key" }, 2: { first: "key" }, 3: { "one thing": "key", "before all of it": "key" },
  4: { deadlines: "key", notifications: "key", "plans for next year": "key" }, 5: { "push it back": "warn", minute: "warn", call: "warn", video: "warn" },
  6: { prophet: "key", "first deed": "key", "his salat": "key" }, 7: { succeeded: "good", failed: "warn", lost: "warn" },
  8: { allah: "key", merciful: "key", "voluntary prayers": "good", completed: "good" }, 9: { "stand up": "good", "next one": "key", "next prayer": "key" },
};
/** the words that slam in (a camera punch and a shake land with them, see timeline accents) */
const SLAM = new Set(["first", "lost", "merciful", "next one"]);
const SALAWAT = "ﷺ";
const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
const show = (w: string) => w.replace(/^"/, "“").replace(/"$/, "”").replace(/"([.,?!])$/, "”$1").replace(/([.,?!])"$/, "$1”");
type Tok = { w: Word; text: string; kind?: Kind; slam?: boolean; at: number };
const SENTENCES: Word[][] = (() => { const out: Word[][] = []; let cur: Word[] = []; for (const w of WORDS) { cur.push(w); if (/[.?!:]["”]?$/.test(w.word)) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; })();
const textOf = (ws: Word[]) => ws.map((w) => show(w.word)).join(" ");
const split = (ws: Word[]): Word[][] => {
  if (textOf(ws).length <= 42 || ws.length < 4) return [ws];
  const half = textOf(ws).length / 2;
  let best = -1, bestD = Infinity, len = 0;
  ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 2 && /,$/.test(w.word) && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } });
  if (best < 0 || bestD > half * 0.6) { len = 0; bestD = Infinity; ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 1 && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } }); }
  return [...split(ws.slice(0, best + 1)), ...split(ws.slice(best + 1))];
};
const tokens = (ws: Word[]): Tok[] => {
  const toks: Tok[] = ws.map((w) => ({ w, text: show(w.word), at: F(w.start) }));
  const keys = KEYS[ws[0].block] ?? {}, nw = ws.map((w) => norm(w.word));
  for (const [k, kind] of Object.entries(keys)) {
    const kw = k.split(/\s+/);
    for (let i = 0; i + kw.length <= nw.length; i++) if (kw.every((x, j) => nw[i + j] === x)) for (let j = 0; j < kw.length; j++) { toks[i + j].kind = kind; toks[i + j].slam = SLAM.has(k) && !(ws[0].block === 6); toks[i + j].at = F(ws[i].start); }
  }
  return toks;
};
type Ph = { toks: Tok[]; from: number; to: number; block: number; centreY: number; quote: boolean };
const PH0 = SENTENCES.flatMap((ws) => split(ws).map((x) => ({ ws: x })));
const QUOTE_FROM = F(A.indeed), QUOTE_TO = F(A.hadithEnd) + 14;
const PHRASES0 = PH0.map(({ ws }, i) => {
  const next = PH0[i + 1], from = F(ws[0].start) - 2, end = F(ws[ws.length - 1].end) + 12;
  let to = next && F(next.ws[0].start) - 2 < end + 18 ? F(next.ws[0].start) - 2 : end;
  if (ws[0].block === 2) to = Math.min(to, F(A.first) + 9);                        // the shatter takes it
  return { toks: tokens(ws), from, to: Math.max(to, from + 14), block: ws[0].block, quote: from >= QUOTE_FROM - 3 && from < QUOTE_TO };
});
const SAFE_TOP = 0.25, SAFE_BOT = 0.84, CANDIDATES = [0.7, 0.76, 0.64, 0.8, 0.36, 0.42, 0.3, 0.56];
/** his head and upper body's screen range (fractions) over frames [from, to): only what is inside the frame counts */
const bodyRange = (from: number, to: number) => {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  // from the word itself on: a caption appears 2 frames before its word, which can still be in the previous shot
  for (let f = Math.min(from + 3, to - 1); f < to; f += 3) {
    const s = shotAt(f), tr = s.frame.traveller;
    if (!tr) continue;
    const c = s.frame.plan.cam, right = new THREE.Vector3(...c.look).sub(new THREE.Vector3(...c.pos)).cross(new THREE.Vector3(0, 1, 0)).setY(0).normalize();
    const hs = tr.wide ? [0.55, 0.75, 0.95] : [1.0, 1.25, 1.5, 1.75, 1.97];
    for (const h of hs) for (const k of [-0.3, 0, 0.3]) {
      const hx = tr.wide ? s.head[0] : tr.pos[0], hz = tr.wide ? s.head[2] : tr.pos[2];
      const q = toScreen(f, [hx + right.x * k, (tr.wide ? 0 : tr.pos[1]) + h, hz + right.z * k]);
      if (q.behind || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue;
      y0 = Math.min(y0, q.y / H); y1 = Math.max(y1, q.y / H); x0 = Math.min(x0, q.x / W - 0.06); x1 = Math.max(x1, q.x / W + 0.06);
    }
  }
  return { y0, y1, x0, x1 };
};
const placeCaption = (from: number, to: number, half: number) => {
  const kind = shotOf(from).kind;
  if (kind === "phonePOV") return 0.84;
  const { y0, y1, x0, x1 } = bodyRange(from, to), xOverlap = x1 > 0.08 && x0 < 0.92, GAP = 0.015;
  let best = CANDIDATES[0], bestO = Infinity;
  for (const c of CANDIDATES) {
    if (c - half < SAFE_TOP || c + half > SAFE_BOT) continue;
    if (kind === "voidLow" && c < 0.4) continue;                              // the giant FIRST is up there
    const o = xOverlap && isFinite(y0) ? Math.max(0, Math.min(c + half, y1 + GAP) - Math.max(c - half, y0 - GAP)) : 0;
    if (o === 0) return c;
    if (o < bestO) { bestO = o; best = c; }
  }
  return best;
};
const SIZE = 64, MAXW = 940;
const lines = (toks: Tok[]) => {
  const font = `800 ${SIZE}px ${FONT.caption}`, wd = (a: number, b: number) => measure(toks.slice(a, b).map((t) => t.text).join(" "), font);
  if (wd(0, toks.length) <= MAXW) return [toks];
  let best = 1, bestW = Infinity;
  for (let i = 1; i < toks.length; i++) { const w = Math.max(wd(0, i), wd(i, toks.length)); if (w < bestW) { bestW = w; best = i; } }
  return [toks.slice(0, best), toks.slice(best)];
};
const popEnv = (f: number, at: number) => { const d = f - at; if (d < 0 || d > 14) return 0; return d < 3 ? Math.sin((Math.PI / 2) * (d / 3)) : 0.5 + 0.5 * Math.cos((Math.PI * (d - 3)) / 11); };
const TokSpan: React.FC<{ t: Tok; f: number }> = ({ t, f }) => {
  const e = t.kind ? popEnv(f, t.at) : 0, col = t.kind ? COLOR[t.kind] : BRAND.white;
  let sc = 1 + 0.15 * e, op = 1;
  if (t.slam) { const d = f - t.at; op = d < 0 ? 0 : 1; sc = d < 0 ? 1 : d < 5 ? 1.9 - 0.9 * (1 - (1 - d / 5) ** 3) : 1 + 0.15 * e; }
  const parts = t.text.includes(SALAWAT) ? t.text.split(SALAWAT) : null;
  const grow = Math.max(0, sc - 1) * measure(t.text, `800 ${SIZE}px ${FONT.caption}`) / 2; // keep the gaps when it grows
  return (
    <span style={{ display: "inline-block", color: col, transform: `scale(${sc})`, opacity: op, margin: `0 ${grow.toFixed(1)}px`,
      textShadow: e > 0 && t.kind ? `0 0 ${8 + 26 * e}px ${col}, 0 3px 12px rgba(10,4,2,0.9)` : "0 3px 12px rgba(10,4,2,0.9), 0 0 3px rgba(10,4,2,0.9)" }}>
      {parts ? parts.flatMap((p, i) => (i ? [<span key={i} style={{ fontFamily: FONT.arabic, fontWeight: 400, color: BRAND.orange, fontSize: "1.1em", lineHeight: 1, margin: "0 0.08em", verticalAlign: "-0.05em" }}>{SALAWAT}</span>, p] : [p])) : t.text}
    </span>
  );
};
const Captions: React.FC<{ f: number; phrases: Ph[] }> = ({ f, phrases }) => {
  const ph = phrases.find((p) => f >= p.from && f < p.to);
  if (!ph) return null;
  const d = f - ph.from, k = clamp01(d / 5), e = 1 - (1 - k) ** 3, out = clamp01((ph.to - f) / 4);
  const sc = (1 + 0.28 * (1 - e)) * (0.96 + 0.04 * out), dy = (1 - e) * 34, rot = (1 - e) * -2.5;
  const ls = lines(ph.toks);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: H * ph.centreY, transform: `translateY(calc(-50% + ${dy}px)) scale(${sc}) rotate(${rot}deg)`, opacity: Math.min(e * 1.6, out),
      textAlign: "center", fontFamily: FONT.caption, fontWeight: 800, fontSize: SIZE, lineHeight: 1.18, letterSpacing: "-0.005em" }}>
      {ls.map((l, i) => <div key={i} style={{ whiteSpace: "nowrap" }}>{l.map((t, j) => <React.Fragment key={j}><TokSpan t={t} f={f} />{j < l.length - 1 ? " " : ""}</React.Fragment>)}</div>)}
    </div>
  );
};

// ---------------- the source tag and the end card ----------------
const SourceTag: React.FC<{ f: number; y: number }> = ({ f, y }) => {
  const a = F(A.indeed) + 12, b = F(A.hadithEnd) + 20;
  if (f < a || f >= b) return null;
  const k = smooth((f - a) / 8) * clamp01((b - f) / 8);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: H * y, textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
      <span style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 26, letterSpacing: "0.14em", color: BRAND.white, background: PANEL, border: `2px solid ${BRAND.orange}`, borderRadius: 999, padding: "10px 24px" }}>
        JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)</span>
    </div>
  );
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const a = F(A.card);
  if (f < a) return null;
  // the channel logo is left off for now (a new one is being made): the card shows the source only
  const k = smooth((f - a) / 14), sk = smooth((f - a - 8) / 14);
  return (
    <AbsoluteFill style={{ background: `rgba(77,49,44,${0.94 * k})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <div style={{ opacity: sk, transform: `translateY(${(1 - sk) * 14}px)`, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.caption, fontWeight: 800, fontSize: 34, letterSpacing: "0.22em", color: BRAND.orange, marginBottom: 22 }}>SOURCES</div>
          <div style={{ width: 120, height: 3, background: BRAND.orange, margin: "0 auto 30px" }} />
          <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 46, lineHeight: 1.4, color: BRAND.white }}>Jami' at-Tirmidhi 413,<br />graded Sahih (Darussalam)</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- the whole layer ----------------
export const Overlay: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame(), t = f / FPS;
  const phrases = useMemo<Ph[]>(() => {
    // the hadith's quote: all its lines at one height, chosen for the whole quote
    const qY = placeCaption(QUOTE_FROM, QUOTE_TO, 0.09);
    const l = PHRASES0.map((p) => ({ ...p, centreY: p.quote ? qY : placeCaption(p.from, p.to, lines(p.toks).length > 1 ? 0.045 : 0.025) }));
    if ((getInputProps() as { post?: { camReport?: boolean } }).post?.camReport) for (const p of l) console.log(`TEXT LAYOUT: ${p.from}-${p.to} at ${p.centreY.toFixed(2)} ${JSON.stringify(bodyRange(p.from, p.to))} "${p.toks.map((x) => x.text).join(" ")}"`);
    return l;
  }, []);
  const quoteY = phrases.find((p) => p.quote)?.centreY ?? 0.7;
  const shown = (t >= A.about && t < A.chase) || (t >= A.pushBack && t < A.ending);
  const trackerOpacity = shown ? Math.min(clamp01((t - A.about) / 0.2), t >= A.pushBack ? clamp01((t - A.pushBack) / 0.15) : 1, 1 - smooth((t - A.ending + 0.3) / 0.4), t < A.chase ? clamp01((A.chase - t) / 0.08) : 1) : 0;
  if (!ready) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <PhonePOV f={f} />
      <Pops f={f} />
      <Shockwaves f={f} />
      {trackerOpacity > 0 ? <Tracker f={f} opacity={trackerOpacity} /> : null}
      <MercyLights f={f} />
      <FirstSlam f={f} />
      <Captions f={f} phrases={phrases} />
      <SourceTag f={f} y={Math.min(0.86, quoteY + 0.085)} />
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
