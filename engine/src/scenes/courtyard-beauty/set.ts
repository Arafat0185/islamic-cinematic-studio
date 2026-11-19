// Set dressing for the rich courtyard (CourtyardBeauty). Everything is built in code, in the same flat-shaded,
// ink-outlined style as the test courtyard; nothing here changes the test scenes.
//   foregroundArch  a big pointed arch near the wide camera, framing the shot (no shadow, softened by the lens)
//   skyline         dome and minaret silhouettes behind the back wall, two small warm windows
//   moonDisc        a large soft moon in the sky (a glow card, not outlined)
//   fountain        an octagonal stone basin with still water that really reflects (three.js Reflector)
//   palm / shrub    potted plants for the corners
//   tileBand        a band of geometric tilework along the lower back wall, with a stone moulding on top
//   panel           an empty calligraphy panel above the arches (frame and border only, NO text)
//   dust / mist     floating motes in the lamp light, thin low mist over the floor
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { ctex } from "../../draw/paint";
import { twoTone, untone } from "../../render/shade";
import { NOINK } from "../../render/ink";
import { PALETTE } from "../courtyard-test/look";

type P2 = [number, number];
const stone = (col: string) => twoTone(new THREE.MeshLambertMaterial({ color: col }));
const LIMESTONE_WARM = new THREE.Color(PALETTE.limestone).multiply(new THREE.Color("#ffdcae"));
const limestone = () => twoTone(new THREE.MeshLambertMaterial({ color: LIMESTONE_WARM.clone() }));

/** pointed (two-centred) arch outline from floor to floor, centred on x = 0 */
const archOutline = (w: number, spring: number, rise: number, sink = 0.02): P2[] => {
  const h = w / 2, rad = (h * h + rise * rise) / (2 * h), n = 20, pts: P2[] = [[-h, -sink], [-h, spring]];
  const cL = -h + rad, aL1 = Math.PI - Math.asin(rise / rad);
  for (let i = 1; i <= n; i++) { const a = Math.PI + ((aL1 - Math.PI) * i) / n; pts.push([cL + rad * Math.cos(a), spring + rad * Math.sin(a)]); }
  const cR = h - rad, aR0 = Math.asin(rise / rad);
  for (let i = 1; i <= n; i++) { const a = aR0 * (1 - i / n); pts.push([cR + rad * Math.cos(a), spring + rad * Math.sin(a)]); }
  pts.push([h, -sink]);
  return pts;
};
/** three.js 0.175 builds no caps with bevelEnabled: false; a zero-size bevel builds them */
const EXTRUDE = { bevelEnabled: true, bevelThickness: 0, bevelSize: 0, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 };

// ---------------- foreground arch ----------------
/** a wall with one big pointed arch, its opening facing the courtyard (-z), front face at z */
export const foregroundArch = (x: number, z: number) => {
  const W = 9, H = 5.4, T = 0.7, open = archOutline(1.6, 2.2, 0.8);
  const outline: P2[] = [[-W / 2, -0.02], ...open, [W / 2, -0.02], [W / 2, H], [-W / 2, H]];
  const shape = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: T, ...EXTRUDE }), limestone());
  m.position.set(x, 0, z); // extrudes toward +z (toward the wide camera)
  m.castShadow = false; m.receiveShadow = true;
  // a thin carved band around the arch opening (an inset moulding) for a richer edge
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([
    ...archOutline(1.95, 2.2, 0.95).map(([a, b]) => new THREE.Vector2(a, b)),
  ].reverse().concat(open.map(([a, b]) => new THREE.Vector2(a, b)))), { depth: 0.06, ...EXTRUDE }), stone("#b9a684"));
  band.position.set(x, 0, z + T - 0.01); // on the face toward the camera, 5 cm proud
  const g = new THREE.Group(); g.add(m); g.add(band);
  return g;
};

// ---------------- skyline ----------------
/** dome and minaret silhouettes far behind the back wall: dark, unlit, a touch lighter than pure black so their
 *  shapes read against the indigo sky; two small warm windows on the minaret */
export const skyline = () => {
  const g = new THREE.Group();
  const sil = new THREE.MeshBasicMaterial({ color: untone("#0b1028"), fog: false });
  // dome: drum + slightly pointed dome + finial
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.4, 2.4, 32), sil);
  drum.position.set(-3.2, 4.6, -14);
  const domePts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * (Math.PI / 2); domePts.push(new THREE.Vector2(3.3 * Math.cos(a) * (1 - 0.08 * Math.sin(a)), 3.6 * Math.sin(a))); }
  domePts.push(new THREE.Vector2(0, 3.9));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(domePts, 40), sil);
  dome.position.set(-3.2, 5.8, -14);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.2, 8), sil);
  finial.position.set(-3.2, 10.2, -14);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 20, Math.PI * 1.3), sil);
  crescent.position.set(-3.2, 11.0, -14); crescent.rotation.z = Math.PI * 0.85;
  g.add(drum, dome, finial, crescent);
  // minaret: octagonal shaft, a balcony, a slimmer upper shaft, a pointed cap
  const mx = 3.2, mz = -12;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 13, 8), sil); shaft.position.set(mx, 6.5, mz);
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.75, 0.5, 8), sil); balcony.position.set(mx, 13.2, mz);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 3.0, 8), sil); upper.position.set(mx, 14.9, mz);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 8), sil); cap.position.set(mx, 17.4, mz);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.8, 6), sil); tip.position.set(mx, 18.7, mz);
  g.add(shaft, balcony, upper, cap, tip);
  const win = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.6), fog: false });
  for (const [y, w, h] of [[9.0, 0.22, 0.5], [14.9, 0.2, 0.45]] as [number, number, number][]) {
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), win); wm.position.set(mx, y, mz + 0.7); g.add(wm);
  }
  return g;
};

// ---------------- moon ----------------
const moonTex = () => ctex("moonDisc", 512, 512, (g) => {
  const c = 256;
  const halo = g.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, "rgba(255,255,255,0.0)"); halo.addColorStop(0.18, "rgba(255,255,255,0.0)");
  halo.addColorStop(0.2, "rgba(220,230,255,0.35)"); halo.addColorStop(0.45, "rgba(180,195,240,0.10)"); halo.addColorStop(1, "rgba(160,180,240,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 512, 512);
  const disc = g.createRadialGradient(c - 10, c - 12, 0, c, c, 52);
  disc.addColorStop(0, "rgba(255,255,250,1)"); disc.addColorStop(0.85, "rgba(236,236,228,1)"); disc.addColorStop(1, "rgba(220,225,235,0)");
  g.fillStyle = disc; g.beginPath(); g.arc(c, c, 52, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(170,175,190,0.28)"; // faint maria, so it reads as the moon
  for (const [x, y, r] of [[c - 16, c - 8, 13], [c + 12, c + 10, 10], [c + 2, c - 22, 7], [c - 6, c + 20, 6]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
/** a large soft moon, `dir` = direction from the viewer, at the sky's distance */
export const moonDisc = (dir: THREE.Vector3, size = 34) => {
  const t = moonTex(); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(1.25, 1.28, 1.35), transparent: true, depthWrite: false, fog: false }));
  s.position.copy(dir.clone().normalize().multiplyScalar(180)); s.scale.set(size, size, 1);
  s.renderOrder = -0.5; s.layers.set(NOINK); s.frustumCulled = false;
  return s;
};

// ---------------- fountain ----------------
const octagon = (r: number): P2[] => Array.from({ length: 8 }, (_, i): P2 => { const a = Math.PI / 8 + (i * Math.PI) / 4; return [r * Math.cos(a), r * Math.sin(a)]; });
/** octagonal basin (outer radius r) with still water that mirrors the scene (a reflecting pool, no spout) */
export const fountain = (x: number, z: number, r = 1.05) => {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const H = 0.45, RIM = 0.16, WATER = 0.36;
  // basin wall: an octagon with an octagonal hole, extruded upward (rotated so the extrusion points up)
  const outer = new THREE.Shape(octagon(r).map(([a, b]) => new THREE.Vector2(a, b)));
  outer.holes.push(new THREE.Path(octagon(r - RIM).reverse().map(([a, b]) => new THREE.Vector2(a, b))));
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: H + 0.02, ...EXTRUDE }), limestone());
  wall.rotation.x = -Math.PI / 2; wall.position.y = -0.02; wall.castShadow = true; wall.receiveShadow = true;
  // inside floor of the basin (dark), just under the water
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(octagon(r - RIM + 0.01).map(([a, b]) => new THREE.Vector2(a, b)))), stone("#2a3346"));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.08;
  // water: a real mirror (renders the scene from below the surface), tinted dark blue-green so it reads as water
  const water = new Reflector(new THREE.ShapeGeometry(new THREE.Shape(octagon(r - RIM + 0.005).map(([a, b]) => new THREE.Vector2(a, b)))), {
    color: new THREE.Color("#55627a"), textureWidth: 1024, textureHeight: 1024, clipBias: 0.003, multisample: 4,
  });
  water.rotation.x = -Math.PI / 2; water.position.y = WATER;
  water.camera.layers.enable(NOINK); // also reflect the sky, moon, lamp glow and the Traveller's card
  const update = water.onBeforeRender;
  water.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    if (scene.overrideMaterial) return; // the ink pass's normal render: keep the real reflection
    update.call(water, renderer, scene, camera, geometry, material, group);
  };
  g.add(wall, inner, water);
  return g;
};

// ---------------- plants ----------------
const potMat = () => twoTone(new THREE.MeshLambertMaterial({ color: "#8a4b2e" }));
const leafMat = (c: string) => { const m = twoTone(new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); return m; };
/** a potted date palm: terracotta pot, a ringed trunk, nine drooping fronds (flat, notched leaf shapes) */
export const palm = (x: number, z: number, h = 2.4, seed = 1) => {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.52, 12), potMat()); pot.position.y = 0.24; pot.castShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.07, 12), potMat()); rim.position.y = 0.5;
  g.add(pot, rim);
  const trunkMat = twoTone(new THREE.MeshLambertMaterial({ color: "#6b5137" }));
  const segs = 7;
  for (let i = 0; i < segs; i++) { // stacked, slightly leaning rings read as a palm trunk
    const t = i / segs, seg = new THREE.Mesh(new THREE.CylinderGeometry(0.075 - 0.02 * t, 0.095 - 0.02 * t, (h - 0.55) / segs + 0.01, 8), trunkMat);
    seg.position.set(0.04 * Math.sin(t * 2 + seed), 0.53 + (i + 0.5) * ((h - 0.55) / segs), 0); seg.castShadow = true; g.add(seg);
  }
  // frond: a long leaf with a notched edge, bent down along its length
  const L = 1.3, frond = new THREE.Shape();
  const top: P2[] = [], bot: P2[] = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, w = 0.17 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (i % 2 ? 0.7 : 1); top.push([t * L, w]); bot.push([t * L, -w]); }
  frond.moveTo(0, 0); top.forEach(([a, b]) => frond.lineTo(a, b)); bot.reverse().forEach(([a, b]) => frond.lineTo(a, b));
  const fg = new THREE.ShapeGeometry(frond, 4);
  const pos = fg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / L; pos.setZ(i, -0.55 * u * u); } // droop
  fg.computeVertexNormals();
  const greens = ["#2f5a3c", "#386b45", "#2a5236"];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(fg, leafMat(greens[i % 3]));
    m.position.y = h; m.rotation.order = "YXZ";
    m.rotation.y = (i / 9) * Math.PI * 2 + seed; m.rotation.x = -Math.PI / 2 + 0.25 + 0.15 * Math.sin(i * 2.3 + seed);
    m.castShadow = true; g.add(m);
  }
  return g;
};
/** a potted shrub: a round clump of low-poly leaves in a smaller pot */
export const shrub = (x: number, z: number, s = 1) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 10), potMat()); pot.position.y = 0.2; pot.castShadow = true;
  g.add(pot);
  const lm = leafMat("#33613f");
  for (const [dx, dy, dz, r] of [[0, 0.62, 0, 0.3], [0.18, 0.55, 0.08, 0.22], [-0.16, 0.56, -0.06, 0.22], [0.02, 0.8, -0.05, 0.2]] as number[][]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), lm); b.position.set(dx, dy, dz); b.rotation.set(dx * 5, dy * 3, dz * 7); b.castShadow = true; g.add(b);
  }
  return g;
};

// ---------------- tilework band and moulding ----------------
/** zellige-style tiles: an 8-point star lattice in lapis, turquoise and cream. 1024 x 512 = 2 m x 1 m of wall. Bold
 *  shapes only (nothing finer than a few pixels on screen), mipmapped, max anisotropy: no shimmer. */
const tileTex = () => ctex("tileBand1", 1024, 512, (g) => {
  const S = 256; // one star cell = 0.5 m
  g.fillStyle = "#e3d6b8"; g.fillRect(0, 0, 1024, 512);
  const star = (cx: number, cy: number, R: number, col: string) => {
    const ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
    g.beginPath();
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8 + Math.PI / 8, r = k % 2 ? ri : R; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 8; g.strokeStyle = "#5a4c3a"; g.stroke();
  };
  for (let cy = 0; cy <= 512; cy += S) for (let cx = 0; cx <= 1024; cx += S) {
    star(cx, cy, 108, PALETTE.lapis); star(cx, cy, 52, "#2f7f86"); star(cx, cy, 18, "#c79c48");
    star(cx + S / 2, cy + S / 2, 46, "#2f7f86");
  }
});
/** the tile band: pieces of wall face between the arches (`gaps` = arch openings as [x0, x1]), 1 m tall, plus a
 *  stone moulding along its top */
export const tileBand = (wallFrontZ: number, wallW: number, gaps: [number, number][]) => {
  const g = new THREE.Group(), H = 1.0;
  const tex = tileTex(); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 16;
  const mat = twoTone(new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const mould = limestone();
  const segs: [number, number][] = [];
  let x = -wallW / 2;
  for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > x) segs.push([x, a]); x = b; }
  if (x < wallW / 2) segs.push([x, wallW / 2]);
  for (const [a, b] of segs) {
    const w = b - a, geo = new THREE.PlaneGeometry(w, H);
    const uv = geo.attributes.uv as THREE.BufferAttribute; // UVs in metres: 1 texture = 2 m wide, 1 m tall
    for (let i = 0; i < uv.count; i++) uv.setX(i, (a + uv.getX(i) * w) / 2);
    const m = new THREE.Mesh(geo, mat); m.position.set((a + b) / 2, H / 2, wallFrontZ + 0.012); m.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.09), mould); top.position.set((a + b) / 2, H + 0.035, wallFrontZ + 0.025);
    g.add(m, top);
  }
  return g;
};

// ---------------- empty calligraphy panel ----------------
const panelTex = () => ctex("callPanel1", 1024, 256, (g) => {
  g.fillStyle = "#1c3466"; g.fillRect(0, 0, 1024, 256);              // lapis field (left empty: no text yet)
  g.strokeStyle = "#c79c48"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.lineWidth = 4; g.strokeRect(34, 34, 956, 188);
  g.fillStyle = "#c79c48";
  for (const [x, y] of [[34, 34], [990, 34], [34, 222], [990, 222]]) { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }
});
/** an empty cartouche above the arches: a stone frame and a lapis field with a gold border, NO text */
export const panel = (x: number, y: number, wallFrontZ: number, w = 4.6, h = 0.78) => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.12), limestone());
  frame.position.set(x, y, wallFrontZ + 0.04); frame.castShadow = true; frame.receiveShadow = true;
  const tex = panelTex(); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 16;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), twoTone(new THREE.MeshLambertMaterial({ map: tex })));
  face.position.set(x, y, wallFrontZ + 0.104); face.receiveShadow = true;
  g.add(frame, face);
  return g;
};

// ---------------- atmosphere ----------------
const dotTex = () => ctex("softDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
/** soft dust motes floating in the lamp light: brighter near the lamp, drifting slowly (t in seconds) */
export class Dust {
  readonly points: THREE.Points;
  private base: Float32Array; private ph: Float32Array;
  constructor(private lamp: THREE.Vector3, n = 140) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    this.base = new Float32Array(n * 3); this.ph = new Float32Array(n);
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < n; i++) {
      // inside the cone of light under and in front of the lamp
      const y = 0.3 + 2.0 * r(), spread = 0.35 + 0.55 * (1 - y / 2.4);
      this.base.set([lamp.x - 0.4 + (r() - 0.5) * 2.4 * spread, y, lamp.z + 0.6 + r() * 1.8], i * 3);
      this.ph[i] = r() * Math.PI * 2;
      const d = Math.hypot(this.base[i * 3] - lamp.x, y - lamp.y, this.base[i * 3 + 2] - lamp.z);
      const k = Math.max(0.15, 1.2 - d / 2.2) * (0.5 + 0.5 * r());
      col.set([1.6 * k, 1.05 * k, 0.45 * k], i * 3); // warm, HDR so the nearest ones catch a little bloom
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.03, sizeAttenuation: true, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    this.points.layers.set(NOINK); this.points.frustumCulled = false;
    this.update(0);
  }
  update(t: number) {
    const pos = (this.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < this.ph.length; i++) {
      const p = this.ph[i];
      pos[i * 3] = this.base[i * 3] + 0.06 * Math.sin(0.4 * t + p);
      pos[i * 3 + 1] = this.base[i * 3 + 1] + 0.08 * Math.sin(0.3 * t + 2 * p);
      pos[i * 3 + 2] = this.base[i * 3 + 2] + 0.05 * Math.cos(0.35 * t + p);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

const mistTex = () => ctex("mist1", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { // overlapping soft blobs, drawn wrapped so the texture tiles
    const x = r() * 512, y = r() * 512, rad = 40 + 110 * r(), a = 0.05 + 0.08 * r();
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
});
/** thin low mist: three soft, slowly drifting layers just above the floor (cool moonlit grey-blue) */
export class Mist {
  readonly group = new THREE.Group();
  private texs: THREE.Texture[] = [];
  constructor(cx: number, cz: number, w = 18, d = 16) {
    const base = mistTex();
    [0.06, 0.16, 0.28].forEach((y, i) => {
      const t = base.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2); t.needsUpdate = true;
      this.texs.push(t);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
        map: t, color: new THREE.Color("#9aa8d0"), transparent: true, opacity: [0.32, 0.24, 0.17][i], depthWrite: false, fog: false,
      }));
      m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.layers.set(NOINK); m.renderOrder = 2;
      this.group.add(m);
    });
  }
  update(t: number) { this.texs.forEach((tx, i) => tx.offset.set(0.004 * t * (i + 1), 0.002 * t * (i % 2 ? 1 : -1))); }
}
