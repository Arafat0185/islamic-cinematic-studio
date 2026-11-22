// The feed world: a dark blue space where giant phone screens tower around him like buildings, each one scrolling a
// social feed (faceless avatars, picture blocks, heart counts), a huge follower counter ticking up, a glowing grid on
// the floor and coloured screen light spilling onto him.
// Local coordinates: he stands at STAND (looking up at the screens); cameras stand toward +z.
// State: "on".
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, plane, liveCanvas, dust } from "./common";

export const FEED = { STAND: [0, 0, 0] as V3 };

const gridTex = () => { const t = ctex("feedGrid", 512, 512, (g) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(120,170,255,0.55)"; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t; };

const POST_COLS = ["#FB5606", "#3a7be0", "#e0457b", "#7a5ad6", "#3FB37F", "#f4b23a"];
/** one feed screen: posts scrolling upward (offset in px), a header bar */
const drawFeed = (g: CanvasRenderingContext2D, seed: number, offset: number) => {
  const W = 256, H = 512;
  g.fillStyle = "#0f1424"; g.fillRect(0, 0, W, H);
  const postH = 230;
  for (let k = -1; k < 4; k++) {
    const i = Math.floor(offset / postH) + k, y = k * postH - (offset % postH) + 40;
    const c = POST_COLS[Math.abs(i * 7 + seed) % POST_COLS.length];
    g.fillStyle = "rgba(10,12,22,0.6)"; g.beginPath(); g.arc(28, y + 18, 13, 0, Math.PI * 2); g.fill(); // faceless avatar: a plain disc
    g.fillStyle = "#3b4260"; g.fillRect(48, y + 10, 90, 8); g.fillRect(48, y + 22, 60, 6);
    g.fillStyle = c; g.fillRect(10, y + 40, W - 20, 140);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(70 + (i * 37) % 120, y + 100, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ff4d6d"; // a heart and a count
    g.beginPath(); g.moveTo(24, y + 204); g.bezierCurveTo(10, y + 190, 18, y + 182, 24, y + 192); g.bezierCurveTo(30, y + 182, 38, y + 190, 24, y + 204); g.fill();
    g.fillStyle = "#e9edf8"; g.font = "700 15px Inter, Arial"; g.fillText(`${(Math.abs(i * 4517 + seed * 131) % 900) + 100}k`, 44, y + 202);
  }
  g.fillStyle = "#151b30"; g.fillRect(0, 0, W, 34); g.fillStyle = "#FB5606"; g.fillRect(12, 12, 60, 10);
};

export const buildFeed = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const fl = plane(root, 80, 80, new THREE.MeshBasicMaterial({ color: new THREE.Color("#2a3a70").multiplyScalar(0.6), map: gridTex() }), [0, 0, 0], 0, -Math.PI / 2);
  fl.layers.set(NOINK);
  plane(root, 80, 80, mat("#05070e"), [0, -0.01, 0], 0, -Math.PI / 2);
  // the giant phones: [x, z, height, yaw, seed]; each a dark body with a scrolling live screen
  const PH: [number, number, number, number, number][] = [
    [-3.2, -4.0, 7.5, 0.35, 1], [0.6, -6.5, 10, 0.0, 2], [4.2, -3.6, 8, -0.4, 3], [-6.5, -1.0, 9, 0.9, 4], [7.0, -0.6, 8.5, -0.95, 5],
    [-2.0, -10, 12, 0.1, 6], [5.5, -9, 11, -0.2, 7],
  ];
  const screens: { draw: (o: number) => void }[] = [];
  for (const [x, z, h, yaw, seed] of PH) {
    const w = h * 0.48, grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = yaw; root.add(grp);
    box(grp, [-w / 2 - 0.12, 0, -0.18], [w / 2 + 0.12, h + 0.24, 0.0], mat("#141824"));
    const lc = liveCanvas(256, 512);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow("#ffffff", 1.15, lc.tex)); scr.position.set(0, h / 2 + 0.12, 0.012); scr.layers.set(NOINK); grp.add(scr);
    screens.push({ draw: (o) => lc.redraw((g) => drawFeed(g, seed, o * (0.7 + 0.1 * seed))) });
  }
  // the follower counter: a huge panel high up behind him
  const counter = liveCanvas(512, 128);
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), glow("#ffffff", 1.3, counter.tex)); cm.position.set(0.4, 5.6, -5.0); cm.layers.set(NOINK); root.add(cm);
  // screen light spilling onto him (orange from one side, blue from the other) and floating specks
  const l1 = new THREE.PointLight("#FB5606", 6, 14, 1.6); l1.position.set(-2.5, 2.6, -1.5); root.add(l1);
  const l2 = new THREE.PointLight("#6f9cff", 7, 14, 1.6); l2.position.set(3.0, 3.0, -1.0); root.add(l2);
  const motes = dust(root, [-5, 0.3, -6], [5, 7, 3], 300, "#a9c2ff", 0.03, 1.2);
  const apply = (_state: string, t: number): SetLook => {
    for (const s of screens) s.draw(t * 260);
    const n = 1204 + Math.floor(t * 37);
    counter.redraw((g) => {
      g.fillStyle = "#0f1424"; g.fillRect(0, 0, 512, 128);
      g.fillStyle = "#FB5606"; g.fillRect(0, 0, 10, 128);
      g.fillStyle = "#ffffff"; g.font = "800 64px Inter, Arial"; g.fillText(`${n.toLocaleString("en-US")}`, 34, 82);
      g.fillStyle = "#9fb0d8"; g.font = "600 26px Inter, Arial"; g.fillText("FOLLOWERS", 330, 80);
    });
    motes.update(t); l1.intensity = 6 + 1.5 * Math.sin(t * 7); l2.intensity = 7 + 1.5 * Math.sin(t * 5 + 1);
    return { lit: [0.18, 0.2, 0.34], shade: [0.05, 0.06, 0.14], lift: [0.01, 0.012, 0.03], sat: 1.05, charTint: [0.9, 0.92, 1.05],
      cardGain: 0.75, cardPointK: 1.5, pointK: 1.2, grade: GRADE_NIGHT, fog: ["#0a1030", 8, 30] };
  };
  return { id: "feed", root, offset, apply };
};
