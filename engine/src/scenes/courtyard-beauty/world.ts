// The rich courtyard set (dressing, lamps, Traveller card) as one reusable builder: CourtyardBeauty and the brand
// toolkit demo both use it.
import * as THREE from "three";
import { buildCourtyard, WALL_Z, APEX } from "../courtyard-test/courtyard";
import { buildLamp } from "../courtyard-test/lamp";
import { buildMat } from "../motion-test/mat";
import { MAT } from "../motion-test/timeline";
import { Cast } from "../../render/card";
import { foregroundArch, skyline, moonDisc, fountain, palm, shrub, tileBand, panel, Dust, Mist } from "./set";

export const ARCHES = [-5.55, -3.7, -1.85, 0, 1.85, 3.7, 5.55];
export const MAIN = 1.85;                                   // the main lamp hangs in this arch
export const LIT = new Set([-3.7, 0, 5.55]);                // the other lanterns: only some are lit
export const MOON_FROM: [number, number, number] = [-2, 10, 2.5]; // moonlight from high above (slightly in front)
export const MOON_SEEN = new THREE.Vector3(0.03, 0.36, -0.93);     // where the moon disc hangs in the sky (between dome and minaret)
export const WALL_FRONT = WALL_Z + 0.25;
// cooler, slightly brighter moonlight than the test scene, so it contrasts with the warm lamps
export const LOOK = { lit: [0.16, 0.21, 0.42] as [number, number, number], shade: [0.06, 0.07, 0.16] as [number, number, number] };


/** where the reflecting pool is */
export const POOL = { x: -0.6, z: 2.2 };

export const buildBeautyWorld = () => {
  const root = new THREE.Group();
  root.add(buildCourtyard({ archX: ARCHES, moonFrom: MOON_FROM, denseStars: true }));
  root.add(buildLamp(MAIN, APEX, WALL_Z));
  for (const x of ARCHES) if (x !== MAIN) root.add(buildLamp(x, APEX, WALL_Z, { lit: LIT.has(x), pool: false, intensity: 1.6, scale: 0.85 }));
  root.add(skyline(), moonDisc(MOON_SEEN));
  root.add(foregroundArch(0.25, 7.2));
  root.add(fountain(POOL.x, POOL.z));
  root.add(palm(-3.0, -2.5, 2.5, 1), palm(3.15, -2.45, 2.2, 4), palm(-3.4, 4.6, 2.6, 2));
  root.add(shrub(-2.3, -2.75, 1), shrub(2.6, -2.8, 0.9), shrub(-2.7, 3.3, 1.1));
  root.add(tileBand(WALL_FRONT, 16, ARCHES.map((x): [number, number] => [x - 0.7, x + 0.7])));
  root.add(panel(0, 3.75, WALL_FRONT));
  root.add(buildMat(MAT.x, MAT.z, MAT.len, MAT.wid));
  const dust = new Dust(new THREE.Vector3(MAIN, 2.45, WALL_Z));
  const mist = new Mist(0, 2);
  root.add(dust.points, mist.group);
  const cast = new Cast();
  root.add(cast.root);
  return { root, cast, dust, mist };
};
