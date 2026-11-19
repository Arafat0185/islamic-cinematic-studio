// An office at midday: a desk with a laptop on a video call (a live screen: four tiles of plain, faceless silhouettes,
// a call timer, notifications), a chair, a big window onto the city, a wall clock whose hands tick in real time, a
// second desk with a glowing monitor, shelves, a plant. Local coordinates: he sits at the desk facing +x (CHAIR);
// cameras stand toward +z looking -z.
// States: "noon"; the screen can show a banner: setBanner(text | null).
import * as THREE from "three";
import { ctex } from "../draw/paint";
import type { V3 } from "../camera/ease";
import { StorySet, SetLook, GRADE_DAY, mat, glow, box, plane, cyl, sun, liveCanvas, lightBeam, dust } from "./common";

export const OFFICE = { CHAIR: [-0.02, 0.0, -0.8] as V3, SCREEN: [0.95, 1.0, -0.8] as V3 };

const skyline = () => ctex("officeWindow", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#86b8e6"); gr.addColorStop(1, "#e8eef0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  let x = 0;
  while (x < 512) {
    const w = 26 + r() * 50, h = 70 + r() * 150;
    g.fillStyle = ["#9eb0c6", "#b5bfcd", "#8fa2ba"][Math.floor(r() * 3)]; g.fillRect(x, 256 - h, w, h);
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = 256 - h + 8; y < 250; y += 12) for (let xx = x + 4; xx < x + w - 6; xx += 9) g.fillRect(xx, y, 4, 6);
    x += w + 3;
  }
});

export const buildOffice = (offset: V3) => {
  const root = new THREE.Group(); root.position.set(...offset);
  const wall = mat("#d7d3cb"), dark = mat("#2c3038"), wood = mat("#a98159"), white = mat("#eeece6");
  const floor = plane(root, 9, 9, mat("#5c6370"), [0, 0, 0.3], 0, -Math.PI / 2); void floor;
  box(root, [-4.5, -0.02, -2.82], [4.5, 3.0, -2.6], wall);
  box(root, [2.8, -0.02, -2.6], [3.0, 3.0, 3.0], wall);
  // window and its frame
  plane(root, 3.6, 1.8, glow("#ffffff", 1.15, skyline()), [-0.55, 1.75, -2.59]);
  const fr = mat("#9aa1ab");
  for (const [a, b] of [[[-2.4, 0.8], [1.3, 0.86]], [[-2.4, 2.64], [1.3, 2.7]]] as [number[], number[]][]) box(root, [a[0], a[1], -2.6], [b[0], b[1], -2.5], fr);
  for (const x of [-2.4, -1.2, 0.0, 1.24]) box(root, [x, 0.8, -2.6], [x + 0.06, 2.7, -2.5], fr);
  // desk, laptop, mug, papers
  box(root, [0.45, 0.71, -1.35], [1.45, 0.75, -0.25], wood);
  for (const [x, z] of [[0.5, -1.3], [1.4, -1.3], [0.5, -0.3], [1.4, -0.3]]) box(root, [x - 0.03, 0, z - 0.03], [x + 0.03, 0.71, z + 0.03], dark);
  const laptop = new THREE.Group(); laptop.position.set(0.82, 0.75, -0.8); laptop.rotation.y = 0.6; // its screen turned toward him and the camera root.add(laptop);
  box(laptop, [-0.17, 0, -0.24], [0.17, 0.02, 0.24], mat("#8e939b"));
  const lid = new THREE.Group(); lid.position.set(0.17, 0.02, 0); lid.rotation.z = 0.28; laptop.add(lid);
  box(lid, [0, 0, -0.24], [0.02, 0.32, 0.24], mat("#8e939b"));
  const screen = liveCanvas(512, 320);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), glow("#ffffff", 1.25, screen.tex));
  scr.position.set(-0.002, 0.16, 0); scr.rotation.y = -Math.PI / 2; lid.add(scr);
  cyl(root, 0.045, 0.04, 0.1, mat("#c79c48"), [1.2, 0.8, -0.45]);
  box(root, [1.05, 0.75, -1.25], [1.35, 0.76, -1.0], white, false);
  // (his chair is drawn on his card, so it never cuts through him)
  // a richer office: a second row of desks with glowing monitors, a whiteboard with sticky notes, a water cooler,
  // a filing cabinet, ceiling light panels
  for (const x of [-3.6, -2.4]) for (const z of [0.9, 2.1]) {
    box(root, [x - 0.55, 0.71, z - 0.35], [x + 0.55, 0.75, z + 0.35], wood);
    box(root, [x - 0.25, 0.75, z - 0.3], [x + 0.25, 1.1, z - 0.26], dark);
    plane(root, 0.46, 0.31, glow("#9fc6ee", 1.0), [x, 0.93, z - 0.255]);
    box(root, [x - 0.03, 0, z - 0.03], [x + 0.03, 0.71, z + 0.03], dark);
  }
  box(root, [-1.0, 1.0, -2.6], [-0.1, 1.65, -2.56], white, false);
  ["#f4d35e", "#f28c8c", "#8ed1a5", "#f4d35e", "#9fc6ee", "#f28c8c"].forEach((c, i) => box(root, [-0.95 + (i % 3) * 0.28, 1.2 + Math.floor(i / 3) * 0.22, -2.56], [-0.8 + (i % 3) * 0.28, 1.35 + Math.floor(i / 3) * 0.22, -2.55], mat(c), false));
  cyl(root, 0.16, 0.16, 0.95, mat("#e6e8ea"), [2.5, 0.48, -1.0]); cyl(root, 0.13, 0.11, 0.35, mat("#9fd0f0"), [2.5, 1.12, -1.0]);
  box(root, [2.2, 0, -2.5], [2.7, 1.25, -2.0], mat("#8e939b"));
  for (const z of [-1.8, 0.2, 2.2]) box(root, [-1.5, 2.94, z - 0.4], [1.5, 2.98, z + 0.4], glow("#f4f7fb", 1.05), false);
  // midday light through the big window, dust in it
  const beams = [-1.8, -0.6, 0.6].map((x) => lightBeam(root, [x, 2.4, -2.55], [x + 0.9, 0.0, -0.6], 1.0, 1.6, "#fff0d6", 0.22));
  const motes = dust(root, [-2.4, 0.4, -2.4], [1.6, 2.4, 0.6], 150, "#fff2dc", 0.016, 1.0);
  // the wall clock: face, rim, ticking hands
  const clock = new THREE.Group(); clock.position.set(1.95, 2.15, -2.58); root.add(clock);
  const face = cyl(clock, 0.28, 0.28, 0.04, white, [0, 0, 0.02], 32); face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 32), dark); rim.position.z = 0.04; clock.add(rim);
  const hand = (len: number, w: number, c: THREE.Material) => { const p = new THREE.Group(); p.position.z = 0.05; clock.add(p); box(p, [-w / 2, -0.02, 0], [w / 2, len, 0.01], c, false); return p; };
  const hourH = hand(0.15, 0.03, dark), minH = hand(0.22, 0.02, dark), secH = hand(0.24, 0.008, mat("#b8423b"));
  // a second desk with a monitor, shelves, a plant
  box(root, [-2.5, 0.71, -2.4], [-1.2, 0.75, -1.8], wood);
  box(root, [-2.1, 0.75, -2.3], [-1.6, 1.12, -2.26], dark);
  plane(root, 0.46, 0.33, glow("#9fc6ee", 1.1), [-1.85, 0.94, -2.255]);
  box(root, [2.2, 1.3, -2.6], [2.78, 1.33, -2.25], wood); box(root, [2.2, 1.75, -2.6], [2.78, 1.78, -2.25], wood);
  ["#2f5d8a", "#b8423b", "#c79c48", "#3f6b4b"].forEach((c, i) => box(root, [2.25 + i * 0.12, 1.33, -2.55], [2.34 + i * 0.12, 1.6, -2.3], mat(c)));
  cyl(root, 0.2, 0.15, 0.4, mat("#8a4b2e"), [-2.6, 0.2, -1.2]);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat("#3f6b4b")); bush.position.set(-2.6, 0.75, -1.2); bush.castShadow = true; root.add(bush);
  const s = sun(root, [0, 0.5, -0.8], 6); s.setFrom([0.5, 1.4, 1.1]);

  let banner: string | null = null;
  const setBanner = (b: string | null) => { banner = b; };
  const drawScreen = (t: number) => screen.redraw((g) => {
    g.fillStyle = "#1c2230"; g.fillRect(0, 0, 512, 320);
    const tiles: [number, number, string][] = [[8, 8, "#3a5f8a"], [260, 8, "#5f4a7a"], [8, 160, "#3f6b5b"], [260, 160, "#7a5a3f"]];
    tiles.forEach(([x, y, c], i) => {
      g.fillStyle = c; g.fillRect(x, y, 244, 144);
      g.fillStyle = "rgba(10,14,24,0.55)"; // a plain silhouette: head and shoulders, no face
      g.beginPath(); g.arc(x + 122, y + 62, 26, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 122, y + 140, 58, 44, 0, Math.PI, 0); g.fill();
      if (i === Math.floor(t * 0.8) % 4) { g.strokeStyle = "#7ee08a"; g.lineWidth = 5; g.strokeRect(x + 2, y + 2, 240, 140); } // who is speaking
    });
    g.fillStyle = "#e9452f"; g.beginPath(); g.arc(22, 300, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.font = "600 18px Inter, Arial"; g.fillText(`${45 + Math.floor(t / 60)}:${String(12 + Math.floor(t) % 60).padStart(2, "0")}`, 36, 306);
    if (banner) {
      g.fillStyle = "rgba(240,242,246,0.95)"; g.fillRect(150, 112, 212, 46);
      g.fillStyle = "#c79c48"; g.fillRect(150, 112, 8, 46);
      g.fillStyle = "#1c2230"; g.font = "700 22px Inter, Arial"; g.fillText(banner, 170, 143);
    }
  });

  const apply = (_state: string, t: number): SetLook => {
    drawScreen(t); motes.update(t); void beams;
    // 12:31 plus the seconds of the scene: the second hand ticks once a second
    const sec = Math.floor(t), mins = 31 + t / 60;
    secH.rotation.z = -(sec / 60) * Math.PI * 2; minH.rotation.z = -(mins / 60) * Math.PI * 2; hourH.rotation.z = -((12 + mins / 60) / 12) * Math.PI * 2;
    return { lit: [1.12, 1.08, 1.0], shade: [0.38, 0.4, 0.52], lift: [0.02, 0.02, 0.04], sat: 1.0, charTint: [1, 0.98, 0.96], cardGain: 1.0, grade: GRADE_DAY, fog: ["#dfe6ee", 5, 18] };
  };
  return { set: { id: "office", root, offset, apply } as StorySet, setBanner };
};
