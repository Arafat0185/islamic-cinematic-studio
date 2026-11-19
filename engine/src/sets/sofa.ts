// The living room at night: he sits on the sofa, lit by his phone. A low sofa, a side lamp, a coffee table with a mug,
// a wall clock whose hands follow the time-lapse, a window onto the night city, a rug, a plant; the TV off. The light
// goes from dusk to night during the time-lapse (state "lapse:<minutes>"); his phone's cold glow grows as the room
// darkens.
// Local coordinates: the sofa runs along z with its seat front at x = 0.25; he sits at SEAT facing +x; cameras toward +z.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT } from "../render/grade";
import { ctex } from "../draw/paint";
import { StorySet, SetLook, GRADE_DUSK, gradeSteps, mat, glow, box, plane, cyl, planks } from "./common";

export const SOFA = { SEAT: [0.0, 0.0, 0.0] as V3, PHONE: [0.26, 0.8, 0.02] as V3 /* where the "phone" sitting pose holds it */, CLOCK: [-0.9, 2.15, -2.4] as V3 };

const nightCity = (dusk: boolean) => ctex("sofaWindow|" + dusk, 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (dusk) { gr.addColorStop(0, "#2f3a6b"); gr.addColorStop(1, "#e08a5a"); } else { gr.addColorStop(0, "#060914"); gr.addColorStop(1, "#141c38"); }
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#0a0e1c"; let x = 0; while (x < 256) { const w = 18 + r() * 34, h = 60 + r() * 120; g.fillRect(x, 256 - h, w, h); x += w + 3; }
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.6 ? "#f6c978" : "#cfe0ff"; g.fillRect(r() * 256, 110 + r() * 140, 3, 4); }
});

const LAPSE_GRADES = gradeSteps(GRADE_DUSK, GRADE_NIGHT);

export const buildSofa = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const boards = planks("#6e4e38"); boards.repeat.set(4, 4);
  plane(root, 10, 10, mat("#ffffff", { map: boards }), [0, 0, 0], 0, -Math.PI / 2);
  box(root, [-5, -0.02, -2.7], [5, 3.0, -2.5], mat("#6b5a52"));
  box(root, [-1.6, -0.02, -2.7], [-1.4, 3.0, 4.0], mat("#6b5a52"));
  box(root, [-1.2, 0, -1.6], [1.6, 0.01, 1.6], mat("#7a3b38"), false);
  // the sofa: base and seat cushion (top at 0.31, under his thighs; front at x = 0.25), a back and two arms; brand brown fabric
  const fabric = mat("#4D312C"), cushion = mat("#5d3d36");
  box(root, [-0.55, 0.05, -1.2], [0.25, 0.2, 1.2], fabric);
  box(root, [-0.5, 0.2, -1.1], [0.22, 0.31, 1.1], cushion);
  box(root, [-0.75, 0.05, -1.2], [-0.5, 0.9, 1.2], fabric);
  for (const z of [-1.38, 1.18]) box(root, [-0.75, 0.05, z], [0.28, 0.6, z + 0.2], fabric);
  box(root, [-0.5, 0.38, -1.05], [-0.3, 0.7, -0.6], mat("#FB5606"));         // a cushion, far end
  // coffee table, mug, the remote; a side lamp; a plant; the TV (off) on the far wall
  box(root, [0.8, 0.38, -0.6], [1.6, 0.42, 0.6], mat("#7a5236"));
  for (const [x, z] of [[0.85, -0.55], [1.55, -0.55], [0.85, 0.55], [1.55, 0.55]]) box(root, [x - 0.03, 0, z - 0.03], [x + 0.03, 0.38, z + 0.03], mat("#5e3f2a"));
  cyl(root, 0.045, 0.04, 0.1, mat("#e9e1cf"), [1.1, 0.47, 0.2]);
  box(root, [1.3, 0.42, -0.3], [1.48, 0.44, -0.24], mat("#1b1d24"));
  cyl(root, 0.02, 0.02, 1.2, mat("#2a2a2a"), [-0.95, 0.6, -1.85], 8);
  const shade = cyl(root, 0.18, 0.24, 0.3, glow("#ffcf8a", 1.3), [-0.95, 1.3, -1.85], 16); void shade;
  const lampL = new THREE.PointLight("#ffbf74", 2.0, 6, 1.8); lampL.position.set(-0.95, 1.25, -1.85); root.add(lampL);
  cyl(root, 0.18, 0.14, 0.38, mat("#8a4b2e"), [1.4, 0.19, -2.1]);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), mat("#3f6b4b")); bush.position.set(1.4, 0.68, -2.1); bush.castShadow = true; root.add(bush);
  box(root, [2.2, 0.9, -2.5], [3.8, 1.8, -2.44], mat("#121419"));
  // the window onto the city (dusk and night, cross-faded), its frame
  const win = plane(root, 1.5, 1.3, glow("#ffffff", 1.0, nightCity(true)), [0.4, 1.7, -2.49]);
  const winN = plane(root, 1.5, 1.3, new THREE.MeshBasicMaterial({ map: nightCity(false), transparent: true, opacity: 0 }), [0.4, 1.7, -2.485]);
  for (const [a, b] of [[[-0.38, 1.02], [1.18, 1.08]], [[-0.38, 2.32], [1.18, 2.38]], [[-0.38, 1.02], [-0.32, 2.38]], [[1.12, 1.02], [1.18, 2.38]]] as [number[], number[]][]) box(root, [a[0], a[1], -2.5], [b[0], b[1], -2.42], mat("#e8e2d6"));
  // the wall clock: its hands follow the time-lapse
  const clock = new THREE.Group(); clock.position.set(...SOFA.CLOCK); root.add(clock);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 32), mat("#f2eee3")); face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 32), mat("#4D312C")); rim.position.z = 0.02; clock.add(rim);
  const hand = (l: number, w: number) => { const p = new THREE.Group(); p.position.z = 0.03; clock.add(p); box(p, [-w / 2, -0.02, 0], [w / 2, l, 0.01], mat("#221a18"), false); return p; };
  const hh = hand(0.13, 0.03), mh = hand(0.2, 0.02);
  // his phone's light on him (a cold point light in front of his face)
  const phoneL = new THREE.PointLight("#bcd4ff", 0, 3, 2); phoneL.position.set(SOFA.PHONE[0] + 0.15, SOFA.PHONE[1] + 0.1, 0.25); root.add(phoneL);
  const moon = new THREE.DirectionalLight("#9fb4e8", 0.4); moon.position.set(0.5, 5, 3); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); moon.target.position.set(0, 0, 0); root.add(moon, moon.target);
  const apply = (state: string, t: number): SetLook => {
    const min = Number(state.split(":")[1] ?? 1300);
    const k = Math.max(0, Math.min(1, (min - 18.3 * 60) / ((22.7 - 18.3) * 60))); // 0 dusk .. 1 night
    (winN.material as THREE.MeshBasicMaterial).opacity = k; (win.material as THREE.MeshBasicMaterial).color.setScalar(1.0 - 0.3 * k);
    mh.rotation.z = -((min % 60) / 60) * Math.PI * 2; hh.rotation.z = -(((min / 60) % 12) / 12) * Math.PI * 2;
    phoneL.intensity = (0.6 + 1.4 * k) * (1 + 0.06 * Math.sin(t * 13));
    lampL.intensity = 2.0 - 0.6 * k;
    const L = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
    return { lit: L([0.6, 0.48, 0.44], [0.1, 0.1, 0.18]), shade: L([0.2, 0.17, 0.24], [0.035, 0.04, 0.08]), lift: [0.006, 0.006, 0.014], sat: 0.95,
      charTint: L([1, 0.92, 0.86], [0.8, 0.86, 1.0]), cardGain: 0.8 - 0.35 * k, cardPointK: 1.5, pointK: 1.2, grade: LAPSE_GRADES[Math.round(k * 8)] };
  };
  return { id: "sofa", root, offset, apply };
};
