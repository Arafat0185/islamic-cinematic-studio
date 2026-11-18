// The night courtyard: a stone floor with an 8-point star tile pattern (painted in code), a limestone back wall with
// three pointed arches opening onto a dark gallery, and a deep indigo sky with stars. Units are metres; the
// Traveller stands near the origin and the camera looks toward -z. Everything here is built once.
import * as THREE from "three";
import { ctex, rep, jit } from "../../draw/paint";
import { twoTone, untone } from "../../render/shade";
import { NOINK } from "../../render/ink";
import { NIGHT, PALETTE, moonDir } from "./look";

// ---- layout ----
export const WALL_Z = -3.5;      // centre of the arcade wall
const WALL_T = 0.5;              // wall thickness
const WALL_H = 4.6;              // wall height
const WALL_W = 16;               // wide enough to run past both frame edges
export const ARCH_X = [-1.85, 0, 1.85];
const ARCH_W = 1.4;              // opening width
const SPRING = 1.9;              // height where the arch curve starts
const RISE = 1.1;                // spring to apex
export const APEX = SPRING + RISE;
const GALLERY_Z = -6.4;          // back wall of the gallery behind the arches
const GALLERY_H = 3.7;           // gallery ceiling
const TILE = 0.75;               // floor tile size (one star per tile)

type P2 = [number, number];

// ---- textures ----
/** One floor tile: a lapis 8-point star in the centre and quarter stars in the corners, so the limestone left between
 *  them forms the classic cross shapes. Thin grout lines, a little speckle. Repeats seamlessly. */
const starTile = () => ctex("starTile", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#bfae8f"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2200; i++) { // stone speckle
    g.fillStyle = `rgba(${r() < 0.5 ? "90,74,56" : "250,240,220"},${0.05 + 0.08 * r()})`;
    g.fillRect(r() * S, r() * S, 2 + 3 * r(), 2 + 3 * r());
  }
  const star = (cx: number, cy: number, R: number): P2[] => {
    const pts: P2[] = [], ri = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8 - Math.PI / 2, rr = k % 2 ? ri : R;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return pts;
  };
  const path = (pts: P2[]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const R = 0.345 * S;
  for (const [cx, cy] of [[S / 2, S / 2], [0, 0], [S, 0], [0, S], [S, S]] as P2[]) {
    path(star(cx, cy, R)); g.fillStyle = "#33456a"; g.fill();
    g.lineWidth = 12; g.strokeStyle = "#5c5244"; g.stroke();
    path(star(cx, cy, R * 0.42)); g.fillStyle = "#b9a684"; g.fill(); // limestone inlay in the centre
    g.lineWidth = 6; g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.08, 0, Math.PI * 2); g.fillStyle = "#b8923f"; g.fill();
  }
  g.lineWidth = 6; g.strokeStyle = "#7a6c58"; g.strokeRect(0, 0, S, S); // tile joints
});

/** limestone blocks in courses, 2 m x 2 m of wall per texture repeat */
const blocks = () => ctex("limestoneBlocks", 1024, 1024, (g, r) => {
  const S = 1024, course = S / 5; // 0.4 m courses
  g.fillStyle = "#9a8c74"; g.fillRect(0, 0, S, S); // mortar
  for (let row = 0; row < 5; row++) {
    let x = row % 2 ? -course * 0.9 : 0;
    while (x < S) {
      const w = course * (1.4 + 1.2 * r());
      const col = jit(r, PALETTE.limestone, 0.06, 4, 0.12);
      g.fillStyle = col;
      // draw wrapped so the texture tiles horizontally
      for (const dx of [0, S]) g.fillRect(x + 3 - dx, row * course + 3, w - 6, course - 6);
      x += w;
    }
  }
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "80,66,50" : "255,248,230"},${0.04 + 0.06 * r()})`;
    g.fillRect(r() * S, r() * S, 2 + 3 * r(), 2 + 3 * r());
  }
});

// ---- geometry ----
/** outline of one pointed (two-centred) arch opening, centred on x = cx: up the left side, over the apex, down the
 *  right side (floor to floor) */
const archPts = (cx: number): P2[] => {
  const h = ARCH_W / 2, rad = (h * h + RISE * RISE) / (2 * h), n = 18, pts: P2[] = [[cx - h, 0], [cx - h, SPRING]];
  // left arc: centred on the right side, from the left spring point up to the apex
  const cL = cx - h + rad, aL0 = Math.PI, aL1 = Math.PI - Math.asin(RISE / rad);
  for (let i = 1; i <= n; i++) { const a = aL0 + ((aL1 - aL0) * i) / n; pts.push([cL + rad * Math.cos(a), SPRING + rad * Math.sin(a)]); }
  // right arc: centred on the left side, from the apex down to the right spring point
  const cR = cx + h - rad, aR0 = Math.asin(RISE / rad);
  for (let i = 1; i <= n; i++) { const a = aR0 * (1 - i / n); pts.push([cR + rad * Math.cos(a), SPRING + rad * Math.sin(a)]); }
  pts.push([cx + h, 0]);
  return pts;
};

const stoneMat = (tex: THREE.Texture, tint = "#ffffff") =>
  twoTone(new THREE.MeshLambertMaterial({ map: tex, color: tint }));

export const buildCourtyard = () => {
  const root = new THREE.Group();

  // floor: one big plane, the star tile repeated every TILE metres
  const floorTex = rep(starTile(), 40 / TILE, 40 / TILE);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), stoneMat(floorTex, "#c4bcb0"));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 8; floor.receiveShadow = true;
  root.add(floor);

  // arcade wall: one outline with the three arches cut in from the floor, extruded to the wall's thickness
  const outline: P2[] = [[-WALL_W / 2, 0]];
  for (const x of ARCH_X) outline.push(...archPts(x));
  outline.push([WALL_W / 2, 0], [WALL_W / 2, WALL_H], [-WALL_W / 2, WALL_H]);
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  // three 0.175 bug: with bevelEnabled false, ExtrudeGeometry builds no front/back faces. A zero-size bevel builds
  // them and leaves the shape unchanged.
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: true, bevelThickness: 0, bevelSize: 0, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 });
  const wallTex = rep(blocks(), 0.5, 0.5); // UVs are in metres: one texture = 2 m
  const wall = new THREE.Mesh(wallGeo, stoneMat(wallTex));
  wall.position.z = WALL_Z - WALL_T / 2; wall.castShadow = true; wall.receiveShadow = true;
  root.add(wall);

  // cornice along the top and impost blocks where each arch springs
  const trim = stoneMat(rep(blocks(), 0.5, 0.5), "#e6dcc8");
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m);
  };
  box(WALL_W, 0.22, WALL_T + 0.24, 0, WALL_H + 0.11, WALL_Z);
  for (const x of ARCH_X) for (const s of [-1, 1]) box(0.26, 0.12, WALL_T + 0.1, x + s * (ARCH_W / 2 + 0.04), SPRING + 0.06, WALL_Z);

  // gallery behind the arches: back wall and ceiling, left in shadow (the lamp warms the near part)
  const gTex = rep(blocks(), 0.5, 0.5);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, GALLERY_H), stoneMat(gTex, "#6a6156"));
  back.position.set(0, GALLERY_H / 2, GALLERY_Z); back.receiveShadow = true;
  root.add(back);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.3, GALLERY_Z * -1 + WALL_Z - WALL_T / 2 + 0.2), stoneMat(gTex, "#4e483f"));
  ceil.position.set(0, GALLERY_H + 0.15, (GALLERY_Z + WALL_Z - WALL_T / 2) / 2); ceil.castShadow = true; ceil.receiveShadow = true;
  root.add(ceil);

  root.add(sky());

  // moonlight: directional light 0, the only shadow caster (render/shade.ts reads it as "the sun")
  const moon = new THREE.DirectionalLight("#ffffff", 1);
  moon.position.copy(moonDir().multiplyScalar(20)).add(new THREE.Vector3(0, 0, -1));
  moon.target.position.set(0, 0, -1);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 45;
  moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.02;
  root.add(moon, moon.target);

  return root;
};

/** sky dome: indigo gradient (top -> horizon) and a sprinkle of small stars, unlit, never outlined */
const sky = () => {
  const top = untone(NIGHT.skyTop), hor = untone(NIGHT.skyHorizon);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Vector3(top.r, top.g, top.b) }, uHor: { value: new THREE.Vector3(hor.r, hor.g, hor.b) } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHor; varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.55, d.y));
        // stars: one candidate per cell of a (longitude, latitude) grid, most cells empty
        vec2 uv = vec2(atan(d.x, -d.z) * 160.0, d.y * 260.0);
        vec2 cell = floor(uv), f = fract(uv) - 0.5;
        float h = hash(cell);
        if (h > 0.985 && d.y > 0.05) {
          vec2 o = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
          float r = length(f - 0.6 * o);
          c += vec3(0.75, 0.8, 1.0) * (0.25 + 0.75 * hash(cell + 1.3)) * smoothstep(0.16, 0.0, r) * smoothstep(0.05, 0.3, d.y);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), mat);
  m.renderOrder = -1; m.frustumCulled = false; m.layers.set(NOINK);
  return m;
};
