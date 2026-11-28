// Video 007 "The Lesson": the signature effect - "the dunya turns to sand" - and the other 3D atmosphere.
//  ghost(spec)   a worldly thing (a car, a house, a palace, a servant) as a glowing ghost of cold, fake gold: a faint shell
//                (fresnel rim) plus tens of thousands of gold grains on its surface. It appears from the ground up
//                (appear 0..1); then it CRUMBLES: a front sweeps through it along `dir`; behind the front the shell is
//                gone and every grain falls, drifts on the wind, turns from gold to grey sand and settles/blows away.
//                Everything is computed on the GPU from uniforms (a pure function of time), on the NOINK layer.
//  drift(n)      blowing sand: grains streaming with the wind through a box (crest spray, sandstorm, ground drift), with an
//                optional box the sand flows round (the foundation it never covers).
// Shapes are made of simple solids; grains are sampled evenly over their surface (deterministic).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NOINK } from "../../render/ink";

type V3 = [number, number, number];
export type Prim =
  | { k: "box"; min: V3; max: V3; bright?: number }
  | { k: "cyl"; c: V3; r0: number; r1: number; h: number; axis?: "x" | "y" | "z"; seg?: number; bright?: number }
  | { k: "sph"; c: V3; r: number; sy?: number; half?: boolean; bright?: number }
  | { k: "cone"; c: V3; r: number; h: number; seg?: number; rot?: number; bright?: number };

const geoOf = (p: Prim): THREE.BufferGeometry => {
  let g: THREE.BufferGeometry;
  if (p.k === "box") { g = new THREE.BoxGeometry(p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]); g.translate((p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2); }
  else if (p.k === "cyl") { g = new THREE.CylinderGeometry(p.r1, p.r0, p.h, p.seg ?? 20); if (p.axis === "x") g.rotateZ(Math.PI / 2); if (p.axis === "z") g.rotateX(Math.PI / 2); g.translate(...p.c); }
  else if (p.k === "sph") { g = new THREE.SphereGeometry(p.r, 24, 14, 0, Math.PI * 2, 0, p.half ? Math.PI / 2 : Math.PI); g.scale(1, p.sy ?? 1, 1); g.translate(...p.c); }
  else { g = new THREE.ConeGeometry(p.r, p.h, p.seg ?? 4); if (p.rot) g.rotateY(p.rot); g.translate(p.c[0], p.c[1] + p.h / 2, p.c[2]); }
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  const n = g.attributes.position.count; g.setAttribute("aBright", new THREE.Float32BufferAttribute(new Float32Array(n).fill(p.bright ?? 0), 1));
  return g;
};

/** a deterministic random generator */
const rng = (seed: number) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const h3 = (x: number, y: number, z: number) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return v - Math.floor(v); };

const dotTex = (() => { let t: THREE.Texture | null = null; return () => t ??= (() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const tx = new THREE.CanvasTexture(cv); return tx; })(); })();

const GHOST_GOLD = new THREE.Color("#e3c97e");   // a cold, pale, brassy gold: fake
const SAND = new THREE.Color("#8d8a84");

export type Ghost = {
  group: THREE.Group;
  /** appear 0..1 (from the ground up), crumble: seconds since the crumble began (< 0 = intact), glow: brightness,
   *  wind: m/s^2 drift, grav: fall, pour: 1 = grains pour straight down (an hourglass), fade 0..1 hides it all */
  set: (o: { appear?: number; crumble?: number; glow?: number; wind?: V3; grav?: number; ground?: number; fade?: number; size?: number }) => void;
  height: number;
};

/** dir: the crumble front's direction (e.g. [1,0,0] = from -x to +x); span: seconds the front takes to cross it */
export const ghost = (prims: Prim[], o: { grains: number; dir: V3; span: number; seed?: number; life?: number }): Ghost => {
  const geo = mergeGeometries(prims.map(geoOf), false)!;
  geo.computeBoundingBox(); const bb = geo.boundingBox!, H = bb.max.y - bb.min.y;
  const dir = new THREE.Vector3(...o.dir).normalize();
  const corners: number[] = []; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) corners.push(dir.x * x + dir.y * y + dir.z * z);
  const dmin = Math.min(...corners), dmax = Math.max(...corners);
  const relOf = (x: number, y: number, z: number) => Math.min(1, Math.max(0, ((dir.x * x + dir.y * y + dir.z * z) - dmin) / (dmax - dmin))) * 0.82 + 0.18 * h3(Math.floor(x * 3), Math.floor(y * 3), Math.floor(z * 3));
  // ---- grains: sampled by triangle area ----
  const pos = geo.attributes.position as THREE.BufferAttribute, bri = geo.attributes.aBright as THREE.BufferAttribute, tris = pos.count / 3;
  const area = new Float64Array(tris); let tot = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < tris; i++) { a.fromBufferAttribute(pos, 3 * i); b.fromBufferAttribute(pos, 3 * i + 1); c.fromBufferAttribute(pos, 3 * i + 2); tot += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; area[i] = tot; }
  const N = o.grains, r = rng(o.seed ?? 7);
  const base = new Float32Array(N * 3), seed = new Float32Array(N), rel = new Float32Array(N), gb = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = r() * tot; let lo = 0, hi = tris - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (area[m] < x) lo = m + 1; else hi = m; }
    a.fromBufferAttribute(pos, 3 * lo); b.fromBufferAttribute(pos, 3 * lo + 1); c.fromBufferAttribute(pos, 3 * lo + 2);
    let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = a.clone().addScaledVector(b.clone().sub(a), u).addScaledVector(c.clone().sub(a), v);
    base.set([p.x, p.y, p.z], 3 * i); seed[i] = r(); rel[i] = relOf(p.x, p.y, p.z); gb[i] = bri.getX(3 * lo);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(base, 3)); pg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  pg.setAttribute("aRel", new THREE.BufferAttribute(rel, 1)); pg.setAttribute("aBright", new THREE.BufferAttribute(gb, 1));
  const U = {
    uT: { value: -10 }, uSpan: { value: o.span }, uAppear: { value: 1 }, uY0: { value: bb.min.y }, uH: { value: H }, uGlow: { value: 1 },
    uWind: { value: new THREE.Vector3(1.2, 0.1, 0.3) }, uGrav: { value: 2.4 }, uGround: { value: 0 }, uLife: { value: o.life ?? 3.2 },
    uSize: { value: 0.05 }, uScale: { value: 1100 }, uFade: { value: 1 }, uMap: { value: dotTex() },
    uGold: { value: GHOST_GOLD.clone() }, uSand: { value: SAND.clone() },
    uDir: { value: dir.clone() }, uDmin: { value: dmin }, uDmax: { value: dmax },
  };
  const pm = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aRel; attribute float aBright;
      uniform float uT, uSpan, uAppear, uY0, uH, uGrav, uGround, uLife, uSize, uScale; uniform vec3 uWind;
      varying float vA; varying float vMix; varying float vB;
      void main(){
        vec3 p = position; float age = uT - aRel * uSpan;
        vec3 rn = vec3(fract(aSeed * 12.9898) - 0.5, fract(aSeed * 78.233), fract(aSeed * 37.719) - 0.5);
        float shown = smoothstep(0.0, 0.04, uAppear * 1.04 - (p.y - uY0) / max(uH, 0.01));
        vMix = 0.0; vA = shown; vB = aBright;
        if (age > 0.0) {
          float a = age;
          p += rn * a * vec3(0.9, 0.35, 0.9) * (0.4 + 0.6 * rn.y);                          // a loose spray as it breaks
          p += uWind * a * a * (0.35 + 0.8 * rn.y);                                         // carried off on the wind
          float fall = 0.5 * uGrav * a * a * (0.55 + 0.9 * rn.y);
          p.y = max(p.y - fall, uGround + 0.02 + 0.06 * rn.y + 0.25 * max(0.0, 1.0 - a));    // settles on the sand, still drifting
          vMix = smoothstep(0.0, 0.9, a);
          vA *= 1.0 - smoothstep(uLife * 0.45, uLife, a + rn.y * 0.8);
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uScale / -mv.z * (1.0 + 0.5 * vMix) * (0.7 + 0.6 * rn.y), 0.8, 18.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uGold, uSand; uniform float uGlow, uFade; varying float vA; varying float vMix; varying float vB;
      void main(){
        float d = texture2D(uMap, gl_PointCoord).a; if (vA * d < 0.004) discard;
        vec3 g = uGold * uGlow * (1.0 + 1.6 * vB);
        vec3 col = mix(g, uSand * 0.55, vMix);
        gl_FragColor = vec4(col * vA * d * uFade * (1.0 - 0.45 * vMix), 1.0);
      }`,
  });
  const points = new THREE.Points(pg, pm); points.frustumCulled = false; points.layers.set(NOINK);
  // ---- the shell: a faint fresnel rim of gold, eaten away behind the crumble front, a hot edge at the front ----
  const sm = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `attribute float aBright; varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vB;
      void main(){ vP = position; vB = aBright; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uSpan, uAppear, uY0, uH, uGlow, uFade, uDmin, uDmax; uniform vec3 uGold, uDir;
      varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vB;
      float h3(vec3 p){ return fract(sin(dot(floor(p * 3.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        float rel = clamp((dot(uDir, vP) - uDmin) / (uDmax - uDmin), 0.0, 1.0) * 0.82 + 0.18 * h3(vP);
        float front = uT / uSpan;
        if (rel < front) discard;
        float app = uAppear * 1.04 - (vP.y - uY0) / max(uH, 0.01); if (app < 0.0) discard;
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float edge = (1.0 - smoothstep(0.0, 0.06, rel - front)) * step(0.0, uT) + (1.0 - smoothstep(0.0, 0.05, app)) * step(uAppear, 0.999);
        vec3 col = uGold * uGlow * (0.05 + 0.5 * fr + 1.6 * vB * 0.35) + uGold * 2.2 * edge;
        gl_FragColor = vec4(col * uFade, 1.0);
      }`,
  });
  const shell = new THREE.Mesh(geo, sm); shell.layers.set(NOINK); shell.frustumCulled = false;
  const group = new THREE.Group(); group.add(shell, points);
  return {
    group, height: H,
    set: (s) => {
      if (s.appear !== undefined) U.uAppear.value = s.appear;
      if (s.crumble !== undefined) U.uT.value = s.crumble;
      if (s.glow !== undefined) U.uGlow.value = s.glow;
      if (s.wind) U.uWind.value.set(...s.wind);
      if (s.grav !== undefined) U.uGrav.value = s.grav;
      if (s.ground !== undefined) U.uGround.value = s.ground;
      if (s.fade !== undefined) U.uFade.value = s.fade;
      if (s.size !== undefined) U.uSize.value = s.size;
      group.visible = (s.fade ?? U.uFade.value) > 0.001 && U.uAppear.value > 0.001 && U.uT.value < o.span + (o.life ?? 3.2) + 1;
    },
  };
};

// ---------------- the shapes (local metres, standing on y = 0, facing +x for the car) ----------------
export const CAR: Prim[] = [
  { k: "box", min: [-2.3, 0.32, -0.92], max: [2.3, 0.82, 0.92] },                                // the long low body
  { k: "box", min: [-0.9, 0.82, -0.78], max: [0.9, 1.22, 0.78] },                                // the cabin
  { k: "box", min: [0.9, 0.82, -0.78], max: [1.5, 0.98, 0.78] }, { k: "box", min: [-1.6, 0.82, -0.78], max: [-0.9, 1.02, 0.78] },  // windscreen and rear slopes (stepped)
  { k: "box", min: [2.0, 0.5, -0.8], max: [2.32, 0.66, -0.5], bright: 1 }, { k: "box", min: [2.0, 0.5, 0.5], max: [2.32, 0.66, 0.8], bright: 1 },   // headlights
  { k: "box", min: [-2.32, 0.55, -0.85], max: [-2.25, 0.68, 0.85], bright: 0.6 },                 // tail light bar
  { k: "box", min: [-2.35, 0.95, -0.85], max: [-2.0, 1.0, 0.85] },                                 // the spoiler
  ...([[-1.45, -0.92], [1.45, -0.92], [-1.45, 0.92], [1.45, 0.92]] as [number, number][]).map(([x, z]): Prim => ({ k: "cyl", c: [x, 0.34, z], r0: 0.34, r1: 0.34, h: 0.26, axis: "z", seg: 22 })),
];
export const HOUSE: Prim[] = [
  { k: "box", min: [-5, 0, -3.5], max: [5, 3.6, 3.5] }, { k: "box", min: [-3.5, 3.6, -3], max: [4, 6.6, 3] },
  { k: "cone", c: [0.25, 6.6, 0], r: 5.6, h: 2.6, seg: 4, rot: Math.PI / 4 },
  { k: "box", min: [-0.7, 0, 3.5], max: [0.7, 2.4, 3.62], bright: 0.5 },                         // the door
  ...[-3.6, -1.9, 1.9, 3.6].map((x): Prim => ({ k: "box", min: [x - 0.55, 1.2, 3.5], max: [x + 0.55, 2.5, 3.6], bright: 1 })),   // lit windows
  ...[-2.2, 0.25, 2.6].map((x): Prim => ({ k: "box", min: [x - 0.5, 4.4, 3.0], max: [x + 0.5, 5.6, 3.1], bright: 1 })),
  { k: "box", min: [-6.5, 0, 3.6], max: [6.5, 0.9, 3.75] },                                       // a low garden wall
  { k: "box", min: [5.2, 0, -2.5], max: [8.6, 2.6, 2.5] },                                        // the garage
];
export const PALACE = (s = 1): Prim[] => {
  const S = (v: V3): V3 => [v[0] * s, v[1] * s, v[2] * s], p: Prim[] = [];
  p.push({ k: "box", min: S([-16, 0, -10]), max: S([16, 13, 10]) }, { k: "box", min: S([-10, 13, -7]), max: S([10, 18, 7]) });
  p.push({ k: "cyl", c: S([0, 20.5, 0]), r0: 6.2 * s, r1: 6.2 * s, h: 5 * s, seg: 28 }, { k: "sph", c: S([0, 23, 0]), r: 6.6 * s, sy: 1.15, half: true, bright: 0.3 });
  p.push({ k: "cyl", c: S([0, 31.6, 0]), r0: 0.35 * s, r1: 0.1 * s, h: 2.2 * s, seg: 10, bright: 0.8 });
  for (const [x, z] of [[-16, -10], [16, -10], [-16, 10], [16, 10]]) {
    p.push({ k: "cyl", c: S([x, 12, z]), r0: 2.6 * s, r1: 2.2 * s, h: 24 * s, seg: 20 }, { k: "sph", c: S([x, 24, z]), r: 2.6 * s, sy: 1.3, half: true, bright: 0.3 });
  }
  for (let i = -3; i <= 3; i++) p.push({ k: "box", min: S([i * 4 - 1.1, 2.5, 10]), max: S([i * 4 + 1.1, 9.5, 10.2]), bright: 0.9 });   // tall arched windows
  for (let i = -2; i <= 2; i++) p.push({ k: "box", min: S([i * 3.6 - 0.9, 14, 7]), max: S([i * 3.6 + 0.9, 17, 7.2]), bright: 0.9 });
  p.push({ k: "box", min: S([-3, 0, 10]), max: S([3, 8, 10.4]), bright: 0.5 }, { k: "box", min: S([-20, 0, 10]), max: S([20, 1.2, 12]) });
  return p;
};
export const SERVANT = (s = 1): Prim[] => [
  { k: "cyl", c: [0, 0.72 * s, 0], r0: 0.34 * s, r1: 0.24 * s, h: 1.44 * s, seg: 18 },           // a long robe
  { k: "cyl", c: [0, 1.38 * s, 0], r0: 0.27 * s, r1: 0.2 * s, h: 0.16 * s, seg: 16 },            // shoulders
  { k: "sph", c: [0, 1.6 * s, 0], r: 0.13 * s, sy: 1.15 },                                         // a head (no face)
  { k: "sph", c: [0, 1.66 * s, 0], r: 0.135 * s, sy: 0.6, half: true, bright: 0.4 },            // a cap
  { k: "box", min: [0.14 * s, 1.02 * s, -0.2 * s], max: [0.3 * s, 1.08 * s, 0.2 * s], bright: 0.8 },   // a tray held out
];

// ---------------- blowing sand ----------------
export type Drift = { points: THREE.Points; set: (o: { origin?: V3; size?: V3; flow?: V3; t?: number; opacity?: number; colour?: string; lift?: number; avoid?: [number, number, number, number] | null; grain?: number }) => void };
export const drift = (n: number, seed = 3): Drift => {
  const r = rng(seed), base = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { base.set([r(), r(), r()], 3 * i); sd[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(base, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  const U = { uO: { value: new THREE.Vector3() }, uS: { value: new THREE.Vector3(10, 2, 10) }, uFlow: { value: new THREE.Vector3(1, 0, 0) }, uT: { value: 0 }, uOp: { value: 0.6 }, uLift: { value: 0 },
    uCol: { value: new THREE.Color("#9a968e") }, uAvoid: { value: new THREE.Vector4(0, 0, 0, 0) }, uSize: { value: 0.035 }, uScale: { value: 1100 }, uMap: { value: dotTex() } };
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform vec3 uO, uS, uFlow; uniform float uT, uLift, uSize, uScale; uniform vec4 uAvoid; varying float vA;
      void main(){
        float sp = 0.6 + 0.8 * aSeed;
        vec3 q = fract(position + uFlow * uT * sp / uS + vec3(0.0, 0.03 * sin(uT * 2.0 + aSeed * 40.0), 0.0));
        vec3 fd = normalize(uFlow + vec3(1e-5)); float along = dot(q - 0.5, fd) / max(dot(vec3(0.5), abs(fd)), 0.5) * 0.5 + 0.5;   // 0..1 along the flow
        vec3 p = uO + (q - vec3(0.5, 0.0, 0.5)) * uS;
        p.y += uLift * along * along * uS.y * 2.0;                         // spray rising off a crest
        if (uAvoid.z > 0.0) {                                              // flow round a box (x, z centre, half sizes)
          vec2 d = p.xz - uAvoid.xy; vec2 e = vec2(uAvoid.z, uAvoid.w) + 0.25;
          if (abs(d.x) < e.x && abs(d.y) < e.y) { p.z = uAvoid.y + sign(d.y + 0.0001) * e.y; p.y += 0.15; }
        }
        vA = smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.85, 1.0, along)) * (0.4 + 0.6 * fract(aSeed * 7.13));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uScale / -mv.z * (0.6 + 0.8 * fract(aSeed * 3.7)), 0.7, 10.0);
      }`,
    fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform vec3 uCol; uniform float uOp; varying float vA;
      void main(){ float d = texture2D(uMap, gl_PointCoord).a; if (d * vA < 0.003) discard; gl_FragColor = vec4(uCol * d * vA * uOp, 1.0); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.layers.set(NOINK);
  return { points: p, set: (o) => {
    if (o.origin) U.uO.value.set(...o.origin); if (o.size) U.uS.value.set(...o.size); if (o.flow) U.uFlow.value.set(...o.flow);
    if (o.t !== undefined) U.uT.value = o.t; if (o.opacity !== undefined) { U.uOp.value = o.opacity; p.visible = o.opacity > 0.001; }
    if (o.colour) U.uCol.value.set(o.colour); if (o.lift !== undefined) U.uLift.value = o.lift; if (o.grain !== undefined) U.uSize.value = o.grain;
    if (o.avoid !== undefined) U.uAvoid.value.set(...(o.avoid ?? [0, 0, 0, 0]));
  } };
};
