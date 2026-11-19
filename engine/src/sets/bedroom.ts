// The Traveller's bedroom: a bed with a blanket and pillow, a nightstand with his phone, a window, curtains, a
// wardrobe, a rug and a small framed 8-point star. Local coordinates: floor y = 0, the back wall at z = -2.2, the
// open side toward +z (where the camera stands).
// States: "dawn" (pre-dawn blue), "dawnAlarm" (the phone on the nightstand lights up), "morning" (bright),
// "night" (dark, his phone lights his face), "nightOff" (the phone is off: almost dark).
// Where he goes (the Traveller is a card; the blanket and pillow are drawn ON him, so no 3D part passes through him):
// LYING  wide card resting on the mattress, his head at the pillow end   SIT  wide card, sitting up against the headboard
// EDGE   sitting on the front edge of the bed, feet on the floor          STAND  beside the bed
import * as THREE from "three";
import { ctex } from "../draw/paint";
import { GRADE_NIGHT } from "../render/grade";
import type { V3 } from "../camera/ease";
import { StorySet, SetLook, GRADE_DAY, mat, glow, box, plane, cyl, sun, planks, lightBeam, dust } from "./common";

export const BEDROOM = {
  // EDGE and STAND are on the rug: their soles rest on its top (1.3 cm), not inside it
  LYING: [-0.52, 0.55, -1.3] as V3, SIT: [-1.05, 0.55, -1.3] as V3, EDGE: [-0.55, 0.013, -0.22] as V3, STAND: [0.95, 0.013, -0.35] as V3,
  PHONE: [-2.17, 0.57, -1.71] as V3,
};

const windowTex = (state: "dawn" | "morning" | "night") => ctex("bedWindow|" + state, 256, 256, (g, r) => {
  const sky = { dawn: ["#0f1c3f", "#3d4f86"], morning: ["#8fc4ef", "#f3e0b8"], night: ["#070b1d", "#16203f"] }[state];
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  // distant rooftops, with a few lit windows at dawn and night
  g.fillStyle = state === "morning" ? "#7d8db0" : "#0a0f22";
  let x = 0;
  while (x < 256) { const w = 20 + r() * 40, h = 40 + r() * 70; g.fillRect(x, 256 - h, w, h); x += w + 2; }
  if (state !== "morning") for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? "#f2c879" : "#d7e2ff"; g.fillRect(r() * 256, 150 + r() * 100, 3, 4); }
  if (state === "night") { g.fillStyle = "#f4f1e4"; g.beginPath(); g.arc(196, 52, 13, 0, Math.PI * 2); g.fill(); }
});

const starFrame = () => ctex("bedStar", 256, 256, (g) => {
  g.fillStyle = "#1f3b73"; g.fillRect(0, 0, 256, 256);
  const R = 92, ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  g.beginPath();
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8 - Math.PI / 2, rr = k % 2 ? ri : R; const px = 128 + rr * Math.cos(a), py = 128 + rr * Math.sin(a); if (k) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.fillStyle = "#c79c48"; g.fill();
});

export const buildBedroom = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const wall = mat("#b9a68d"), wood = mat("#7a5236"), woodDark = mat("#5e3f2a"), linen = mat("#e9e3d6");
  // floor, walls
  const boards = planks("#8a6446"); boards.repeat.set(4.5, 4.5);
  plane(root, 9, 9, mat("#ffffff", { map: boards }), [0, 0, 0.3], 0, -Math.PI / 2);
  box(root, [-4.2, -0.02, -2.42], [4.2, 2.9, -2.2], wall);
  box(root, [-3.2, -0.02, -2.42], [-3.0, 2.9, 3.0], wall);
  box(root, [-3.0, 0, -2.2], [4.2, 0.1, -2.17], woodDark, false); // skirting board
  // window, frame, curtains
  const pane = plane(root, 1.3, 1.2, glow("#ffffff", 1, windowTex("dawn")), [1.05, 1.6, -2.19]);
  const fr = mat("#e8e2d6");
  box(root, [0.36, 0.96, -2.2], [1.74, 1.02, -2.1], fr); box(root, [0.36, 2.18, -2.2], [1.74, 2.24, -2.1], fr);
  box(root, [0.36, 0.96, -2.2], [0.42, 2.24, -2.1], fr); box(root, [1.68, 0.96, -2.2], [1.74, 2.24, -2.1], fr);
  box(root, [1.02, 1.0, -2.2], [1.08, 2.2, -2.13], fr);
  const curtain = mat("#4a5d8a");
  box(root, [0.05, 0.7, -2.18], [0.38, 2.55, -2.05], curtain); box(root, [1.72, 0.7, -2.18], [2.05, 2.55, -2.05], curtain);
  // bed
  box(root, [-1.75, 0, -2.0], [0.45, 0.38, -0.6], wood);
  box(root, [-1.72, 0.38, -1.96], [0.42, 0.55, -0.64], linen);
  box(root, [-1.86, 0, -2.0], [-1.72, 1.15, -0.6], woodDark);
  // (no 3D pillow or blanket: they are drawn on his card, so nothing 3D passes through him)
  // nightstand, lamp, phone
  box(root, [-2.45, 0, -1.95], [-1.9, 0.55, -1.45], wood);
  cyl(root, 0.07, 0.09, 0.06, mat("#c9b8a0"), [-2.35, 0.58, -1.86]);
  cyl(root, 0.015, 0.015, 0.22, mat("#c9b8a0"), [-2.35, 0.7, -1.86], 6);
  cyl(root, 0.08, 0.13, 0.15, mat("#efe3c9"), [-2.35, 0.86, -1.86]);
  box(root, [-2.24, 0.55, -1.76], [-2.1, 0.565, -1.66], mat("#1b1d24"));
  const phoneScreen = plane(root, 0.12, 0.08, glow("#cfe6ff", 2.2), [BEDROOM.PHONE[0], 0.567, BEDROOM.PHONE[2]], 0, -Math.PI / 2);
  // rug, wardrobe, the framed star
  box(root, [-1.4, 0, -0.45], [1.4, 0.012, 1.0], mat("#7a3b38"), false);
  box(root, [2.05, 0, -2.18], [3.1, 2.25, -1.5], wood);
  box(root, [2.55, 0.1, -1.51], [2.6, 2.15, -1.49], woodDark, false);
  box(root, [-0.85, 1.42, -2.2], [-0.25, 2.02, -2.15], fr);
  plane(root, 0.52, 0.52, mat("#ffffff", { map: starFrame() }), [-0.55, 1.72, -2.145]);

  // richer room: bookshelf with books, a chair with his jacket, a ceiling light, a rolled prayer mat in the corner
  box(root, [-2.95, 0, -2.18], [-2.35, 1.9, -1.88], wood);
  for (const y of [0.45, 0.95, 1.45]) box(root, [-2.93, y, -2.16], [-2.37, y + 0.03, -1.9], woodDark, false);
  let bs = 3; const br = () => { bs = (bs * 16807) % 2147483647; return (bs - 1) / 2147483646; };
  for (const y of [0.48, 0.98, 1.48]) { let x = -2.9; while (x < -2.45) { const w = 0.04 + br() * 0.05, h = 0.22 + br() * 0.18;
    box(root, [x, y, -2.12], [x + w, y + h, -1.94], mat(["#7a2f2c", "#2f5d8a", "#c79c48", "#3f6b4b", "#e8e2cf", "#5f4a7a"][Math.floor(br() * 6)]), false); x += w + 0.01; } }
  box(root, [2.2, 0.45, -1.0], [2.65, 0.5, -0.55], wood); box(root, [2.2, 0.5, -1.0], [2.25, 1.0, -0.55], wood);
  for (const [x, z] of [[2.22, -0.98], [2.62, -0.98], [2.22, -0.57], [2.62, -0.57]]) box(root, [x - 0.02, 0, z - 0.02], [x + 0.02, 0.45, z + 0.02], woodDark);
  box(root, [2.22, 0.55, -0.98], [2.3, 0.95, -0.6], mat("#3a4256"), false); // his jacket over the chair back
  cyl(root, 0.22, 0.26, 0.08, mat("#efe3c9"), [0, 2.86, -0.6]);
  const rolled = cyl(root, 0.07, 0.07, 0.7, mat("#7e1a22"), [-2.75, 0.35, -1.1], 14); rolled.rotation.z = 0.08; // rolled prayer mat, unused
  // the morning light through the window, and dust in it
  const beam = lightBeam(root, [1.05, 1.6, -2.15], [0.2, 0.0, -0.2], 1.0, 1.8, "#ffe8c2", 0.32);
  const beamNight = lightBeam(root, [1.05, 1.7, -2.15], [0.6, 0.0, -0.5], 0.9, 1.5, "#9fb4e8", 0.12);
  const motes = dust(root, [-0.6, 0.3, -1.9], [1.8, 2.2, 0.3], 160, "#ffe6c0", 0.016, 1.1);
  const s = sun(root, [-0.5, 0.6, -1.2], 6);
  const phoneLight = new THREE.PointLight("#cfe1ff", 0, 0, 2); phoneLight.position.set(-2.17, 0.75, -1.5); root.add(phoneLight);
  const handLight = new THREE.PointLight("#c9dcff", 0, 0, 2); handLight.position.set(-0.75, 1.15, -0.95); root.add(handLight);
  const tex = { dawn: windowTex("dawn"), morning: windowTex("morning"), night: windowTex("night") };

  const apply = (state: string, t: number): SetLook => {
    const pm = pane.material as THREE.MeshBasicMaterial;
    phoneScreen.visible = state === "dawnAlarm";
    phoneLight.intensity = state === "dawnAlarm" ? 0.55 * (0.8 + 0.2 * Math.sin(t * 40)) : 0;
    handLight.intensity = state === "night" ? 0.32 : 0;
    motes.update(t);
    beam.setLevel(state === "morning" ? 1 : 0); beamNight.setLevel(state === "dawn" || state === "dawnAlarm" ? 0.9 : state === "night" ? 0.6 : 0);
    motes.points.visible = state === "morning";
    if (state === "morning") {
      pm.map = tex.morning; pm.color.setScalar(1.25); s.setFrom([0.8, 1.3, 1.2]);
      return { lit: [1.1, 1.0, 0.86], shade: [0.36, 0.36, 0.48], lift: [0.02, 0.02, 0.04], sat: 1.0, charTint: [1, 0.96, 0.9], cardGain: 1.0, grade: GRADE_DAY, fog: ["#e9dcc6", 4, 16] };
    }
    s.setFrom([0.6, 1.2, 1.4]);
    if (state === "night" || state === "nightOff") {
      pm.map = tex.night; pm.color.setScalar(state === "night" ? 0.8 : 0.55);
      const k = state === "night" ? 1 : 0.8;
      return { lit: [0.07 * k, 0.08 * k, 0.15 * k], shade: [0.03, 0.035, 0.08], lift: [0.005, 0.006, 0.015], sat: 0.85,
        charTint: [0.72, 0.8, 1.0], cardGain: state === "night" ? 0.42 : 0.3, cardPointK: 1.4, grade: GRADE_NIGHT };
    }
    pm.map = tex.dawn; pm.color.setScalar(0.9);
    return { lit: [0.22, 0.24, 0.42], shade: [0.07, 0.08, 0.16], lift: [0.01, 0.012, 0.03], sat: 0.9, charTint: [0.72, 0.8, 1.0], cardGain: 0.62, grade: GRADE_NIGHT };
  };
  return { id: "bedroom", root, offset, apply };
};
