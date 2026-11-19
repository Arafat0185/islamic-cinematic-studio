// The 2D layer of video 001 draft 3 (from draft 2's): nothing during the 5 s recitation slot; the tracker's red dots
// pulse on the hadith's key phrases and shake on "lost"; a zoom-through flies into a cracked dot.
// Draft 2's notes: the prayer tracker (a clock and five prayer dots, which crack red when a prayer is
// let go and are mended with gold by the voluntary prayers), short labels by his head ("1 more minute"), the swarm of
// notifications, the gold lights of the mercy, the captions (placed clear of him and of the tracker), the source tag
// and the sources card. All timing from plan.json via timeline.ts.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { applyCam, smooth, clamp01 } from "../../camera/ease";
import { Captions, Phrase, KeyKind, KEY_COLOR } from "../../text/Captions";
import { SourceTag } from "../../text/SourceTag";
import { SourcesCard } from "../../text/SourcesCard";
import { FONT, useFonts } from "../../text/fonts";
import { A, MENDS, FB, F, FPS, WORDS, INTRO, shotAt } from "./timeline";
import PLAN from "../../../../videos/001-the-first-question/draft3/plan.json";

const W = 1080, H = 1920;
const GOLD = KEY_COLOR.gold, RED = "#d4473f", INDIGO = "rgba(14,20,48,0.72)";

// ---------------- projection: a world point -> screen (pixels) through the frame's camera ----------------
const pcam = new THREE.PerspectiveCamera(45, W / H, 0.1, 600), v = new THREE.Vector3();
const toScreen = (f: number, p: [number, number, number]) => {
  const s = shotAt(f);
  applyCam(pcam, s.frame.plan.cam); pcam.updateProjectionMatrix();
  v.set(...p).project(pcam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, behind: v.z > 1 };
};
const headPx = (f: number) => { const s = shotAt(f); return toScreen(f, [s.head[0], s.head[1] + 0.12, s.head[2]]); };

// ---------------- the clock ----------------
const minutesAt = (t: number) => {
  const k = PLAN.clock as [number, number][];
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const [t0, m0] = k[i - 1], [t1, m1] = k[i]; return m0 + ((m1 - m0) * (t - t0)) / Math.max(1e-6, t1 - t0); }
  return k[k.length - 1][1];
};
const hhmm = (m: number) => { const x = ((Math.floor(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

// ---------------- the tracker ----------------
const PRAYERS = PLAN.prayers as { name: string; time: number; crack: number }[];
const TONES = ["fajrTone", "dhuhrTone", "asrTone", "maghribTone", "ishaTone"];
/** jagged crack lines across a dot (deterministic), in a 100 x 100 box */
const crackPaths = (i: number) => {
  let s = 17 + i * 31; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const out: string[] = [];
  for (let k = 0; k < 4; k++) {
    let a = (k / 4) * Math.PI * 2 + r() * 0.9, x = 50 + (r() - 0.5) * 8, y = 50 + (r() - 0.5) * 8, d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 0.9; const L = 9 + r() * 7; x += Math.cos(a) * L; y += Math.sin(a) * L; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    out.push(d);
  }
  return out;
};
const CRACKS = PRAYERS.map((_, i) => crackPaths(i));
/** the red dots pulse on the hadith's key phrases */
const KEY_PULSE = ["first", "deed", "account", "resurrection", "salat"];
const PULSES = WORDS.filter((w) => w.block === "hadith" && KEY_PULSE.includes(w.word.replace(/[^\p{L}]/gu, "").toLowerCase())).map((w) => F(w.start));
export const DOT_SPACING = 132, DOT_R = 30;
/** where the tracker sits (centre of the dots row, px) and its scale: top of the frame, or the centre for the hook */
export const trackerPlace = (t: number) => {
  const c = smooth((t - A.dotsCentre) / 0.6) * (1 - smooth((t - A.dotsBack) / 0.5));
  return { y: 300 + (820 - 300) * c, scale: 1 + 0.55 * c };
};

const Dot: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const t = f / FPS, p = PRAYERS[i];
  const crackF = F(p.crack), mendF = F(MENDS[i]), toneF = F(A[TONES[i]]);
  const cracked = f >= crackF, k = clamp01((f - crackF) / 5);
  const mend = clamp01((f - mendF) / 12), mended = f >= mendF;
  const calling = f >= toneF && f < crackF ? 0.5 + 0.5 * Math.sin((f - toneF) * 0.45) : 0;
  let shake = cracked && f - crackF < 10 ? Math.sin((f - crackF) * 2.3) * 5 * (1 - (f - crackF) / 10) : 0;
  const dl = f - F(A.lostWord); if (dl >= 0 && dl < 20 && !mended) shake += Math.sin(dl * 2.1 + i) * 9 * (1 - dl / 20); // "lost"
  const pl = PULSES.reduce((m, at) => Math.max(m, f >= at && f < at + 16 ? Math.sin((Math.PI * (f - at)) / 16) : 0), 0) * (cracked && !mended ? 1 : 0);
  const fill = mended ? "#1b2550" : cracked ? "#5a1d22" : "#1d2a5c";
  const ring = mended ? GOLD : cracked ? RED : calling ? GOLD : "rgba(232,176,75,0.55)";
  const pulseGlow = pl > 0 ? `drop-shadow(0 0 ${8 + 20 * pl}px rgba(230,70,60,${0.5 + 0.5 * pl}))` : "";
  const glow0 = mended ? `drop-shadow(0 0 ${10 + 14 * (1 - mend)}px rgba(232,176,75,0.9))` : calling ? `drop-shadow(0 0 ${6 + 12 * calling}px rgba(232,176,75,0.85))` : cracked && f - crackF < 14 ? "drop-shadow(0 0 14px rgba(212,71,63,0.9))" : "none";
  const glow = pulseGlow || glow0;
  void t;
  return (
    <div style={{ width: DOT_R * 2, height: DOT_R * 2, transform: `translateX(${shake}px) scale(${1 + 0.18 * pl})`, filter: glow }}>
      <svg viewBox="0 0 100 100" width={DOT_R * 2} height={DOT_R * 2}>
        <circle cx={50} cy={50} r={44} fill={fill} stroke={ring} strokeWidth={6} />
        {cracked ? CRACKS[i].map((d, j) => (
          <path key={j} d={d} fill="none" stroke={mended ? GOLD : "#ff9c90"} strokeWidth={mended ? 5 : 3.5} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (mended ? 1 : k)} opacity={mended ? 0.5 + 0.5 * mend : 1} />
        )) : null}
        {mended ? CRACKS[i].map((d, j) => (
          <path key={"g" + j} d={d} fill="none" stroke="#fff1c9" strokeWidth={2} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - mend} />
        )) : null}
      </svg>
    </div>
  );
};

const Tracker: React.FC<{ f: number; opacity: number }> = ({ f, opacity }) => {
  const t = f / FPS, m = minutesAt(t), place = trackerPlace(t);
  const next = t >= A.nextPrayer;
  let label = "", time = hhmm(m), sub = "";
  if (next) {
    const secsLeft = Math.max(0, Math.round(((24 * 60 + 5 * 60 + 13) - minutesAt(t)) * 60 - (t - A.nextPrayer)));
    label = "NEXT · FAJR"; time = "05:13";
    sub = `in ${String(Math.floor(secsLeft / 3600)).padStart(2, "0")}:${String(Math.floor((secsLeft % 3600) / 60)).padStart(2, "0")}:${String(secsLeft % 60).padStart(2, "0")}`;
  } else {
    // the prayer being called (tone .. crack), else the last prayer whose time has come
    const calling = PRAYERS.findIndex((_, i) => t >= A[TONES[i]] && t < PRAYERS[i].crack);
    const cur = calling >= 0 ? calling : PRAYERS.reduce((a, p, i) => (m >= p.time ? i : a), -1);
    label = cur >= 0 ? PRAYERS[cur].name.toUpperCase() : "";
  }
  const jumping = (t > A.timeJump && t < A.timeJump + 0.5) || (t > A.clockLate && t < A.phoneOff);
  return (
    <div style={{ position: "absolute", left: W / 2, top: place.y, transform: `translate(-50%, -50%) scale(${place.scale})`, opacity, transformOrigin: "50% 50%" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 34px 16px", borderRadius: 30,
        background: INDIGO, border: "1.5px solid rgba(232,176,75,0.55)", boxShadow: "0 8px 30px rgba(5,8,22,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 50, color: "#FBF6EC", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums",
            filter: jumping ? "blur(1.2px)" : "none" }}>{time}</div>
          {label ? <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 22, letterSpacing: "0.16em", color: "#14183a", background: GOLD, padding: "6px 14px", borderRadius: 999 }}>{label}</div> : null}
          {sub ? <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 24, color: "rgba(233,223,200,0.85)", fontVariantNumeric: "tabular-nums" }}>{sub}</div> : null}
        </div>
        <div style={{ display: "flex", gap: DOT_SPACING - DOT_R * 2 }}>
          {PRAYERS.map((p, i) => (
            <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Dot i={i} f={f} />
              <div style={{ fontFamily: FONT.caption, fontWeight: 600, fontSize: 17, letterSpacing: "0.14em", color: "rgba(233,223,200,0.85)" }}>{p.name.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
/** the screen position (px) of dot i, for the mercy lights to fly to */
const dotPx = (i: number, t: number) => { const pl = trackerPlace(t); return { x: W / 2 + (i - 2) * DOT_SPACING * pl.scale, y: pl.y + 18 * pl.scale }; };

// ---------------- zoom-through into a cracked dot ----------------
/** the camera "flies into" the middle cracked dot: it grows to fill the frame (cracks and all), the cut lands inside
 *  it, and the courtyard opens out of it */
const ZoomDot: React.FC<{ f: number }> = ({ f }) => {
  const at = F(A.zoomDot), d = f - at;
  if (d < -12 || d >= 12) return null;
  const pl = trackerPlace(f / FPS), x = W / 2, y = pl.y + 18 * pl.scale;
  const r = d < 0 ? DOT_R * Math.pow(70, (d + 12) / 12) : 2400 * (1 - d / 12);
  const a = d < 0 ? 1 : 1 - d / 12;
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, opacity: a }}>
      <svg viewBox="0 0 100 100" width={2 * r} height={2 * r}>
        <circle cx={50} cy={50} r={48} fill={d < 0 ? "#5a1d22" : "rgba(14,20,48,0.9)"} />
        {CRACKS[2].map((p, j) => <path key={j} d={p} fill="none" stroke={d < 0 ? "#ff9c90" : "#c79c48"} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinecap="round" />)}
      </svg>
    </div>
  );
};

// ---------------- labels by his head ----------------
const LABELS: { from: number; to: number; text: string }[] = [
  { from: A.label1min, to: A.timeJump, text: "1 more minute" },
  { from: A.labelCall, to: A.dhuhrCrack + 0.3, text: "after this call" },
  { from: A.label5min, to: A.cutNight - 0.1, text: "5 more minutes" },
  { from: A.labelVideo, to: A.ishaCrack + 0.4, text: "one more video" },
];
const Label: React.FC<{ f: number; l: (typeof LABELS)[number] }> = ({ f, l }) => {
  const a = F(l.from), b = F(l.to);
  if (f < a || f >= b) return null;
  const pop = 1 - Math.pow(1 - clamp01((f - a) / 6), 3), over = 1 + 0.12 * Math.sin(Math.PI * clamp01((f - a) / 8));
  const out = clamp01((b - f) / 5), h = headPx(f);
  const x = Math.min(W - 230, Math.max(230, h.x + 40)), y = Math.max(480, h.y - 110);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop * over})`, opacity: out }}>
      <div style={{ fontFamily: FONT.caption, fontWeight: 700, fontSize: 38, color: "#14183a", background: "#FBF6EC", padding: "12px 24px", borderRadius: 999,
        borderLeft: `8px solid ${GOLD}`, boxShadow: "0 6px 22px rgba(5,8,22,0.4)", whiteSpace: "nowrap" }}>{l.text}</div>
    </div>
  );
};

// ---------------- the notifications ----------------
const NOTES = ["3 new messages", "+48 likes", "New follower", "Report due today", "Sale ends tonight", "You were mentioned", "12 notifications"];
const NOTE_COLOURS = ["#3a7be0", "#e0457b", "#7a5ad6", "#e08a3a", "#3aa86b", "#e0457b", "#3a7be0"];
const Notifications: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const asr = t >= A.cutAsr && t < A.cutGym, fb = t >= FB[4] && t < FB[5];
  if (!asr && !fb) return null;
  const h = headPx(f);
  return (
    <>
      {NOTES.map((n, k) => {
        const at = asr ? A.cutAsr + 0.25 + k * 0.45 : FB[4] + k * 0.05;
        if (t < at) return null;
        const age = t - at, pop = 1 - Math.pow(1 - clamp01(age / 0.18), 3);
        const end = asr ? A.cutGym : FB[5], fade = clamp01((end - t) / 0.2);
        const ang = k * 2.2 + age * 0.35, rx = 300 + 40 * (k % 3), ry = 200 + 50 * (k % 2);
        const x = Math.min(W - 200, Math.max(200, h.x + rx * Math.cos(ang))), y = Math.min(1500, Math.max(420, h.y - 60 + ry * Math.sin(ang)));
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})`, opacity: fade }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(251,248,240,0.96)", padding: "12px 20px 12px 14px", borderRadius: 22,
              boxShadow: "0 8px 26px rgba(5,8,22,0.35)", fontFamily: FONT.caption, fontWeight: 600, fontSize: 26, color: "#1b2030", whiteSpace: "nowrap" }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: NOTE_COLOURS[k] }} />{n}
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------------- the mercy: gold lights rise from him to the cracked dots ----------------
const MercyLights: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS, FLY = 1.1;
  return (
    <>
      {MENDS.map((m, i) => {
        const u = (t - (m - FLY)) / FLY;
        if (u <= 0 || u >= 1.05) return null;
        // they rise from the floor in front of his feet (never across his face) up to the dots
        const sf = shotAt(F(m - FLY)), tr = sf.frame.traveller;
        const start = tr ? toScreen(F(m - FLY), [tr.pos[0] + (i - 2) * 0.35, 0.1, tr.pos[2] + 0.8]) : headPx(F(m - FLY));
        const end = dotPx(i, t), e = smooth(Math.min(1, u));
        const x = start.x + (end.x - start.x) * e + 60 * Math.sin(u * Math.PI) * (i % 2 ? 1 : -1);
        const y = start.y + (end.y - start.y) * e;
        const a = Math.min(1, u * 5) * (u > 1 ? 1 - (u - 1) / 0.05 : 1);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: 13, opacity: a,
            background: "radial-gradient(circle, #fffbe8 0%, #f4c96a 40%, rgba(232,176,75,0) 72%)", boxShadow: "0 0 30px 10px rgba(232,176,75,0.55)" }} />
        );
      })}
    </>
  );
};

// ---------------- captions ----------------
const KEYS: Record<number, Record<string, KeyKind>> = {
  2: { first: "gold" }, 4: { first: "gold", "his Salat": "gold" }, 5: { succeeded: "green", lost: "red" },
  6: { mercy: "gold", Allah: "gold", "voluntary prayers": "gold", completed: "gold" }, 7: { "stand up": "green", "next prayer": "gold" },
};
const show = (w: string) => w.replace(/^"/, "“").replace(/"$/, "”").replace(/"([.,?!])$/, "”$1").replace(/([.,?!])"$/, "$1”");
type Word = (typeof WORDS)[number];
const textOf = (ws: Word[]) => ws.map((w) => show(w.word)).join(" ");
const split = (ws: Word[]): Word[][] => {
  if (textOf(ws).length <= 50 || ws.length < 4) return [ws];
  const half = textOf(ws).length / 2;
  let best = -1, bestD = Infinity, len = 0;
  ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 2 && /,$/.test(w.word) && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } });
  if (best < 0 || bestD > half * 0.6) { len = 0; bestD = Infinity; ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 1 && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } }); }
  return [...split(ws.slice(0, best + 1)), ...split(ws.slice(best + 1))];
};
/** the script's sentences (from the timed words, in order) */
const SENTENCES: Word[][] = (() => { const out: Word[][] = []; let cur: Word[] = []; for (const w of WORDS) { cur.push(w); if (/[.?!:]["\u201D]?$/.test(w.word)) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; })();
const PH = SENTENCES.flatMap((ws) => split(ws).map((x) => ({ sec: ws[0].section, ws: x })));
const PHRASES: Phrase[] = PH.map(({ sec, ws }, i) => {
  const next = PH[i + 1], from = F(ws[0].start) - 2, end = F(ws[ws.length - 1].end) + 14;
  const to = next && F(next.ws[0].start) - 2 < end + 18 ? F(next.ws[0].start) - 2 : end;
  return { text: textOf(ws), from, to: Math.max(to, from + 20), keys: KEYS[sec], times: ws.map((w) => F(w.start)) };
});
const quoteWords = SENTENCES.find((ws) => ws[0].block === "hadith" && ws[0].word.startsWith('"'))!;
const QUOTE = { from: F(quoteWords[0].start) - 2, to: F(quoteWords[quoteWords.length - 1].end) + 14 };
const SAFE_TOP = 0.24, SAFE_BOT = 0.835, CANDIDATES = [0.68, 0.74, 0.62, 0.785, 0.36, 0.3, 0.42, 0.56];
/** his head and upper body's screen range (fractions) over frames [from, to): waist (1.0 m) to the top of the kufi,
 *  shoulder-wide; only the parts actually inside the frame count */
const bodyRange = (from: number, to: number) => {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (let f = from; f < to; f += 3) {
    const s = shotAt(f), tr = s.frame.traveller;
    if (!tr) continue;
    const right = new THREE.Vector3(...s.frame.plan.cam.look).sub(new THREE.Vector3(...s.frame.plan.cam.pos)).cross(new THREE.Vector3(0, 1, 0)).setY(0).normalize();
    for (const h of [1.0, 1.25, 1.5, 1.75, 1.97]) for (const k of [-0.3, 0, 0.3]) {
      const q = toScreen(f, [tr.pos[0] + right.x * k, tr.pos[1] + h, tr.pos[2] + right.z * k]);
      if (q.behind || q.x < 0 || q.x > W || q.y < 0 || q.y > H) continue;
      y0 = Math.min(y0, q.y / H); y1 = Math.max(y1, q.y / H); x0 = Math.min(x0, q.x / W - 0.06); x1 = Math.max(x1, q.x / W + 0.06);
    }
  }
  return { y0: +y0.toFixed(3), y1: +y1.toFixed(3), x0: +x0.toFixed(3), x1: +x1.toFixed(3) };
};
/** where a caption goes: the first candidate clear of his body (feet .. head) over its frames, and of the tracker */
const placeCaption = (from: number, to: number, half = 0.045) => {
  const { y0, y1, x0, x1 } = bodyRange(from, to);
  const t0 = from / FPS, centreHook = t0 >= A.dotsCentre && t0 < A.dotsBack;
  if (centreHook) return 0.66; // the dots are in the centre: the line goes under them
  const xOverlap = x1 > 0.08 && x0 < 0.92, GAP = 0.012;
  let best = CANDIDATES[0], bestO = Infinity;
  for (const c of CANDIDATES) {
    if (c - half < SAFE_TOP || c + half > SAFE_BOT) continue;
    const o = xOverlap && isFinite(y0) ? Math.max(0, Math.min(c + half, y1 + GAP) - Math.max(c - half, y0 - GAP)) : 0;
    if (o === 0) return c;
    if (o < bestO) { bestO = o; best = c; } // nothing is clear: the least overlap
  }
  return best;
};

export const Overlay: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame(), { height } = useVideoConfig();
  const t = f / FPS;
  const layout = useMemo(() => {
    const l = PHRASES.map((p) => ({ ...p, centreY: p.from >= QUOTE.from && p.to <= QUOTE.to ? placeCaption(QUOTE.from, QUOTE.to, 0.09) : placeCaption(p.from, p.to) }));
    if ((getInputProps() as { post?: { camReport?: boolean } }).post?.camReport) for (const p of l) console.log(`TEXT LAYOUT: ${p.from}-${p.to} at ${p.centreY.toFixed(2)} ${JSON.stringify(bodyRange(p.from, p.to))} "${p.text}"`);
    return l;
  }, []);
  const s = shotAt(f);
  const trackerOpacity = t < INTRO ? 0 : clamp01((t - INTRO) / 0.25) * (1 - smooth((t - A.ending + 0.2) / 0.4));
  const quoteY = layout.find((p) => p.from >= QUOTE.from)?.centreY ?? 0.66;
  if (!ready) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {trackerOpacity > 0 ? <Tracker f={f} opacity={trackerOpacity} /> : null}
      <ZoomDot f={f} />
      {LABELS.map((l, i) => <Label key={i} f={f} l={l} />)}
      <Notifications f={f} />
      <MercyLights f={f} />
      <Captions phrases={layout} backdrop />
      <SourceTag text={"JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)"} from={QUOTE.from + 14} to={QUOTE.to} centreY={quoteY + 0.075} />
      <SourcesCard sources={["Jami' at-Tirmidhi 413, graded sahih (Darussalam)"]} note={"DRAFT · NOT YET REVIEWED"} from={F(A.card)} to={PLAN.frames} />
      {/* the silence: a slow vignette closes in while the phone is dark, before the hook */}
      {t >= A.phoneOff && t < FB[0] ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 35%, rgba(2,3,10,0.75) 100%)", opacity: smooth((t - A.phoneOff) / 0.6) * (1 - smooth((t - FB[0] + 0.2) / 0.2)) }} /> : null}
      {void height}
    </AbsoluteFill>
  );
};
