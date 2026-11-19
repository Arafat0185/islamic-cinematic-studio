// A gym at sunset: a treadmill (its belt really moves, so his planted feet slide back with it), a console with a
// glowing speed readout, a wide window with the sunset, a dumbbell rack, a bench, a mirror strip. Local coordinates:
// he runs on the belt at RUN facing +x; cameras stand toward +z looking -z.
// States: "sunset".
import * as THREE from "three";
import { ctex } from "../draw/paint";
import type { V3 } from "../camera/ease";
import { StorySet, SetLook, GRADE_DUSK, mat, glow, box, plane, cyl, sun, liveCanvas, lightBeam, dust } from "./common";

export const GYM = { RUN: [-0.15, 0.22, -0.9] as V3, BELT_SPEED: 3.2 };

const sunsetWindow = () => ctex("gymWindow", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#3c3f7a"); gr.addColorStop(0.45, "#d9785a"); gr.addColorStop(0.75, "#f2b366"); gr.addColorStop(1, "#f6d29a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "rgba(255,230,180,0.9)"; g.beginPath(); g.arc(360, 205, 30, 0, Math.PI * 2); g.fill();
  let x = 0;
  while (x < 512) { const w = 22 + r() * 46, h = 30 + r() * 90; g.fillStyle = "#3a2f4a"; g.fillRect(x, 256 - h, w, h); x += w + 2; }
});
const beltTex = () => { const t = ctex("belt", 256, 64, (g) => {
  g.fillStyle = "#22252b"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#30343c"; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 10, 64);
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

export const buildGym = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const wall = mat("#4a4d58"), dark = mat("#1e2026"), steel = mat("#9aa0aa");
  plane(root, 9, 9, mat("#2a2c33"), [0, 0, 0.3], 0, -Math.PI / 2);
  box(root, [-4.5, -0.02, -2.72], [4.5, 3.2, -2.5], wall);
  plane(root, 6.0, 1.9, glow("#ffffff", 1.2, sunsetWindow()), [0, 1.8, -2.49]);
  for (const x of [-3.0, -1.5, 0.0, 1.5, 2.94]) box(root, [x, 0.84, -2.5], [x + 0.06, 2.76, -2.42], dark);
  box(root, [-3.0, 0.82, -2.5], [3.0, 0.88, -2.42], dark); box(root, [-3.0, 2.72, -2.5], [3.0, 2.78, -2.42], dark);
  // treadmill: deck, moving belt, side rails, uprights, console with a live readout, handrails
  const [rx, , rz] = GYM.RUN;
  box(root, [rx - 1.0, 0, rz - 0.42], [rx + 1.1, 0.18, rz + 0.42], dark);
  const belt = beltTex();
  const beltMesh = plane(root, 1.9, 0.6, mat("#ffffff", { map: belt }), [rx + 0.05, 0.185, rz], 0, -Math.PI / 2);
  belt.repeat.set(4, 1);
  box(root, [rx - 1.0, 0.18, rz - 0.42], [rx + 1.1, 0.24, rz - 0.32], steel); box(root, [rx - 1.0, 0.18, rz + 0.32], [rx + 1.1, 0.24, rz + 0.42], steel);
  for (const z of [rz - 0.38, rz + 0.38]) { box(root, [rx + 1.0, 0.18, z - 0.03], [rx + 1.08, 1.3, z + 0.03], steel); box(root, [rx + 0.45, 1.0, z - 0.025], [rx + 1.05, 1.05, z + 0.025], steel); }
  box(root, [rx + 0.98, 1.22, rz - 0.4], [rx + 1.12, 1.48, rz + 0.4], dark);
  const con = liveCanvas(256, 128);
  const conMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), glow("#ffffff", 1.4, con.tex));
  conMesh.position.set(rx + 0.975, 1.36, rz); conMesh.rotation.y = -Math.PI / 2; root.add(conMesh);
  // rack, dumbbells, bench, mirror strip, a water bottle
  box(root, [1.9, 0, -2.3], [3.1, 0.9, -1.9], dark);
  for (let i = 0; i < 5; i++) for (const y of [0.5, 0.92]) { const d = cyl(root, 0.07, 0.07, 0.3, mat(["#b8423b", "#2f5d8a", "#c79c48", "#3a3d45", "#3f6b4b"][i]), [2.0 + i * 0.24, y, -2.1], 10); d.rotation.x = Math.PI / 2; }
  box(root, [-2.6, 0.38, -1.5], [-1.4, 0.48, -1.1], mat("#7a2f2c")); box(root, [-2.5, 0, -1.4], [-2.4, 0.38, -1.2], steel); box(root, [-1.6, 0, -1.4], [-1.5, 0.38, -1.2], steel);
  plane(root, 4.0, 0.9, mat("#a9b4c2"), [0, 0.5, -2.49]);
  cyl(root, 0.035, 0.035, 0.22, mat("#5aa0d6"), [rx + 1.05, 1.62, rz + 0.3], 10);
  const s = sun(root, [0, 0.5, -0.9], 6); s.setFrom([-0.6, 0.55, 1.0]);
  const beams = [-2.2, -0.75, 0.75, 2.2].map((x) => lightBeam(root, [x, 2.2, -2.45], [x - 1.2, 0.0, 0.6], 1.2, 1.8, "#ffc48a", 0.2)); void beams;
  const motes = dust(root, [-2.6, 0.3, -2.3], [2.6, 2.4, 0.8], 160, "#ffd7a8", 0.016, 1.0);

  const apply = (_state: string, t: number): SetLook => {
    // the belt runs toward -x at the running speed (1.9 m long, 4 repeats)
    belt.offset.x = ((t * GYM.BELT_SPEED) / 1.9) * 4 % 1;
    motes.update(t);
    con.redraw((g) => {
      g.fillStyle = "#0d1a1c"; g.fillRect(0, 0, 256, 128);
      g.fillStyle = "#7ef0c0"; g.font = "700 46px Inter, Arial"; g.fillText("11.5", 18, 62);
      g.font = "600 20px Inter, Arial"; g.fillText("KM/H", 140, 60);
      g.fillStyle = "#f2c879"; g.font = "600 24px Inter, Arial"; g.fillText(`${23 + Math.floor(t / 60)}:${String(40 + (Math.floor(t) % 20)).padStart(2, "0")}`, 18, 108);
    });
    void beltMesh;
    return { lit: [1.25, 0.82, 0.6], shade: [0.26, 0.24, 0.42], lift: [0.03, 0.02, 0.04], sat: 1.08, charTint: [1, 0.86, 0.74], cardGain: 0.95, grade: GRADE_DUSK, fog: ["#6a4a5a", 4, 16] };
  };
  return { id: "gym", root, offset, apply };
};
