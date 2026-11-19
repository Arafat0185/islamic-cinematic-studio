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
/** how far solid pieces are sunk into whatever they sit on. Faces that merely TOUCH another surface (a wall bottom on
 *  the floor, a cornice bottom on the wall top) lie in the same plane and fight (flicker), at least in the ink pass,
 *  which draws both sides of every face; sunk 2 cm, those faces are hidden inside solid stone. */
const SINK = 0.02;
const TILE = 1.5;                // floor tile size (one star per tile)

type P2 = [number, number];

// ---- textures ----
/** One floor tile: a lapis 8-point star in the centre and quarter stars in the corners, so the limestone left between
 *  them forms the classic cross shapes. 1024 x 1024 (a power of two, so mipmaps work everywhere).
 *  Anti-shimmer rules: every mark wraps across the edges (so the tile repeats with no seam line), no tile-joint lines,
 *  soft low-contrast speckle, and only moderate contrast between the stone colours. */
// colours: each 25 % closer to the field stone than v1 (lower contrast = calmer floor, less shimmer)
const starTile = () => ctex("starTile3", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#b8a98c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) { // faint stone speckle, drawn wrapped
    g.fillStyle = `rgba(${r() < 0.5 ? "110,94,74" : "235,225,205"},${0.03 + 0.04 * r()})`;
    const x = r() * S, y = r() * S, w = 3 + 4 * r(), h = 3 + 4 * r();
    for (const dx of [0, -S]) for (const dy of [0, -S]) g.fillRect(x + dx, y + dy, w, h);
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
  // the centre star plus the four corner stars (each a quarter on this tile; they complete across the edges)
  for (const [cx, cy] of [[S / 2, S / 2], [0, 0], [S, 0], [0, S], [S, S]] as P2[]) {
    path(star(cx, cy, R)); g.fillStyle = "#6e758a"; g.fill();
    g.lineWidth = 10; g.strokeStyle = "#817561"; g.stroke();
    path(star(cx, cy, R * 0.42)); g.fillStyle = "#b2a286"; g.fill(); // limestone inlay in the centre
    g.lineWidth = 6; g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.08, 0, Math.PI * 2); g.fillStyle = "#ac9360"; g.fill();
  }
});

/** Limestone blocks in courses, 2 m x 2 m of wall per texture repeat, 2048 x 2048 (1024 texels per metre, a power of
 *  two). Anti-flicker rules: joints are 2.4 cm wide (about 4 px on screen at 1080 x 1920 from the camera's farthest
 *  point, more as it pushes in) with soft blurred edges, so no joint is ever thinner than a pixel; every row's block
 *  widths add up exactly to the texture width, so the joints line up across the wrap (no seams). */
const blocks = () => ctex("limestoneBlocks2", 2048, 2048, (g, r) => {
  const S = 2048, rows = 5, course = S / rows; // 0.4 m courses
  const J = 24;                                 // joint width in texels (2.4 cm)
  g.fillStyle = "#968870"; g.fillRect(0, 0, S, S); // mortar
  g.filter = "blur(3px)";                          // soft block edges (Chrome canvas filter)
  for (let row = 0; row < rows; row++) {
    const ws: number[] = [];
    let sum = 0;
    while (sum < S) { const w = course * (1.4 + 1.2 * r()); ws.push(w); sum += w; }
    const k = S / sum, shift = row % 2 ? course * 0.9 : 0;
    let x = shift;
    for (const w0 of ws) {
      const w = w0 * k;
      g.fillStyle = jit(r, PALETTE.limestone, 0.06, 4, 0.12);
      for (const dx of [0, -S]) g.fillRect(x + dx + J / 2, row * course + J / 2, w - J, course - J); // drawn wrapped
      x += w;
    }
  }
  g.filter = "none";
  for (let i = 0; i < 5000; i++) { // faint speckle, drawn wrapped
    g.fillStyle = `rgba(${r() < 0.5 ? "80,66,50" : "255,248,230"},${0.03 + 0.05 * r()})`;
    const x = r() * S, y = r() * S, w = 4 + 6 * r(), h = 4 + 6 * r();
    for (const dx of [0, -S]) for (const dy of [0, -S]) g.fillRect(x + dx, y + dy, w, h);
  }
});

/** a repeat of the block texture with the anti-shimmer filtering: mipmaps, trilinear, maximum anisotropy */
const blockTex = () => {
  const t = rep(blocks(), 0.5, 0.5); // UVs are in metres: one texture = 2 m
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 16; // three clamps this to what the GPU supports
  return t;
};

// ---- geometry ----
/** outline of one pointed (two-centred) arch opening, centred on x = cx: up the left side, over the apex, down the
 *  right side (floor to floor) */
const archPts = (cx: number): P2[] => {
  const h = ARCH_W / 2, rad = (h * h + RISE * RISE) / (2 * h), n = 18, pts: P2[] = [[cx - h, -SINK], [cx - h, SPRING]];
  // left arc: centred on the right side, from the left spring point up to the apex
  const cL = cx - h + rad, aL0 = Math.PI, aL1 = Math.PI - Math.asin(RISE / rad);
  for (let i = 1; i <= n; i++) { const a = aL0 + ((aL1 - aL0) * i) / n; pts.push([cL + rad * Math.cos(a), SPRING + rad * Math.sin(a)]); }
  // right arc: centred on the left side, from the apex down to the right spring point
  const cR = cx + h - rad, aR0 = Math.asin(RISE / rad);
  for (let i = 1; i <= n; i++) { const a = aR0 * (1 - i / n); pts.push([cR + rad * Math.cos(a), SPRING + rad * Math.sin(a)]); }
  pts.push([cx + h, -SINK]);
  return pts;
};

const stoneMat = (tex: THREE.Texture, tint = "#ffffff") =>
  twoTone(new THREE.MeshLambertMaterial({ map: tex, color: tint }));

/** options (all optional; the defaults build exactly the original test courtyard) */
export type CourtyardOpts = {
  /** centres of the arches along the back wall */
  archX?: number[];
  /** world direction the moonlight comes FROM (default: NIGHT.moonFrom) */
  moonFrom?: [number, number, number];
  /** more and brighter stars */
  denseStars?: boolean;
};

export const buildCourtyard = (opts: CourtyardOpts = {}) => {
  const archX = opts.archX ?? ARCH_X;
  const root = new THREE.Group();

  // floor: one big plane, the star tile repeated every TILE metres
  const floorTex = rep(starTile(), 40 / TILE, 40 / TILE);
  // mipmaps + trilinear + maximum anisotropic filtering (three clamps 16 to what the GPU supports): keeps the
  // far floor from shimmering as the camera moves
  floorTex.generateMipmaps = true; floorTex.minFilter = THREE.LinearMipmapLinearFilter; floorTex.magFilter = THREE.LinearFilter;
  floorTex.anisotropy = 16;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), stoneMat(floorTex, NIGHT.floorTint));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 8; floor.receiveShadow = true;
  root.add(floor);

  // arcade wall: one outline with the three arches cut in from the floor, extruded to the wall's thickness
  const outline: P2[] = [[-WALL_W / 2, -SINK]];
  for (const x of archX) outline.push(...archPts(x));
  outline.push([WALL_W / 2, -SINK], [WALL_W / 2, WALL_H], [-WALL_W / 2, WALL_H]);
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  // three 0.175 bug: with bevelEnabled false, ExtrudeGeometry builds no front/back faces. A zero-size bevel builds
  // them and leaves the shape unchanged.
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: true, bevelThickness: 0, bevelSize: 0, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 });
  const wallTex = blockTex();
  const wall = new THREE.Mesh(wallGeo, stoneMat(wallTex, NIGHT.wallTint));
  wall.position.z = WALL_Z - WALL_T / 2; wall.castShadow = true; wall.receiveShadow = true;
  root.add(wall);

  // cornice along the top and impost blocks where each arch springs
  // plain stone, no block texture: box UVs run 0..1 per face, so the texture would stretch over the 16 m cornice
  const trim = twoTone(new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.limestone).multiply(new THREE.Color(NIGHT.wallTint)) }));
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m);
  };
  // cornice: its bottom is sunk SINK into the wall top, so the two faces never share a plane
  box(WALL_W, 0.22 + SINK, WALL_T + 0.24, 0, WALL_H + (0.22 - SINK) / 2, WALL_Z);
  // impost (ledge) blocks: ONE solid block per pillar, from 9 cm inside the opening on one side to 9 cm inside the
  // opening on the other, 6 cm proud of both wall faces. (Two blocks per pillar left a narrow notch and sliver faces
  // between them that flickered.) None of its faces lies in the plane of a wall face.
  const IMP_H = 0.14, IMP_OVER = 0.09, IMP_PROUD = 0.06, h2 = ARCH_W / 2;
  const impost = (x0: number, x1: number) => box(x1 - x0, IMP_H, WALL_T + 2 * IMP_PROUD, (x0 + x1) / 2, SPRING + IMP_H / 2, WALL_Z);
  for (let i = 0; i + 1 < archX.length; i++) impost(archX[i] + h2 - IMP_OVER, archX[i + 1] - h2 + IMP_OVER);
  impost(archX[0] - h2 - 0.3, archX[0] - h2 + IMP_OVER);                                         // outer left pier
  impost(archX[archX.length - 1] + h2 - IMP_OVER, archX[archX.length - 1] + h2 + 0.3);          // outer right pier

  // gallery behind the arches: back wall and ceiling, left in shadow (the lamp warms the near part)
  const gTex = blockTex();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, GALLERY_H), stoneMat(gTex, "#6a6156"));
  back.position.set(0, GALLERY_H / 2, GALLERY_Z); back.receiveShadow = true;
  root.add(back);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.3, GALLERY_Z * -1 + WALL_Z - WALL_T / 2 + 0.2), stoneMat(gTex, "#4e483f"));
  ceil.position.set(0, GALLERY_H + 0.15, (GALLERY_Z + WALL_Z - WALL_T / 2) / 2); ceil.castShadow = true; ceil.receiveShadow = true;
  root.add(ceil);

  root.add(sky(!!opts.denseStars));

  // moonlight: directional light 0, the only shadow caster (render/shade.ts reads it as "the sun")
  const moon = new THREE.DirectionalLight("#ffffff", 1);
  moon.position.copy((opts.moonFrom ? new THREE.Vector3(...opts.moonFrom).normalize() : moonDir()).multiplyScalar(20)).add(new THREE.Vector3(0, 0, -1));
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
const sky = (dense = false) => {
  const top = untone(NIGHT.skyTop), hor = untone(NIGHT.skyHorizon);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Vector3(top.r, top.g, top.b) }, uHor: { value: new THREE.Vector3(hor.r, hor.g, hor.b) },
      uStarCut: { value: dense ? 0.978 : 0.993 }, uStarGain: { value: dense ? 0.75 : 0.55 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHor; uniform float uStarCut; uniform float uStarGain; varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.55, d.y));
        // stars: faint and sparse, one candidate per cell of a (longitude, latitude) grid, ~1 cell in 140 lit.
        // Fixed in the sky (no twinkle): the same star is the same brightness on every frame.
        vec2 uv = vec2(atan(d.x, -d.z) * 70.0, d.y * 110.0);
        vec2 cell = floor(uv), f = fract(uv) - 0.5;
        float h = hash(cell);
        if (h > uStarCut && d.y > 0.06) {
          vec2 o = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
          float r = length(f - 0.5 * o);
          float b = 0.35 + 0.65 * hash(cell + 1.3);
          c += vec3(0.8, 0.84, 1.0) * b * uStarGain * smoothstep(0.09, 0.0, r) * smoothstep(0.06, 0.3, d.y);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), mat);
  m.renderOrder = -1; m.frustumCulled = false; m.layers.set(NOINK);
  return m;
};
