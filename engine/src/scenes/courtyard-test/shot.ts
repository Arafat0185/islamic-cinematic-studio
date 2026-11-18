// The one shot of the test scene: 10 s, a slow cinematic push-in on the Traveller with a gentle rise.
import { Cam, V3, dolly, glide, pushEase } from "../../camera/ease";

export const FPS = 30;
export const FRAMES = 10 * FPS;

/** where the Traveller stands (soles) */
export const TRAVELLER_AT: V3 = [-0.45, 0, 0];

const START: V3 = [0.3, 1.3, 8.2];
const LOOK: V3 = [0.2, 1.85, -2];

/** camera at frame f: dolly toward the look point, easing in over the first second (no jolt), ~35 % closer by the end */
export const camAt = (f: number): Cam => {
  const k = pushEase(f, 0, 0.0015, 30);
  const rise = 0.12 * glide(f / FRAMES);
  const s = dolly(START, LOOK, k);
  return { pos: [s.pos[0], s.pos[1] + rise, s.pos[2]], look: [LOOK[0], LOOK[1] + rise * 0.5, LOOK[2]], fov: 50, roll: 0 };
};

/** depth of field: focus on the Traveller's chest; cInf = blur (px at 1080x1920) of things at infinity */
export const dofAt = () => ({ focus: [TRAVELLER_AT[0], 1.3, TRAVELLER_AT[2]] as V3, cInf: 10 });
