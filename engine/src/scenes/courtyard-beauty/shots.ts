// The three beauty shots of the rich courtyard. Each: camera, lens (depth of field) and a name.
import { Cam, V3 } from "../../camera/ease";

export type ShotName = "wide" | "low" | "close";
/** where the Traveller stands for the beauty shots: on the prayer mat, under the main lamp, facing the camera */
export const TRAVELLER_AT: V3 = [1.3, 0, -1.55];

type Lens = { cInf: number; nearScale: number; maxCoC: number };
export const SHOTS: Record<ShotName, { cam: Cam; lens: Lens }> = {
  // establishing: from inside the gallery behind the foreground arch, looking across the courtyard to the arcade,
  // the dome, the minaret and the moon. The arch is only slightly soft (low nearScale).
  wide: { cam: { pos: [0.3, 1.45, 10.8], look: [0.25, 2.2, -3], fov: 50, roll: 0 }, lens: { cInf: 4, nearScale: 0.9, maxCoC: 20 } },
  // low angle from just above the pool's water: the camera sits where the main lamp's reflection lands mid-pool
  // (on the line from the lamp's mirror image through the water), looking across it to the Traveller and the arcade
  low: { cam: { pos: [-0.85, 0.72, 3.0], look: [0.9, 1.25, -2.2], fov: 55, roll: 0 }, lens: { cInf: 5, nearScale: 1.2, maxCoC: 24 } },
  // close: the Traveller from the waist up, the main lamp glowing just above and behind his shoulder
  close: { cam: { pos: [1.4, 1.5, 1.4], look: [1.5, 1.62, -1.6], fov: 34, roll: 0 }, lens: { cInf: 9, nearScale: 2.0, maxCoC: 28 } },
};
