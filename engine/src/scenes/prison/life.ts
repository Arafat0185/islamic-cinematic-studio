// Video 008 "The Prison": what moves on top of the city set, per frame.
//  flares        every lantern near the camera gets a soft glow and an anamorphic horizontal streak (lens flare)
//  reflections   each of those lanterns is mirrored as a long soft streak on the wet stones (or wobbling on the canal)
//  rain          streaks falling (slanting in the wind) around the camera on the canal at night
//  birds         flocks drawn as flapping silhouettes: pigeons lifting off the roofs at the crossroads, doves rising in
//                the courtyard, birds wheeling in the sunrise sky
//  steps         his footsteps across the bridge lighting up softly gold
// All on the NOINK layer (no outlines, no camera collision).
import * as THREE from "three";
import type { Frame, SetId } from "../../story/story";
import { NOINK } from "../../render/ink";
import { CITY } from "../../sets/city";
import { FPS, EV, shotOf, spanOf, BRIDGE_X0 } from "./timeline";

const fract = (x: number) => x - Math.floor(x);
const hsh = (n: number) => fract(Math.sin(n * 127.1) * 43758.5453);
const tex = (key: string, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w = 128, h = 128) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(cv); t.name = key; return t; };
const soft = tex("soft", (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const streak = tex("streak", (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = v; g.fillRect(0, 0, w, h); }, 256, 16);
const refl = tex("refl", (g, w, h) => { for (let y = 0; y < h; y++) { const a = Math.pow(1 - y / h, 1.6) * 0.9; const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, y, w, 1); } }, 32, 256);
const add = (c: string, k: number, map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(c).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });

/** a flock: n birds, each a flapping "V" drawn in the point's fragment shader; positions set per frame from JS */
const flock = (n: number) => {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), g = new THREE.BufferGeometry();
  for (let i = 0; i < n; i++) ph[i] = hsh(i + 77);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  const U = { uT: { value: 0 }, uCol: { value: new THREE.Color("#1a1612") }, uSize: { value: 0.5 }, uScale: { value: 1100 }, uFlap: { value: 9 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute float aPh; uniform float uT, uSize, uScale, uFlap; varying float vW; void main(){ vW = sin(uT * uFlap * (0.85 + 0.3 * aPh) + aPh * 30.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uSize * uScale / -mv.z, 2.0, 90.0); }`,
    fragmentShader: `uniform vec3 uCol; varying float vW; float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
      void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y; float wy = 0.55 * vW;
        float d = min(seg(p, vec2(0.0, 0.0), vec2(-0.9, wy)), seg(p, vec2(0.0, 0.0), vec2(0.9, wy)));
        d = min(d, length(p * vec2(1.0, 1.6)) - 0.12);
        float a = 1.0 - smoothstep(0.05, 0.13, d); if (a < 0.02) discard; gl_FragColor = vec4(uCol, a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.layers.set(NOINK);
  return { pts, pos, U, done: () => { g.attributes.position.needsUpdate = true; } };
};

export const buildLife = (roots: Partial<Record<SetId, THREE.Object3D>>) => {
  const R = roots.city!, S = R.getObjectByName("street")!, K = R.getObjectByName("court")!, N = R.getObjectByName("canal")!, Rf = R.getObjectByName("roof")!;
  const lanterns = R.userData.lanterns as THREE.Object3D[];
  const NF = 28, flares: { glow: THREE.Sprite; bar: THREE.Sprite; r: THREE.Mesh }[] = [];
  for (let i = 0; i < NF; i++) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color("#ffb060").multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: streak, color: new THREE.Color("#8fd8ff").multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add("#ffa848", 0.55, refl));
    for (const o of [glow, bar, r]) { o.layers.set(NOINK); S.add(o); }
    flares.push({ glow, bar, r });
  }
  // rain round the camera
  const NR = 900, rp = new Float32Array(NR * 6), rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: new THREE.Color("#9fc4d8"), transparent: true, opacity: 0.45, depthWrite: false, fog: false })); rain.frustumCulled = false; rain.layers.set(NOINK); R.add(rain);
  // flocks
  const pigeons = flock(60), doves = flock(46), sky = flock(140);
  doves.U.uCol.value.set("#e8e2d6"); doves.U.uSize.value = 0.45; sky.U.uCol.value.set("#2a2018"); sky.U.uSize.value = 0.9;
  S.add(pigeons.pts); K.add(doves.pts); Rf.add(sky.pts);
  // golden footsteps on the bridge
  const steps: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.28), add("#ffb040", 1.0, soft)); m.rotation.set(-Math.PI / 2, 0, Math.PI / 2); m.layers.set(NOINK); N.add(m); steps.push(m); }
  const v = new THREE.Vector3(), cam = new THREE.Vector3(), fwd = new THREE.Vector3(), wpos = new THREE.Vector3();
  const setTo = (o: THREE.Object3D, parent: THREE.Object3D) => o.parent !== parent && parent.add(o);

  return {
    update: (fr: Frame, f: number) => {
      const sh = shotOf(f), t = f / FPS, k = sh.kind, c = fr.plan.cam;
      cam.set(...c.pos); fwd.set(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
      const area = sh.world === "street" ? S : sh.world === "court" ? K : sh.world === "canal" ? N : Rf;
      const night = !(sh.world === "roof" || k === "bridgeGold" || k === "gateBars" || k === "gateLook");
      // ---- flares + reflections on the nearest lanterns in front of the camera (in the area's own coordinates) ----
      const cand: { o: THREE.Object3D; d: number; front: boolean }[] = [];
      if (night) for (const o of lanterns) { if (o.parent !== area) continue; o.getWorldPosition(wpos); v.copy(wpos).sub(cam); const d = v.length(); if (d > 34) continue;
        const front = v.dot(fwd) > 0.2 * d; v.set(wpos.x - cam.x, -cam.y, wpos.z - cam.z); const gl = v.length(), gFront = v.dot(fwd) > 0.3 * gl;   // the lamp, or its reflection, in front
        if (!front && !gFront) continue; cand.push({ o, d, front }); }
      cand.sort((a, b) => a.d - b.d);
      const lc = area.worldToLocal(cam.clone()), onWater = sh.world === "canal";
      flares.forEach((fl, i) => {
        const on = i < cand.length; fl.glow.visible = fl.bar.visible = fl.r.visible = on; if (!on) return; fl.glow.visible = fl.bar.visible = cand[i].front;
        for (const o of [fl.glow, fl.bar, fl.r]) setTo(o, area);
        const { o, d } = cand[i], lp = o.position, flick = 0.9 + 0.1 * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 3.1 + i);
        fl.glow.position.copy(lp); fl.glow.scale.setScalar(0.9 * flick); (fl.glow.material as THREE.SpriteMaterial).opacity = Math.min(1, 6 / d);
        fl.bar.position.copy(lp); fl.bar.scale.set(1.2 + 0.06 * d, 0.05 + 0.002 * d, 1); (fl.bar.material as THREE.SpriteMaterial).opacity = Math.min(0.9, 4 / d) * flick;
        // the reflection: a long soft streak lying on the wet stones (or wobbling on the water), pointing at the camera
        const gx = onWater ? lp.x - Math.sign(lp.x) * 1.0 : lp.x, gy = onWater ? CITY.WATER_Y + 0.02 : 0.012;
        const dx = lc.x - gx, dz = lc.z - lp.z, dl = Math.hypot(dx, dz) || 1, Y = Math.max(0.5, lp.y - gy), len = Math.min(30, Math.hypot(lc.x - gx, lc.z - lp.z) * Y / (Math.max(0.15, lc.y - gy) + Y)) * (0.85 + 0.1 * Math.sin(t * 2 + i));   // a mirror image: from the lamp's foot almost to the eye
        fl.r.position.set(gx + (dx / dl) * len * 0.5 + (onWater ? 0.12 * Math.sin(t * 3 + i) : 0), gy, lp.z + (dz / dl) * len * 0.5);
        fl.r.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI); fl.r.scale.set(0.55 + 0.12 * Math.sin(t * 4 + i), len, 1);
        (fl.r.material as THREE.MeshBasicMaterial).opacity = Math.min(1, 9 / d);
      });
      // ---- rain (the canal at night; heavier with the storm) ----
      const storm = fr.state.startsWith("canal:0") ? Number(fr.state.split(":")[2] ?? 0) : 0;
      rain.visible = storm > 0;
      if (rain.visible) { const lc = R.worldToLocal(cam.clone()), wind = 0.25 + 0.5 * storm;
        for (let i = 0; i < NR; i++) { const x = lc.x + (hsh(i) - 0.5) * 14, z = lc.z + (hsh(i + 9) - 0.5) * 14, y = lc.y + 6 - ((t * (9 + 3 * hsh(i + 3)) + hsh(i + 5) * 12) % 12);
          rp.set([x, y, z, x - wind * 0.35, y - 0.42, z + 0.05], i * 6); }
        rg.attributes.position.needsUpdate = true; (rain.material as THREE.LineBasicMaterial).opacity = 0.25 + 0.3 * storm; }
      // ---- the flocks ----
      pigeons.pts.visible = k === "turnMinaret" || k === "crossroads"; doves.pts.visible = k === "doves" || k === "courtEnter"; sky.pts.visible = sh.world === "roof";
      if (pigeons.pts.visible) { const s0 = Math.max(0, t - EV.birdsUp); pigeons.U.uT.value = t;
        for (let i = 0; i < 60; i++) { const lift = s0 * (1.2 + 0.8 * hsh(i)), ang = hsh(i + 1) * 6.28 + s0 * 0.6;
          pigeons.pos.set([14 + hsh(i + 2) * 10 + lift * 3 * Math.cos(ang), 6.2 + lift * 2.2 + 0.4 * Math.sin(ang * 2), CITY.FORK_Z - 11 + hsh(i + 3) * 4 + lift * 1.5 * Math.sin(ang)], i * 3); }
        pigeons.U.uFlap.value = s0 > 0 ? 11 : 0.0001; pigeons.done(); }
      if (doves.pts.visible) { const s0 = Math.max(0, t - EV.dovesUp); doves.U.uT.value = t;
        for (let i = 0; i < 46; i++) { const lift = s0 * (1.0 + 0.9 * hsh(i)), ang = hsh(i + 1) * 6.28 + s0 * (0.5 + 0.4 * hsh(i + 4)), rad = 1.2 + 2.5 * hsh(i + 2) + lift * 0.6;
          doves.pos.set([Math.cos(ang) * rad, 0.15 + lift * 2.1, -2.4 + Math.sin(ang) * rad], i * 3); }
        doves.U.uFlap.value = s0 > 0 ? 12 : 0.0001; doves.done(); }
      if (sky.pts.visible) { sky.U.uT.value = t;
        for (let i = 0; i < 140; i++) { const ang = hsh(i) * 6.28 + t * (0.12 + 0.1 * hsh(i + 1)) * (i % 2 ? 1 : -1), rad = 10 + 26 * hsh(i + 2);
          sky.pos.set([Math.cos(ang) * rad, 14 + 30 * hsh(i + 3) + 2 * Math.sin(t + i), -34 + Math.sin(ang) * rad * 0.6], i * 3); }
        sky.done(); }
      // ---- golden footsteps across the bridge ----
      const bg = k === "bridgeGold", t0 = spanOf("bridgeGold").from / FPS;
      steps.forEach((m, i) => { const x = BRIDGE_X0 + 0.18 + i * 0.36, passed = (x - (BRIDGE_X0 + 0.95 * (t - t0))) < -0.1; m.visible = bg && passed;
        if (m.visible) { m.position.set(x, CITY.deckY(x) + 0.015, CITY.BRIDGE_Z - 0.1 + (i % 2 ? 0.1 : -0.1)); (m.material as THREE.MeshBasicMaterial).color.set("#ffb040").multiplyScalar(0.9 + 0.2 * Math.sin(t * 3 + i)); } });

    },
  };
};
