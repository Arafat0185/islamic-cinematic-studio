// The Lesson (video 007, "Black & Gold Noir"): three worlds far apart in one set; the state picks the world (the others
// are hidden). The hospital room itself is sets/hospital.ts. Everything here is near-monochrome by design (greys, cold
// moonlight); the only colour is gold light, used for meaning (the picture's MonoGoldEffect greys everything else).
//   "dunes:<dawn>:<storm>:<ax>:<az>"  an endless desert at night (moon, stars, a cold wind) or at dawn (dawn 0..1: the
//                       sky warms, the sun rises gold on the horizon at -z); storm 0..1 darkens the air with sand;
//                       ax/az: where the moon/sun's shadow box is centred. A flat pan (radius ~55 m) at the origin where
//                       the ghost-gold things stand, dunes rising all round it.
//   "corr:<p>"          a long hospital corridor at night; ceiling panels flickering (p: unused, time drives it)
//   "ext:<doors>"       a hospital entrance at dawn: a tall facade, sliding glass doors (doors 0..1 open), a lobby
//                       glowing cold behind them, the first gold light on the paving
// The ghost-gold objects, the sand and the footprints are added by the film (scenes/lesson/life.ts) into the "dunes"
// group (named), on the NOINK layer.
import * as THREE from "three";
import type { V3 } from "../camera/ease";
import { GRADE_NIGHT, type GradeParams } from "../render/grade";
import { NOINK } from "../render/ink";
import { ctex, rep } from "../draw/paint";
import { StorySet, SetLook, mat, glow, box, cyl, sun } from "./common";
import { skyFor } from "./bookworlds";

export const LESSON_AREAS: Record<string, V3> = { dunes: [0, 0, 0], corridor: [3000, 0, 0], exterior: [6000, 0, 0] };

// ---------------- the dunes: one height function, shared with the film (people stand on it) ----------------
const tri = (x: number) => 1 - 2 * Math.abs(x - Math.floor(x) - 0.5);           // a triangle wave 0..1 (sharp crests)
const sstep = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** the dune field (no pan): long crests running roughly along x, warped; sharp crests, soft troughs */
const field = (x: number, z: number) => {
  const wz = z + 9 * Math.sin(x * 0.021) + 4 * Math.sin(x * 0.053 + 1.3);
  const big = Math.pow(tri(wz / 46 + 0.15 * Math.sin(x * 0.011)), 1.7) * 17;
  const wx = x + 6 * Math.sin(z * 0.033);
  const small = Math.pow(tri(wx / 19 + wz / 37), 2.0) * 4.5;
  return big + small;
};
/** the ground height (local metres) at x, z: the pan at the origin is flat (0), the dunes rise round it */
export const duneH = (x: number, z: number) => {
  const r = Math.hypot(x, z * 0.85);
  const hd = Math.hypot(x - HOLLOW_AT[0], z - HOLLOW_AT[2]);                        // a low hollow in the pan
  return sstep(52, 95, r) * field(x, z) + 0.06 * Math.sin(x * 1.7 + z * 0.6) * Math.sin(z * 1.3) - 1.5 * Math.exp(-(hd / 3.4) * (hd / 3.4));
};
/** the hollow the sand trickles into (local to the dunes) */
export const HOLLOW_AT: V3 = [-26, -1.5, 14];
/** the true crest walking from (x, z) toward -z: where the ground stops rising (after it has risen 3 m) */
export const crestAlong = (x: number, z: number): V3 => {
  let best: V3 = [x, duneH(x, z), z];
  for (let zz = z; zz > z - 170; zz -= 0.25) { const h = duneH(x, zz); if (h > best[1]) best = [x, h, zz]; }   // the highest crest ahead
  return best;
};
/** the skyline point seen from eye (x, y, z) looking toward -z: the ground point with the highest elevation angle */
export const skylineFrom = (x: number, y: number, z: number): V3 => {
  let best: V3 = [x, 0, z - 20], ang = -9;
  for (let d = 15; d < 260; d += 0.5) { const h = duneH(x, z - d), a = (h - y) / d; if (a > ang) { ang = a; best = [x, h, z - d]; } }
  return best;
};
/** the highest point within R metres of (x, z) (sampled), for standing someone on a crest */
export const peakNear = (x: number, z: number, R = 12): V3 => {
  let best: V3 = [x, duneH(x, z), z];
  for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) { const px = x + (i / 20) * R, pz = z + (j / 20) * R, h = duneH(px, pz); if (h > best[1]) best = [px, h, pz]; }
  return best;
};

const sandTex = () => rep(ctex("lessonSand", 512, 512, (g, r) => {
  g.fillStyle = "#8f8a82"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "235,230,220" : "40,38,36"},${0.07 * r()})`; g.fillRect(r() * 512, r() * 512, 1 + 2 * r(), 1 + 2 * r()); }
  for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(30,28,26,${0.08 + 0.08 * r()})`; g.lineWidth = 1.5 + r() * 1.5; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + 14 * r(), 340, y - 14 * r(), 512, y + 6 * r()); g.stroke(); }
}), 60, 60);
const corridorFloor = () => rep(ctex("lessonFloor", 256, 256, (g) => {
  g.fillStyle = "#5c5f63"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#4a4d51"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
}), 2, 20);

export const GRADE_NOIR: GradeParams = { ky: [0, 0.05, 0.19, 0.5, 0.8, 0.94, 1], sat: [0.9, 1.0, 1.0], tintS: [0.03, -0.01], tintM: [0.0, 0.0], tintH: [-0.01, 0.01], vig: [0.42, 0.28] };

export const buildLesson = (offset: V3): StorySet => {
  const root = new THREE.Group(); root.position.set(...offset);
  const area = (name: string) => { const g = new THREE.Group(); g.name = name; g.position.set(...LESSON_AREAS[name]); root.add(g); return g; };

  // ======================= DUNES =======================
  const D = area("dunes"), skyD = skyFor(D, 430);
  const S = 720, SEG = 300, geo = new THREE.PlaneGeometry(S, S, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pa = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) pa.setY(i, duneH(pa.getX(i), pa.getZ(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, mat("#ffffff", { map: sandTex() })); ground.receiveShadow = true; ground.castShadow = true; ground.name = "duneGround"; D.add(ground);
  const sunD = sun(D, [0, 0, -20], 70);
  // the moon: a pale disc with a soft halo (blooms), up left of the pan
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 40), glow("#e9edf2", 2.2)); moon.position.set(-150, 150, -330); moon.lookAt(0, 0, 0); moon.layers.set(NOINK); D.add(moon);
  const haloT = ctex("lessonHalo", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.6)"); gr.addColorStop(0.35, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const moonHalo = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshBasicMaterial({ map: haloT, color: new THREE.Color("#c8d0dc"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  moonHalo.position.copy(moon.position).multiplyScalar(1.01); moonHalo.lookAt(0, 0, 0); moonHalo.layers.set(NOINK); D.add(moonHalo);
  const moonL = new THREE.DirectionalLight("#b8c4d8", 0); moonL.position.set(-150, 150, -330); D.add(moonL);

  // ======================= CORRIDOR (local: the corridor runs from z = +2 to z = -40, 2.6 m wide) =======================
  const C = area("corridor"), wallC = mat("#8b9095"), dark = mat("#2e3236");
  box(C, [-1.3, -0.05, -40], [1.3, 0, 3], mat("#ffffff", { map: corridorFloor() }));
  box(C, [-1.5, 0, -40], [-1.3, 3, 3], wallC); box(C, [1.3, 0, -40], [1.5, 3, 3], wallC); box(C, [-1.5, 3, -40], [1.5, 3.1, 3], mat("#a2a6aa"));
  box(C, [-1.5, 0, -40.2], [1.5, 3, -40], dark);
  box(C, [-1.3, 0, -40], [-1.26, 0.12, 3], mat("#55585c"), false); box(C, [1.26, 0, -40], [1.3, 0.12, 3], mat("#55585c"), false);
  for (let i = 0; i < 6; i++) { const z = -3 - i * 6.2, s = i % 2 ? 1 : -1;        // doors, alternating sides; a handrail
    box(C, [s * 1.3 - (s > 0 ? 0.02 : -0.0), 0, z - 0.6], [s * 1.3 + (s > 0 ? 0.0 : 0.02), 2.1, z + 0.6], mat("#6f7378"));
    box(C, [s * 1.27 - 0.01, 1.0, z + 0.4], [s * 1.27 + 0.01, 1.08, z + 0.5], mat("#c4c8cc"), false); }
  for (const s of [-1, 1]) box(C, [s * 1.25 - 0.025, 0.9, -40], [s * 1.25 + 0.025, 0.95, 3], mat("#b4b8bc"), false);
  box(C, [0.5, 0.45, -16.5], [1.15, 0.6, -14.4], mat("#c9ccce"));                   // an empty trolley by the wall
  for (const [x, z] of [[0.55, -16.4], [1.1, -16.4], [0.55, -14.5], [1.1, -14.5]]) box(C, [x - 0.02, 0, z - 0.02], [x + 0.02, 0.45, z + 0.02], mat("#9a9ea2"), false);
  const panels: { m: THREE.MeshBasicMaterial; l: THREE.PointLight | null }[] = [];
  for (let i = 0; i < 12; i++) { const z = 1 - i * 3.4;
    const pm = glow("#e8eef4", 1.4); const p = box(C, [-0.35, 2.97, z - 0.6], [0.35, 3.0, z + 0.6], pm, false); p.layers.set(NOINK);
    const l = i < 7 ? new THREE.PointLight("#dfe8f2", 0, 6, 1.6) : null; if (l) { l.position.set(0, 2.7, z); C.add(l); }
    panels.push({ m: pm, l }); }
  const exitGlow = box(C, [-0.6, 0.0, -39.95], [0.6, 2.1, -39.9], glow("#cfd8e2", 0.5), false); exitGlow.layers.set(NOINK);

  // ======================= EXTERIOR: the hospital entrance at dawn (facade at z = -8, facing +z) =======================
  const X = area("exterior"), skyX = skyFor(X, 420);
  const pave = rep(ctex("lessonPave", 256, 256, (g) => { g.fillStyle = "#77736c"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "rgba(40,38,34,0.5)"; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } }), 60, 60);
  box(X, [-60, -0.05, -60], [60, 0, 60], mat("#ffffff", { map: pave }));
  const wallX = mat("#9a9690"), winT = ctex("lessonFacade", 256, 512, (g, r) => { g.fillStyle = "#9a9690"; g.fillRect(0, 0, 256, 512); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { g.fillStyle = r() < 0.12 ? "#d9dfe6" : "#2b2f35"; g.fillRect(14 + i * 62, 14 + j * 62, 40, 44); } });
  const wallW = mat("#ffffff", { map: winT });
  box(X, [-24, 3.2, -9], [24, 18, -8], wallW); box(X, [-24, 0, -9], [-2.2, 3.2, -8], wallX); box(X, [2.2, 0, -9], [24, 3.2, -8], wallX);
  box(X, [-3.4, 3.2, -8], [3.4, 3.45, -5.6], mat("#b8b4ac"));                       // the canopy
  for (const x of [-3.2, 3.2]) cyl(X, 0.1, 0.1, 3.2, mat("#a8a49c"), [x, 1.6, -5.8], 12);
  box(X, [-3.6, 0, -8], [3.6, 0.12, -5.2], mat("#86827a"));                          // the step
  const lobby = box(X, [-2.2, 0, -12], [2.2, 3.2, -11.9], glow("#c8d4e2", 1.25), false); lobby.layers.set(NOINK);
  box(X, [-2.2, 0, -12], [-2.15, 3.2, -9], mat("#cfd3d8")); box(X, [2.15, 0, -12], [2.2, 3.2, -9], mat("#cfd3d8")); box(X, [-2.2, 3.15, -12], [2.2, 3.2, -9], mat("#cfd3d8"));
  box(X, [-2.15, -0.02, -12], [2.15, 0.0, -9], mat("#b0b4b8"));
  const lobbyL = new THREE.PointLight("#cfdcec", 3.0, 9, 1.4); lobbyL.position.set(0, 2.4, -10.2); X.add(lobbyL);
  const glassM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#a8b8c8"), transparent: true, opacity: 0.22, depthWrite: false });
  const doorL = new THREE.Group(), doorR = new THREE.Group(); X.add(doorL, doorR);
  for (const [g, s] of [[doorL, -1], [doorR, 1]] as [THREE.Group, number][]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.0, 0.04), glassM); pane.position.set(s * 1.05, 1.55, 0); pane.layers.set(NOINK); g.add(pane);
    box(g, [s * 1.05 - 1.05, 0.05, -0.04], [s * 1.05 + 1.05, 0.12, 0.04], mat("#c8ccd0"), false); box(g, [s * 1.05 - 1.05, 2.98, -0.04], [s * 1.05 + 1.05, 3.05, 0.04], mat("#c8ccd0"), false);
    box(g, [s * 2.1 - 0.04 * s - 0.03, 0.05, -0.04], [s * 2.1 - 0.04 * s + 0.03, 3.05, 0.04], mat("#c8ccd0"), false);
    g.position.set(0, 0, -8.5);
  }
  const sunX = sun(X, [0, 0, -6], 18);

  // ---------------- apply ----------------
  const areas = { dunes: D, corridor: C, exterior: X };
  const hashT = (i: number, t: number) => { const x = Math.sin(i * 91.7 + Math.floor(t * 14) * 13.1) * 43758.5; return x - Math.floor(x); };
  const apply = (state: string, t: number): SetLook => {
    const [name, a0, b0, c0, d0] = state.split(":"), n = (v?: string, def = 0) => (v === undefined || v === "" ? def : Number(v));
    for (const [k, g] of Object.entries(areas)) g.visible = k === name;
    if (name === "dunes") {
      const dawn = n(a0), storm = n(b0), ax = n(c0), az = n(d0, -20);
      const top = new THREE.Color("#070a10").lerp(new THREE.Color("#2a2620"), dawn), hor = new THREE.Color("#262c36").lerp(new THREE.Color("#c98436"), dawn);
      hor.lerp(new THREE.Color("#3a3630"), storm * 0.7);
      skyD.uT.value = t; skyD.uTop.value.copy(top); skyD.uHor.value.copy(hor); skyD.uSun.value.set(0.05, 0.02 + 0.05 * dawn, -1).normalize();
      skyD.uSunCol.value.set("#ffc46a"); skyD.uSunK.value = 0.7 * dawn; skyD.uStars.value = 0.85 * (1 - dawn) * (1 - storm);
      skyD.uCloud.value = 0.35 + 0.4 * storm; skyD.uCloudCol.value.set("#1a1c22").lerp(new THREE.Color("#c08a50"), dawn * 0.8); skyD.uFlash.value = 0; skyD.uTear.value = dawn * 0.8;
      moon.visible = moonHalo.visible = dawn < 0.5; (moon.material as THREE.MeshBasicMaterial).color.set("#e9edf2").multiplyScalar(2.2 * (1 - storm * 0.8));
      sunD.aim([ax, 0, az]); sunD.setFrom(dawn > 0.5 ? [0.55, 0.22, -0.8] : [0.3, 0.5, 0.8]);   // moonlight from the camera's side (the disc in the sky is decor)
      sunD.light.color.set(dawn > 0.5 ? "#ffc070" : "#aebad0"); sunD.light.intensity = dawn > 0.5 ? 1.6 + 0.6 * dawn : 1.15 * (1 - 0.5 * storm);
      moonL.intensity = 0;
      const fog: [string, number, number] = dawn > 0.5 ? ["#b88a58", 40, 260] : storm > 0 ? ["#2e2c2a", 6 + 30 * (1 - storm), 60 + 200 * (1 - storm)] : ["#161a20", 40, 240];
      return dawn > 0.5
        ? { lit: [1.65, 1.02, 0.4], shade: [0.55, 0.36, 0.2], lift: [0.02, 0.016, 0.012], sat: 1.0, charTint: [1.0, 0.9, 0.75], cardGain: 0.9, cardPointK: 1, pointK: 1, grade: GRADE_NOIR, fog }
        : { lit: [0.85, 0.9, 1.0], shade: [0.24, 0.26, 0.32], lift: [0.014, 0.016, 0.02], sat: 0.6, charTint: [0.8, 0.85, 0.95], cardGain: 0.75, cardPointK: 1.2, pointK: 1.2, grade: GRADE_NOIR, fog };
    }
    if (name === "corridor") {
      panels.forEach((p, i) => { const k = hashT(i, t), flick = i === 2 || i === 5 ? (k < 0.45 ? 0.05 : k < 0.6 ? 0.5 : 1) : i === 8 ? (k < 0.7 ? 0.04 : 1) : 1;
        p.m.color.set("#e8eef4").multiplyScalar(1.4 * flick); if (p.l) p.l.intensity = 1.5 * flick; });
      return { lit: [0.5, 0.54, 0.6], shade: [0.07, 0.075, 0.09], lift: [0.008, 0.009, 0.012], sat: 0.6, charTint: [0.8, 0.85, 0.95], cardGain: 0.6, cardPointK: 1.2, pointK: 1.3, grade: GRADE_NIGHT, fog: ["#0c0f14", 6, 34] };
    }
    // exterior at dawn
    const open = n(a0);
    doorL.position.x = -2.0 * open; doorR.position.x = 2.0 * open;
    skyX.uT.value = t; skyX.uTop.value.set("#2c2c30"); skyX.uHor.value.set("#e0a050"); skyX.uSun.value.set(0.25, 0.08, 1).normalize(); skyX.uSunCol.value.set("#ffc46a"); skyX.uSunK.value = 1.2;
    skyX.uStars.value = 0; skyX.uCloud.value = 0.4; skyX.uCloudCol.value.set("#8a6a48"); skyX.uFlash.value = 0; skyX.uTear.value = 0.6;
    sunX.setFrom([0.3, 0.16, 1]); sunX.light.color.set("#ffbf6a"); sunX.light.intensity = 2.1;
    return { lit: [1.2, 0.9, 0.58], shade: [0.16, 0.15, 0.16], lift: [0.02, 0.018, 0.016], sat: 1.0, charTint: [1.0, 0.9, 0.76], cardGain: 0.9, cardPointK: 1, pointK: 1, grade: GRADE_NOIR, fog: ["#a07850", 20, 120] };
  };
  return { id: "lesson", root, offset, apply };
};
