// The library (video 004 "The Man Who Never Rested"): a vast ancient library at night. One long aisle of stone between
// two walls of shelves that rise into darkness, thousands of leather-bound books (some with gold Arabic titles on their
// spines), a rolling ladder, a spiral staircase far down the aisle, brass lamps hanging on long chains and swaying,
// shafts of cold moonlight from high windows with dust turning in them, warm lamplight against blue moonlight. At the
// far end of the aisle: a reading table with an oil lamp and a chair (the only rest in the film).
// Local coordinates: the floor is y = 0; the aisle runs along z (cameras usually look toward -z); the shelves face the
// aisle at x = -SHELF_X and +SHELF_X. LIB.LADDER: the rolling ladder; LIB.NOOK: the reading table; LIB.CHAIR: the chair.
// State "lib:<lamp 0..1>:<moon 0..1>": how bright the lamps and the moonlight are.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT, type GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, box, cyl, sun, lightBeam, dust, glow } from "./common";

export const LIB = {
  SHELF_X: 2.4, Z0: 12, Z1: -44, H: 15,
  LADDER: { x: 1.95, z: -6, top: 4.6 },
  BOOK: [2.22, 3.55, -6.05] as V3,          // the book he pulls from the high shelf (spine facing the aisle)
  NOOK: [0, 0, -17] as V3, CHAIR: [-0.75, 0, -16.6] as V3, LAMP: [0.25, 0.86, -17.15] as V3,
  LAMPS: [4, -2, -8, -14, -20, -27, -34],
};
export const TITLES = ["صيد الخاطر", "تلبيس إبليس", "صفة الصفوة", "مسند الإمام أحمد", "مفتاح دار السعادة", "زاد المعاد", "مدارج السالكين", "تفسير سفيان الثوري"];

export const GRADE_LIBRARY: GradeParams = {
  ky: [0, 0.07, 0.22, 0.52, 0.8, 0.94, 1], sat: [1.0, 1.08, 1.06],
  tintS: [0.035, -0.01], tintM: [0.0, 0.012], tintH: [-0.03, 0.03], vig: [0.32, 0.32],
};

const stoneTex = () => rep(ctex("libStone", 512, 512, (g, r) => {
  g.fillStyle = "#6a5a48"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? -64 : 0; x < 512; x += 128) {
    g.fillStyle = `rgb(${92 + 22 * r()},${78 + 18 * r()},${60 + 14 * r()})`; g.fillRect(x + 2, y + 2, 124, 60);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(30,22,16,${0.08 * r()})`; g.fillRect(x + r() * 124, y + r() * 60, 3 + 6 * r(), 2 + 3 * r()); }
  }
}), 8, 30);
/** a leather spine with a gold Arabic title (and two gold bands) */
const spineTex = (title: string, leather: string) => ctex("libSpine|" + title + leather, 128, 512, (g) => {
  g.fillStyle = leather; g.fillRect(0, 0, 128, 512);
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, "rgba(0,0,0,0.35)"); gr.addColorStop(0.5, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(0,0,0,0.4)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  g.fillStyle = "#d9b45a"; for (const y of [30, 46, 466, 482]) g.fillRect(8, y, 112, 5);
  g.save(); g.translate(64, 256); g.rotate(-Math.PI / 2); g.fillStyle = "#e8c66a"; g.font = "700 54px Amiri, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 4; g.fillText(title, 0, 0, 380); g.restore();
});

export const buildLibrary = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  let s = 41; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const { SHELF_X: SX, Z0, Z1, H } = LIB, LEN = Z0 - Z1;
  // ---- the floor, a dark back wall far down the aisle ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, LEN + 20), mat("#ffffff", { map: stoneTex() })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); floor.receiveShadow = true; root.add(floor);
  box(root, [-SX - 1, 0, Z1 - 1.2], [SX + 1, H, Z1 - 1], mat("#2a2018"));
  // ---- the shelves: uprights, boards, and thousands of books (instanced, one mesh per leather colour) ----
  const wood = mat("#3a2616"), woodD = mat("#2a1a10");
  const ROW = 0.46, ROWS = Math.floor(H / ROW);
  for (const side of [-1, 1]) {
    const face = side * SX, back = side * (SX + 0.45);
    box(root, [Math.min(face, back), 0, Z1], [Math.max(face, back), H, Z0], woodD);             // the back of the case
    for (let k = 0; k <= ROWS; k++) box(root, [Math.min(face, back) - 0.02 * side, k * ROW, Z1], [Math.max(face, back), k * ROW + 0.035, Z0], wood, false);
    for (let z = Z1; z <= Z0; z += 1.3) box(root, [Math.min(face, back) - 0.05, 0, z - 0.05], [Math.max(face, back), H, z + 0.05], wood, false);
  }
  const LEATHER = ["#5a2a1c", "#3a2a1c", "#2f3a2a", "#6a4a2a", "#4a1e1e", "#2a2e3a", "#6e5a3a", "#3e2416"];
  const bookGeo = new THREE.BoxGeometry(1, 1, 1); bookGeo.translate(0, 0.5, 0);
  const lists: THREE.Matrix4[][] = LEATHER.map(() => []);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), sc4 = new THREE.Vector3(), p4 = new THREE.Vector3();
  for (const side of [-1, 1]) for (let k = 0; k < ROWS; k++) {
    const y = k * ROW + 0.035, dense = y < 8 ? 1 : 0.35;
    let z = Z1 + 0.06;
    while (z < Z0 - 0.06) {
      const w = 0.035 + 0.06 * r(), h = 0.24 + 0.17 * r(), d = 0.2 + 0.08 * r();
      if (r() < dense && !(side === 1 && Math.abs(z - LIB.BOOK[2]) < 0.12 && Math.abs(y + 0.1 - LIB.BOOK[1]) < 0.25)) {
        const lean = r() < 0.06 ? (r() - 0.5) * 0.5 : 0;
        p4.set(side * (SX + 0.02 + d / 2), y, z + w / 2); e4.set(lean, 0, 0); q4.setFromEuler(e4); sc4.set(d, h, w);
        lists[Math.floor(r() * LEATHER.length)].push(m4.compose(p4, q4, sc4).clone());
      }
      z += w + 0.004 + (r() < 0.04 ? 0.15 : 0);
    }
  }
  lists.forEach((l, i) => { const im = new THREE.InstancedMesh(bookGeo, mat(LEATHER[i]), l.length); l.forEach((mm, j) => im.setMatrixAt(j, mm)); im.instanceMatrix.needsUpdate = true; im.receiveShadow = true; root.add(im); });
  // a few spines with gold Arabic titles near the ladder and near the reading nook (real titles; no publisher covers)
  TITLES.forEach((title, i) => {
    const near = i < 5, z = near ? LIB.BOOK[2] - 0.9 + 0.36 * i : LIB.NOOK[2] + 2.2 - 0.36 * (i - 5), y = near ? LIB.BOOK[1] - 0.46 + 0.04 : 1.4;
    const side = near ? 1 : -1, sp = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.36), new THREE.MeshLambertMaterial({ map: spineTex(title, LEATHER[i % LEATHER.length]) }));
    sp.position.set(side * (SX + 0.005), y + 0.2, z); sp.rotation.y = -side * Math.PI / 2; root.add(sp);
  });
  // ---- the rolling ladder (rail along the shelf top, the ladder leaning on it) ----
  box(root, [SX - 0.06, LIB.LADDER.top + 0.3, Z1], [SX - 0.02, LIB.LADDER.top + 0.36, Z0], mat("#8a6a3a"), false);
  const lad = new THREE.Group(); lad.position.set(LIB.LADDER.x, 0, LIB.LADDER.z); lad.rotation.z = -0.09; root.add(lad);
  for (const dz of [-0.24, 0.24]) box(lad, [-0.03, 0, dz - 0.03], [0.03, LIB.LADDER.top + 0.4, dz + 0.03], mat("#6a4a28"));
  for (let y = 0.3; y < LIB.LADDER.top; y += 0.32) box(lad, [-0.025, y, -0.24], [0.025, y + 0.04, 0.24], mat("#7a5a32"), false);
  // ---- the spiral staircase far down the aisle ----
  const stair = new THREE.Group(); stair.position.set(0, 0, -36); root.add(stair);
  cyl(stair, 0.12, 0.12, H, wood, [0, H / 2, 0], 10);
  for (let i = 0; i < 60; i++) { const step = box(stair, [0, -0.03, -0.18], [1.1, 0.03, 0.18], wood); step.position.y = 0.2 * i; step.rotation.y = i * 0.42; }
  // ---- the reading nook: a table, an oil lamp, a chair ----
  const N = LIB.NOOK;
  box(root, [N[0] - 0.6, 0.74, N[2] - 0.45], [N[0] + 0.6, 0.8, N[2] + 0.45], mat("#4a3020"));
  for (const [dx, dz] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) box(root, [N[0] + dx - 0.03, 0, N[2] + dz - 0.03], [N[0] + dx + 0.03, 0.74, N[2] + dz + 0.03], mat("#3a2416"));
  const C = LIB.CHAIR, chair = new THREE.Group(); chair.position.set(...C); chair.rotation.y = 0.5; root.add(chair);
  box(chair, [-0.24, 0.44, -0.24], [0.24, 0.5, 0.24], mat("#4a2e1c")); box(chair, [-0.24, 0.5, -0.26], [0.24, 1.05, -0.2], mat("#4a2e1c"));
  for (const [dx, dz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) box(chair, [dx - 0.025, 0, dz - 0.025], [dx + 0.025, 0.44, dz + 0.025], mat("#3a2416"));
  const lampBody = cyl(root, 0.07, 0.09, 0.12, mat("#b08840"), [LIB.LAMP[0], LIB.LAMP[1], LIB.LAMP[2]], 12);
  const flameM = glow("#ffcf7a", 2.6), flame = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), flameM); flame.scale.set(1, 1.8, 1); flame.position.set(LIB.LAMP[0], LIB.LAMP[1] + 0.12, LIB.LAMP[2]); flame.layers.set(NOINK); root.add(flame);
  const glassM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.85, 0.5), transparent: true, opacity: 0.25, depthWrite: false }); const lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), glassM); lampGlass.scale.set(1, 1.3, 1); lampGlass.position.set(LIB.LAMP[0], LIB.LAMP[1] + 0.14, LIB.LAMP[2]); lampGlass.layers.set(NOINK); root.add(lampGlass);
  const tableL = new THREE.PointLight("#ffb860", 0, 9, 1.4); tableL.position.set(LIB.LAMP[0], LIB.LAMP[1] + 0.2, LIB.LAMP[2]); root.add(tableL);
  void lampBody;
  // ---- the hanging brass lamps (swaying on long chains) ----
  const lamps = LIB.LAMPS.map((z, i) => {
    const g = new THREE.Group(); g.position.set(0, H, z); root.add(g);
    const len = H - 4.0 - 0.3 * (i % 3);
    cyl(g, 0.012, 0.012, len, mat("#5a4a30"), [0, -len / 2, 0], 5);
    const body = new THREE.Group(); body.position.y = -len; g.add(body);
    cyl(body, 0.16, 0.22, 0.18, mat("#a07a38"), [0, 0.1, 0], 12); cyl(body, 0.22, 0.12, 0.12, mat("#8a6a30"), [0, -0.05, 0], 12);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow("#ffcf80", 2.4)); fl.position.y = -0.05; fl.layers.set(NOINK); body.add(fl);
    const l = new THREE.PointLight("#ffb050", 0, 10, 1.3); l.position.y = -0.2; body.add(l);
    return { g, l, fl, ph: i * 1.37 };
  });
  // ---- moonlight: shafts from high windows, dust turning in them ----
  const beams = [[-1.6, 13, -2, 1.2, 0, -7], [-1.6, 13, -15, 1.0, 0, -20], [-1.6, 13, 6, 1.2, 0, 1]].map(([a, b, c, d, e, f]) => lightBeam(root, [a, b, c], [d, e, f], 0.5, 1.6, "#9fb8ff", 0.16));
  const motes = dust(root, [-1.6, 0.2, -30], [1.6, 9, 10], 2200, "#ffe8c0", 0.016, 1.2);
  const moon = sun(root, [0, 0, -8], 24); moon.setFrom([-0.5, 1.2, 0.35]); moon.light.color.set("#a8c0ff");
  const fill = new THREE.HemisphereLight("#2a3450", "#1a120c", 0.4); root.add(fill);
  const apply = (state: string, t: number): SetLook => {
    const [, l0, m0] = state.split(":"), lampK = l0 === undefined ? 1 : Number(l0), moonK = m0 === undefined ? 1 : Number(m0);
    const flick = 0.88 + 0.07 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 17.9 + 1);
    lamps.forEach((lp, i) => { lp.g.rotation.z = 0.035 * Math.sin(t * 0.7 + lp.ph); lp.g.rotation.x = 0.025 * Math.sin(t * 0.53 + lp.ph * 1.3); lp.l.intensity = 9 * lampK * (flick + 0.03 * Math.sin(t * 7 + i)); });
    tableL.intensity = 5.5 * lampK * flick; flame.scale.set(1, 1.8 * flick, 1); flameM.color.set("#ffcf7a").multiplyScalar(2.6 * flick * Math.max(0.2, lampK));
    beams.forEach((b) => b.setLevel(moonK)); motes.update(t);
    moon.light.intensity = 0.9 * moonK;
    return { lit: [0.42, 0.46, 0.62], shade: [0.07, 0.07, 0.11], lift: [0.012, 0.012, 0.02], sat: 0.95, charTint: [1.0, 0.92, 0.84], cardGain: 0.9, cardPointK: 1.3, pointK: 1.3, grade: GRADE_LIBRARY, fog: ["#0e1018", 6, 46] };
  };
  void GRADE_NIGHT; void NOINK;
  return { id: "library", root, offset, apply };
};
