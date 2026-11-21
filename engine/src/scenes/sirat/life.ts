// Video 003 "The Sirat": the things in the abyss that move with the story (built once into the abyss set's root,
// updated every frame from the frame number alone):
//  - the hooks (Sahih al-Bukhari 6573: hooks like the thorns of al-Sa'dan, their size known only to Allah, snatching
//    people according to their deeds): giant curved iron hooks bristling with bent thorns, rising out of the pit along
//    both sides of the bridge, swaying; one sweeps across the frame (the strike), one snatches a figure off the bridge
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
import { FPS, shotOf, SHOTS, EV, HOOKS, hookState, STREAKS, streakX, ITEMS_AT, MAT_X, CRUMBLE, HOURGLASS, bridgeX } from "./timeline";


const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const span = (k: string) => SHOTS.find((s) => s.kind === k) ?? { from: -1e9, to: -1e9 };

/** one hook, tip at the local origin's top: a shaft rising from far below, then a J-curve over to a barbed point, with
 *  bent thorns all along it (iron, nearly black; the fire lights it from below). Height = h metres. */
const buildHook = (h: number, seed: number) => {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = new THREE.Group(), iron = mat("#2a1b18"), ironD = mat("#170e0c");
  const R = h * 0.042, pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(0.02 * h * Math.sin(i * 0.7), -h + (h - 0.35 * h * 0.0) * (i / 10) * 0.8, 0));   // the shaft
  const top = -0.2 * h;
  const curve = [[0.0, top], [0.05, 0.02 * h], [0.17, 0.09 * h], [0.3, 0.07 * h], [0.37, -0.02 * h], [0.36, -0.12 * h], [0.3, -0.2 * h], [0.25, -0.15 * h], [0.24, -0.08 * h]];
  for (const [x, y] of curve) pts.push(new THREE.Vector3(x * h * (x === 0 ? 0 : 1), y, 0));
  const path = new THREE.CatmullRomCurve3(pts);
  const N = 60;
  for (let i = 0; i < N; i++) {                                  // the body: tapering segments along the path
    const a = path.getPoint(i / N), b = path.getPoint((i + 1) / N), u = i / N, rad = R * (1.1 - 0.95 * Math.max(0, (u - 0.55) / 0.45));
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, a.distanceTo(b) + 0.02, 8), u > 0.6 ? iron : ironD);
    seg.position.copy(a).add(b).multiplyScalar(0.5); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(seg);
  }
  const tip = path.getPoint(1), tipDir = path.getTangent(1);
  const point = new THREE.Mesh(new THREE.ConeGeometry(R * 0.4, R * 3.2, 8), iron); point.position.copy(tip).addScaledVector(tipDir, R * 1.4); point.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir); g.add(point);
  const barb = new THREE.Mesh(new THREE.ConeGeometry(R * 0.35, R * 2.2, 6), iron); barb.position.copy(tip).add(new THREE.Vector3(-R * 0.9, -R * 0.6, 0)); barb.rotation.z = 2.4; g.add(barb);
  for (let i = 0; i < 30; i++) {                                 // the bent thorns (al-Sa'dan): a cone and a hooked tip
    const u = 0.25 + 0.72 * r(), a = path.getPoint(u), tg = path.getTangent(u), out = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(tg).normalize();
    const len = R * (1.2 + 2.0 * r()), th = new THREE.Group(); th.position.copy(a); th.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.28, len, 5), ironD); c1.position.y = len / 2; th.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.12, len * 0.6, 5), ironD); c2.position.set(len * 0.18, len * 0.95, 0); c2.rotation.z = -1.1; th.add(c2);
    g.add(th);
  }
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.userData.noCollide = true; } });
  return g;
};

export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const root = roots.abyss!;
  // ---- the hooks ----
  const hooks = HOOKS.map((hk, i) => { const g = buildHook(hk.h, 31 + i * 7); g.userData.moving = true; root.add(g); return g; });
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
      hooks.forEach((g, i) => { const st = hookState(i, f); g.visible = st.visible; if (st.visible) g.position.set(...st.pos); else g.position.set(0, -3000, 0); /* hidden things still block the camera-collision rays: park them far below */ g.rotation.set(st.rot[0], st.rot[1], st.rot[2]); });
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
