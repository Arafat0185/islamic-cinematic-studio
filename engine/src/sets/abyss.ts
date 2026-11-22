// The abyss (video 003 "The Sirat"): a jagged black cliff at the edge of an endless pit, an ocean of fire far below
// (a living shader: rolling, boiling, white-hot cores), a boiling blood-red sky with red lightning, and the bridge: one
// thin burning line of light running from the cliff edge across the whole pit. Embers rise everywhere, ash drifts down,
// dark smoke rolls over the pit; sparks drip off the bridge. Everything is lit from BELOW by the fire.
// Local coordinates: the cliff top is y = 0 for x < 0; its edge runs along x = 0; the bridge runs from (0, 0, 0) along +x
// at z = 0 (BRIDGE.Y(x) is its top), the fire surface is y = FIRE_Y. Cameras mostly look toward +x (out over the pit).
// State "hell:<erupt 0..1>:<lightning 0..1>:<glow 0..2>": the eruption (a column of white-yellow fire rising from the
// pit at ERUPT), a red lightning flash in the sky, and how strongly the fire lights the scene.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import type { GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex } from "../draw/paint";
import { StorySet, SetLook, mat, box, sun } from "./common";

export const ABYSS = {
  FIRE_Y: -95, BRIDGE_LEN: 460, BRIDGE_W: 0.16,
  /** the bridge's top at x (a very slight sag far out, so it reads as a line hung across the pit) */
  Y: (x: number) => -0.000045 * Math.max(0, x) * Math.max(0, 460 - x) * 0.25,
  ERUPT: [46, -95, -34] as V3,
};

export const GRADE_HELL: GradeParams = {
  ky: [0, 0.03, 0.17, 0.5, 0.8, 0.95, 1],          // crushed blacks, punchy mids
  sat: [1.15, 1.25, 1.05],
  tintS: [-0.01, 0.03], tintM: [-0.02, 0.04], tintH: [-0.03, 0.03],
  vig: [0.35, 0.3],
};

const NOISE = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
`;

/** the ocean of fire: domain-warped noise flowing slowly, ramped black -> blood red -> orange -> white-hot (bloom) */
const fireOcean = (root: THREE.Object3D) => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uGlow: { value: 1 }, uErupt: { value: 0 }, uE: { value: new THREE.Vector2(ABYSS.ERUPT[0], ABYSS.ERUPT[2]) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: NOISE + /* glsl */ `
      uniform float uT, uGlow, uErupt; uniform vec2 uE; varying vec3 vW;
      vec3 ramp(float h){
        vec3 c = mix(vec3(0.0), vec3(0.22, 0.0, 0.0), smoothstep(0.0, 0.3, h));
        c = mix(c, vec3(0.75, 0.04, 0.0), smoothstep(0.3, 0.5, h));
        c = mix(c, vec3(1.6, 0.35, 0.02), smoothstep(0.5, 0.68, h));
        c = mix(c, vec3(2.6, 1.2, 0.25), smoothstep(0.68, 0.84, h));
        return mix(c, vec3(4.0, 3.2, 1.6), smoothstep(0.84, 1.0, h));
      }
      void main(){
        vec2 p = vW.xz * 0.018;
        vec2 q = vec2(fbm(p + vec2(0.0, uT * 0.06)), fbm(p + vec2(5.2, 1.3) - uT * 0.05));
        float n = fbm(p * 1.6 + 2.2 * q + vec2(uT * 0.04, -uT * 0.07));
        float veins = pow(1.0 - abs(2.0 * fbm(p * 3.5 - q * 1.5 + uT * 0.08) - 1.0), 6.0);
        float h = clamp(0.25 + 0.75 * n + 0.35 * veins, 0.0, 1.0);
        float de = length(vW.xz - uE);
        h = max(h, uErupt * smoothstep(60.0, 0.0, de));
        vec3 c = ramp(h) * uGlow;
        float dist = length(vW - cameraPosition);
        c = mix(c, vec3(0.55, 0.06, 0.0), smoothstep(250.0, 560.0, dist));   // the far haze over the pit
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = ABYSS.FIRE_Y; mesh.layers.set(NOINK); mesh.frustumCulled = false; root.add(mesh);
  return m;
};

/** the boiling sky: thick blood-red clouds lit from below, near black overhead, a fiery band at the horizon; lightning */
const hellSky = (root: THREE.Object3D) => {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uT: { value: 0 }, uFlash: { value: 0 }, uFdir: { value: new THREE.Vector3(0.6, 0.5, -0.6).normalize() }, uSun: { value: new THREE.Vector3(0.93, 0.3, 0.2).normalize() } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: NOISE + /* glsl */ `
      uniform float uT, uFlash; uniform vec3 uFdir; uniform vec3 uSun; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        float y = d.y;
        vec2 p = d.xz / (max(y, 0.0) + 0.25) * 1.3;
        vec2 w = vec2(fbm(p + uT * 0.07), fbm(p * 1.3 - uT * 0.05 + 3.1));
        float c = fbm(p * 1.1 + 1.8 * w + vec2(-uT * 0.05, uT * 0.03));
        float c2 = fbm(p * 2.7 - w + uT * 0.11);
        float dens = smoothstep(0.35, 0.8, c * 0.75 + c2 * 0.4);
        vec3 deep = vec3(0.012, 0.0, 0.0), blood = vec3(0.42, 0.01, 0.0), fire = vec3(1.5, 0.28, 0.02);
        float low = smoothstep(0.55, -0.02, y);                       // nearer the horizon: lit by the fire below
        vec3 col = mix(deep, blood, dens * (0.35 + 0.9 * low));
        col += fire * pow(dens, 3.0) * low * 0.8;                      // the bellies of the clouds glowing
        col = mix(col, vec3(1.3, 0.22, 0.02), smoothstep(0.12, -0.02, y)); // the band of fire light at the horizon
        if (y < -0.02) col = mix(vec3(1.4, 0.3, 0.03), vec3(0.6, 0.05, 0.0), smoothstep(-0.02, -0.4, y));
        float fl = uFlash * pow(max(dot(d, uFdir), 0.0), 6.0) * (0.6 + 0.8 * dens);
        col += vec3(2.4, 0.25, 0.12) * fl + vec3(0.25, 0.0, 0.0) * uFlash * dens;
        // the eclipsed sun: a black disc with a thin ring of red light, low over the pit
        float a = acos(clamp(dot(d, uSun), -1.0, 1.0));
        col += vec3(2.2, 0.18, 0.04) * exp(-pow((a - 0.062) / 0.006, 2.0)) + vec3(0.6, 0.03, 0.0) * exp(-max(0.0, a - 0.062) / 0.05) * step(0.062, a);
        col = mix(col, vec3(0.004, 0.0, 0.0), smoothstep(0.0615, 0.058, a));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(560, 48, 24), m);
  mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.layers.set(NOINK); root.add(mesh);
  return m;
};

const dotTex = () => ctex("abyssDot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
export const smokeTex = () => ctex("abyssSmoke", 256, 256, (g, r) => { for (let i = 0; i < 40; i++) { const x = 50 + r() * 156, y = 50 + r() * 156, rad = 24 + 60 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.2)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } });
export const flameTex = () => ctex("abyssFlame", 256, 256, (g, r) => {
  for (let i = 0; i < 26; i++) { const x = 70 + r() * 116, y = 60 + r() * 150, rad = 20 + 70 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.5)"); gr.addColorStop(0.5, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
});

/** particles that are a pure function of time: n points in a box, each rising (or falling) and wrapping */
const drift = (root: THREE.Object3D, n: number, min: V3, max: V3, cols: string[], size: number, speed: [number, number], additive: boolean, seed: number) => {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const base = new Float32Array(n * 3), vel = new Float32Array(n * 2), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base.set([min[0] + r() * (max[0] - min[0]), min[1] + r() * (max[1] - min[1]), min[2] + r() * (max[2] - min[2])], i * 3);
    vel.set([speed[0] + r() * (speed[1] - speed[0]), r() * 6.28], i * 2);
    const c = new THREE.Color(cols[i % cols.length]).multiplyScalar(additive ? 1.5 + 2.5 * r() : 0.6 + 0.4 * r()); col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex(), size, vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: additive ? 1 : 0.75 }));
  pts.layers.set(NOINK); pts.frustumCulled = false; root.add(pts);
  const H = max[1] - min[1];
  return { pts, update: (t: number) => {
    for (let i = 0; i < n; i++) {
      const v = vel[i * 2], ph = vel[i * 2 + 1];
      let y = base[i * 3 + 1] - min[1] + v * t; y = ((y % H) + H) % H;
      pos[i * 3] = base[i * 3] + 0.8 * Math.sin(t * 0.9 + ph) + 0.15 * v * t * 0.2; pos[i * 3 + 1] = min[1] + y; pos[i * 3 + 2] = base[i * 3 + 2] + 0.8 * Math.cos(t * 0.7 + ph);
    }
    geo.attributes.position.needsUpdate = true;
  } };
};

export const buildAbyss = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  let s = 77; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const fire = fireOcean(root), sky = hellSky(root);
  // ---- the cliff: a black mass with a broken, jagged edge along x = 0, rubble on top, ribs down its face ----
  const rock = mat("#3a1814"), rockD = mat("#24100e");
  box(root, [-90, -140, -70], [-1.2, 0, 70], rock);
  for (let z = -40; z < 40; z += 1.1 + r() * 1.4) {             // the jagged lip: broken slabs sticking out past the edge
    if (Math.abs(z) < 0.9) continue;                            // the bridge's foot
    const out = 0.2 + 1.6 * r(), h = 0.8 + 3.5 * r(), w = 0.7 + 1.3 * r(), up = r() < 0.25 && Math.abs(z) > 2.5 ? 0.3 * r() : -0.15 * r();
    const b = box(root, [-1.4, -h, z], [-1.2 + out, up, z + w], r() < 0.5 ? rock : rockD); b.rotation.set((r() - 0.5) * 0.25, (r() - 0.5) * 0.4, (r() - 0.5) * 0.2);
  }
  for (let i = 0; i < 26; i++) {                                // ribs and outcrops down the cliff face (seen from below)
    const z = -45 + 90 * r(), y = -8 - 110 * r(), out = 1 + 4 * r();
    const b = box(root, [-2, y - 6 - 10 * r(), z], [-1 + out, y, z + 1.5 + 3 * r()], rockD); b.rotation.set((r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3);
  }
  for (let i = 0; i < 70; i++) {                                // rubble and boulders on the top (away from where people stand)
    const x = -3 - 60 * r(), z = -40 + 80 * r(); if (x > -16 && Math.abs(z) < 7) continue;
    const sz = 0.2 + (x < -20 ? 3 : 0.8) * r() ** 2;
    const b = box(root, [x, -0.1, z], [x + sz * (1 + r()), sz * (0.6 + r()), z + sz * (1 + r())], r() < 0.5 ? rock : rockD); b.rotation.y = r() * 3;
  }
  for (const [x, z, h] of [[-26, -18, 9], [-34, 12, 14], [-22, 22, 7], [-48, -6, 18], [-40, 30, 11]] as [number, number, number][]) {   // spires far back
    const b = box(root, [x - 1.5, 0, z - 1.5], [x + 1.5, h, z + 1.5], rockD); b.rotation.set(0.08 * (r() - 0.5), r() * 3, 0.1 * (r() - 0.5));
  }
  // ---- the bridge: a burning line of light (a thin white-hot core, a glowing halo ribbon) with its foot in the rock ----
  const N = 92, L = ABYSS.BRIDGE_LEN, core = new THREE.Group(); root.add(core);
  const coreM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.8) });
  const edgeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.35, 0.04) });
  for (let i = 0; i < N; i++) {
    const x0 = (i / N) * L, x1 = ((i + 1) / N) * L, y0 = ABYSS.Y(x0), y1 = ABYSS.Y(x1), len = Math.hypot(x1 - x0, y1 - y0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.05, ABYSS.BRIDGE_W), coreM);
    seg.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.025, 0); seg.rotation.z = Math.atan2(y1 - y0, x1 - x0); seg.layers.set(NOINK); core.add(seg);
    const keel = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.09, ABYSS.BRIDGE_W * 0.5), edgeM);   // a darker red-hot keel under it
    keel.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.09, 0); keel.rotation.z = seg.rotation.z; keel.layers.set(NOINK); core.add(keel);
  }
  box(root, [-3.5, -1.2, -0.7], [0.4, 0.05, 0.7], rockD);         // the bridge's foot: a rough stone block at the edge
  const haloM = new THREE.MeshBasicMaterial({ map: dotTex(), color: new THREE.Color(1.6, 0.45, 0.06), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.6, 1, 1), haloM); halo.position.set(L / 2, -0.05, 0); halo.layers.set(NOINK); root.add(halo);
  const halo2 = halo.clone(); halo2.rotation.x = Math.PI / 2; root.add(halo2);
  // sparks dripping off the bridge (fall, wrap), embers rising everywhere, ash drifting down, dark smoke over the pit
  const sparks = drift(root, 700, [0, -40, -0.1], [160, 0, 0.1], ["#ffd27a", "#ff8a2a", "#ffffff"], 0.09, [-9, -4], true, 5);
  const embers = drift(root, 3200, [-40, -70, -45], [140, 30, 45], ["#ff5a10", "#ff9a2a", "#ffd060", "#ff2a0a"], 0.16, [1.2, 4.5], true, 9);
  const embersNear = drift(root, 900, [-14, -6, -8], [40, 8, 8], ["#ff6a18", "#ffb040", "#ff3a0a"], 0.07, [0.8, 2.6], true, 13);
  const ash = drift(root, 2600, [-20, -10, -14], [60, 18, 14], ["#3a3432", "#1e1a1a", "#5a504c", "#ff6a20"], 0.075, [-1.1, -0.35], false, 17);
  const smk = smokeTex(), smoke: { s: THREE.Sprite; x: number; y: number; z: number; v: number; k: number }[] = [];
  for (let i = 0; i < 90; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smk, color: new THREE.Color(r() < 0.5 ? "#140404" : "#2a0806"), transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    sp.layers.set(NOINK); root.add(sp);
    smoke.push({ s: sp, x: -30 + 220 * r(), y: -88 + 100 * r() ** 1.6, z: -80 + 160 * r(), v: 0.6 + 1.6 * r(), k: 14 + 34 * r() });
  }
  // the eruption: a column of white-yellow fire climbing out of the pit (sprites), lit flame tongues, a huge light
  const fl = flameTex(), column: { s: THREE.Sprite; h: number; w: number; ph: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, color: new THREE.Color(i % 5 ? "#ff4a08" : "#ffb040").multiplyScalar(i % 5 ? 1.0 : 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.layers.set(NOINK); sp.visible = false; root.add(sp); column.push({ s: sp, h: r(), w: 0.6 + 0.8 * r(), ph: r() * 6.28 });
  }
  const eruptL = new THREE.PointLight("#ffc060", 0, 260, 1.2); eruptL.position.set(ABYSS.ERUPT[0], -20, ABYSS.ERUPT[2]); root.add(eruptL);
  // ---- nature (no beings, only fire, rock, smoke): volcanoes on the horizon, fire tornadoes, geysers, smoke columns,
  //      glowing cracks in the cliff, smoke pouring over the edge, chains hanging into the dark, cracks in the bridge ----
  const volc = [[400, -300, 70, 0], [480, 150, 55, 1], [330, 380, 60, 2]].map(([x, z, h, i]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * 2.4, h, 18, 1, true), mat("#1c0c0a")); cone.position.set(x, ABYSS.FIRE_Y + h / 2, z); root.add(cone);
    const crater = new THREE.Mesh(new THREE.SphereGeometry(h * 0.16, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.0, 0.2) })); crater.position.set(x, ABYSS.FIRE_Y + h - 2, z); crater.layers.set(NOINK); root.add(crater);
    const jets = Array.from({ length: 14 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, color: new THREE.Color(j % 3 ? "#ff5a10" : "#ffc060").multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); root.add(sp); return sp; });
    const clouds = Array.from({ length: 10 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smk, color: new THREE.Color("#3a0804"), transparent: true, opacity: 0.9, depthWrite: false, fog: false })); sp.layers.set(NOINK); root.add(sp); return sp; });
    return { x, z, top: ABYSS.FIRE_Y + h, h, i, jets, clouds };
  });
  const tornadoes = [[70, -42], [150, 36]].map(([x, z]) => ({ x, z, s: Array.from({ length: 44 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, color: new THREE.Color(j % 4 ? "#ff4a08" : "#ffb040").multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); root.add(sp); return sp; }) }));
  const geysers = [[13, 6, 0], [31, -7, 3.1], [54, 5, 6.3], [90, -6, 1.7]].map(([x, z, ph]) => ({ x, z, ph, s: Array.from({ length: 18 }, (_, j) => { const steam = j % 3 === 0; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steam ? smk : fl, color: new THREE.Color(steam ? "#8a6a60" : j % 2 ? "#ff6a10" : "#ffd070").multiplyScalar(steam ? 1 : 1.5), transparent: true, depthWrite: false, blending: steam ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); root.add(sp); return sp; }) }));
  const columns = [[220, -180], [300, 160], [180, 240], [380, -30]].map(([x, z]) => Array.from({ length: 12 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smk, color: new THREE.Color(j < 3 ? "#4a0c06" : "#160606"), transparent: true, opacity: 0.85, depthWrite: false, fog: false })); sp.layers.set(NOINK); root.add(sp); return { sp, x, z, j }; })).flat();
  const crackM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.08) });
  for (let c = 0; c < 9; c++) {                                   // glowing cracks splitting the cliff top (lava showing through)
    let x = -2.2 - 2 * r(), z = -12 + 24 * r(); if (Math.abs(z) < 2.5) z += 5;
    for (let k = 0; k < 6; k++) { const nx = x - 0.8 - 1.4 * r(), nz = z + (r() - 0.5) * 1.6, len = Math.hypot(nx - x, nz - z);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.05 + 0.04 * r()), crackM); seg.position.set((x + nx) / 2, 0.004, (z + nz) / 2); seg.rotation.y = -Math.atan2(nz - z, nx - x); seg.layers.set(NOINK); root.add(seg); x = nx; z = nz; }
  }
  const pour = Array.from({ length: 60 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smk, color: new THREE.Color(j % 2 ? "#2a0a06" : "#3e120a"), transparent: true, opacity: 0.6, depthWrite: false, fog: false })); sp.layers.set(NOINK); root.add(sp); return { sp, z: (j % 2 ? 1 : -1) * (3 + 30 * ((j * 0.618) % 1)), ph: (j * 0.37) % 1 }; });
  const linkG = new THREE.TorusGeometry(0.14, 0.035, 6, 12), ironM = mat("#2a1b18");
  const chains = [[5.5, 0.35], [12.5, -0.3], [22, 0.3], [37, -0.35], [61, 0.3], [95, -0.3]].map(([x, z], i) => {   // chains hanging from the bridge into the dark
    const g = new THREE.Group(); g.position.set(x, ABYSS.Y(x) - 0.1, z); root.add(g);
    const n = 70 + 30 * (i % 3);
    for (let k = 0; k < n; k++) { const l = new THREE.Mesh(linkG, ironM); l.position.y = -0.22 * k; l.rotation.y = k % 2 ? Math.PI / 2 : 0; l.userData.noCollide = true; g.add(l); }
    return { g, ph: i * 1.7 };
  });
  const gapM = new THREE.MeshBasicMaterial({ color: "#1a0402" });
  for (let i = 0; i < 26; i++) { const x = 3 + 1.9 * i + 2.5 * r(); const gap = new THREE.Mesh(new THREE.BoxGeometry(0.02 + 0.03 * r(), 0.055, ABYSS.BRIDGE_W + 0.004), gapM); gap.position.set(x, ABYSS.Y(x) - 0.024, 0); gap.rotation.y = (r() - 0.5) * 0.6; gap.layers.set(NOINK); root.add(gap); }   // cracks in the line
  // ---- light: the fire's glow from below (the shadow-casting "sun" points up from the pit), red point lights ----
  const s2 = sun(root, [0, 0, 0], 30); s2.setFrom([0.55, -1.0, 0.25]); s2.light.color.set("#ff4a12");
  const glows = [[2, -6, 1.5], [-6, -10, -6], [14, -10, 3], [30, -12, -3], [55, -12, 2], [90, -14, -2]].map(([x, y, z], i) => {
    const l = new THREE.PointLight(i < 2 ? "#ff3a0a" : "#ff6a1a", 0, 45, 1.3); l.position.set(x, y, z); root.add(l); return l;
  });
  const flash = new THREE.PointLight("#ff2a2a", 0, 400, 1.0); flash.position.set(60, 120, -120); root.add(flash);
  const apply = (state: string, t: number): SetLook => {
    const [, e0, l0, g0, n0] = state.split(":"), near = n0 === "1", erupt = Number(e0 ?? 0) || 0, light = Number(l0 ?? 0) || 0, glow = g0 === undefined ? 1 : Number(g0);
    const flick = 0.82 + 0.1 * Math.sin(t * 13.1) + 0.08 * Math.sin(t * 7.3 + 1) + 0.06 * Math.sin(t * 23.7 + 2);
    fire.uniforms.uT.value = t; fire.uniforms.uGlow.value = 0.9 + 0.1 * flick + 0.6 * erupt; fire.uniforms.uErupt.value = erupt;
    sky.uniforms.uT.value = t; sky.uniforms.uFlash.value = light;
    coreM.color.setRGB(3.2 * flick, 2.0 * flick, 0.8 * flick); edgeM.color.setRGB(1.8 * flick, 0.35, 0.04);
    haloM.color.setRGB(1.6 * flick, 0.45 * flick, 0.06); halo.visible = halo2.visible = !near;
    sparks.update(t); embers.update(t); embersNear.update(t); ash.update(t);
    for (const sm of smoke) { const x = sm.x + ((sm.v * t * 2.2) % 220); sm.s.position.set(x > 190 ? x - 220 : x, sm.y + 1.5 * Math.sin(t * 0.3 + sm.k), sm.z); sm.s.scale.setScalar(sm.k * (1 + 0.08 * Math.sin(t * 0.5 + sm.v))); sm.s.material.rotation = 0.1 * t * (sm.v - 1.2); }
    const ek = Math.max(0, Math.min(1, erupt));
    column.forEach((c, i) => {
      const life = (c.h + t * 0.55) % 1, hgt = ABYSS.FIRE_Y + (8 + 150 * ek) * (i / column.length + 0.15 * life);
      c.s.visible = ek > 0.01; c.s.position.set(ABYSS.ERUPT[0] + 9 * Math.sin(c.ph + t * 1.7) * (0.4 + i / column.length), hgt, ABYSS.ERUPT[2] + 7 * Math.cos(c.ph + t * 1.3));
      c.s.scale.setScalar((26 + 40 * c.w) * (0.4 + 0.9 * ek) * (1 - 0.35 * i / column.length)); c.s.material.opacity = Math.min(0.6, ek) * (0.45 + 0.3 * Math.sin(c.ph + t * 5));
      c.s.material.rotation = c.ph + t * 0.4;
    });
    eruptL.intensity = 2200 * ek * flick;
    for (const v of volc) {                                       // lava fountains and ash clouds lit red from inside
      v.jets.forEach((sp, j) => { const life = (t * 0.45 + j / v.jets.length + v.i * 0.21) % 1, a = j * 2.4 + v.i;
        sp.position.set(v.x + Math.cos(a) * v.h * 0.25 * life, v.top + v.h * 0.6 * Math.sin(Math.PI * life) * (0.6 + 0.4 * ((j * 7) % 3) / 2), v.z + Math.sin(a) * v.h * 0.25 * life);
        sp.scale.setScalar(v.h * 0.18 * (1 - 0.5 * life)); sp.material.opacity = 0.8 * Math.sin(Math.PI * life); });
      v.clouds.forEach((sp, j) => { const life = (t * 0.03 + j / v.clouds.length) % 1; sp.position.set(v.x + 20 * Math.sin(j + t * 0.05), v.top + 30 + 160 * life, v.z + 15 * Math.cos(j)); sp.scale.setScalar(v.h * (0.6 + 1.4 * life)); sp.material.opacity = 0.85 * Math.min(1, 4 * (1 - life)); });
    }
    for (const tw of tornadoes) tw.s.forEach((sp, j) => {        // fire tornadoes twisting up out of the pit
      const u = j / tw.s.length, a = t * 3.2 + j * 0.55, rad = 2 + 10 * u * u;
      sp.position.set(tw.x + rad * Math.cos(a) + 6 * Math.sin(t * 0.4 + u * 3), ABYSS.FIRE_Y + 125 * u, tw.z + rad * Math.sin(a)); sp.scale.setScalar(7 + 9 * u); sp.material.opacity = 0.75 * (1 - 0.5 * u); sp.material.rotation = a;
    });
    for (const gy of geysers) {                                  // geysers of fire and steam bursting up beside the bridge
      const cyc = (t + gy.ph * 3) % 9.5, k = cyc < 2.2 ? Math.sin(Math.PI * cyc / 2.2) : 0;
      gy.s.forEach((sp, j) => { const u = ((cyc * 1.3 + j / gy.s.length) % 1); sp.visible = k > 0.02; sp.position.set(gy.x + 1.2 * Math.sin(j * 2.1 + t * 4), ABYSS.FIRE_Y + (95 + 18) * u * k, gy.z + 1.2 * Math.cos(j * 1.7));
        sp.scale.setScalar((3 + 6 * u) * (0.5 + k)); sp.material.opacity = k * (1 - u); });
    }
    for (const c of columns) { const life = (t * 0.02 + c.j / 12) % 1; c.sp.position.set(c.x + 10 * Math.sin(c.j + t * 0.1), ABYSS.FIRE_Y + 60 + 600 * life, c.z); c.sp.scale.setScalar(60 + 140 * life); c.sp.material.opacity = 0.8 * Math.min(1, 5 * (1 - life)); }
    for (const pr of pour) { const life = (t * 0.18 + pr.ph) % 1; pr.sp.position.set(0.3 + 3 * Math.sin(Math.PI * Math.min(life, 0.5)), 0.6 - 60 * life * life, pr.z); pr.sp.scale.setScalar(4 + 8 * life); pr.sp.material.opacity = 0.55 * Math.sin(Math.PI * life); }
    for (const ch of chains) { ch.g.rotation.z = 0.05 * Math.sin(t * 0.7 + ch.ph); ch.g.rotation.x = 0.04 * Math.sin(t * 0.5 + ch.ph * 1.3); }
    glows.forEach((l, i) => { l.intensity = (i < 2 ? 520 : 900) * glow * (0.85 + 0.15 * Math.sin(t * (9 + i) + i)); });
    flash.intensity = 9000 * light;
    s2.light.intensity = (1.2 + 1.4 * ek) * glow * flick;
    return { lit: [1.05 + 0.6 * ek, 0.2 + 0.25 * ek, 0.03 + 0.05 * ek], shade: [0.07, 0.006, 0.004], lift: [0.012, 0.0, 0.0], sat: 1.15,
      charTint: [1.0, 0.36, 0.26], cardGain: 0.34 + 0.25 * ek + 0.35 * light, cardPointK: 0.45, pointK: 1.4, grade: GRADE_HELL, fog: ["#2a0300", 40, 520] };
  };
  return { id: "abyss", root, offset, apply };
};
