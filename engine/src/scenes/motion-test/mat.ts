// A simple prayer mat, drawn in code: deep red field, a geometric border (a band of small 8-point stars between gold
// lines), a pointed mihrab arch at the head end (toward the qibla), and short fringe at both ends.
// A thin box (1.2 cm) so it gets a clean ink outline, sunk 2 mm into the floor so its bottom never shares the floor's
// plane (no flicker). The texture is 1024 x 512 (powers of two), mipmapped, max anisotropy, with no detail finer
// than a few pixels on screen (no shimmer).
import * as THREE from "three";
import { ctex } from "../../draw/paint";
import { twoTone } from "../../render/shade";

type P2 = [number, number];
const RED = "#7e1a22", RED_DARK = "#5e1218", GOLD = "#c79c48", CREAM = "#e6d6b0", NAVY = "#25223a";

/** the rug's face; u (x) runs from the head (left, the mihrab arch) to the foot (right) */
const rugTex = () => ctex("prayerMat1", 1024, 512, (g) => {
  const W = 1024, H = 512;
  g.fillStyle = RED_DARK; g.fillRect(0, 0, W, H);
  // fringe zones at both short ends (cream threads drawn as soft stripes)
  for (const x0 of [0, W - 34]) {
    g.fillStyle = CREAM; g.fillRect(x0, 0, 34, H);
    g.fillStyle = "rgba(120,100,70,0.35)";
    for (let y = 6; y < H; y += 18) g.fillRect(x0, y, 34, 5);
  }
  const L = 34, R = W - 34; // the woven part
  // outer border band: navy with a row of small cream 8-point stars, between gold lines
  g.fillStyle = NAVY; g.fillRect(L, 0, R - L, H);
  const B = 58; // border width
  const star = (cx: number, cy: number, r: number) => {
    const ri = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
    g.beginPath();
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, rr = k % 2 ? ri : r; const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath(); g.fill();
  };
  g.fillStyle = CREAM;
  for (let x = L + B / 2; x <= R - B / 2 + 1; x += 52) { star(x, B / 2, 15); star(x, H - B / 2, 15); }
  for (let y = B / 2 + 52; y <= H - B / 2 - 52 + 1; y += 52) { star(L + B / 2, y, 15); star(R - B / 2, y, 15); }
  g.strokeStyle = GOLD; g.lineWidth = 8;
  g.strokeRect(L + 6, 6, R - L - 12, H - 12);
  g.strokeRect(L + B, B, R - L - 2 * B, H - 2 * B);
  // field
  g.fillStyle = RED; g.fillRect(L + B + 4, B + 4, R - L - 2 * B - 8, H - 2 * B - 8);
  // mihrab: a pointed arch whose apex points to the head end (left)
  const fx0 = L + B + 4, fx1 = R - B - 4, fy0 = B + 4, fy1 = H - B - 4, cy = (fy0 + fy1) / 2, hw = (fy1 - fy0) / 2 - 26;
  const arch: P2[] = [[fx1 - 40, cy - hw], [fx0 + 260, cy - hw]];
  const rise = 200, rad = (hw * hw + rise * rise) / (2 * hw);
  for (let i = 1; i <= 24; i++) { // upper curve to the apex
    const a = Math.asin(((rise * i) / 24) / rad);
    arch.push([fx0 + 260 - rad * Math.sin(a), cy - hw + rad - rad * Math.cos(a)]);
  }
  for (let i = 23; i >= 0; i--) { // lower curve back
    const a = Math.asin(((rise * i) / 24) / rad);
    arch.push([fx0 + 260 - rad * Math.sin(a), cy + hw - rad + rad * Math.cos(a)]);
  }
  arch.push([fx1 - 40, cy + hw]);
  g.beginPath(); arch.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = "#8f2029"; g.fill();
  g.lineWidth = 8; g.strokeStyle = GOLD; g.stroke();
  // a small lamp-like motif hanging inside the arch, and a central medallion
  g.fillStyle = GOLD; star(fx0 + 150, cy, 22);
  g.fillStyle = CREAM; star(fx0 + 150, cy, 9);
  g.fillStyle = GOLD; star((fx0 + fx1) / 2 + 110, cy, 46);
  g.fillStyle = RED_DARK; star((fx0 + fx1) / 2 + 110, cy, 26);
  g.fillStyle = GOLD; star((fx0 + fx1) / 2 + 110, cy, 10);
});

/** the mat as a mesh, centred at (x, z), its head pointing to -x */
export const buildMat = (x: number, z: number, len: number, wid: number) => {
  const tex = rugTex();
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 16;
  const top = twoTone(new THREE.MeshLambertMaterial({ map: tex }));
  const edge = twoTone(new THREE.MeshLambertMaterial({ color: RED_DARK }));
  const H = 0.012, SINK = 0.002;
  // BoxGeometry faces: +x, -x, +y (top), -y, +z, -z
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, H, wid), [edge, edge, top, edge, edge, edge]);
  m.position.set(x, H / 2 - SINK, z);
  m.receiveShadow = true;
  return m;
};
