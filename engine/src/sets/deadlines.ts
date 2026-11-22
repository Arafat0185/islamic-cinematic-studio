// The wall of deadlines: a long office corridor wall covered floor to ceiling in calendar pages (red circles, crossed-out
// days, DUE stamps) and sticky notes, under hard, cool strip lights; a wall clock; a fluorescent hum. He rushes along it.
// Local coordinates: the wall's face at z = -0.3, he walks along +x at z = 0.6; cameras stand toward +z.
// State: "on".
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { ctex } from "../draw/paint";
import { StorySet, SetLook, GRADE_DAY, mat, glow, box, plane, lightBeam } from "./common";

export const DEADLINES = { WALK_Z: 0.6 };

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const calendarWall = () => {
  const t = ctex("deadlineWall", 2048, 1024, (g, r) => {
    g.fillStyle = "#cfd3d8"; g.fillRect(0, 0, 2048, 1024);
    // calendar pages, overlapping, slightly rotated
    for (let k = 0; k < 46; k++) {
      const x = (k % 12) * 172 + r() * 40 - 20, y = Math.floor(k / 12) * 250 + r() * 40 - 10, a = (r() - 0.5) * 0.12;
      g.save(); g.translate(x + 80, y + 110); g.rotate(a);
      g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(-76, -104, 160, 220);
      g.fillStyle = "#fbfaf6"; g.fillRect(-80, -110, 160, 220);
      g.fillStyle = "#4D312C"; g.fillRect(-80, -110, 160, 34);
      g.fillStyle = "#ffffff"; g.font = "800 22px Inter, Arial"; g.fillText(MONTHS[k % 12], -66, -85);
      g.strokeStyle = "#d4d0c8"; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) g.strokeRect(-74 + i * 21, -68 + j * 34, 21, 34);
      for (let n = 0; n < 9; n++) { // crossed-out days
        const i = Math.floor(r() * 7), j = Math.floor(r() * 5), cx = -74 + i * 21, cy = -68 + j * 34;
        g.strokeStyle = "#5b5b66"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + 3, cy + 4); g.lineTo(cx + 18, cy + 30); g.moveTo(cx + 18, cy + 4); g.lineTo(cx + 3, cy + 30); g.stroke();
      }
      const i = Math.floor(r() * 7), j = Math.floor(r() * 5); // the deadline, circled in red
      g.strokeStyle = "#E5484D"; g.lineWidth = 4; g.beginPath(); g.ellipse(-63 + i * 21, -51 + j * 34, 16, 20, 0.2, 0, Math.PI * 2); g.stroke();
      if (r() < 0.45) { g.save(); g.rotate(-0.25); g.strokeStyle = "#E5484D"; g.lineWidth = 4; g.strokeRect(-48, 40, 96, 38); g.fillStyle = "#E5484D"; g.font = "900 28px Inter, Arial"; g.fillText("DUE", -28, 70); g.restore(); }
      g.restore();
    }
  });
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t;
};

export const buildDeadlines = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  plane(root, 40, 12, mat("#5a6068"), [0, 0, 2], 0, -Math.PI / 2);
  // the wall, papered with calendars (two copies side by side), a skirting board, the ceiling
  box(root, [-14, -0.02, -0.6], [14, 3.4, -0.32], mat("#c9ccd2"));
  for (const x of [-6.2, 0, 6.2]) plane(root, 6.2, 3.1, mat("#ffffff", { map: calendarWall() }), [x, 1.62, -0.31]);
  box(root, [-14, 0, -0.33], [14, 0.1, -0.28], mat("#3a3f47"), false);
  box(root, [-14, 3.4, -0.6], [14, 3.48, 4.0], mat("#e3e5e8"));
  // sticky notes standing off the wall (some curling): real thin boxes, so they catch the light and cast shadows
  const NOTE = ["#f7d44a", "#ff9fb2", "#FB5606", "#9ee6a8", "#7fd2ff"];
  let s = 21; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 160; i++) {
    const x = -9 + r() * 18, y = 0.5 + r() * 2.7, sz = 0.16 + r() * 0.06;
    const n = box(root, [x - sz / 2, y - sz / 2, -0.305], [x + sz / 2, y + sz / 2, -0.298], mat(NOTE[Math.floor(r() * NOTE.length)]), false);
    n.rotation.z = (r() - 0.5) * 0.5; n.rotation.x = r() < 0.25 ? -0.25 : 0;
  }
  // a wall clock (hands running fast: deadlines)
  const clock = new THREE.Group(); clock.position.set(1.6, 2.75, -0.29); root.add(clock);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32), mat("#f4f2ec")); face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 32), mat("#222")); rim.position.z = 0.02; clock.add(rim);
  const hand = (l: number, w: number, c: string) => { const p = new THREE.Group(); p.position.z = 0.03; clock.add(p); box(p, [-w / 2, -0.02, 0], [w / 2, l, 0.01], mat(c), false); return p; };
  const hh = hand(0.14, 0.03, "#222"), mh = hand(0.21, 0.02, "#222");
  // the strip lights (glowing) and their hard, cool light
  for (let x = -12; x <= 12; x += 2.4) box(root, [x - 0.7, 3.36, 0.3], [x + 0.7, 3.4, 0.5], glow("#eaf3ff", 1.6), false);
  const beams = [-4.8, -2.4, 0, 2.4, 4.8].map((x) => lightBeam(root, [x, 3.35, 0.4], [x, 0, 0.6], 1.2, 2.2, "#dfeaff", 0.1));
  const keyL = new THREE.DirectionalLight("#eef4ff", 1.0); keyL.position.set(0.5, 6, 6); keyL.castShadow = true; keyL.shadow.mapSize.set(2048, 2048);
  Object.assign(keyL.shadow.camera, { left: -8, right: 8, top: 6, bottom: -2, near: 0.5, far: 30 }); keyL.shadow.bias = -0.0005; keyL.target.position.set(0, 1, 0);
  root.add(keyL, keyL.target);
  const apply = (_state: string, t: number): SetLook => {
    mh.rotation.z = -t * 6; hh.rotation.z = -t * 0.5; void beams;
    return { lit: [1.0, 1.04, 1.12], shade: [0.3, 0.34, 0.46], lift: [0.02, 0.025, 0.04], sat: 0.92, charTint: [0.96, 0.98, 1.04], cardGain: 1.0, grade: GRADE_DAY, fog: ["#c7d0dc", 6, 22] };
  };
  return { id: "deadlines", root, offset, apply };
};
