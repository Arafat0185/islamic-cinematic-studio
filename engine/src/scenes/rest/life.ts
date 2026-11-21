// Video 004 "The Man Who Never Rested": the things that move in the library with the story (built once into the
// library set's root, updated every frame from the frame number): the hero book - pulled off the shelf, opened TOWARD
// the camera, its pages flipping fast and landing on an INK DRAWING of the scene we are about to enter (sketchy black
// ink on old paper: the comforts on the sand, the boat in the storm, the desert road, the stars), then closed and laid
// down - and the dust that bursts off the shelf when he pulls a book.
import * as THREE from "three";
import { NOINK } from "../../render/ink";
import { mat, box } from "../../sets/common";
import { ctex } from "../../draw/paint";
import type { Frame, SetId } from "../../story/story";
import { FPS, bookState } from "./timeline";

type G = CanvasRenderingContext2D;
/** old paper with a gutter shadow down the middle */
const paper = (g: G, r: () => number) => {
  g.fillStyle = "#e6d6b4"; g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "150,110,60" : "255,245,220"},${0.05 * r()})`; g.fillRect(r() * 512, r() * 384, 2 + 6 * r(), 2 + 4 * r()); }
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "rgba(110,80,40,0.3)"); gr.addColorStop(0.44, "rgba(110,80,40,0.02)"); gr.addColorStop(0.5, "rgba(70,45,20,0.45)"); gr.addColorStop(0.56, "rgba(110,80,40,0.02)"); gr.addColorStop(1, "rgba(110,80,40,0.3)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
};
/** a sketchy ink stroke: the same path drawn 2-3 times with a little jitter */
const sketch = (g: G, r: () => number, pts: [number, number][], w = 2.2) => {
  for (let k = 0; k < 3; k++) { g.beginPath(); pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * 2.4, jy = y + (r() - 0.5) * 2.4; if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy); }); g.strokeStyle = `rgba(28,20,14,${k ? 0.45 : 0.85})`; g.lineWidth = w * (k ? 0.6 : 1); g.stroke(); }
};
const hatch = (g: G, r: () => number, x0: number, y0: number, x1: number, y1: number, n: number) => { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * r(), y = y0 + (y1 - y0) * r(); sketch(g, r, [[x, y], [x + 10, y - 6]], 1); } };
const DRAWINGS: Record<string, (g: G, r: () => number) => void> = {
  comfort: (g, r) => { sketch(g, r, [[20, 250], [120, 238], [240, 246], [380, 232], [500, 244]]);
    sketch(g, r, [[60, 230], [60, 200], [150, 200], [150, 230], [60, 230]]); sketch(g, r, [[60, 200], [60, 185], [150, 185], [150, 200]]);           // the sofa
    sketch(g, r, [[300, 236], [300, 214], [330, 196], [400, 196], [420, 214], [440, 214], [440, 236], [300, 236]]); sketch(g, r, [[320, 238], [320, 238]], 9); sketch(g, r, [[420, 238], [420, 238]], 9);   // the car
    sketch(g, r, [[200, 240], [235, 210]]); sketch(g, r, [[235, 210], [245, 150]]); sketch(g, r, [[205, 150], [245, 135], [285, 150]]);                // the beach chair, its umbrella
    sketch(g, r, [[470, 232], [470, 200], [488, 200], [488, 232], [470, 232]]); hatch(g, r, 30, 255, 490, 330, 40); },                                  // the phone; the sand
  storm: (g, r) => { for (let k = 0; k < 6; k++) { const y = 230 + 22 * k; sketch(g, r, Array.from({ length: 12 }, (_, i) => [i * 46, y + 16 * Math.sin(i * 1.3 + k)] as [number, number])); }
    sketch(g, r, [[200, 236], [320, 236], [300, 256], [215, 256], [200, 236]], 2.6); sketch(g, r, [[262, 236], [262, 180]]); sketch(g, r, [[262, 200], [330, 270]]);   // the boat, a figure, the oar
    sketch(g, r, [[380, 20], [360, 70], [384, 74], [350, 140]], 2.8); for (let i = 0; i < 50; i++) { const x = r() * 512, y = r() * 200; sketch(g, r, [[x, y], [x - 6, y + 22]], 1); } },
  desert: (g, r) => { sketch(g, r, [[0, 200], [512, 200]]); sketch(g, r, [[236, 200], [120, 384]], 2.4); sketch(g, r, [[276, 200], [400, 384]], 2.4);
    for (let i = 0; i < 4; i++) sketch(g, r, [[0, 230 + 30 * i], [140, 212 + 26 * i], [250 - 30 * i, 230 + 30 * i]]);
    for (let a = 0; a < 6.3; a += 0.4) sketch(g, r, [[256 + 26 * Math.cos(a), 200 + 26 * Math.sin(a) * 0.6], [256 + 46 * Math.cos(a), 200 + 46 * Math.sin(a) * 0.6]], 1.2);   // the light
    sketch(g, r, [[300, 300], [300, 270]], 3); sketch(g, r, [[300, 268], [300, 262]], 6); },                                                       // a small walker
  stars: (g, r) => { for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 384, s = 3 + 5 * r(); sketch(g, r, [[x - s, y], [x + s, y]], 1); sketch(g, r, [[x, y - s], [x, y + s]], 1); }
    sketch(g, r, [[226, 120], [286, 120], [262, 190], [286, 260], [226, 260], [250, 190], [226, 120]], 2.4); },                                    // an hourglass among the stars
};
const drawingTex = (name: string) => ctex("restDraw|" + name, 512, 384, (g, r) => { paper(g, r); DRAWINGS[name](g, r); });
const blankTex = () => ctex("restBlank", 512, 384, (g, r) => { paper(g, r); g.strokeStyle = "rgba(60,40,20,0.5)"; g.lineWidth = 3;
  for (const x0 of [30, 282]) for (let y = 40; y < 350; y += 22) { g.beginPath(); let x = x0; g.moveTo(x, y); while (x < x0 + 200) { x += 6 + 14 * r(); g.lineTo(x, y + (r() - 0.5) * 3); if (r() < 0.12) { x += 8; g.moveTo(x, y); } } g.stroke(); } });

export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const root = roots.library!;
  const book = new THREE.Group(); root.add(book);
  const leather = mat("#5a2a1c"), gold = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.5) });
  const W = 0.36, D = 0.27, TH = 0.07;
  box(book, [-W / 2, -TH / 2, -D / 2], [W / 2, -TH / 2 + 0.012, D / 2], leather);                          // the back cover
  box(book, [-W / 2 + 0.01, -TH / 2 + 0.012, -D / 2 + 0.01], [W / 2 - 0.01, TH / 2 - 0.012, D / 2 - 0.01], mat("#e9dcc0"));   // the page block
  const tex = { comfort: drawingTex("comfort"), storm: drawingTex("storm"), desert: drawingTex("desert"), stars: drawingTex("stars"), blank: blankTex() } as Record<string, THREE.Texture>;
  const pageM = new THREE.MeshBasicMaterial({ map: tex.blank, color: new THREE.Color(1.15, 1.05, 0.92) });
  const pages = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), pageM); pages.rotation.x = -Math.PI / 2; pages.position.y = TH / 2 - 0.011; pages.layers.set(NOINK); book.add(pages);
  // the front cover swings about the spine (the left edge, x = -W/2)
  const hinge = new THREE.Group(); hinge.position.set(-W / 2, TH / 2, 0); book.add(hinge);
  box(hinge, [0, 0, -D / 2], [W + 0.005, 0.012, D / 2], leather); box(hinge, [W * 0.4, 0.013, -0.05], [W * 0.6, 0.016, 0.05], gold, false);
  // the flipping pages: five thin leaves turning over about the spine, fast
  const leafM = new THREE.MeshBasicMaterial({ map: tex.blank, color: new THREE.Color(1.1, 1.0, 0.88), side: THREE.DoubleSide });
  const leaves = Array.from({ length: 5 }, () => { const h = new THREE.Group(); h.position.set(0, TH / 2 - 0.006, 0); book.add(h);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.01, D - 0.02), leafM); m.rotation.x = -Math.PI / 2; m.position.x = (W / 2 - 0.01) / 2; m.layers.set(NOINK); h.add(m); return h; });
  const glowL = new THREE.PointLight("#ffd890", 0, 2.5, 1.5); glowL.position.y = 0.25; book.add(glowL);
  book.traverse((o) => { o.userData.noCollide = true; });   // the camera comes right up to the page on purpose
  // dust bursting off the shelf when a book is pulled
  const n = 260, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dustM = new THREE.PointsMaterial({ color: "#d8c8a8", size: 0.02, transparent: true, opacity: 0.8, depthWrite: false });
  const puff = new THREE.Points(geo, dustM); puff.layers.set(NOINK); puff.frustumCulled = false; root.add(puff);
  const hash = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
  const up = new THREE.Vector3(0, 1, 0), nv = new THREE.Vector3();
  return {
    update: (_fr: Frame, f: number) => {
      const t = f / FPS, b = bookState(f);
      book.visible = b.visible; if (!b.visible) { book.position.set(0, -3000, 0); } else {
        book.position.set(...b.pos); book.quaternion.setFromUnitVectors(up, nv.set(...b.normal).normalize());
        hinge.rotation.z = -Math.PI * 0.98 * b.open;                                            // the cover opens to the left
        pages.visible = b.open > 0.4; pageM.map = b.flip >= 1 ? tex[b.drawing] : tex.blank; pageM.needsUpdate = true;
        leaves.forEach((h, i) => { const u = Math.max(0, Math.min(1, b.flip * 1.25 - i * 0.06)); h.visible = b.open > 0.6 && b.flip > 0 && b.flip < 1; h.rotation.z = Math.PI * 0.98 * u; });
        glowL.intensity = 2.2 * Math.max(0, b.open - 0.3) * (b.flip >= 1 ? 1.5 : 1);
      }
      const pulls = [1.0, 6.2, 11.2], pt = pulls.map((p) => t - p).find((d) => d > 0 && d < 1.6);
      puff.visible = pt !== undefined;
      if (pt !== undefined) { const at = pulls.find((p) => t - p === pt)!, src = at < 5 ? [2.2, 3.62, -6.05] : at < 10 ? [2.2, 4.08, -5.45] : [-2.3, 1.62, -9.6];
        for (let i = 0; i < n; i++) { const a = hash(i) * 6.28, sp = 0.4 + 0.9 * hash(i + 1); pos.set([src[0] - Math.sign(src[0]) * sp * pt * 0.8 + Math.cos(a) * 0.1, src[1] + 0.2 * pt * hash(i + 2) - 0.25 * pt * pt + Math.sin(a) * 0.08, src[2] + Math.sin(a) * sp * pt * 0.4], i * 3); }
        geo.attributes.position.needsUpdate = true; dustM.opacity = 0.8 * (1 - pt / 1.6); }
    },
  };
};
