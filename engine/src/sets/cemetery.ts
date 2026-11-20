// A Muslim cemetery at night in the rain: dark wet ground, a gravel path, rows of plain low headstones (no writing),
// an open grave with its mound of earth, a few bare trees, a low wall far back with dim lamps, fog.
// Local coordinates: the grave along x, centred at GRAVE; the path along x at z = PATH_Z (in front of the grave);
// cameras toward -z. setFill(k): 0 = the grave open, 1 = filled (a low mound of fresh earth over it).
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT } from "../render/grade";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, cyl, sun, skyDome, lightBeam } from "./common";

export const CEMETERY = { GRAVE: [0, 0, 0] as V3, PATH_Z: 3.0, L: 2.1, W: 0.85, D: 1.1 };

const mud = () => { const t = rep(ctex("cemMud", 512, 512, (g, r) => {
  g.fillStyle = "#2b2f2a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "20,24,20" : "70,78,66"},${0.2 + 0.3 * r()})`; const x = r() * 512, y = r() * 512; g.fillRect(x, y, 2 + r() * 4, 2 + r() * 4); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(120,140,160,0.12)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + 30 * r(), 4 + 8 * r(), 0, 0, Math.PI * 2); g.fill(); } // puddles
}), 20, 20); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t; };

export const buildCemetery = (offset: V3) => {
  const root = new THREE.Group(); root.position.set(...offset);
  const ground = mat("#ffffff", { map: mud() }), soil = mat("#3b2c22"), soilDark = mat("#2a1f18"), stone = mat("#8c8f8a");
  const { GRAVE: G, L, W, D } = CEMETERY;
  // the ground around the pit (four pieces), the pit's walls and floor
  const S = 30;
  box(root, [-S, -0.04, -S], [S, 0, G[2] - W / 2], ground);
  box(root, [-S, -0.04, G[2] + W / 2], [S, 0, S], ground);
  box(root, [-S, -0.04, G[2] - W / 2], [G[0] - L / 2, 0, G[2] + W / 2], ground);
  box(root, [G[0] + L / 2, -0.04, G[2] - W / 2], [S, 0, G[2] + W / 2], ground);
  box(root, [G[0] - L / 2, -D, G[2] - W / 2 - 0.02], [G[0] + L / 2, 0, G[2] - W / 2], soilDark, false);
  box(root, [G[0] - L / 2, -D, G[2] + W / 2], [G[0] + L / 2, 0, G[2] + W / 2 + 0.02], soilDark, false);
  box(root, [G[0] - L / 2 - 0.02, -D, G[2] - W / 2], [G[0] - L / 2, 0, G[2] + W / 2], soilDark, false);
  box(root, [G[0] + L / 2, -D, G[2] - W / 2], [G[0] + L / 2 + 0.02, 0, G[2] + W / 2], soilDark, false);
  const fill = box(root, [G[0] - L / 2, -D - 0.02, G[2] - W / 2], [G[0] + L / 2, -D + 0.02, G[2] + W / 2], soil, false);
  // the mound of dug earth behind the grave (shrinks as the grave fills); the new mound over it
  const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), soil); heap.scale.set(1.2, 0.55, 0.55); heap.position.set(G[0], 0, G[2] - W / 2 - 0.65); heap.castShadow = true; heap.receiveShadow = true; root.add(heap);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), soil); top.scale.set(L / 2, 0.001, W / 2 + 0.05); top.position.set(G[0], 0, G[2]); top.receiveShadow = true; root.add(top);
  // the gravel path in front, the rows of plain headstones, bare trees, the far wall with dim lamps
  box(root, [-S, 0.0, CEMETERY.PATH_Z - 0.7], [S, 0.012, CEMETERY.PATH_Z + 0.7], mat("#4a4a46"), false);
  let s = 23; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let row = 0; row < 6; row++) for (let i = 0; i < 16; i++) {
    const x = -14 + i * 1.9 + (row % 2) * 0.9 + (r() - 0.5) * 0.3, z = -2.6 - row * 2.1 + (r() - 0.5) * 0.3;
    if (Math.abs(x - G[0]) < 1.6 && row === 0) continue;
    const h = 0.35 + 0.25 * r(), w = 0.25 + 0.12 * r();
    const st = box(root, [x - w / 2, 0, z - 0.06], [x + w / 2, h, z + 0.06], stone); st.rotation.z = (r() - 0.5) * 0.08;
    box(root, [x - 0.5, 0.0, z + 0.06], [x + 0.5, 0.06, z + 1.4], mat("#3a3d36"), false);            // the low kerb of each grave
  }
  for (const [x, z, h] of [[-6.5, -5, 4.5], [5.5, -7.5, 5.2], [-11, -9, 4.0], [10, -4, 3.8], [-3, -13, 5.5]] as [number, number, number][]) {
    const bark = mat("#1e1c1b");
    cyl(root, 0.1, 0.16, h, bark, [x, h / 2, z], 8);
    for (let k = 0; k < 5; k++) { const br = cyl(root, 0.02, 0.06, 1.6, bark, [x, h * (0.55 + 0.08 * k), z], 6); br.rotation.z = (k % 2 ? 1 : -1) * (0.6 + 0.15 * k); br.rotation.y = k * 1.3; br.position.x += Math.sin(br.rotation.z) * -0.7; }
  }
  box(root, [-S, 0, -16.2], [S, 1.3, -15.8], mat("#4a4b48"));
  const lamps = [-12, -4, 4, 12].map((x) => { cyl(root, 0.05, 0.06, 3.2, mat("#1d1f22"), [x, 1.6, -15.4], 6); const hd = box(root, [x - 0.15, 3.1, -15.55], [x + 0.15, 3.3, -15.25], glow("#e8cf98", 1.6)); const l = new THREE.PointLight("#e8cf98", 1.2, 9, 1.6); l.position.set(x, 3.0, -15.0); root.add(l); return { hd, l }; });
  const beam = lightBeam(root, [4, 3.1, -15.3], [4.6, 0, -13.8], 0.3, 2.2, "#e8cf98", 0.12); void beam;
  const sky = skyDome(root, 160); sky.setColours("#262c36", "#56606e");
  const s2 = sun(root, [0, 0, 0], 12); s2.setFrom([0.4, 1.2, 0.6]);
  const setFill = (k: number) => {
    const e = Math.max(0, Math.min(1, k));
    fill.position.y = -D + e * (D - 0.02);
    heap.scale.set(1.2 * (1 - 0.5 * e), 0.55 * (1 - 0.6 * e) + 0.001, 0.55 * (1 - 0.3 * e));
    top.scale.y = 0.001 + 0.22 * Math.max(0, (e - 0.85) / 0.15);
  };
  setFill(0);
  const apply = (_state: string, t: number): SetLook => {
    for (const [i, lp] of lamps.entries()) lp.l.intensity = 1.2 * (0.9 + 0.1 * Math.sin(t * 1.3 + i * 2));
    return { lit: [0.3, 0.33, 0.4], shade: [0.1, 0.11, 0.15], lift: [0.02, 0.024, 0.032], sat: 0.7, charTint: [0.8, 0.84, 0.92], cardGain: 0.85, cardPointK: 1.3, pointK: 1.2, grade: GRADE_NIGHT, fog: ["#4a5462", 3, 22] };
  };
  return { set: { id: "cemetery", root, offset, apply } as StorySet, setFill };
};
