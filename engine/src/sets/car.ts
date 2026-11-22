// A taxi stuck in traffic: he sits in the back seat on a call, seen from outside through the open rear window. Around
// it, a jam of cars with glowing brake lights, a bus, towers; the sun crosses the sky during the time-lapse (state
// "lapse:<minutes>", morning -> sunset, the light warming and dropping continuously).
// Local coordinates: the taxi points along +x, centred at z = 0; he sits at SEAT (the card's soles on the car's floor);
// cameras stand toward +z (his near side).
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { StorySet, SetLook, GRADE_DAY, GRADE_DUSK, gradeSteps, mat, glow, box, plane, cyl, sun, skyDome, facade } from "./common";

export const CAR = { SEAT: [-0.35, 0.3, 0.0] as V3 };

const GRADES = gradeSteps(GRADE_DAY, GRADE_DUSK);

const carBody = (parent: THREE.Object3D, colour: string, x: number, z: number, brake = true) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const body = mat(colour), dark = mat("#20242c");
  box(g, [-2.1, 0.3, -0.85], [2.1, 1.0, 0.85], body);
  box(g, [-1.1, 1.0, -0.78], [1.0, 1.5, 0.78], mat("#2a3446"));
  box(g, [-1.15, 1.48, -0.8], [1.05, 1.56, 0.8], body);
  for (const xx of [-1.35, 1.35]) for (const zz of [-0.86, 0.86]) { const w = cyl(g, 0.33, 0.33, 0.2, dark, [xx, 0.33, zz], 14); w.rotation.x = Math.PI / 2; }
  if (brake) for (const zz of [-0.62, 0.62]) box(g, [-2.12, 0.72, zz - 0.16], [-2.08, 0.86, zz + 0.16], glow("#ff2b1f", 2.6), false);
  return g;
};

export const buildCar = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  plane(root, 200, 40, mat("#3c3f47"), [0, 0, 0], 0, -Math.PI / 2);
  for (let x = -60; x < 60; x += 6) box(root, [x, 0.001, 2.9], [x + 3, 0.012, 3.0], mat("#e8e2cf"), false);
  box(root, [-100, 0, -7.5], [100, 0.15, -5.5], mat("#8e8b84"));
  // the taxi he is in: lower body (doors) to y 0.98, pillars, the roof, the TAXI sign; the windows are open
  const yellow = mat("#f2b632"), trim = mat("#1d2027"), inside = mat("#2a2422");
  box(root, [-2.15, 0.3, -0.86], [2.15, 0.98, -0.74], yellow);                // far doors
  box(root, [-2.15, 0.3, 0.74], [2.15, 0.98, 0.86], yellow);                  // near doors (he is seen over them)
  box(root, [1.0, 0.3, -0.74], [2.15, 1.0, 0.74], yellow);                    // bonnet
  box(root, [-2.15, 0.3, -0.74], [-1.5, 1.0, 0.74], yellow);                  // boot
  box(root, [-1.5, 0.28, -0.74], [1.0, 0.3, 0.74], inside, false);            // floor
  box(root, [-1.25, 1.76, -0.84], [1.0, 1.84, 0.84], yellow);                 // roof (a tall cab: his kufi clears it)
  for (const [x0, x1] of [[0.92, 1.02], [-0.12, -0.04], [-1.28, -1.16]] as [number, number][]) for (const z of [-0.84, 0.78]) box(root, [x0, 0.98, z], [x1, 1.76, z + 0.06], trim);
  box(root, [-0.25, 1.84, -0.25], [0.25, 2.02, 0.25], mat("#f4f1e8")); box(root, [-0.26, 1.88, 0.252], [0.26, 1.98, 0.256], glow("#1d2027", 1), false);
  box(root, [-0.86, 0.3, -0.72], [-0.64, 1.28, 0.72], inside);               // the back seat's backrest, just behind his back
  box(root, [-1.16, 0.3, -0.72], [-0.86, 0.62, 0.72], inside, false);        // the boot bulkhead below the rear window
  box(root, [0.35, 0.3, -0.72], [0.5, 1.15, 0.72], inside);                   // the front seats' backs, in front of his knees
  for (const xx of [-1.35, 1.35]) for (const zz of [-0.87, 0.87]) { const w = cyl(root, 0.33, 0.33, 0.2, trim, [xx, 0.33, zz], 14); w.rotation.x = Math.PI / 2; }
  // the jam: cars ahead and in the far lane with brake lights on, a bus, buildings beyond
  const COLS = ["#b8423b", "#e6e1d4", "#2f5d8a", "#3a3d45", "#7a8fa8", "#3f6b4b"];
  [5.2, 10.6, 16.0, 21.4, -5.4, -10.8, -16.2].forEach((x, i) => carBody(root, COLS[i % COLS.length], x, 0));
  [2.5, 8.0, 13.5, 19.0, -3.0, -8.5].forEach((x, i) => carBody(root, COLS[(i + 3) % COLS.length], x, -3.6));
  const bus = new THREE.Group(); bus.position.set(-13.5, 0, -3.6); root.add(bus); // in the far lane (the camera stands in the near one)
  box(bus, [-5.6, 0.35, -1.25], [5.6, 3.0, 1.25], mat("#4D312C")); box(bus, [-5.0, 1.55, -1.27], [5.3, 2.45, -1.24], mat("#24324a"), false);
  for (let x = -40; x < 40;) { const w = 8 + (x * 7 % 5), h = 14 + ((x * 13) % 4) * 4;
    box(root, [x, 0, -16], [x + w - 0.4, h, -10], mat("#ffffff", { map: facade("car" + w + h, "#b9b4ad", 4, 6, 0.3) })); x += w; }
  const sky = skyDome(root, 150);
  const s = sun(root, [0, 0.5, 0], 9);
  const apply = (state: string): SetLook => {
    const min = Number(state.split(":")[1] ?? 840);
    const k = Math.max(0, Math.min(1, (min - 9.5 * 60) / ((18.4 - 9.5) * 60))); // 0 morning .. 1 sunset
    const el = Math.sin(Math.PI * (0.25 + 0.6 * k)) * (1 - 0.75 * k);             // the sun's height
    s.setFrom([-1.2 + 2.2 * k, 0.25 + 1.2 * el, 0.9]);
    const top = new THREE.Color("#4f8fd8").lerp(new THREE.Color("#3b2a55"), k), hor = new THREE.Color("#cfe2f2").lerp(new THREE.Color("#f08a4b"), k);
    sky.setColours("#" + top.getHexString(), "#" + hor.getHexString());
    const L = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
    return { lit: L([1.12, 1.08, 0.98], [1.3, 0.86, 0.6]), shade: L([0.34, 0.36, 0.52], [0.26, 0.24, 0.42]), lift: [0.02, 0.02, 0.04], sat: 1.02,
      charTint: L([1, 0.98, 0.95], [1, 0.88, 0.76]), cardGain: 1.0, grade: GRADES[Math.round(k * 8)], fog: ["#" + hor.clone().lerp(new THREE.Color("#c9d4e2"), 0.4).getHexString(), 12, 70] };
  };
  return { id: "car", root, offset, apply };
};
