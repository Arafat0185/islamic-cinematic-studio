// BrandToolkitDemo (25 s): every brand piece in the rich courtyard with the Traveller. All times in frames (30 fps).
//   0:00 opening (darkness, the lamp ignites, light runs along the tile grooves)
//   0:02 hook caption (section 2)                                  -> star wipe
//   0:06 hadith: intro, the exact quote in two phrases, Arabic line demo, source tag (section 4 + references.yaml)
//   0:15 a warning line (section 5, red keyword)                   -> star wipe
//   0:18 the mercy: lights rise and fill the empty tile stars (section 6, gold keyword)
//   0:21 ending: the camera rises, the star mark completes, the lamp dims; a right-action line (section 7, green);
//        the sources card
import { Cam, V3, glide } from "../../camera/ease";
import { STAR_WIPE_FRAMES } from "../../brand/StarWipe";

export const FPS = 30;
export const FRAMES = 25 * FPS;

export const T = {
  open: [0, 66], hook: [66, 186], wipe1: 180, hadith: [186, 456], weight: [456, 546], wipe2: 540,
  mercy: [546, 636], end: [636, 750],
} as const;
export const WIPE_CUT = STAR_WIPE_FRAMES / 2; // the shot changes this many frames into a wipe (fully covered)

/** the Traveller (on the prayer mat, under the main lamp) and the centre of the floor effects */
export const TRAVELLER_AT: V3 = [1.3, 0, -1.55];
export const MERCY_CENTRE: [number, number] = [0.75, -0.7];
export const MARK_CENTRE: V3 = [0.75, 0, -0.7];

type Shot = { from: Cam; to: Cam; cInf: number };
const cam = (pos: V3, look: V3, fov = 50): Cam => ({ pos, look, fov, roll: 0 });
const SHOTS: Record<"open" | "hook" | "hadith" | "weight" | "mercy", Shot> = {
  // low by the lamp: the lamp in the top of the frame, the tile floor (where the light runs) below
  open: { from: cam([1.5, 1.25, 3.4], [1.7, 0.45, -2.4]), to: cam([1.45, 1.3, 3.1], [1.7, 0.5, -2.4]), cInf: 5 },
  hook: { from: cam([0.9, 1.5, 5.4], [1.2, 1.45, -2]), to: cam([1.0, 1.5, 4.5], [1.2, 1.5, -2]), cInf: 5 },
  hadith: { from: cam([1.45, 1.5, 1.6], [1.5, 1.6, -1.6], 36), to: cam([1.42, 1.52, 1.2], [1.5, 1.62, -1.6], 36), cInf: 9 },
  weight: { from: cam([0.2, 2.6, 6.0], [0.8, 1.0, -1.6], 48), to: cam([0.3, 2.5, 5.5], [0.8, 1.0, -1.6], 48), cInf: 4 },
  mercy: { from: cam([0.9, 3.7, 2.8], [0.8, 0.0, -0.8], 50), to: cam([0.9, 3.5, 2.5], [0.8, 0.0, -0.8], 50), cInf: 3 },
};
const lerpCam = (a: Cam, b: Cam, t: number): Cam => {
  const m = (x: number, y: number) => x + (y - x) * t;
  return { pos: [m(a.pos[0], b.pos[0]), m(a.pos[1], b.pos[1]), m(a.pos[2], b.pos[2])], look: [m(a.look[0], b.look[0]), m(a.look[1], b.look[1]), m(a.look[2], b.look[2])], fov: m(a.fov, b.fov), roll: 0 };
};
const along = (s: Shot, f: number, a: number, b: number) => ({ cam: lerpCam(s.from, s.to, glide((f - a) / (b - a)) * 0.6 + ((f - a) / (b - a)) * 0.4), cInf: s.cInf });

/** the camera (and the lens's background blur) at frame f, before the ending takes over */
export const shotAt = (f: number) => {
  if (f < T.open[1]) return along(SHOTS.open, f, T.open[0], T.open[1]);
  if (f < T.wipe1 + WIPE_CUT) return along(SHOTS.hook, f, T.hook[0], T.wipe1 + WIPE_CUT);
  if (f < T.hadith[1]) return along(SHOTS.hadith, f, T.wipe1 + WIPE_CUT, T.hadith[1]);
  if (f < T.wipe2 + WIPE_CUT) return along(SHOTS.weight, f, T.hadith[1], T.wipe2 + WIPE_CUT);
  return along(SHOTS.mercy, f, T.wipe2 + WIPE_CUT, T.mercy[1]);
};
