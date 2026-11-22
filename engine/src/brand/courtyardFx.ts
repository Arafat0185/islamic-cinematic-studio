// Extra light and particles for the courtyard films:
//   rays    soft beams of lamp light falling from every lit lantern and the main lamp through their arches, and long
//           moonbeams slanting over the back wall onto the floor; their brightness follows the lamp levels (so they die
//           when the lamp is snuffed out)
//   swirl   a big swirl of small gold lights around the Traveller (the mercy): they spiral up around him; amount 0..1
import * as THREE from "three";
import { lightBeam } from "../sets/common";
import { NOINK } from "../render/ink";
import { ctex } from "../draw/paint";
import { WALL_Z, APEX } from "../scenes/courtyard-test/courtyard";
import { ARCHES, MAIN, LIT } from "../scenes/courtyard-beauty/world";
import type { V3 } from "../camera/ease";

export const buildCourtyardFx = (root: THREE.Object3D) => {
  const lampRays = ARCHES.filter((x) => x === MAIN || LIT.has(x)).map((x) => ({
    main: x === MAIN,
    beam: lightBeam(root, [x, APEX - 0.55, WALL_Z + 0.05], [x + 0.15, 0.0, WALL_Z + 1.9], 0.5, 2.2, "#ffd28a", x === MAIN ? 0.3 : 0.18),
  }));
  const moon = [-4.6, -1.8, 1.0, 3.8].map((x) => lightBeam(root, [x - 1.0, 6.2, WALL_Z - 1.0], [x + 0.8, 0.0, 1.8], 1.4, 2.6, "#b8c8f0", 0.12));

  // the gold swirl
  const N = 520;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  let sd = 21; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  for (let i = 0; i < N; i++) seed.set([r(), r(), r(), r()], i * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = ctex("goldDot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,236,190,0.7)"); gr.addColorStop(1, "rgba(255,220,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const swirl = new THREE.Points(geo, new THREE.PointsMaterial({ map: dot, size: 0.07, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  swirl.layers.set(NOINK); swirl.frustumCulled = false; root.add(swirl);

  /** levels: lamp levels (main, lanterns, night); swirlAmount 0..1; t seconds; centre = his position */
  const update = (lv: { main: number; lanterns: number; night: number }, swirlAmount: number, t: number, centre: V3) => {
    for (const l of lampRays) l.beam.setLevel(Math.min(1.3, l.main ? lv.main : lv.lanterns));
    for (const m of moon) m.setLevel(lv.night);
    swirl.visible = swirlAmount > 0.001;
    if (!swirl.visible) return;
    for (let i = 0; i < N; i++) {
      const [a, b, c, d] = [seed[i * 4], seed[i * 4 + 1], seed[i * 4 + 2], seed[i * 4 + 3]];
      const life = (t * (0.18 + 0.12 * b) + a) % 1;                  // each light rises and fades over its life
      const rad = 0.35 + 1.6 * c * (1 - 0.55 * life);                 // the swirl tightens as it rises
      const ang = 6.283 * d + t * (0.9 + 0.8 * c) + life * 3.5;
      pos.set([centre[0] + rad * Math.cos(ang), 0.05 + life * (2.4 + 1.6 * b), centre[2] + rad * Math.sin(ang)], i * 3);
      const k = swirlAmount * Math.sin(Math.PI * life) * (0.6 + 0.8 * a);
      col.set([2.0 * k, 1.45 * k, 0.6 * k], i * 3);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  return { update };
};
