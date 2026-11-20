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
import { FPS, F, EV, SHOTS, shotOf, procX, PROC, FRAMES } from "./timeline";
import { CEMETERY } from "../../sets/cemetery";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const fract = (x: number) => x - Math.floor(x);
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
const bedroomLife = (root: THREE.Object3D) => {
  const rainOn = glassRain(root, 1.3, 1.2, [1.05, 1.6, -2.17], 3);
  // the dusty prayer mat on the floor by the window; a layer of dust over it
  const pm = buildMat(1.0, 0.25, 1.25, 0.7); pm.position.y += 0.013; pm.rotation.y = 0.12; root.add(pm);
  const dustT = ctex("dustLayer", 256, 256, (g, r) => { for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(200,200,190,${0.05 + 0.12 * r()})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); } });
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.7), new THREE.MeshBasicMaterial({ map: dustT, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.55, 0.57, 0.62) }));
  dust.rotation.set(-Math.PI / 2, 0, -0.12); dust.position.set(1.0, 0.03, 0.25); dust.layers.set(NOINK); root.add(dust);
  // the phone on the mat (after he is gone): its screen lights up with each notification
  const phone = new THREE.Group(); phone.position.set(1.12, 0.032, 0.3); phone.rotation.y = 0.5; root.add(phone);
  box(phone, [-0.04, 0, -0.075], [0.04, 0.01, 0.075], mat("#1b1d24"), false);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.135), new THREE.MeshBasicMaterial({ color: new THREE.Color("#cfe6ff"), fog: false })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.011; phone.add(scr);
  const phL = new THREE.PointLight("#cfe1ff", 0, 2.5, 2); phL.position.set(1.12, 0.2, 0.3); root.add(phL);
  // the mushaf on the top of the bookshelf, closed, dust on it
  const book = new THREE.Group(); book.position.set(-2.63, 1.9, -2.03); book.rotation.y = 0.2; root.add(book);
  box(book, [-0.13, 0, -0.09], [0.13, 0.05, 0.09], mat("#2f4a35"));
  box(book, [-0.125, 0.006, -0.085], [0.125, 0.044, 0.088], mat("#e8dfc6"), false);
  box(book, [-0.05, 0.05, -0.05], [0.05, 0.052, 0.05], mat("#9c8a50"), false);                // a plain gold medallion (no writing)
  const bdust = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.19), new THREE.MeshBasicMaterial({ map: dustT, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.7, 0.7, 0.72) }));
  bdust.rotation.x = -Math.PI / 2; bdust.position.y = 0.056; bdust.layers.set(NOINK); book.add(bdust);
  // his prayer beads on the nightstand
  const beads = new THREE.Group(); beads.position.set(-0.45, 0.556, -0.95); root.add(beads);   // on the bed, beside him
  for (let i = 0; i < 33; i++) { const a = (i / 33) * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), mat("#4a2e22")); b.position.set(0.06 * Math.cos(a) * 1.3, 0.009, 0.06 * Math.sin(a)); beads.add(b); }
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 8), mat("#6b4a33")); tassel.rotation.z = Math.PI / 2; tassel.position.set(0.12, 0.012, 0); beads.add(tassel);
  // his laptop open on the bed: a bank screen (balance, salary in, a rising line), lit in the dark
  const lap = new THREE.Group(); lap.position.set(0.12, 0.55, -1.25); lap.rotation.y = 0.5; root.add(lap);
  box(lap, [-0.17, 0, -0.12], [0.17, 0.018, 0.12], mat("#8e939b"));
  const lid = new THREE.Group(); lid.position.set(0, 0.018, -0.12); lid.rotation.x = -0.32; lap.add(lid);
  box(lid, [-0.17, 0, -0.012], [0.17, 0.23, 0], mat("#8e939b"));
  const bank = liveCanvas(512, 320);
  const lscr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), glow("#ffffff", 1.1, bank.tex)); lscr.position.set(0, 0.118, 0.002); lid.add(lscr);
  const lapL = new THREE.PointLight("#bcd4ff", 0, 2.5, 2); lapL.position.set(0.12, 0.85, -1.0); root.add(lapL);
  const drawBank = (t: number) => bank.redraw((g) => {
    g.fillStyle = "#0f1622"; g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#6f8fb8"; g.font = "600 20px Inter, Arial"; g.fillText("CURRENT ACCOUNT", 28, 44);
    g.fillStyle = "#ffffff"; g.font = "800 54px Inter, Arial"; g.fillText(`£${(24812.4 + Math.floor(t * 37) * 3.5).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`, 28, 108);
    g.strokeStyle = "#5fd18a"; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= 456; x += 8) { const y = 230 - x * 0.18 - 14 * Math.sin(x * 0.05) - 6 * Math.sin(x * 0.17); if (x) g.lineTo(28 + x, y); else g.moveTo(28, y); }
    g.stroke();
    g.fillStyle = "#5fd18a"; g.font = "700 22px Inter, Arial"; g.fillText("+£3,250.00  Salary", 28, 290); g.fillStyle = "#8aa0bf"; g.fillText("Savings goal 82%", 300, 290);
  });
  // the ceiling light (a dim, lonely lamp) that flickers and dies; lightning through the window
  const ceil = new THREE.PointLight("#ffd9a8", 0, 7, 1.5); ceil.position.set(0, 2.6, -0.6); root.add(ceil);
  const cold = new THREE.PointLight("#8fa6d8", 0, 9, 1.3); cold.position.set(0.9, 1.9, -1.2); root.add(cold);   // the window's cold light (rain-grey night)
  const shelfL = new THREE.PointLight("#9fb2d8", 0, 2.5, 1.6); shelfL.position.set(-2.2, 2.4, -1.4); root.add(shelfL);
  const flash = new THREE.PointLight("#c8d8ff", 0, 12, 1.2); flash.position.set(1.05, 1.8, -1.6); root.add(flash);
  const clock = root.getObjectByName("wallClock"), hourC = root.getObjectByName("clockHour"), minC = root.getObjectByName("clockMin");
  const sec = new THREE.Group(); sec.position.z = 0.062; clock?.add(sec); box(sec, [-0.004, -0.03, 0], [0.004, 0.17, 0.006], mat("#7a2a26"), false);
  const [f0, f1] = EV.flicker, [l0, l1] = EV.lightning;
  return (_fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f);
    rainOn(t, 1);
    // the ceiling light: steady and dim, flickering from f0, dead at lightOut; never back
    let k = f < f0 ? 1 : f < EV.lightOut ? Math.max(0, 1 - 0.85 * sm((f - f0) / (EV.lightOut - f0))) * (Math.sin(f * 1.9) * Math.sin(f * 0.53) > 0.35 ? 0.15 : 1) : 0;
    if (f >= SHOTS.find((s) => s.kind === "hospRain")!.from) k = 0;
    ceil.intensity = 1.1 * k; cold.intensity = kind === "lightOut" ? 0.5 * (1 - sm((f - EV.phoneOff) / 20)) + 0.25 : f >= EV.lightOut ? 1.4 : 0.6; shelfL.intensity = kind === "mushaf" || kind === "leftBehind" ? 1.6 : 0;
    // the clock: 03:12 and ticking; racing in "clockSpin"; stopped at 03:47 once he is gone
    const spin = kind === "clockSpin" ? (f - SHOTS.find((s) => s.kind === "clockSpin")!.from) / FPS : 0, gone = f >= SHOTS.find((s) => s.kind === "hospRain")!.from;
    const secs = gone ? 47 * 60 : 12 * 60 + Math.floor(t) + spin * 1800;
    if (hourC && minC) { minC.rotation.z = -((secs / 60) % 60) / 60 * Math.PI * 2; hourC.rotation.z = -((3 + secs / 3600) % 12) / 12 * Math.PI * 2; }
    sec.rotation.z = -((gone ? 31 : Math.floor(t + spin * 60)) % 60) / 60 * Math.PI * 2;
    const lapOn = kind === "laptopBank" || kind === "laptopClose" || kind === "trackerRoom" || kind === "phoneGlow";
    lap.visible = lapOn; lapL.intensity = lapOn ? 0.7 : 0; if (lapOn) drawBank(t);
    shelfL.intensity = kind === "mushaf" || kind === "leftBehind" || kind === "mushafDust" ? 1.6 : shelfL.intensity;
    // the phone on the mat: dark until he is gone; then it lights up with each notification and fades again
    const mp = SHOTS.find((s) => s.kind === "matPhone")!, onMat = f >= mp.from;
    phone.visible = onMat; const blink = onMat ? Math.max(0, ...[0.15, 0.95, 1.6].map((d) => { const x = (f - mp.from) / FPS - d; return x >= 0 && x < 1.4 ? (x < 0.1 ? x / 0.1 : 1 - (x - 0.1) / 1.3) : 0; })) : 0;
    (scr.material as THREE.MeshBasicMaterial).color.set("#cfe6ff").multiplyScalar(0.05 + 1.6 * blink); phL.intensity = 0.6 * blink;
    // lightning ("No!"): two cold pulses
    const lp = (x: number) => (x >= 0 && x < 5 ? Math.exp(-x / 1.6) : 0);
    flash.intensity = 9 * Math.max(lp(f - l0), 0.7 * lp(f - l1));
  };
};

// =====================================================================================================================
const hospitalLife = (root: THREE.Object3D) => {
  const rainOn = glassRain(root, 1.1, 1.6, [-1.6, 1.5, -2.37], 5);
  const pil = root.getObjectByName("hospPillow"), sh = root.getObjectByName("hospSheet");
  return (_fr: Frame, f: number) => { rainOn(f / FPS, 1); const lying = kindAt(f) === "hospitalWide"; if (pil) pil.visible = !lying; if (sh) sh.visible = !lying; };
};

// =====================================================================================================================
const cemeteryLife = (root: THREE.Object3D) => {
  const rain = rainField(root), spl = splashes(root);
  // the bier: two poles, a board, the shrouded body (white, plain), a dark green cloth over it
  const bier = new THREE.Group(); root.add(bier);
  for (const z of [-0.42, 0.42]) { const p = cyl(bier, 0.03, 0.03, 2.6, mat("#4a3426"), [0, 0, z], 8); p.rotation.z = Math.PI / 2; }
  box(bier, [-0.9, 0.02, -0.38], [0.9, 0.06, 0.38], mat("#5a3e2c"));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.3, 6, 12), mat("#e9e6de")); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.8); body.position.y = 0.24; body.castShadow = true; bier.add(body);
  const cloth = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 1.2, 6, 12), mat("#24382c")); cloth.rotation.z = Math.PI / 2; cloth.scale.set(1, 1, 0.84); cloth.position.set(0.05, 0.27, 0); cloth.visible = false; bier.add(cloth);
  // soil falling from two shovels into the grave
  const NS = 120, soil = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color("#4a3a2c"), size: 0.05, transparent: true, depthWrite: false, fog: false }));
  const sp = new Float32Array(NS * 3); soil.geometry.setAttribute("position", new THREE.BufferAttribute(sp, 3)); soil.layers.set(NOINK); soil.frustumCulled = false; root.add(soil);
  const sr = rnd(9), ss = Float32Array.from({ length: NS * 3 }, sr);
  // mist lying in the cemetery
  const mistT = ctex("lrMist", 512, 256, (g, r) => { for (let i = 0; i < 40; i++) { const x = r() * 512, y = 60 + r() * 140, rad = 40 + 90 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } });
  const mists = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshBasicMaterial({ map: mistT, color: new THREE.Color("#8a96a8"), transparent: true, opacity: 0.55, depthWrite: false, fog: false })); m.position.set(0, 0.9 + 0.3 * (i % 3), -1 - i * 2.4); m.layers.set(NOINK); root.add(m); return m; });
  const key = new THREE.PointLight("#c8d2e4", 0, 10, 1.3); root.add(key);   // a soft cold key over the action
  // a lantern standing on the ground by the grave: a small warm light in all the grey
  const lan = new THREE.Group(); lan.position.set(0.15, 0, 0.72); root.add(lan);
  box(lan, [-0.09, 0, -0.09], [0.09, 0.03, 0.09], mat("#2a2622")); box(lan, [-0.09, 0.3, -0.09], [0.09, 0.33, 0.09], mat("#2a2622"));
  for (const [x, z] of [[-0.085, -0.085], [0.085, -0.085], [-0.085, 0.085], [0.085, 0.085]]) box(lan, [x - 0.01, 0.03, z - 0.01], [x + 0.01, 0.3, z + 0.01], mat("#2a2622"));
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.24, 12), glow("#ffc070", 2.0)); flame.position.y = 0.165; flame.layers.set(NOINK); lan.add(flame);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), mat("#2a2622")); handle.position.y = 0.33; lan.add(handle);
  const lanHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.0, 0.6, 0.25), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); lanHalo.scale.set(1.1, 1.1, 1); lanHalo.position.y = 0.17; lanHalo.layers.set(NOINK); lan.add(lanHalo);
  lan.traverse((o) => o.layers.set(NOINK));                              // a small prop: never pushes the camera (the collision check ignores it)
  const lanL = new THREE.PointLight("#ffb866", 0, 6, 1.5); lanL.position.set(0.15, 0.45, 0.72); root.add(lanL);
  const cl = new THREE.Vector3();
  return (fr: Frame, f: number) => {
    const t = f / FPS, kind = kindAt(f);
    cl.set(...fr.plan.cam.pos).sub(root.position);
    rain(cl, t, 1); spl(cl, t);
    const kx = kind.startsWith("janazah") ? procX(t) : 0; key.position.set(kx + 0.4, kind === "burial" ? 2.6 : 3.2, kind.startsWith("janazah") ? PROC.z + 1.2 : 0.8); key.intensity = kind === "burial" ? 5.0 : kind === "graveFog" ? 2.4 - 1.2 * sm((f - SHOTS.find((s) => s.kind === "graveFog")!.from) / 120) : 3.0;
    const lanOn = kind === "burial" || kind === "leaving" || kind === "graveFog";
    lan.visible = lanOn; lanL.intensity = lanOn ? 2.6 * (0.94 + 0.06 * Math.sin(t * 9) * Math.sin(t * 3.1)) : 0;
    bier.visible = kind === "janazah" || kind === "janazahLow";
    if (bier.visible) { const x = procX(t); bier.position.set(x, 1.47 + 0.015 * Math.sin(t * 5.2), PROC.z); bier.rotation.z = 0.012 * Math.sin(t * 2.6); }
    const [s0, s1] = EV.soil; soil.visible = kind === "burial" && f >= s0 && f < s1;
    if (soil.visible) {
      for (let i = 0; i < NS; i++) { const side = i % 2 ? 1 : -1, life = fract(t * 1.2 + ss[i * 3] * 0.35 + (side > 0 ? 0.5 : 0)), drop = life * life;
        sp.set([side * (1.05 - 0.6 * life) + (ss[i * 3 + 1] - 0.5) * 0.25, 0.75 - 1.4 * drop, (ss[i * 3 + 2] - 0.5) * 0.4], i * 3); }
      soil.geometry.attributes.position.needsUpdate = true;
    }
    const thick = kind === "graveFog" ? 1.25 : 1;
    mists.forEach((m, i) => { m.position.x = Math.sin(t * 0.05 + i) * 1.5; m.rotation.set(0, Math.atan2(cl.x - m.position.x, cl.z - m.position.z), 0); const up = Math.max(0, Math.min(1, (cl.y - 1.8) / 2.5)); (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * thick * (1 - 0.7 * up); });
    void CEMETERY;
  };
};

// =====================================================================================================================
const streetLife = (root: THREE.Object3D) => {
  const rain = rainField(root, 1700), spl = splashes(root, 200);
  // papers blowing along the empty street
  const papers = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshBasicMaterial({ color: new THREE.Color("#b9b6ac").multiplyScalar(0.55), side: THREE.DoubleSide, fog: false })); m.layers.set(NOINK); root.add(m); return { m, ph: i / 9 }; });
  // his family's house: a closed door, dark windows
  const house = new THREE.Group(); root.add(house); const X = 27;
  box(house, [X - 0.55, 0, -0.17], [X + 0.55, 2.4, -0.12], mat("#3a3f46")); box(house, [X - 0.46, 0, -0.12], [X + 0.46, 2.18, -0.09], mat("#2a1d16"));
  box(house, [X + 0.3, 1.0, -0.09], [X + 0.36, 1.08, -0.06], mat("#5a5040"), false);
  for (const wx of [X - 1.3, X + 1.3]) { box(house, [wx - 0.45, 3.4, -0.2], [wx + 0.45, 4.6, -0.12], mat("#1a1e26")); box(house, [wx - 0.5, 3.35, -0.2], [wx + 0.5, 3.4, -0.08], mat("#4a4f56")); }
  const cl = new THREE.Vector3();
  return (fr: Frame, f: number) => {
    const t = f / FPS, wind = kindAt(f) === "emptyStreet" || kindAt(f) === "emptyCity" ? 1.8 : 1;
    cl.set(...fr.plan.cam.pos).sub(root.position);
    rain(cl, t, wind); spl(cl, t, 0.13);
    papers.forEach(({ m, ph }, i) => { const u = fract(t * 0.16 + ph), x = cl.x - 3 + 9 * u, y = 0.15 + 0.6 * Math.abs(Math.sin(u * 9 + i)) * (0.5 + 0.5 * Math.sin(t + i)), z = 1.2 + 2.0 * Math.sin(i * 2.1);
      m.position.set(x, y, z); m.rotation.set(t * (1.3 + 0.2 * i), t * 0.9 + i, t * 0.7); });
  };
};

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
void applyCam; void glow; void F;
