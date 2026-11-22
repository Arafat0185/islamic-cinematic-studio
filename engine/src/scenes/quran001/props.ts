// Props for the 11-61 s life story (story.ts): each group is shown only in its own shots and animated by the frame.
//   bedroom   the wash corner (basin, tap, running water, splashes; built at x ~ 12, out of sight of the bedroom), the
//             window's two casements (closed until he opens them), a night lamp and his prayer mat, the breakfast
//             spread (cloth, bread, dates, tea glasses with steam)
//   street    his front door, open, warm light inside
//   courtyard a door lantern, the shoe rack and sandals (theirs appear as they step out of them), the prayer runner under
//             the row, the old man's bags falling and oranges rolling, the kids' ball, the sunset meal
// Solid props are ordinary set geometry (ink outlines); water, steam and glows are on NOINK.
import * as THREE from "three";
import { NOINK } from "../../render/ink";
import { mat, box, cyl, glow } from "../../sets/common";
import { ctex } from "../../draw/paint";
import { buildMat } from "../motion-test/mat";
import type { Frame, SetId } from "../../story/story";
import { FPS, F, SHOTS } from "./timeline";
import { WASH, DOOR_X, SHOE_OFF, OLD_X, OLD_Z, POOL_C, BALL_T, BALL_KID } from "./story";
import STORY from "../../../../videos/001-the-first-question/quran/shots.json";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const fract = (x: number) => x - Math.floor(x);
const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const span = (k: string) => { const s = SHOTS.find((x) => x.kind === k)!; return { a: s.from, b: s.to }; };
const EVS = STORY.events as unknown as { bagDrop: number; ball: number[]; window: number };
const softDot = () => ctex("lifeDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const points = (parent: THREE.Object3D, n: number, size: number, additive = true) => {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: softDot(), size, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false }));
  p.layers.set(NOINK); p.frustumCulled = false; parent.add(p);
  return { p, pos, col, commit: () => { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; } };
};
const group = (parent: THREE.Object3D) => { const g = new THREE.Group(); parent.add(g); g.visible = false; return g; };
const steamTex = () => ctex("steamPuff", 64, 128, (g) => {
  for (let i = 0; i < 6; i++) { const y = 110 - i * 18, r = 10 + i * 3; const gr = g.createRadialGradient(32 + 6 * Math.sin(i), y, 0, 32 + 6 * Math.sin(i), y, r);
    gr.addColorStop(0, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); }
});
/** steam rising from a glass: a few soft sprites drifting up and fading */
const steam = (parent: THREE.Object3D, at: [number, number, number], n = 3) => Array.from({ length: n }, (_, i) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex(), color: new THREE.Color("#f4efe6"), transparent: true, opacity: 0, depthWrite: false, fog: false }));
  s.layers.set(NOINK); parent.add(s);
  return (t: number) => { const life = fract(t * 0.6 + i / n); s.position.set(at[0] + 0.02 * Math.sin(t * 2 + i), at[1] + 0.05 + 0.22 * life, at[2]); s.scale.set(0.06 + 0.08 * life, 0.12 + 0.12 * life, 1); s.material.opacity = 0.5 * Math.sin(Math.PI * life); };
});

// =====================================================================================================================
const bedroomProps = (root: THREE.Object3D) => {
  // ---- the wash corner ----
  const wash = new THREE.Group(); root.add(wash);
  const X = WASH.X, tile = ctex("washTile", 256, 256, (g) => { g.fillStyle = "#cfd8d6"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#a9b4b2"; g.lineWidth = 4; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } });
  const tm = (rx: number, ry: number) => { const t = tile.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return mat("#ffffff", { map: t }); };
  box(wash, [X - 1.6, -0.02, -1.6], [X + 0.6, 0.0, 1.4], tm(4, 6));                     // floor
  box(wash, [X - 1.6, -0.02, -1.62], [X + 0.6, 2.6, -1.4], tm(4, 5));                   // back wall
  box(wash, [X + 0.3, -0.02, -1.4], [X + 0.5, 2.6, 1.4], tm(5, 5));                      // right wall (the basin's)
  box(wash, [X - 1.8, -0.02, -1.4], [X - 1.6, 2.6, 1.4], tm(5, 5));                      // left wall
  box(wash, [X - 1.6, 2.6, -1.6], [X + 0.5, 2.7, 1.4], mat("#e6e0d4"));                 // ceiling
  box(wash, [X - 0.25, 0.8, -1.12], [X + 0.3, 0.9, -0.58], mat("#f1eee8"));             // the basin
  box(wash, [X - 0.2, 0.89, -1.06], [X + 0.25, 0.9, -0.64], mat("#9fb3bd"), false);    // its bowl (water-grey)
  box(wash, [X - 0.05, 0.0, -0.95], [X + 0.12, 0.8, -0.75], mat("#e6e1d8"));            // pedestal
  box(wash, [X - 0.16, 1.22, -0.88], [X + 0.3, 1.27, -0.82], mat("#b9bcc2"));          // the tap's pipe from the wall
  box(wash, [X - 0.19, 1.16, -0.88], [X - 0.13, 1.27, -0.82], mat("#b9bcc2"));         // its spout, pointing down
  box(wash, [X - 1.2, 1.5, -1.42], [X - 0.6, 2.1, -1.4], glow("#7f96d8", 0.9), false); // a small window, blue before dawn
  box(wash, [X - 1.25, 1.45, -1.42], [X - 0.55, 1.5, -1.36], mat("#e8e2d6"));
  box(wash, [X + 0.28, 1.3, -0.3], [X + 0.3, 1.9, 0.1], mat("#3f6b8a"));               // a towel on the wall
  const lamp = new THREE.PointLight("#ffe2b8", 3.2, 6, 1.6); lamp.position.set(X - 0.5, 2.3, -0.2); wash.add(lamp);
  const water = points(wash, 70, 0.016), wr = rnd(3), ws = Float32Array.from({ length: 70 * 3 }, wr);
  // ---- the window's casements: closed, then opened inward at "window" ----
  const cas = [0.42, 1.68].map((hx, i) => {
    const pivot = new THREE.Group(); pivot.position.set(hx, 0.99, -2.17); root.add(pivot);
    const s = i ? -1 : 1, w = 0.62, fr = mat("#e8e2d6");
    const xs = [0, s * w].sort((a, b) => a - b);
    box(pivot, [xs[0], 0, -0.02], [xs[1], 0.05, 0.02], fr);
    box(pivot, [xs[0], 1.17, -0.02], [xs[1], 1.22, 0.02], fr);
    box(pivot, [s > 0 ? 0 : -0.05, 0, -0.02], [s > 0 ? 0.05 : 0, 1.22, 0.02], fr);
    box(pivot, [s > 0 ? w - 0.05 : -w, 0, -0.02], [s > 0 ? w : -w + 0.05, 1.22, 0.02], fr);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, 1.12), new THREE.MeshBasicMaterial({ color: "#cfe0f0", transparent: true, opacity: 0.12, depthWrite: false, fog: false }));
    glass.position.set((s * w) / 2, 0.61, 0); glass.layers.set(NOINK); pivot.add(glass);
    return { pivot, s };
  });
  // ---- night: the lamp lit on the nightstand, his prayer mat on the rug ----
  const night = group(root);
  const nl = new THREE.PointLight("#ffb866", 0, 7, 1.4); nl.position.set(-2.35, 0.95, -1.7); night.add(nl);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.15, 16), glow("#ffcf8a", 1.6)); shade.position.set(-2.35, 0.86, -1.86); night.add(shade);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.0, 0.62, 0.3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  halo.scale.set(1.2, 1.2, 1); halo.position.set(-2.35, 0.9, -1.8); halo.layers.set(NOINK); night.add(halo);
  const pm = buildMat(-0.05, 0.25, 1.25, 0.7); pm.position.y += 0.012; night.add(pm);
  const fill = new THREE.PointLight("#ffc890", 0, 6, 1.4); fill.position.set(1.3, 1.15, 1.4); night.add(fill);   // a warm fill from the front, so his pose reads in the dark
  // ---- breakfast on a cloth on the rug ----
  const bf = group(root);
  box(bf, [-0.36, 0.012, -0.55], [0.36, 0.018, 1.15], mat("#efe4c8"), false);
  box(bf, [-0.36, 0.0125, -0.55], [0.36, 0.0185, -0.5], mat("#b8423b"), false); box(bf, [-0.36, 0.0125, 1.1], [0.36, 0.0185, 1.15], mat("#b8423b"), false);
  for (const [x, z] of [[0.02, 0.62], [0.14, 0.1]] as [number, number][]) { cyl(bf, 0.11, 0.11, 0.012, mat("#f1ece2"), [x, 0.025, z], 20); cyl(bf, 0.08, 0.08, 0.025, mat("#d9a35a"), [x, 0.045, z], 16); } // bread on plates
  cyl(bf, 0.07, 0.055, 0.05, mat("#c9b48a"), [0.02, 0.045, 0.75], 16);                                           // a bowl of dates
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat("#5a2a1a")); d.scale.set(1.5, 0.8, 0.9); d.position.set(0.02 + 0.035 * Math.cos(i), 0.08, 0.75 + 0.035 * Math.sin(i)); bf.add(d); }
  const glasses: [number, number, number][] = [[-0.08, 0.06, 0.3], [0.22, 0.06, 0.45], [-0.02, 0.06, -0.25]];
  for (const g of glasses) cyl(bf, 0.025, 0.02, 0.08, mat("#b8622a"), g, 12);
  cyl(bf, 0.07, 0.08, 0.12, mat("#c79c48"), [0.18, 0.07, 0.85], 16);                                             // the teapot
  const bfSteam = glasses.flatMap((g) => steam(bf, [g[0], g[1] + 0.04, g[2]], 2));
  return (fr: Frame, f: number) => {
    const t = f / FPS, kind = SHOTS.find((s) => f >= s.from && f < s.to)?.kind ?? "";
    // water: a thin stream from the spout onto his hands, splashing off them into the basin
    const on = kind === "wudu";
    water.p.visible = on;
    if (on) {
      for (let i = 0; i < 70; i++) {
        const [a, b, c] = ws.subarray(i * 3, i * 3 + 3), life = fract(t * 2.2 + a);
        let x = X - 0.16, y = 1.15 - 0.3 * life, z = -0.85;
        if (i >= 30) { const ang = b * 6.283; x = X - 0.2 + 0.12 * life * Math.cos(ang); z = -0.85 + 0.12 * life * Math.sin(ang); y = 1.0 + 0.08 * Math.sin(Math.PI * life) - 0.12 * life * c; }
        water.pos.set([x + 0.005 * Math.sin(t * 30 + i), y, z], i * 3);
        const k = (i < 30 ? 0.8 : 0.6 * (1 - life)) * 0.9;
        water.col.set([0.75 * k, 0.85 * k, 1.0 * k], i * 3);
      }
      water.commit();
    }
    // the casements: closed until he opens them, then they stay open
    const op = sm((f - F(EVS.window) + 4) / 16) * 1.25;
    for (const c of cas) c.pivot.rotation.y = c.s * op;
    // night lamp
    const nightOn = kind === "nightPray" || kind === "nightSujood";
    night.visible = nightOn; nl.intensity = nightOn ? 2.6 * (0.96 + 0.04 * Math.sin(t * 7) * Math.sin(t * 2.3)) : 0; fill.intensity = kind === "nightSujood" ? 1.6 : nightOn ? 0.8 : 0;
    bf.visible = kind === "breakfast"; if (bf.visible) for (const s of bfSteam) s(t);
    void fr;
  };
};

// =====================================================================================================================
const streetProps = (root: THREE.Object3D) => {
  const door = group(root), x = DOOR_X;
  box(door, [x - 0.55, 0.0, -0.17], [x + 0.55, 2.4, -0.12], mat("#e8e2d6"));                                     // the frame around it
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcf8a").multiplyScalar(1.15), fog: false }));
  inside.position.set(x, 1.1, -0.115); door.add(inside);
  const leafP = new THREE.Group(); leafP.position.set(x + 0.46, 0, -0.1); leafP.rotation.y = -1.25; door.add(leafP);
  box(leafP, [-0.9, 0.0, -0.025], [0, 2.18, 0.025], mat("#5a3a26"));
  box(leafP, [-0.82, 1.0, 0.025], [-0.74, 1.08, 0.06], mat("#c79c48"), false);
  const dl = new THREE.PointLight("#ffc888", 0, 6, 1.6); dl.position.set(x, 1.6, 0.5); door.add(dl);
  return (_fr: Frame, f: number) => {
    const kind = SHOTS.find((s) => f >= s.from && f < s.to)?.kind ?? "";
    door.visible = kind === "door"; dl.intensity = door.visible ? 2.4 : 0;
  };
};

// =====================================================================================================================
const courtProps = (root: THREE.Object3D) => {
  // ---- a lantern by the entrance (inside and outside) ----
  const ent = group(root);
  const lin = new THREE.PointLight("#ffc070", 0, 7, 1.5); lin.position.set(0.25, 2.5, 6.7); ent.add(lin);
  const lout = new THREE.PointLight("#ffc070", 0, 7, 1.5); lout.position.set(0.25, 2.6, 8.4); ent.add(lout);
  // ---- a soft key light that sits over the action of each courtyard shot (the lamps are far from some of them) ----
  const KEY: Record<string, [number, number, number, number]> = { bags: [-1.8, 2.4, 4.6, 2.8], help: [-1.6, 2.4, 4.6, 2.8], garden: [-0.8, 2.6, 4.6, 2.2], ball: [-0.2, 2.4, 4.8, 2.6],
    shoes: [-0.2, 1.7, 4.6, 3.2], reading: [1.7, 2.0, -1.6, 2.4], teaching: [1.7, 2.0, -1.4, 3.2], sunsetMeal: [2.6, 2.4, 2.6, 2.4], rowRuku: [1.2, 2.4, 0.2, 1.8], rowSujood: [1.2, 2.4, 0.2, 1.8] };
  const key = new THREE.PointLight("#ffcf98", 0, 7, 1.4); root.add(key);
  // ---- shoe rack and sandals ----
  const shoes = group(root), wood = mat("#7a5236");
  box(shoes, [-2.05, 0.0, 6.85], [-0.7, 0.04, 7.15], wood); box(shoes, [-2.05, 0.3, 6.85], [-0.7, 0.33, 7.15], wood); box(shoes, [-2.05, 0.6, 6.85], [-0.7, 0.63, 7.15], wood);
  for (const x of [-2.03, -1.37, -0.72]) box(shoes, [x - 0.02, 0, 6.85], [x + 0.02, 0.63, 7.15], wood);
  const sandal = (parent: THREE.Object3D, x: number, y: number, z: number, c: string, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
    for (const dx of [-0.055, 0.055]) { box(g, [dx - 0.04, 0, -0.12], [dx + 0.04, 0.02, 0.12], mat(c), false); box(g, [dx - 0.04, 0.02, -0.02], [dx + 0.04, 0.035, 0.02], mat(c), false); } return g; };
  const cols = ["#6b4a33", "#3a3d45", "#8a6446", "#2c2c30", "#7a5a3f", "#5a4636"];
  for (let i = 0; i < 6; i++) sandal(shoes, -1.9 + 0.22 * i, i % 2 ? 0.33 : 0.04, 7.0, cols[i], Math.PI / 2);
  for (let i = 0; i < 3; i++) sandal(shoes, -1.6 + 0.3 * i, 0.0, 6.7, cols[(i + 2) % 6], Math.PI / 2 + 0.2 * Math.sin(i * 3));
  const his = sandal(shoes, 0.0, 0, 6.35, "#6b4a33", Math.PI / 2), friends = sandal(shoes, -0.85, 0, 6.55, "#3a3d45", Math.PI / 2);
  // ---- the prayer runner under the row ----
  const runner = group(root);
  const rt = ctex("runner", 512, 64, (g) => { g.fillStyle = "#7e1a22"; g.fillRect(0, 0, 512, 64); g.fillStyle = "#c79c48"; for (let x = 0; x < 512; x += 56) { g.beginPath(); g.moveTo(x + 28, 8); g.lineTo(x + 46, 32); g.lineTo(x + 28, 56); g.lineTo(x + 10, 32); g.closePath(); g.fill(); } g.fillRect(0, 0, 512, 4); g.fillRect(0, 60, 512, 4); });
  const rtx = rt.clone(); rtx.repeat.set(4, 1); rtx.needsUpdate = true;
  box(runner, [-2.9, 0.0, -2.25], [2.6, 0.01, -1.45], mat("#ffffff", { map: rtx }), false);
  // ---- the old man's bags and oranges ----
  const bagG = group(root), bagM = mat("#d9c7a0");
  const bags = [0, 1].map((i) => { const g = new THREE.Group(); bagG.add(g); box(g, [-0.13, 0, -0.08], [0.13, 0.3, 0.08], bagM); box(g, [-0.08, 0.3, -0.005], [0.08, 0.36, 0.005], mat("#8a6446"), false); return { g, i }; });
  const oranges = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), mat(i % 3 ? "#e8892a" : "#c9d36a")); bagG.add(m); return m; });
  // ---- the kids' ball ----
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), mat("#e05a3a")); ball.visible = false; root.add(ball);
  // ---- the sunset meal ----
  const meal = group(root);
  box(meal, [2.3, 0.0, -0.45], [2.9, 0.012, 2.0], mat("#efe4c8"), false);
  for (const [x, z, c] of [[2.6, 1.15, "#c9783a"], [2.6, 0.38, "#d9a35a"], [2.6, -0.32, "#a8b85a"], [2.6, 1.85, "#d9a35a"]] as [number, number, string][]) {
    cyl(meal, 0.13, 0.13, 0.012, mat("#f1ece2"), [x, 0.02, z], 20);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat(c)); m.scale.set(1, 0.45, 1); m.position.set(x, 0.035, z); meal.add(m);
  }
  const mg: [number, number, number][] = [[2.6, 0.06, 0.8], [2.6, 0.06, 1.55], [2.6, 0.06, 0.05]];
  for (const g of mg) cyl(meal, 0.025, 0.02, 0.08, mat("#b8622a"), g, 12);
  cyl(meal, 0.09, 0.1, 0.13, mat("#c79c48"), [2.6, 0.08, 1.0], 16);
  const mealSteam = mg.slice(0, 2).flatMap((g) => steam(meal, [g[0], g[1] + 0.04, g[2]], 2));
  const [b0] = EVS.ball.map(F), bagDrop = F(EVS.bagDrop), help = span("help");
  return (_fr: Frame, f: number) => {
    const t = f / FPS, kind = SHOTS.find((s) => f >= s.from && f < s.to)?.kind ?? "";
    const kk = KEY[kind]; key.intensity = kk ? kk[3] : 0; if (kk) key.position.set(kk[0], kk[1], kk[2]);
    ent.visible = kind === "shoes" || kind === "hug"; lin.intensity = kind === "shoes" ? 2.6 : 0; lout.intensity = kind === "hug" ? 2.6 : 0;
    shoes.visible = kind === "shoes";
    his.visible = f >= SHOE_OFF; friends.visible = f >= SHOE_OFF + 12;
    runner.visible = kind.startsWith("row");
    // bags: fall at the drop (tumbling onto their sides), picked up during "help"
    bagG.visible = (kind === "bags" && f >= bagDrop) || kind === "help";
    if (bagG.visible) {
      const d = clamp01((f - bagDrop) / 7);
      bags.forEach(({ g, i }) => { g.position.set(OLD_X + 0.3 + 0.22 * i, 0.55 * (1 - d * d), OLD_Z + 0.06 + 0.06 * i); g.rotation.set(0, 0.3 + 0.5 * i, (i ? -1 : 1) * 1.45 * sm(d * 1.3)); g.visible = f < help.a + 16; });
      oranges.forEach((m, i) => { const r = clamp01((f - bagDrop - 4) / 30), dist = (0.25 + 0.12 * i) * (1 - (1 - r) ** 3), ang = -0.6 + 0.45 * i;
        m.position.set(OLD_X + 0.45 + dist * Math.cos(ang), 0.045, OLD_Z + 0.1 + dist * Math.sin(ang) * 0.6); m.rotation.z = -dist * 8; });
    }
    // ball: rolls to him, is in his hand (drawn on his card), flies back to the kid
    ball.visible = false;
    if (kind === "ball") {
      const x0 = BALL_KID[0] + 0.2, x1 = BALL_T[0] - 0.3;
      if (f < b0 + 30) { const r = clamp01((f - b0) / 20), x = x0 + (x1 - x0) * (1 - (1 - r) ** 2); ball.visible = true; ball.position.set(x, 0.1, BALL_T[2] + 0.02); ball.rotation.z = -x * 10; }
      else if (f >= b0 + 44 && f < b0 + 58) { const r = (f - b0 - 44) / 14, x = x1 + (x0 - x1) * r, y = 1.3 + (0.85 - 1.3) * r + 0.7 * Math.sin(Math.PI * r); ball.visible = true; ball.position.set(x, y, BALL_T[2]); ball.rotation.z = r * 8; }
    }
    meal.visible = kind === "sunsetMeal"; if (meal.visible) for (const s of mealSteam) s(t);
    void POOL_C;
  };
};

// =====================================================================================================================
export const buildProps = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const up: Partial<Record<SetId, (fr: Frame, f: number) => void>> = {};
  if (roots.bedroom) up.bedroom = bedroomProps(roots.bedroom);
  if (roots.street) up.street = streetProps(roots.street);
  if (roots.courtyard) up.courtyard = courtProps(roots.courtyard);
  return (fr: Frame, f: number) => up[fr.set]?.(fr, f);
};
