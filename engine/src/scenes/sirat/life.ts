// Video 003 "The Sirat": the things in the abyss that move with the story (built once into the abyss set's root,
// updated every frame from the frame number alone):
//  - the ruins (no hooks: nothing curved, coiled or alive-looking): straight rusted iron spikes, broken girders and
//    jagged rock pillars rising out of the lava along the bridge; pillars cracking and collapsing; a burning boulder
//    falling past the lens; the line crumbling under a figure; a burst of fire engulfing one
//  - the people crossing at different speeds (Sahih al-Bukhari 7439): streaks of light along the bridge, like the wink
//    of an eye, like lightning, like the wind, like fast horses
//  - gold coins, a watch and a phone slipping out of a hand, glowing and melting as they fall
//  - an abandoned prayer mat on the bridge catching fire; stones crumbling off the edge into the pit
// No being is ever shown except faceless people; no gore: the terror is the scale, the dark and the fall.
import * as THREE from "three";
import type { V3 } from "../../camera/ease";
import { NOINK } from "../../render/ink";
import { mat, box } from "../../sets/common";
import { flameTex, ABYSS } from "../../sets/abyss";
import { ctex } from "../../draw/paint";
import type { Frame, SetId } from "../../story/story";
import { FPS, shotOf, SHOTS, EV, EVT, RUINS, ruinState, STREAKS, streakX, ITEMS_AT, MAT_X, CRUMBLE, HOURGLASS, bridgeX, SNATCH_X, PASS_X } from "./timeline";


const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const span = (k: string) => SHOTS.find((s) => s.kind === k) ?? { from: -1e9, to: -1e9 };

/** the ruins that rise out of the lava (nothing curved, coiled or alive-looking: only iron and rock). The top sits near
 *  the local origin, the base h metres below. kind: "spikes" (straight square iron spikes, rusted), "girder" (a broken
 *  steel I-beam), "pillar" (a jagged rock pillar with glowing cracks; its top part, userData.top, can crack and fall). */
const buildRuin = (kind: "spikes" | "girder" | "pillar", h: number, seed: number) => {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = new THREE.Group(), rust = mat("#3a2016"), rustD = mat("#24140e"), rock = mat("#2a120e"), crack = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.08) });
  if (kind === "spikes") {
    for (let i = 0; i < 4; i++) { const len = h * (0.75 + 0.3 * r()), rad = h * (0.02 + 0.012 * r());
      const sp = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 4), i % 2 ? rust : rustD); sp.position.set((r() - 0.5) * h * 0.12, -len / 2 + (r() - 0.5) * h * 0.08, (r() - 0.5) * h * 0.12);
      sp.rotation.set((r() - 0.5) * 0.35, r() * 1.6, (r() - 0.5) * 0.35); g.add(sp); }
  } else if (kind === "girder") {
    const w = h * 0.05, tilt = new THREE.Group(); tilt.rotation.z = 0.28 * (r() < 0.5 ? 1 : -1); g.add(tilt);
    box(tilt, [-w * 0.12, -h, -w], [w * 0.12, 0, w], rust); box(tilt, [-w, -h, -w], [w, 0, -w * 0.8], rustD); box(tilt, [-w, -h, w * 0.8], [w, 0, w], rustD);
    for (let i = 0; i < 4; i++) { const shard = box(tilt, [-w * 0.6, 0, -w * 0.9], [w * 0.6, h * (0.03 + 0.05 * r()), w * 0.9], rust); shard.rotation.set((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8); }   // the torn end
  } else {
    let y = -h, wv = h * 0.09; const top = new THREE.Group();
    while (y < 0) { const sh = h * (0.08 + 0.06 * r()), part = y + sh > -h * 0.3 ? top : g;
      const b = box(part, [-wv, y, -wv * 0.8], [wv, y + sh, wv * 0.8], rock); b.rotation.set((r() - 0.5) * 0.15, r() * 3, (r() - 0.5) * 0.15);
      if (r() < 0.6) { const c = new THREE.Mesh(new THREE.BoxGeometry(wv * 1.9, sh * 0.06, 0.15), crack); c.position.set(0, y + sh * (0.3 + 0.4 * r()), wv * 0.82); c.rotation.z = (r() - 0.5) * 0.8; c.layers.set(NOINK); part.add(c); }
      y += sh; wv *= 0.93; }
    top.userData.base = -h * 0.3; g.add(top); g.userData.top = top;
  }
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.userData.noCollide = true; } });
  return g;
};
const RUIN_KIND = (i: number): "spikes" | "girder" | "pillar" => (i === 14 ? "pillar" : (["spikes", "girder", "pillar"] as const)[i % 3]);

export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const root = roots.abyss!;
  // ---- the ruins (spikes, girders, pillars), the boulder, the crumbling line, the fire burst ----
  const ruins = RUINS.map((rn, i) => { const g = buildRuin(RUIN_KIND(i), rn.h, 31 + i * 7); g.userData.moving = true; root.add(g); return g; });
  // the burning boulder that falls past the lens (debrisPass): rock, fire around it, smoke trailing
  const boulder = new THREE.Group(); root.add(boulder); boulder.userData.moving = true;
  const bRock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), mat("#2a120e")); bRock.userData.noCollide = true; boulder.add(bRock);
  const bFire = Array.from({ length: 10 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: new THREE.Color(j % 3 ? "#ff5a10" : "#ffc060").multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); boulder.add(sp); return sp; });
  // the line crumbling under a figure (crumbleSnatch): glowing pieces fall, a dark gap is left
  const crumbs = Array.from({ length: 16 }, (_, j) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06 + 0.04 * (j % 3), 0.04, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.4, 0.35) })); m.layers.set(NOINK); root.add(m); return m; });
  const gap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, ABYSS.BRIDGE_W + 0.06), new THREE.MeshBasicMaterial({ color: "#0a0202" })); gap.layers.set(NOINK); root.add(gap);
  // the burst of fire that engulfs a figure (engulf)
  const burst = Array.from({ length: 30 }, (_, j) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: new THREE.Color(j % 4 ? "#ff4a08" : "#ffd070").multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); root.add(sp); return sp; });
  // ---- the crossers: streaks of light along the bridge ----
  const streakT = ctex("siratStreak", 256, 32, (g) => { const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.85, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = gr; g.fillRect(0, 4, 256, 24); });
  const streaks = STREAKS.map((st) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: streakT, color: new THREE.Color(st.col).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.layers.set(NOINK); root.add(m); const m2 = m.clone(); m2.rotation.x = Math.PI / 2; root.add(m2); return [m, m2]; });
  // ---- the things slipping from a hand: gold coins, a watch, a phone ----
  const gold = new THREE.MeshBasicMaterial({ color: new THREE.Color("#f2b134") }), items: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; d: number; spin: number; dx: number; base: THREE.Color }[] = [];
  const addItem = (geo: THREE.BufferGeometry, col: string, d: number, dx: number) => { const mm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col) }); const m = new THREE.Mesh(geo, mm); m.layers.set(NOINK); root.add(m); items.push({ m, mat: mm, d, spin: 2 + 4 * ((items.length * 0.37) % 1), dx, base: new THREE.Color(col) }); };
  for (let i = 0; i < 12; i++) addItem(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16), "#e9a62a", 0.05 * i + 0.1 * ((i * 7) % 3), ((i * 37) % 11 - 5) * 0.02);
  addItem(new THREE.TorusGeometry(0.045, 0.012, 8, 20), "#c8c4bc", 0.25, 0.04); addItem(new THREE.BoxGeometry(0.075, 0.15, 0.01), "#202326", 0.4, -0.05);
  addItem(new THREE.BoxGeometry(0.06, 0.018, 0.012), "#b8b4ac", 0.55, 0.07); addItem(new THREE.TorusGeometry(0.02, 0.005, 6, 12), "#d8d4cc", 0.57, 0.08);   // car keys and their ring
  addItem(new THREE.BoxGeometry(0.1, 0.07, 0.018), "#3a2418", 0.7, -0.02);                                                                              // a wallet
  void gold;
  // ---- the prayer mat on the bridge, catching fire ----
  const matT = ctex("siratMat", 256, 384, (g) => { g.fillStyle = "#5a1a1a"; g.fillRect(0, 0, 256, 384); g.strokeStyle = "#c79c48"; g.lineWidth = 8; g.strokeRect(14, 14, 228, 356);
    g.fillStyle = "#2a3a5a"; g.beginPath(); g.moveTo(40, 120); g.quadraticCurveTo(128, 20, 216, 120); g.lineTo(216, 340); g.lineTo(40, 340); g.closePath(); g.fill(); g.strokeStyle = "#e8d8a8"; g.lineWidth = 4; g.stroke(); });
  const prayerMat = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.15, 8, 8), new THREE.MeshLambertMaterial({ map: matT, side: THREE.DoubleSide }));
  { const pos = prayerMat.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, -0.5 * Math.max(0, Math.abs(x) - 0.09) ** 1.2); } pos.needsUpdate = true; }
  prayerMat.rotation.set(-Math.PI / 2, 0, Math.PI / 2); prayerMat.position.set(MAT_X, 0.005, 0); root.add(prayerMat);
  const flames = Array.from({ length: 16 }, (_, i) => { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: new THREE.Color(i % 2 ? "#ff6a10" : "#ffb040").multiplyScalar(1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s2.layers.set(NOINK); root.add(s2); return s2; });
  const matL = new THREE.PointLight("#ff8a2a", 0, 6, 1.6); root.add(matL);
  // ---- stones crumbling off the edge as he steps on ----
  const rocks = Array.from({ length: 14 }, (_, i) => box(root, [-0.04, -0.03, -0.04], [0.04 + 0.03 * (i % 3), 0.03 + 0.02 * (i % 2), 0.05], mat("#2a1410")));
  // ---- pieces chipping off the burning line near his feet ----
  const chipM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.5, 0.4) });
  const chips = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.03), chipM); m.layers.set(NOINK); root.add(m); return m; });
  // ---- the hourglass (19:71 "an inevitability decreed"): on a rock at the cliff's edge, its last grains running out ----
  const hg = new THREE.Group(); hg.position.set(...HOURGLASS); root.add(hg);
  const wood = mat("#2a1810"), glassM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.4), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  for (const y of [0, 0.36]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), wood); d.position.y = y + 0.015; hg.add(d); }
  for (let i = 0; i < 3; i++) { const a = i * 2.094, post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), wood); post.position.set(0.11 * Math.cos(a), 0.195, 0.11 * Math.sin(a)); hg.add(post); }
  const bulb = (up: boolean) => { const pts = [0, 0.03, 0.07, 0.09, 0.095, 0.09, 0.06, 0.02, 0.012].map((r, i) => new THREE.Vector2(r, i * 0.019)); const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), glassM); m.layers.set(NOINK);
    if (up) { m.rotation.x = Math.PI; m.position.y = 0.36; } else m.position.y = 0.03; hg.add(m); };
  bulb(true); bulb(false);
  const sandM = mat("#d8a868"), sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 16), sandM); sandTop.rotation.x = Math.PI; hg.add(sandTop);
  const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.07, 16), sandM); hg.add(sandBot);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.15, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.5) })); stream.layers.set(NOINK); stream.position.y = 0.12; hg.add(stream);
  hg.traverse((o) => { o.userData.noCollide = true; });
  // ---- a light that follows the action (the fire glow under the close-ups) ----
  const under = new THREE.PointLight("#ff4a10", 0, 8, 1.4); root.add(under);
  const v = new THREE.Vector3();
  return {
    update: (_fr: Frame, f: number) => {
      const t = f / FPS, kind = shotOf(f).kind;
      ruins.forEach((g, i) => { const st = ruinState(i, f); g.visible = st.visible; if (st.visible) g.position.set(...st.pos); else g.position.set(0, -3000, 0); /* hidden things still block the camera-collision rays: park them far below */ g.rotation.set(st.rot[0], st.rot[1], st.rot[2]);
        const top = g.userData.top as THREE.Group | undefined; if (top) { const c = st.collapse; top.rotation.z = 1.1 * c * c; top.position.set(4 * c, -40 * Math.max(0, c - 0.45) ** 2, 0); } });
      { const s = t - EVT.pass, on = kind === "debrisPass" && s > -1.2 && s < 1.0;
        boulder.visible = on; if (!on) boulder.position.set(0, -3000, 0); else { boulder.position.set(PASS_X + 0.9 + 1.5 * s, 1.0 - 22 * s - 8 * s * s, 1.7); bRock.rotation.set(s * 4, s * 3, s * 2);
          bFire.forEach((sp, j) => { const a = j * 0.63 + t * 6; sp.position.set(1.2 * Math.cos(a), 1.4 + 0.6 * Math.sin(a * 1.3) + 0.4 * j * 0.2, 1.2 * Math.sin(a)); sp.scale.setScalar(2.2 + 0.8 * Math.sin(a)); sp.material.opacity = 0.8; }); } }
      { const s = t - EVT.snatch, on = kind === "crumbleSnatch" && s > -0.1;
        gap.visible = on; gap.position.set(on ? SNATCH_X : 0, on ? ABYSS.Y(SNATCH_X) - 0.03 : -3000, 0);
        crumbs.forEach((m, j) => { const ss = s - 0.03 * j; m.visible = on && ss > 0; if (!m.visible) { m.position.set(0, -3000, 0); return; }
          m.position.set(SNATCH_X - 0.5 + 1.0 * (j / 16) + 0.2 * ss, ABYSS.Y(SNATCH_X) - 0.5 * 9.8 * ss * ss, 0.08 * Math.sin(j * 2.1) * (1 + 2 * ss)); m.rotation.set(ss * (3 + j % 4), ss * 2, ss * 5); }); }
      { const s = t - EVT.strike, on = kind === "engulf" && s > -0.15 && s < 1.6, k = on ? Math.sin(Math.PI * Math.min(1, (s + 0.15) / 1.6)) : 0;
        burst.forEach((sp, j) => { sp.visible = on; if (!on) return; const u = ((s * 0.9 + j / burst.length) % 1 + 1) % 1, a = j * 2.4;
          sp.position.set(SNATCH_X + 0.8 * Math.cos(a) * u, ABYSS.Y(SNATCH_X) - 2 + 6 * u * k, 0.8 * Math.sin(a) * u); sp.scale.setScalar((1.2 + 2.6 * u) * (0.4 + k)); sp.material.opacity = k * (1 - 0.6 * u); }); }
      streaks.forEach((pair, i) => { const st = STREAKS[i], x = streakX(st, t), on = x !== null;
        for (const m of pair) { m.visible = on; if (on) { m.scale.set(st.len, st.w, 1); m.position.set(x! - st.len / 2, 0.55 + st.y, 0); } } });
      // the falling things (the itemsFall shot): out of the hand, tumbling, heating from gold to white and melting away
      const ia = ITEMS_AT;
      items.forEach((it, i) => { const s = t - ia.t0 - it.d, on = kind === "itemsFall" && s > 0;
        it.m.visible = on; if (!on) return;
        const fall = 0.5 * 9.8 * s * s * 0.5, heat = sm(s / 1.6);
        it.m.position.set(ia.pos[0] + it.dx + 0.08 * s * Math.sin(i), ia.pos[1] - fall, ia.pos[2] + 0.05 * Math.cos(i * 1.7) * s);
        it.m.rotation.set(it.spin * s, it.spin * 0.6 * s, it.spin * 0.3 * s);
        const melt = 1 - 0.75 * sm((s - 0.6) / 1.4); it.m.scale.set(melt, melt * (1 + 1.2 * heat), melt);
        it.mat.color.copy(it.base).lerp(new THREE.Color(3.2, 1.6, 0.5), heat).lerp(new THREE.Color(4, 3.4, 2.4), sm((s - 1.0) / 0.8));
      });
      // the mat: lying there; then catching fire (matFire), charring
      const mf = span("matFire"), burn = sm((f - mf.from - 6) / 50), after = f >= mf.to ? 1 : 0, bk = Math.max(burn, after);
      prayerMat.visible = t < 104; prayerMat.position.y = prayerMat.visible ? 0.005 : -3000;
      (prayerMat.material as THREE.MeshLambertMaterial).color.setRGB(1 - 0.85 * bk, 1 - 0.9 * bk, 1 - 0.9 * bk);
      flames.forEach((s2, i) => { const on = bk > 0.02 && prayerMat.visible, life = (t * 1.3 + i / flames.length) % 1, ex = (i / flames.length - 0.5) * 1.0 * Math.min(1, bk * 1.6);
        s2.visible = on; s2.position.set(MAT_X + ex, 0.05 + 0.5 * life * bk, 0.25 * Math.sin(i * 2.1)); s2.scale.setScalar((0.18 + 0.28 * bk) * (1 - 0.6 * life)); s2.material.opacity = 0.7 * Math.min(1, bk * 2) * Math.sin(Math.PI * life); });
      matL.position.set(MAT_X, 0.4, 0); matL.intensity = 2.5 * bk * (0.8 + 0.2 * Math.sin(t * 17));
      // stones crumbling from the bridge's foot as he steps onto it
      rocks.forEach((rk, i) => { const s = t - CRUMBLE - 0.05 * i; rk.visible = s > 0 && s < 4; if (!rk.visible) rk.position.set(0, -3000, 0);
        if (rk.visible) { rk.position.set(0.1 + 0.03 * i - 0.2, -0.06 - 0.5 * 9.8 * s * s * 0.6, 0.12 * Math.sin(i * 2.3)); rk.rotation.set(s * (3 + i), s * 2, s * (1 + i % 3)); } });
      // the chips: break off the line just ahead of him and fall, glowing
      chips.forEach((m, i) => { const per = 1.7 + 0.37 * i, s = (t + i * 0.53) % per, bx = bridgeX(t) + 0.4 + (i % 5) * 0.35;
        m.visible = t > 73 && t < 101; if (!m.visible) { m.position.set(0, -3000, 0); return; }
        m.position.set(bx, ABYSS.Y(bx) - 0.03 - 0.5 * 9.8 * s * s * 0.6, (i % 2 ? 0.05 : -0.05) + 0.1 * s); m.rotation.set(s * 7, s * 5, s * 3); });
      // the hourglass: the top bulb almost empty, the last grains running out during its shot
      const hs = span("hourglass"), hk = hs.from > 0 ? clamp01((f - hs.from) / (hs.to - hs.from)) : 0, top = 0.22 * (1 - hk) ** 1.5;
      hg.visible = kind === "hourglass"; if (!hg.visible) hg.position.set(0, -3000, 0); else hg.position.set(...HOURGLASS);
      sandTop.scale.set(Math.max(0.01, top / 0.22) ** 0.5, Math.max(0.01, top / 0.22), Math.max(0.01, top / 0.22) ** 0.5); sandTop.position.y = 0.215 + 0.03 * (top / 0.22);
      sandBot.position.y = 0.065; stream.visible = top > 0.004;
      // the under-glow follows the frame's subject
      const sp = _fr.plan.focus; v.set(sp[0], sp[1], sp[2]).sub(root.position);
      under.position.set(v.x + 0.4, v.y - 1.2, v.z + 0.6); under.intensity = EV.underGlow(f) * (0.8 + 0.2 * Math.sin(t * 15));
    },
  };
};
export type { V3 };
