// Nature (video 006 "Hold On To This"): calm, golden-hour and blue-hour worlds far apart in one set; the state picks the
// world (the others are hidden). Foliage, water, clouds and mist are never outlined (NOINK); props are.
//   "forest:<p>"            a misty pine forest at dawn, a path, light rays through the trees, pollen
//   "cliff:<p>"             a rock above a sea of clouds at sunrise, far peaks
//   "canyon:<p>"            a wooden porch on the rim of a red canyon, a river winding below; an empty chair, a kufi on it
//   "window:<p>"            an old room: a window, curtains, a shawl on the sill, a cup of tea steaming, light through
//   "stream:<p>"            a clear stream over stones in the sun; gold coins fall (p) and wash away
//   "home:<p>"              a family home at dusk: warm windows, small shoes by the door, a swing moving in the wind
//   "valley:<p>"            a room with a big window over a green valley; a wheelchair
//   "lake:<light>:<lantern>:<fog>:<birds>"   a mountain lake, a small masjid with a lantern on the shore. light 0 = blue
//                           hour (night falling), 1 = dawn; lantern 0..1; fog 0..1; birds 0..1 (taking off)
//   "bamboo:<x>"            a bamboo grove road at night; a sleek car at road position x
//   "pent:<dawn>"           a penthouse over the night city (lavender and gold lights); dawn 0..1
//   "wheat:<sun>"           a wheat field at sunset (sun 0..1: how low and gold), a path through it
//   "lavender:<p>"          lavender rows at golden hour
// Men and boys only on screen; nothing here depicts a being beyond them.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import type { GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, cyl, sun, lightBeam, dust, facade } from "./common";
import { skyFor, pointsOf, hash, dotTex, steamTex, GRADE_WARM, GRADE_STORM } from "./bookworlds";

export const NATURE: Record<string, V3> = {
  forest: [0, 0, 0], cliff: [300, 0, 0], canyon: [600, 0, 0], window: [900, 0, 0], stream: [1200, 0, 0], home: [1500, 0, 0],
  valley: [1800, 0, 0], lake: [2100, 0, 0], bamboo: [2400, 0, 0], pent: [2700, 0, 0], wheat: [3000, 0, 0], lavender: [3300, 0, 0],
};
/** where things are (local to each world) */
export const NAT = {
  forestPath: (z: number) => 0.8 * Math.sin(z * 0.08),
  chair: [0.4, 0, -0.2] as V3, mushaf: [0, 0, -3] as V3, sill: [0, 1.0, -2.75] as V3, wheelchair: [0, 0, -1.2] as V3, sofa: [0, 0, 1.1] as V3, table: [0, 0, -0.35] as V3,
  masjid: [0, 0, -14] as V3, lantern: [-2.9, 0, -9.2] as V3, prayer: [0.6, 0, -9.0] as V3, stoneBank: [1.3, 0, 0.6] as V3,
  wheatPath: (z: number) => 2.2 * Math.sin(z * 0.05),
};
export const GRADE_GOLD: GradeParams = { ky: [0, 0.07, 0.24, 0.54, 0.82, 0.955, 1], sat: [1.04, 1.1, 1.06], tintS: [0.02, -0.01], tintM: [-0.005, 0.02], tintH: [-0.03, 0.035], vig: [0.24, 0.34] };
const GRADE_BLUE: GradeParams = GRADE_STORM;

// ---------------- shared shaders ----------------
const NOISE = /* glsl */ `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 w = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), w.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), w.x), w.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }`;
type Fog = { uFog: { value: THREE.Color }; uFogD: { value: THREE.Vector2 } };
const fogU = (): Fog => ({ uFog: { value: new THREE.Color("#c8b090") }, uFogD: { value: new THREE.Vector2(40, 300) } });
/** grass, wheat or lavender: instanced blades swaying in the wind (unlit, coloured base -> tip) */
const field = (parent: THREE.Object3D, n: number, place: (i: number) => [number, number, number, number] | null, w: number, base: string, tip: string, split = 0.0) => {
  const geo = new THREE.PlaneGeometry(w, 1, 1, 3); geo.translate(0, 0.5, 0);
  const u = { uT: { value: 0 }, uWind: { value: 1 }, uBase: { value: new THREE.Color(base) }, uTip: { value: new THREE.Color(tip) }, uSplit: { value: split }, uLight: { value: new THREE.Color(1, 1, 1) }, ...fogU() };
  const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `uniform float uT, uWind; varying float vH, vD, vR;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vH = uv.y; vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float ph = o.x * 0.35 + o.z * 0.21, s = (sin(uT * 1.1 + ph) * 0.6 + sin(uT * 1.9 + ph * 1.7) * 0.3) * uWind;
        w.x += s * 0.16 * vH * vH; w.z += s * 0.07 * vH * vH; vR = fract(sin(dot(o.xz, vec2(12.9898, 78.233))) * 43758.5453);
        vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 uBase, uTip, uLight, uFog; uniform vec2 uFogD; uniform float uSplit; varying float vH, vD, vR;
      void main(){ float k = uSplit > 0.0 ? smoothstep(uSplit - 0.08, uSplit + 0.08, vH) : vH; vec3 c = mix(uBase, uTip, k) * (0.82 + 0.36 * vR) * uLight * (0.55 + 0.45 * vH);
        c = mix(c, uFog, smoothstep(uFogD.x, uFogD.y, vD)); gl_FragColor = vec4(c, 1.0); }` });
  const mesh = new THREE.InstancedMesh(geo, m, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const pl = place(i); if (!pl) continue; const [x, z, h, rot] = pl; q.setFromEuler(e.set(0, rot, (hash(i + 7) - 0.5) * 0.25)); M.compose(P.set(x, 0, z), q, S.set(1, h, 1)); mesh.setMatrixAt(k++, M); }
  mesh.count = k; mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.layers.set(NOINK); parent.add(mesh);
  return u;
};
/** water: ripples, a fresnel sky reflection, the sun's glint, transparent where it is shallow */
const water = (parent: THREE.Object3D, w: number, d: number, pos: V3, alpha = 1) => {
  const u = { uT: { value: 0 }, uDeep: { value: new THREE.Color("#1a3a48") }, uShallow: { value: new THREE.Color("#4a7a7a") }, uSky: { value: new THREE.Color("#c8d8e8") }, uSunCol: { value: new THREE.Color("#ffe0a0") },
    uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() }, uFlow: { value: new THREE.Vector2(0, 0) }, uAlpha: { value: alpha }, uGlint: { value: 1 }, ...fogU() };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: alpha < 1, depthWrite: alpha >= 1,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uT, uAlpha, uGlint; uniform vec3 uDeep, uShallow, uSky, uSunCol, uSunDir, uFog; uniform vec2 uFlow, uFogD; varying vec3 vW;
      void main(){ vec2 q = vW.xz + uFlow * uT;
        vec3 N = normalize(vec3(0.09 * sin(q.x * 3.1 + uT * 1.3) + 0.06 * sin(q.y * 5.7 - uT * 1.7 + q.x) + 0.04 * sin((q.x + q.y) * 9.0 + uT * 2.3), 1.0,
                                0.09 * cos(q.y * 2.9 + uT * 1.1) + 0.06 * cos(q.x * 6.1 + uT * 0.7 - q.y) + 0.04 * cos((q.x - q.y) * 8.0 - uT * 2.1)));
        vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0), d = length(cameraPosition - vW);
        vec3 c = mix(uShallow, uDeep, clamp(d / 60.0, 0.0, 1.0)); c = mix(c, uSky, 0.2 + 0.7 * fr);
        vec3 R = reflect(-V, N); c += uSunCol * uGlint * (pow(max(dot(R, uSunDir), 0.0), 140.0) * 2.5 + pow(max(dot(R, uSunDir), 0.0), 12.0) * 0.18);
        c = mix(c, uFog, smoothstep(uFogD.x, uFogD.y, d)); gl_FragColor = vec4(c, mix(uAlpha, 1.0, fr)); }` });
  const g = new THREE.PlaneGeometry(w, d, 1, 1); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(...pos); mesh.layers.set(NOINK); mesh.renderOrder = 1; parent.add(mesh);
  return u;
};
/** soft mist: horizontal sheets of noise drifting (NOINK) */
const mistTex = () => ctex("natMist", 512, 512, (g, r) => { for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, rad = 40 + 110 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); } });
const mist = (parent: THREE.Object3D, n: number, y0: number, y1: number, size: number, centre: V3 = [0, 0, -20]) => {
  const sheets = Array.from({ length: n }, (_, i) => { const t = rep(mistTex().clone(), 2, 2); t.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.5, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); p.rotation.x = -Math.PI / 2; p.position.set(centre[0], y0 + (y1 - y0) * (i / Math.max(1, n - 1)), centre[2]); p.layers.set(NOINK); p.renderOrder = 4; parent.add(p); return { p, m, t }; });
  return { sheets, update: (t: number, col: THREE.ColorRepresentation, k: number) => sheets.forEach((s, i) => { s.t.offset.set(t * 0.004 * (1 + i * 0.3), t * 0.002 * (i % 2 ? 1 : -1)); s.m.color.set(col); s.m.opacity = k * (0.35 + 0.15 * (i % 3)); s.p.visible = k > 0.01; }) };
};
/** pine trees (three cone tiers + a trunk), instanced; never outlined */
const pines = (parent: THREE.Object3D, spots: [number, number, number][], col = "#28402f") => {
  const tiers = [[1.0, 0.55, 0.36], [0.78, 0.45, 0.58], [0.52, 0.38, 0.8]].map(([r, h, y]) => ({ geo: new THREE.ConeGeometry(r, h, 9), y, h }));
  const greens = tiers.map((t, i) => { const c0 = new THREE.Color(col).offsetHSL(0, 0, i * 0.04), m = new THREE.InstancedMesh(t.geo, new THREE.MeshLambertMaterial({ color: c0, emissive: c0.clone().multiplyScalar(0.35) }), spots.length); m.layers.set(NOINK); m.frustumCulled = false; parent.add(m); return m; });
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.05, 1, 6), mat("#3a2a20"), spots.length); trunk.layers.set(NOINK); trunk.frustumCulled = false; parent.add(trunk);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  spots.forEach(([x, z, h], i) => { tiers.forEach((t, j) => { M.compose(P.set(x, h * t.y, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i) * 6), S.set(h * 0.32, h * t.h * 1.4, h * 0.32)); greens[j].setMatrixAt(i, M); }); M.compose(P.set(x, h * 0.12, z), Q.identity(), S.set(h * 0.5, h * 0.25, h * 0.5)); trunk.setMatrixAt(i, M); });
};
/** a ground height field (w x d, segments) coloured by height; f gives the height at (x, z) */
const terrain = (parent: THREE.Object3D, w: number, d: number, seg: number, f: (x: number, z: number) => number, colour: (h: number, x: number, z: number) => THREE.Color, pos: V3 = [0, 0, 0]) => {
  const g = new THREE.PlaneGeometry(w, d, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + pos[0], z = p.getZ(i) + pos[2], h = f(x, z); p.setY(i, h); colour(h, x, z).toArray(cols, i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.position.set(pos[0], pos[1], pos[2]); m.receiveShadow = true; m.layers.set(NOINK); parent.add(m);
  return m;
};
const mountains = (parent: THREE.Object3D, n: number, r0: number, r1: number, col: string, arc = [Math.PI * 0.75, Math.PI * 1.25], h = [40, 110]) => {
  for (let i = 0; i < n; i++) { const a = arc[0] + (arc[1] - arc[0]) * (i + hash(i) * 0.6) / n, r = r0 + (r1 - r0) * hash(i + 3), hh = h[0] + (h[1] - h[0]) * hash(i + 5);
    const geo = new THREE.ConeGeometry(hh * 0.9, hh, 7, 3); const p = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) { const y = p.getY(j); p.setX(j, p.getX(j) * (1 + 0.25 * (hash(j + i * 31) - 0.5))); p.setZ(j, p.getZ(j) * (1 + 0.25 * (hash(j * 3 + i) - 0.5))); p.setY(j, y + (y > hh * 0.45 ? 0 : 2 * (hash(j + 9) - 0.5))); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat(col)); m.position.set(Math.sin(a) * r, hh / 2 - 6, Math.cos(a) * r); m.layers.set(NOINK); parent.add(m); }
};
const birdsOf = (parent: THREE.Object3D, n: number) => {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 12), 3));
  const m = new THREE.LineBasicMaterial({ color: "#2a2a30", transparent: true }), l = new THREE.LineSegments(geo, m); l.frustumCulled = false; l.layers.set(NOINK); parent.add(l);
  return { l, set: (birds: { x: number; y: number; z: number; s: number; flap: number }[]) => { const p = geo.attributes.position as THREE.BufferAttribute;
    birds.forEach((b, i) => { const wy = b.s * 0.6 * Math.sin(b.flap); p.array.set([b.x - b.s, b.y + wy, b.z, b.x, b.y, b.z, b.x, b.y, b.z, b.x + b.s, b.y + wy, b.z], i * 12); }); p.needsUpdate = true; } };
};

export const buildNature = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const area = (k: string) => { const g = new THREE.Group(); g.position.set(...NATURE[k]); root.add(g); return g; };
  const rnd = (i: number, a: number, b: number) => a + (b - a) * hash(i);

  // ======================= FOREST: dawn, a path through misty pines =======================
  const F = area("forest"), skyF = skyFor(F);
  terrain(F, 240, 240, 120, (x, z) => 0.25 * Math.sin(x * 0.15) * Math.sin(z * 0.1) + (Math.abs(x - NAT.forestPath(z)) < 1.2 ? -0.03 : 0), (h, x, z) => Math.abs(x - NAT.forestPath(z)) < 1.0 ? new THREE.Color("#8a7458") : new THREE.Color("#3e4a2e").lerp(new THREE.Color("#5a5a34"), hash(Math.floor(x * 3) + Math.floor(z * 3) * 917)), [0, 0, -60]);
  pines(F, Array.from({ length: 700 }, (_, i) => { const z = rnd(i, 14, -150), x = (hash(i + 1) < 0.5 ? -1 : 1) * rnd(i + 2, 3.2, 60) + NAT.forestPath(z); return [x, z, rnd(i + 3, 9, 22)] as [number, number, number]; }), "#3e6a42");
  const fieldF = field(F, 9000, (i) => { const z = rnd(i * 7, 10, -60), x = rnd(i * 7 + 1, -16, 16); return Math.abs(x - NAT.forestPath(z)) < 1.1 ? null : [x, z, rnd(i * 7 + 2, 0.2, 0.55), hash(i) * 6]; }, 0.05, "#2e4a26", "#a8b860");
  const raysF = [[-14, 26, -40, 6, 0, -8], [-6, 26, -46, 10, 0, -14], [-22, 26, -30, 2, 0, -2], [4, 26, -50, 14, 0, -18], [-10, 26, -22, 4, 0, 2]].map(([a, b, c, d, e, f]) => lightBeam(F, [a, b, c], [d, e, f], 2.5, 7, "#ffd8a0", 0.22));
  const mistF = mist(F, 4, 0.6, 4.5, 160, [0, 0, -40]); const pollenF = dust(F, [-6, 0.2, -14], [6, 4, 6], 600, "#ffe8b0", 0.035, 1.4);
  const mushaf = new THREE.Group(); F.add(mushaf); const mx = NAT.forestPath(NAT.mushaf[2]);
  box(mushaf, [-0.085, -0.06, -0.014], [0.085, 0.06, 0.014], mat("#1e5a3e")); box(mushaf, [-0.079, -0.054, 0.0141], [0.079, 0.054, 0.0152], new THREE.MeshLambertMaterial({ color: "#c8a050", emissive: new THREE.Color("#3a2800") }), false);
  box(mushaf, [-0.055, -0.034, 0.0153], [0.055, 0.034, 0.0165], mat("#1e5a3e"), false); box(mushaf, [-0.082, -0.057, -0.0145], [0.08, 0.057, 0.011], mat("#efe6d0"), false);
  mushaf.position.set(mx, 1.06, NAT.mushaf[2] + 0.1); mushaf.rotation.x = -0.3; mushaf.traverse((o) => { o.userData.noCollide = true; });
  const mushafL = new THREE.PointLight("#ffe0a8", 0, 1.5, 1.6); mushafL.position.set(mx - 0.2, 1.5, NAT.mushaf[2] + 0.6); F.add(mushafL);
  const sunF = sun(F, [0, 0, -4], 20); sunF.setFrom([-0.9, 0.45, -0.5]); sunF.light.color.set("#ffd8a0");

  // ======================= CLIFF: a rock above a sea of clouds at sunrise =======================
  const C = area("cliff"), skyC = skyFor(C);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4, 1), mat("#6a5a52")); rock.scale.set(1.2, 1.6, 1.0); rock.position.set(0, -6.3, 0); C.add(rock);
  cyl(C, 1.6, 2.3, 0.6, mat("#7a6a5e"), [0, -0.3, 0], 9); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(i, 0.6, 1.4), 0), mat("#5e5048")); s.position.set(rnd(i + 1, -3, 3), rnd(i + 2, -2.5, -1), rnd(i + 3, -2, 2)); C.add(s); }
  const cloudU = { uT: { value: 0 }, uLit: { value: new THREE.Color("#fff0d8") }, uShade: { value: new THREE.Color("#b890a8") }, ...fogU() };
  const cloudM = new THREE.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false, vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: NOISE + /* glsl */ `uniform float uT; uniform vec3 uLit, uShade, uFog; uniform vec2 uFogD; varying vec3 vW;
      void main(){ vec2 p = vW.xz; float c = fbm(p * 0.025 + vec2(uT * 0.012, uT * 0.006)), c2 = fbm(p * 0.07 - uT * 0.02 + c);
        float dens = smoothstep(0.25, 0.65, c * 0.7 + c2 * 0.45); vec3 col = mix(uShade, uLit, smoothstep(0.3, 0.85, c2 * 0.6 + c * 0.5));
        float d = length(cameraPosition - vW); col = mix(col, uFog, smoothstep(uFogD.x, uFogD.y, d)); gl_FragColor = vec4(col, 0.55 + 0.45 * dens); }` });
  for (const [y, s] of [[-22, 1], [-19, 0.8]]) { const g = new THREE.PlaneGeometry(1400, 1400); g.rotateX(-Math.PI / 2); const cm = new THREE.Mesh(g, s < 1 ? cloudM.clone() : cloudM); if (s < 1) (cm.material as THREE.ShaderMaterial).uniforms = cloudU; cm.position.y = y; cm.layers.set(NOINK); cm.renderOrder = 2; C.add(cm); }
  mountains(C, 9, 160, 420, "#5a5a78", [Math.PI * 0.6, Math.PI * 1.4], [60, 140]);
  const sunC = sun(C, [0, 0, 0], 8); sunC.setFrom([0.2, 0.25, -1]); sunC.light.color.set("#ffc080"); const windC = dust(C, [-4, 0, -4], [4, 3, 4], 200, "#fff0d0", 0.03, 1.2);

  // ======================= CANYON: a porch on the rim; a river below; the empty chair, the kufi =======================
  const K = area("canyon"), skyK = skyFor(K);
  const riverX = (z: number) => -16 + 7 * Math.sin(z * 0.035) + 3 * Math.sin(z * 0.09);
  const canyonH = (x: number, z: number) => { const dx = Math.abs(x - riverX(z)), wall = Math.min(1, Math.max(0, (dx - 4) / 9)); const terr = Math.floor(wall * 4) / 4 * 0.6 + wall * 0.4; const h = -16 + 15.6 * terr + 1.2 * Math.sin(z * 0.2 + x * 0.1) * wall; return Math.abs(x) < 3.2 && Math.abs(z) < 3 ? Math.min(h, -0.3) : h; };
  const reds = ["#7a3020", "#a84a2a", "#c8683a", "#b85a32", "#d8885a"].map((c) => new THREE.Color(c));
  terrain(K, 300, 400, 200, canyonH, (h) => reds[Math.max(0, Math.min(4, Math.floor((h + 16) / 3.5)))].clone().lerp(new THREE.Color("#e8a070"), 0.1 * Math.sin(h * 3) + 0.1), [-10, 0, -120]);
  const riverU = water(K, 30, 400, [0, -15.2, -120]); riverU.uDeep.value.set("#1e4a4a"); riverU.uShallow.value.set("#3a7a6a"); riverU.uFlow.value.set(0, 1.2);
  { const rv = K.children[K.children.length - 1] as THREE.Mesh; const g = new THREE.PlaneGeometry(9, 400, 2, 200); g.rotateX(-Math.PI / 2); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + riverX(p.getZ(i) - 120)); rv.geometry = g; rv.position.set(0, -15.2, -120); }
  const deck = new THREE.Group(); K.add(deck); const wood = mat("#8a5a36"), woodD = mat("#6a4226");
  box(deck, [-2.2, -0.15, -1.6], [2.2, 0, 1.8], wood); for (let x = -2.1; x < 2.2; x += 0.3) box(deck, [x, 0, -1.6], [x + 0.02, 0.003, 1.8], woodD, false);
  for (const x of [-2.15, 2.15]) for (const z of [-1.55, 1.7]) box(deck, [x - 0.06, -3, z - 0.06], [x + 0.06, 0, z + 0.06], woodD);
  box(deck, [-2.2, 0.9, -1.62], [2.2, 0.96, -1.56], woodD); for (let x = -2.1; x <= 2.2; x += 0.42) box(deck, [x, 0, -1.61], [x + 0.05, 0.9, -1.57], woodD);
  const chairK = new THREE.Group(); chairK.position.set(...NAT.chair); chairK.rotation.y = 0.5; K.add(chairK);
  box(chairK, [-0.28, 0.42, -0.26], [0.28, 0.47, 0.26], wood); box(chairK, [-0.28, 0.47, 0.22], [0.28, 1.05, 0.27], wood); for (const [x, z] of [[-0.25, -0.23], [0.25, -0.23], [-0.25, 0.23], [0.25, 0.23]]) box(chairK, [x - 0.025, 0, z - 0.025], [x + 0.025, 0.42, z + 0.025], woodD);
  for (const x of [-0.27, 0.27]) box(chairK, [x - 0.025, 0.47, -0.24], [x + 0.025, 0.68, 0.24], woodD);
  const kufi = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("#f2eee3")); kufi.scale.set(1, 0.85, 1); kufi.position.set(0.02, 0.47, -0.02); chairK.add(kufi);
  const sunK = sun(K, [0, 0, 0], 10); sunK.setFrom([0.7, 0.35, -0.75]); sunK.light.color.set("#ffb070"); const dustK = dust(K, [-3, 0.1, -3], [3, 2.5, 3], 260, "#ffe0b0", 0.03, 1.2);

  // ======================= WINDOW: an old room; light through the curtains; a shawl, tea steaming =======================
  const Wd = area("window");
  const wallM = mat("#d8c8b0"); const [sx, sy, sz] = NAT.sill;
  box(Wd, [-4, 0, -2.9], [-0.8, 3.2, -2.6], wallM); box(Wd, [0.8, 0, -2.9], [4, 3.2, -2.6], wallM); box(Wd, [-0.8, 0, -2.9], [0.8, sy - 0.04, -2.6], wallM); box(Wd, [-0.8, 2.4, -2.9], [0.8, 3.2, -2.6], wallM);
  box(Wd, [-4, -0.05, -3], [4, 0, 3], mat("#7a5a3e")); box(Wd, [-4, 0, -2.9], [-3.8, 3.2, 3], wallM);
  box(Wd, [-0.95, sy - 0.04, -2.95], [0.95, sy, -2.45], mat("#ece4d4"));                                            // the sill
  for (const x of [-0.8, 0, 0.8]) box(Wd, [x - 0.03, sy, -2.78], [x + 0.03, 2.4, -2.72], mat("#f0ebe0")); box(Wd, [-0.8, 1.68, -2.78], [0.8, 1.73, -2.72], mat("#f0ebe0"));
  const garden = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), glow("#ffffff", 0.95, ctex("natGarden", 512, 256, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff4dc"); gr.addColorStop(0.55, "#e8e0b8"); gr.addColorStop(0.6, "#9ab07a"); gr.addColorStop(1, "#6a8a5a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${80 + 60 * r()},${110 + 60 * r()},${60 + 30 * r()},0.5)`; g.beginPath(); g.arc(r() * 512, 130 + r() * 60, 10 + 30 * r(), 0, 7); g.fill(); } })));
  garden.position.set(0, 1.6, -7); garden.layers.set(NOINK); Wd.add(garden);
  const shawlG = new THREE.PlaneGeometry(0.62, 0.42, 16, 10); { const p = shawlG.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.025 * Math.sin(x * 22) * (0.6 + y) + 0.012 * Math.sin(y * 30)); } shawlG.rotateX(-Math.PI / 2); shawlG.computeVertexNormals(); }
  const shawl = new THREE.Mesh(shawlG, mat("#ffffff", { map: ctex("natShawl", 256, 256, (g) => { g.fillStyle = "#b88a8a"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#e8d4c0"; g.lineWidth = 3; for (let i = 0; i < 256; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); } g.fillStyle = "#8a5a5a"; g.fillRect(0, 230, 256, 26); }), side: THREE.DoubleSide }));
  shawl.position.set(sx - 0.38, sy + 0.03, sz + 0.05); shawl.rotation.y = 0.15; Wd.add(shawl);
  const cupG = new THREE.Group(); cupG.position.set(sx + 0.32, sy, sz + 0.06); Wd.add(cupG);
  cyl(cupG, 0.08, 0.08, 0.01, mat("#f4f0e8"), [0, 0.005, 0], 24); cyl(cupG, 0.045, 0.036, 0.075, mat("#f4f0e8"), [0, 0.048, 0], 24); cyl(cupG, 0.042, 0.042, 0.002, mat("#8a4a22"), [0, 0.078, 0], 24);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), mat("#f4f0e8")); handle.position.set(0.05, 0.05, 0); cupG.add(handle);
  const steam = Array.from({ length: 7 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex(), color: "#ffffff", transparent: true, depthWrite: false, opacity: 0.4, fog: false })); s.layers.set(NOINK); cupG.add(s); return s; });
  const curtains = [-1, 1].map((sd) => { const g = new THREE.PlaneGeometry(0.75, 2.2, 8, 12); g.translate(0, -1.1, 0); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.04 * Math.sin(p.getX(i) * 18));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: "#f4ecd8", transparent: true, opacity: 0.72, side: THREE.DoubleSide, emissive: new THREE.Color("#8a7a5a") })); m.position.set(sd * 0.62, 2.45, -2.55); m.layers.set(NOINK); Wd.add(m); return m; });
  const raysW = [[-0.4, 2.3, -2.9, -0.2, 0, 0.4], [0.3, 2.3, -2.9, 0.9, 0, 0.6], [0, 2.0, -2.9, 0.3, 0, 1.4]].map(([a, b, c, d, e, f]) => lightBeam(Wd, [a, b, c], [d, e, f], 0.6, 1.4, "#fff0c8", 0.3));
  const dustW = dust(Wd, [-1.2, 0.8, -2.6], [1.2, 2.6, 0.8], 420, "#fff2d0", 0.012, 1.4);
  const winL = new THREE.PointLight("#ffe6b8", 6, 7, 1.4); winL.position.set(0, 1.8, -2.3); Wd.add(winL);
  const sunW = sun(Wd, [0, 1, -1], 4); sunW.setFrom([0.2, 0.6, -1]); sunW.light.color.set("#fff0d0");

  // ======================= STREAM: clear water over stones; coins washed away =======================
  const S = area("stream"), skyS = skyFor(S);
  terrain(S, 80, 120, 120, (x) => (Math.abs(x) < 1.6 ? -0.32 : Math.min(0.6, (Math.abs(x) - 1.6) * 0.5)), (h) => (h < -0.2 ? new THREE.Color("#8a7a5e") : new THREE.Color("#4e6a34").lerp(new THREE.Color("#7a8a44"), Math.random() * 0.4)), [0, 0, -30]);
  const stoneMs = ["#8a8478", "#9a8a72", "#6e6a62", "#a89a84", "#7a7062"].map((c) => mat(c));
  for (let i = 0; i < 160; i++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(i, 0.06, 0.2), 1), stoneMs[i % 5]); st.scale.y = 0.5; st.position.set(rnd(i + 1, -1.5, 1.5), -0.3 + 0.04 * hash(i + 2), rnd(i + 3, 4, -30)); st.layers.set(NOINK); S.add(st); }
  for (let i = 0; i < 18; i++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(i + 50, 0.25, 0.55), 1), stoneMs[(i + 2) % 5]); st.scale.y = 0.55; st.position.set((i % 2 ? 1 : -1) * rnd(i + 51, 1.4, 2.4), 0.0, rnd(i + 53, 3, -30)); S.add(st); }
  const streamU = water(S, 3.4, 60, [0, -0.06, -26], 0.38); streamU.uFlow.value.set(0, 0.9); streamU.uDeep.value.set("#2a5a5a"); streamU.uShallow.value.set("#8ab0a0");
  field(S, 12000, (i) => { const x = (hash(i * 5) < 0.5 ? -1 : 1) * rnd(i * 5 + 1, 1.8, 14), z = rnd(i * 5 + 2, 6, -40); return [x, z, rnd(i * 5 + 3, 0.15, 0.5), hash(i) * 6]; }, 0.04, "#2e4a22", "#b0c060");
  const coinM = new THREE.MeshLambertMaterial({ color: "#f0c040", emissive: new THREE.Color("#6a4a00") }), coins = Array.from({ length: 12 }, () => { const c = cyl(S, 0.035, 0.035, 0.006, coinM, [0, -50, 0], 16); c.userData.noCollide = true; return c; });
  const sparkS = pointsOf(S, 120, "#fff4c8", 0.06); pines(S, Array.from({ length: 60 }, (_, i) => [(hash(i) < 0.5 ? -1 : 1) * rnd(i + 1, 9, 40), rnd(i + 2, -10, -70), rnd(i + 3, 8, 16)] as [number, number, number]));
  const sunS = sun(S, [0, 0, -1], 6); sunS.setFrom([0.4, 0.8, -0.6]); sunS.light.color.set("#fff0c8");

  // ======================= HOME at dusk: warm windows, small shoes, a swing in the wind =======================
  const Hm = area("home"), skyH = skyFor(Hm);
  terrain(Hm, 200, 200, 60, (x, z) => 0.2 * Math.sin(x * 0.1 + z * 0.07), () => new THREE.Color("#3e5a2e"), [0, 0, -40]);
  field(Hm, 10000, (i) => { const x = rnd(i * 3, -14, 14), z = rnd(i * 3 + 1, 6, -18); return Math.abs(x) < 0.9 && z > -6 ? null : [x, z, rnd(i * 3 + 2, 0.1, 0.3), hash(i) * 6]; }, 0.04, "#2a4a22", "#8aa04a");
  const house = new THREE.Group(); house.position.set(0, 0, -7); Hm.add(house);
  box(house, [-4, 0, -6], [4, 3.2, 0], mat("#e2d2b4")); const rs = new THREE.Shape([new THREE.Vector2(-4.4, 0), new THREE.Vector2(4.4, 0), new THREE.Vector2(0, 2.0)]); const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(rs, { depth: 6.6, bevelEnabled: false }), mat("#7a3e2c")); roof.position.set(0, 3.2, -6.3); house.add(roof);
  box(house, [-0.55, 0, 0], [0.55, 2.1, 0.06], mat("#5a3a22")); box(house, [-0.25, 1.4, 0.061], [0.25, 1.85, 0.07], glow("#ffc070", 1.6), false);
  const winH = [-2.6, 2.6].map((x) => { box(house, [x - 0.75, 1.0, 0], [x + 0.75, 2.3, 0.05], mat("#f0e8d8")); return box(house, [x - 0.65, 1.1, 0.051], [x + 0.65, 2.2, 0.06], glow("#ffb860", 1.5), false); });
  box(house, [-1.2, 0, 0], [1.2, 0.18, 0.9], mat("#9a9080"));
  for (const [x, c] of [[-0.5, "#3a6aa8"], [-0.32, "#3a6aa8"], [0.35, "#c84a3a"], [0.5, "#c84a3a"]] as [number, string][]) { box(house, [x - 0.04, 0.18, 0.4], [x + 0.04, 0.24, 0.56], mat(c)); }
  const doorL = new THREE.PointLight("#ffb060", 5, 6, 1.5); doorL.position.set(0, 2.4, 1.0); house.add(doorL);
  const tree = new THREE.Group(); tree.position.set(4.2, 0, -2.5); Hm.add(tree); cyl(tree, 0.18, 0.26, 4.2, mat("#4a3426"), [0, 2.1, 0], 8);
  const branch = cyl(tree, 0.08, 0.12, 2.6, mat("#4a3426"), [-1.1, 3.6, 0], 6); branch.rotation.z = Math.PI / 2 - 0.15;
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(i, 0.9, 1.5), 1), mat(i % 2 ? "#3e5a30" : "#4a6a36")); s.position.set(rnd(i + 1, -2.2, 1.2), rnd(i + 2, 4.0, 5.6), rnd(i + 3, -1, 1)); s.layers.set(NOINK); tree.add(s); }
  const swing = new THREE.Group(); swing.position.set(-1.6, 3.6, 0); tree.add(swing);
  for (const z of [-0.22, 0.22]) cyl(swing, 0.008, 0.008, 3.0, mat("#c8b090"), [0, -1.5, z], 4); box(swing, [-0.16, -3.04, -0.26], [0.16, -2.98, 0.26], mat("#7a4a2a"));
  const fireflies = pointsOf(Hm, 50, "#ffe890", 0.06); const sunH = sun(Hm, [0, 0, -4], 12); sunH.setFrom([-0.8, 0.12, -0.6]); sunH.light.color.set("#ff9a60");

  // ======================= VALLEY: a room with a big window over a green valley; a wheelchair =======================
  const V = area("valley"), skyV = skyFor(V);
  const wallV = mat("#e8e0d0"); box(V, [-5, -0.05, -3.2], [5, 0, 4], mat("#9a7652"));
  box(V, [-5, 0, -3.2], [-2.3, 3.4, -3.0], wallV); box(V, [2.3, 0, -3.2], [5, 3.4, -3.0], wallV); box(V, [-2.3, 0, -3.2], [2.3, 0.35, -3.0], wallV); box(V, [-2.3, 3.0, -3.2], [2.3, 3.4, -3.0], wallV);
  for (const x of [-2.3, 0, 2.3]) box(V, [x - 0.04, 0.35, -3.12], [x + 0.04, 3.0, -3.05], mat("#f4f0e8"));
  terrain(V, 900, 900, 160, (x, z) => { const d = -z - 30; return -38 + (d < 0 ? 30 : 0) + 14 * Math.sin(x * 0.012) * Math.sin(z * 0.017) + 9 * Math.sin(x * 0.031 + 1) + 22 * Math.max(0, Math.abs(x) / 300); }, (h) => new THREE.Color("#3e6a32").lerp(new THREE.Color("#8aa84a"), Math.max(0, Math.min(1, (h + 40) / 40))), [0, 0, -400]);
  mountains(V, 10, 380, 560, "#6a7a90", [Math.PI * 0.7, Math.PI * 1.3], [80, 190]);
  const riverV = water(V, 900, 900, [0, -44, -400]); riverV.uDeep.value.set("#5a8aa8"); riverV.uShallow.value.set("#8ab8c8");
  const chairV = new THREE.Group(); chairV.position.set(...NAT.wheelchair); V.add(chairV); const metal = mat("#3a3c42"), seatM = mat("#2a2c30");
  box(chairV, [-0.25, 0.45, -0.22], [0.25, 0.5, 0.22], seatM); box(chairV, [-0.25, 0.5, 0.2], [0.25, 1.0, 0.24], seatM);
  for (const x of [-0.31, 0.31]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 28), metal); w.rotation.y = Math.PI / 2; w.position.set(x, 0.3, 0.05); chairV.add(w); const s2 = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.008, 6, 24), mat("#8a8c90")); s2.rotation.y = Math.PI / 2; s2.position.set(x + Math.sign(x) * 0.02, 0.3, 0.05); chairV.add(s2);
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), metal); f.rotation.y = Math.PI / 2; f.position.set(x * 0.8, 0.06, -0.3); chairV.add(f); box(chairV, [x - 0.015, 0.5, -0.22], [x + 0.015, 0.7, 0.2], metal); }
  chairV.traverse((o) => { o.userData.noCollide = true; });
  const raysV = [[-1.4, 3.0, -3.1, -0.6, 0, 0.8], [0.2, 3.0, -3.1, 0.6, 0, 0.6], [1.5, 3.0, -3.1, 1.6, 0, 1.2]].map(([a, b, c, d, e, f]) => lightBeam(V, [a, b, c], [d, e, f], 1.2, 2.4, "#fff0c0", 0.24));
  const dustV = dust(V, [-1.6, 0.2, -2.8], [1.6, 2.8, 1.2], 380, "#fff2d0", 0.014, 1.3);
  const sunV = sun(V, [0, 0, -1], 6); sunV.setFrom([0.3, 0.45, -1]); sunV.light.color.set("#ffe0a8");

  // ======================= LAKE: a mountain lake, a small masjid with a lantern =======================
  const L = area("lake"), skyL = skyFor(L);
  const lakeU = water(L, 900, 900, [0, -0.08, -300]); lakeU.uGlint.value = 0.6;
  terrain(L, 120, 40, 60, (x, z) => -0.2 + 0.5 * Math.max(0, (z - 1) / 8) + 0.1 * Math.sin(x * 0.4), (h) => (h < 0 ? new THREE.Color("#6a5e4e") : new THREE.Color("#3a4a2e")), [0, 0, 14]);
  field(L, 5000, (i) => { const x = rnd(i * 3, -30, 30), z = rnd(i * 3 + 1, 3.5, 20); return [x, z, rnd(i * 3 + 2, 0.15, 0.45), hash(i) * 6]; }, 0.04, "#243a22", "#7a8a4a");
  mountains(L, 12, 120, 360, "#3a4658", [Math.PI * 0.62, Math.PI * 1.38], [50, 150]);
  pines(L, Array.from({ length: 220 }, (_, i) => { const a = (hash(i) < 0.5 ? -1 : 1); return [a * rnd(i + 1, 12, 70), rnd(i + 2, 8, -120), rnd(i + 3, 7, 15)] as [number, number, number]; }), "#1e3428");
  const mq = new THREE.Group(); mq.position.set(...NAT.masjid); L.add(mq); const stone = mat("#d8ccb4");
  box(mq, [-5, -0.6, -4], [5, 0.0, 5.6], mat("#9a9282")); box(mq, [-0.8, -0.6, 5.6], [0.8, 0.0, 14], mat("#8a6a4a"));
  box(mq, [-2.4, 0, -2.4], [2.4, 3.2, 2.0], stone); const dome = new THREE.Mesh(new THREE.SphereGeometry(1.9, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), stone); dome.scale.y = 1.15; dome.position.set(0, 3.2, -0.2); mq.add(dome);
  cyl(mq, 0.04, 0.04, 0.7, mat("#c8a860"), [0, 5.75, -0.2], 6); cyl(mq, 0.36, 0.42, 7.4, stone, [3.3, 3.7, -1.6], 12); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.1, 12), mat("#5a7a8a")); cap.position.set(3.3, 7.95, -1.6); mq.add(cap);
  const mqGlow = glow("#ffc070", 1.6); box(mq, [-0.55, 0, 2.0], [0.55, 2.1, 2.06], mqGlow, false); for (const x of [-1.6, 1.6]) box(mq, [x - 0.35, 1.2, 2.0], [x + 0.35, 2.2, 2.06], mqGlow, false);
  const mqL = new THREE.PointLight("#ffb860", 8, 10, 1.5); mqL.position.set(0, 1.5, 3.2); mq.add(mqL);
  const lan = new THREE.Group(); lan.position.set(NAT.lantern[0] - NAT.masjid[0], 0, NAT.lantern[2] - NAT.masjid[2]); mq.add(lan); cyl(lan, 0.04, 0.05, 2.3, mat("#2a2a2a"), [0, 1.15, 0], 6);
  box(lan, [-0.13, 2.3, -0.13], [0.13, 2.62, 0.13], mat("#2a2a2a")); const lanM = glow("#ffd080", 2.4); const lanB = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), lanM); lanB.position.y = 2.46; lanB.layers.set(NOINK); lan.add(lanB);
  const lanL = new THREE.PointLight("#ffb060", 8, 12, 1.4); lanL.position.y = 2.5; lan.add(lanL);
  const lanHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(2, 1.4, 0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); lanHalo.position.y = 2.46; lanHalo.scale.set(2.2, 2.2, 1); lanHalo.layers.set(NOINK); lan.add(lanHalo);
  const mistL = mist(L, 5, 0.3, 5, 300, [0, 0, -30]); const birdsL = birdsOf(L, 18); const sunL = sun(L, [0, 0, -10], 20);

  // ======================= BAMBOO: a grove road at night; a sleek car =======================
  const B = area("bamboo"), skyB = skyFor(B);
  box(B, [-3.2, -0.05, -300], [3.2, 0, 40], mat("#22242a")); for (let z = 38; z > -300; z -= 6) box(B, [-0.06, 0.001, z - 2.5], [0.06, 0.004, z], glow("#9a9a88", 0.8), false);
  terrain(B, 120, 360, 60, (x) => (Math.abs(x) < 3.3 ? -0.2 : 0.05), () => new THREE.Color("#22301e"), [0, 0, -130]);
  { const stalkTex = rep(ctex("natBamboo", 64, 512, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "#3a6a2a"); gr.addColorStop(0.5, "#7aa84a"); gr.addColorStop(1, "#2e5a22"); g.fillStyle = gr; g.fillRect(0, 0, 64, 512); g.fillStyle = "#2a4a1e"; for (let y = 0; y < 512; y += 96) g.fillRect(0, y, 64, 6); }), 1, 1);
    const n = 1400, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 1, 7), new THREE.MeshLambertMaterial({ map: stalkTex }), n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sx = new THREE.Vector3(), P = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const sd = hash(i) < 0.5 ? -1 : 1, x = sd * rnd(i + 1, 3.6, 24), z = rnd(i + 2, 30, -260), h = rnd(i + 3, 9, 16); M.compose(P.set(x, h / 2, z), Q.setFromEuler(e.set((hash(i + 4) - 0.5) * 0.12, 0, (hash(i + 5) - 0.5) * 0.12 - sd * 0.06)), Sx.set(1 + hash(i + 6), h, 1 + hash(i + 6))); im.setMatrixAt(i, M); }
    im.layers.set(NOINK); im.frustumCulled = false; B.add(im);
    const leaves = pointsOf(B, 5000, "#3a6a2e", 0.5, false); for (let j = 0; j < 5000; j++) { const sd = hash(j) < 0.5 ? -1 : 1; leaves.pos.set([sd * rnd(j + 1, 2.4, 24), rnd(j + 2, 5, 16), rnd(j + 3, 30, -260)], j * 3); } leaves.done(); leaves.m.opacity = 0.9; }
  const lampsB = [10, -20, -50, -80].map((z) => { cyl(B, 0.05, 0.06, 4.2, mat("#2a2a2a"), [3.6, 2.1, z], 6); box(B, [2.8, 4.1, z - 0.15], [3.7, 4.25, z + 0.15], mat("#2a2a2a")); const b = box(B, [2.9, 4.05, z - 0.1], [3.3, 4.1, z + 0.1], glow("#ffd090", 2.2), false); const l = new THREE.PointLight("#ffc070", 10, 14, 1.4); l.position.set(3.0, 3.9, z); B.add(l); return b; });
  const car = new THREE.Group(); B.add(car); const paint = new THREE.MeshLambertMaterial({ color: "#3a404c", emissive: new THREE.Color("#0a0c12") });
  box(car, [-0.92, 0.28, -2.35], [0.92, 0.78, 2.35], paint); const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 2.6, 4, 1), new THREE.MeshLambertMaterial({ color: "#1c2430" })); cab.rotation.y = Math.PI / 4; cab.scale.set(1.0, 0.18, 1.0); cab.position.set(0, 0.98, 0.2); car.add(cab);
  for (const [x, z] of [[-0.9, -1.5], [0.9, -1.5], [-0.9, 1.5], [0.9, 1.5]]) { const w = cyl(car, 0.33, 0.33, 0.24, mat("#0e0e10"), [x, 0.33, z], 18); w.rotation.z = Math.PI / 2; }
  for (const x of [-0.65, 0.65]) { box(car, [x - 0.22, 0.58, -2.37], [x + 0.22, 0.66, -2.34], glow("#f4f8ff", 3), false); box(car, [x - 0.25, 0.6, 2.34], [x + 0.25, 0.66, 2.37], glow("#ff3030", 2), false); }
  const shineTex = ctex("natShine", 256, 64, (g) => { g.fillStyle = "rgba(0,0,0,1)"; g.fillRect(0, 0, 256, 64); for (const [x, w] of [[40, 18], [120, 8], [190, 26]]) { const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.5, "rgba(255,230,190,1)"); gr.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gr; g.fillRect(x - w, 0, 2 * w, 64); } });
  shineTex.wrapS = THREE.RepeatWrapping; const shineM = new THREE.MeshBasicMaterial({ map: shineTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, fog: false });
  for (const sd of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.45), shineM); pl.position.set(sd * 0.925, 0.55, 0); pl.rotation.y = sd * Math.PI / 2; pl.layers.set(NOINK); car.add(pl); }
  const roofSh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), shineM); roofSh.rotation.x = -Math.PI / 2; roofSh.position.set(0, 1.16, 0.2); roofSh.layers.set(NOINK); car.add(roofSh);
  for (const x of [-0.65, 0.65]) lightBeam(car, [x, 0.62, -2.4], [x * 2.2, 0, -16], 0.35, 4.5, "#f0f4ff", 0.3);
  const tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(2.2, 0.3, 0.25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); tailGlow.position.set(0, 0.63, 2.45); tailGlow.scale.set(2.4, 0.7, 1); tailGlow.layers.set(NOINK); car.add(tailGlow);
  const headL = new THREE.SpotLight("#f0f4ff", 30, 40, 0.5, 0.6, 1.2); headL.position.set(0, 0.7, -2.4); headL.target.position.set(0, 0, -20); car.add(headL, headL.target);
  car.userData.moving = true; car.traverse((o) => { o.userData.noCollide = true; });
  const moonB = [[-8, 30, -30, -2, 0, -14], [6, 30, -60, 1, 0, -40]].map(([a, b, c, d, e, f]) => lightBeam(B, [a, b, c], [d, e, f], 2, 6, "#b8c8ff", 0.14));
  const mistB = mist(B, 2, 0.4, 2.0, 120, [0, 0, -40]);

  // ======================= PENTHOUSE: over the night city; cards, bags, a huge sofa =======================
  const P = area("pent"), skyP = skyFor(P, 900);
  box(P, [-7, -0.1, -4.4], [7, 0, 6], mat("#3a3640")); box(P, [-7, 3.6, -4.4], [7, 3.8, 6], mat("#2a2830"));
  const glassP = new THREE.MeshBasicMaterial({ color: "#8a9ab8", transparent: true, opacity: 0.08, depthWrite: false }); const gp = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.6), glassP); gp.position.set(0, 1.8, -4.3); gp.layers.set(NOINK); P.add(gp);
  for (let x = -7; x <= 7; x += 2.33) box(P, [x - 0.04, 0, -4.36], [x + 0.04, 3.6, -4.28], mat("#1e1c22"));
  box(P, [-7, 0, 5.8], [7, 3.6, 6], mat("#4a4450")); box(P, [-7, 0, -4.4], [-6.8, 3.6, 6], mat("#4a4450"));
  const cityM = facade("pentCity", "#1a1828", 10, 24, 0.5); for (let i = 0; i < 90; i++) { const w = rnd(i, 8, 22), h = rnd(i + 1, 20, 110), x = rnd(i + 2, -220, 220), z = rnd(i + 3, -40, -420); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ map: cityM, color: new THREE.Color(1.3, 1.1, 1.3) })); b.position.set(x, -140 + h / 2, z - 80); b.layers.set(NOINK); P.add(b); }
  const bokeh = pointsOf(P, 1400, "#c8a0ff", 1.6); for (let j = 0; j < 1400; j++) bokeh.pos.set([rnd(j, -300, 300), rnd(j + 1, -140, -40), rnd(j + 2, -90, -520)], j * 3); bokeh.done();
  const gold = pointsOf(P, 700, "#ffc870", 1.2); for (let j = 0; j < 700; j++) gold.pos.set([rnd(j + 9, -300, 300), rnd(j + 10, -140, -40), rnd(j + 11, -90, -520)], j * 3); gold.done();
  const sofaP = new THREE.Group(); sofaP.position.set(...NAT.sofa); P.add(sofaP); const fab = mat("#d8d0c4"), fabD = mat("#c4bcb0");
  box(sofaP, [-2.6, 0, -0.5], [2.6, 0.42, 0.45], fabD); box(sofaP, [-2.6, 0.42, 0.25], [2.6, 0.95, 0.5], fab); box(sofaP, [-2.6, 0.42, -0.5], [-2.3, 0.65, 0.5], fab); box(sofaP, [2.3, 0.42, -0.5], [2.6, 0.65, 0.5], fab);
  for (let i = 0; i < 3; i++) box(sofaP, [-2.25 + i * 1.5, 0.42, -0.45], [-0.8 + i * 1.5, 0.52, 0.24], mat("#e4ddd2"));
  const tableP = new THREE.Group(); tableP.position.set(...NAT.table); P.add(tableP);
  const glassT = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.8), new THREE.MeshLambertMaterial({ color: "#a8c0d0", transparent: true, opacity: 0.35 })); glassT.position.y = 0.42; tableP.add(glassT); for (const x of [-0.7, 0.7]) box(tableP, [x - 0.02, 0, -0.3], [x + 0.02, 0.405, 0.3], mat("#c8b070"));
  const cardsP = [["#1a1a1a", -0.32, 0.2], ["#d8b04a", -0.12, -0.1], ["#c8ccd4", 0.1, 0.25]].map(([c, x, r]) => { const m = box(tableP, [-0.043, 0.437, -0.027], [0.043, 0.44, 0.027], new THREE.MeshLambertMaterial({ color: c as string, emissive: new THREE.Color(c as string).multiplyScalar(0.25) }), false); m.position.x = x as number; m.rotation.y = r as number; return m; });
  const phoneP = box(tableP, [0.35, 0.437, -0.05], [0.43, 0.442, 0.11], mat("#111214"), false); phoneP.userData.noCollide = true;
  for (const [x, z, c, h] of [[-3.3, 0.2, "#e87030", 0.45], [-3.0, -0.3, "#f0ece4", 0.38], [3.1, 0.0, "#1a1a1a", 0.42], [3.4, -0.4, "#c8a050", 0.34]] as [number, number, string, number][]) { box(P, [x - 0.18, 0, z - 0.08], [x + 0.18, h, z + 0.08], mat(c)); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 12, Math.PI), mat("#2a2a2a")); hd.position.set(x, h, z); P.add(hd); }
  const lampP = glow("#ffd8a0", 1.8); box(P, [-4.4, 1.6, 0.6], [-4.0, 1.95, 1.0], lampP, false); cyl(P, 0.02, 0.02, 1.6, mat("#c8b070"), [-4.2, 0.8, 0.8], 6); const lampPL = new THREE.PointLight("#ffc890", 14, 12, 1.3); lampPL.position.set(-4.2, 1.7, 0.8); P.add(lampPL);
  const keyP = new THREE.PointLight("#ffd8b0", 9, 4, 1.4); keyP.position.set(0.8, 1.6, -0.2); P.add(keyP);
  const coveL = [-3, 0, 3].map((x) => { const l = new THREE.PointLight("#ffd8a8", 7, 9, 1.4); l.position.set(x, 3.3, 2.0); P.add(l); return l; });
  for (const x of [-6.5, 6.5]) box(P, [x - 0.03, 3.5, -4.2], [x + 0.03, 3.56, 5.8], glow("#ffd8a8", 1.8), false); box(P, [-6.5, 3.5, 5.7], [6.5, 3.56, 5.76], glow("#ffd8a8", 1.8), false);
  const sunP = sun(P, [0, 0, 0], 8); sunP.setFrom([0.4, 0.3, -1]);

  // ======================= WHEAT: a field at sunset; a path =======================
  const Wh = area("wheat"), skyW = skyFor(Wh);
  terrain(Wh, 400, 400, 100, (x, z) => 0.6 * Math.sin(x * 0.03) * Math.sin(z * 0.025) - (Math.abs(x - NAT.wheatPath(z)) < 0.8 ? 0.05 : 0), (h, x, z) => (Math.abs(x - NAT.wheatPath(z)) < 0.8 ? new THREE.Color("#8a6a44") : new THREE.Color("#7a6a30")), [0, 0, -150]);
  const wheatU = field(Wh, 60000, (i) => { const x = rnd(i * 3, -45, 45), z = rnd(i * 3 + 1, 12, -130); return Math.abs(x - NAT.wheatPath(z)) < 0.85 ? null : [x, z, rnd(i * 3 + 2, 0.85, 1.25), hash(i) * 6]; }, 0.035, "#6a5a2a", "#f0c878");
  pines(Wh, Array.from({ length: 40 }, (_, i) => [rnd(i, -200, 200), rnd(i + 1, -170, -230), rnd(i + 2, 10, 18)] as [number, number, number]), "#2a3420");
  const sunGlowW = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3, 2, 1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sunGlowW.layers.set(NOINK); Wh.add(sunGlowW);
  const pollenW = dust(Wh, [-5, 0.3, -12], [5, 3, 4], 500, "#ffe0a0", 0.03, 1.4); const sunWh = sun(Wh, [0, 0, -4], 14);

  // ======================= LAVENDER: rows at golden hour =======================
  const Lv = area("lavender"), skyLv = skyFor(Lv);
  terrain(Lv, 400, 400, 100, (x, z) => 0.8 * Math.sin(x * 0.02 + 1) * Math.sin(z * 0.03), () => new THREE.Color("#6a5a3a"), [0, 0, -150]);
  field(Lv, 70000, (i) => { const row = Math.round(rnd(i * 3, -30, 30)), cx = row * 1.5, z = rnd(i * 3 + 1, 12, -160), dx = (hash(i * 3 + 2) - 0.5) * 0.9; return [cx + dx, z, rnd(i * 5, 0.45, 0.8), hash(i) * 6]; }, 0.03, "#4a6a3a", "#9a70d8", 0.62);
  pines(Lv, Array.from({ length: 30 }, (_, i) => [rnd(i, -150, 150), rnd(i + 1, -190, -240), rnd(i + 2, 9, 16)] as [number, number, number]), "#2a3a24");
  const houseLv = new THREE.Group(); houseLv.position.set(18, 0, -110); Lv.add(houseLv); box(houseLv, [-3, 0, -2.5], [3, 3, 2.5], mat("#e8d8b8")); const rf = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), mat("#9a4a2e")); rf.rotation.y = Math.PI / 4; rf.position.y = 4.1; rf.scale.z = 0.8; houseLv.add(rf);
  const sunLv = sun(Lv, [0, 0, -6], 14); sunLv.setFrom([-0.6, 0.2, -1]); sunLv.light.color.set("#ffb870"); const pollenLv = dust(Lv, [-8, 0.5, -20], [8, 5, 0], 500, "#ffe0b0", 0.04, 1.3);

  const areas: Record<string, THREE.Group> = { forest: F, cliff: C, canyon: K, window: Wd, stream: S, home: Hm, valley: V, lake: L, bamboo: B, pent: P, wheat: Wh, lavender: Lv };
  type Sky = ReturnType<typeof skyFor>;
  const setSky = (s: Sky, t: number, top: string, hor: string, sunDir: V3, sunCol: string, sunK: number, cloud = 0, cloudCol = "#ffffff", stars = 0) => {
    s.uT.value = t; s.uTop.value.set(top); s.uHor.value.set(hor); s.uSun.value.set(...sunDir).normalize(); s.uSunCol.value.set(sunCol); s.uSunK.value = sunK; s.uCloud.value = cloud; s.uCloudCol.value.set(cloudCol); s.uStars.value = stars; s.uFlash.value = 0; s.uTear.value = 0; };
  const warm = (fog: string, near: number, far: number, lit: [number, number, number] = [1.12, 0.92, 0.7], grade = GRADE_GOLD): SetLook =>
    ({ lit, shade: [0.3, 0.24, 0.26], lift: [0.03, 0.025, 0.02], sat: 1.05, charTint: [1, 0.93, 0.84], cardGain: 1.0, cardPointK: 1, pointK: 1, grade, fog: [fog, near, far] });
  const fogTo = (u: Fog, col: string, n: number, f: number) => { u.uFog.value.set(col); u.uFogD.value.set(n, f); };

  const apply = (state: string, t: number): SetLook => {
    const [name, a0, b0, c0, d0] = state.split(":"), n = (v?: string, def = 0) => (v === undefined ? def : Number(v));
    for (const [k, g] of Object.entries(areas)) g.visible = k === name;
    if (name === "forest") {
      mushaf.visible = n(a0) > 0; mushafL.intensity = 3 * n(a0);
      setSky(skyF, t, "#7a9ac0", "#ffd0a0", [-0.5, 0.12, -1], "#ffc880", 1.4, 0.15, "#ffe0c0"); fieldF.uT.value = t; fogTo(fieldF, "#e8d0b0", 18, 120); fieldF.uLight.value.setRGB(1.25, 1.15, 0.95);
      mistF.update(t, "#fff0e0", 0.7); pollenF.update(t); raysF.forEach((r, i) => r.setLevel(0.85 + 0.15 * Math.sin(t * 0.7 + i)));
      return { ...warm("#e8d0b0", 18, 160, [1.12, 0.98, 0.8]), shade: [0.5, 0.46, 0.42] };
    }
    if (name === "cliff") {
      setSky(skyC, t, "#5a7ab0", "#ffb878", [0.2, 0.06, -1], "#ffd090", 2.0, 0.2, "#ffd0b0"); cloudU.uT.value = t; fogTo(cloudU, "#f8c8a0", 150, 650); windC.update(t * 3);
      return warm("#f0c8a0", 60, 600, [1.18, 0.94, 0.72]);
    }
    if (name === "canyon") {
      setSky(skyK, t, "#5a7ab8", "#ffb878", [0.7, 0.12, -0.75], "#ffc070", 1.5, 0.25, "#ffc8a0"); riverU.uT.value = t; riverU.uSky.value.set("#e8c0a0"); riverU.uSunDir.value.set(0.7, 0.3, -0.75).normalize(); fogTo(riverU, "#e8b088", 60, 300); dustK.update(t);
      return warm("#e8b088", 30, 260, [1.2, 0.88, 0.62]);
    }
    if (name === "window") {
      const p = n(a0); steam.forEach((s, i) => { const k = ((t * 0.35 + i / 7) % 1); s.position.set(0.012 * Math.sin(t * 1.3 + i * 2) + 0.03 * k * Math.sin(i * 3), 0.09 + 0.32 * k, 0.01 * Math.cos(t + i)); s.scale.setScalar(0.04 + 0.12 * k); (s.material as THREE.SpriteMaterial).opacity = 0.42 * Math.sin(Math.PI * k); });
      curtains.forEach((c, i) => { c.rotation.x = 0.05 * Math.sin(t * 0.8 + i * 1.7) + 0.03; c.rotation.y = 0.04 * Math.sin(t * 0.6 + i); }); dustW.update(t); raysW.forEach((r, i) => r.setLevel(0.9 + 0.1 * Math.sin(t * 0.9 + i))); void p;
      return { lit: [1.15, 1.0, 0.86], shade: [0.36, 0.3, 0.28], lift: [0.04, 0.035, 0.03], sat: 1.0, charTint: [1, 0.95, 0.88], cardGain: 1, cardPointK: 1, pointK: 1, grade: GRADE_GOLD, fog: ["#f0e0c8", 6, 30] };
    }
    if (name === "stream") {
      const p = n(a0); setSky(skyS, t, "#6a9ad0", "#e8f0f0", [0.4, 0.6, -0.6], "#fff0c8", 0.6); streamU.uT.value = t; streamU.uSky.value.set("#c8e0e8"); streamU.uSunDir.value.set(0.4, 0.8, -0.6).normalize(); fogTo(streamU, "#d8e4d8", 30, 120);
      coins.forEach((c, i) => { const s = p * 1.6 - i * 0.07; if (s < 0) { c.position.set(0, -50, 0); return; } const fall = Math.min(1, s / 0.25), x0 = (hash(i) - 0.5) * 0.12;
        const drift = Math.max(0, s - 0.25) * 2.2; c.position.set(x0 + 0.25 * Math.sin(drift * 2 + i), fall < 1 ? 0.85 - 0.95 * fall * fall : -0.12 - 0.12 * Math.min(1, drift), -drift * (1 + hash(i + 2)) + 0.1); c.rotation.set(t * 3 + i, t * 2, i); });
      for (let j = 0; j < 120; j++) { const z = -((t * 0.7 + hash(j) * 12) % 12) + 2; sparkS.pos.set([(hash(j + 1) - 0.5) * 3, -0.04, z], j * 3); } sparkS.done(); sparkS.m.opacity = 0.5 + 0.3 * Math.sin(t * 7);
      return warm("#d8e4d8", 15, 120, [1.1, 1.0, 0.86], GRADE_WARM);
    }
    if (name === "home") {
      setSky(skyH, t, "#3a3a6a", "#f08a60", [-0.8, 0.04, -0.6], "#ff9a60", 1.2, 0.3, "#c87068"); swing.rotation.x = 0.22 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 2.7); swing.rotation.z = 0.04 * Math.sin(t * 0.9);
      for (let j = 0; j < 50; j++) fireflies.pos.set([(hash(j) - 0.5) * 12 + 0.4 * Math.sin(t * 0.5 + j), 0.3 + 1.6 * hash(j + 1) + 0.2 * Math.sin(t * 0.7 + j * 2), -2 + (hash(j + 2) - 0.5) * 8], j * 3); fireflies.done(); fireflies.m.opacity = 0.6 + 0.4 * Math.sin(t * 3);
      winH.forEach((w, i) => ((w.material as THREE.MeshBasicMaterial).color.set("#ffb860").multiplyScalar(1.4 + 0.1 * Math.sin(t * 2 + i))));
      return { lit: [1.05, 0.8, 0.7], shade: [0.34, 0.28, 0.36], lift: [0.04, 0.03, 0.05], sat: 1.05, charTint: [1, 0.86, 0.8], cardGain: 0.95, cardPointK: 1.2, pointK: 1.2, grade: GRADE_GOLD, fog: ["#b08088", 24, 160] };
    }
    if (name === "valley") {
      setSky(skyV, t, "#5a90d0", "#fff0d0", [0.3, 0.3, -1], "#fff0c0", 1.2, 0.3, "#ffffff"); riverV.uT.value = t; riverV.uSky.value.set("#d8e8f0"); fogTo(riverV, "#d8e0d8", 200, 800); dustV.update(t); raysV.forEach((r, i) => r.setLevel(0.85 + 0.15 * Math.sin(t * 0.6 + i)));
      return warm("#dce4dc", 120, 820, [1.14, 1.0, 0.82]);
    }
    if (name === "lake") {
      const dawn = n(a0), lantern = n(b0, 1), fog = n(c0), birds = n(d0);
      setSky(skyL, t, new THREE.Color("#1a2448").lerp(new THREE.Color("#6a8ac0"), dawn).getStyle(), new THREE.Color("#4a5a8a").lerp(new THREE.Color("#ffc890"), dawn).getStyle(), [0.1, 0.06, -1], "#ffd8a0", 1.4 * dawn, 0.15, "#ffd8c0", 0.35 * (1 - dawn));
      lakeU.uT.value = t; lakeU.uSky.value.set("#3a4a78").lerp(new THREE.Color("#ffd0a0"), dawn); lakeU.uDeep.value.set("#0e1a30").lerp(new THREE.Color("#3a5a78"), dawn); lakeU.uShallow.value.set("#2a3a58").lerp(new THREE.Color("#7a90a8"), dawn); lakeU.uSunDir.value.set(0.1, 0.08, -1).normalize();
      const fogCol = new THREE.Color("#3a4668").lerp(new THREE.Color("#f0d8c0"), dawn).getStyle(); fogTo(lakeU, fogCol, 30 - 25 * fog, 260 - 220 * fog);
      lanM.color.set("#ffd080").multiplyScalar(2.4 * lantern); lanL.intensity = 8 * lantern; lanHalo.material.opacity = lantern; mqGlow.color.set("#ffc070").multiplyScalar(0.3 + 1.3 * Math.max(lantern, dawn)); mqL.intensity = 8 * Math.max(lantern * 0.8, dawn);
      mistL.update(t, fogCol, 0.25 + 0.75 * fog); sunL.setFrom([0.1, 0.25, -1]); sunL.light.color.set("#8090c0").lerp(new THREE.Color("#ffc890"), dawn); sunL.light.intensity = 0.4 + 1.2 * dawn;
      birdsL.l.visible = birds > 0; if (birds > 0) birdsL.set(Array.from({ length: 18 }, (_, i) => { const k = Math.max(0, birds * 1.4 - i * 0.02); return { x: (hash(i) - 0.5) * 10 + k * 6 * (hash(i + 1) - 0.3), y: 0.3 + k * k * 9 + hash(i + 2) * 0.5 * k, z: -9 - hash(i + 3) * 8 - k * 6, s: 0.18 + 0.1 * hash(i + 4), flap: t * 14 + i }; }));
      const night = 1 - dawn;
      return { lit: [0.55 + 0.6 * dawn, 0.58 + 0.4 * dawn, 0.75 + 0.05 * dawn], shade: [0.1 + 0.2 * dawn, 0.12 + 0.12 * dawn, 0.2 + 0.05 * dawn], lift: [0.02, 0.025, 0.04], sat: 0.9 + 0.15 * dawn, charTint: [0.85 + 0.15 * dawn, 0.88 + 0.06 * dawn, 1 - 0.14 * dawn], cardGain: 0.9, cardPointK: 1.3 * night + 1, pointK: 1.2, grade: dawn > 0.5 ? GRADE_GOLD : GRADE_BLUE, fog: [fogCol, 24 - 18 * fog, 220 - 180 * fog] };
    }
    if (name === "bamboo") {
      const x = n(a0); setSky(skyB, t, "#0a1024", "#1e2a4a", [0.3, 0.5, -1], "#c8d8ff", 0.4, 0.1, "#2a3450", 0.5); car.position.set(-1.4, 0, -x); shineTex.offset.x = x * 0.12; (roofSh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      mistB.update(t, "#3a4a6a", 0.4);
      return { lit: [0.6, 0.66, 0.85], shade: [0.16, 0.18, 0.26], lift: [0.02, 0.025, 0.04], sat: 0.95, charTint: [0.8, 0.86, 1], cardGain: 0.85, cardPointK: 1.4, pointK: 1.8, grade: GRADE_BLUE, fog: ["#22305a", 18, 140] };
    }
    if (name === "pent") {
      const dawn = n(a0); setSky(skyP, t, new THREE.Color("#140e2e").lerp(new THREE.Color("#7a90c8"), dawn).getStyle(), new THREE.Color("#4a2a6a").lerp(new THREE.Color("#ffc090"), dawn).getStyle(), [0.4, 0.05, -1], "#ffd090", 1.6 * dawn, 0.1, "#ffc8b0", 0.2 * (1 - dawn));
      bokeh.m.opacity = 0.9 * (1 - dawn); gold.m.opacity = 0.9 * (1 - 0.7 * dawn); lampPL.intensity = 14 * (1 - 0.6 * dawn); coveL.forEach((l) => (l.intensity = 7 * (1 - 0.5 * dawn))); sunP.light.intensity = 1.6 * dawn; sunP.light.color.set("#ffc890");
      cardsP.forEach((c, i) => ((c.material as THREE.MeshLambertMaterial).emissiveIntensity = 1 + 0.6 * Math.max(0, Math.sin(t * 2 + i * 2))));
      return { lit: [0.85 + 0.4 * dawn, 0.75 + 0.3 * dawn, 0.9 - 0.1 * dawn], shade: [0.3, 0.24, 0.32], lift: [0.03, 0.02, 0.05], sat: 1.05, charTint: [0.95, 0.88, 1], cardGain: 0.95, cardPointK: 1.3, pointK: 1.3, grade: dawn > 0.5 ? GRADE_GOLD : GRADE_BLUE, fog: ["#2a2048", 200, 900] };
    }
    if (name === "wheat") {
      const s = n(a0, 1); setSky(skyW, t, "#5a6aa0", "#ffa860", [0, 0.04 + 0.08 * (1 - s), -1], "#ffb060", 2.2, 0.25, "#ff9a70"); wheatU.uT.value = t; wheatU.uLight.value.setRGB(1.1, 0.92, 0.7); fogTo(wheatU, "#f0a870", 20, 130);
      sunGlowW.position.set(0, 6 + 10 * (1 - s), -160); sunGlowW.scale.set(70, 70, 1); pollenW.update(t); sunWh.setFrom([0, 0.12 + 0.1 * (1 - s), -1]); sunWh.light.color.set("#ffa860");
      return warm("#f0a870", 25, 180, [1.22, 0.9, 0.62]);
    }
    // lavender
    setSky(skyLv, t, "#6a80c0", "#ffc080", [-0.6, 0.1, -1], "#ffc070", 1.6, 0.2, "#ffd0b0"); pollenLv.update(t);
    return warm("#f0c0a0", 30, 220, [1.16, 0.92, 0.74]);
  };
  return { id: "nature", root, offset, apply };
};
