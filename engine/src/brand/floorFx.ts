// FloorFx: one overlay on the courtyard floor that draws the brand's floor effects, computed from the star-tile
// pattern itself (exact at any resolution, lined up with the painted tiles):
//   grooves  light running outward along the grout lines of the 8-point star tiles (the signature opening)
//   mark     a large 8-point star mark tracing itself on the floor (the signature ending)
//   gaps     selected tile stars start EMPTY (dark), then fill with a warm gold flare and settle back to tile (mercy)
// The floor tiles (scenes/courtyard-test/courtyard.ts): 1.5 m tiles on a 40 x 40 m plane centred at z = 8, the tiling
// starting at x = -20, z = 28. Each tile has an 8-point star at its centre and quarter stars at its corners (outer
// radius 0.345 of a tile, an inlay star at 0.42 of that). An 8-point star {8/2} = a diamond united with a square.
import * as THREE from "three";
import { NOINK } from "../render/ink";

export const TILE = 1.5;
const ORIGIN = new THREE.Vector2(-20, 28);
export const STAR_R = 0.345; // in tiles

/** world (x, z) of the tile-star centres (tile centres and tile corners) within `radius` m of (cx, cz) */
export const tileStars = (cx: number, cz: number, radius: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) for (const h of [0, 0.5]) {
    const x = ORIGIN.x + (Math.floor((cx - ORIGIN.x) / TILE) + i + h) * TILE;
    const z = ORIGIN.y - (Math.floor((ORIGIN.y - cz) / TILE) + j + h) * TILE;
    if (Math.hypot(x - cx, z - cz) <= radius) out.push([x, z]);
  }
  return out;
};

export const MAX_GAPS = 16;

const VERT = /* glsl */ `
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `
uniform vec2 uOrigin; uniform float uTile; uniform float uR;
uniform vec3 uWarm;
uniform vec2 uGCenter; uniform float uGRadius; uniform float uGWidth; uniform float uGTrail; uniform float uGInt;
uniform vec2 uMCenter; uniform float uMR; uniform float uMProg; uniform float uMInt;
uniform vec3 uGap[${MAX_GAPS}]; uniform int uGapN;
varying vec3 vW;

// signed distance to an 8-point star {8/2} of outer radius R (diamond U square), in the same units as p
float starD(vec2 p, float R) {
  float diamond = (abs(p.x) + abs(p.y) - R) * 0.70710678;
  float square = max(abs(p.x), abs(p.y)) - R * 0.70710678;
  return min(diamond, square);
}
float line(float d, float halfW) { float aa = max(fwidth(d), 1e-5); return 1.0 - smoothstep(halfW - aa, halfW + aa, abs(d)); }

void main() {
  vec2 w = vW.xz;
  vec3 col = vec3(0.0); float alpha = 0.0;
  // ---- grooves: the star outlines of this tile and its corners (tile units)
  vec2 tc = vec2((w.x - uOrigin.x) / uTile, (uOrigin.y - w.y) / uTile);
  vec2 f = fract(tc) - 0.5, c = f - sign(f) * 0.5;
  float d = min(min(abs(starD(f, uR)), abs(starD(c, uR))), min(abs(starD(f, uR * 0.42)), abs(starD(c, uR * 0.42))));
  float groove = line(d, 0.006);
  if (uGInt > 0.0) {
    float r = length(w - uGCenter);
    float front = exp(-pow((r - uGRadius) / uGWidth, 2.0));
    float trail = uGTrail * step(r, uGRadius) * exp(-(uGRadius - r) / 2.5);
    col += uWarm * groove * (front * 2.4 + trail) * uGInt;
  }
  // ---- the star mark: outer and inner star outlines traced clockwise from the top as uMProg goes 0 -> 1
  if (uMInt > 0.0) {
    vec2 p = w - uMCenter;
    float a = fract(atan(p.x, -p.y) / 6.2831853 + 1.0);          // 0 at the top (toward -z), clockwise from above
    float on = 1.0 - smoothstep(uMProg - 0.004, uMProg + 0.004, a);
    float m = max(line(starD(p, uMR), 0.035), 0.8 * line(starD(p, uMR * 0.62), 0.025));
    float fill = 0.12 * step(starD(p, uMR), 0.0) * smoothstep(0.85, 1.0, uMProg);
    col += uWarm * (m * on * 2.6 + fill) * uMInt;
  }
  // ---- gaps: empty (dark) until filled; filling = a gold flare in the star's shape, then back to the tile
  for (int i = 0; i < ${MAX_GAPS}; i++) {
    if (i >= uGapN) break;
    vec3 g = uGap[i];
    float inside = 1.0 - smoothstep(-0.004, 0.004, starD((w - g.xy) / uTile, uR));
    if (inside <= 0.0) continue;
    float s = g.z;
    float rim = line(starD((w - g.xy) / uTile, uR), 0.01);
    // empty: a near-black socket with a faint cool rim, so it reads as a missing piece (the tile stars are dark already)
    if (s < 0.0) { alpha = max(alpha, 0.92 * inside); col += vec3(0.012, 0.010, 0.016) * 0.92 * inside + vec3(0.25, 0.32, 0.55) * rim * 0.9; continue; }
    float dark = 0.88 * (1.0 - smoothstep(0.0, 0.18, s));
    alpha = max(alpha, dark * inside);
    col += vec3(0.012, 0.010, 0.016) * dark * inside;
    float flare = smoothstep(0.0, 0.12, s) * (1.0 - smoothstep(0.35, 1.0, s));
    col += vec3(0.95, 0.55, 0.14) * inside * flare * 1.25; // deep gold, not white
    col += uWarm * rim * flare * 1.6; // a bright rim
  }
  gl_FragColor = vec4(col, alpha); // premultiplied: glow adds, gaps darken
}`;

export class FloorFx {
  readonly mesh: THREE.Mesh;
  readonly u: Record<string, THREE.IUniform>;
  constructor(cx = 0, cz = 0, size = 30) {
    this.u = {
      uOrigin: { value: ORIGIN.clone() }, uTile: { value: TILE }, uR: { value: STAR_R }, uWarm: { value: new THREE.Vector3(1.0, 0.62, 0.22) },
      uGCenter: { value: new THREE.Vector2() }, uGRadius: { value: 0 }, uGWidth: { value: 0.35 }, uGTrail: { value: 0.4 }, uGInt: { value: 0 },
      uMCenter: { value: new THREE.Vector2() }, uMR: { value: 1.6 }, uMProg: { value: 0 }, uMInt: { value: 0 },
      uGap: { value: Array.from({ length: MAX_GAPS }, () => new THREE.Vector3()) }, uGapN: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthWrite: false, fog: false,
      blending: THREE.NormalBlending, premultipliedAlpha: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.set(cx, 0.004, cz);
    this.mesh.layers.set(NOINK); this.mesh.renderOrder = 1.5; this.mesh.frustumCulled = false;
  }
  /** light running along the grooves: a front at `radius` m from (x, z), with a fading trail behind it */
  grooves(x: number, z: number, radius: number, intensity: number, trail = 0.4) {
    (this.u.uGCenter.value as THREE.Vector2).set(x, z); this.u.uGRadius.value = radius; this.u.uGInt.value = intensity; this.u.uGTrail.value = trail;
  }
  /** the 8-point star mark centred at (x, z), outer radius R m, traced to `progress` (0..1) */
  mark(x: number, z: number, R: number, progress: number, intensity: number) {
    (this.u.uMCenter.value as THREE.Vector2).set(x, z); this.u.uMR.value = R; this.u.uMProg.value = progress; this.u.uMInt.value = intensity;
  }
  /** tile-star gaps: [x, z, state]; state < 0 = still empty, 0..1 = filling, >= 1 = done */
  gaps(list: [number, number, number][]) {
    const arr = this.u.uGap.value as THREE.Vector3[];
    list.slice(0, MAX_GAPS).forEach(([x, z, s], i) => arr[i].set(x, z, s));
    this.u.uGapN.value = Math.min(MAX_GAPS, list.length);
  }
}
