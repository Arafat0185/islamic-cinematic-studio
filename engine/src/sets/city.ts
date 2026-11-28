// The old city (video 008, "The Prison"): four areas far apart in one set; the state picks the area (the others are
// hidden). Warm limestone, carved wooden balconies (mashrabiya), arcades of pointed arches, hanging lanterns, domes and a
// minaret on the skyline. Graded teal & orange (GRADE_TEAL_ORANGE).
//   "street:<light>:<dim>"  a long stone street at night running toward -z: the night market (stalls, string lights, gold
//                          dishes) z 0..-38, an empty stretch with lamp posts, the crossing (a traffic light: light 0 =
//                          green, 1 = amber, 2 = red) at z = -84, a glowing shop window (left) at z = -96, a cafe (right)
//                          at z = -110, billboards and screens z -124..-142, and the crossroads at z -158: the neon road
//                          left toward a party, the quiet road right toward the minaret. dim 0..1 darkens the
//                          temptations (the shop window, the cafe, the screens, the neon, the traffic light) as they
//                          fall behind him
//   "court:<night>"        a masjid courtyard: arcades on four sides, lanterns in the arches, a fountain, the masjid with
//                          its dome and minaret at -z, an iron-barred gate in the +z wall with the city beyond it; night
//                          0 = dusk, 1 = night (the lanterns glowing)
//   "canal:<golden>:<storm>"  a canal between stone embankments, lamp posts, an old stone bridge across it at z = -24;
//                          golden 0 = a windy night (storm 0..1: rain and wind), 1 = golden hour
//   "roof:<sun>"           a flat rooftop over the city at sunrise (sun 0..1 rising), domes, minarets, roofs below
// Moving things (people, birds, rain, flares, screens' content, reflections) come from the film (scenes/prison/life.ts).
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import type { GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, cyl, sun, liveCanvas } from "./common";
import { skyFor } from "./bookworlds";

export const CITY_AREAS: Record<string, V3> = { street: [0, 0, 0], court: [1000, 0, 0], canal: [2000, 0, 0], roof: [3000, 0, 0] };
/** where things are (local to each area) */
export const CITY = {
  STOP_Z: -84, LIGHT: [3.1, 0, -84.6] as V3, SHOP: [-3.9, 0, -96] as V3, CAFE: [2.0, 0, -110] as V3, FORK_Z: -158,
  MINARET_ST: [16, 0, -205] as V3, PARTY: [-18, 0, -200] as V3,
  GATE_Z: 11.05, MASJID_Z: -12, FOUNTAIN: [0, 0, 0] as V3,
  BRIDGE_Z: -24, CANAL_W: 3.2, WATER_Y: -1.4,
  /** the bridge deck height at x (its hump) */
  deckY: (x: number) => { const a = 3.2 + 2, u = Math.max(0, Math.min(1, (x + a) / (2 * a))); return 1.8 * u * (1 - u); },
};
export const GRADE_TEAL_ORANGE: GradeParams = { ky: [0, 0.035, 0.17, 0.49, 0.8, 0.945, 1], sat: [1.05, 1.12, 1.06], tintS: [0.05, -0.04], tintM: [0.012, -0.004], tintH: [-0.045, 0.045], vig: [0.42, 0.3] };

const filtered = (t: THREE.Texture) => { t.anisotropy = 16; return t; };
const stoneTex = (k: string, base: string, sx: number, sy: number) => filtered(rep(ctex("cityStone" + k, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const c = new THREE.Color(base);
  for (let row = 0; row < 8; row++) { let x = -r() * 80; while (x < 512) { const w = 70 + r() * 70; g.fillStyle = "#" + c.clone().multiplyScalar(0.86 + r() * 0.22).getHexString(); g.fillRect(x + 2, row * 64 + 2, w - 4, 60); x += w; } }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "40,28,18"},${0.05 * r()})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
}), sx, sy));
const pavTex = () => filtered(rep(ctex("cityPave", 512, 512, (g, r) => {
  g.fillStyle = "#4e4a46"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const k = 0.8 + r() * 0.35; g.fillStyle = `rgb(${Math.round(82 * k)},${Math.round(77 * k)},${Math.round(72 * k)})`; g.beginPath(); g.ellipse(i * 32 + 16 + (j % 2) * 16, j * 32 + 16, 14, 13, 0, 0, Math.PI * 2); g.fill(); }
}), 6, 60));
const latticeTex = () => ctex("cityLattice", 128, 128, (g) => {
  g.fillStyle = "#1a0e06"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#ffc070"; g.lineWidth = 3;
  for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 128, 0); g.stroke(); }
  g.fillStyle = "#1a0e06"; for (let y = 8; y < 128; y += 16) for (let x = 8; x < 128; x += 16) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
});
const windowsTex = (k: string, lit: number) => filtered(ctex("cityWin" + k, 256, 512, (g, r) => {
  g.fillStyle = "#a88f70"; g.fillRect(0, 0, 256, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { const x = 30 + i * 80, y = 40 + j * 120, on = r() < lit;
    g.fillStyle = on ? "#ffb85a" : "#2a2420"; g.beginPath(); g.moveTo(x, y + 80); g.lineTo(x, y + 25); g.quadraticCurveTo(x + 24, y - 10, x + 48, y + 25); g.lineTo(x + 48, y + 80); g.closePath(); g.fill(); }
}));
const skyTex = (seed: string) => ctex("citySkyline" + seed, 1024, 256, (g, r) => {    // far roofs: a silhouette with lit windows
  g.clearRect(0, 0, 1024, 256); g.fillStyle = "#1c1a1c"; let x = 0;
  while (x < 1024) { const w = 30 + r() * 70, h = 50 + r() * 110; g.fillRect(x, 256 - h, w, h);
    if (r() < 0.25) { g.beginPath(); g.arc(x + w / 2, 256 - h, w * 0.36, Math.PI, 0); g.fill(); }
    if (r() < 0.08) { g.fillRect(x + w / 2 - 4, 256 - h - 90, 8, 90); g.beginPath(); g.moveTo(x + w / 2 - 7, 256 - h - 90); g.lineTo(x + w / 2, 256 - h - 112); g.lineTo(x + w / 2 + 7, 256 - h - 90); g.fill(); }
    for (let i = 0; i < w * h / 500; i++) if (r() < 0.45) { g.fillStyle = r() < 0.8 ? "rgba(255,184,90,0.9)" : "rgba(200,230,255,0.6)"; g.fillRect(x + 3 + r() * (w - 6), 256 - h + 6 + r() * (h - 10), 3, 4); g.fillStyle = "#1c1a1c"; }
    x += w + 2; }
});

/** an arcade wall in the XY plane: x 0..len, y 0..h, `n` pointed arches (w wide, ah high), depth d along +z */
const arcade = (len: number, h: number, n: number, w: number, ah: number, d: number, m: THREE.Material) => {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, h); s.lineTo(0, 0);
  for (let i = 0; i < n; i++) { const cx = (i + 0.5) * len / n, sp = ah - w * 0.55, p = new THREE.Path();
    p.moveTo(cx - w / 2, 0.02); p.lineTo(cx - w / 2, sp); p.quadraticCurveTo(cx - w / 2, sp + w * 0.42, cx, ah); p.quadraticCurveTo(cx + w / 2, sp + w * 0.42, cx + w / 2, sp); p.lineTo(cx + w / 2, 0.02); p.lineTo(cx - w / 2, 0.02); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
};
/** a domed building or a minaret (local to its parent) */
const dome = (p: THREE.Object3D, at: V3, r: number, m: THREE.Material) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m); d.position.set(...at); d.castShadow = true; p.add(d); return d; };
const minaret = (p: THREE.Object3D, at: V3, h: number, m: THREE.Material, lampM: THREE.Material) => {
  cyl(p, 1.3, 1.6, h * 0.6, m, [at[0], h * 0.3, at[2]], 12); box(p, [at[0] - 1.9, h * 0.6, at[2] - 1.9], [at[0] + 1.9, h * 0.6 + 0.5, at[2] + 1.9], m);
  const ring = cyl(p, 1.25, 1.25, 1.2, lampM, [at[0], h * 0.6 + 1.1, at[2]], 16); ring.castShadow = false;
  cyl(p, 0.9, 1.1, h * 0.25, m, [at[0], h * 0.6 + 0.5 + h * 0.125 + 1.2, at[2]], 12);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.0, h * 0.14, 12), m); top.position.set(at[0], h * 0.97 + 1.7, at[2]); p.add(top);
};
/** a hanging lantern (glowing body); returns its world-local centre */
const lantern = (p: THREE.Object3D, at: V3, m: THREE.Material, dark: THREE.Material) => {
  const g = new THREE.Group(); g.position.set(...at); p.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.3, 8), m); g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.14, 8), dark); cap.position.y = 0.22; g.add(cap);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4), dark); chain.position.y = 0.58; g.add(chain);
  return g;
};
/** a mashrabiya balcony on a wall facing `dir` (+1 = +x, -1 = -x) */
const mashrabiya = (p: THREE.Object3D, x: number, y: number, z: number, dir: number, w: number, wood: THREE.Material, lat: THREE.Material) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.add(g);
  box(g, [-w / 2, 0, 0], [w / 2, 0.18, 0.75], wood); box(g, [-w / 2, 1.9, 0], [w / 2, 2.1, 0.8], wood);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, 1.7), lat); front.position.set(0, 1.04, 0.74); g.add(front);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.7), lat); side.position.set(s * (w / 2 - 0.02), 1.04, 0.38); side.rotation.y = s * Math.PI / 2; g.add(side); }
  for (const s of [-1, 1]) box(g, [s * w / 2 - 0.05, -0.5, 0], [s * w / 2 + 0.05, 0, 0.3], wood);
  return g;
};

export const buildCity = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const area = (name: string) => { const g = new THREE.Group(); g.name = name; g.position.set(...CITY_AREAS[name]); root.add(g); return g; };
  const lime = mat("#b9a383", { map: stoneTex("L", "#c2ab88", 3, 2) }), limeD = mat("#8f7a5e"), wood = mat("#5a3a22"), ironM = mat("#1e1d1f");
  const latM = new THREE.MeshBasicMaterial({ map: latticeTex(), color: new THREE.Color("#ffb060").multiplyScalar(0.42), side: THREE.DoubleSide });
  latM.map!.wrapS = latM.map!.wrapT = THREE.RepeatWrapping; latM.map!.repeat.set(2, 3);
  const lampM = glow("#ffb04a", 2.2), lampDark = mat("#2a221a"), pave = mat("#ffffff", { map: pavTex() });
  const lanterns: THREE.Object3D[] = [];
  const named = (o: THREE.Object3D, n: string) => { o.name = n; return o; };

  // =============================== STREET ===============================
  const S = area("street"), skyS = skyFor(S, 420);
  box(S, [-4.2, -0.05, -175], [4.2, 0, 14], pave);
  const facadeL = mat("#ffffff", { map: rep(windowsTex("A", 0.35), 20, 1) }), facadeR = mat("#ffffff", { map: rep(windowsTex("B", 0.3), 20, 1) });
  for (const s of [-1, 1]) {
    // ground-floor arcade along the street (arches 3 m), the upper storeys above it, mashrabiya balconies
    const a = arcade(150, 4.2, 50, 2.1, 3.5, 0.6, lime); a.rotation.y = s < 0 ? -Math.PI / 2 : Math.PI / 2; a.position.set(s * 4.2, 0, s < 0 ? -140 : 10); S.add(a);
    box(S, [s < 0 ? -9 : 7.4, 0, -140], [s < 0 ? -7.4 : 9, 4.2, 10], limeD);          // the shops' back wall behind the arcade
    box(S, [s < 0 ? -9 : 4.2, 0, -140], [s < 0 ? -4.2 : 9, 0.02, 10], pave);          // the arcade floor
    const up = box(S, [s < 0 ? -9 : 4.2, 4.2, -140], [s < 0 ? -4.2 : 9, 11, 10], s < 0 ? facadeL : facadeR); up.material = s < 0 ? facadeL : facadeR;
    box(S, [s < 0 ? -4.45 : 4.2, 4.15, -140], [s < 0 ? -4.2 : 4.45, 4.35, 10], limeD);
    for (let i = 0; i < 18; i++) { const z = 6 - i * 8 - (s > 0 ? 3 : 0); if (z < -136) break; mashrabiya(S, s * 4.2, 5.4 + (i % 3 === 0 ? 2.6 : 0), z, -s, 2.2, wood, latM); }
    for (let i = 0; i < 50; i++) { const z = 10 - (i + 0.5) * 3; lanterns.push(lantern(S, [s * 4.5, 2.9, z], lampM, lampDark)); }   // a lantern in every arch
  }
  // the market: stalls under awnings, tables with gold dishes, string lights across the street
  const awnM = [mat("#7a2a1a"), mat("#245a5a"), mat("#8a5a1a")], goldM = glow("#ffbf50", 1.6), clothM = mat("#d8c8a8");
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) { const z = -2 - i * 3.6 - (s > 0 ? 1.4 : 0), x = s * 2.75;
    box(S, [x - 0.6, 0, z - 1.3], [x + 0.6, 0.85, z + 1.3], wood);
    box(S, [x - 0.65, 0.85, z - 1.35], [x + 0.65, 0.9, z + 1.35], clothM);
    const aw = box(S, [x - 0.9, 2.3, z - 1.45], [x + 0.9, 2.36, z + 1.45], awnM[(i + (s > 0 ? 1 : 0)) % 3]); aw.rotation.z = s * 0.18;
    for (const k of [-0.8, 0, 0.8]) { const d = cyl(S, 0.16, 0.1, 0.06, goldM, [x + 0.15 * s, 0.93, z + k], 14); d.castShadow = false; }
    for (const k of [-1.2, 1.2]) box(S, [x - 0.03, 0.9, z + k - 0.03], [x + 0.03, 2.3, z + k + 0.03], wood);
  }
  for (let i = 0; i < 6; i++) { const z = -4 - i * 6;                               // feast tables in the middle of the street
    box(S, [-0.9, 0.7, z - 0.5], [0.9, 0.76, z + 0.5], wood); for (const [x, zz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) box(S, [x - 0.03, 0, z + zz - 0.03], [x + 0.03, 0.7, z + zz + 0.03], wood);
    for (const [x, zz] of [[-0.5, 0], [0, 0.15], [0.5, -0.1]]) { const d = cyl(S, 0.2, 0.14, 0.07, goldM, [x, 0.8, z + zz], 14); d.castShadow = false; } }
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), glow("#ffd080", 3.0), 400);
  { const m4 = new THREE.Matrix4(); let k = 0;
    for (let j = 0; j < 10; j++) { const z = -1 - j * 4; for (let i = 0; i <= 39; i++) { const u = i / 39, x = -4.1 + 8.2 * u, y = 4.0 - 0.9 * Math.sin(Math.PI * u); m4.makeTranslation(x, y, z + 0.4 * Math.sin(u * 6)); bulbs.setMatrixAt(k++, m4); } }
    bulbs.count = k; bulbs.layers.set(NOINK); S.add(bulbs); }
  // lamp posts along the empty stretch
  const postM = mat("#1c1c1e");
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const z = -46 - i * 7 - (s > 0 ? 3.5 : 0); cyl(S, 0.05, 0.07, 3.6, postM, [s * 3.5, 1.8, z], 8); lanterns.push(lantern(S, [s * 3.3, 3.55, z], lampM, lampDark)); }
  // lanterns strung across the middle of the street past the crossing (their reflections run down the wet stones)
  const wireM = mat("#141416");
  for (let i = 0; i < 9; i++) { const z = -90 - i * 6.5; const wire = box(S, [-4.2, 4.45, z - 0.01], [4.2, 4.47, z + 0.01], wireM, false); wire.castShadow = false; lanterns.push(lantern(S, [0, 3.7, z], lampM, lampDark)); }
  // the crossing: a stop line, a zebra, the traffic light
  box(S, [-4.2, 0, CITY.STOP_Z - 0.12], [4.2, 0.012, CITY.STOP_Z + 0.12], mat("#d8d4cc"), false);
  for (let i = 0; i < 8; i++) box(S, [-3.8 + i * 1.0, 0, CITY.STOP_Z - 2.9], [-3.4 + i * 1.0, 0.01, CITY.STOP_Z - 0.8], mat("#c8c4bc"), false);
  const L0 = CITY.LIGHT; cyl(S, 0.06, 0.08, 3.4, postM, [L0[0], 1.7, L0[2]], 8);
  box(S, [L0[0] - 0.18, 2.6, L0[2] - 0.12], [L0[0] + 0.18, 3.55, L0[2] + 0.14], mat("#161618"));
  const tl = [["#ff3020", 3.35], ["#ffa020", 3.07], ["#20ff90", 2.79]].map(([c, y]) => { const m = glow(c as string, 0.1); const s0 = new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), m); s0.position.set(L0[0], y as number, L0[2] + 0.145); S.add(s0); s0.layers.set(NOINK); return { m, c: c as string }; });
  const tlL = new THREE.PointLight("#ff3020", 0, 9, 1.5); tlL.position.set(L0[0] - 0.4, 3.1, L0[2] + 0.6); S.add(tlL);
  // the shop window (left), glowing, with shelves of shining things
  const shopG = new THREE.Group(); shopG.position.set(...CITY.SHOP); S.add(shopG);
  box(shopG, [-0.2, 0.4, -1.7], [0.05, 3.2, 1.7], limeD);
  const win = box(shopG, [0.05, 0.6, -1.5], [0.08, 2.9, 1.5], glow("#ffd9a0", 1.5), false); win.layers.set(NOINK);
  for (const y of [1.0, 1.6, 2.2]) for (let i = 0; i < 6; i++) { const it = cyl(shopG, 0.08, 0.08, 0.18, glow(i % 2 ? "#ffc040" : "#ffe8c0", 2.4), [0.2, y + 0.1, -1.25 + i * 0.5], 10); it.layers.set(NOINK); }
  box(shopG, [0.08, 2.95, -1.7], [0.6, 3.05, 1.7], mat("#3a2418"));
  const shopL = new THREE.PointLight("#ffc880", 3.0, 7, 1.4); shopL.position.set(CITY.SHOP[0] + 1.2, 2.0, CITY.SHOP[2]); S.add(shopL);
  // the cafe (right): a round table, stools, a hanging lamp
  const C0 = CITY.CAFE; cyl(S, 0.55, 0.55, 0.05, wood, [C0[0], 0.75, C0[2]], 20); cyl(S, 0.05, 0.08, 0.75, postM, [C0[0], 0.375, C0[2]], 8);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; cyl(S, 0.18, 0.18, 0.45, wood, [C0[0] + Math.cos(a) * 0.9, 0.225, C0[2] + Math.sin(a) * 0.9], 12); }
  for (let i = 0; i < 4; i++) { const g0 = cyl(S, 0.05, 0.04, 0.1, glow("#ffd890", 1.4), [C0[0] - 0.25 + i * 0.17, 0.83, C0[2] + (i % 2 ? 0.2 : -0.15)], 10); g0.castShadow = false; }
  lanterns.push(lantern(S, [C0[0], 2.4, C0[2]], lampM, lampDark));
  const cafeL = new THREE.PointLight("#ffb860", 3.0, 6, 1.5); cafeL.position.set(C0[0], 2.0, C0[2]); S.add(cafeL);
  // billboards and screens high on both facades (their pictures are drawn every frame: abstract light only)
  const screens: { cv: ReturnType<typeof liveCanvas>; mesh: THREE.Mesh; seed: number }[] = [];
  for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, z = -124 - i * 3.4, cv = liveCanvas(256, 160);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: cv.tex, color: new THREE.Color(1.6, 1.6, 1.6) }));
    m.position.set(s * 4.15, 5.6 + (i % 3) * 0.6, z); m.rotation.y = -s * Math.PI / 2; m.layers.set(NOINK); S.add(m); screens.push({ cv, mesh: m, seed: i }); }
  const screenL = new THREE.PointLight("#60c0ff", 0, 12, 1.4); screenL.position.set(0, 5, -132); S.add(screenL);
  // the crossroads: a building closing the street, the neon road (left) and the quiet road (right)
  const F = CITY.FORK_Z;
  box(S, [-5, 0, F - 14], [5, 12, F - 10], lime);
  dome(S, [0, 12, F - 12], 3.6, limeD);
  box(S, [-60, -0.05, F - 10], [60, 0, F + 4], pave); box(S, [-9, 0, F + 4], [-4.2, 9, F + 18], limeD); box(S, [4.2, 0, F + 4], [9, 9, F + 18], limeD);
  const neon = new THREE.Group(); S.add(neon); const neonCols = ["#ff2e9a", "#22e0ff", "#b040ff", "#ff2e9a"];
  for (let i = 0; i < 14; i++) { const x = -8 - i * 3.4; for (const zz of [F - 9.6, F + 3.6]) { const tube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), glow(neonCols[i % 4], 3.2)); tube.position.set(x, 3.2 + (i % 3) * 0.7, zz); neon.add(tube); } }
  box(S, [-60, 0, F - 14], [-6, 7, F - 10], limeD); box(S, [-60, 0, F + 4], [-9, 7, F + 8], limeD);
  const party = box(S, [CITY.PARTY[0] - 6, 0, CITY.PARTY[2] - 4], [CITY.PARTY[0] + 6, 9, CITY.PARTY[2] + 4], glow("#ff40b0", 0.55), false); party.layers.set(NOINK);
  neon.traverse((o) => o.layers.set(NOINK));
  const neonL = new THREE.PointLight("#ff40c0", 3.5, 26, 1.2); neonL.position.set(-16, 4, F - 3); S.add(neonL);
  box(S, [6, 0, F - 14], [60, 6, F - 10], lime); box(S, [9, 0, F + 4], [60, 6, F + 8], lime);
  for (let i = 0; i < 7; i++) { const x = 10 + i * 5; cyl(S, 0.05, 0.07, 3.4, postM, [x, 1.7, F - 9.4], 8); lanterns.push(lantern(S, [x, 3.35, F - 9.1], lampM, lampDark)); }
  const M0 = CITY.MINARET_ST; minaret(S, M0, 34, lime, lampM); dome(S, [M0[0] - 8, 8, M0[2]], 7, limeD); box(S, [M0[0] - 16, 0, M0[2] - 8], [M0[0] + 2, 8, M0[2] + 8], lime);
  const minaretL = new THREE.PointLight("#ffc070", 4, 40, 1.2); minaretL.position.set(M0[0] - 4, 22, M0[2] + 6); S.add(minaretL);
  const farS = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 60, 48, 1, true), new THREE.MeshBasicMaterial({ map: rep(skyTex("S"), 6, 1), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  farS.position.set(0, 18, -80); farS.layers.set(NOINK); S.add(farS);
  const streetL: THREE.PointLight[] = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.PointLight("#ffaa50", 2.2, 9, 1.5); l.position.set(i % 2 ? 2.6 : -2.6, 3.0, 2 - i * 6); S.add(l); streetL.push(l); }
  for (let i = 0; i < 11; i++) { const l = new THREE.PointLight("#ffa850", 2.0, 11, 1.5); l.position.set(i % 2 ? 2.8 : -2.8, 3.2, -46 - i * 10.5); S.add(l); }
  const moonS = sun(S, [0, 0, -60], 60);

  // =============================== COURTYARD ===============================
  const K = area("court"), skyK = skyFor(K, 420);
  box(K, [-13, -0.05, -14], [13, 0, 13], mat("#ffffff", { map: stoneTex("C", "#9a8a74", 8, 8) }));
  { const a = arcade(24, 5, 8, 2.2, 4.0, 0.7, lime); a.position.set(-12, 0, -11.4); K.add(a); }                       // the far arcade
  { const a = arcade(24, 5.6, 1, 2.2, 3.9, 0.7, lime); a.rotation.y = Math.PI; a.position.set(12, 0, 11.4); K.add(a); }  // the near wall: one gated opening
  for (const s of [-1, 1]) { const a = arcade(22.8, 5, 8, 2.2, 4.0, 0.7, lime); a.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; a.position.set(s * 12, 0, s < 0 ? 11.4 : -11.4); K.add(a); }
  for (const s of [-1, 1]) box(K, [s < 0 ? -16 : 12.7, 0, -14], [s < 0 ? -12.7 : 16, 6, 14], limeD);
  box(K, [-12, 5, -14], [12, 5.6, -11.4], limeD); box(K, [-12, 5, 11.4], [12, 5.6, 14.5], limeD);
  for (let i = 0; i < 8; i++) for (const [x, z] of [[-10.5 + i * 3, -11.0], [-11.0, -9.9 + i * 2.85], [11.0, -9.9 + i * 2.85]]) lanterns.push(lantern(K, [x, 3.3, z], lampM, lampDark));
  for (const x of [-1.8, 1.8]) lanterns.push(lantern(K, [x, 3.3, 10.4], lampM, lampDark));
  // the masjid behind the far arcade: facade, a great dome, the minaret
  box(K, [-10, 0, -26], [10, 11, -14], lime); dome(K, [0, 11, -20], 7.5, mat("#d6c2a0")); const fin = cyl(K, 0.12, 0.04, 2.4, lampM, [0, 19.6, -20], 8); fin.castShadow = false;
  minaret(K, [-13, 0, -22], 30, lime, lampM);
  for (let i = 0; i < 5; i++) { const w = box(K, [-6 + i * 3 - 0.6, 6, -13.95], [-6 + i * 3 + 0.6, 9, -13.9], glow("#ffb050", 1.3), false); w.layers.set(NOINK); }
  // the fountain
  cyl(K, 1.6, 1.7, 0.55, limeD, [0, 0.275, 0], 24); const water = cyl(K, 1.45, 1.45, 0.04, glow("#3a7a88", 0.7), [0, 0.52, 0], 24); water.castShadow = false; cyl(K, 0.25, 0.32, 1.2, lime, [0, 0.6, 0], 12);
  // the gate in the near (+z) wall: a pointed opening with iron bars, the city beyond
  const gate = new THREE.Group(); gate.position.set(0, 0, CITY.GATE_Z); K.add(gate);
  for (let i = -6; i <= 6; i++) { const b = cyl(gate, 0.022, 0.022, 3.6, ironM, [i * 0.16, 1.8, 0], 6); b.castShadow = true; }
  for (const y of [0.15, 1.6, 3.3]) box(gate, [-1.05, y - 0.03, -0.03], [1.05, y + 0.03, 0.03], ironM);
  for (let i = -6; i <= 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), ironM); sp.position.set(i * 0.16, 3.68, 0); gate.add(sp); }
  box(K, [-14, -0.05, 13], [14, 0, 60], pave);                                       // the lane outside going down to the city
  const farK = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 60, 48, 1, true), new THREE.MeshBasicMaterial({ map: rep(skyTex("K"), 6, 1), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  farK.position.set(0, 12, 0); farK.layers.set(NOINK); K.add(farK);
  const courtL: THREE.PointLight[] = [];
  for (const [x, z] of [[-7, -9], [7, -9], [-7, 9], [7, 9], [0, -10], [-10, 0], [10, 0]]) { const l = new THREE.PointLight("#ffaa50", 0, 11, 1.4); l.position.set(x, 3.2, z); K.add(l); courtL.push(l); }
  const sunK = sun(K, [0, 0, 0], 24);

  // =============================== CANAL ===============================
  const N = area("canal"), skyN = skyFor(N, 420);
  const W0 = CITY.CANAL_W, WY = CITY.WATER_Y;
  for (const s of [-1, 1]) {
    box(N, [s < 0 ? -12 : W0, -0.05, -120], [s < 0 ? -W0 : 12, 0, 40], pave);
    box(N, [s < 0 ? -W0 - 0.05 : W0, WY - 1, -120], [s < 0 ? -W0 : W0 + 0.05, 0, 40], lime);
    box(N, [s < 0 ? -W0 - 0.35 : W0, 0, -120], [s < 0 ? -W0 : W0 + 0.35, 0.85, 40], lime);            // the parapet
    box(N, [s < 0 ? -18 : 12, 0, -120], [s < 0 ? -12 : 18, 13, 40], s < 0 ? facadeL : facadeR);
    for (let i = 0; i < 14; i++) { const z = 30 - i * 10; mashrabiya(N, s * 12, 4.5, z, -s, 2.4, wood, latM);
      cyl(N, 0.05, 0.07, 3.6, postM, [s * (W0 + 0.7), 1.8, z - 5], 8); lanterns.push(lantern(N, [s * (W0 + 0.5), 3.55, z - 5], lampM, lampDark)); }
  }
  const waterM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#0c1a22") }); const waterP = new THREE.Mesh(new THREE.PlaneGeometry(2 * W0, 160), waterM);
  waterP.rotation.x = -Math.PI / 2; waterP.position.set(0, WY, -40); N.add(waterP); waterP.name = "canalWater";
  // the old stone bridge: one arch over the water, a gentle hump, parapets
  const bz = CITY.BRIDGE_Z, bridge = new THREE.Group(); bridge.position.set(0, 0, bz); N.add(bridge);
  { const s = new THREE.Shape(); s.moveTo(-W0 - 2, WY - 1); s.lineTo(W0 + 2, WY - 1); s.lineTo(W0 + 2, 0.0); s.quadraticCurveTo(0, 0.9, -W0 - 2, 0.0); s.lineTo(-W0 - 2, WY - 1);
    const h = new THREE.Path(); h.moveTo(-W0 + 0.2, WY - 1.01); h.lineTo(-W0 + 0.2, WY); h.quadraticCurveTo(0, 0.35, W0 - 0.2, WY); h.lineTo(W0 - 0.2, WY - 1.01); h.lineTo(-W0 + 0.2, WY - 1.01); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, -1.5); const m = new THREE.Mesh(g, lime); m.castShadow = m.receiveShadow = true; bridge.add(m); m.name = "bridgeArch"; }
  for (const zz of [-1.6, 1.4]) { const s = new THREE.Shape(); s.moveTo(-W0 - 2, 0); s.quadraticCurveTo(0, 0.9, W0 + 2, 0); s.lineTo(W0 + 2, 0.7); s.quadraticCurveTo(0, 1.6, -W0 - 2, 0.7); s.lineTo(-W0 - 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false, curveSegments: 16 }); const m = new THREE.Mesh(g, limeD); m.position.z = zz; m.castShadow = true; bridge.add(m); }
  const farN = new THREE.Mesh(new THREE.CylinderGeometry(300, 300, 60, 48, 1, true), new THREE.MeshBasicMaterial({ map: rep(skyTex("N"), 6, 1), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  farN.position.set(0, 16, -40); farN.layers.set(NOINK); N.add(farN);
  const canalL: THREE.PointLight[] = [];
  for (let i = 0; i < 6; i++) { const l = new THREE.PointLight("#ffaa50", 2.0, 10, 1.5); l.position.set(i % 2 ? 4 : -4, 3.2, 26 - i * 10); N.add(l); canalL.push(l); }
  const sunN = sun(N, [0, 0, bz], 40);

  // =============================== ROOF ===============================
  const R = area("roof"), skyR = skyFor(R, 420);
  box(R, [-6, -0.3, -6], [6, 0, 6], mat("#a8957a"));
  for (const [a, b] of [[[-6, 0, -6], [6, 0.9, -5.75]], [[-6, 0, 5.75], [6, 0.9, 6]], [[-6, 0, -6], [-5.75, 0.9, 6]], [[5.75, 0, -6], [6, 0.9, 6]]] as [V3, V3][]) box(R, a, b, lime);
  box(R, [-5, 0, 3.4], [-3.4, 2.3, 5.6], limeD); dome(R, [3.5, 0, 3.2], 1.3, lime);
  const rr = (() => { let s = 5; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  for (let i = 0; i < 160; i++) { const a = rr() * Math.PI * 2, d = 12 + rr() * 140, x = Math.cos(a) * d, z = Math.sin(a) * d, w = 5 + rr() * 9, h = -14 + rr() * 9;
    box(R, [x - w / 2, -30, z - w / 2], [x + w / 2, h, z + w / 2], rr() < 0.5 ? lime : limeD);
    if (rr() < 0.15) dome(R, [x, h, z], w * 0.38, mat("#d0bc98")); if (rr() < 0.05) minaret(R, [x, h - 0, z], 22, lime, lampM); }
  minaret(R, [-26, -14, -70], 40, lime, lampM); dome(R, [-12, -8, -74], 12, mat("#d0bc98"));
  const sunR = sun(R, [0, 0, 0], 30);

  // ---------------- apply ----------------
  const areas: Record<string, THREE.Object3D> = { street: S, court: K, canal: N, roof: R };
  const look = (lit: [number, number, number], shade: [number, number, number], fog: [string, number, number], cardGain = 0.85): SetLook =>
    ({ lit, shade, lift: [0.006, 0.012, 0.016], sat: 1.0, charTint: [lit[0] * 0.9, lit[1] * 0.92, lit[2] * 0.95], cardGain, cardPointK: 1.6, pointK: 1.4, grade: GRADE_TEAL_ORANGE, fog });
  const setSky = (u: ReturnType<typeof skyFor>, t: number, top: string, hor: string, sd: V3, sc: string, sk: number, cloud: number, cc: string, stars: number) => {
    u.uT.value = t; u.uTop.value.set(top); u.uHor.value.set(hor); u.uSun.value.set(...sd).normalize(); u.uSunCol.value.set(sc); u.uSunK.value = sk; u.uCloud.value = cloud; u.uCloudCol.value.set(cc); u.uStars.value = stars; u.uFlash.value = 0; u.uTear.value = 0; };
  const apply = (state: string, t: number): SetLook => {
    const [name, a0, b0] = state.split(":"), n = (v?: string, d = 0) => (v === undefined || v === "" ? d : Number(v));
    for (const [k, g] of Object.entries(areas)) g.visible = k === name;
    if (name === "street") {
      const light = n(a0), dim = 1 - n(b0);
      tl.forEach((x, i) => x.m.color.set(x.c).multiplyScalar((2 - i) === light ? 3.2 * dim : 0.08)); tlL.color.set(light === 2 ? "#ff3020" : light === 1 ? "#ffa020" : "#20ff90"); tlL.intensity = 2.2 * dim;
      (win.material as THREE.MeshBasicMaterial).color.set("#ffd9a0").multiplyScalar(1.5 * dim); shopL.intensity = 3.0 * dim; cafeL.intensity = 3.0 * dim; neonL.intensity = 3.5 * dim;
      neon.children.forEach((c0, i) => ((c0 as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(neonCols[Math.floor(i / 2) % 4]).multiplyScalar(3.2 * dim));
      screens.forEach(({ mesh }) => (mesh.material as THREE.MeshBasicMaterial).color.setScalar(1.6 * dim));
      screens.forEach(({ cv, seed }) => cv.redraw((g) => {                     // abstract light: colour fields sliding, flashes
        const k = t * (0.7 + 0.2 * seed), hue = (seed * 67 + Math.floor(k * 2) * 40) % 360;
        const gr = g.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, `hsl(${hue},90%,${45 + 15 * Math.sin(k * 3)}%)`); gr.addColorStop(1, `hsl(${(hue + 120) % 360},90%,35%)`);
        g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
        g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(k * 7)})`; g.fillRect(((k * 90) % 300) - 40, 30, 60, 100);
        g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, 120 + 20 * Math.sin(k * 2), 256, 12);
      }));
      screenL.intensity = 2.5 + 1.5 * Math.sin(t * 5.3); screenL.color.setHSL(((t * 0.3) % 1), 0.8, 0.6);
      setSky(skyS, t, "#060a14", "#1a2a3a", [0.2, 0.05, -1], "#ff9a50", 0.25, 0.3, "#142030", 0.4);
      moonS.aim([0, 0, -60]); moonS.setFrom([-0.4, 0.6, 0.5]); moonS.light.color.set("#6a9ab0"); moonS.light.intensity = 0.35;
      return look([0.62, 0.7, 0.78], [0.15, 0.19, 0.23], ["#10222a", 18, 140], 0.85);
    }
    if (name === "court") {
      const night = n(a0), lk = 0.4 + 0.6 * night;
      courtL.forEach((l) => (l.intensity = 2.4 * lk));
      setSky(skyK, t, night > 0.5 ? "#081020" : "#1c3048", night > 0.5 ? "#2a3a48" : "#e88a48", [0, 0.06, 1], "#ff9050", 1.4 * (1 - night), 0.35, "#3a3040", 0.5 * night);
      sunK.aim([0, 0, 0]); sunK.setFrom([0.2, 0.25, 1]); sunK.light.color.set(night > 0.5 ? "#5a8aa8" : "#ff9a5a"); sunK.light.intensity = night > 0.5 ? 0.35 : 1.3;
      return look(night > 0.5 ? [0.6, 0.62, 0.68] : [1.15, 0.85, 0.65], [0.08, 0.12, 0.15], night > 0.5 ? ["#0c1418", 20, 120] : ["#3a3038", 30, 200]);
    }
    if (name === "canal") {
      const gold = n(a0), storm = n(b0);
      canalL.forEach((l) => (l.intensity = 2.0 * (1 - gold)));
      if (gold > 0.5) { setSky(skyN, t, "#2a4a6a", "#ffa850", [0.15, 0.08, -1], "#ffb060", 1.6, 0.35, "#e0a070", 0);
        sunN.aim([0, 0, CITY.BRIDGE_Z]); sunN.setFrom([0.25, 0.2, -1]); sunN.light.color.set("#ffb060"); sunN.light.intensity = 2.0;
        return look([1.35, 0.95, 0.62], [0.16, 0.18, 0.22], ["#c08a58", 30, 200], 0.95); }
      setSky(skyN, t, "#040810", "#14222c", [0, 0.05, -1], "#ff9050", 0.1, 0.6 + 0.3 * storm, "#0c1820", 0.1);
      sunN.aim([0, 0, 0]); sunN.setFrom([-0.3, 0.6, 0.4]); sunN.light.color.set("#5a8aa0"); sunN.light.intensity = 0.3;
      return look([0.5, 0.58, 0.66], [0.06, 0.09, 0.12], ["#08141a", 10 - 4 * storm, 80 - 40 * storm], 0.8);
    }
    const s = n(a0);                                                          // the roof at sunrise
    setSky(skyR, t, "#3a5a80", "#ffb060", [0.0, 0.04 + 0.12 * s, -1], "#ffd080", 1.5 + 1.2 * s, 0.25, "#ffc890", 0);
    sunR.aim([0, 0, 0]); sunR.setFrom([0.0, 0.12 + 0.2 * s, -1]); sunR.light.color.set("#ffb868"); sunR.light.intensity = 2.0 + s;
    return look([1.4, 1.0, 0.66], [0.2, 0.2, 0.24], ["#e0a070", 60, 320], 0.95);
  };
  void lanterns; void named; void streetL;
  root.userData.lanterns = lanterns;
  return { id: "city", root, offset, apply };
};
