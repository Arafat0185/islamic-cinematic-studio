// The worlds inside the books (video 004 "The Man Who Never Rested"). One set holding several small worlds far apart;
// the state picks which one is shown (the others are hidden):
//   "comfort:<c0>:<c1>:<c2>:<c3>"   a warm sandy plain at dusk with a sofa, a car, a beach chair and a phone on a stone;
//                                   c0..c3 (0..1) = each one crumbling into sand that the wind carries away
//   "sea:<storm>:<dawn>:<flash>"    a night sea in a storm (shader waves, rain, lightning); dawn 0..1 = the clouds tearing
//                                   open, gold flooding in, the rain stopping in mid-air and rising as light
//   "desert:<night>:<glow>:<rain>"  an endless desert road at dusk (night 1 = a sky full of stars); a glow of light on the
//                                   far horizon (never anything more); rain falling (the hand in the rain)
//   "forge:<p>" "oyster:<p>" "seed:<p>" "coal:<p>"   the transformation montage (p 0..1 through each one)
//   "hour:<p>"                      an hourglass under the night sky: the sand stops, rises, and bursts into stars
// Nothing here is a being; no prophet, angel or Paradise is shown (only a distant light).
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import type { GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, box, cyl, sun, glow, lightBeam } from "./common";

export const WORLD = {
  COMFORT: [0, 0, 0] as V3, SEA: [500, 0, 0] as V3, DESERT: [1000, 0, 0] as V3,
  FORGE: [1500, 0, 0] as V3, OYSTER: [1600, 0, 0] as V3, SEED: [1700, 0, 0] as V3, COAL: [1800, 0, 0] as V3, HOUR: [1900, 0, 0] as V3,
  /** the comforts (local to COMFORT): sofa, car, beach chair, phone */
  THINGS: [[0.45, 0, -5.1], [2.6, 0, -7.4], [-1.05, 0, -9.3], [0.7, 0, -10.9]] as V3[],
};
export const GRADE_WARM: GradeParams = { ky: [0, 0.06, 0.22, 0.52, 0.8, 0.94, 1], sat: [1.02, 1.1, 1.08], tintS: [0.02, -0.01], tintM: [-0.01, 0.02], tintH: [-0.03, 0.03], vig: [0.3, 0.32] };
export const GRADE_STORM: GradeParams = { ky: [0, 0.06, 0.2, 0.5, 0.78, 0.93, 1], sat: [0.9, 0.95, 1.0], tintS: [0.04, -0.03], tintM: [0.02, -0.01], tintH: [0.0, 0.0], vig: [0.36, 0.3] };

/** a sky dome for one world: gradient, boiling clouds, stars, a sun/glow, lightning; all from uniforms */
const skyFor = (parent: THREE.Object3D, R = 420) => {
  const u = {
    uT: { value: 0 }, uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uCloud: { value: 0 }, uCloudCol: { value: new THREE.Color() },
    uStars: { value: 0 }, uSun: { value: new THREE.Vector3(0, 0.05, -1).normalize() }, uSunCol: { value: new THREE.Color() }, uSunK: { value: 0 }, uFlash: { value: 0 }, uTear: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uCloud, uStars, uSunK, uFlash, uTear; uniform vec3 uTop, uHor, uCloudCol, uSunCol, uSun; varying vec3 vD;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 w = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), w.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), w.x), w.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vD); float y = max(d.y, 0.0);
        vec3 col = mix(uHor, uTop, pow(y, 0.55));
        float sd = max(dot(d, uSun), 0.0);
        col += uSunCol * uSunK * (pow(sd, 6.0) * 0.6 + pow(sd, 90.0) * 3.0);
        // stars (night): tiny bright points, twinkling
        vec2 sp = d.xz / (d.y + 0.35) * 180.0; float st = step(0.996, h21(floor(sp))) * (0.6 + 0.4 * sin(uT * 3.0 + h21(floor(sp) + 3.0) * 20.0));
        col += vec3(1.0, 0.95, 0.85) * st * uStars * smoothstep(0.02, 0.2, d.y);
        // clouds: boiling, lit by the flash; uTear opens them around the sun
        vec2 p = d.xz / (d.y + 0.25) * 1.4; float c = fbm(p + vec2(uT * 0.04, -uT * 0.03) + fbm(p * 1.7 - uT * 0.06));
        float dens = smoothstep(0.42, 0.75, c) * uCloud * (1.0 - uTear * smoothstep(0.55, 0.98, sd + 0.25 * c));
        vec3 cc = uCloudCol * (0.6 + 0.6 * c) + vec3(0.8, 0.85, 1.0) * uFlash * c * 1.6;
        col = mix(col, cc, dens);
        col += vec3(0.7, 0.75, 0.9) * uFlash * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20), m); mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.layers.set(NOINK); parent.add(mesh);
  return u;
};
const dotTex = () => ctex("bwDot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const steamTex = () => ctex("bwSteam", 128, 128, (g, r) => { for (let i = 0; i < 16; i++) { const x = 30 + r() * 68, y = 30 + r() * 68, rad = 14 + 30 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.3)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } });
const sandTex = (k: string, base: string) => rep(ctex("bwSand" + k, 512, 512, (g, r) => { g.fillStyle = base; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "90,60,30"},${0.06 * r()})`; g.fillRect(r() * 512, r() * 512, 2 + 3 * r(), 1 + 2 * r()); } for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(120,80,40,0.12)"; g.lineWidth = 2; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + 20 * r(), 340, y - 20 * r(), 512, y + 10 * r()); g.stroke(); } }), 30, 30);
/** points that are a pure function of time (n of them, made by gen, moved by move) */
const pointsOf = (parent: THREE.Object3D, n: number, col: string, size: number, additive = true) => {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: dotTex(), color: new THREE.Color(col), size, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.layers.set(NOINK); parent.add(p);
  return { p, m, pos, done: () => { geo.attributes.position.needsUpdate = true; } };
};
/** rain as falling streaks (line segments, not dots); n drops, each `len` metres long */
const rainLines = (parent: THREE.Object3D, n: number, col: string, len: number) => {
  const pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const l = new THREE.LineSegments(geo, m); l.frustumCulled = false; l.layers.set(NOINK); parent.add(l);
  return { p: l, m, pos, len, set: (j: number, x: number, y: number, z: number, dx: number, dy: number) => { pos.set([x, y, z, x + dx * len, y + dy * len, z], j * 6); }, done: () => { geo.attributes.position.needsUpdate = true; } };
};
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
/** the shared sea surface height (also used to float the boat) */
export const seaY = (x: number, z: number, t: number, storm: number) => storm * (0.9 * Math.sin(0.23 * x + 0.9 * t) + 0.6 * Math.sin(0.31 * z - 1.1 * t + 1) + 0.35 * Math.sin(0.57 * (x + z) + 1.7 * t)) + 0.15 * Math.sin(0.8 * x - 2 * t);

export const buildBookWorlds = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const area = (p: V3) => { const g = new THREE.Group(); g.position.set(...p); root.add(g); return g; };
  // ======================= COMFORT: a sandy plain at dusk; the comforts crumble into sand =======================
  const A = area(WORLD.COMFORT), skyA = skyFor(A);
  const groundA = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat("#ffffff", { map: sandTex("A", "#c79a62") })); groundA.rotation.x = -Math.PI / 2; groundA.receiveShadow = true; A.add(groundA);
  const sofa = new THREE.Group(); box(sofa, [-1.0, 0, -0.45], [1.0, 0.42, 0.45], mat("#7a2e2a")); box(sofa, [-1.0, 0.42, -0.45], [1.0, 0.95, -0.25], mat("#6a2622")); box(sofa, [-1.0, 0.42, -0.45], [-0.82, 0.7, 0.45], mat("#6a2622")); box(sofa, [0.82, 0.42, -0.45], [1.0, 0.7, 0.45], mat("#6a2622"));
  const car = new THREE.Group(); box(car, [-1.0, 0.3, -2.1], [1.0, 0.95, 2.1], mat("#d8d4cc")); box(car, [-0.85, 0.95, -1.0], [0.85, 1.5, 1.0], mat("#cfcac0")); box(car, [-0.86, 1.0, -0.95], [0.86, 1.42, 0.95], glow("#9ab8d8", 0.6));
  for (const [x, z] of [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]]) { const w = cyl(car, 0.36, 0.36, 0.25, mat("#1e1e1e"), [x, 0.36, z], 16); w.rotation.z = Math.PI / 2; }
  car.rotation.y = 0.6;
  const chairB = new THREE.Group(); box(chairB, [-0.35, 0.3, -0.9], [0.35, 0.36, 0.4], mat("#2a8aa8")); const back = box(chairB, [-0.35, 0.3, 0.4], [0.35, 1.2, 0.46], mat("#2a8aa8")); back.rotation.x = -0.45; for (const x of [-0.33, 0.33]) box(chairB, [x - 0.02, 0, -0.85], [x + 0.02, 0.32, 0.4], mat("#c8c8c8"));
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 12, 1, true), mat("#e8d07a", { side: THREE.DoubleSide })); umb.position.set(0.5, 2.1, 0); chairB.add(umb); cyl(chairB, 0.02, 0.02, 2.1, mat("#c8c8c8"), [0.5, 1.05, 0], 6);
  const phone = new THREE.Group(); box(phone, [-0.5, 0, -0.5], [0.5, 0.7, 0.5], mat("#8a7a62")); const ph = box(phone, [-0.08, 0.7, -0.15], [0.08, 0.72, 0.15], mat("#1a1c20")); const scr = box(phone, [-0.07, 0.721, -0.14], [0.07, 0.725, 0.14], glow("#bcd8ff", 2.0)); void ph;
  const things = [sofa, car, chairB, phone];
  things.forEach((g, i) => { g.position.set(...WORLD.THINGS[i]); g.userData.moving = true; g.traverse((o) => { o.userData.noCollide = true; }); A.add(g); });   // props he runs through as they crumble   // they crumble away (the intersect report skips moving things)
  const sand = things.map((g, i) => { const bb = new THREE.Box3().setFromObject(g), n = 900, pts = pointsOf(A, n, "#d8a868", i === 1 ? 0.07 : 0.05, false);
    const seeds = Array.from({ length: n }, (_, j) => [bb.min.x + (bb.max.x - bb.min.x) * hash(j + i * 1000), bb.min.y + (bb.max.y - bb.min.y) * hash(j * 3 + 7 + i), bb.min.z + (bb.max.z - bb.min.z) * hash(j * 7 + 3 + i)]);
    return { pts, seeds, base: g.position.clone() }; });
  const sunA = sun(A, [0, 0, -12], 30); sunA.setFrom([-0.6, 0.35, -0.8]); sunA.light.color.set("#ffc890");
  // ======================= SEA: a storm at night; the boat; dawn =======================
  const B = area(WORLD.SEA), skyB = skyFor(B);
  const seaU = { uT: { value: 0 }, uStorm: { value: 1 }, uDawn: { value: 0 }, uFlash: { value: 0 } };
  const seaM = new THREE.ShaderMaterial({ uniforms: seaU, vertexShader: /* glsl */ `
      uniform float uT, uStorm; varying vec3 vW; varying float vH;
      float hgt(vec2 p){ return uStorm * (0.9 * sin(0.23 * p.x + 0.9 * uT) + 0.6 * sin(0.31 * p.y - 1.1 * uT + 1.0) + 0.35 * sin(0.57 * (p.x + p.y) + 1.7 * uT)) + 0.15 * sin(0.8 * p.x - 2.0 * uT) + 0.12 * uStorm * sin(1.9 * p.x + 2.3 * p.y - 3.0 * uT); }
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec2 lp = position.xz; float h = hgt(vec2(lp.x, -lp.y)); w.y += h; vH = h; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uDawn, uFlash, uStorm; varying vec3 vW; varying float vH;
      void main(){
        vec3 deep = mix(vec3(0.02, 0.045, 0.07), vec3(0.22, 0.12, 0.05), uDawn), crest = mix(vec3(0.12, 0.19, 0.25), vec3(1.2, 0.75, 0.38), uDawn);
        float foam = 0.6 * smoothstep(1.15 * uStorm + 0.2, 1.6 * uStorm + 0.3, vH);
        vec3 c = mix(deep, crest, smoothstep(-1.2, 1.4, vH) * 0.55) + foam * vec3(0.35, 0.4, 0.42) * (1.0 - 0.4 * uDawn);
        c += vec3(0.4, 0.45, 0.55) * uFlash * 0.6;
        float dist = length(vW - cameraPosition); c = mix(c, mix(vec3(0.1, 0.14, 0.2), vec3(1.0, 0.62, 0.3), uDawn), smoothstep(60.0, 300.0, dist));
        gl_FragColor = vec4(c, 1.0);
      }` });
  const seaGeo = new THREE.PlaneGeometry(600, 600, 220, 220); seaGeo.rotateX(-Math.PI / 2);
  const seaMesh = new THREE.Mesh(seaGeo, seaM); seaMesh.layers.set(NOINK); seaMesh.frustumCulled = false; B.add(seaMesh);
  const boat = new THREE.Group(); boat.userData.moving = true; B.add(boat);
  const plank = mat("#6a4428"), plankD = mat("#4a2e1a");
  box(boat, [-0.65, -0.35, -2.0], [0.65, -0.28, 2.0], plankD); box(boat, [-0.7, -0.35, -2.0], [-0.62, 0.25, 2.0], plank); box(boat, [0.62, -0.35, -2.0], [0.7, 0.25, 2.0], plank);
  box(boat, [-0.7, -0.35, 1.9], [0.7, 0.35, 2.0], plank); const bow = box(boat, [-0.45, -0.3, -2.4], [0.45, 0.4, -1.95], plank); bow.rotation.x = 0.3;
  box(boat, [-0.62, 0.05, 0.3], [0.62, 0.1, 0.5], plankD, false);                                   // a thwart (he never sits on it)
  const oar = new THREE.Group(); boat.add(oar); cyl(oar, 0.025, 0.025, 3.4, mat("#8a6a42"), [0, -1.2, 0], 6); box(oar, [-0.03, -3.0, -0.12], [0.03, -2.6, 0.12], mat("#8a6a42"));
  const rainB = rainLines(B, 2600, "#a8b8d0", 0.55);
  const sunB = sun(B, [0, 0, 0], 30); sunB.setFrom([0.4, 1, 0.3]); sunB.light.color.set("#8a9ab8");
  const flashL = new THREE.PointLight("#c8d8ff", 0, 300, 1.2); flashL.position.set(30, 60, -60); B.add(flashL);
  // ======================= DESERT: an endless road at dusk; the distant light; night, stars, rain =======================
  const C = area(WORLD.DESERT), skyC = skyFor(C);
  const dg = new THREE.PlaneGeometry(500, 500, 160, 160); dg.rotateX(-Math.PI / 2);
  { const p = dg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), road = Math.exp(-(x * x) / 40);
      p.setY(i, (1 - road) * (2.2 * Math.sin(x * 0.07 + Math.sin(z * 0.03) * 2) * Math.sin(z * 0.05 + x * 0.02) + 1.2 * Math.sin(x * 0.19 + z * 0.11)) * Math.min(1, Math.abs(x) / 12) - 0.02); } dg.computeVertexNormals(); }
  const dunes = new THREE.Mesh(dg, mat("#ffffff", { map: sandTex("C", "#b8885a") })); dunes.receiveShadow = true; C.add(dunes);
  const roadM = mat("#6a5a4a"); box(C, [-1.1, 0, -400], [1.1, 0.03, 30], roadM, false);
  for (let z = 28; z > -400; z -= 3.2) box(C, [-1.1, 0.03, z - 0.04], [1.1, 0.035, z], mat("#4a3e32"), false);
  const farGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: new THREE.Color(3.0, 2.4, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  farGlow.position.set(0, 4, -330); farGlow.scale.set(160, 60, 1); farGlow.layers.set(NOINK); C.add(farGlow);
  const rainC = rainLines(C, 1600, "#b8c8e0", 0.32);
  const handBeam = lightBeam(C, [0.6, 6, 2.0], [0, 0.9, 0.6], 0.15, 0.6, "#ffe0a0", 0.4);
  const sunC = sun(C, [0, 0, -10], 30); sunC.setFrom([0.3, 0.25, -1]); sunC.light.color.set("#ffb070");
  const warmC = new THREE.PointLight("#ffc890", 0, 12, 1.4); warmC.position.set(1.2, 2.6, 2); C.add(warmC);
  // ======================= FORGE: a sword hammered, then plunged hissing into water =======================
  const D = area(WORLD.FORGE); D.add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat("#2a201a")).rotateX(-Math.PI / 2));
  box(D, [-0.35, 0, -0.2], [0.35, 0.55, 0.2], mat("#2a2a2c")); box(D, [-0.55, 0.55, -0.22], [0.5, 0.72, 0.22], mat("#3a3a3e"));       // the anvil
  const swordM = glow("#ff8a30", 2.2), sword = new THREE.Group(); D.add(sword); box(sword, [-0.6, 0, -0.03], [0.4, 0.02, 0.03], swordM, false); box(sword, [0.4, -0.04, -0.07], [0.44, 0.06, 0.07], mat("#3a3a3e"), false); box(sword, [0.44, -0.015, -0.02], [0.66, 0.035, 0.02], mat("#4a3020"), false);
  const hammer = new THREE.Group(); D.add(hammer); cyl(hammer, 0.025, 0.025, 0.7, mat("#5a3a22"), [0.35, 0, 0], 6).rotation.z = Math.PI / 2; box(hammer, [-0.08, -0.07, -0.07], [0.08, 0.07, 0.07], mat("#3a3a3e"));
  const barrel = cyl(D, 0.42, 0.38, 0.8, mat("#5a3a22"), [1.4, 0.4, 0.2], 18); void barrel;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.3, 0.35) })); water.rotation.x = -Math.PI / 2; water.position.set(1.4, 0.78, 0.2); water.layers.set(NOINK); D.add(water);
  const steam = Array.from({ length: 14 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex(), color: new THREE.Color("#e8e4dc"), transparent: true, depthWrite: false, fog: false })); sp.layers.set(NOINK); D.add(sp); return sp; });
  const sparks = pointsOf(D, 300, "#ffb040", 0.03);
  const forgeL = new THREE.PointLight("#ff8a3a", 0, 6, 1.3); forgeL.position.set(-0.6, 0.9, 0.6); D.add(forgeL);
  const barrelL = new THREE.PointLight("#ffa050", 0, 5, 1.3); barrelL.position.set(1.9, 1.5, 1.0); D.add(barrelL);
  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow("#ff5a10", 1.6)); coals.position.set(-1.3, 0, -0.5); coals.scale.y = 0.45; coals.layers.set(NOINK); D.add(coals);
  // ======================= OYSTER: a ridged shell on the seabed, opening on a glowing pearl =======================
  const E2 = area(WORLD.OYSTER); E2.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat("#ffffff", { map: sandTex("E", "#8a9a86") })).rotateX(-Math.PI / 2));
  const ridgeTex = ctex("bwShell", 256, 256, (g) => { g.fillStyle = "#6a6058"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; g.strokeStyle = i % 2 ? "#4a4038" : "#8a7e70"; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 140 * Math.cos(a), 128 + 140 * Math.sin(a)); g.stroke(); }
    for (let r2 = 20; r2 < 128; r2 += 16) { g.strokeStyle = "rgba(40,32,26,0.5)"; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, r2, 0, 7); g.stroke(); } });
  /** one half of the shell: a shallow dish with a wavy, scalloped rim, ridged outside, pearly inside */
  const halfShell = (flip: boolean) => { const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.34, 40, 12, 0, Math.PI * 2, flip ? 0 : Math.PI / 2, Math.PI / 2), pa = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z) / 0.34, wav = 1 + 0.08 * Math.sin(a * 9) * rr; pa.setX(i, x * wav * (1 + 0.15 * Math.cos(a))); pa.setZ(i, z * wav * 0.85); }
    geo.computeVertexNormals(); const outer = new THREE.Mesh(geo, mat("#ffffff", { map: ridgeTex })); outer.scale.y = 0.32; g.add(outer);
    const nacre = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.82, 0.7, 0.74), side: THREE.DoubleSide })); nacre.rotation.x = -Math.PI / 2; nacre.scale.set(1.1, 0.82, 1); nacre.position.y = flip ? -0.004 : 0.004; nacre.layers.set(NOINK); g.add(nacre);
    return g; };
  const lower = halfShell(false); lower.position.set(0, 0.11, 0); E2.add(lower);
  const upperG = new THREE.Group(); upperG.position.set(0, 0.11, -0.27); E2.add(upperG); const upper = halfShell(true); upper.position.z = 0.27; upperG.add(upper);
  const pearlM = glow("#f4eee4", 1.2), pearl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 12), pearlM); pearl.position.set(0, 0.15, 0.02); pearl.layers.set(NOINK); E2.add(pearl);
  const weeds = Array.from({ length: 9 }, (_, i) => { const g = new THREE.Group(); g.position.set(-1.2 + 2.6 * hash(i + 1), 0, -1.0 - 1.2 * hash(i + 2)); E2.add(g); for (let k = 0; k < 6; k++) { const seg = cyl(g, 0.015, 0.02, 0.22, mat("#3a6a3a"), [0, 0.11 + 0.21 * k, 0], 5); seg.userData.k = k; } return g; });
  for (let i = 0; i < 6; i++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + 0.15 * hash(i + 4), 0), mat("#5a5a52")); rk.position.set(-1.4 + 2.8 * hash(i + 5), 0.05, -0.4 - 1.4 * hash(i + 6)); rk.scale.y = 0.6; E2.add(rk); }
  const rays = [[-0.6, 6, 0.5, 0.2, 0, -0.2], [0.8, 6, -0.6, 0.6, 0, -0.9]].map(([a, b, c, d, e, f2]) => lightBeam(E2, [a, b, c], [d, e, f2], 0.3, 1.1, "#c8f0f0", 0.22));
  const bubbles = pointsOf(E2, 160, "#cfe8f0", 0.03); const caustic = new THREE.PointLight("#9ae0d8", 0, 8, 1.2); caustic.position.set(0, 3, 0.8); E2.add(caustic);
  const pearlL = new THREE.PointLight("#fff0d8", 0, 2, 1.5); pearlL.position.set(0, 0.3, 0.15); E2.add(pearlL);
  // ======================= SEED: a seed under a rock cracks through and grows into a tree =======================
  const F2 = area(WORLD.SEED), skyF = skyFor(F2); F2.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat("#3a2a1c")).rotateX(-Math.PI / 2));
  const rockM = mat("#5a5650"), rockL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockM), rockR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockM);
  rockL.scale.set(0.6, 0.7, 1); rockR.scale.set(0.6, 0.7, 1); F2.add(rockL, rockR);
  const tree = new THREE.Group(); F2.add(tree); const trunk = cyl(tree, 0.05, 0.12, 2.6, mat("#4a3020"), [0, 1.3, 0], 8);
  const leaves = [[0, 2.8, 0, 1.0], [0.6, 2.4, 0.2, 0.7], [-0.5, 2.5, -0.1, 0.75], [0.1, 3.3, 0.1, 0.7], [-0.2, 2.1, 0.4, 0.55]].map(([x, y, z, rad]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), mat("#4a7a3a")); m.position.set(x, y, z); tree.add(m); return m; });
  const sprout = cyl(F2, 0.012, 0.018, 0.4, mat("#6a9a4a"), [0, 0.2, 0], 6);
  const sunF = sun(F2, [0, 1, 0], 10); sunF.setFrom([0.6, 0.9, 0.5]); sunF.light.color.set("#ffe8c8"); void trunk;
  // ======================= COAL: black coal glowing in its cracks, pressed, split, become a diamond =======================
  const G2 = area(WORLD.COAL); G2.add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat("#4a4440")).rotateX(-Math.PI / 2));
  const coalL = new THREE.PointLight("#ffd8a8", 14, 8, 1.3); coalL.position.set(-0.8, 1.6, 1.0); G2.add(coalL);
  const coalM = mat("#141212"), coalLumps = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + 0.06 * hash(i + 1), 0), coalM); m.position.set((hash(i + 2) - 0.5) * 0.4, 0.1 + 0.05 * hash(i + 3), (hash(i + 4) - 0.5) * 0.3); m.rotation.set(hash(i) * 3, hash(i + 5) * 3, 0); G2.add(m); return { m, base: m.position.clone() }; });
  const emberM = glow("#ff6a18", 2.0), embers = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), emberM); embers.scale.set(1.3, 0.25, 1); embers.position.y = 0.04; embers.layers.set(NOINK); G2.add(embers);
  const emberL = new THREE.PointLight("#ff7a28", 4, 3, 1.4); emberL.position.set(0, 0.3, 0.2); G2.add(emberL);
  const coal = new THREE.Group(); G2.add(coal);
  const slabT = box(G2, [-0.5, 0, -0.5], [0.5, 0.18, 0.5], mat("#3a3634")); slabT.userData.noCollide = true;   // the iron press plate (it moves between the camera and the coal)
  const diaM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.25, 1.45) }), diamond = new THREE.Group(); diamond.position.y = 0.26; G2.add(diamond);
  { const pav = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.18, 8), diaM); pav.rotation.x = Math.PI; pav.position.y = -0.04; const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.07, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.5, 1.7) })); crown.position.y = 0.085;
    pav.layers.set(NOINK); crown.layers.set(NOINK); diamond.add(pav, crown); }
  const glint = pointsOf(G2, 60, "#f0f8ff", 0.05); const diaL = new THREE.PointLight("#cfe4ff", 0, 4, 1.4); diaL.position.set(0, 0.8, 0.4); G2.add(diaL);
  // ======================= HOURGLASS: a real hourglass on a table: wooden frame, two glass bulbs, the sand =======================
  const H2 = area(WORLD.HOUR), skyH = skyFor(H2); H2.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat("#3a2c22")).rotateX(-Math.PI / 2));
  box(H2, [-0.6, 0, -0.45], [0.6, 0.6, 0.45], mat("#5a3a22"));                                                    // the table
  const hg = new THREE.Group(); hg.position.y = 0.6; H2.add(hg);
  const wood = mat("#6a4224"); for (const y of [0, 0.66]) { cyl(hg, 0.2, 0.2, 0.05, wood, [0, y + 0.025, 0], 24); cyl(hg, 0.17, 0.17, 0.02, wood, [0, y + (y ? -0.005 : 0.055), 0], 24); }
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, x = 0.165 * Math.cos(a), z = 0.165 * Math.sin(a); cyl(hg, 0.016, 0.016, 0.62, wood, [x, 0.36, z], 8); for (const y of [0.2, 0.36, 0.52]) cyl(hg, 0.024, 0.024, 0.03, wood, [x, y, z], 8); }
  const glassM = new THREE.MeshLambertMaterial({ color: "#b8d0e0", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const prof = [0.012, 0.03, 0.07, 0.11, 0.135, 0.14, 0.13, 0.1, 0.05, 0.016].map((rr, i) => new THREE.Vector2(rr, i * 0.032));
  const top = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), glassM); top.position.y = 0.36; hg.add(top);          // the upper bulb (neck at the bottom)
  const bot = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), glassM); bot.rotation.x = Math.PI; bot.position.y = 0.36; hg.add(bot);   // the lower bulb
  const sandM = new THREE.MeshLambertMaterial({ color: "#e0a858" }), sTop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.13, 24), sandM); sTop.rotation.x = Math.PI; hg.add(sTop);
  const sBot = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 24), sandM); hg.add(sBot);
  const streamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.05, 0.55) }), stream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 5), streamM); stream.position.y = 0.24; stream.layers.set(NOINK); hg.add(stream);
  const starBurst = pointsOf(H2, 1500, "#fff0d0", 0.07);
  const hgL = new THREE.PointLight("#ffd8a0", 0, 5, 1.3); hgL.position.set(0.6, 1.5, 0.9); H2.add(hgL);
  const lampH = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glow("#ffcf80", 2.4)); lampH.position.set(-0.45, 0.75, -0.2); lampH.layers.set(NOINK); H2.add(lampH);
  const lampHL = new THREE.PointLight("#ffb060", 6, 4, 1.4); lampHL.position.set(-0.45, 0.85, -0.2); H2.add(lampHL);
  const areas = { comfort: A, sea: B, desert: C, forge: D, oyster: E2, seed: F2, coal: G2, hour: H2 };
  const apply = (state: string, t: number): SetLook => {
    const [name, a0, b0, c0, d0] = state.split(":"), n = (v?: string) => (v === undefined ? 0 : Number(v));
    for (const [k, g] of Object.entries(areas)) g.visible = k === name;
    if (name === "comfort") {
      skyA.uT.value = t; skyA.uTop.value.set("#3a4a7a"); skyA.uHor.value.set("#f0a060"); skyA.uCloud.value = 0.35; skyA.uCloudCol.value.set("#c87850"); skyA.uSunK.value = 1; skyA.uSunCol.value.set("#ffb070"); skyA.uSun.value.set(-0.6, 0.12, -0.8).normalize(); skyA.uStars.value = 0;
      const ks = [n(a0), n(b0), n(c0), n(d0)];
      things.forEach((g, i) => { const k = ks[i]; g.visible = k < 0.1; g.scale.setScalar(Math.max(0.01, 1 - 0.6 * Math.min(1, k / 0.1))); g.position.set(WORLD.THINGS[i][0], g.visible ? -0.3 * Math.min(1, k / 0.1) : -3000, WORLD.THINGS[i][2]);   /* hidden things still block the camera-collision rays */
        const sd = sand[i]; sd.pts.p.visible = k > 0.001;
        sd.seeds.forEach(([x, y, z], j) => { const u = Math.max(0, k * 1.4 - 0.4 * hash(j * 13 + i)), sw = u * u;
          sd.pts.pos.set([x + sw * 9 + Math.sin(j + t * 2) * 0.4 * u, Math.max(0.02, y * (1 - Math.min(1, u * 1.6)) + sw * 2.5 * hash(j)), z + sw * 2.5 * (hash(j + 5) - 0.5) + Math.cos(j * 1.3 + t * 2.3) * 0.4 * u], j * 3); });
        sd.pts.done(); sd.pts.m.opacity = 1 - Math.max(0, (k - 0.75) / 0.25); });
      (scr.material as THREE.MeshBasicMaterial).color.set("#bcd8ff").multiplyScalar(2 * (1 - n(d0)));
      return { lit: [1.1, 0.86, 0.62], shade: [0.3, 0.22, 0.24], lift: [0.03, 0.02, 0.02], sat: 1.0, charTint: [1, 0.92, 0.82], cardGain: 1.0, cardPointK: 1, pointK: 1, grade: GRADE_WARM, fog: ["#d89a68", 20, 160] };
    }
    if (name === "sea") {
      const storm = n(a0) || 0, dawn = n(b0), fl = n(c0);
      seaU.uT.value = t; seaU.uStorm.value = storm; seaU.uDawn.value = dawn; seaU.uFlash.value = fl;
      skyB.uT.value = t; skyB.uTop.value.set("#101a2c").lerp(new THREE.Color("#3a5a9a"), dawn); skyB.uHor.value.set("#2c3c54").lerp(new THREE.Color("#ffb060"), dawn);
      skyB.uCloud.value = 1; skyB.uCloudCol.value.set("#34404e").lerp(new THREE.Color("#c88050"), dawn); skyB.uFlash.value = fl; skyB.uTear.value = dawn;
      skyB.uSun.value.set(0.1, 0.12, -1).normalize(); skyB.uSunCol.value.set("#ffd080"); skyB.uSunK.value = 1.6 * dawn; skyB.uStars.value = 0;
      const bx = 0, bz = 0, hy = seaY(bx, bz, t, storm); boat.position.set(bx, hy + 0.1, bz);
      boat.rotation.set(0.25 * storm * Math.sin(0.9 * t + 0.4), 0.3, 0.18 * storm * Math.sin(1.1 * t + 1.3));
      oar.position.set(0.7, 1.4, -0.75); oar.rotation.set(0.5 * Math.sin(t * 2.6), 0, 0.55 + 0.25 * Math.sin(t * 2.6 + 1));
      for (let j = 0; j < 2600; j++) { const sp = 22 * (1 - dawn) - 6 * dawn, x = (hash(j) - 0.5) * 40 + 4, z = (hash(j + 9) - 0.5) * 40, y0 = hash(j + 3) * 20;
        let y = (y0 - sp * t) % 20; if (y < 0) y += 20; const yy = dawn > 0.5 ? y0 * (1 - dawn) + y * dawn : y - 2;
        rainB.set(j, x + 3 * (1 - dawn) * (y / 20), yy, z, 0.25 * (1 - dawn), dawn > 0.5 ? 0.6 : -1); }
      rainB.done(); rainB.m.color.set("#a8b8d0").lerp(new THREE.Color("#ffd890"), dawn); rainB.m.blending = dawn > 0.3 ? THREE.AdditiveBlending : THREE.NormalBlending; rainB.m.opacity = 0.45 + 0.4 * dawn;
      flashL.intensity = 40000 * fl; sunB.setFrom(dawn > 0.3 ? [0.1, 0.2, -1] : [0.4, 1, 0.3]); sunB.light.color.set("#8a9ab8").lerp(new THREE.Color("#ffc070"), dawn); sunB.light.intensity = 0.6 + 1.4 * dawn;
      return { lit: [0.3 + 1.0 * dawn + 0.8 * fl, 0.36 + 0.7 * dawn + 0.8 * fl, 0.5 + 0.3 * dawn + 0.9 * fl], shade: [0.05 + 0.25 * dawn, 0.06 + 0.15 * dawn, 0.09 + 0.08 * dawn], lift: [0.01, 0.012, 0.02], sat: 0.9 + 0.2 * dawn, charTint: [0.85 + 0.15 * dawn, 0.9, 1.0 - 0.15 * dawn], cardGain: 0.75 + 0.4 * dawn + fl, cardPointK: 1, pointK: 1, grade: dawn > 0.5 ? GRADE_WARM : GRADE_STORM, fog: [dawn > 0.5 ? "#e8a060" : "#0a1018", 30, 260] };
    }
    if (name === "desert") {
      const night = n(a0), gl = n(b0), rain = n(c0);
      skyC.uT.value = t; skyC.uTop.value.set("#4a3a6a").lerp(new THREE.Color("#0e1630"), night); skyC.uHor.value.set("#e8885a").lerp(new THREE.Color("#3a4064"), night);
      skyC.uCloud.value = 0.25 * (1 - night) + 0.5 * rain; skyC.uCloudCol.value.set("#a86a58").lerp(new THREE.Color("#1a2030"), night); skyC.uStars.value = night * (1 - rain);
      skyC.uSun.value.set(0, 0.03, -1).normalize(); skyC.uSunCol.value.set("#ffd8a0"); skyC.uSunK.value = 0.8 * gl; skyC.uFlash.value = 0;
      farGlow.material.opacity = gl; farGlow.scale.set(160 + 20 * Math.sin(t * 0.8), 60, 1);
      rainC.p.visible = rain > 0.01; if (rain > 0.01) { for (let j = 0; j < 1600; j++) { const x = (hash(j) - 0.5) * 8, z = (hash(j + 9) - 0.5) * 8 + 1, y0 = hash(j + 3) * 8; let y = (y0 - 14 * t) % 8; if (y < 0) y += 8; rainC.set(j, x, y, z, 0.05, -1); } rainC.done(); rainC.m.opacity = 0.5 * rain; }
      handBeam.setLevel(rain); warmC.intensity = 6 * Math.max(rain, night * 0.6);
      sunC.light.intensity = 1.2 * (1 - night) + 0.25 * night; sunC.light.color.set("#ffb070").lerp(new THREE.Color("#8aa0d0"), night);
      return { lit: [1.0 - 0.6 * night, 0.72 - 0.4 * night, 0.55 - 0.1 * night], shade: [0.24 - 0.17 * night, 0.18 - 0.12 * night, 0.25 - 0.12 * night], lift: [0.02, 0.02, 0.03], sat: 0.95, charTint: [1, 0.92, 0.84], cardGain: 0.95 - 0.3 * night, cardPointK: 1.2, pointK: 1.2, grade: GRADE_WARM, fog: [night > 0.5 ? "#101626" : "#c88a68", 30, 300] };
    }
    if (name === "forge") {
      const p = n(a0), strike = p < 0.6 ? Math.abs(Math.sin(p / 0.6 * Math.PI * 4)) : 1, plunge = Math.max(0, (p - 0.6) / 0.4), cool = Math.max(0, (p - 0.78) / 0.22);
      hammer.visible = p < 0.62; hammer.position.set(-0.05, 0.78 + 0.45 * strike, 0.05); hammer.rotation.z = 0.6 * strike;
      sword.position.set(plunge < 0.01 ? -0.05 : -0.05 + 1.45 * Math.min(1, plunge * 2), 0.73 + (plunge > 0.5 ? -0.9 * Math.min(1, (plunge - 0.5) * 3) : 0.3 * Math.sin(Math.min(1, plunge * 2) * Math.PI)), 0.0 + 0.2 * Math.min(1, plunge * 2));
      sword.rotation.z = plunge > 0.5 ? -1.45 : 0; swordM.color.set("#ffa040").lerp(new THREE.Color("#3a3a3e"), cool).multiplyScalar(3.2 * (1 - cool) + 1 * cool);
      steam.forEach((sp, j) => { const hit = Math.max(0, (p - 0.78) / 0.22), life = Math.min(1, hit * 1.4 + (j / steam.length) * 0.4); sp.visible = hit > 0.001; sp.position.set(1.4 + (0.2 + 0.6 * life) * Math.sin(j * 2.1), 0.85 + 1.6 * life * (0.6 + 0.4 * hash(j)), 0.2 + (0.2 + 0.5 * life) * Math.cos(j)); sp.scale.setScalar(0.25 + 1.3 * life); sp.material.opacity = 0.85 * Math.min(1, hit * 6) * (1 - 0.7 * life); });   // a burst of steam the moment the blade hits the water
      // sparks burst on every hammer strike (the moment the hammer meets the blade), flying out and falling
      const beat = (p / 0.6) * 4, sinceHit = p < 0.62 ? ((beat + 0.5) % 1) * (0.6 / 4) * 3.4 : 9;   // seconds-ish since the last strike
      for (let j = 0; j < 300; j++) { const s2 = sinceHit * (0.7 + 0.6 * hash(j + 7)), a = hash(j + 2) * 6.28, v = 0.8 + 1.6 * hash(j + 3), on = s2 < 0.7;
        sparks.pos.set([on ? -0.05 + Math.cos(a) * v * s2 : 0, on ? 0.76 + (0.8 + hash(j + 4)) * s2 - 2.6 * s2 * s2 : -50, on ? Math.sin(a) * v * s2 * 0.6 : 0], j * 3); } sparks.done(); sparks.m.size = 0.035;
      barrelL.intensity = p > 0.6 ? 10 + 14 * (1 - cool) : 3; forgeL.intensity = 16 + 5 * Math.sin(t * 9) + 12 * Math.max(0, 1 - sinceHit * 4) + 10 * (1 - cool) * plunge;
      return { lit: [1.3, 0.78, 0.45], shade: [0.2, 0.11, 0.08], lift: [0.03, 0.015, 0.01], sat: 1.05, charTint: [1, 0.9, 0.8], cardGain: 1.0, cardPointK: 1.2, pointK: 1.8, grade: GRADE_WARM, fog: ["#2a1408", 5, 22] };
    }
    if (name === "oyster") {
      const p = n(a0), op = Math.max(0, Math.min(1, (p - 0.2) / 0.5)); upperG.rotation.x = -1.0 * op; pearlM.color.set("#f4eee4").multiplyScalar(0.6 + 1.2 * op); pearlL.intensity = 3 * op;
      for (let j = 0; j < 160; j++) { const life = (t * 0.25 + hash(j)) % 1; bubbles.pos.set([(hash(j + 1) - 0.5) * 3, life * 4, (hash(j + 2) - 0.5) * 3 - 0.5], j * 3); } bubbles.done(); caustic.intensity = 5 + 1.2 * Math.sin(t * 2.3);
      weeds.forEach((g, i) => g.children.forEach((c) => { const k = (c.userData.k as number) ?? 0; c.position.x = 0.04 * k * Math.sin(t * 1.3 + i); }));
      rays.forEach((r2) => r2.setLevel(0.9 + 0.1 * Math.sin(t * 1.7)));
      return { lit: [0.55, 0.85, 0.85], shade: [0.1, 0.2, 0.24], lift: [0.02, 0.04, 0.05], sat: 0.95, charTint: [0.8, 0.95, 1], cardGain: 0.8, cardPointK: 1, pointK: 1.3, grade: GRADE_WARM, fog: ["#2a6a70", 1.8, 9] };
    }
    if (name === "seed") {
      skyF.uT.value = t; skyF.uTop.value.set("#4a78b8"); skyF.uHor.value.set("#f8d8a0"); skyF.uCloud.value = 0.3; skyF.uCloudCol.value.set("#f4ece0"); skyF.uSun.value.set(0.5, 0.35, -0.8).normalize(); skyF.uSunCol.value.set("#fff0c8"); skyF.uSunK.value = 1; skyF.uStars.value = 0;
      const p = n(a0), split = Math.max(0, Math.min(1, (p - 0.1) / 0.25)), grow = Math.max(0, Math.min(1, (p - 0.3) / 0.7));
      rockL.position.set(-0.05 - 0.35 * split, 0.32, 0); rockL.rotation.z = 0.4 * split; rockR.position.set(0.05 + 0.35 * split, 0.32, 0); rockR.rotation.z = -0.4 * split;
      sprout.visible = grow < 0.15; sprout.scale.y = Math.max(0.05, split); sprout.position.y = 0.2 * split;
      tree.visible = grow >= 0.15; tree.scale.setScalar(0.1 + 0.9 * Math.pow(Math.max(0, (grow - 0.15) / 0.85), 0.7)); leaves.forEach((m, i) => m.scale.setScalar(Math.max(0.01, Math.min(1, (grow - 0.4 - 0.08 * i) / 0.4))));
      return { lit: [1.0, 0.9, 0.7], shade: [0.2, 0.18, 0.2], lift: [0.02, 0.02, 0.02], sat: 1.05, charTint: [1, 1, 1], cardGain: 1, cardPointK: 1, pointK: 1, grade: GRADE_WARM, fog: ["#e8d0a8", 20, 120] };
    }
    if (name === "coal") {
      const p = n(a0), press = Math.min(1, p / 0.42), crack = Math.max(0, Math.min(1, (p - 0.38) / 0.12)), bright = Math.max(0, (p - 0.5) / 0.3);
      slabT.position.y = 1.4 - 1.08 * press + (p > 0.52 ? 1.5 * Math.min(1, (p - 0.52) / 0.2) : 0);
      coalLumps.forEach(({ m, base }, i) => { m.visible = p < 0.5; m.position.set(base.x * (1 + 1.6 * crack), base.y * (1 - 0.4 * press) + 0.04 * crack * Math.sin(i * 3), base.z * (1 + 1.6 * crack)); m.scale.setScalar(1 - 0.4 * crack); });
      emberM.color.set("#ff6a18").multiplyScalar(1.4 + 2.2 * press); embers.visible = p < 0.5; emberL.intensity = p < 0.5 ? 3 + 6 * press : 0;
      diamond.visible = p >= 0.5; diamond.rotation.y = t * 0.7; diamond.scale.setScalar(0.6 + 0.4 * Math.min(1, bright * 2)); diaL.intensity = 4 * bright;
      for (let j = 0; j < 60; j++) { const a = hash(j) * 6.28, rr = 0.25 + 0.2 * hash(j + 1), tw = Math.max(0, Math.sin(t * 9 + j * 2.3)); glint.pos.set([diamond.visible ? Math.cos(a + t) * rr : 0, diamond.visible ? 0.26 + (hash(j + 2) - 0.5) * 0.35 : -50, Math.sin(a + t) * rr], j * 3); void tw; } glint.done(); glint.m.opacity = bright;
      return { lit: [0.8, 0.74, 0.7], shade: [0.16, 0.14, 0.14], lift: [0.03, 0.03, 0.03], sat: 1.0, charTint: [1, 1, 1], cardGain: 0.9, cardPointK: 1, pointK: 1.4, grade: GRADE_WARM, fog: ["#6a5440", 1.6, 7] };
    }
    // hourglass
    const p = n(a0), stop = Math.max(0, Math.min(1, (p - 0.25) / 0.1)), rise = Math.max(0, Math.min(1, (p - 0.35) / 0.35)), burst = Math.max(0, (p - 0.7) / 0.3);
    skyH.uT.value = t; skyH.uTop.value.set("#141e46"); skyH.uHor.value.set("#5e4c78"); skyH.uCloud.value = 0; skyH.uStars.value = 0.3 + 0.7 * burst; skyH.uSunK.value = 0;
    const topK = p < 0.35 ? 0.3 - 0.15 * p : 0.25 + 0.6 * rise, botK = Math.max(0.05, 1 - topK);
    sTop.scale.set(Math.max(0.05, topK) ** 0.5, Math.max(0.05, topK), Math.max(0.05, topK) ** 0.5); sTop.position.y = 0.42 + 0.065 * topK;
    sBot.scale.set(botK ** 0.5, botK, botK ** 0.5); sBot.position.y = 0.06 + 0.05 * botK;
    hg.visible = burst < 0.6; stream.visible = p < 0.25 || (rise > 0 && rise < 1); streamM.color.setRGB(1.5, 1.05 + 0.8 * rise, 0.55 + 1.2 * rise);
    for (let j = 0; j < 1500; j++) { const a = hash(j) * 6.28, el = hash(j + 1) * 1.4, sp = burst * (6 + 26 * hash(j + 2)); starBurst.pos.set([burst > 0 ? Math.cos(a) * Math.cos(el) * sp : 0, burst > 0 ? 1.0 + Math.sin(el) * sp : -50, burst > 0 ? Math.sin(a) * Math.cos(el) * sp - 2 : 0], j * 3); } starBurst.done(); starBurst.m.opacity = Math.min(1, burst * 3);
    hgL.intensity = 6 + 4 * rise; lampHL.intensity = 6 * (1 - burst);
    void stop;
    return { lit: [0.6, 0.58, 0.66], shade: [0.1, 0.1, 0.16], lift: [0.02, 0.02, 0.04], sat: 0.95, charTint: [1, 0.95, 0.9], cardGain: 0.85, cardPointK: 1.2, pointK: 1.3, grade: GRADE_WARM, fog: ["#141a30", 8, 70] };
  };
  return { id: "bookworlds", root, offset, apply };
};
