// The void: a dark, empty space with one hard spotlight from above (a visible cone with dust in it, a bright pool on a
// glossy black floor), a faint ring of orange light around the pool, and far-off out-of-focus city lights (bokeh) that
// also serve as the blurred background behind the phone close-up.
// Local coordinates: he stands at the centre of the pool (SPOT); cameras stand toward +z.
// States: "off" (black: only the far lights), "on" (the spotlight), "phone" (dim: the phone close-up's background).
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT } from "../render/grade";
import { NOINK } from "../render/ink";
import { StorySet, SetLook, mat, glow, plane, lightBeam, dust } from "./common";
import { ctex } from "../draw/paint";

export const VOID = { SPOT: [0, 0, 0] as V3, PHONE: [0.0, 1.5, 3.2] as V3 };

const poolTex = () => ctex("voidPool", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.55)"); gr.addColorStop(0.8, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const ringTex = () => ctex("voidRing", 512, 512, (g) => {
  g.strokeStyle = "rgba(255,255,255,1)"; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 18; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke();
});

export const buildVoid = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  plane(root, 60, 60, mat("#0b0c12"), [0, 0, 0], 0, -Math.PI / 2);
  // the pool of light and the orange ring, flat on the floor (glowing, not outlined)
  const poolM = new THREE.MeshBasicMaterial({ map: poolTex(), color: new THREE.Color("#fff1dc").multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = plane(root, 3.6, 3.6, poolM, [0, 0.004, 0], 0, -Math.PI / 2); pool.layers.set(NOINK);
  const ringM = new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color("#FB5606").multiplyScalar(1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = plane(root, 4.6, 4.6, ringM, [0, 0.006, 0], 0, -Math.PI / 2); ring.layers.set(NOINK);
  // the spotlight: a real light (shadow on the floor) and a visible cone with dust in it
  const spot = new THREE.SpotLight("#fff2de", 0, 0, 0.36, 0.45, 1.2);
  spot.position.set(0, 9, 0.4); spot.target.position.set(0, 0, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024);
  root.add(spot, spot.target);
  const cone = lightBeam(root, [0, 9, 0.4], [0, 0, 0], 0.5, 3.2, "#fff2de", 0.32);
  const motes = dust(root, [-1.3, 0.2, -1.3], [1.3, 6.5, 1.3], 260, "#fff2dc", 0.02, 1.2);
  // far-off city lights: soft glowing discs, deep in the dark (bokeh when out of focus)
  const far = new THREE.Group(); root.add(far);
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const cols = ["#FB5606", "#ffb36b", "#7aa7ff", "#ffd9a0", "#ff7a3a"];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 18 + r() * 22;
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.12 + r() * 0.2, 16), glow(cols[i % cols.length], 1.4 + r()));
    m.position.set(Math.sin(a) * d, 0.6 + r() * 7, -Math.abs(Math.cos(a) * d) - 4); m.layers.set(NOINK); far.add(m);
  }
  const apply = (state: string, t: number): SetLook => {
    const on = state === "on" ? 1 : 0, ph = state === "phone" ? 1 : 0;
    spot.intensity = on * 26; cone.setLevel(on * (1 + 0.04 * Math.sin(t * 23))); motes.points.visible = on > 0; motes.update(t);
    poolM.color.set("#fff1dc").multiplyScalar(0.55 * on); ringM.color.set("#FB5606").multiplyScalar(1.2 * on * (0.85 + 0.15 * Math.sin(t * 3)));
    far.visible = true;
    for (const m of far.children) (m as THREE.Mesh).visible = on > 0 || ph > 0 || state === "off";
    return { lit: [0.05, 0.05, 0.07], shade: [0.02, 0.02, 0.035], lift: [0.004, 0.004, 0.008], sat: 0.9, charTint: [1.0, 0.96, 0.9],
      cardGain: on ? 0.95 : 0.25, cardPointK: 1.6, pointK: 1.4, grade: GRADE_NIGHT };
  };
  return { id: "void", root, offset, apply };
};
