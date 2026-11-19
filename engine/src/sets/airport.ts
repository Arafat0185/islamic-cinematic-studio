// The airport: a tall departures hall at sunset. A huge departures board (rows of flights flipping, "BOARDING",
// "DELAYED", gates), a glass wall onto the apron with a parked plane and an orange sky, columns, a row of seats, a
// glossy floor reflecting the light, long sun beams across the hall.
// Local coordinates: he stands at STAND facing the board (the board on the wall at z = -4); cameras toward +z.
// State: "on".
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { ctex } from "../draw/paint";
import { NOINK } from "../render/ink";
import { StorySet, SetLook, GRADE_DUSK, mat, glow, box, plane, cyl, liveCanvas, lightBeam, dust, skyDome } from "./common";

export const AIRPORT = { STAND: [0.2, 0, 0.4] as V3, BOARD: [0, 4.2, -3.95] as V3 };

const FLIGHTS: [string, string, string][] = [
  ["DUBAI", "B12", "BOARDING"], ["ISTANBUL", "A04", "DELAYED"], ["LONDON", "C21", "ON TIME"], ["KUALA LUMPUR", "B07", "GATE OPEN"],
  ["CAIRO", "A11", "DELAYED"], ["TOKYO", "D02", "ON TIME"], ["NEW YORK", "C09", "BOARDING"], ["JAKARTA", "B15", "ON TIME"],
];
const drawBoard = (g: CanvasRenderingContext2D, t: number) => {
  const W = 1024, H = 512;
  g.fillStyle = "#101318"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#FB5606"; g.fillRect(0, 0, W, 52);
  g.fillStyle = "#ffffff"; g.font = "800 30px Inter, Arial"; g.fillText("DEPARTURES", 24, 37); g.fillText("2027", W - 110, 37);
  g.fillStyle = "#8d96a6"; g.font = "700 18px Inter, Arial"; g.fillText("TIME", 24, 80); g.fillText("DESTINATION", 140, 80); g.fillText("GATE", 640, 80); g.fillText("STATUS", 770, 80);
  FLIGHTS.forEach(([dest, gate, st], i) => {
    const y = 100 + i * 50;
    // each row flips once, staggered: during its flip the letters are half-height bars
    const flip = (t * 2.2 - i * 0.18) % 3, flipping = flip > 0 && flip < 0.22;
    g.fillStyle = i % 2 ? "#161a21" : "#1b2029"; g.fillRect(12, y, W - 24, 44);
    if (flipping) { g.fillStyle = "#3a404c"; for (let x = 24; x < W - 40; x += 22) g.fillRect(x, y + 14, 16, 16); return; }
    g.fillStyle = "#f2d27a"; g.font = "700 26px Inter, Arial";
    g.fillText(`${String(6 + i).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`, 24, y + 31); g.fillText(dest, 140, y + 31); g.fillText(gate, 640, y + 31);
    g.fillStyle = st === "DELAYED" ? "#E5484D" : st === "BOARDING" ? "#3FB37F" : "#e9edf8"; g.fillText(st, 770, y + 31);
  });
};
const apron = () => ctex("apron", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3b2a55"); gr.addColorStop(0.45, "#e0703a"); gr.addColorStop(0.62, "#ffc27a"); gr.addColorStop(0.63, "#4a4e58"); gr.addColorStop(1, "#2c2f36");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#ffe2b0"; g.beginPath(); g.arc(760, 300, 30, 0, Math.PI * 2); g.fill(); // the low sun
  // a parked plane, in silhouette
  g.fillStyle = "#1c1f27"; g.beginPath(); g.ellipse(420, 360, 260, 34, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(380, 360); g.lineTo(250, 430); g.lineTo(300, 430); g.lineTo(470, 362); g.fill();
  g.beginPath(); g.moveTo(640, 352); g.lineTo(700, 270); g.lineTo(726, 270); g.lineTo(690, 356); g.fill();
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "#ffcf7a"; g.fillRect(x, 400, 6, 3); }
});

export const buildAirport = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  plane(root, 40, 30, mat("#b9b4ad", { }), [0, 0, 2], 0, -Math.PI / 2);
  // the back wall with the board
  box(root, [-12, -0.02, -4.3], [12, 9, -4.0], mat("#d8d4cc"));
  box(root, [-3.6, 2.4, -4.0], [3.6, 6.1, -3.92], mat("#2a2e36"));
  const board = liveCanvas(1024, 512);
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.5), glow("#ffffff", 1.12, board.tex)); bm.position.set(0, 4.25, -3.91); bm.layers.set(NOINK); root.add(bm);
  // the glass wall onto the apron (left side), with mullions
  const glass = plane(root, 16, 8, glow("#ffffff", 1.05, apron()), [-9.0, 4, 1.0], Math.PI / 2); glass.layers.set(NOINK);
  for (let z = -4; z <= 6; z += 2) box(root, [-9.05, 0, z - 0.06], [-8.9, 8, z + 0.06], mat("#3a3f47"));
  box(root, [-9.05, 2.6, -4], [-8.9, 2.7, 6], mat("#3a3f47"));
  // columns, seats, the ceiling
  for (const x of [-5.5, 5.5]) for (const z of [-1.5, 3.5]) cyl(root, 0.35, 0.35, 9, mat("#e9e6e0"), [x, 4.5, z], 20);
  for (let k = 0; k < 6; k++) { const x = 2.4 + k * 0.62; box(root, [x, 0.42, 2.0], [x + 0.56, 0.48, 2.5], mat("#4D312C")); box(root, [x, 0.48, 2.45], [x + 0.56, 0.95, 2.52], mat("#4D312C")); }
  box(root, [2.3, 0, 2.2], [6.2, 0.42, 2.3], mat("#55595f"));
  box(root, [-12, 9, -4.3], [12, 9.2, 8], mat("#efece6"));
  // the low sun through the glass: long beams across the hall; its light
  const beams = [-2, 1, 4].map((z) => lightBeam(root, [-8.9, 5.5, z], [2, 0, z + 1.5], 1.4, 3.0, "#ffc58a", 0.16));
  const motes = dust(root, [-8, 0.3, -3], [4, 6, 4], 400, "#ffd9a8", 0.025, 1.1);
  const sun = new THREE.DirectionalLight("#ffd2a0", 1); sun.position.set(-20, 9, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0005; sun.target.position.set(0, 0, 0);
  root.add(sun, sun.target);
  const boardLight = new THREE.PointLight("#ffd29a", 4, 10, 1.6); boardLight.position.set(0, 4, -3.2); root.add(boardLight);
  const sky = skyDome(root, 120); sky.setColours("#3b2a55", "#e0703a");
  const apply = (_state: string, t: number): SetLook => {
    board.redraw((g) => drawBoard(g, t)); motes.update(t); void beams;
    return { lit: [1.2, 0.95, 0.74], shade: [0.3, 0.27, 0.42], lift: [0.03, 0.02, 0.04], sat: 1.05, charTint: [1, 0.93, 0.84], cardGain: 1.0, cardPointK: 1.0, grade: GRADE_DUSK, fog: ["#e6b48a", 10, 40] };
  };
  return { id: "airport", root, offset, apply };
};
