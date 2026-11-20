// Video 002's world details (all a pure function of the frame):
//   everywhere outside   heavy rain falling slowly around the camera (slow motion), slanted by the wind
//   windows              rain running down the glass (bedroom, hospital): an animated canvas over the pane
//   bedroom              his prayer mat with dust on it (and, after his death, his phone lighting up on it), the mushaf
//                        closed on the top shelf under dust, his prayer beads on the nightstand, the ceiling light that
//                        flickers and dies, the clock (03:12, racing in "clockSpin", stopped later), lightning
//   cemetery             the bier with the shrouded body (with the procession), soil falling from the shovels, mist
//   street               papers blowing, a flickering lamp, his family's house: a closed door, dark windows
// Content rules: no angel or any being is shown, nothing in the sky, no faces.
import * as THREE from "three";
import { NOINK } from "../../render/ink";
import { ctex } from "../../draw/paint";
import { mat, box, cyl, glow, liveCanvas } from "../../sets/common";
import { buildMat } from "../motion-test/mat";
import { applyCam } from "../../camera/ease";
import type { Frame, SetId } from "../../story/story";
import { FPS, F, EV, SHOTS, shotOf, procX, PROC, FRAMES, runX, BUS, lanternHand, MUSHAF_BOY } from "./timeline";
import { CEMETERY } from "../../sets/cemetery";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
void clamp01;
const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const fract = (x: number) => x - Math.floor(x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const softDot = () => ctex("lifeDot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const kindAt = (f: number) => shotOf(f).kind;

// ---------------- rain around the camera ----------------
const rainField = (root: THREE.Object3D, n = 1500) => {
  const r = rnd(7), sd = Float32Array.from({ length: n * 3 }, r), pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color("#b7c3d6"), transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
  lines.layers.set(NOINK); lines.frustumCulled = false; root.add(lines);
  const BX = 7, BY = 7, BZ = 9, VY = 4.2, WIND = 1.1, LEN = 0.32;              // slow motion: drops fall at 4.2 m/s
  return (camLocal: THREE.Vector3, t: number, wind = 1) => {
    for (let i = 0; i < n; i++) {
      const h = fract(sd[i * 3 + 1] + (t * VY) / BY), y = camLocal.y + BY * 0.55 - BY * h;
      const x = camLocal.x - BX / 2 + BX * fract(sd[i * 3] + (WIND * wind * t) / BX * 0.4), z = camLocal.z - BZ * 0.85 + BZ * sd[i * 3 + 2];
      pos.set([x, Math.max(0.01, y), z, x - WIND * wind * LEN / VY * 0.6, Math.max(0.01, y) + LEN, z], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
  };
};
/** splashes: small soft points blinking on the ground near the camera */
const splashes = (root: THREE.Object3D, n = 160) => {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), geo = new THREE.BufferGeometry(), r = rnd(19), sd = Float32Array.from({ length: n * 3 }, r);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: softDot(), size: 0.05, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  p.layers.set(NOINK); p.frustumCulled = false; root.add(p);
  return (camLocal: THREE.Vector3, t: number, groundY = 0.02) => {
    for (let i = 0; i < n; i++) {
      const life = fract(t * 2.2 + sd[i * 3]), cyc = Math.floor(t * 2.2 + sd[i * 3]);
      const x = camLocal.x - 4 + 8 * fract(sd[i * 3 + 1] + cyc * 0.37), z = camLocal.z - 7 + 7 * fract(sd[i * 3 + 2] + cyc * 0.61);
      pos.set([x, groundY, z], i * 3); const k = 0.35 * Math.sin(Math.PI * life) * (life < 0.4 ? 1 : 0);
      col.set([0.7 * k, 0.75 * k, 0.85 * k], i * 3);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
};

// ---------------- rain running down a window ----------------
const glassRain = (parent: THREE.Object3D, w: number, h: number, pos: [number, number, number], seed: number) => {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 384;
  const g = cv.getContext("2d")!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  m.position.set(...pos); m.layers.set(NOINK); parent.add(m);
  const r = rnd(seed), drops = Array.from({ length: 70 }, () => ({ x: r() * 256, y0: r() * 384, s: 2 + r() * 5, v: r() < 0.3 ? 20 + r() * 60 : 0, ph: r() }));
  return (t: number, k = 1) => {
    g.clearRect(0, 0, 256, 384);
    g.fillStyle = `rgba(150,170,200,${0.12 * k})`; g.fillRect(0, 0, 256, 384);                            // wet, a little fogged
    for (const d of drops) {
      const y = d.v ? (d.y0 + d.v * t) % 420 - 20 : d.y0, a = 0.5 * k;
      if (d.v) { g.strokeStyle = `rgba(200,215,235,${0.25 * k})`; g.lineWidth = d.s * 0.6; g.beginPath(); g.moveTo(d.x, y - 26); g.lineTo(d.x + 1, y); g.stroke(); }
      const gr = g.createRadialGradient(d.x - d.s * 0.3, y - d.s * 0.3, 0, d.x, y, d.s);
      gr.addColorStop(0, `rgba(235,242,255,${a})`); gr.addColorStop(0.6, `rgba(120,140,170,${a * 0.5})`); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(d.x, y, d.s, 0, Math.PI * 2); g.fill();
    }
    tex.needsUpdate = true;
  };
};

// =====================================================================================================================
const span = (k: string) => SHOTS.find((s) => s.kind === k) ?? { from: -1e9, to: -1e9 };
const smokeTex = () => ctex("warmSmoke", 128, 128, (g, r) => { for (let i = 0; i < 18; i++) { const x = 30 + r() * 68, y = 30 + r() * 68, rad = 14 + 30 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } });

const bedroomLife = (root: THREE.Object3D) => {
  const rainOn = glassRain(root, 1.3, 1.2, [1.05, 1.6, -2.17], 3);
  // the dusty prayer mat on the floor by the window; a layer of dust over it; a shadow that darkens it
  const pm = buildMat(1.0, 0.25, 1.25, 0.7); pm.position.y += 0.013; pm.rotation.y = 0.12; root.add(pm);
  const dustT = ctex("dustLayer", 256, 256, (g, r) => { for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(200,200,190,${0.05 + 0.12 * r()})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); } });
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.7), new THREE.MeshBasicMaterial({ map: dustT, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.55, 0.57, 0.62) }));
  dust.rotation.set(-Math.PI / 2, 0, -0.12); dust.position.set(1.0, 0.03, 0.25); dust.layers.set(NOINK); root.add(dust);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthWrite: false, fog: false }));
  shade.rotation.set(-Math.PI / 2, 0, -0.12); shade.position.set(1.0, 0.032, 0.25); shade.layers.set(NOINK); root.add(shade);
  // the phone on the mat (after he is gone): it lights up with each notification and buzzes
  const phone = new THREE.Group(); phone.position.set(1.12, 0.032, 0.3); phone.rotation.y = 0.5; root.add(phone);
  box(phone, [-0.04, 0, -0.075], [0.04, 0.01, 0.075], mat("#1b1d24"), false);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.135), new THREE.MeshBasicMaterial({ color: new THREE.Color("#cfe6ff"), fog: false })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.011; phone.add(scr);
  const phL = new THREE.PointLight("#cfe1ff", 0, 2.5, 2); phL.position.set(1.12, 0.2, 0.3); root.add(phL);
  // the mushaf on the top of the bookshelf, closed; its dust thickens
  const book = new THREE.Group(); book.position.set(-2.63, 1.9, -2.03); book.rotation.y = 0.2; root.add(book);
  box(book, [-0.13, 0, -0.09], [0.13, 0.05, 0.09], mat("#2f4a35"));
  box(book, [-0.125, 0.006, -0.085], [0.125, 0.044, 0.088], mat("#e8dfc6"), false);
  box(book, [-0.05, 0.05, -0.05], [0.05, 0.052, 0.05], mat("#9c8a50"), false);
  const bdust = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.19), new THREE.MeshBasicMaterial({ map: dustT, transparent: true, opacity: 0.6, depthWrite: false, fog: false, color: new THREE.Color(0.75, 0.75, 0.76) }));
    m.rotation.set(-Math.PI / 2, 0, i * 1.1); m.position.y = 0.056 + 0.001 * i; m.layers.set(NOINK); book.add(m); return m; });
  // his prayer beads on the nightstand: they slip off its edge and scatter across the floor
  const BEADS = 33, beadM = mat("#b07a4a"), bead = Array.from({ length: BEADS }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), beadM); root.add(m); return { m, a: (i / BEADS) * Math.PI * 2 }; });
  const br = rnd(31), bv = bead.map(() => ({ vx: -0.05 - 0.3 * br(), vz: 0.25 + 0.55 * br(), d: br() * 0.25 }));   // off the front edge, away from the bed
  const BX = -1.98, BY = 0.556, BZ = -1.5;
  // his laptop on the bed corner: the bank screen; the money ticks down as the barakah drains
  const lap = new THREE.Group(); lap.position.set(0.18, 0.55, -0.85); lap.rotation.y = 0.75; root.add(lap);
  box(lap, [-0.17, 0, -0.12], [0.17, 0.018, 0.12], mat("#8e939b"));
  const lid = new THREE.Group(); lid.position.set(0, 0.018, -0.12); lid.rotation.x = -0.32; lap.add(lid);
  box(lid, [-0.17, 0, -0.012], [0.17, 0.23, 0], mat("#8e939b"));
  const bank = liveCanvas(512, 320);
  const lscr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), glow("#ffffff", 1.1, bank.tex)); lscr.position.set(0, 0.118, 0.002); lid.add(lscr);
  const lapL = new THREE.PointLight("#bcd4ff", 0, 2.5, 2); lapL.position.set(0.3, 0.85, -0.5); root.add(lapL);
  const drawBank = (money: number, red: boolean) => bank.redraw((g) => {
    g.fillStyle = "#0f1622"; g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#6f8fb8"; g.font = "600 20px Inter, Arial"; g.fillText("CURRENT ACCOUNT", 28, 44);
    g.fillStyle = red ? "#ff6a6a" : "#ffffff"; g.font = "800 54px Inter, Arial"; g.fillText(`£${money.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 28, 108);
    g.strokeStyle = red ? "#e5484d" : "#5fd18a"; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= 456; x += 8) { const y = 150 + x * (red ? 0.22 : -0.1) - 14 * Math.sin(x * 0.05) - 6 * Math.sin(x * 0.17); if (x) g.lineTo(28 + x, y); else g.moveTo(28, y); }
    g.stroke();
    g.fillStyle = red ? "#e5484d" : "#5fd18a"; g.font = "700 22px Inter, Arial"; g.fillText(red ? "-£1,240.00  Overdue" : "+£3,250.00  Salary", 28, 290);
  });
  // the windowsill: a plant that wilts, a plate of food that goes cold (its steam stops)
  const sill = new THREE.Group(); sill.position.set(1.05, 1.02, -2.13); root.add(sill);
  cyl(sill, 0.06, 0.045, 0.1, mat("#8a4b2e"), [0.32, 0.05, 0], 12);
  const stem = cyl(sill, 0.006, 0.008, 0.22, mat("#4a6a3a"), [0.32, 0.21, 0], 6);
  const leafG = new THREE.PlaneGeometry(0.09, 0.035); leafG.translate(0.045, 0, 0);
  const leaves = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(leafG, new THREE.MeshLambertMaterial({ color: "#4f8a4a", side: THREE.DoubleSide })); m.position.set(0.32, 0.14 + 0.03 * i, 0); m.rotation.set(0, (i / 7) * Math.PI * 2, 0.5); sill.add(m); return m; });
  cyl(sill, 0.11, 0.11, 0.012, mat("#e9e1cf"), [-0.25, 0.006, 0], 20);
  const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshLambertMaterial({ color: "#c98a4a" })); food.scale.set(1, 0.4, 1); food.position.set(-0.25, 0.02, 0); sill.add(food);
  const steamS = Array.from({ length: 3 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: new THREE.Color("#ffffff"), transparent: true, opacity: 0, depthWrite: false, fog: false })); s.layers.set(NOINK); sill.add(s); return s; });
  void stem;
  // warm light leaking out of the window like smoke
  const leak = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: new THREE.Color(1.4, 0.95, 0.5), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, fog: false })); s.layers.set(NOINK); root.add(s); return { s, ph: i / 14 }; });
  // lights: the dim ceiling bulb, the window's cold light, a light on the shelf, lightning
  const ceil = new THREE.PointLight("#ffd9a8", 0, 7, 1.5); ceil.position.set(0, 2.6, -0.6); root.add(ceil);
  const cold = new THREE.PointLight("#8fa6d8", 0, 9, 1.3); cold.position.set(0.9, 1.9, -0.6); root.add(cold);
  const shelfL = new THREE.PointLight("#9fb2d8", 0, 2.5, 1.6); shelfL.position.set(-2.2, 2.4, -1.4); root.add(shelfL);
  const flash = new THREE.PointLight("#c8d8ff", 0, 12, 1.2); flash.position.set(1.05, 1.8, -1.6); root.add(flash);
  const bedside = new THREE.PointLight("#ffc890", 0, 4, 1.5); bedside.position.set(-2.3, 0.95, -1.6); root.add(bedside);
  const sillL = new THREE.PointLight("#c8d4ec", 0, 2.5, 1.6); sillL.position.set(1.05, 1.6, -1.6); root.add(sillL);
  const boxL = new THREE.PointLight("#d8c8b0", 0, 3.5, 1.5); boxL.position.set(0.85, 1.3, 1.3); root.add(boxL);
  const doorL = new THREE.PointLight("#ffc890", 0, 3.5, 1.5); doorL.position.set(-2.3, 2.0, 0.5); root.add(doorL);
  const clock = root.getObjectByName("wallClock"), hourC = root.getObjectByName("clockHour"), minC = root.getObjectByName("clockMin");
  const sec = new THREE.Group(); sec.position.z = 0.062; clock?.add(sec); box(sec, [-0.004, -0.03, 0], [0.004, 0.17, 0.006], mat("#7a2a26"), false);
  // a box of his things on the floor (his folded clothes); his wallet goes in
  const boxG = new THREE.Group(); boxG.position.set(0.5, 0, 0.78); root.add(boxG);
  const card = mat("#8a6a46");
  box(boxG, [-0.24, 0, -0.17], [0.24, 0.02, 0.17], card); box(boxG, [-0.24, 0, -0.17], [-0.22, 0.3, 0.17], card); box(boxG, [0.22, 0, -0.17], [0.24, 0.3, 0.17], card);
  box(boxG, [-0.24, 0, -0.17], [0.24, 0.3, -0.15], card); box(boxG, [-0.24, 0, 0.15], [0.24, 0.3, 0.17], card);
  box(boxG, [-0.2, 0.02, -0.13], [0.2, 0.2, 0.13], mat("#5a4232"), false);                                   // his folded thobe
  const wallet = new THREE.Group(); root.add(wallet); box(wallet, [-0.05, 0, -0.035], [0.05, 0.02, 0.035], mat("#2a1e18"));
  // a door in the side wall, a hook on it; his kufi hung there
  box(root, [-2.99, 0, -0.08], [-2.95, 2.08, 0.9], mat("#5e3f2a")); box(root, [-2.99, 2.08, -0.12], [-2.93, 2.14, 0.94], mat("#e8e2d6"));
  box(root, [-2.95, 1.0, 0.75], [-2.92, 1.06, 0.8], mat("#c79c48"), false);
  box(root, [-2.95, 1.7, 0.38], [-2.9, 1.72, 0.42], mat("#c79c48"), false);                                 // the hook
  const kufi = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#d9d6cf")); kufi.scale.set(1, 0.75, 1); root.add(kufi);
  // dust blown off the mushaf
  const NP = 60, puff = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#c8c4b8"), size: 0.03, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
  const pp = new Float32Array(NP * 3); puff.geometry.setAttribute("position", new THREE.BufferAttribute(pp, 3)); puff.layers.set(NOINK); puff.frustumCulled = false; root.add(puff);
  const [l0, l1] = EV.lightning, dw = span("drainWave"), dc = span("drainClose"), mp = span("phoneMat"), mb = mp, gp = span("grabPhone"), ps = span("pastShelf"), bp2 = span("bankPanic"), mbl = span("mushafBlow"), lc = span("laptopClose");
  return (_fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f), gone = f >= span("walkHome").from;
    rainOn(t, kind === "windowRain" ? 1.6 : kind === "wakePause" ? 1.45 : 1);
    // the bulb: steady and dim; during the draining it dips unevenly; gone after he collapses
    const dr = clamp01((f - dw.from) / (dc.to - dw.from));
    ceil.intensity = f >= EV.lightOut ? 0 : 1.1 * (1 - 0.55 * dr) * (f >= dw.from ? 1 - 0.35 * sm((Math.sin(t * 2.3) * Math.sin(t * 0.9 + 1) - 0.2) / 0.5) : 1);
    cold.intensity = kind === "matPhone" || kind === "matBuzz" ? 3.2 : kind === "wakePause" ? 1.5 : kind === "lightning2" ? 2.4 : gone ? 1.4 : 0.7;
    shelfL.intensity = kind === "pastShelf" || kind === "leftBehind" ? 1.6 : 0;
    const family = f >= span("fatherBed").from && f < EV.familyLightOut;
    boxL.intensity = kind === "walletBox" ? 2.6 : 0;
    doorL.intensity = kind === "kufiDoor" ? 2.6 * (f > EV.familyLightOut - 10 ? Math.max(0, Math.min(1, (EV.familyLightOut - f) / 10)) : 1) : 0;
    bedside.intensity = kind === "beadsFall" ? 3.0 : family ? 1.4 * (f > EV.familyLightOut - 10 ? clamp01((EV.familyLightOut - f) / 10) : 1) : 0; sillL.intensity = kind === "drainClose" ? 2.4 : 0;
    // the clock: 03:12 ticking; racing while the barakah drains; stopped once he is gone
    const race = f >= dw.from && f < dc.to ? Math.pow((f - dw.from) / FPS, 2) * 900 : 0;
    const secs = gone ? 47 * 60 : 12 * 60 + Math.floor(t) + race;
    if (hourC && minC) { minC.rotation.z = -((secs / 60) % 60) / 60 * Math.PI * 2; hourC.rotation.z = -((3 + secs / 3600) % 12) / 12 * Math.PI * 2; }
    sec.rotation.z = -((gone ? 31 : Math.floor(t + race)) % 60) / 60 * Math.PI * 2;
    // the mat goes darker when he grabs his phone; the mushaf's dust thickens as he walks past
    (shade.material as THREE.MeshBasicMaterial).opacity = 0.55 * sm((f - gp.from) / (gp.to - gp.from)) * (gone ? 0.4 : 1);
    const take = kind === "mushafBlow" ? smooth((f - mbl.from - 8) / 10) : 0;
    if (take > 0) book.position.set(lerp(-2.63, MUSHAF_BOY[0], take), lerp(1.9, 0.95, take), lerp(-2.03, MUSHAF_BOY[2] - 0.22, take)); else book.position.set(-2.63, 1.9, -2.03);
    const blown = kind === "mushafBlow" && f >= EV.blow ? smooth((f - EV.blow) / 10) : f > mbl.to && mbl.to > 0 ? 1 : 0;
    puff.visible = kind === "mushafBlow" && f >= EV.blow && f < EV.blow + 30;
    if (puff.visible) { const s2 = (f - EV.blow) / FPS; for (let i = 0; i < NP; i++) { const a2 = i * 2.4, v = 0.2 + 0.25 * ((i * 7) % 5) / 5; pp.set([book.position.x + Math.cos(a2) * v * s2, book.position.y + 0.06 + 0.3 * s2 * (0.5 + 0.5 * Math.sin(i)), book.position.z - 0.3 * s2 + Math.sin(a2) * 0.1 * s2], i * 3); } puff.geometry.attributes.position.needsUpdate = true; (puff.material as THREE.PointsMaterial).opacity = 0.8 * (1 - clamp01(s2 / 1.0)); }
    const thick = (0.35 + 0.65 * sm((f - ps.from) / (ps.to - ps.from))) * (1 - blown);
    bdust.forEach((m, i) => { (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, thick * (1.2 - 0.25 * i)); });
    // the beads: on the nightstand, then slipping off its edge (string first), falling, bouncing, scattering
    bead.forEach(({ m, a }, i) => {
      const v = bv[i], s = (f - EV.beads) / FPS - v.d;
      const x0 = BX + 0.075 * Math.cos(a), z0 = BZ + 0.06 * Math.sin(a);
      if (s <= 0) { m.position.set(x0, BY + 0.013, z0 + 0.04 * clamp01(((f - EV.beads) / FPS + 0.6) / 0.6)); return; }
      const fallT = Math.sqrt(2 * BY / 9.8), x = x0 + v.vx * Math.min(s, 1.6), z = z0 + 0.08 + v.vz * Math.min(s, 1.6);
      let y: number; if (s < fallT) y = BY - 0.5 * 9.8 * s * s; else { const b = s - fallT, h = 0.08 * Math.exp(-b * 3); y = Math.abs(Math.sin(b * 9)) * h; }
      m.position.set(x, Math.max(0.013, y + 0.013), z);
    });
    // the laptop: the bank screen (money ticking down while the barakah drains; red and falling in the panic)
    const lapOn = kind === "drainWave" || kind === "bankPanic" || kind === "laptopClose";
    lap.visible = lapOn;
    if (kind === "laptopClose") {                                                     // his father opens it, the balance still there, and slowly closes it
      lap.position.set(-0.12, 0.55, -0.72); lap.rotation.y = 1.0;
      const open = smooth((f - lc.from) / 8) * (1 - smooth((f - EV.laptop[0] - 18) / (EV.laptop[1] - EV.laptop[0] - 18)));
      lid.rotation.x = 1.52 - (1.52 + 0.32) * open; lapL.intensity = 0.8 * open; drawBank(24812.4, false);
    } else {
      lap.position.set(0.18, 0.55, -0.85); lap.rotation.y = 0.75; lid.rotation.x = -0.32; lapL.intensity = lapOn ? 0.8 : 0;
      if (lapOn) drawBank(kind === "bankPanic" ? Math.max(-1240, 812.4 - (f - bp2.from) / FPS * 690) : 24812.4 - Math.pow((f - dw.from) / FPS, 1.6) * 3100, kind === "bankPanic");
    }
    // the plant wilts and browns; the food's steam stops and it greys
    const w = sm((f - dc.from) / (dc.to - dc.from)) * (f >= dc.from ? 1 : 0) + (f >= dc.to ? 1 : 0) * 0;
    const wl = f >= dc.to ? 1 : w;
    leaves.forEach((m, i) => { m.rotation.z = 0.5 - 2.0 * wl * (0.8 + 0.2 * Math.sin(i)); (m.material as THREE.MeshLambertMaterial).color.set("#4f8a4a").lerp(new THREE.Color("#5a4630"), wl); });
    (food.material as THREE.MeshLambertMaterial).color.set("#c98a4a").lerp(new THREE.Color("#6a625a"), wl);
    steamS.forEach((s, i) => { const life = fract(t * 0.6 + i / 3); s.position.set(-0.25 + 0.02 * Math.sin(t * 2 + i), 0.06 + 0.2 * life, 0); s.scale.set(0.08 + 0.08 * life, 0.14 + 0.1 * life, 1); s.material.opacity = 0.45 * Math.sin(Math.PI * life) * (1 - wl); });
    // the warm light leaking out through the window like smoke (while the barakah drains)
    const lk = f >= dw.from && f < dc.to ? 1 : 0;
    leak.forEach(({ s, ph }, i) => { const life = fract(t * 0.35 + ph), x0 = -0.6 + 0.3 * Math.sin(i * 2.3), z0 = -0.4 + 0.3 * Math.cos(i * 1.7);
      s.position.set(x0 + (1.05 - x0) * life, 1.2 + 0.5 * life + 0.1 * Math.sin(t + i), z0 + (-2.25 - z0) * life); s.scale.setScalar(0.5 + 0.4 * (1 - life));
      s.material.opacity = lk * 0.35 * Math.sin(Math.PI * life); });
    // the phone on the mat: dark until he is gone; it lights with each notification; it buzzes in the close shot
    const onMat = f >= mp.from && f < EV.phonePick + 8;
    phone.visible = onMat; phone.position.y = 0.032 + (f > EV.phonePick ? 0.06 * clamp01((f - EV.phonePick) / 8) : 0);
    const blinks = [0.15, 0.95, 1.7, 2.6, 3.4, 4.2];
    const blink = onMat ? Math.max(0, ...blinks.map((d) => { const x = (f - mp.from) / FPS - d; return x >= 0 && x < 0.9 ? (x < 0.08 ? x / 0.08 : 1 - (x - 0.08) / 0.82) : 0; })) : 0;
    (scr.material as THREE.MeshBasicMaterial).color.set("#cfe6ff").multiplyScalar(0.12 + 1.6 * blink); phL.intensity = 0.15 + 0.7 * blink;
    const buzz = f >= mb.from && f < mb.to ? blink : 0;
    phone.position.set(1.12 + 0.004 * Math.sin(f * 2.7) * buzz + 0.02 * clamp01((f - mb.from) / (mb.to - mb.from)) * (f >= mb.from ? 1 : 0), 0.032, 0.3); phone.rotation.y = 0.5 + 0.06 * Math.sin(f * 3.1) * buzz;
    // the pause after the voice: his phone on the bed beside him, its light fading out
    if (kind === "wakePause") {
      const wp = span("wakePause"), fade = 1 - smooth((f - wp.from - 4) / (wp.to - wp.from - 6));
      phone.visible = true; phone.position.set(-0.95, 0.6, -0.9); phone.rotation.y = 0.9;
      (scr.material as THREE.MeshBasicMaterial).color.set("#cfe6ff").multiplyScalar(0.06 + 1.4 * fade);
      phL.position.set(-1.0, 0.85, -0.85); phL.intensity = 2.2 * fade;
    } else phL.position.set(1.12, 0.2, 0.3);
    // lightning: two cold flashes
    const lp = (x: number) => (x >= 0 && x < 5 ? Math.exp(-x / 1.4) : 0);
    flash.intensity = 10 * Math.max(lp(f - l0), lp(f - l1));
    // the box, his wallet going in; his kufi going onto the hook
    boxG.visible = f >= span("walletBox").from;
    const wk = smooth((f - EV.wallet + 6) / 14);
    wallet.visible = boxG.visible; wallet.position.set(lerp(0.33, 0.5, wk), lerp(0.62, 0.22, wk), lerp(0.72, 0.78, wk)); wallet.rotation.z = 0.8 * (1 - wk);
    const kk = smooth((f - EV.kufi + 8) / 12), kufiOn = f >= span("kufiDoor").from;
    kufi.visible = kufiOn; kufi.position.set(lerp(-2.62, -2.88, kk), lerp(1.58, 1.62, kk), lerp(0.48, 0.4, kk)); kufi.rotation.z = (Math.PI / 2) * kk;
  };
};

// =====================================================================================================================
const hospitalLife = (root: THREE.Object3D) => {
  const rainOn = glassRain(root, 1.1, 1.6, [-1.6, 1.5, -2.37], 5);
  const pil = root.getObjectByName("hospPillow"), sh = root.getObjectByName("hospSheet");
  // a sheer curtain by the window that moves in the draft
  const geo = new THREE.PlaneGeometry(0.7, 2.0, 6, 16), base = Float32Array.from(geo.attributes.position.array as Float32Array);
  const cur = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color("#7f8fa0").multiplyScalar(0.6), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  cur.position.set(-0.75, 1.55, -2.2); cur.layers.set(NOINK); root.add(cur);
  return (_fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f);
    rainOn(t, kind === "bedRail" || kind === "flatline" ? 1.7 : 1.2);
    const lying = kind === "bedRail"; if (pil) pil.visible = !lying; if (sh) sh.visible = !lying;
    const draft = kind === "emptyCurtain" ? 1 : 0.3, p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], down = clamp01((1.0 - y) / 2.0);
      const wv = draft * down * (0.09 * Math.sin(t * 1.6 + y * 2.5 + x * 3) + 0.05 * Math.sin(t * 3.1 + y * 5)); p.setXYZ(i, x + wv * 0.5, y, base[i * 3 + 2] + Math.abs(wv) * 2.2); }
    p.needsUpdate = true;
  };
};

// =====================================================================================================================
const cemeteryLife = (root: THREE.Object3D) => {
  const rain = rainField(root), spl = splashes(root);
  const bier = new THREE.Group(); root.add(bier);
  for (const z of [-0.42, 0.42]) { const p = cyl(bier, 0.03, 0.03, 2.6, mat("#4a3426"), [0, 0, z], 8); p.rotation.z = Math.PI / 2; }
  box(bier, [-0.9, 0.02, -0.38], [0.9, 0.06, 0.38], mat("#5a3e2c"));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.3, 6, 12), mat("#e9e6de")); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.8); body.position.y = 0.24; body.castShadow = true; bier.add(body);
  bier.traverse((o) => o.layers.set(NOINK));                             // carried past the camera: never pushes it
  // mud splashes at the carriers' feet
  const NM = 60, mud = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#8a8a88"), size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  const mp = new Float32Array(NM * 3); mud.geometry.setAttribute("position", new THREE.BufferAttribute(mp, 3)); mud.layers.set(NOINK); mud.frustumCulled = false; root.add(mud);
  const NS = 120, soil = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#4a3a2c"), size: 0.05, transparent: true, depthWrite: false, fog: false }));
  const sp = new Float32Array(NS * 3); soil.geometry.setAttribute("position", new THREE.BufferAttribute(sp, 3)); soil.layers.set(NOINK); soil.frustumCulled = false; root.add(soil);
  const sr = rnd(9), ss = Float32Array.from({ length: NS * 3 }, sr);
  const mistT = ctex("lrMist", 512, 256, (g, r) => { for (let i = 0; i < 40; i++) { const x = r() * 512, y = 60 + r() * 140, rad = 40 + 90 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } });
  const mists = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshBasicMaterial({ map: mistT, color: new THREE.Color("#8a96a8"), transparent: true, opacity: 0.55, depthWrite: false, fog: false })); m.position.set(0, 0.9 + 0.3 * (i % 3), -1 - i * 2.4); m.layers.set(NOINK); root.add(m); return m; });
  const key = new THREE.PointLight("#c8d2e4", 0, 10, 1.3); root.add(key);
  const lan = new THREE.Group(); lan.position.set(0.15, 0, 0.72); root.add(lan);
  box(lan, [-0.09, 0, -0.09], [0.09, 0.03, 0.09], mat("#2a2622")); box(lan, [-0.09, 0.3, -0.09], [0.09, 0.33, 0.09], mat("#2a2622"));
  for (const [x, z] of [[-0.085, -0.085], [0.085, -0.085], [-0.085, 0.085], [0.085, 0.085]]) box(lan, [x - 0.01, 0.03, z - 0.01], [x + 0.01, 0.3, z + 0.01], mat("#2a2622"));
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.24, 12), glow("#ffc070", 2.0)); flame.position.y = 0.165; lan.add(flame);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), mat("#2a2622")); handle.position.y = 0.33; lan.add(handle);
  const lanHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.0, 0.6, 0.25), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); lanHalo.scale.set(1.1, 1.1, 1); lanHalo.position.y = 0.17; lan.add(lanHalo);
  lan.traverse((o) => o.layers.set(NOINK));
  const lanL = new THREE.PointLight("#ffb866", 0, 6, 1.5); root.add(lanL);
  const moon = new THREE.PointLight("#b8c4dc", 0, 6, 1.2); moon.position.set(0.2, 2.2, 0.6); root.add(moon);
  // water sprinkled on the grave from a jug; a low wall where the crows sit
  const NW = 70, water = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#c8d6ec"), size: 0.03, transparent: true, depthWrite: false, fog: false }));
  const wp = new Float32Array(NW * 3); water.geometry.setAttribute("position", new THREE.BufferAttribute(wp, 3)); water.layers.set(NOINK); water.frustumCulled = false; root.add(water);
  box(root, [-6.2, 0, -8.45], [-1.8, 1.1, -8.1], mat("#5a5c58"));
  const cl = new THREE.Vector3(), fp = span("fogPullback"), wg = span("waterGrave");
  return (fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f), proc = kind === "janazahTrack" || kind === "mudFeet" || kind === "umbrellaLine";
    cl.set(...fr.plan.cam.pos).sub(root.position);
    rain(cl, t, kind === "gravesTrack" || kind === "walkAway" || kind === "fogPullback" ? 4.5 : 1.2); spl(cl, t);
    const kx = proc ? procX(t) : 0; key.position.set(kx + 0.4, kind === "graveSoil" ? 2.6 : 3.2, proc ? PROC.z + 1.2 : 0.8);
    moon.intensity = kind === "graveSoil" || kind === "waterGrave" ? 3.5 : 0;
    key.intensity = kind === "graveSoil" ? 5.0 : kind === "fogPullback" ? 2.4 - 1.4 * sm((f - fp.from) / (fp.to - fp.from)) : 3.0;
    // the lantern flickers in the wind
    // the lantern hangs from the man's hand, swinging a little, its flame bending in the wind
    const lanOn = kind === "graveSoil" || kind === "duaGrave" || kind === "waterGrave" || kind === "walkAway", gust = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1) + 0.1 * Math.sin(t * 23);
    lan.visible = lanOn; lanL.intensity = lanOn ? 2.4 * gust : 0; flame.scale.set(1, 0.85 + 0.2 * gust, 1); lanHalo.material.color.setRGB(0.8 * gust, 0.48 * gust, 0.2 * gust);
    if (lanOn) { const h = lanternHand(f); lan.position.set(h[0], h[1] - 0.36, h[2]); lan.rotation.set(0.08 * Math.sin(t * 2.1), 0, 0.1 * Math.sin(t * 1.7)); lanL.position.set(h[0], h[1] - 0.2, h[2]); }
    water.visible = kind === "waterGrave" && f < wg.from + 30;
    if (water.visible) { const s0 = (f - wg.from) / FPS; for (let i = 0; i < NW; i++) { const life = fract(s0 * 2.4 + i / NW), a2 = i * 2.4; wp.set([0.62 - 0.5 * life + 0.06 * Math.cos(a2), 0.62 - 1.6 * life * life + 0.6 * life * 0.2, 0.5 + 0.08 * Math.sin(a2)], i * 3); } water.geometry.attributes.position.needsUpdate = true; }
    bier.visible = proc;
    if (proc) { const x = procX(t); bier.position.set(x, 1.47 + 0.02 * Math.sin(t * 5.2), PROC.z); bier.rotation.z = 0.015 * Math.sin(t * 2.6); }
    mud.visible = proc;
    if (proc) { const x = procX(t); for (let i = 0; i < NM; i++) { const life = fract(t * 2.6 + i * 0.137), lane = i % 4, fx = x + [0.95, -0.95, 0.95, -0.95][lane] + 0.15 * Math.sin(i), fz = PROC.z + [-0.42, -0.42, 0.42, 0.42][lane];
      mp.set([fx + 0.1 * life * Math.cos(i), 0.02 + 0.25 * life * (1 - life) * 4 * 0.3, fz + 0.12 * life * Math.sin(i * 1.7)], i * 3); } mud.geometry.attributes.position.needsUpdate = true; }
    const [s0, s1] = EV.soil; soil.visible = kind === "graveSoil" && f >= s0 && f < s1;
    if (soil.visible) {
      for (let i = 0; i < NS; i++) { const side = i % 2 ? 1 : -1, life = fract(t * 1.2 + ss[i * 3] * 0.35 + (side > 0 ? 0.5 : 0)), drop = life * life;
        sp.set([side * (1.05 - 0.6 * life) + (ss[i * 3 + 1] - 0.5) * 0.25, 0.75 - 1.4 * drop, (ss[i * 3 + 2] - 0.5) * 0.4], i * 3); }
      soil.geometry.attributes.position.needsUpdate = true;
    }
    const thick = kind === "fogPullback" ? 1.0 + 0.8 * clamp01((f - fp.from) / (fp.to - fp.from)) : 1;
    mists.forEach((m, i) => { m.position.x = Math.sin(t * 0.05 + i) * 1.5; m.rotation.set(0, Math.atan2(cl.x - m.position.x, cl.z - m.position.z), 0); const up = Math.max(0, Math.min(1, (cl.y - 1.8) / 2.5)); (m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, 0.5 * thick * (1 - 0.7 * up)); if (kind === "fogPullback") m.position.z = -1 - i * 2.4 + 3.0 * clamp01((f - fp.from) / (fp.to - fp.from)); });
  };
};

// =====================================================================================================================
const streetLife = (root: THREE.Object3D) => {
  const rain = rainField(root, 1700), spl = splashes(root, 200);
  const papers = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshBasicMaterial({ color: new THREE.Color("#b9b6ac").multiplyScalar(0.55), side: THREE.DoubleSide, fog: false })); m.layers.set(NOINK); root.add(m); return { m, ph: i / 9 }; });
  // the masjid's door: a warm arched doorway, light spilling onto the wet pavement
  const MX = 28.85, masjid = new THREE.Group(); root.add(masjid);
  box(masjid, [MX - 0.8, 0, -0.2], [MX + 0.8, 2.9, -0.12], mat("#5a5550"));
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcf8a").multiplyScalar(1.5), fog: false })); arch.position.set(MX, 1.2, -0.115); masjid.add(arch);
  const archTop = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20, 0, Math.PI), arch.material); archTop.position.set(MX, 2.4, -0.115); masjid.add(archTop);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(1.2, 0.8, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(MX, KERB_Y + 0.005, 0.7); spill.layers.set(NOINK); masjid.add(spill);
  const warm = new THREE.PointLight("#ffc070", 0, 7, 1.5); warm.position.set(MX, 1.8, 0.5); masjid.add(warm);
  // the bus's red tail lights and lit windows (it pulls away in the opening)
  const tail = [0, 1].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(2.0, 0.25, 0.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); s.scale.set(0.6, 0.6, 1); s.layers.set(NOINK); root.add(s); return s; });
  const busWin = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 0.85), new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8e4ff").multiplyScalar(0.9), side: THREE.DoubleSide, fog: false })); busWin.layers.set(NOINK); root.add(busWin);
  // his phone: it slips from his hand, falls into a puddle and cracks
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color("#2a3446"), transparent: true, opacity: 0.85, fog: false })); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.3, 0.8, 1); puddle.position.set(40.6, KERB_Y + 0.004, 1.25); puddle.layers.set(NOINK); root.add(puddle);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), new THREE.MeshBasicMaterial({ color: "#b8c4d8", transparent: true, opacity: 0, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(40.6, KERB_Y + 0.006, 1.25); ring.layers.set(NOINK); root.add(ring);
  const ph = new THREE.Group(); root.add(ph); box(ph, [-0.04, 0, -0.075], [0.04, 0.01, 0.075], mat("#1b1d24"), false);
  const crack = liveCanvas(64, 128); const pscr = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.135), new THREE.MeshBasicMaterial({ map: crack.tex, fog: false })); pscr.rotation.x = -Math.PI / 2; pscr.position.y = 0.011; ph.add(pscr);
  const drawCrack = (k: number) => crack.redraw((g) => { g.fillStyle = "#bcd6ff"; g.fillRect(0, 0, 64, 128); if (k <= 0) return; g.strokeStyle = "rgba(20,24,34,0.95)"; g.lineWidth = 2;
    for (const [a, l] of [[0.3, 50], [1.4, 60], [2.5, 45], [3.6, 70], [4.6, 40], [5.5, 55]] as [number, number][]) { g.beginPath(); g.moveTo(40, 42); g.lineTo(40 + Math.cos(a) * l * k, 42 + Math.sin(a) * l * k); g.stroke(); } });
  const NSP = 40, sp = new Float32Array(NSP * 3), splash = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#c8d4e6"), size: 0.03, transparent: true, depthWrite: false, fog: false }));
  splash.geometry.setAttribute("position", new THREE.BufferAttribute(sp, 3)); splash.layers.set(NOINK); splash.frustumCulled = false; root.add(splash);
  const skey = new THREE.PointLight("#b8c8e4", 0, 6, 1.4); root.add(skey);
  const cl = new THREE.Vector3(), PD = EV.phoneDrop;
  return (fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f), wind = 1.5;
    cl.set(...fr.plan.cam.pos).sub(root.position);
    rain(cl, t, wind); spl(cl, t, 0.13);
    papers.forEach(({ m, ph: p0 }, i) => { const u = fract(t * 0.2 + p0), x = cl.x - 3 + 9 * u, y = 0.15 + 0.6 * Math.abs(Math.sin(u * 9 + i)) * (0.5 + 0.5 * Math.sin(t + i)), z = 0.6 + 1.6 * Math.abs(Math.sin(i * 2.1));
      m.position.set(x, y, z); m.rotation.set(t * (1.3 + 0.2 * i), t * 0.9 + i, t * 0.7); });
    masjid.visible = kind === "pastMasjid"; warm.intensity = masjid.visible ? 3.2 : 0;
    const sk = kind === "collapseStreet" ? [42.0, 3.0] : kind === "walkHome" ? [37.0, 2.0] : kind === "phoneDrop" ? [40.6, 1.6] : null;
    skey.intensity = sk ? sk[1] : 0; if (sk) skey.position.set(sk[0], 2.4, 2.2);
    // the bus (its body is the street set's vehicle): lights that follow it
    const bx = BUS.passX + BUS.speed * (t - BUS.passAt), busOn = kind === "runRain" || kind === "missBus" || kind === "lookClosely";
    tail.forEach((s, i) => { s.visible = busOn; s.position.set(bx - 5.62, 0.9, BUS.lane + (i ? 0.95 : -0.95)); });
    busWin.visible = busOn; busWin.position.set(bx - 0.15, 2.0, BUS.lane - 1.28);
    // the phone: in his hand until PD, a 0.3 s fall, a bounce in the puddle, the screen cracking; it stays there
    const showPh = kind === "phoneDrop" || kind === "collapseStreet";
    ph.visible = showPh; puddle.visible = showPh || kind === "walkHome";
    if (showPh) {
      const s = (f - PD) / FPS;
      if (s < 0) ph.position.set(40.15 + 0.45 * ((f - span("phoneDrop").from) / FPS) + 0.32, 1.0, 1.05);
      else { const k = clamp01(s / 0.3), y = KERB_Y + 0.006 + (1.0 - KERB_Y) * (1 - k * k) + (s > 0.3 ? 0.05 * Math.abs(Math.sin((s - 0.3) * 12)) * Math.exp(-(s - 0.3) * 8) : 0); ph.position.set(40.6, y, 1.05 + 0.2 * k); ph.rotation.set(0.6 * (1 - k), 0.4, 0.9 * (1 - k)); }
      drawCrack(clamp01((s - 0.3) / 0.12));
      const rs = s - 0.3; ring.material.opacity = rs > 0 && rs < 1.2 ? 0.5 * (1 - rs / 1.2) : 0; ring.scale.setScalar(0.05 + 0.4 * clamp01(rs / 1.2));
      splash.visible = rs > 0 && rs < 0.6;
      if (splash.visible) for (let i = 0; i < NSP; i++) { const a = (i / NSP) * Math.PI * 2, v = 0.3 + 0.3 * ((i * 7) % 5) / 5; sp.set([40.6 + Math.cos(a) * v * rs, KERB_Y + 0.02 + (1.2 * rs - 4.9 * rs * rs) * (0.6 + 0.4 * ((i * 3) % 4) / 4), 1.25 + Math.sin(a) * v * rs * 0.6], i * 3); }
      splash.geometry.attributes.position.needsUpdate = true;
    } else splash.visible = false;
    // splashes at his feet while he runs
    if (kind === "runRain" || kind === "missBus") { const x = runX(t); for (let i = 0; i < NSP; i++) { const life = fract(t * 3.0 + i / NSP), a = i * 2.4;
      sp.set([x - 0.3 * life + 0.12 * Math.cos(a), KERB_Y + 0.02 + 0.35 * life * (1 - life), 1.5 + 0.12 * Math.sin(a)], i * 3); } splash.visible = true; splash.geometry.attributes.position.needsUpdate = true; }
  };
};
const KERB_Y = 0.12;

// =====================================================================================================================
export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const up: Partial<Record<SetId, (fr: Frame, f: number) => void>> = {};
  if (roots.bedroom) up.bedroom = bedroomLife(roots.bedroom);
  if (roots.hospital) up.hospital = hospitalLife(roots.hospital);
  if (roots.cemetery) up.cemetery = cemeteryLife(roots.cemetery);
  if (roots.street) up.street = streetLife(roots.street);
  for (const r of Object.values(roots)) r!.updateMatrixWorld(true);
  return { update: (fr: Frame, f: number) => up[fr.set]?.(fr, Math.min(f, FRAMES - 1)) };
};
void applyCam; void F; void CEMETERY;
