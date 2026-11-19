// Adapted from Claude Animated Shorts (templates/bridge/cast.ts), https://github.com/mromidev/claude-animated-shorts
// Copyright (c) 2026 Mr omi. MIT License; full licence text in NOTICE.md at the repo root.
// Changes in this copy: kept the canvas Pool (now mipmapped, max anisotropy), the lit character card (Actor),
// drawing-size tiers (re-sized for wider lenses and steadier pushes), the 2D light angle
// and the contact-shadow blob. Removed the bridge crowd, soldiers, blinks, story timing and effects. Added the Cast
// class, which places any list of drawings in the scene each frame.

// Characters as lit flat cards in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so identical drawings share a canvas. Cards are yaw-only billboards
// (they turn to face the camera around the vertical axis) shaded by cardShade(). Standing characters get a soft
// multiply contact blob under the feet. Cards and blobs live on the NOINK layer so the world ink pass never outlines
// their rectangles (the drawings carry their own ink).
import * as THREE from "three";
import { Pen, fxContact } from "../draw/toon";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; // three clamps to the GPU maximum
  // mipmaps + trilinear: the drawing is always larger than it appears on screen and shrinks smoothly (no shimmer)
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}
// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
/** metres per design unit: 1000 units = 2.16 m */
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
/** a wide card (lying down): design space 1400 x 700 units, its resting line (mattress / floor) at y = 680, centre x = 700 */
export const WIDE = { w: 1400, h: 700, base: 680 };
const WIDE_GEO = (() => { const g = new THREE.PlaneGeometry(WIDE.w * SU, WIDE.h * SU); g.translate(0, (WIDE.base - WIDE.h / 2) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only). Drawn after the
 *  contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    // alpha-to-coverage: with the composer's 4x MSAA the cut-out edge gets 4 coverage levels instead of a hard
    // on/off step, so the drawn outline does not stair-step and shimmer as the card grows on screen. (The original
    // turned this off: it left 1 px sky-depth seams on far, heavily blurred cards. Turn it off per card if that returns.)
    this.mat.alphaToCoverage = true;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

/** ground contact shadow: a flat multiply blob right under the feet so nobody floats */
export class Blob {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK); this.mesh.renderOrder = 0.5;
    parent.add(this.mesh);
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
    if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
    this.mat.map = t;
  }
}

// ---------------- placement ----------------
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design].
 *  Sized so the canvas is always at least ~2x the card's height on screen at a 1440 x 2560 final with our wide lenses
 *  (fov 50): a 2.16 m card at 12 m is ~770 px tall there, its 1800 px canvas 2.3x that. Mipmaps shrink it smoothly.
 *  The bands are wide so a character does not switch drawings during a normal push-in (a switch can pop). */
export const tier = (d: number): [number, number, number] =>
  d < 12 ? [1800, 3000, 3.0] : d < 24 ? [1080, 1800, 1.8] : d < 48 ? [480, 800, 0.8] : [240, 400, 0.4];

/** canvas angle the key light comes FROM on an upright card facing the camera, in 45-degree steps (small texture
 *  cache). `toLight` = world direction toward the light, `right` = the camera's right vector. */
export const light2D = (toLight: THREE.Vector3, right: THREE.Vector3, mirror = false) => {
  const sx = toLight.dot(right) * (mirror ? -1 : 1), sy = -toLight.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** one character this frame: a drawing (cached by key) standing with its soles at (x, y, z) */
export type Place = {
  key: string; x: number; y: number; z: number; draw: (p: Pen) => void;
  scale?: number; mirror?: boolean; yaw?: number;
  /** turn the card in its own plane (radians, + = counter-clockwise on screen) about the pivot: lying down, leaning */
  roll?: number;
  /** a wide card (design space WIDE: 1400 x 700, resting line at y = 680) for lying-down drawings */
  wide?: boolean;
  /** contact shadow colour (multiply, sRGB hex); null = no blob */
  blob?: string | null;
  /** cast a real shadow (its drawn silhouette) from the scene's shadow-casting lights. A casting card does not also
   *  receive shadows, so it can never shadow itself (no striped self-shadow on the flat card). */
  castShadow?: boolean;
};

/** Owns the cards, blobs and canvas pool of one scene. Call pose() once per frame with everyone who is on screen. */
export class Cast {
  readonly root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private blobs: Blob[] = [];
  private v = new THREE.Vector3();
  pose(cam: THREE.Camera, places: Place[]) {
    let ai = 0, bi = 0;
    for (const p of places) {
      const sc = p.scale ?? 1;
      const a = this.actors[ai] ?? (this.actors[ai] = new Actor(this.root));
      ai++;
      a.mesh.geometry = p.wide ? WIDE_GEO : BODY;
      const d = cam.position.distanceTo(this.v.set(p.x, p.y + 1.2 * sc, p.z)) / sc;
      const [w0, h0, k] = tier(d), w = p.wide ? Math.round(w0 * (WIDE.w / 600)) : w0, h = p.wide ? Math.round(h0 * (WIDE.h / 1000)) : h0;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc : sc, sc, sc);
      a.mesh.castShadow = !!p.castShadow; a.mesh.receiveShadow = !p.castShadow;
      if (p.blob !== null) {
        const col = p.blob ?? "#3a3550";
        const b = this.blobs[bi] ?? (this.blobs[bi] = new Blob(this.root));
        bi++;
        b.r = this.pool.req(`blob|contact|${col}`, 128, 128, 1, (pen) => fxContact(pen, col));
        b.mesh.visible = true;
        b.mesh.position.set(p.x, p.y + 0.01, p.z);
        b.mesh.rotation.set(-Math.PI / 2, 0, 0);
        b.mesh.scale.set(0.6 * sc, 0.42 * sc, 1);
      }
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = bi; i < this.blobs.length; i++) this.blobs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of this.actors.slice(0, ai)) a.bind();
    for (const b of this.blobs.slice(0, bi)) b.bind();
  }
}
