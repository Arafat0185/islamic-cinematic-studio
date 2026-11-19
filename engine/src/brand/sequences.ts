// Timing curves for the brand's signature moments, as pure functions of time.
//   openingAt(t)  t = seconds from the start (about 2.2 s): total darkness; one oil lamp ignites (with a short
//                 flicker); light runs outward along the star-tile grooves from beneath it; the night comes up.
//   endingAt(u)   u = 0..1 over the ending (about 3 s): the camera rises over the courtyard; the floor's glow runs
//                 inward and the 8-point star mark traces itself; the lamp dims.
import { Cam, V3, glide, smooth, clamp01 } from "../camera/ease";

export const OPENING_SECONDS = 2.2;

export const openingAt = (t: number) => {
  const ign = smooth((t - 0.25) / 0.45);
  const flicker = 1 + 0.22 * Math.sin(t * 47) * Math.sin(t * 13) * (1 - smooth((t - 0.3) / 0.7));
  const run = clamp01((t - 0.55) / 1.45);
  return {
    main: ign * flicker,
    lanterns: smooth((t - 1.25) / 0.6),
    night: smooth((t - 0.95) / 1.1),
    grooveRadius: 0.2 + 7.5 * (1 - (1 - run) ** 2),                              // fast start, easing out
    grooveIntensity: smooth((t - 0.5) / 0.15) * (1 - smooth((t - 1.75) / 0.5)), // fades as the night comes up
  };
};

export const ENDING_SECONDS = 3.0;

/** u = 0..1 through the ending; `from` = the camera when the ending starts; the mark is centred at `centre` */
export const endingAt = (u: number, from: Cam, centre: V3) => {
  const e = glide(u);
  const top: Cam = { pos: [centre[0], 9.5, centre[2] + 0.9], look: [centre[0], 0, centre[2]], fov: 45, roll: 0 };
  const mix = (a: number, b: number) => a + (b - a) * e;
  const cam: Cam = {
    pos: [mix(from.pos[0], top.pos[0]), mix(from.pos[1], top.pos[1]), mix(from.pos[2], top.pos[2])],
    look: [mix(from.look[0], top.look[0]), mix(from.look[1], top.look[1]), mix(from.look[2], top.look[2])],
    fov: mix(from.fov, top.fov), roll: 0,
  };
  return {
    cam,
    markProgress: clamp01((u - 0.2) / 0.6),
    markIntensity: smooth((u - 0.15) / 0.15),
    grooveRadius: 6.5 * (1 - clamp01((u - 0.1) / 0.6)),  // the tile glow runs INWARD to the mark
    grooveIntensity: smooth((u - 0.1) / 0.2) * (1 - smooth((u - 0.65) / 0.2)),
    main: 1 - 0.8 * smooth((u - 0.6) / 0.4),
    lanterns: 1 - 0.85 * smooth((u - 0.55) / 0.4),
    night: 1 - 0.35 * smooth((u - 0.6) / 0.4),
  };
};
