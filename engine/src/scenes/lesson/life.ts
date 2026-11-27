// Video 007 "The Lesson": everything that moves, per frame, on top of the sets.
//  hospital  rain running down the glass (the front pane the camera pushes through, and the tall window), heavier on the
//            hardest lines and catching gold at the end; the IV drip falling in slow motion; lightning; the REAL gold: a
//            small glow in his chest that grows until its warm light fills the room
//  dunes     the ghost-gold worldly things (car, house, palace, the row of servants, cars and palaces) appearing and
//            crumbling into sand; blowing sand (crest spray, ground drift, the sandstorm); sand trickling into a low
//            hollow; his golden footprints at dawn; the stone foundation laid in the sand, which the sand never covers
//  exterior  gold dust in the first light
// Everything here sits on the NOINK layer (no outlines, no camera collision) except the foundation's stones.
import * as THREE from "three";
import type { Frame } from "../../story/story";
import type { SetId } from "../../story/story";
import { NOINK } from "../../render/ink";
import { mat, liveCanvas } from "../../sets/common";
import { duneH } from "../../sets/lesson";
import { clamp01, smooth } from "../../camera/ease";
import { ghost, drift, CAR, HOUSE, PALACE, SERVANT, type Ghost } from "./fx3d";
import { FPS, EV, shotOf, spanOf, CHEST, IV_DRIP, FRONT_GLASS_X, CAR_AT, HOUSE_AT, PALACE_AT, ROW, ROW_Z, rowCrumbleAt, CREST, LONE, HOLLOW, FOUNDATION, walkZ, WALK0 } from "./timeline";

const fract = (x: number) => x - Math.floor(x);
const hsh = (n: number) => fract(Math.sin(n * 127.1) * 43758.5453);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const softTex = (() => { let t: THREE.Texture | null = null; return () => t ??= (() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })(); })();
const additive = (c: string, k = 1, map: THREE.Texture | null = softTex()) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(c).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const noink = <T extends THREE.Object3D>(o: T) => { o.layers.set(NOINK); o.traverse((c) => c.layers.set(NOINK)); return o; };

// ---------------- rain on glass: a live canvas (drops that cling and slide, streaks) ----------------
const rainGlass = () => {
  const lc = liveCanvas(512, 768), N = 260;
  const drops = Array.from({ length: N }, (_, i) => ({ x: hsh(i) * 512, y0: hsh(i + 1) * 768, r: 2 + 7 * Math.pow(hsh(i + 2), 2), v: 30 + 160 * hsh(i + 3), stick: hsh(i + 4) }));
  const draw = (t: number, heavy: number, gold: number) => lc.redraw((g) => {
    g.clearRect(0, 0, 512, 768);
    g.fillStyle = `rgba(150,165,185,${0.05 + 0.05 * heavy})`; g.fillRect(0, 0, 512, 768);          // a faint mist on the glass
    const tint = (a: number) => gold > 0 ? `rgba(${Math.round(lerp(205, 255, gold))},${Math.round(lerp(220, 196, gold))},${Math.round(lerp(240, 120, gold))},${a})` : `rgba(205,220,240,${a})`;
    const n = Math.round(N * (0.45 + 0.55 * heavy));
    for (let i = 0; i < n; i++) { const d = drops[i];
      const slide = d.stick > 0.55 ? d.v * (0.6 + 0.6 * heavy) : 0, y = ((d.y0 + slide * t) % 820) - 30;
      if (slide > 0) { g.strokeStyle = tint(0.12); g.lineWidth = d.r * 0.7; g.beginPath(); g.moveTo(d.x, y - 30 - d.v * 0.25); g.lineTo(d.x + Math.sin(y * 0.03 + i) * 2, y); g.stroke(); }
      const gr = g.createRadialGradient(d.x - d.r * 0.3, y - d.r * 0.3, 0, d.x, y, d.r);
      gr.addColorStop(0, tint(0.75)); gr.addColorStop(0.6, tint(0.25)); gr.addColorStop(1, tint(0));
      g.fillStyle = gr; g.beginPath(); g.arc(d.x, y, d.r, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 40 * heavy; i++) { const x = hsh(i + 900) * 512, y = fract(hsh(i + 901) + t * (1.4 + hsh(i + 902))) * 900 - 60;   // fresh streaks running down
      g.strokeStyle = tint(0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 70); g.lineTo(x, y); g.stroke(); }
  });
  return { tex: lc.tex, draw };
};

export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const H = roots.hospital!, L = roots.lesson!;
  for (const n of ["hospPillow", "hospSheet"]) { const o = H.getObjectByName(n); if (o) o.visible = false; }   // his card draws its own
  const D = L.getObjectByName("dunes")!, X = L.getObjectByName("exterior")!;

  // =============================== the hospital ===============================
  const rg = rainGlass();
  const glassM = new THREE.MeshBasicMaterial({ map: rg.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const paneG = new THREE.Group(); paneG.position.set(FRONT_GLASS_X, 0, -1.3); paneG.rotation.y = Math.PI / 2; H.add(paneG);   // beside the bed, facing it
  const front = noink(new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2), glassM)); front.position.set(0, 1.5, 0); paneG.add(front);
  const frame = new THREE.Group(); paneG.add(frame);                                // the window frame round the pane (dark, out of focus)
  for (const [x0, y0, x1, y1] of [[-2.3, 0, -1.6, 3.1], [1.6, 0, 2.3, 3.1], [-2.3, 2.75, 2.3, 3.1], [-2.3, 0, 2.3, 0.35], [-0.03, 0.35, 0.03, 2.75]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), mat("#2a2e34")); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.04); frame.add(m); }
  noink(frame);
  const backRain = noink(new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.58), new THREE.MeshBasicMaterial({ map: rg.tex, transparent: true, depthWrite: false, fog: false }))); backRain.position.set(-1.6, 1.5, -2.375); H.add(backRain);
  const flashPane = noink(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), new THREE.MeshBasicMaterial({ color: "#dfe8ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); flashPane.position.set(-1.6, 1.5, -2.37); H.add(flashPane);
  const bolt = new THREE.PointLight("#cfdcff", 0, 9, 1.2); bolt.position.set(-1.6, 1.8, -1.9); H.add(bolt);
  // the IV drip chamber: glass, the fluid line, a drop forming and falling slowly
  const ivG = new THREE.Group(); ivG.position.set(...IV_DRIP); H.add(ivG);
  const glassC = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.11, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#bcd0e4", transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); ivG.add(glassC);
  const rimM = additive("#e6eef8", 0.5, null);
  for (const y of [-0.055, 0.055]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0025, 8, 24), rimM); ring.rotation.x = Math.PI / 2; ring.position.y = y; ivG.add(ring); }
  const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 20), new THREE.MeshBasicMaterial({ color: "#a8c0d8", transparent: true, opacity: 0.4 })); fluid.position.y = -0.04; ivG.add(fluid);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 8), new THREE.MeshBasicMaterial({ color: "#b8c8d8", transparent: true, opacity: 0.35 })); tube.position.y = -0.51; ivG.add(tube);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.02, 8), mat("#c8ccd0")); spout.position.y = 0.045; ivG.add(spout);
  const dropM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e8f2ff").multiplyScalar(1.4) });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 10), dropM); ivG.add(drop);
  const dropGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: "#c8dcff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); dropGlow.scale.setScalar(0.03); ivG.add(dropGlow);
  noink(ivG);
  const ivL = new THREE.PointLight("#c8dcf0", 0, 0.7, 2); ivL.position.set(IV_DRIP[0] + 0.15, IV_DRIP[1] + 0.05, IV_DRIP[2] + 0.2); H.add(ivL);
  // the real gold: in his chest (a small warm glow, then a light that fills the room)
  const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color("#ffb347").multiplyScalar(2.2), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); heart.position.set(...CHEST); heart.renderOrder = 5; noink(heart); H.add(heart);
  const heartCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color("#fff0c8").multiplyScalar(2.6), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); heartCore.position.set(...CHEST); heartCore.renderOrder = 6; noink(heartCore); H.add(heartCore);
  const heartL = new THREE.PointLight("#ffb050", 0, 2, 1.6); heartL.position.set(CHEST[0] + 0.15, CHEST[1] + 0.25, CHEST[2] + 0.15); H.add(heartL);
  const roomL = new THREE.PointLight("#ffb860", 0, 7, 1.2); roomL.position.set(0.3, 1.9, -0.9); H.add(roomL);

  // =============================== the dunes ===============================
  const at = (g: Ghost, p: [number, number, number], rotY = 0) => { g.group.position.set(...p); g.group.rotation.y = rotY; D.add(g.group); return g; };
  const car = at(ghost(CAR, { grains: 30000, dir: [-1, 0, 0], span: 1.1, seed: 11 }), CAR_AT);
  const house = at(ghost(HOUSE, { grains: 46000, dir: [0, -1, 0], span: 1.7, seed: 12, life: 2.6 }), HOUSE_AT, -0.35);
  const palace = at(ghost(PALACE(1), { grains: 110000, dir: [0, -1, 0.15], span: 1.5, seed: 13, life: 3.6 }), PALACE_AT, 0.2);
  const row = ROW.map(([k, x, s], i) => {
    const prims = k === "palace" ? PALACE(s) : k === "car" ? CAR : SERVANT(s), grains = k === "palace" ? 26000 : k === "car" ? 15000 : 4500;
    return at(ghost(prims, { grains, dir: k === "servant" ? [0, -1, 0] : [1, -0.4, 0], span: k === "palace" ? 1.0 : 0.8, seed: 20 + i, life: 3.0 }), [x, 0, ROW_Z + (k === "palace" ? -6 : k === "car" ? -1 : 2)], k === "car" ? 0.25 : 0);
  });
  const ghosts = [car, house, palace, ...row];
  // blowing sand
  const spray = drift(5000, 5), storm = drift(45000, 6), ground = drift(9000, 7), motes = drift(2500, 8);
  for (const d of [spray, storm, ground, motes]) D.add(d.points);
  const motesX = drift(1800, 9); X.add(motesX.points);
  // sand trickling into the hollow
  const NT = 2200, tp = new Float32Array(NT * 3), tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.BufferAttribute(tp, 3));
  const trickle = noink(new THREE.Points(tg, new THREE.PointsMaterial({ map: softTex(), color: new THREE.Color("#a8a49c"), size: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); trickle.frustumCulled = false; D.add(trickle);
  // golden footprints
  const NF = 36, prints: THREE.Mesh[] = [];
  const printM = (i: number) => additive("#ffa030", 0.85 + 0.08 * (i % 3));
  for (let i = 0; i < NF; i++) { const m = noink(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.27), printM(i))); m.rotation.x = -Math.PI / 2; D.add(m); prints.push(m); }
  const printZ = (i: number) => WALK0 - 0.25 - i * 0.36, printX = (i: number) => 0.2 + (i % 2 ? 0.09 : -0.09);
  // the foundation: six stones laid in the sand, gold light in the seams
  const fnd = new THREE.Group(); fnd.position.set(...FOUNDATION); D.add(fnd);
  const stoneM = mat("#8f877b"), stones: THREE.Mesh[] = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.46, 0.98), stoneM); s.castShadow = s.receiveShadow = true; s.userData.home = new THREE.Vector3(-1.42 + i * 1.42, 0.2, -0.5 + j * 1.0); fnd.add(s); stones.push(s); }
  const seamM = additive("#ffb347", 1.1, null), seams = new THREE.Group(); fnd.add(seams);
  for (const x of [-0.71, 0.71]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 1.99), seamM); m.position.set(x, 0.2, 0); seams.add(m); }
  { const m = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.48, 0.06), seamM); m.position.set(0, 0.2, 0); seams.add(m); }
  const rim = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.02, 2.16), additive("#ffb347", 0.9, null)); rim.position.y = 0.44; seams.add(rim);
  noink(seams);
  const fndL = new THREE.PointLight("#ffb050", 0, 6, 1.5); fndL.position.set(0, 1.2, 0.8); fnd.add(fndL);

  return {
    update: (fr: Frame, f: number) => {
      const sh = shotOf(f), k = sh.kind, t = f / FPS;
      // ---------------- hospital ----------------
      if (fr.set === "hospital") {
        const heavy = k === "rainGlass" ? 1 : k === "windowPush" || k === "fingersSheet" ? 0.65 : 0.45;
        const goldK = k === "roomGold" ? smooth((t - spanOf("roomGold").from / FPS) / 1.6) : 0;
        rg.draw(t, heavy, goldK);
        front.visible = frame.visible = k === "windowPush" || k === "rainGlass";
        // lightning (two flashes) and the window
        const lf = (x: number) => (x >= 0 && x < 0.5 ? Math.exp(-x / 0.12) : 0), fl = Math.max(...(EV.lightning as number[]).map((l) => lf(t - l)));
        bolt.intensity = 9 * fl; (flashPane.material as THREE.MeshBasicMaterial).opacity = 0.9 * fl;
        backRain.material.color.set("#ffffff").lerp(new THREE.Color("#ffc070"), goldK).multiplyScalar(1 + 0.6 * goldK);
        // the IV drip: one drop every 2.4 s, forming then falling slowly (the shot is in slow motion)
        const ph = fract(t / 2.4), grow = Math.min(1, ph / 0.55), fall = Math.max(0, ph - 0.55) / 0.45;
        drop.scale.setScalar(0.5 + 0.5 * grow); drop.position.y = 0.032 - 0.068 * fall * fall; dropGlow.position.copy(drop.position);
        ivL.intensity = k === "ivDrip" ? 0.5 : 0; ivG.visible = true;
        // the gold in his chest: tiny, then growing until it fills the room
        const s = (kk: string) => spanOf(kk), from = (kk: string) => s(kk).from / FPS;
        let g = 0;
        if (k === "chestOrbit") g = 0.12 + 0.1 * smooth((t - from("chestOrbit")) / 4);
        else if (k === "topDown" || k === "monitorLine" || k === "fingersSheet") g = 0.14;
        else if (k === "chestGold") g = lerp(0.25, 0.7, smooth((t - from("chestGold")) / 1.7));
        else if (k === "roomGold") g = lerp(0.7, 1.6, smooth((t - from("roomGold")) / 2.0));
        const pulse = 1 + 0.08 * Math.sin(t * 2.6);
        heart.visible = heartCore.visible = g > 0;
        heart.scale.setScalar(0.12 * g * pulse * (k === "roomGold" ? 1.6 : 1)); heartCore.scale.setScalar(0.04 * g * pulse);
        heartL.intensity = 1.4 * g; heartL.distance = 1.2 + 2.5 * g;
        roomL.intensity = k === "roomGold" ? 4.2 * goldK : k === "chestGold" ? 0.5 * smooth((t - from("chestGold")) / 1.7) : 0;
      }
      // ---------------- dunes ----------------
      if (fr.set === "lesson") {
        const dunes = fr.state.startsWith("dunes"), dawn = fr.state.startsWith("dunes:1"), off = { fade: 0 };
        for (const gh of ghosts) gh.set(off);
        const flick = 0.92 + 0.08 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
        if (k === "carCrumble") car.set({ fade: 1, appear: smooth((t - EV.carAppear) / 0.6), crumble: t - EV.carCrumble, glow: flick, wind: [1.6, 0.25, 0.5], grav: 1.6, ground: 0, size: 0.045 });
        if (k === "houseRise") { const rise = smooth((t - EV.houseRise[0]) / (EV.houseRise[1] - EV.houseRise[0])); house.group.position.y = -6.8 * (1 - rise);
          house.set({ fade: 1, appear: 1, crumble: t - EV.housePour, glow: 0.62 * flick * (1 + 0.2 * rise), wind: [0.35, 0, 0.12], grav: 4.5, ground: 0, size: 0.06 }); }
        if (k === "palace") palace.set({ fade: 1, appear: smooth((t - spanOf("palace").from / FPS) / 0.8), crumble: t - EV.palaceCollapse, glow: flick, wind: [7, 1.4, 2.5], grav: 3.0, ground: 0, size: 0.13 });
        if (k === "ghostRow" || k === "crumbleRow" || k === "windAway") row.forEach((gh, i) => gh.set({ fade: 1, appear: smooth((t - EV.rowAppear - 0.15 * i) / 0.9), crumble: t - rowCrumbleAt(i), glow: flick * 0.85,
          wind: [3.2, 0.5, 0.9], grav: 2.2, ground: 0, size: (ROW[i][0] === "palace" ? 0.09 : 0.05) * (k === "windAway" ? 2.2 : 1) }));
        // blowing sand per shot
        const focus = fr.plan.focus.map((v, i) => v - (D.getWorldPosition(new THREE.Vector3()).toArray()[i])) as [number, number, number];
        spray.set({ opacity: 0 }); storm.set({ opacity: 0 }); ground.set({ opacity: 0 }); motes.set({ opacity: 0 });
        if (k === "duneCrest") spray.set({ origin: [CREST[0], CREST[1] - 0.2, CREST[2] + 1.0], size: [34, 2.2, 10], flow: [0, 0, -7], t, opacity: 1.0, colour: "#d4d0c8", lift: 0.6, grain: 0.12, avoid: null });
        if (k === "aloneDune") spray.set({ origin: [LONE[0], LONE[1] - 0.2, LONE[2] + 0.5], size: [40, 2.5, 10], flow: [0, 0, -6], t, opacity: 0.6, colour: "#b0aca4", lift: 0.4, grain: 0.09, avoid: null });
        const st = k === "palace" ? clamp01((t - EV.palaceCollapse - 0.4) / 1.4) : k === "crumbleRow" ? 0.3 * clamp01((t - EV.rowCrumble) / 2) : k === "windAway" ? 0.7 : 0;
        if (st > 0) storm.set({ origin: k === "windAway" ? [focus[0], 4, focus[2]] : [focus[0] + 10, 0, focus[2] + 10], size: k === "windAway" ? [110, 14, 90] : [120, 45, 110], flow: [16, 0.5, 4], t, opacity: 0.85 * st, colour: "#8f8a80", grain: k === "windAway" ? 0.3 : 0.07, lift: 0, avoid: null });
        if (dunes && k !== "duneCrest" && k !== "palace" && k !== "aloneDune")
          ground.set({ origin: [focus[0], duneH(focus[0], focus[2]) + 0.02, focus[2]], size: [34, 0.55, 34], flow: dawn ? [3.2, 0, 0.6] : [4.5, 0, 1.2], t, opacity: dawn ? 0.45 : 0.4, colour: dawn ? "#d8b078" : "#9a968e", grain: 0.03,
            avoid: k === "foundation" ? [FOUNDATION[0], FOUNDATION[2], 2.2, 1.1] : null, lift: 0 });
        if (dawn) motes.set({ origin: [focus[0], duneH(focus[0], focus[2]), focus[2]], size: [24, 7, 24], flow: [0.6, 0.15, 0.2], t, opacity: 0.8, colour: "#ffbe5c", grain: 0.025, lift: 0, avoid: null });
        // the trickle into the hollow
        trickle.visible = k === "lowHollow";
        if (trickle.visible) { for (let i = 0; i < NT; i++) { const a2 = hsh(i) * Math.PI * 2, kk = fract(t * (0.12 + 0.1 * hsh(i + 7)) + hsh(i + 3)), R0 = 1.2 + 6.5 * hsh(i + 5), rad = R0 * (1 - kk * kk);
          const x = HOLLOW[0] + Math.sin(a2) * rad, z = HOLLOW[2] + Math.cos(a2) * rad; tp.set([x, duneH(x, z) + 0.03 + 0.04 * hsh(i + 9), z], i * 3); }
          tg.attributes.position.needsUpdate = true; }
        // golden footprints behind him
        const fp = k === "footprints", wz = walkZ(t);
        prints.forEach((m, i) => { const z = printZ(i), age = (z - wz - 0.15) / 0.62; m.visible = fp && age > 0;
          if (m.visible) { m.position.set(printX(i), duneH(printX(i), z) + 0.012, z); (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, age * 1.5) * (0.85 + 0.15 * Math.sin(t * 3 + i)); } });
        // the foundation, laid stone by stone, glowing
        fnd.visible = k === "foundation" || k === "crestSun";
        const f0 = spanOf("foundation").from / FPS + 0.15;
        stones.forEach((s, i) => { const h = s.userData.home as THREE.Vector3, d = k === "foundation" ? smooth((t - f0 - 0.16 * i) / 0.5) : 1; s.position.set(h.x, h.y + 1.4 * (1 - d), h.z); s.rotation.z = 0.12 * (1 - d) * (i % 2 ? 1 : -1); });
        const lit = k === "foundation" ? smooth((t - f0 - 0.6) / 0.7) : 1;
        seamM.color.set("#ffa030").multiplyScalar(1.1 * lit); (rim.material as THREE.MeshBasicMaterial).color.set("#ffb347").multiplyScalar(0.9 * lit); fndL.intensity = 2.2 * lit;
        // dust in the dawn light at the doors
        motesX.set(k === "doorsDawn" ? { origin: [0.5, 0, -5], size: [10, 3.5, 10], flow: [0.3, 0.12, 0.15], t, opacity: 0.85, colour: "#ffc060", grain: 0.02, lift: 0, avoid: null } : { opacity: 0 });
      }
    },
  };
};
void lerp;
