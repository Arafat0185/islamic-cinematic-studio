// Background life for "The First Question - QURAN": slow, calm motion in every set, so the world feels alive without
// pulling the eye from the captions or the Traveller. Everything is a pure function of the frame (deterministic, so
// chunked renders join seamlessly). Nearly everything sits on the NOINK layer: it is never outlined, the camera
// collision check ignores it, and depth of field treats it as part of what is behind it (soft, out of focus).
//   street     rain, passing headlights (reflected in the shop glass and on the wet pavement, their light sweeping over
//              him), a crossing signal changing red -> green -> amber, neon signs flickering softly in the windows
//   office     two faceless coworkers walking past behind him, monitors shimmering, papers on the desks, a clock
//              racing on the window mullion
//   void       cold embers drifting up, dark smoke wisps, the light slowly dying
//   bedroom    a small high window: faint blue pre-dawn light growing, sheer curtains moving in the breeze; the wall
//              clock's second hand ticking (05:12, as on his phone); the phone's light fading out after he turns it over
//   courtyard  the pool rippling (drops from a low bubbling spout, the lamps' reflections moving), the lanterns swaying
//              with moths circling them, the palms and shrubs moving in the wind, petals and leaves drifting down, the
//              stars twinkling, clouds drifting, one slow shooting star, birds crossing at dawn, a light on the distant
//              minaret, golden motes rising (more as the verses go on), slanting light that moves from night to
//              morning to afternoon to evening, and three faceless worshippers far back in the gallery behind the
//              arches; at the end the motes gather into the star mark on the floor as the camera cranes up
// Content rules: worshippers and coworkers are plain faceless figures; no glow stands for Allah; nothing flashes.
import * as THREE from "three";
import { NOINK } from "../../render/ink";
import { ctex } from "../../draw/paint";
import { untone } from "../../render/shade";
import { lightBeam, mat, box } from "../../sets/common";
import { applyCam, type Cam } from "../../camera/ease";
import { WALL_Z, APEX } from "../courtyard-test/courtyard";
import { ARCHES, MAIN, LIT, POOL } from "../courtyard-beauty/world";
import type { Frame, SetId } from "../../story/story";
import { FPS, F, PHRASES, EV, SHOTS, streetX, P2, MARK, FRAMES } from "./timeline";

// ---------------- helpers ----------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const noink = <T extends THREE.Object3D>(o: T) => { o.traverse((c) => c.layers.set(NOINK)); return o; };
const fract = (x: number) => x - Math.floor(x);
const shotSpan = (kind: string) => { const s = SHOTS.find((x) => x.kind === kind)!; return { a: s.from, b: s.to }; };
const softDot = () => ctex("lifeDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
/** additive coloured points (colour = brightness: black = invisible) */
const points = (parent: THREE.Object3D, n: number, size: number, attenuate = true) => {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: softDot(), size, sizeAttenuation: attenuate, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  p.layers.set(NOINK); p.frustumCulled = false; parent.add(p);
  return { p, pos, col, commit: () => { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; } };
};
const glowSprite = (parent: THREE.Object3D, colour: THREE.Color, size: number, pos: [number, number, number]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: colour.clone(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); s.position.set(...pos); s.layers.set(NOINK); parent.add(s);
  return s;
};
/** a world point at screen position (nx, ny in -1..1) and distance d from the camera of this frame */
const pcam = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 600);
const atScreen = (c: Cam, nx: number, ny: number, d: number, out: THREE.Vector3) => {
  applyCam(pcam, c); pcam.updateProjectionMatrix(); pcam.updateMatrixWorld();
  out.set(nx, ny, 0.5).unproject(pcam).sub(pcam.position).normalize().multiplyScalar(d).add(pcam.position);
  return out;
};

// ---------------- a faceless figure, drawn on a canvas (coworkers, worshippers) ----------------
type Figure = { skin: string; hair: string; top: string; legs: string; cap?: string; robe?: boolean; papers?: boolean };
const INK = "#241726";
/** pose: "walk" (phase 0..1 of a stride), "stand" (hands folded, in prayer), "sit" (cross-legged) */
const figureTex = (key: string, fig: Figure, pose: "walk" | "stand" | "sit", phase = 0) => ctex(`fig|${key}|${pose}|${phase}`, 128, 256, (g) => {
  g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = 4; g.strokeStyle = INK;
  const sw = Math.sin(phase * Math.PI * 2);
  const shape = (pts: [number, number][], fill: string) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
  if (pose === "sit") {
    shape([[24, 250], [104, 250], [98, 222], [30, 222]], fig.robe ? fig.top : fig.legs);             // crossed legs
    shape([[40, 226], [88, 226], [84, 140], [44, 140]], fig.top);                                     // body
    shape([[42, 150], [30, 214], [46, 218], [54, 160]], fig.top); shape([[86, 150], [98, 214], [82, 218], [74, 160]], fig.top);
  } else {
    const hip = 168, foot = 250;
    if (pose === "walk" && !fig.robe) {
      for (const k of [1, -1]) { const dx = 22 * sw * k; shape([[58, hip], [70, hip], [64 + dx + 6, foot], [64 + dx - 6, foot]], fig.legs); }
    } else {
      // a robe to the ankles (its hem sways a little when walking)
      const s2 = pose === "walk" ? 6 * sw : 0;
      shape([[44, 96], [84, 96], [92 + s2, 246], [36 + s2, 246]], fig.top);
    }
    shape([[44, 96], [84, 96], [86, hip + 6], [42, hip + 6]], fig.top);                               // torso
    if (pose === "stand") { shape([[46, 104], [40, 150], [82, 146], [82, 136], [58, 136], [56, 104]], fig.top); } // arms folded
    else for (const k of [1, -1]) { const dx = -14 * sw * k; shape([[k > 0 ? 44 : 84, 102], [(k > 0 ? 40 : 88) + dx, 160], [(k > 0 ? 50 : 78) + dx, 162], [k > 0 ? 54 : 74, 106]], fig.top); }
    if (fig.papers) { g.save(); g.translate(78, 132); g.rotate(-0.2); g.fillStyle = "#f4f1ea"; g.fillRect(-12, -16, 24, 30); g.strokeRect(-12, -16, 24, 30); g.restore(); }
  }
  // the head: plain, no face; hair or a cap on top only
  const hy = pose === "sit" ? 112 : 70;
  g.beginPath(); g.arc(64, hy, 22, 0, Math.PI * 2); g.fillStyle = fig.skin; g.fill(); g.stroke();
  g.beginPath(); g.arc(64, hy, 22, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = fig.cap ?? fig.hair; g.fill(); g.stroke();
});
const figureSprite = (parent: THREE.Object3D, h: number, tint: number) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, color: new THREE.Color(tint, tint, tint) }));
  s.center.set(0.5, 0); s.scale.set(h / 2, h, 1); s.layers.set(NOINK); parent.add(s);
  return s;
};

// =====================================================================================================================
// street
// =====================================================================================================================
const buildStreetLife = (root: THREE.Object3D) => {
  const { a: A } = shotSpan("street");
  // ---- rain: thin streaks falling across the view (the field covers his whole walk and the camera's side) ----
  const N = 520, X0 = -8.5, X1 = 2.5, YT = 4.6, Z0 = 0.05, Z1 = 4.25, LEN = 0.24, VY = 7.5, VX = -0.9;
  const r = rnd(17), seed = Float32Array.from({ length: N * 3 }, r);
  const rp = new Float32Array(N * 6), rgeo = new THREE.BufferGeometry(); rgeo.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: new THREE.Color("#c3cdea"), transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
  rain.layers.set(NOINK); rain.frustumCulled = false; root.add(rain);
  // ---- passing cars: their lights reflected in the shop glass and on the wet pavement, and lighting him ----
  const streak = ctex("headStreak", 256, 32, (g) => {
    for (let x = 0; x < 256; x++) { const u = Math.abs(x / 255 - 0.5) * 2, a = Math.pow(1 - u, 1.6);
      const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(x, 0, 1, 32); }
  });
  streak.wrapS = streak.wrapT = THREE.ClampToEdgeWrapping;
  const cars = [0.35, 1.45, 2.55, 3.55, 4.45].map((tc, k) => {
    const dir = k % 2 ? -1 : 1, col = new THREE.Color(dir > 0 ? "#fff0d2" : "#ff5a40").multiplyScalar(dir > 0 ? 1.0 : 0.7);
    const mk = (w: number, h: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: streak, color: col.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.layers.set(NOINK); root.add(m); return m; };
    const glass = [mk(2.6, 0.1), mk(2.2, 0.07)], wet = mk(3.0, 0.5); wet.rotation.x = -Math.PI / 2;
    const light = new THREE.PointLight(dir > 0 ? "#ffe6c0" : "#ff6a50", 0, 9, 1.5); root.add(light);
    return { tc, dir, col, glass, wet, light, cx: streetX(tc) + 0.25 };
  });
  // ---- a crossing signal on the building side, changing red -> green -> amber (soft crossfades) ----
  const SX = 0.6, SZ = 0.32, iron = mat("#2d3138");
  box(root, [SX - 0.045, 0, SZ - 0.045], [SX + 0.045, 2.4, SZ + 0.045], iron);
  box(root, [SX - 0.16, 2.3, SZ - 0.1], [SX + 0.16, 3.1, SZ + 0.12], iron);
  const sig = (["#ff3b30", "#ffb020", "#3ddc84"] as const).map((c, i) => {
    const y = 2.95 - i * 0.25, base = new THREE.Color(c);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), new THREE.MeshBasicMaterial({ color: base.clone(), fog: false }));
    disc.position.set(SX, y, SZ + 0.125); disc.layers.set(NOINK); root.add(disc);
    const halo = glowSprite(root, base, 0.75, [SX, y, SZ + 0.16]);
    return { disc, halo, base };
  });
  // ---- neon signs inside the shop windows, flickering softly ----
  const neon = (txt: string, c: string) => ctex(`neon|${txt}|${c}`, 256, 96, (g) => {
    g.font = "800 58px Inter, Arial"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = c; g.shadowBlur = 18; g.fillStyle = c; g.fillText(txt, 128, 50); g.shadowBlur = 0; g.fillStyle = "#ffffff"; g.globalAlpha = 0.65; g.fillText(txt, 128, 50);
  });
  const signs = ([[-7.6, "OPEN", "#ff7a3a"], [-5.6, "CAFE", "#ffd36b"], [-3.6, "24/7", "#6fd3ff"], [-1.4, "SALE", "#ff8fb0"], [0.9, "OPEN", "#ff7a3a"]] as [number, string, string][]).map(([x, t, c], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), new THREE.MeshBasicMaterial({ map: neon(t, c), color: new THREE.Color(1.6, 1.6, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.position.set(x, 2.05 - 0.12 * (i % 2), -0.135); m.layers.set(NOINK); root.add(m);
    return m;
  });
  let shopMats: { m: THREE.MeshBasicMaterial; base: THREE.Color }[] | null = null;
  const soft = (t: number, i: number) => 1 - 0.22 * Math.pow(Math.max(0, Math.sin(0.85 * t + 1.9 * i)), 14) - 0.04 * Math.sin(5.3 * t + i); // slow dips, never off

  return (fr: Frame, f: number) => {
    const t = f / FPS;
    for (let i = 0; i < N; i++) {
      const h = fract(seed[i * 3 + 1] + (t * VY) / YT), y = YT * (1 - h), x = X0 + (X1 - X0) * seed[i * 3] + VX * (t + seed[i * 3 + 1]) * 0.3, z = Z0 + (Z1 - Z0) * seed[i * 3 + 2];
      rp.set([x, y, z, x - (VX * LEN) / VY, y + LEN, z], i * 6);
    }
    rgeo.attributes.position.needsUpdate = true;
    for (const c of cars) {
      const d = t - c.tc, k = Math.exp(-((d / 0.5) ** 2)), x = c.cx + c.dir * 7 * d;
      c.glass.forEach((m, j) => { m.position.set(x + c.dir * 0.4 * j, 1.05 - 0.22 * j, -0.13 + 0.002 * j); (m.material as THREE.MeshBasicMaterial).color.copy(c.col).multiplyScalar(k * (j ? 0.5 : 0.8)); });
      c.wet.position.set(x, STREET_WET_Y, 1.55); (c.wet.material as THREE.MeshBasicMaterial).color.copy(c.col).multiplyScalar(0.35 * k);
      c.light.position.set(x, 0.8, 6.0); c.light.intensity = 3.2 * k * (c.dir > 0 ? 1 : 0.5);
    }
    // green, amber from 3.9 s, red from 4.5 s (it comes into view at the end of his walk)
    const lv = [sm((t - 4.4) / 0.25), sm((t - 3.8) / 0.25) * (1 - sm((t - 4.4) / 0.25)), 1 - sm((t - 3.8) / 0.25)];
    sig.forEach((s, i) => { const k = 0.1 + 0.9 * lv[i]; (s.disc.material as THREE.MeshBasicMaterial).color.copy(s.base).multiplyScalar(0.25 + 1.6 * k); s.halo.material.color.copy(s.base).multiplyScalar(0.55 * lv[i]); });
    signs.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.setScalar(1.6 * soft(t, i)));
    if (fr.state === "night") {
      if (!shopMats) {
        shopMats = [];
        root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if ((o as THREE.Mesh).isMesh && m && (m as THREE.MeshBasicMaterial).isMeshBasicMaterial && m.map && m.color.r > 1.1 && !shopMats!.some((x) => x.m === m)) shopMats!.push({ m, base: m.color.clone() }); });
      }
      shopMats.forEach((s, i) => s.m.color.copy(s.base).multiplyScalar(0.97 + 0.03 * soft(t, i + 3)));
    }
    void A;
  };
};
const STREET_WET_Y = 0.13;

// =====================================================================================================================
// office
// =====================================================================================================================
const buildOfficeLife = (root: THREE.Object3D) => {
  const { a } = shotSpan("office"), t0 = a / FPS;
  const A: Figure = { skin: "#b07a54", hair: "#2a1e1a", top: "#5a7bb0", legs: "#2c3038" };
  const B: Figure = { skin: "#8d5b3c", hair: "#1a1416", top: "#8a6a4a", legs: "#3a3d45", papers: true };
  const walkers = [
    { fig: A, key: "coA", s: figureSprite(root, 1.74, 0.82), z: -2.1, x0: -1.0, v: 1.15, from: t0 - 0.2 },
    { fig: B, key: "coB", s: figureSprite(root, 1.7, 0.82), z: -2.3, x0: 2.05, v: -1.0, from: t0 + 0.6 },
  ];
  // papers on his desk and the desk behind
  const paper = mat("#f3efe6");
  for (const [x, z, ry, n] of [[0.68, -1.18, 0.15, 3], [1.18, -0.42, -0.3, 1], [-1.5, -2.05, 0.4, 4], [-2.2, -1.95, -0.2, 1]] as [number, number, number, number][]) {
    for (let k = 0; k < n; k++) { const m = box(root, [-0.105, 0, -0.15], [0.105, 0.004, 0.15], paper, false); m.position.set(x + 0.01 * k, 0.752 + 0.005 * k, z); m.rotation.y = ry + 0.12 * k; }
  }
  // a clock on the window mullion, racing (time slipping away)
  const clock = new THREE.Group(); clock.position.set(0.03, 2.28, -2.47); root.add(clock);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 32), mat("#f2eee3")); face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 32), mat("#2c3038")); rim.position.z = 0.02; clock.add(rim);
  const hand = (len: number, w: number, c: string) => { const p = new THREE.Group(); p.position.z = 0.03; clock.add(p); box(p, [-w / 2, -0.02, 0], [w / 2, len, 0.008], mat(c), false); return p; };
  const hourH = hand(0.09, 0.022, "#2c3038"), minH = hand(0.13, 0.015, "#2c3038"), secH = hand(0.145, 0.006, "#b8423b");
  // the monitors' glow shimmers a little
  const blue = new THREE.Color("#9fc6ee"), mons: { m: THREE.MeshBasicMaterial; base: THREE.Color }[] = [];
  root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if ((o as THREE.Mesh).isMesh && m?.isMeshBasicMaterial && !m.map && Math.abs(m.color.r / m.color.b - blue.r / blue.b) < 0.01 && Math.abs(m.color.g / m.color.b - blue.g / blue.b) < 0.01) mons.push({ m, base: m.color.clone() }); });
  return (_fr: Frame, f: number) => {
    const t = f / FPS;
    for (const w of walkers) {
      const d = t - w.from, x = w.x0 + w.v * d, ph = Math.round(fract(Math.abs(w.v * d) / 1.3) * 8) % 8;
      w.s.material.map = figureTex(w.key, w.fig, "walk", ph / 8); w.s.material.needsUpdate = true;
      w.s.position.set(x, 0.015 * Math.abs(Math.sin(ph / 8 * Math.PI * 2)), w.z);
    }
    secH.rotation.z = -(Math.floor(t * 8) / 60) * Math.PI * 2;
    minH.rotation.z = -(t / 6) * Math.PI * 2; hourH.rotation.z = -((2 + t / 72) / 12) * Math.PI * 2;
    mons.forEach((s, i) => s.m.color.copy(s.base).multiplyScalar(1 + 0.05 * Math.sin(t * 6.3 + i * 1.7) + 0.025 * Math.sin(t * 17.1 + i)));
  };
};

// =====================================================================================================================
// void
// =====================================================================================================================
const smokeTex = () => ctex("smokeWisp", 256, 256, (g, r) => {
  for (let i = 0; i < 26; i++) {
    const x = 70 + r() * 116, y = 50 + r() * 156, rad = 22 + r() * 56, a = 0.06 + 0.1 * r();
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
});
const buildVoidLife = (root: THREE.Object3D) => {
  const { a, b } = shotSpan("void");
  const N = 110, em = points(root, N, 0.045), r = rnd(5), sd = Float32Array.from({ length: N * 5 }, r);
  const wisps = Array.from({ length: 7 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: new THREE.Color("#141620"), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    s.layers.set(NOINK); root.add(s);
    const ang = (i / 7) * Math.PI * 2 + 0.4, rad = 1.1 + 0.25 * (i % 3);
    return { s, ang, rad, y0: 0.3 + 0.35 * (i % 4), sc: 1.8 + 0.4 * (i % 3) };
  });
  let spot: THREE.SpotLight | null = null; const add: THREE.MeshBasicMaterial[] = [];
  root.traverse((o) => {
    if ((o as THREE.SpotLight).isSpotLight) spot = o as THREE.SpotLight;
    const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
    if ((o as THREE.Mesh).isMesh && m?.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending && !add.includes(m)) add.push(m);
  });
  return (_fr: Frame, f: number) => {
    const t = f / FPS, u = clamp01((f - a) / (b - a)), dying = 1 - 0.55 * sm(u * 1.15);
    for (let i = 0; i < N; i++) {
      const [s0, s1, s2, s3, s4] = sd.subarray(i * 5, i * 5 + 5);
      const life = fract(t * (0.07 + 0.05 * s1) + s0), ang = s2 * Math.PI * 2 + 0.25 * Math.sin(t * 0.4 + s3 * 6), rad = 0.8 + 2.4 * s3;
      em.pos.set([Math.sin(ang) * rad + 0.25 * Math.sin(t * 0.5 + s4 * 9), 0.1 + life * 4.2, Math.cos(ang) * rad * 0.8 - 0.4], i * 3);
      const k = Math.sin(Math.PI * life) * (0.45 + 0.55 * s4) * (0.85 + 0.15 * Math.sin(t * 2 + s0 * 20));
      const c = s1 < 0.22 ? [0.75, 0.38, 0.18] : [0.42, 0.5, 0.68];                                    // a few dull orange, most cold ash-blue
      em.col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    }
    em.commit();
    wisps.forEach((w, i) => {
      const a2 = w.ang + 0.06 * t, y = w.y0 + 0.08 * t % 1.2;
      w.s.position.set(Math.sin(a2) * w.rad, y + 0.6, Math.cos(a2) * w.rad * 0.7 - 0.6);
      w.s.scale.set(w.sc, w.sc * 1.3, 1); w.s.material.rotation = 0.15 * t + i;
      w.s.material.opacity = (0.35 + 0.15 * Math.sin(t * 0.7 + i)) * sm(u * 4);
    });
    if (spot) (spot as THREE.SpotLight).intensity *= dying;
    for (const m of add) m.color.multiplyScalar(dying);                       // the pool, the ring and the cone (reset by the set each frame)
  };
};

// =====================================================================================================================
// bedroom
// =====================================================================================================================
const preDawn = () => ctex("bedWin2", 128, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#0d1736"); gr.addColorStop(0.65, "#2c3d78"); gr.addColorStop(1, "#5a6aa8");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(230,236,255,${0.4 + 0.5 * r()})`; g.fillRect(r() * 128, r() * 120, 2, 2); }
  g.fillStyle = "#0a0f22"; let x = 0; while (x < 128) { const w = 14 + r() * 30, h = 30 + r() * 60; g.fillRect(x, 256 - h, w, h); x += w + 2; }
  for (let i = 0; i < 8; i++) { g.fillStyle = r() < 0.5 ? "#f2c879" : "#d7e2ff"; g.fillRect(r() * 128, 200 + r() * 50, 3, 4); }
});
const buildBedroomLife = (root: THREE.Object3D) => {
  const bed = shotSpan("bedDawn"), A = bed.a, Z = shotSpan("phoneDown").b;
  // a small high window above the nightstand, with its frame and sill
  const WX0 = -2.28, WX1 = -1.66, WY0 = 1.32, WY1 = 2.5, cx = (WX0 + WX1) / 2, cy = (WY0 + WY1) / 2;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), new THREE.MeshBasicMaterial({ map: preDawn(), color: new THREE.Color(0.6, 0.6, 0.6), fog: false }));
  glass.position.set(cx, cy, -2.195); root.add(glass);
  const fr = mat("#e8e2d6");
  box(root, [WX0 - 0.05, WY0 - 0.06, -2.2], [WX1 + 0.05, WY0, -2.08], fr); box(root, [WX0 - 0.05, WY1, -2.2], [WX1 + 0.05, WY1 + 0.05, -2.12], fr);
  box(root, [WX0 - 0.05, WY0, -2.2], [WX0, WY1, -2.12], fr); box(root, [WX1, WY0, -2.2], [WX1 + 0.05, WY1, -2.12], fr);
  box(root, [cx - 0.02, WY0, -2.2], [cx + 0.02, WY1, -2.15], fr); box(root, [WX0, cy - 0.02, -2.2], [WX1, cy + 0.02, -2.15], fr);
  const halo = glowSprite(root, new THREE.Color("#6f86d6"), 1.6, [cx, cy, -2.05]);
  const beam = lightBeam(root, [cx, cy + 0.1, -2.15], [cx + 0.7, 0.0, -0.9], 0.5, 1.4, "#8fa6e8", 0.2);
  const blueL = new THREE.PointLight("#8fa6e8", 0, 6, 1.6); blueL.position.set(cx, cy - 0.2, -1.7); root.add(blueL);
  // sheer curtains, tied back to the sides, moving in the breeze
  const curtains = [-1, 1].map((k) => {
    const geo = new THREE.PlaneGeometry(0.24, 1.5, 4, 14), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color("#7f92c8").multiplyScalar(0.55), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    m.position.set(k < 0 ? WX0 + 0.06 : WX1 - 0.06, cy + 0.05, -2.1); m.layers.set(NOINK); root.add(m);
    return { m, k, base: Float32Array.from(geo.attributes.position.array as Float32Array) };
  });
  // the wall clock: 05:12 (as on his phone), the second hand ticking
  const clock = root.getObjectByName("wallClock")!, hourC = root.getObjectByName("clockHour")!, minC = root.getObjectByName("clockMin")!;
  const sec = new THREE.Group(); sec.position.z = 0.062; clock.add(sec); box(sec, [-0.004, -0.03, 0], [0.004, 0.17, 0.006], mat("#b8423b"), false);
  const pane = root.getObjectByName("windowPane") as THREE.Mesh, phone = root.getObjectByName("phoneScreen") as THREE.Mesh, phoneL = root.getObjectByName("phoneLight") as THREE.PointLight;
  const phoneBase = (phone.material as THREE.MeshBasicMaterial).color.clone();
  void pane;
  return (_fr: Frame, f: number) => {
    const t = f / FPS, g = sm((f - A) / (Z - A));                                  // the pre-dawn light grows over both shots
    (glass.material as THREE.MeshBasicMaterial).color.setScalar(0.55 + 0.6 * g);
    halo.material.color.set("#6f86d6").multiplyScalar(0.12 + 0.3 * g);
    beam.setLevel(0.35 + 0.9 * g); blueL.intensity = 0.15 + 0.6 * g;
    for (const c of curtains) {
      const p = c.m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = c.base[i * 3], y = c.base[i * 3 + 1], down = clamp01((0.75 - y) / 1.5);
        const w = (0.035 * Math.sin(t * 1.4 + y * 3 + c.k) + 0.02 * Math.sin(t * 2.3 + y * 5)) * down;
        p.setXYZ(i, x + w * 0.6 * -c.k, y, c.base[i * 3 + 2] + Math.abs(w) * 1.6);
      }
      p.needsUpdate = true;
    }
    const s = Math.floor(t + 31);                                                   // ticks once a second
    sec.rotation.z = -(s / 60) * Math.PI * 2;
    minC.rotation.z = -((12 + s / 60) / 60) * Math.PI * 2; hourC.rotation.z = -((5 + (12 + s / 60) / 60) / 12) * Math.PI * 2;
    // the phone's light: steady while face-up, fading out as it turns face-down
    const fade = 1 - sm((f - EV.flip) / 20);
    phone.visible = fade > 0.01; (phone.material as THREE.MeshBasicMaterial).color.copy(phoneBase).multiplyScalar(Math.max(0.01, fade));
    phoneL.intensity = 0.5 * fade;
  };
};

// =====================================================================================================================
// courtyard
// =====================================================================================================================
/** the light of the day through the verses: [time s, sky top, sky horizon, beam colour, beam level, sun azimuth deg] */
const DAY: [number, string, string, string, number, number][] = [
  [17.2, "#0e1430", "#1b2352", "#9fb2ea", 0.0, -70],
  [23.0, "#101836", "#2a2a5c", "#b9a6d8", 0.05, -64],
  [30.4, "#16204a", "#5a3e66", "#e7a98c", 0.12, -52],     // gardens: dawn rose
  [44.6, "#1d3266", "#6e5a70", "#f2c58a", 0.14, -25],     // peace: soft morning
  [50.3, "#21386e", "#7a6670", "#f6d49a", 0.15, -10],     // provision ... morning
  [56.8, "#1f2f62", "#86603e", "#f0b060", 0.15, 30],      // ... and afternoon
  [61.5, "#1a2150", "#6a3a52", "#e8945a", 0.12, 55],      // evening
  [66.3, "#161c46", "#55304e", "#e08a58", 0.1, 62],
];
const dayAt = (t: number) => {
  let i = 0; while (i < DAY.length - 2 && t > DAY[i + 1][0]) i++;
  const A = DAY[i], B = DAY[i + 1], k = sm((t - A[0]) / (B[0] - A[0]));
  const c = (x: string, y: string) => new THREE.Color(x).lerp(new THREE.Color(y), k);
  return { top: c(A[1], B[1]), hor: c(A[2], B[2]), beam: c(A[3], B[3]), level: A[4] + (B[4] - A[4]) * k, az: A[5] + (B[5] - A[5]) * k };
};
const cloudTex = () => ctex("cloudSoft", 512, 192, (g, r) => {
  for (let i = 0; i < 34; i++) {
    const x = 70 + r() * 372, y = 70 + r() * 60 - Math.abs(x - 256) * 0.08, rad = 30 + 50 * r(), a = 0.08 + 0.1 * r();
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
});
/** the 8-point star {8/2} outline (diamond U square) of outer radius R, as the floor mark draws it: point s in 0..1 */
const starPoint = (s: number, R: number): [number, number] => {
  const k = Math.floor(s * 16) % 16, u = s * 16 - Math.floor(s * 16);
  const v = (j: number): [number, number] => { const a = (j * Math.PI) / 8, rr = j % 2 ? 0.765 * R : R; return [rr * Math.sin(a), -rr * Math.cos(a)]; };
  const p = v(k), q = v(k + 1);
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
};

const buildCourtLife = (root: THREE.Object3D) => {
  const T_WALK = SHOTS.find((s) => s.set === "courtyard")!.from;
  // ---- the sky: twinkling stars; its colour follows the day (applied over the light levels) ----
  let skyMat: THREE.ShaderMaterial | null = null;
  root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.ShaderMaterial; if (m?.name === "sky") skyMat = m; });
  const sky = skyMat as THREE.ShaderMaterial | null;
  const B0 = "float b = 0.35 + 0.65 * hash(cell + 1.3);";
  if (sky && sky.fragmentShader.includes(B0)) {
    sky.uniforms.uTime = { value: 0 };
    sky.fragmentShader = sky.fragmentShader.replace("uniform float uStarGain;", "uniform float uStarGain; uniform float uTime;")
      .replace(B0, B0 + " b *= 0.72 + 0.28 * sin(uTime * (1.2 + 2.2 * hash(cell + 5.1)) + 6.2831 * hash(cell + 9.4));");
    sky.needsUpdate = true;
  }
  // ---- clouds drifting slowly ----
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(), color: new THREE.Color(0.3, 0.33, 0.45), transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    s.renderOrder = -0.6; s.layers.set(NOINK); s.frustumCulled = false; root.add(s);
    return { s, az: -50 + i * 22 + 7 * Math.sin(i * 3.1), el: 19.5 + 2.5 * ((i * 7) % 3), w: 46 + 12 * (i % 3) };
  });
  // ---- the minaret's light ----
  const minaret = glowSprite(root, new THREE.Color(1.6, 1.0, 0.45), 1.8, [3.2, 9.0, -11.2]);   // around its lower lit window
  // ---- a shooting star (once) and birds crossing at dawn: placed in the top of the frame, far away ----
  const shoot = points(root, 22, 7, false);
  const SHOOT_AT = PHRASES[7].from + F(0.5), SHOOT_LEN = F(1.2);   // in the wide shot of the gardens: the only one that shows the sky
  const birds = Array.from({ length: 5 }, () => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3)); geo.setIndex([0, 1, 3, 1, 2, 3]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color("#0a0d1c"), side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.layers.set(NOINK); m.frustumCulled = false; root.add(m); return m;
  });
  const BIRDS_A = PHRASES[7].from + F(2.0), BIRDS_B = PHRASES[8].from;
  // ---- slanting light: two broad beams whose colour and angle follow the day ----
  const beams = [0, 1].map((i) => {
    const b = lightBeam(root, [0, 0, 0], [0, -10, 0], 1.0 + 0.5 * i, 3.4 + 0.6 * i, "#ffffff", 1);
    return { b, mat: (b.group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial, x: -1.6 + 3.6 * i };
  });
  // ---- lanterns sway; moths circle the lit ones ----
  const lamps = root.children.filter((o) => Math.abs(o.position.y - APEX) < 1e-4 && Math.abs(o.position.z - WALL_Z) < 1e-4);
  const litX = ARCHES.filter((x) => x === MAIN || LIT.has(x));
  const moths = points(root, litX.length * 9, 0.022), mr = rnd(41), ms = Float32Array.from({ length: litX.length * 9 * 3 }, mr);
  // ---- palms and shrubs move in the wind ----
  const near = (o: THREE.Object3D, x: number, z: number) => Math.abs(o.position.x - x) < 1e-3 && Math.abs(o.position.z - z) < 1e-3;
  const palms = root.children.filter((o) => near(o, -3.0, -2.5) || near(o, 3.15, -2.45) || near(o, -3.4, 4.6));
  const fronds = palms.flatMap((p, pi) => p.children.filter((c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry.type === "ShapeGeometry").map((c, i) => ({ c, pi, i, rx: c.rotation.x, ry: c.rotation.y })));
  const shrubs = root.children.filter((o) => near(o, -2.3, -2.75) || near(o, 2.6, -2.8) || near(o, -2.7, 3.3));
  const leaves = shrubs.flatMap((s, si) => s.children.filter((c) => (c as THREE.Mesh).isMesh && c.position.y > 0.45).map((c, i) => ({ c, si, i, rx: c.rotation.x })));
  // ---- petals and leaves drifting down and across ----
  const pr = rnd(77), petalCols = ["#e9a3a8", "#f2d6a0", "#e7b9c6", "#6f9a5c", "#88a866"];
  const petals = Array.from({ length: 18 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.032), new THREE.MeshBasicMaterial({ color: new THREE.Color(petalCols[i % 5]), side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.layers.set(NOINK); root.add(m);
    return { m, base: new THREE.Color(petalCols[i % 5]), x0: -6 + 7 * pr(), z0: -3.1 + 5.6 * pr(), ph: pr(), sp: 0.8 + 0.4 * pr() };
  });
  // ---- golden motes rising (more as the verses go on); at the end they gather into the star mark ----
  const NM = 170, motes = points(root, NM, 0.038), gr = rnd(99), gs = Float32Array.from({ length: NM * 5 }, gr);
  const targets = Array.from({ length: NM }, (_, i) => { const inner = i % 10 >= 7, s = fract(i * 0.618034); const [x, z] = starPoint(s, inner ? 1.9 * 0.62 : 1.9); return [MARK[0] + x, MARK[2] + z]; });
  // ---- the pool: ripples (the reflection wobbles), drops from a low bubbling spout ----
  let water: THREE.ShaderMaterial | null = null;
  root.traverse((o) => { if ((o as unknown as { isReflector?: boolean }).isReflector) water = (o as THREE.Mesh).material as THREE.ShaderMaterial; });
  const wm = water as THREE.ShaderMaterial | null;
  const VB = "vUv = textureMatrix * vec4( position, 1.0 );", FB = "vec4 base = texture2DProj( tDiffuse, vUv );";
  if (wm && wm.vertexShader.includes(VB) && wm.fragmentShader.includes(FB)) {
    wm.uniforms.uTime = { value: 0 };
    wm.vertexShader = "varying vec2 vP;\n" + wm.vertexShader.replace(VB, VB + " vP = position.xy;");
    wm.fragmentShader = "uniform float uTime; varying vec2 vP;\nfloat rh(float n) { return fract(sin(n * 91.7) * 43758.5); }\n" + wm.fragmentShader.replace(FB, `
      float r0 = length(vP); vec2 d0 = r0 > 1e-4 ? vP / r0 : vec2(0.0);
      vec2 off = d0 * sin(r0 * 34.0 - uTime * 4.5) * exp(-r0 * 2.2) * 0.0045;              // rings from the spout
      for (int k = 0; k < 3; k++) {                                                         // drops landing here and there
        float cyc = uTime / 1.9 + float(k) / 3.0, n = floor(cyc), age = fract(cyc);
        vec2 c = (vec2(rh(n * 3.1 + float(k)), rh(n * 7.3 + float(k) * 2.0)) - 0.5) * 1.2;
        vec2 q = vP - c; float rq = length(q);
        off += (rq > 1e-4 ? q / rq : vec2(0.0)) * sin(rq * 46.0 - age * 14.0) * exp(-abs(rq - age * 0.55) * 14.0) * (1.0 - age) * 0.004;
      }
      off += vec2(sin(vP.x * 9.0 + uTime * 1.2), sin(vP.y * 8.0 - uTime * 0.9)) * 0.0018; // a breath of wind
      vec4 pv = vUv; pv.xy += off * pv.w;
      vec4 base = texture2DProj( tDiffuse, pv );`);
    wm.needsUpdate = true;
  }
  const spout = points(root, 36, 0.014), ss = Float32Array.from({ length: 36 * 3 }, rnd(5));
  // ---- three faceless worshippers far back in the gallery (behind the arches, never in front of him) ----
  const W1: Figure = { skin: "#a8744f", hair: "#1a1416", top: "#e4dccb", legs: "#e4dccb", cap: "#f2eee3", robe: true };
  const W2: Figure = { skin: "#7a4e34", hair: "#1a1416", top: "#9a9384", legs: "#9a9384", cap: "#f2eee3", robe: true };
  const W3: Figure = { skin: "#c08a5e", hair: "#2a1e1a", top: "#5f6e8a", legs: "#5f6e8a", cap: "#e9e1cf", robe: true };
  const gal = {
    walker: { s: figureSprite(root, 1.7, 0.5), fig: W1, z: -5.0, x0: 7.0, v: -0.5, key: "w1" },
    walker2: { s: figureSprite(root, 1.66, 0.5), fig: W3, z: -5.7, x0: -7.0, v: 0.42, key: "w3" },
    sitter: figureSprite(root, 1.0, 0.5), prayer: figureSprite(root, 1.68, 0.5),
  };
  gal.sitter.material.map = figureTex("w2", W2, "sit"); gal.sitter.position.set(-3.7, 0, -5.8);
  gal.prayer.material.map = figureTex("w1b", W1, "stand"); gal.prayer.position.set(5.55, 0, -5.8);
  const v3 = new THREE.Vector3();

  return (fr: Frame, f: number) => {
    const t = f / FPS, lv = fr.courtyard?.levels ?? { main: 1, lanterns: 1, night: 1 }, day = dayAt(t), cam = fr.plan.cam;
    const dawn = sm((f - EV.takbir) / F(3));                                        // the day starts at takbir
    // sky
    if (sky) {
      sky.uniforms.uTime.value = t;
      const top = untone("#" + day.top.getHexString()), hor = untone("#" + day.hor.getHexString());
      (sky.uniforms.uTop.value as THREE.Vector3).lerp(new THREE.Vector3(top.r, top.g, top.b).multiplyScalar(lv.night), dawn);
      (sky.uniforms.uHor.value as THREE.Vector3).lerp(new THREE.Vector3(hor.r, hor.g, hor.b).multiplyScalar(lv.night), dawn);
    }
    const warm = new THREE.Color(0.3, 0.33, 0.45).lerp(new THREE.Color(day.hor).multiplyScalar(1.1).add(new THREE.Color(0.08, 0.08, 0.1)), dawn);
    for (const c of clouds) {
      const az = ((c.az + 0.35 * t) * Math.PI) / 180, el = (c.el * Math.PI) / 180;
      c.s.position.set(Math.sin(az) * Math.cos(el) * 150, Math.sin(el) * 150, -Math.cos(az) * Math.cos(el) * 150);
      c.s.scale.set(c.w, c.w * 0.36, 1); c.s.material.color.copy(warm).multiplyScalar(lv.night);
    }
    minaret.material.color.setRGB(1.6, 1.0, 0.45).multiplyScalar((0.75 + 0.12 * Math.sin(t * 0.9)) * lv.night);
    // the shooting star: a slow streak across the upper left of the frame, its tail fading
    const su = (f - SHOOT_AT) / SHOOT_LEN;
    for (let i = 0; i < 22; i++) {
      const u = su - i * 0.02, on = u > 0 && u < 1 ? 1.8 * Math.sin(Math.PI * u) * (1 - i / 22) : 0;
      atScreen(cam, -0.8 + 0.9 * clamp01(u), 0.93 - 0.07 * clamp01(u), 140, v3); shoot.pos.set([v3.x, v3.y, v3.z], i * 3);
      shoot.col.set([0.9 * on, 0.95 * on, 1.1 * on], i * 3);
    }
    shoot.commit();
    // birds: a loose V crossing the top of the frame, wings beating slowly
    const bu = (f - BIRDS_A) / (BIRDS_B - BIRDS_A);
    birds.forEach((m, i) => {
      const k = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? 1 : -1), on = bu > 0 && bu < 1 ? sm(bu * 8) * sm((1 - bu) * 8) : 0;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * on;
      if (!on) return;
      atScreen(cam, -1.25 + 2.5 * bu - 0.06 * Math.abs(k), 0.9 + 0.02 * Math.abs(k) + 0.006 * Math.sin(t * 2 + i), 45, v3);
      const fl = Math.sin(t * 7 + i * 1.3), s = 0.5, p = m.geometry.attributes.position as THREE.BufferAttribute;
      const x = v3.x, y = v3.y, z = v3.z;
      p.setXYZ(0, x - s, y + 0.5 * s * fl, z); p.setXYZ(1, x, y - 0.12 * s, z); p.setXYZ(2, x + s, y + 0.5 * s * fl, z); p.setXYZ(3, x, y + 0.08 * s, z);
      p.needsUpdate = true;
    });
    // slanting light
    for (const b of beams) {
      const az = (day.az * Math.PI) / 180, dir = new THREE.Vector3(Math.sin(az) * 0.55, -1, 0.35).normalize();
      const to = new THREE.Vector3(b.x + 0.4 * Math.sin(t * 0.05), 0, -1.2);
      b.b.group.position.copy(to).addScaledVector(dir, -10); b.b.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      b.mat.color.copy(day.beam).multiplyScalar(day.level * dawn);
    }
    // lanterns and moths
    lamps.forEach((l, i) => { l.rotation.z = 0.04 * Math.sin(t * 1.25 + i * 1.1); l.rotation.x = 0.025 * Math.sin(t * 0.85 + i * 2.3); });
    litX.forEach((x, j) => {
      const cy = APEX - (x === MAIN ? 0.55 : 0.47);
      for (let i = 0; i < 9; i++) {
        const n = j * 9 + i, [a, b2, c] = ms.subarray(n * 3, n * 3 + 3), ang = a * 6.283 + t * (1.4 + 1.2 * b2) * (i % 2 ? 1 : -1), rad = 0.2 + 0.22 * c;
        moths.pos.set([x + rad * Math.cos(ang), cy + 0.12 * Math.sin(t * 2.1 + n), WALL_Z + 0.25 + rad * 0.7 * Math.sin(ang)], n * 3);
        const k = (x === MAIN ? lv.main : lv.lanterns) * (0.6 + 0.4 * Math.sin(t * 3 + n));
        moths.col.set([1.5 * k, 1.05 * k, 0.5 * k], n * 3);
      }
    });
    moths.commit();
    // wind in the plants
    const gust = 0.7 + 0.3 * Math.sin(t * 0.31);
    for (const fd of fronds) { fd.c.rotation.x = fd.rx + gust * 0.06 * Math.sin(t * 1.1 + fd.i * 0.8 + fd.pi); fd.c.rotation.y = fd.ry + gust * 0.035 * Math.sin(t * 0.75 + fd.i * 1.3 + fd.pi * 2); }
    for (const lf of leaves) lf.c.rotation.x = lf.rx + gust * 0.08 * Math.sin(t * 1.6 + lf.i * 0.9 + lf.si);
    // petals: fall 0.2 m/s, carried +x by the wind, tumbling
    for (const p of petals) {
      const T = 21, tau = fract(t / T + p.ph) * T, y = 4.3 - 0.2 * p.sp * tau;
      p.m.position.set(p.x0 + 0.33 * tau + 0.25 * Math.sin(1.3 * tau + p.ph * 9), y, p.z0 + 0.2 * Math.sin(0.9 * tau + p.ph * 5));
      p.m.rotation.set(t * 1.7 * p.sp + p.ph * 6, t * 1.1 + p.ph * 4, t * 0.6);
      const mat2 = p.m.material as THREE.MeshBasicMaterial;
      mat2.opacity = sm(tau / 1.5) * sm(y / 0.3) * 0.9; mat2.color.copy(p.base).multiplyScalar(0.25 + 0.45 * Math.max(lv.main, lv.night * 0.6));
    }
    // golden motes
    const grow = sm((f - PHRASES[4].from) / (PHRASES[12].from - PHRASES[4].from)), active = 30 + 140 * grow;
    const [ca, cb] = EV.craneUp, gather = f >= ca;
    const hx = P2[0], hz = P2[2], cp = new THREE.Vector3(...cam.pos);
    for (let i = 0; i < NM; i++) {
      const [a, b2, c, d, e] = gs.subarray(i * 5, i * 5 + 5);
      const life = fract(t * (0.045 + 0.04 * b2) + a);
      let x = -4.8 + 9.6 * c + 0.3 * Math.sin(0.45 * t + d * 7), y = 0.15 + life * 3.3, z = -3.1 + 6.6 * d + 0.25 * Math.cos(0.38 * t + c * 9);
      let k = Math.sin(Math.PI * life) * (0.55 + 0.45 * Math.sin(t * (1.5 + e) + a * 30)) * clamp01(active - i);
      if (gather) {
        const g = sm((f - ca - 8 - 26 * e) / (cb - ca + F(0.4)));
        x += (targets[i][0] - x) * g; y += (0.05 - y) * g; z += (targets[i][1] - z) * g;
        k = k + (1.1 - k) * g;
      } else {
        const dh = Math.hypot(x - hx, z - hz); if (y > 0.9 && y < 2.2) k *= sm((dh - 0.25) / 0.4);                  // never across his face
      }
      motes.pos.set([x, y, z], i * 3);
      k *= sm((cp.distanceTo(v3.set(x, y, z)) - 0.9) / 1.2) * (0.35 + 0.65 * dawn);                                   // never right at the lens
      motes.col.set([1.6 * k, 1.12 * k, 0.45 * k], i * 3);
    }
    motes.commit();
    // the pool
    if (wm) wm.uniforms.uTime.value = t;
    for (let i = 0; i < 36; i++) {
      const [a, b2, c] = ss.subarray(i * 3, i * 3 + 3), life = fract(t / 0.9 + a), ang = b2 * 6.283, rr = 0.03 + 0.12 * c * life;
      spout.pos.set([POOL.x + rr * Math.cos(ang), 0.42 + 0.18 * (0.35 + 0.65 * c) * 4 * life * (1 - life), POOL.z + rr * Math.sin(ang)], i * 3);
      const k = 0.5 * (0.4 + 0.6 * lv.main);
      spout.col.set([0.75 * k, 0.8 * k, 0.9 * k], i * 3);
    }
    spout.commit();
    // the gallery
    const gl = 0.22 + 0.2 * lv.lanterns;
    for (const w of [gal.walker, gal.walker2]) {
      const x = w.x0 + Math.sign(w.v) * fract((Math.abs(w.v) * (t - T_WALK / FPS)) / 14) * 14, ph = Math.round(fract(Math.abs(w.v * t) / 1.1) * 8) % 8;
      w.s.material.map = figureTex(w.key, w.fig, "walk", ph / 8); w.s.material.needsUpdate = true; w.s.material.color.setScalar(gl);
      w.s.position.set(x, 0, w.z);
    }
    gal.sitter.material.color.setScalar(gl); gal.prayer.material.color.setScalar(gl);
  };
};

// =====================================================================================================================
export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const up: Partial<Record<SetId, (fr: Frame, f: number) => void>> = {};
  if (roots.street) up.street = buildStreetLife(roots.street);
  if (roots.office) up.office = buildOfficeLife(roots.office);
  if (roots.void) up.void = buildVoidLife(roots.void);
  if (roots.bedroom) up.bedroom = buildBedroomLife(roots.bedroom);
  if (roots.courtyard) up.courtyard = buildCourtLife(roots.courtyard);
  for (const r of Object.values(roots)) r!.updateMatrixWorld(true);
  return { update: (fr: Frame, f: number) => { up[fr.set]?.(fr, Math.min(f, FRAMES - 1)); } };
};
