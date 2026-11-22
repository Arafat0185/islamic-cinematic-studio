// The "mercy" effect (video 001, section 6): small points of warm light rise from the floor and settle, one by one,
// into empty stars of the tile pattern until it is complete. From `from` the chosen tile stars show as empty (dark);
// each light rises in an arc from a nearby spot on the floor and lands in its star at its fill frame; the star flares
// gold and settles back into an ordinary tile. Stars under the prayer mat and the Traveller's feet are left alone.
// Everything is a pure function of the frame.
import * as THREE from "three";
import { FloorFx, tileStars } from "./floorFx";
import { NOINK } from "../render/ink";
import { ctex } from "../draw/paint";
import { MAT } from "../scenes/motion-test/timeline";

export type MercyOpts = {
  centre: [number, number];   // world (x, z) the effect is gathered around
  from: number; to: number;   // frames: the gaps appear at `from`, everything is back to normal at `to`
  firstFill: number; lastFill: number; // frames: the first and last star to be filled
  radius?: number;            // m: how far from the centre the empty stars are chosen
  count?: number;             // how many stars
  keepClear?: [number, number, number][]; // [x, z, r]: no gaps here (e.g. the Traveller's feet)
};

const FILL = 18;    // frames: a star's flare and settle
const FLIGHT = 30;  // frames: a light's rise and landing

const dotTex = () => ctex("mercyDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,240,200,0.7)"); gr.addColorStop(1, "rgba(255,220,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});

export class Mercy {
  readonly points: THREE.Points;
  private gaps: { x: number; z: number; fill: number; sx: number; sz: number }[] = [];
  constructor(private fx: FloorFx, private o: MercyOpts) {
    const [cx, cz] = o.centre, keep = o.keepClear ?? [];
    const onMat = (x: number, z: number) => Math.abs(x - MAT.x) < MAT.len / 2 + 0.35 && Math.abs(z - MAT.z) < MAT.wid / 2 + 0.35;
    const stars = tileStars(cx, cz, o.radius ?? 2.4)
      .filter(([x, z]) => !onMat(x, z) && keep.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r))
      .sort((a, b) => Math.atan2(a[0] - cx, -(a[1] - cz)) - Math.atan2(b[0] - cx, -(b[1] - cz))) // clockwise sweep
      .slice(0, o.count ?? 12);
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    stars.forEach(([x, z], i) => {
      const fill = Math.round(o.firstFill + ((o.lastFill - o.firstFill) * i) / Math.max(1, stars.length - 1));
      const a = r() * Math.PI * 2, d = 0.6 + 0.6 * r(); // the light starts on the floor, 0.6-1.2 m away
      this.gaps.push({ x, z, fill, sx: x + d * Math.cos(a), sz: z + d * Math.sin(a) });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.gaps.length * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.gaps.length * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.18, sizeAttenuation: true, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    this.points.layers.set(NOINK); this.points.frustumCulled = false;
  }
  /** pose everything for frame f */
  update(f: number) {
    const pos = (this.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const col = (this.points.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
    const active = f >= this.o.from && f < this.o.to;
    this.fx.gaps(active ? this.gaps.map((g): [number, number, number] => [g.x, g.z, (f - g.fill) / FILL]) : []);
    this.gaps.forEach((g, i) => {
      const u = (f - (g.fill - FLIGHT)) / FLIGHT; // 0 = leaves the floor, 1 = lands in its star
      const vis = active && u > 0 && u < 1.08 ? Math.min(1, u / 0.15) * (u > 1 ? 1 - (u - 1) / 0.08 : 1) : 0;
      const k = Math.min(1, Math.max(0, u)), e = k * k * (3 - 2 * k);
      // an arc: up from the floor, over, and down into the star
      pos.set([g.sx + (g.x - g.sx) * e, 0.05 + 1.15 * Math.sin(Math.PI * Math.min(1, k)) * (1 - 0.25 * k), g.sz + (g.z - g.sz) * e], i * 3);
      col.set([2.2 * vis, 1.5 * vis, 0.6 * vis], i * 3);
    });
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
