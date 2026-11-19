// Shared pieces for the story sets (bedroom, street, office, gym): the set contract, two-tone materials, boxes with
// ink-friendly geometry, a sun, a sky dome, emissive panes, and painted canvas textures. All sets use the same flat,
// ink-outlined look as the courtyard; each set is built once at its own offset and shown only while it is on screen.
import * as THREE from "three";
import { twoTone, untone } from "../render/shade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import type { GradeParams } from "../render/grade";
import type { V3 } from "../camera/ease";

type C3 = [number, number, number];
/** the light of a set at a moment (fed to applyLook and the colour grade) */
export type SetLook = {
  lit: C3; shade: C3; lift: C3; sat: number; charTint: C3; cardGain: number; cardPointK?: number; pointK?: number;
  grade: GradeParams;
  /** depth haze: colour (on-screen), near and far distance in metres */
  fog?: [string, number, number];
};
export type StorySet = {
  id: string;
  root: THREE.Group;
  /** where the set sits in the world (local coordinates + offset = world) */
  offset: V3;
  /** set the time of day / props for `state` at time t (seconds), and return the light */
  apply: (state: string, t: number) => SetLook;
};

export const GRADE_DAY: GradeParams = {
  ky: [0, 0.095, 0.27, 0.56, 0.82, 0.95, 1], sat: [1.0, 1.06, 1.04],
  tintS: [0.012, 0.0], tintM: [0, 0.004], tintH: [-0.012, 0.01], vig: [0.18, 0.4],
};
export const GRADE_DUSK: GradeParams = {
  ky: [0, 0.09, 0.25, 0.53, 0.8, 0.94, 1], sat: [1.0, 1.08, 1.1],
  tintS: [0.03, 0.0], tintM: [0, 0.01], tintH: [-0.02, 0.02], vig: [0.24, 0.36],
};

export const mat = (c: string, opts: THREE.MeshLambertMaterialParameters = {}) => twoTone(new THREE.MeshLambertMaterial({ color: c, ...opts }));
/** an unlit, glowing material (screens, windows, lamps); colours above 1 bloom */
export const glow = (c: THREE.ColorRepresentation, k = 1, map?: THREE.Texture) => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), map: map ?? null });
  return m;
};

/** a box from min corner to max corner (metres), casting and receiving shadows */
export const box = (parent: THREE.Object3D, min: V3, max: V3, m: THREE.Material, shadow = true) => {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
/** a flat rectangle facing +z (rotate it to face elsewhere) */
export const plane = (parent: THREE.Object3D, w: number, h: number, m: THREE.Material, pos: V3, rotY = 0, rotX = 0) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.set(...pos); mesh.rotation.set(rotX, rotY, 0); mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
export const cyl = (parent: THREE.Object3D, r0: number, r1: number, h: number, m: THREE.Material, pos: V3, seg = 12) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

/** the set's sun: directional light 0 (the only shadow caster), aimed at `target`; call setFrom() per state */
export const sun = (parent: THREE.Object3D, target: V3, size = 10) => {
  const l = new THREE.DirectionalLight("#ffffff", 1);
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
  const sc = l.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 80;
  l.shadow.bias = -0.0005; l.shadow.normalBias = 0.02;
  l.target.position.set(...target);
  parent.add(l, l.target);
  const aimAt = new THREE.Vector3(...target), dir = new THREE.Vector3(0, 1, 0);
  const place = () => { l.target.position.copy(aimAt); l.position.copy(aimAt).addScaledVector(dir, 30); };
  return {
    light: l,
    /** the direction the light comes from */
    setFrom: (from: V3) => { dir.set(...from).normalize(); place(); },
    /** move the point it is aimed at (its shadow box is centred there) */
    aim: (at: V3) => { aimAt.set(...at); place(); },
  };
};

/** a sky dome (gradient, on-screen colours), never outlined; setColours() per state */
export const skyDome = (parent: THREE.Object3D, r = 150) => {
  const mat2 = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uTop; uniform vec3 uHor; varying vec3 vD; void main(){ gl_FragColor = vec4(mix(uHor, uTop, smoothstep(-0.02, 0.6, vD.y)), 1.0); }",
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), mat2);
  m.renderOrder = -1; m.frustumCulled = false; m.layers.set(NOINK);
  parent.add(m);
  const v = (c: string) => { const u = untone(c); return new THREE.Vector3(u.r, u.g, u.b); };
  return { mesh: m, setColours: (top: string, hor: string) => { mat2.uniforms.uTop.value.copy(v(top)); mat2.uniforms.uHor.value.copy(v(hor)); } };
};

// ---------------- painted textures (power-of-two canvases, mipmapped, max anisotropy) ----------------
const filtered = (t: THREE.Texture) => { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t; };

/** wooden floor boards, 1 texture = 2 x 2 m */
export const planks = (base = "#8a6446") => filtered(rep(ctex("planks|" + base, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  const c = new THREE.Color(base);
  for (let row = 0; row < 8; row++) {
    let x = -r() * 300;
    while (x < 1024) {
      const w = 260 + r() * 300, k = 0.88 + r() * 0.2;
      g.fillStyle = "#" + c.clone().multiplyScalar(k).getHexString();
      for (const dx of [0, 1024]) g.fillRect(x - dx + 3, row * 128 + 3, w - 6, 122);
      x += w;
    }
  }
}), 1, 1));

/** a building facade: plaster, a grid of windows (some lit), 1 texture = one building face */
export const facade = (key: string, wall: string, cols: number, rows: number, litFrac = 0.25) => filtered(ctex("facade|" + key, 512, 1024, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 512, 1024);
  const cw = 512 / cols, rh = 1024 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const lit = r() < litFrac;
    g.fillStyle = "#2b3046"; g.fillRect(i * cw + cw * 0.22 - 4, j * rh + rh * 0.2 - 4, cw * 0.56 + 8, rh * 0.55 + 8);
    g.fillStyle = lit ? "#f4d9a0" : "#5c7193"; g.fillRect(i * cw + cw * 0.22, j * rh + rh * 0.2, cw * 0.56, rh * 0.55);
    if (!lit) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(i * cw + cw * 0.22, j * rh + rh * 0.2, cw * 0.18, rh * 0.55); }
  }
}));

/** a canvas you redraw while the film plays (screens): returns the texture and a redraw function */
export const liveCanvas = (w: number, h: number) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, g, redraw: (fn: (g: CanvasRenderingContext2D) => void) => { fn(g); t.needsUpdate = true; } };
};

// ---------------- atmosphere ----------------
const beamTex = () => {
  const t = ctex("beamGrad", 64, 256, (g) => {
    for (let y = 0; y < 256; y++) {
      const along = 1 - y / 256, a = Math.pow(along, 0.8) * 0.9;
      const gr = g.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, y, 64, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
};
/** a soft volumetric light beam from `from` to `to` (local metres): two crossed additive planes with a gradient that
 *  fades along the beam and across its edges; never outlined, casts nothing. setLevel(k) scales its brightness. */
export const lightBeam = (parent: THREE.Object3D, from: V3, to: V3, w0: number, w1: number, colour: string, k = 0.35) => {
  const g = new THREE.Group();
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), len = a.distanceTo(b);
  const geo = new THREE.BufferGeometry();
  // a tapered quad: w0 wide at `from` (v = 0), w1 at `to` (v = 1); built along +y then oriented
  geo.setAttribute("position", new THREE.Float32BufferAttribute([-w0 / 2, 0, 0, w0 / 2, 0, 0, -w1 / 2, -len, 0, w1 / 2, -len, 0], 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  const m = new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(colour).multiplyScalar(k), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const base = m.color.clone();
  for (const rot of [0, Math.PI / 2]) { const q = new THREE.Mesh(geo, m); q.rotation.y = rot; q.layers.set(NOINK); q.renderOrder = 3; g.add(q); }
  g.position.copy(a);
  const dir = b.clone().sub(a).normalize();
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  parent.add(g);
  return { group: g, setLevel: (x: number) => m.color.copy(base).multiplyScalar(x) };
};

/** floating dust in a box (local min / max): tiny soft points that drift slowly; update(t) every frame */
export const dust = (parent: THREE.Object3D, min: V3, max: V3, n: number, colour: string, size = 0.018, k = 1) => {
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3), ph = new Float32Array(n);
  let sd = 9; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  for (let i = 0; i < n; i++) { base.set([min[0] + r() * (max[0] - min[0]), min[1] + r() * (max[1] - min[1]), min[2] + r() * (max[2] - min[2])], i * 3); ph[i] = r() * 6.28; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = ctex("dustDot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const m = new THREE.PointsMaterial({ map: dot, color: new THREE.Color(colour).multiplyScalar(k), size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(geo, m); pts.layers.set(NOINK); pts.frustumCulled = false; parent.add(pts);
  const update = (t: number) => {
    for (let i = 0; i < n; i++) {
      const p = ph[i];
      pos[i * 3] = base[i * 3] + 0.07 * Math.sin(0.35 * t + p); pos[i * 3 + 1] = base[i * 3 + 1] + 0.09 * Math.sin(0.27 * t + 2 * p); pos[i * 3 + 2] = base[i * 3 + 2] + 0.05 * Math.cos(0.31 * t + p);
    }
    geo.attributes.position.needsUpdate = true;
  };
  update(0);
  return { points: pts, update };
};
