// Camera collision: keeps the camera out of walls, arches and props, and never closer than MARGIN to any surface.
// Two tests against the real scene geometry (only layer 0: walls, floor, props; not the character cards, sky, mist,
// dust or other NOINK things):
//   1. occlusion: a ray from the look point back to the camera. If it hits a surface before reaching the camera, the
//      camera is behind or inside that surface (the "blank wall" frame); it is pulled forward along the ray to just
//      in front of the hit.
//   2. clearance: short rays from the camera in 26 directions. If any surface is closer than MARGIN, the camera is
//      pushed away from it.
// safeCam() returns the corrected camera and what it had to do, so shots can be checked frame by frame
// (cameraReport) and designed so that no correction is ever needed. Objects with userData.noCollide (things meant to
// sweep right past the lens, e.g. video 003's hooks) are ignored.
import * as THREE from "three";
import { Cam, V3 } from "./ease";

export const MARGIN = 0.35;
const DIRS: THREE.Vector3[] = [];
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) DIRS.push(new THREE.Vector3(x, y, z).normalize());

const ray = new THREE.Raycaster(); // tests layer 0 only by default
const P = new THREE.Vector3(), T = new THREE.Vector3(), D = new THREE.Vector3();

export type CamCheck = { cam: Cam; occluded: number; clearance: number; moved: number };

export const safeCam = (root: THREE.Object3D, c: Cam, margin = MARGIN): CamCheck => {
  P.set(...c.pos); T.set(...c.look);
  const start = P.clone();
  // 1. occlusion, from the look point toward the camera (ignore the first 10 cm: the look point may sit on a surface)
  D.copy(P).sub(T);
  const dist = D.length();
  D.normalize();
  ray.set(T, D); ray.near = 0.1; ray.far = dist;
  const hit = ray.intersectObject(root, true).find((h) => !h.object.userData.noCollide);
  let occluded = Infinity;
  if (hit) { occluded = hit.distance; P.copy(T).addScaledVector(D, Math.max(0.1, hit.distance - margin)); }
  // 2. clearance: push away from anything closer than the margin (two passes for corners)
  let clearance = Infinity;
  for (let pass = 0; pass < 2; pass++) {
    for (const d of DIRS) {
      ray.set(P, d); ray.near = 0; ray.far = margin;
      const h = ray.intersectObject(root, true).find((x) => !x.object.userData.noCollide);
      if (!h) continue;
      clearance = Math.min(clearance, h.distance);
      P.addScaledVector(d, -(margin - h.distance));
    }
  }
  return { cam: { ...c, pos: [P.x, P.y, P.z] as V3 }, occluded, clearance, moved: P.distanceTo(start) };
};
