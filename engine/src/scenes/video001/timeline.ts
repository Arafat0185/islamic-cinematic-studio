// Video 001 · The First Question: the film, timed entirely from the narration's word timings.
//   videos/001-the-first-question/words.json  every script word with its start / end in voice.wav (tools/align_words)
//   ./film.json                               the opening, tail and ending lengths (also read by tools/mix.py)
// The voice starts at openSec; every caption, keyword pop, accent, Traveller action, camera move and cut is placed
// on the words. All on-screen English comes from the script's narration lines (script.md on main) word for word,
// split into phrases at sentence ends (and, for long sentences, at the comma nearest the middle).
// The script's own visual directions, per section:
//   1 opening   total darkness, one lamp ignites, light runs along the floor            (signature opening)
//   2 hook      slow push-in on the courtyard, the Traveller alone under the arches       -> whip pan
//   3 chase     low angle behind the Traveller, looking out past the arcade               -> star iris
//               (the distant glowing city is not built yet: the minaret's lit windows stand in)
//   4 hadith    he turns toward the lamp; the camera drifts down to the prayer mat        -> whip pan
//   5 weight    wide: the lamp flickers, the courtyard large, the Traveller small         -> star iris
//   6 mercy     warm light grows; lights rise and fill the gaps in the star tiles          -> whip pan
//   7 turn      he walks to the prayer mat and raises his hands (takbir), slow push-in
//   8 ending    the camera rises, the floor completes into the star mark, the lamp dims, sources card
import { Cam, V3, smooth, clamp01 } from "../../camera/ease";
import { SU } from "../../render/card";
import { whipAt } from "../../brand/transitions";
import { endingAt } from "../../brand/sequences";
import type { KeyKind, Phrase } from "../../text/Captions";
import type { Act, Beat, Film, Plan, TravellerState, Accent } from "../../film/film";
import { cam, move, orbit, chest, lerp3, settle, ramp, yawed, handheld } from "../toolkit/timeline";
import WORDS from "../../../../videos/001-the-first-question/words.json";
import CFG from "./film.json";

export const FPS = CFG.fps;
type Word = { section: number; word: string; start: number; end: number };
const words = (WORDS as { words: Word[] }).words;
/** film frame of a time in voice.wav */
const F = (t: number) => Math.round((CFG.openSec + t) * FPS);
const bySec = (n: number) => words.filter((w) => w.section === n);
const first = (n: number) => bySec(n)[0], last = (n: number) => bySec(n)[bySec(n).length - 1];
const wordAt = (n: number, w: string) => { const x = bySec(n).find((y) => y.word.replace(/[^\p{L}']/gu, "").toLowerCase() === w); if (!x) throw new Error(`video001: no word "${w}" in section ${n}`); return x; };

// ---------------- the frame plan ----------------
const OPEN_TO = F(first(2).start);
/** the cut point between two sections: half-way through the pause between them */
const cutAfter = (n: number) => Math.round((F(last(n).end) + F(first(n + 1).start)) / 2);
const C23 = cutAfter(2), C34 = cutAfter(3), C45 = cutAfter(4), C56 = cutAfter(5), C67 = cutAfter(6);
export const ENDING = { from: F(last(7).end) + Math.round(CFG.tailSec * FPS), len: 90 };
export const FRAMES = ENDING.from + Math.round(CFG.endingSec * FPS);
const IRIS_LEN = 14, WHIP_LEN = 10;

// ---------------- text: phrases straight from the script words ----------------
const KEYS: Record<number, Record<string, KeyKind>> = {
  2: { first: "gold" },                                                 // script: "asked about first", key word in gold
  4: { first: "gold", "his Salat": "gold" },
  5: { succeeded: "green", lost: "red" },                               // script: succeeded green, lost red
  6: { mercy: "gold", Allah: "gold", "voluntary prayers": "gold" },     // script: "voluntary prayers" in gold
  7: { "stand up": "green" },
};
/** straight quotes in the script shown as typographic quotes */
const show = (w: string) => w.replace(/^"/, "“").replace(/"$/, "”").replace(/"([.,?!])$/, "”$1").replace(/([.,?!])"$/, "$1”");
const MAX_CHARS = 50;
const textOf = (ws: Word[]) => ws.map((w) => show(w.word)).join(" ");
/** split a sentence that is too long for two lines: at the comma nearest the middle, else at the middle word */
const split = (ws: Word[]): Word[][] => {
  if (textOf(ws).length <= MAX_CHARS || ws.length < 4) return [ws];
  const half = textOf(ws).length / 2;
  let best = -1, bestD = Infinity, len = 0;
  ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 2 && /,$/.test(w.word) && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } });
  if (best < 0 || bestD > half * 0.6) { len = 0; ws.forEach((w, i) => { len += w.word.length + 1; if (i > 0 && i < ws.length - 1 && Math.abs(len - half) < bestD) { bestD = Math.abs(len - half); best = i; } }); }
  return [...split(ws.slice(0, best + 1)), ...split(ws.slice(best + 1))];
};
const phraseWords = (n: number): Word[][] => {
  const out: Word[][] = []; let cur: Word[] = [];
  for (const w of bySec(n)) { cur.push(w); if (/[.?!:]["”]?$/.test(w.word)) { out.push(...split(cur)); cur = []; } }
  if (cur.length) out.push(...split(cur));
  return out;
};
const PH = [2, 3, 4, 5, 6, 7].flatMap((n) => phraseWords(n).map((ws) => ({ n, ws })));
export const PHRASES: Phrase[] = PH.map(({ n, ws }, i) => {
  const next = PH[i + 1], from = Math.max(OPEN_TO, F(ws[0].start) - 2); // never before the opening's cut
  const end = F(ws[ws.length - 1].end) + 14;
  const to = next && next.n === n ? Math.min(end + 18, F(next.ws[0].start) - 2) : end;
  return { text: textOf(ws), from, to: Math.max(to, from + 20), keys: KEYS[n], times: ws.map((w) => F(w.start)) };
});
// the quote: the section 4 phrases after "first:" (the hadith's exact words)
const quotePh = PHRASES.filter((p, i) => PH[i].n === 4 && PH[i].ws[0].start > wordAt(4, "first").start);
export const QUOTE = { from: quotePh[0].from, to: quotePh[quotePh.length - 1].to };

// ---------------- places ----------------
const P1: V3 = [0.15, 0, -0.6];  // where he stands until he walks to the mat
const P2: V3 = [1.3, 0, -1.55];  // on the prayer mat
const MARK: V3 = [0.75, 0, -0.7];
const LAMP: V3 = [1.85, 2.45, -3.5];
const HEAD1: V3 = [P1[0], 1.72, P1[2]];

// ---------------- the Traveller ----------------
const s7 = phraseWords(7);
const WALK = { from: F(s7[1][0].start) - 4, steps: 4 };
const WALK_TO = WALK.from + 66; // 2.2 s, eased in and out
const STRIDE_M = (P2[0] - P1[0]) / WALK.steps;
const TURN_Q = F(s7[2][0].start) - 6;       // turns to the qibla as the last line begins
const TAKBIR = TURN_Q + 18;                 // then raises his hands
const walkProgress = (f: number) => {
  const T = WALK_TO - WALK.from, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - WALK.from));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
const firstAt = F(wordAt(2, "first").start), mercyAt = F(wordAt(6, "mercy").start);
const sayAt = F(wordAt(6, "allah").start), withAt = F(wordAt(6, "with").start), lostAt = F(wordAt(5, "lost").start);

export const travellerAt = (f: number): TravellerState => {
  const t = f / FPS;
  const idle = { bob: 1.8 * Math.sin((2 * Math.PI * t) / 3.8), sway: 0.006 * Math.sin((2 * Math.PI * t) / 7.3), wind: 0.55 * Math.sin(t * 1.1) + 0.3 * Math.sin(t * 2.7 + 1) };
  const front = (turn: number, tilt: number, arms: "down" | "chest" = "down"): Act => ({ view: "front", arms, turn, tilt });
  const side = (mirror: boolean, phase: number, k = 0, raise = 0, s = 0): Act => ({ view: "side", mirror, phase, k, raise, settle: s });
  let pos: V3 = P1, act: Act;
  if (f < OPEN_TO) { const u = ramp(f, OPEN_TO * 0.42, OPEN_TO * 0.8); act = front(0.7 * u, -0.7 + 0.95 * u); }   // bowed, then up to the lamp
  else if (f < C23) {                                                                                          // looks up at the sky; lowers his head on "first"
    const up = ramp(f, OPEN_TO + 10, OPEN_TO + 40), down = ramp(f, firstAt + 2, firstAt + 20);
    act = front(0.25 * up * (1 - down) + 0.7 * (1 - up) * (1 - down), 0.25 + 0.65 * up - 0.9 * down);
  } else if (f < C34) act = { view: "back" };                                                                  // looks out past the arcade
  else if (f < QUOTE.from) act = front(0.6, 0.15);                                                            // turned toward the lamp
  else if (f < C45) act = front(0.25, -0.3, "chest");                                                         // a hand on his chest during the hadith
  else if (f < C56) act = front(0, -0.4 - 0.3 * ramp(f, lostAt, lostAt + 16));                               // small in the wide; head sinks on "lost"
  else if (f < C67) {                                                                                         // the mercy
    if (f < mercyAt + 30) act = front(0.4 * ramp(f, mercyAt - 6, mercyAt + 14), -0.45 + 0.7 * ramp(f, mercyAt - 6, mercyAt + 14)); // looks up
    else if (f < sayAt) act = front(0.1, -0.4);                                                               // in thought
    else if (f < withAt) act = front(0.1, -0.25, "chest");                                                    // hand on his chest
    else act = front(0.2, 0.05 + 0.15 * ramp(f, withAt, withAt + 20));                                        // lifts his head
  } else {
    const phase = 0.25 + (lerp3(P1, P2, walkProgress(f))[0] - P1[0]) / (2 * STRIDE_M), endPhase = 0.25 + WALK.steps / 2;
    if (f < WALK.from - 3) act = front(0.15, -0.2);                                                           // "isn't whether you're perfect"
    else if (f < WALK.from) act = { view: "q34", mirror: false };                                             // turns toward the mat
    else if (f < WALK_TO) {                                                                                    // walks
      pos = lerp3(P1, P2, walkProgress(f));
      act = side(false, phase, ramp(f, WALK.from, WALK.from + 10) * ramp(f, WALK_TO, WALK_TO - 10), 0, settle(f - WALK.from));
    } else if (f < TURN_Q) { pos = P2; act = side(false, endPhase, 0, 0, settle(f - WALK_TO)); }
    else if (f < TURN_Q + 3) { pos = P2; act = { view: "q34", mirror: false }; }                              // turns to the qibla:
    else if (f < TURN_Q + 6) { pos = P2; act = front(0, 0); }                                                 //   side -> 3/4 -> front
    else if (f < TURN_Q + 9) { pos = P2; act = { view: "q34", mirror: true }; }                               //   -> 3/4 -> side (left)
    else { pos = P2; act = side(true, endPhase, 0, clamp01((f - TAKBIR) / 24), settle(f - (TURN_Q + 9))); }  // takbir
  }
  return { pos: [pos[0] + idle.sway, pos[1], pos[2]], act, bob: idle.bob, wind: idle.wind };
};

// ---------------- the camera ----------------
const B = (from: number, to: number, b: Omit<Beat, "from" | "to">): Beat => ({ from, to, ...b });
const PH3 = F(s7[2][0].start) - 8; // the cut to the side angle for the last line
// the quote: cut on its first word to a camera that drifts down from the lamp to the prayer mat in its light
const matCam = move(cam([1.6, 2.15, 0.95], [1.25, 1.1, -1.9], 42), cam([1.5, 1.25, 0.5], [0.9, 0.08, -1.6], 42), QUOTE.from, C45);
const introCam = orbit(HEAD1, 2.3, 1.55, -50, -40, C34 - 7, QUOTE.from, 30, 0.2);
 // aimed a little above his head: room for the line
const BEATS = {
  // opening: low angle, rack focus from the lamp to him as his head turns up
  open: B(0, OPEN_TO, {
    cInf: 7, cam: move(cam([0.75, 0.5, 1.95], [1.25, 1.45, -3.0], 46), cam([0.7, 0.54, 1.75], [1.2, 1.5, -3.0], 46), 0, OPEN_TO),
    focus: (f) => lerp3(LAMP, chest(P1), ramp(f, OPEN_TO * 0.45, OPEN_TO * 0.88)),
  }),
  // hook: from the gallery, through the foreground arch: the courtyard, the arcade, the dome, the moon; slow push-in
  hook: B(OPEN_TO, C23, { cInf: 4, nearScale: 0.9, cam: move(cam([0.27, 1.5, 11.4], [0.22, 2.05, -3.0], 50), cam([0.27, 1.52, 9.4], [0.2, 1.95, -3.0], 50), OPEN_TO, C23), focus: () => chest(P1) }),
  // chase: low angle behind him, looking out past him to the arcade, the lanterns and the minaret's lit windows
  chase: B(C23, C34 - IRIS_LEN / 2, { cInf: 5, cam: move(cam([0.95, 0.72, 2.05], [0.05, 2.35, -5.5], 46), cam([0.9, 0.7, 1.75], [0.05, 2.45, -5.5], 46), C23, C34), focus: () => chest(P1) }),
  // hadith: close on his head with the lamp behind, then the camera drifts down to the prayer mat in the lamp light
  hadith: B(C34 - IRIS_LEN / 2, C45, {
    cInf: 8,
    cam: (f) => (f < QUOTE.from ? introCam(f) : matCam(f)),
    focus: (f) => (f < QUOTE.from ? HEAD1 : lerp3([1.4, 1.3, -2.2], [0.95, 0.1, -1.55], ramp(f, QUOTE.from, QUOTE.from + 60))),
  }),
  // the weight: wide crane up, the courtyard large, the Traveller small
  // (starts high enough that the reflecting pool in the foreground shows the arcade and lamps, not his inverted card)
  weight: B(C45, C56 - IRIS_LEN / 2, { cInf: 4, cam: move(cam([-0.6, 1.9, 4.3], [0.3, 1.0, -1.0], 50), cam([-0.45, 5.0, 6.8], [0.4, 0.2, -1.3], 50), C45, C56), focus: () => chest(P1) }),
  // the mercy: a high angle (~31 deg) over him, the floor in front of him where the tile stars fill
  mercy: B(C56 - IRIS_LEN / 2, C67, { cInf: 3, cam: move(cam([-1.1, 3.6, 2.95], [-0.3, 0.3, -0.05], 48), cam([-0.95, 3.4, 2.6], [-0.28, 0.35, -0.1], 48), C56, C67), focus: () => [P1[0], 0.9, P1[2]] }),
  // the turn: following him as he walks to the mat ...
  walk: B(C67, PH3, { cInf: 5, cam: move(cam([-0.9, 1.35, 3.6], [0.4, 1.35, -1.0], 46), cam([-0.2, 1.35, 3.2], [1.1, 1.35, -1.4], 46), C67, PH3), focus: (f) => chest(lerp3(P1, P2, walkProgress(f))) }),
  // ... then from his side, a slow push-in as he turns to the qibla and raises his hands
  takbir: B(PH3, FRAMES, { cInf: 6, cam: move(cam([1.0, 1.05, 2.4], [1.2, 1.75, -1.55], 40), cam([1.02, 1.1, 2.0], [1.2, 1.78, -1.55], 40), PH3, ENDING.from), focus: () => chest(P2) }),
};
const ORDER: Beat[] = [BEATS.open, BEATS.hook, BEATS.chase, BEATS.hadith, BEATS.weight, BEATS.mercy, BEATS.walk, BEATS.takbir];
const beatAt = (f: number) => { let b = ORDER[0]; for (const x of ORDER) if (f >= x.from) b = x; return b; };

export const IRISES = [{ from: C34 - IRIS_LEN / 2, len: IRIS_LEN, out: BEATS.chase }, { from: C56 - IRIS_LEN / 2, len: IRIS_LEN, out: BEATS.weight }];
export const WHIPS = [
  { from: C23 - WHIP_LEN / 2, len: WHIP_LEN, out: BEATS.hook, in: BEATS.chase },
  { from: C45 - WHIP_LEN / 2, len: WHIP_LEN, out: BEATS.hadith, in: BEATS.weight },
  { from: C67 - WHIP_LEN / 2, len: WHIP_LEN, out: BEATS.mercy, in: BEATS.walk },
];
const irisOut = (f: number) => { const i = IRISES.find((r) => f >= r.from && f < r.from + r.len); return i ? { iris: { from: i.from, len: i.len }, beat: i.out } : null; };

// ---------------- accents on the strongest words ----------------
const ACCENTS = [{ at: firstAt, how: "punch" }, { at: lostAt, how: "shake" }, { at: mercyAt, how: "punch" }] as const;
const accentAt = (f: number): Accent => {
  let punch = 0, shake = 0, flash = 0, warm = true;
  for (const a of ACCENTS) {
    const d = f - a.at;
    if (d < 0 || d > 30) continue;
    const env = d < 3 ? d / 3 : Math.exp(-(d - 3) / 7);
    if (a.how === "punch") punch = Math.max(punch, env);
    else { shake = Math.max(shake, d < 12 ? Math.exp(-d / 4) : 0); warm = false; }
    flash = Math.max(flash, d < 10 ? (d < 2 ? d / 2 : Math.exp(-(d - 2) / 3)) : 0);
  }
  return { punch, shake, flash, warm };
};

// ---------------- the plan ----------------
const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };
const planAt = (f: number, outgoing?: Beat): Plan => {
  const beat = outgoing ?? beatAt(f);
  let c = beat.cam(f), focus = beat.focus(f), cInf = beat.cInf, nearScale = beat.nearScale ?? 1.6, endingU: number | null = null;
  let anchor: V3 | undefined;
  if (!outgoing) for (const w of WHIPS) {
    const r = whipAt(f, w.from, w.len);
    if (r) { const b = r.side === "out" ? w.out : w.in, bc = b.cam(f); anchor = bc.look; c = yawed(bc, r.yaw); focus = b.focus(f); cInf = b.cInf; nearScale = b.nearScale ?? 1.6; }
  }
  let hand = 1;
  if (!outgoing && f >= ENDING.from) {
    endingU = (f - ENDING.from) / ENDING.len;
    c = endingAt(endingU, BEATS.takbir.cam(ENDING.from), MARK, ENDING_TOP).cam;
    cInf = 2; focus = [MARK[0], 0, MARK[2]]; hand = 1 - Math.min(1, (f - ENDING.from) / 40);
  }
  const acc = accentAt(f), hh = handheld(f, hand), sh = acc.shake * 0.012;
  c = {
    ...c,
    pos: [c.pos[0] + hh.pos[0] + sh * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + sh * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]],
    look: [c.look[0] + hh.look[0], c.look[1] + hh.look[1], c.look[2] + hh.look[2]],
    fov: c.fov * (1 - 0.05 * acc.punch),
  };
  return { cam: c, focus, cInf, nearScale, endingU, anchor: anchor ? [anchor[0] + hh.look[0], anchor[1] + hh.look[1], anchor[2] + hh.look[2]] : undefined };
};

// ---------------- lamp: flickers in the weight section, warms through the mercy ----------------
const lampAt = (f: number) => {
  let k = 1;
  if (f >= C45 && f < C56) k *= 1 + 0.09 * Math.sin(f * 0.83) * Math.sin(f * 0.37 + 1) + 0.05 * Math.sin(f * 2.1);
  k *= 1 + 0.22 * smooth((f - C56) / 60) * (1 - smooth((f - C67) / 45));
  return k;
};

// ---------------- the film ----------------
export const VIDEO001: Film = {
  frames: FRAMES, fps: FPS, planAt, irisOut, irises: IRISES.map(({ from, len }) => ({ from, len })), whips: WHIPS.map(({ from, len }) => ({ from, len })),
  travellerAt, strideUnits: STRIDE_M / SU, accentAt, openingTo: OPEN_TO,
  ending: { from: BEATS.takbir.cam(ENDING.from), top: ENDING_TOP, markCentre: MARK, markR: 1.9 },
  mercy: {
    centre: [-0.25, 0.35], from: C56 - IRIS_LEN / 2, to: C67, firstFill: mercyAt + 12, lastFill: F(wordAt(6, "completed").start) + 4,
    radius: 2.3, count: 12, keepClear: [[P1[0], P1[2], 0.55]],
  },
  lampAt,
  text: {
    phrases: PHRASES,
    // the hadith's Arabic is still a TODO in references.yaml (to be copied verbatim from sunnah.com): none is shown
    quote: { from: QUOTE.from, to: QUOTE.to, arabic: [], tag: "JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)", tagFrom: QUOTE.from + 14 },
    card: { from: ENDING.from + Math.round(CFG.cardAfterSec * FPS), to: FRAMES, sources: ["Jami' at-Tirmidhi 413, graded sahih (Darussalam)"], note: "DRAFT · NOT YET REVIEWED" },
  },
  audio: "audio/video001_mix.wav",
};
