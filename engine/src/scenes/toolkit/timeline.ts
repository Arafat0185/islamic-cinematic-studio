// BrandToolkitDemo v2 (25 s): every brand piece in the rich courtyard, with a living Traveller and a new camera angle
// or move on every caption beat. Everything is a pure function of the frame (30 fps).
//
//  beat      frames    camera                                           the Traveller
//  opening   0-66      low angle; rack focus from the lamp to him       head bowed in thought, then turns up to the lamp
//  hook      66-178    wide establishing through the foreground arch,   looks up at the sky; lowers his head on "first"
//                      slow push (the arch frames the courtyard, soft)
//  (star iris 178-192)
//  intro     178-276   close-up on his head, the lamp behind, slow orbit turned toward the lamp
//  quote     276-450   medium shot, a wider slow arc around him         a hand placed on his chest, head a little bowed
//  (whip pan 450-460)
//  weight    455-540   crane up: the courtyard grows, he becomes small  turns and walks to the prayer mat
//  (star iris 536-550)
//  mercy     536-636   high angle (~32 deg) over the mat                 stands in thought; turns to face the qibla
//  ending    636-750   low angle as he raises his hands, then the       takbir, held
//                      signature rise to the star mark (to ~40 deg, never straight down)
// Every hold also gets a very subtle handheld drift, and the Traveller always breathes and shifts his weight a little,
// with a breeze in his shawl, so nothing is ever frozen.
import { Cam, V3, glide, smooth, clamp01 } from "../../camera/ease";
import { whipAt } from "../../brand/transitions";
import { endingAt } from "../../brand/sequences";
import { SU } from "../../render/card";
import { keywordMoments, Phrase } from "../../text/Captions";
import { NARRATION, HADITH } from "./content";

export const FPS = 30;
export const FRAMES = 25 * FPS;

// ---------------- text ----------------
export const PHRASES: Phrase[] = [
  { ...NARRATION.hook2, from: 72, to: 176 },
  { ...NARRATION.hadithIntro, from: 192, to: 270 },
  { text: HADITH.parts[0], keys: HADITH.keys, from: 278, to: 362 },
  { text: HADITH.parts[1], keys: HADITH.keys, from: 362, to: 448 },
  { ...NARRATION.weight2, from: 466, to: 536 },
  { ...NARRATION.mercy1, from: 556, to: 632 },
  { ...NARRATION.turn2, from: 642, to: 688 }, // ends before the camera's rise moves him up the frame
];
export const ARABIC = { from: 278, to: 448 };
export const TAG = { from: 292, to: 448 };
export const CARD = { from: 700, to: 750 };
/** the strongest words get a camera punch-in or a tiny shake, and a brief light flash */
const STRONG: Record<string, "punch" | "shake"> = { first: "punch", lost: "shake", mercy: "punch" };
const strongAt = (ph: Phrase) => keywordMoments(ph).filter((k) => STRONG[k.word]).map((k) => ({ ...k, how: STRONG[k.word] }));
export const ACCENTS = [PHRASES[0], PHRASES[4], PHRASES[5]].flatMap(strongAt);

// ---------------- transitions ----------------
export const IRIS = [{ from: 178, len: 14 }, { from: 536, len: 14 }];
export const WHIP = { from: 450, len: 10 };

// ---------------- places ----------------
export const P1: V3 = [0.15, 0, -0.6];  // where he stands for the opening, hook and hadith
export const P2: V3 = [1.3, 0, -1.55];  // on the prayer mat
export const MARK_CENTRE: V3 = [0.75, 0, -0.7];
export const MERCY_CENTRE: [number, number] = [0.75, -0.7];
const LAMP: V3 = [1.85, 2.45, -3.5];
const HEAD1: V3 = [P1[0], 1.72, P1[2]];

// ---------------- the Traveller ----------------
const WALK = { from: 466, to: 528, steps: 4 };
const STRIDE_M = (P2[0] - P1[0]) / WALK.steps;
export const STRIDE_UNITS = STRIDE_M / SU;
const walkProgress = (f: number) => { // trapezoid speed: eases in and out over 9 frames
  const T = WALK.to - WALK.from, r = 9, v = 1 / (T - r), x = Math.max(0, Math.min(T, f - WALK.from));
  if (x < r) return (v * x * x) / (2 * r);
  if (x > T - r) { const y = T - x; return 1 - (v * y * y) / (2 * r); }
  return v * (x - r / 2);
};
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export type Act =
  | { view: "front"; arms: "down" | "chest"; turn: number; tilt: number }
  | { view: "q34"; mirror: boolean }
  | { view: "side"; mirror: boolean; phase: number; k: number; raise: number; settle: number };

/** a weighted settle after a turn (frames since arriving): dips ~1.5 % of his height, a tiny rebound */
const settle = (d: number) => (d < 0 ? 0 : d < 10 ? 13 * Math.sin((Math.PI * d) / 10) : d < 18 ? -3.2 * Math.sin((Math.PI * (d - 10)) / 8) : 0);
const ramp = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
const firstAt = ACCENTS.find((a) => a.word === "first")?.at ?? 120;

export const travellerAt = (f: number) => {
  const t = f / FPS;
  // always alive: breathing (a slow rise and fall), a tiny weight shift, and a breeze in the shawl
  const idle = { bob: 1.8 * Math.sin((2 * Math.PI * t) / 3.8), sway: 0.006 * Math.sin((2 * Math.PI * t) / 7.3), wind: 0.55 * Math.sin(t * 1.1) + 0.3 * Math.sin(t * 2.7 + 1) };
  let pos: V3 = P1, act: Act;
  const front = (turn: number, tilt: number, arms: "down" | "chest" = "down"): Act => ({ view: "front", arms, turn, tilt });
  const side = (mirror: boolean, phase: number, k = 0, raise = 0, s = 0): Act => ({ view: "side", mirror, phase, k, raise, settle: s });
  if (f < 66) {         // opening: bowed in thought, then his head turns up toward the lamp as it lights
    const u = ramp(f, 28, 52);
    act = front(0.7 * u, -0.7 + 0.95 * u);
  } else if (f < 178) { // hook: looks up at the sky; brings his head down as "first" is said
    const up = ramp(f, 78, 108), down = ramp(f, firstAt + 2, firstAt + 20);
    act = front(0.25 * up * (1 - down) + 0.7 * (1 - up) * (1 - down), 0.25 + (0.9 - 0.25) * up - 0.9 * down);
  } else if (f < 276) { // intro: turned toward the lamp
    act = front(0.6, 0.15);
  } else if (f < 457) { // quote: a hand placed on his chest, head a little bowed
    act = front(0.15, -0.3, "chest");
  } else {
    const steps = 0.25 + (lerp3(P1, P2, walkProgress(f))[0] - P1[0]) / (2 * STRIDE_M);
    const endPhase = 0.25 + WALK.steps / 2;
    if (f < 460) act = { view: "q34", mirror: false };                     // turns toward the mat
    else if (f < WALK.to) {                                                 // walks
      pos = lerp3(P1, P2, walkProgress(f));
      const on = ramp(f, WALK.from, WALK.from + 10) * ramp(f, WALK.to, WALK.to - 10);
      act = side(false, steps, on, 0, settle(f - 460));
    } else if (f < 531) { pos = P2; act = { view: "q34", mirror: false }; } // turns to face us on the mat
    else if (f < 622) { pos = P2; act = front(0, -0.45); }                  // in thought while the stars fill
    else if (f < 625) { pos = P2; act = { view: "q34", mirror: true }; }    // turns to the qibla (screen left)
    else { pos = P2; act = side(true, endPhase, 0, clamp01((f - 650) / 22), settle(f - 625)); } // takbir
  }
  return { pos: [pos[0] + idle.sway, pos[1], pos[2]] as V3, act, bob: idle.bob, wind: idle.wind };
};

// ---------------- the camera ----------------
/** nearScale (optional): foreground blur strength for this beat (default 1.6) */
export type Beat = { from: number; to: number; cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number; nearScale?: number };
const cam = (pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: 0 });
const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: a.fov + (b.fov - a.fov) * t, roll: 0 });
const move = (a: Cam, b: Cam, from: number, to: number) => (f: number) => mixCam(a, b, glide((f - from) / (to - from)) * 0.7 + clamp01((f - from) / (to - from)) * 0.3);
/** orbit around `c` at radius r and height y, azimuth (degrees, 0 = toward +z) from a0 to a1 */
const orbit = (c: V3, r: number, y: number, a0: number, a1: number, from: number, to: number, fov: number, lookUp = 0) => (f: number): Cam => {
  const a = ((a0 + (a1 - a0) * (glide((f - from) / (to - from)) * 0.6 + clamp01((f - from) / (to - from)) * 0.4)) * Math.PI) / 180;
  return cam([c[0] + r * Math.sin(a), y, c[2] + r * Math.cos(a)], [c[0], c[1] + lookUp, c[2]], fov);
};
const chest = (p: V3): V3 => [p[0], 1.35, p[2]];

export const BEATS: Record<"opening" | "hook" | "intro" | "quote" | "weight" | "mercy" | "endLow", Beat> = {
  opening: {
    from: 0, to: 66, cInf: 7,
    cam: move(cam([0.75, 0.5, 1.95], [1.25, 1.45, -3.0], 46), cam([0.7, 0.54, 1.75], [1.2, 1.5, -3.0], 46), 0, 66),
    // rack focus: the lamp first, then him (as his head turns up to it)
    focus: (f) => lerp3(LAMP, chest(P1), ramp(f, 30, 58)),
  },
  hook: {
    // from the gallery behind the foreground arch, looking out through it at the courtyard, the arcade, the dome and
    // the moon; a slow push that stays behind the arch (the arch's back face is at z = 7.9)
    from: 66, to: 192, cInf: 4, nearScale: 0.9,
    cam: move(cam([0.27, 1.5, 11.4], [0.22, 2.05, -3.0], 50), cam([0.27, 1.52, 9.7], [0.2, 1.95, -3.0], 50), 66, 192),
    focus: () => chest(P1),
  },
  intro: {
    from: 178, to: 290, cInf: 10, // the lamp sits just to the right of his head, softly out of focus
    cam: orbit(HEAD1, 2.3, 1.55, -50, -40, 178, 290, 30, 0.04),
    focus: () => HEAD1,
  },
  quote: {
    from: 276, to: 460, cInf: 7,
    // aimed above him, so he sits in the lower part of the frame with the lamps and arches above: the text goes there
    cam: orbit(chest(P1), 3.4, 1.45, -22, 12, 276, 460, 38, 0.55),
    focus: () => chest(P1),
  },
  weight: {
    from: 450, to: 550, cInf: 4, // crane up: from his level to high above the courtyard, he becomes small
    cam: move(cam([-0.7, 0.95, 3.7], [0.5, 1.0, -1.0], 50), cam([-0.45, 5.3, 6.6], [0.8, 0.0, -1.3], 50), 455, 540),
    focus: (f) => chest(lerp3(P1, P2, walkProgress(f))),
  },
  mercy: {
    // a high angle (~32 deg down to him), not overhead: he stays a standing figure, and the floor where the stars fill
    // is in view in front of him
    from: 536, to: 640, cInf: 3,
    cam: move(cam([0.05, 3.6, 2.0], [0.8, 0.25, -0.95], 48), cam([0.2, 3.4, 1.65], [0.82, 0.3, -1.0], 48), 536, 640),
    focus: () => [P2[0], 0.9, P2[2]],
  },
  endLow: {
    from: 636, to: 680, cInf: 6, // low angle (about hip height) from his side as he raises his hands
    // from his side (he faces the qibla, screen left), so the drawing is his true profile, slowly pushing in
    // pulled back and aimed a little above him: his profile in the lower frame, room for the line above
    cam: move(cam([1.0, 1.05, 2.4], [1.2, 1.75, -1.55], 40), cam([1.02, 1.1, 2.1], [1.2, 1.78, -1.55], 40), 636, 680),
    focus: () => chest(P2),
  },
};
/** the beat the main view shows at frame f (the incoming one during a transition) */
export const beatAt = (f: number): Beat => {
  if (f < 66) return BEATS.opening;
  if (f < IRIS[0].from) return BEATS.hook;
  if (f < 276) return BEATS.intro;
  if (f < WHIP.from + WHIP.len / 2) return BEATS.quote;
  if (f < IRIS[1].from) return BEATS.weight;
  if (f < 636) return BEATS.mercy;
  return BEATS.endLow;
};
/** the outgoing beat of the iris that is running at frame f, if any */
export const irisOut = (f: number) => {
  const i = IRIS.findIndex((r) => f >= r.from && f < r.from + r.len);
  return i < 0 ? null : { iris: IRIS[i], beat: i === 0 ? BEATS.hook : BEATS.weight };
};
export const ENDING = { from: 676, len: 90 }; // the signature rise starts once the hands are up
/** where the ending's rise lands: high and back, ~40 deg down to the star mark (~30 deg to him), never straight down */
export const ENDING_TOP: Cam = { pos: [0.75, 4.6, 4.8], look: [0.75, 0.0, -0.7], fov: 46, roll: 0 };

/** a very subtle handheld drift: a few millimetres, slow, never still */
export const handheld = (f: number, k = 1): { pos: V3; look: V3 } => {
  const t = f / FPS;
  return {
    pos: [k * (0.007 * Math.sin(0.9 * t) + 0.003 * Math.sin(2.3 * t + 1)), k * (0.005 * Math.sin(1.3 * t + 2) + 0.002 * Math.sin(3.1 * t)), k * 0.004 * Math.sin(0.7 * t + 3)],
    look: [k * (0.009 * Math.sin(0.8 * t + 4) + 0.003 * Math.sin(2.9 * t)), k * (0.007 * Math.sin(1.1 * t + 5) + 0.002 * Math.sin(2.6 * t + 1)), 0],
  };
};

/** the strong-word accents at frame f: camera punch-in (fov scale), a tiny shake (m) and a light flash (0..1) */
export const accentAt = (f: number) => {
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

// ---------------- the whole camera plan ----------------
export type Plan = { cam: Cam; focus: V3; cInf: number; nearScale: number; endingU: number | null };
const yawed = (c: Cam, yaw: number): Cam => {
  if (!yaw) return c;
  const dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], cs = Math.cos(yaw), sn = Math.sin(yaw);
  return { ...c, look: [c.pos[0] + dx * cs + dz * sn, c.look[1], c.pos[2] - dx * sn + dz * cs] };
};
/** the camera at frame f, with whip pan, ending, strong-word accents and handheld drift (before collision checks).
 *  `outgoing` = the outgoing beat of a running star iris. */
export const planAt = (f: number, outgoing?: Beat): Plan => {
  const beat = outgoing ?? beatAt(f);
  let c = beat.cam(f), focus = beat.focus(f), cInf = beat.cInf, nearScale = beat.nearScale ?? 1.6, endingU: number | null = null;
  const whip = outgoing ? null : whipAt(f, WHIP.from, WHIP.len);
  if (whip) { const b = whip.side === "out" ? BEATS.quote : BEATS.weight; c = yawed(b.cam(f), whip.yaw); focus = b.focus(f); cInf = b.cInf; nearScale = b.nearScale ?? 1.6; }
  let hand = 1;
  if (!outgoing && f >= ENDING.from) {
    endingU = (f - ENDING.from) / ENDING.len;
    c = endingAt(endingU, BEATS.endLow.cam(ENDING.from), MARK_CENTRE, ENDING_TOP).cam;
    cInf = 2; focus = [MARK_CENTRE[0], 0, MARK_CENTRE[2]]; hand = 1 - Math.min(1, (f - ENDING.from) / 40);
  }
  const acc = accentAt(f), hh = handheld(f, hand), sh = acc.shake * 0.012;
  c = {
    ...c,
    pos: [c.pos[0] + hh.pos[0] + sh * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + sh * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]],
    look: [c.look[0] + hh.look[0], c.look[1] + hh.look[1], c.look[2] + hh.look[2]],
    fov: c.fov * (1 - 0.05 * acc.punch),
  };
  return { cam: c, focus, cInf, nearScale, endingU };
};
