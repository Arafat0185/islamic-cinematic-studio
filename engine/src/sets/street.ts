// A city street: a sidewalk along x (z 0..2.2, kerb 0.14 m), a two-lane road (z 2.2..9), a row of buildings with
// window facades and awnings behind the sidewalk, distant towers, street lamps, trees, a bus stop and a crossing.
// Local coordinates: he walks along +x on the sidewalk (z ~ 0.9); cameras stand in the road (z ~ 7.5) looking -z.
// States: "dawn" (before Fajr: deep blue, lamps lit), "morning" (cool, high sun from the front left), "afternoon" (warm, lower sun from the right), "night" (a dark
// sky, every shop window glowing with its display, the street lamps lit, warm light spilling onto the pavement).
// Traffic: setTraffic([...]) - each vehicle is at x = passX + speed * (t - passAt), in lane z, so a car can be timed
// to cross the frame exactly on a sound effect.
import * as THREE from "three";
import { ctex, rep } from "../draw/paint";
import type { V3 } from "../camera/ease";
import { StorySet, SetLook, GRADE_DAY, GRADE_DUSK, mat, glow, box, cyl, sun, skyDome, facade, lightBeam, dust } from "./common";
import { GRADE_NIGHT } from "../render/grade";

export const STREET = { WALK_Z: 0.9, KERB: 0.14, LANE_NEAR: 3.4, LANE_FAR: 5.3 };
export type Vehicle = { kind: "car" | "bus"; passAt: number; passX: number; speed: number; lane: number; colour?: string };

const asphalt = () => { const t = rep(ctex("asphalt", 512, 512, (g, r) => {
  g.fillStyle = "#3d4049"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "20,22,28" : "120,124,135"},${0.15 + 0.2 * r()})`; const x = r() * 512, y = r() * 512; for (const dx of [0, -512]) g.fillRect(x + dx, y, 3, 3); }
}), 30, 3); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t; };
const paving = () => { const t = rep(ctex("paving", 512, 512, (g) => {
  g.fillStyle = "#8e8b84"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#76736c"; g.lineWidth = 8;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
}), 60, 1.1); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; return t; };

const vehicleMesh = (kind: "car" | "bus", colour: string) => {
  const g = new THREE.Group(), body = mat(colour), glass = mat("#24324a"), tyre = mat("#17181c");
  if (kind === "car") {
    box(g, [-2.1, 0.3, -0.85], [2.1, 1.05, 0.85], body);
    box(g, [-1.1, 1.05, -0.78], [1.0, 1.55, 0.78], glass);
    box(g, [-1.15, 1.53, -0.8], [1.05, 1.6, 0.8], body);
    for (const x of [-1.35, 1.35]) for (const z of [-0.86, 0.86]) { const w = cyl(g, 0.34, 0.34, 0.24, tyre, [x, 0.34, z], 14); w.rotation.x = Math.PI / 2; }
  } else {
    box(g, [-5.6, 0.35, -1.25], [5.6, 3.0, 1.25], body);
    box(g, [-5.0, 1.55, 1.24], [5.3, 2.45, 1.27], glass, false);
    box(g, [-5.6, 2.95, -1.2], [5.6, 3.1, 1.2], mat("#e9e6de"));
    for (const x of [-3.8, 3.8]) for (const z of [-1.2, 1.2]) { const w = cyl(g, 0.48, 0.48, 0.3, tyre, [x, 0.48, z], 14); w.rotation.x = Math.PI / 2; }
  }
  return g;
};

/** a lit shop window at night: a warm interior, shelves of goods, a price banner (no people) */
const SHOP_SIGNS = ["SALE", "-50%", "NEW", "GOLD", "LUXE", "DEALS"];
const shopWindow = (k: number) => ctex("shopWin|" + k, 512, 256, (g, r) => {
  const warm = ["#ffcf8a", "#ffd9a8", "#ffe6c4", "#ffc06a"][k % 4];
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, warm); gr.addColorStop(1, "#c9783a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let y = 70; y < 256; y += 70) { g.fillStyle = "#6b4630"; g.fillRect(0, y, 512, 8);
    for (let x = 12; x < 500;) { const w = 18 + r() * 40, h = 20 + r() * 34; g.fillStyle = ["#4D312C", "#FB5606", "#2f5d8a", "#e9e1cf", "#7a2f2c", "#3f6b4b"][Math.floor(r() * 6)]; g.fillRect(x, y - h, w, h); x += w + 8; } }
  g.fillStyle = "#FB5606"; g.fillRect(150, 14, 212, 40); g.fillStyle = "#ffffff"; g.font = "900 30px Inter, Arial"; g.textAlign = "center"; g.fillText(SHOP_SIGNS[k % SHOP_SIGNS.length], 256, 45);
});

export const buildStreet = (offset: V3) => {
  const root = new THREE.Group(); root.position.set(...offset);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 7.6), mat("#ffffff", { map: asphalt() }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 5.6); road.receiveShadow = true; root.add(road);
  for (let x = -110; x < 110; x += 6) box(root, [x, 0.001, 5.55], [x + 3, 0.012, 5.65], mat("#e8e2cf"), false); // centre dashes
  for (let k = 0; k < 7; k++) box(root, [7.2 + k * 0.7, 0.001, 2.4], [7.6 + k * 0.7, 0.012, 8.8], mat("#e8e2cf"), false); // crossing
  const walk = new THREE.Mesh(new THREE.BoxGeometry(240, STREET.KERB, 2.4), [mat("#8e8b84"), mat("#8e8b84"), mat("#ffffff", { map: paving() }), mat("#8e8b84"), mat("#9b978f"), mat("#8e8b84")]);
  walk.position.set(0, STREET.KERB / 2 - 0.02, 1.0); walk.receiveShadow = true; root.add(walk);
  box(root, [-120, -0.02, 9.0], [120, STREET.KERB - 0.02, 11.0], mat("#8e8b84"));
  // buildings: fronts at z = -0.2, varied widths, heights and colours; awnings on some shop fronts
  const walls = ["#c8b9a2", "#b9c2c9", "#d2b49a", "#a9b6a4", "#c9a9a3", "#bfb7c9"];
  const shops: { mesh: THREE.Mesh; day: THREE.Material; night: THREE.Material }[] = [];
  let s = 5; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let x = -70; x < 70;) {
    const w = 6 + Math.floor(r() * 7), h = 7 + Math.floor(r() * 4) * 3, i = Math.floor(r() * walls.length);
    const front = mat("#ffffff", { map: facade("b" + i + "_" + w + "_" + h, walls[i], Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 3)), 0.2) });
    const plain = mat(walls[i]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, h, 6), [plain, plain, mat("#6f6a64"), plain, front, plain]);
    m.position.set(x + w / 2, h / 2 - 0.02, -3.2); m.castShadow = true; m.receiveShadow = true; root.add(m);
    const sw = box(root, [x + 0.1, -0.02, -0.25], [x + w - 0.25, 2.7, -0.15], mat("#7d8fa8"), false); // ground floor shop window
    shops.push({ mesh: sw, day: sw.material as THREE.Material, night: glow("#ffffff", 1.25, shopWindow(shops.length)) });
    box(root, [x + 0.1, 2.6, -0.26], [x + w - 0.25, 2.75, -0.14], mat("#4a4f5c"), false); // its frame
    box(root, [x + w / 2 - 0.5, -0.02, -0.27], [x + w / 2 + 0.5, 2.2, -0.13], mat("#5a4636"), false); // a door
    if (r() < 0.6) box(root, [x + 0.3, 2.78, -0.2], [x + w - 0.45, 2.93, 0.9], mat(["#9c3d38", "#2f5d73", "#c79c48", "#3f6b4b"][Math.floor(r() * 4)]));
    x += w;
  }
  for (let x = -90; x < 90; x += 14 + r() * 10) { // distant towers, pale with distance
    const h = 22 + r() * 30, w = 8 + r() * 6;
    box(root, [x, -0.02, -40 - r() * 15], [x + w, h, -32], mat(["#aeb9cc", "#c3c4cf", "#b6b2bf"][Math.floor(r() * 3)]), false);
  }
  // street furniture
  const lampHeads: { mesh: THREE.Mesh; day: THREE.Material }[] = [], lampGlow = glow("#ffe2a8", 2.4);
  const iron = mat("#2d3138"), leaf = mat("#4b7a4f"), bark = mat("#6a5038");
  for (let x = -60; x < 60; x += 10) {
    cyl(root, 0.06, 0.08, 4.2, iron, [x, 2.1, 1.95], 8);
    box(root, [x - 0.05, 4.1, 1.95], [x + 0.05, 4.18, 2.9], iron);
    const head = box(root, [x - 0.2, 3.95, 2.7], [x + 0.2, 4.12, 3.0], mat("#e9e1c9"));
    lampHeads.push({ mesh: head, day: head.material as THREE.Material });
    cyl(root, 0.1, 0.13, 2.6, bark, [x + 5, 1.3, 1.85], 8);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), leaf); c.position.set(x + 5, 3.3, 1.85); c.castShadow = true; c.receiveShadow = true; root.add(c);
  }
  // more street life: parked cars, a traffic light, bicycles, benches, signs, hydrants
  const parked = ["#7a8fa8", "#b8423b", "#e6e1d4", "#3f6b4b", "#3a3d45"];
  for (let k = 0; k < 9; k++) {
    const x = -48 + k * 11.5 + (k % 3), c = mat(parked[k % 5]), glass = mat("#24324a");
    box(root, [x - 2.0, 0.3, 2.45], [x + 2.0, 1.0, 3.95], c); box(root, [x - 1.0, 1.0, 2.55], [x + 0.9, 1.45, 3.85], glass);
    for (const dx of [-1.3, 1.3]) for (const z of [2.42, 3.98]) { const w = cyl(root, 0.32, 0.32, 0.18, mat("#17181c"), [x + dx, 0.32, z], 12); w.rotation.x = Math.PI / 2; }
  }
  cyl(root, 0.07, 0.07, 3.2, iron, [6.8, 1.6, 2.0], 8); box(root, [6.62, 2.6, 1.9], [6.98, 3.5, 2.1], iron);
  for (const [y, c] of [[3.32, "#c0392b"], [3.05, "#f1c40f"], [2.78, "#27ae60"]] as [number, string][]) cyl(root, 0.11, 0.11, 0.03, mat(c), [6.8, y, 2.12], 12).rotation.x = Math.PI / 2;
  for (const x of [-15, 22, 37]) { box(root, [x, 0.42, 0.25], [x + 1.6, 0.48, 0.6], mat("#6a5038")); box(root, [x, 0.48, 0.2], [x + 1.6, 0.85, 0.26], mat("#6a5038")); }
  for (const x of [-9, 30]) { cyl(root, 0.12, 0.14, 0.6, mat("#b8423b"), [x, 0.43, 1.95], 10); }
  for (const x of [-30, 3, 26]) { cyl(root, 0.03, 0.03, 2.4, iron, [x, 1.33, 0.35], 6); box(root, [x - 0.35, 2.2, 0.32], [x + 0.35, 2.6, 0.38], mat("#2f5d8a")); }
  for (const x of [16, 44]) { const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 20), iron); r1.position.set(x, 0.46, 0.4); root.add(r1);
    const r2 = r1.clone(); r2.position.x = x + 1.0; root.add(r2); box(root, [x, 0.6, 0.38], [x + 1.0, 0.64, 0.42], iron); }
  // sun shafts between the buildings, haze and dust in the air
  const shafts = [-20, -6, 8, 24, 40].map((x) => lightBeam(root, [x, 9, -1.0], [x + 3, 0, 3.5], 2.2, 3.2, "#fff2d8", 0.13));
  const motes = dust(root, [-60, 0.5, 0], [60, 4, 5], 700, "#fff4e0", 0.022, 0.9);
  box(root, [11.5, 0.12, 0.3], [14.5, 2.5, 0.4], mat("#9fb4c4")); box(root, [11.4, 2.5, 0.1], [14.6, 2.6, 1.3], iron); // bus stop
  box(root, [-4.2, 0.12, 1.6], [-3.7, 1.0, 2.0], mat("#3b5f4a")); // bin
  const sky = skyDome(root, 160);
  const s2 = sun(root, [0, 0, 0], 22);
  // traffic
  let traffic: { v: Vehicle; mesh: THREE.Group }[] = [];
  const setTraffic = (list: Vehicle[]) => {
    for (const t of traffic) root.remove(t.mesh);
    traffic = list.map((v, i) => { const m = vehicleMesh(v.kind, v.colour ?? ["#b8423b", "#e6e1d4", "#2f5d8a", "#3a3d45", "#c79c48"][i % 5]); m.userData.moving = true; root.add(m); return { v, mesh: m }; });
  };
  // night: warm light from the shop windows onto the pavement (a few lights that follow the action) and lamp pools
  const nightLights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight("#ffb866", 0, 9, 1.6); root.add(l); return l; });
  const lampBeams = [-20, -10, 0, 10, 20].map((x) => lightBeam(root, [x, 4.0, 2.85], [x + 0.2, 0, 2.5], 0.3, 2.6, "#ffe2a8", 0.2));
  let followX = 0;
  const apply = (state: string, t: number): SetLook => {
    const night = state === "night" || state === "dawn", dawn = state === "dawn";
    for (const { v, mesh } of traffic) { mesh.position.set(v.passX + v.speed * (t - v.passAt), 0, v.lane); mesh.rotation.y = v.speed < 0 ? Math.PI : 0; }
    for (const sh of shops) sh.mesh.material = night ? sh.night : sh.day;
    for (const lh of lampHeads) lh.mesh.material = night ? lampGlow : lh.day;
    nightLights.forEach((l, i) => { l.intensity = night ? 7 : 0; l.position.set(followX - 6 + i * 4.5, 1.6, 0.4); });
    for (const b of lampBeams) b.setLevel(night ? 1 : 0);
    motes.update(t); for (const s3 of shafts) s3.setLevel(night ? 0 : state === "afternoon" ? 1.2 : 0.9);
    if (dawn) { // before Fajr: deep blue sky lightening at the horizon, lamps and some windows still lit
      sky.setColours("#0f1c3f", "#4a5c94"); s2.setFrom([0.3, 1.3, 0.8]);
      return { lit: [0.2, 0.23, 0.4], shade: [0.07, 0.08, 0.16], lift: [0.012, 0.014, 0.032], sat: 0.95, charTint: [0.85, 0.88, 1.0], cardGain: 0.95, cardPointK: 1.3, pointK: 1.2, grade: GRADE_NIGHT, fog: ["#22305c", 10, 60] };
    }
    if (night) {
      sky.setColours("#060a1c", "#1c2448"); s2.setFrom([0.3, 1.3, 0.8]);
      return { lit: [0.12, 0.13, 0.22], shade: [0.04, 0.045, 0.09], lift: [0.008, 0.008, 0.018], sat: 1.0, charTint: [0.95, 0.9, 0.86], cardGain: 0.9, cardPointK: 1.4, pointK: 1.3, grade: GRADE_NIGHT, fog: ["#141a36", 10, 60] };
    }
    if (state === "afternoon") {
      sky.setColours("#5e8fcf", "#f2cf9c"); s2.setFrom([1.0, 0.75, 0.7]);
      return { lit: [1.25, 0.98, 0.72], shade: [0.3, 0.3, 0.46], lift: [0.03, 0.02, 0.04], sat: 1.05, charTint: [1, 0.92, 0.82], cardGain: 1.0, grade: GRADE_DUSK, fog: ["#f0d2a8", 14, 75] };
    }
    sky.setColours("#4f8fd8", "#cfe2f2"); s2.setFrom([-0.55, 1.2, 0.9]);
    return { lit: [1.12, 1.08, 0.98], shade: [0.34, 0.36, 0.52], lift: [0.02, 0.025, 0.05], sat: 1.0, charTint: [1, 0.98, 0.95], cardGain: 1.0, grade: GRADE_DAY, fog: ["#cfe0ef", 14, 75] };
  };
  // the sun's shadow box follows the action along the street
  const follow = (x: number) => { s2.aim([x, 0, 1]); followX = x; };
  return { set: { id: "street", root, offset, apply } as StorySet, setTraffic, follow, sun: s2 };
};
