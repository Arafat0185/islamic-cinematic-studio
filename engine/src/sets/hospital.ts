// A hospital-like room at night: pale green-grey walls, a hospital bed (frame, mattress, pillow, folded sheet), an IV
// stand, a heart monitor on a stand (a live screen: a soft green line), a tall window with the night city and rain, a
// visitor's chair, a door with light under it, a ceiling panel light. Nobody but him; no faces anywhere.
// Local coordinates: the bed's head against the back wall (z = -2.4), the bed along z; cameras toward +z.
// States: "on" (the ceiling light on, the monitor on), "dark" (the light out, the monitor off, only the cold window
// light), with t driving the monitor's line.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, plane, cyl, sun, liveCanvas, lightBeam } from "./common";

/** BED: the mattress top centre; LYING: where a lying card rests (its pivot); MONITOR: the screen centre */
export const HOSPITAL = { BED: [0.0, 0.72, -1.25] as V3, LYING: [-0.05, 0.74, -1.45] as V3, MONITOR: [0.95, 1.45, -2.1] as V3, WINDOW: [-1.6, 1.5, -2.38] as V3 };

const nightCity = () => ctex("hospWindow", 256, 384, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#0b1222"); gr.addColorStop(1, "#1d2a44");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
  let x = 0; g.fillStyle = "#080c18";
  while (x < 256) { const w = 20 + r() * 50, h = 90 + r() * 170; g.fillRect(x, 384 - h, w, h); x += w + 3; }
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.6 ? "rgba(240,210,150,0.55)" : "rgba(190,210,255,0.4)"; g.fillRect(r() * 256, 160 + r() * 220, 3, 4); }
});

export const buildHospital = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const wall = mat("#9aa79c"), floorM = mat("#6f7570"), metal = mat("#c4c8cc"), white = mat("#e6e8e4"), dark = mat("#2c3036");
  plane(root, 9, 9, floorM, [0, 0, 0.5], 0, -Math.PI / 2);
  box(root, [-3.2, -0.02, -2.62], [3.2, 3.0, -2.4], wall);                       // back wall
  box(root, [-3.2, -0.02, -2.4], [-3.0, 3.0, 3.0], wall);                        // left wall
  box(root, [2.8, -0.02, -2.4], [3.0, 3.0, 3.0], wall);                          // right wall (the door's)
  box(root, [-3.2, 3.0, -2.62], [3.0, 3.1, 3.0], mat("#c9ccc6"));                // ceiling
  box(root, [-3.0, 0, -2.4], [2.8, 0.12, -2.36], mat("#7f8a80"), false);         // skirting
  // the window, its frame, a half-drawn curtain
  const W = HOSPITAL.WINDOW;
  plane(root, 1.1, 1.6, glow("#ffffff", 0.8, nightCity()), [W[0], W[1], -2.39]);
  const fr = mat("#d6dad4");
  box(root, [W[0] - 0.6, W[1] - 0.84, -2.4], [W[0] + 0.6, W[1] - 0.78, -2.3], fr); box(root, [W[0] - 0.6, W[1] + 0.78, -2.4], [W[0] + 0.6, W[1] + 0.84, -2.3], fr);
  box(root, [W[0] - 0.6, W[1] - 0.8, -2.4], [W[0] - 0.54, W[1] + 0.8, -2.3], fr); box(root, [W[0] + 0.54, W[1] - 0.8, -2.4], [W[0] + 0.6, W[1] + 0.8, -2.3], fr);
  box(root, [W[0] - 0.03, W[1] - 0.8, -2.4], [W[0] + 0.03, W[1] + 0.8, -2.34], fr);
  box(root, [W[0] - 1.0, 0.5, -2.36], [W[0] - 0.55, 2.55, -2.26], mat("#6d7f8a"));
  // the bed: frame, mattress, pillow, a folded sheet at the foot, rails
  const B = HOSPITAL.BED;
  box(root, [B[0] - 0.5, 0.45, B[2] - 1.05], [B[0] + 0.5, 0.58, B[2] + 1.05], metal);
  box(root, [B[0] - 0.47, 0.58, B[2] - 1.02], [B[0] + 0.47, 0.72, B[2] + 1.02], white);
  box(root, [B[0] - 0.52, 0.45, B[2] - 1.12], [B[0] + 0.52, 1.15, B[2] - 1.05], metal);    // head board
  box(root, [B[0] - 0.52, 0.45, B[2] + 1.05], [B[0] + 0.52, 0.85, B[2] + 1.12], metal);    // foot board
  for (const [x, z] of [[-0.45, -1.0], [0.45, -1.0], [-0.45, 1.0], [0.45, 1.0]]) cyl(root, 0.03, 0.03, 0.45, metal, [B[0] + x, 0.225, B[2] + z], 8);
  for (const s of [-1, 1]) box(root, [B[0] + s * 0.5 - 0.015, 0.75, B[2] - 0.6], [B[0] + s * 0.5 + 0.015, 0.8, B[2] + 0.3], metal); // rails
  const pillow = box(root, [B[0] - 0.32, 0.72, B[2] - 1.0], [B[0] + 0.32, 0.84, B[2] - 0.62], white); pillow.name = "hospPillow";
  const sheet = box(root, [B[0] - 0.46, 0.72, B[2] + 0.62], [B[0] + 0.46, 0.76, B[2] + 1.0], mat("#a9b8c4")); sheet.name = "hospSheet"; // folded sheet (both hidden while he lies there: his card draws his own)
  // the IV stand and the monitor
  cyl(root, 0.015, 0.015, 1.9, metal, [B[0] - 0.75, 0.95, B[2] - 0.8], 8);
  cyl(root, 0.2, 0.2, 0.03, metal, [B[0] - 0.75, 0.02, B[2] - 0.8], 12);
  box(root, [B[0] - 0.83, 1.55, B[2] - 0.82], [B[0] - 0.67, 1.8, B[2] - 0.76], mat("#cfe3ea"));
  const M = HOSPITAL.MONITOR;
  cyl(root, 0.025, 0.025, 1.2, metal, [M[0], 0.6, M[2] + 0.1], 8);
  box(root, [M[0] - 0.24, M[1] - 0.18, M[2] - 0.04], [M[0] + 0.24, M[1] + 0.18, M[2] + 0.06], dark);
  const screen = liveCanvas(256, 192);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), glow("#ffffff", 1.1, screen.tex));
  scr.position.set(M[0], M[1], M[2] + 0.065); scr.rotation.y = -0.35; root.add(scr);
  // the chair, the door (light under it), the ceiling panel
  box(root, [1.5, 0.42, -0.3], [2.0, 0.48, 0.2], mat("#5a6870")); box(root, [1.95, 0.48, -0.3], [2.0, 0.95, 0.2], mat("#5a6870"));
  for (const [x, z] of [[1.53, -0.27], [1.97, -0.27], [1.53, 0.17], [1.97, 0.17]]) box(root, [x - 0.02, 0, z - 0.02], [x + 0.02, 0.42, z + 0.02], metal);
  box(root, [2.78, 0, 0.6], [2.8, 2.1, 1.6], mat("#b8b0a0"));
  const under = box(root, [2.77, 0.0, 0.62], [2.79, 0.02, 1.58], glow("#ffe2b0", 1.6), false); under.layers.set(NOINK);
  const panel = box(root, [-0.5, 2.98, -1.6], [0.5, 3.0, -0.8], glow("#f4f7fb", 1.0), false);
  const ceiling = new THREE.PointLight("#e6f0ff", 0, 7, 1.4); ceiling.position.set(0, 2.7, -1.2); root.add(ceiling);
  const monL = new THREE.PointLight("#9fffd0", 0, 3, 2); monL.position.set(M[0] - 0.2, M[1], M[2] + 0.4); root.add(monL);
  const coldL = new THREE.PointLight("#9fb6e8", 0, 7, 1.4); coldL.position.set(W[0] + 0.6, W[1] + 0.3, -1.8); root.add(coldL);
  const coldBeam = lightBeam(root, [W[0], W[1] + 0.3, -2.3], [W[0] + 1.1, 0.0, -0.6], 0.9, 1.7, "#9fb6e8", 0.16);
  const s = sun(root, [0, 0.7, -1.2], 5); s.setFrom([-0.9, 1.0, 1.0]);

  const drawMonitor = (on: boolean, t: number) => screen.redraw((g) => {
    g.fillStyle = "#06100c"; g.fillRect(0, 0, 256, 192);
    if (!on) return;
    g.strokeStyle = "rgba(120,255,180,0.9)"; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= 256; x += 2) {
      const ph = ((x / 256) * 2 + t * 0.9) % 1, beat = ph > 0.42 && ph < 0.5 ? Math.sin((ph - 0.42) / 0.08 * Math.PI) * (ph < 0.46 ? 1 : -0.4) : 0;
      const y = 110 - 60 * beat; if (x) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = "rgba(120,255,180,0.8)"; g.fillRect(14, 20, 40, 6); g.fillRect(14, 32, 26, 6); g.fillRect(200, 20, 40, 14);
  });
  const apply = (state: string, t: number): SetLook => {
    const on = state === "on";
    drawMonitor(on, t);
    ceiling.intensity = on ? 2.2 : 0; monL.intensity = on ? 0.5 : 0;
    (panel.material as THREE.MeshBasicMaterial).color.set("#f4f7fb").multiplyScalar(on ? 1.0 : 0.08);
    coldBeam.setLevel(on ? 0.6 : 1.6); coldL.intensity = on ? 0 : 1.6;
    return on
      ? { lit: [0.55, 0.6, 0.64], shade: [0.2, 0.22, 0.27], lift: [0.01, 0.012, 0.02], sat: 0.8, charTint: [0.85, 0.9, 1.0], cardGain: 0.7, cardPointK: 1.2, pointK: 1.1, grade: GRADE_NIGHT, fog: ["#1a2230", 4, 14] }
      : { lit: [0.16, 0.18, 0.26], shade: [0.05, 0.06, 0.09], lift: [0.008, 0.01, 0.018], sat: 0.75, charTint: [0.7, 0.78, 1.0], cardGain: 0.45, cardPointK: 1.2, pointK: 1.1, grade: GRADE_NIGHT, fog: ["#0c111c", 3, 11] };
  };
  return { id: "hospital", root, offset, apply };
};
