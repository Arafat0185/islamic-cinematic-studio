// The story player: plays a StoryFilm across several sets. Every set is built once at its own offset; each frame only
// the frame's set is visible (with its own sun, sky, light and colour grade). The camera is checked against that set's
// geometry (collision), the Traveller is posed as a lit card, and the effect chain (ink, lens blur, bloom, tone map,
// grade) runs as in the courtyard films. On top: a star iris (a second view of the outgoing shot), whip-pan blur,
// accent flashes, the film's 2D overlay and its audio.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback, NOINK } from "../render/ink";
import { LensBlur, GrainEffect } from "../render/lensblur";
import { GradeEffect, GRADE_NIGHT, GradeParams } from "../render/grade";
import { Cast } from "../render/card";
import { applyCam } from "../camera/ease";
import { safeCam } from "../camera/collision";
import { applyLook, NIGHT } from "../scenes/courtyard-test/look";
import { buildBeautyWorld, LOOK, MAIN } from "../scenes/courtyard-beauty/world";
import { FloorFx } from "../brand/floorFx";
import { Levels } from "../brand/levels";
import { irisAt, irisClip, IrisRim, whipAt, WhipBlurDefs } from "../brand/transitions";
import { buildBedroom } from "../sets/bedroom";
import { buildStreet, Vehicle } from "../sets/street";
import { buildOffice } from "../sets/office";
import { buildGym } from "../sets/gym";
import { buildFeed } from "../sets/feed";
import { buildVoid } from "../sets/void";
import { buildDeadlines } from "../sets/deadlines";
import { buildAirport } from "../sets/airport";
import { buildCar } from "../sets/car";
import { buildSofa } from "../sets/sofa";
import { buildHospital } from "../sets/hospital";
import { buildCemetery } from "../sets/cemetery";
import { buildAbyss } from "../sets/abyss";
import { buildLibrary } from "../sets/library";
import { buildBookWorlds } from "../sets/bookworlds";
import type { SetLook, StorySet } from "../sets/common";
import { SET_OFFSET, SetId, StoryFilm, FrameFx, Shatter } from "./story";
import { buildCourtyardFx } from "../brand/courtyardFx";
import { Pen } from "../draw/toon";
import { SU, WIDE } from "../render/card";

/** camReport: check every frame's camera against its set and log it (render a still with --log=verbose) */
type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number; camReport?: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.7 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** the sets a film uses, each built once at its own offset (the courtyard with its brand effects) */
const DEFAULT_SETS: SetId[] = ["courtyard", "bedroom", "street", "office", "gym"];
const buildWorld = (traffic: Vehicle[], ids: SetId[] = DEFAULT_SETS) => {
  const root = new THREE.Group();
  const has = (id: SetId) => ids.includes(id);
  const roots: Partial<Record<SetId, THREE.Object3D>> = {};
  const sets: Partial<Record<SetId, StorySet>> = {};
  let court: ReturnType<typeof buildBeautyWorld> | null = null, fx: FloorFx | null = null, courtFx: ReturnType<typeof buildCourtyardFx> | null = null, levels: Levels | null = null;
  if (has("courtyard")) {
    court = buildBeautyWorld();
    fx = new FloorFx(0.5, 0, 30); court.root.add(fx.mesh);
    courtFx = buildCourtyardFx(court.root);
    levels = new Levels(court.root, MAIN, { mist: court.mist.group, dust: court.dust.points });
    roots.courtyard = court.root;
  }
  let street: ReturnType<typeof buildStreet> | null = null, office: ReturnType<typeof buildOffice> | null = null;
  if (has("street")) { street = buildStreet(SET_OFFSET.street); street.setTraffic(traffic); sets.street = street.set; }
  if (has("office")) { office = buildOffice(SET_OFFSET.office); sets.office = office.set; }
  const simple: [SetId, (o: [number, number, number]) => StorySet][] = [
    ["bedroom", buildBedroom], ["gym", buildGym], ["feed", buildFeed], ["void", buildVoid], ["deadlines", buildDeadlines],
    ["airport", buildAirport], ["car", buildCar], ["sofa", buildSofa], ["hospital", buildHospital], ["abyss", buildAbyss], ["library", buildLibrary], ["bookworlds", buildBookWorlds],
  ];
  for (const [id, b] of simple) if (has(id)) sets[id] = b(SET_OFFSET[id]);
  let cemetery: ReturnType<typeof buildCemetery> | null = null;
  if (has("cemetery")) { cemetery = buildCemetery(SET_OFFSET.cemetery); sets.cemetery = cemetery.set; }
  for (const [id, st] of Object.entries(sets) as [SetId, StorySet][]) roots[id] = st.root;
  for (const r of Object.values(roots)) root.add(r!);
  const cast = new Cast(); root.add(cast.root);
  return { root, roots: roots as Record<SetId, THREE.Object3D>, sets, court, fx, courtFx, levels, street, office, cemetery, cast };
};
type World = ReturnType<typeof buildWorld>;

const cameraReport = (film: StoryFilm, w: World) => {
  let moved = 0, minClear = Infinity;
  const rows: string[] = [];
  const check = (f: number, out: boolean) => {
    const fr = film.frameAt(f, out), pl = fr.plan;
    const r = safeCam(w.roots[fr.set], pl.anchor ? { ...pl.cam, look: pl.anchor } : pl.cam);
    minClear = Math.min(minClear, r.clearance);
    if (r.moved > 0.001) { moved++; rows.push(`frame ${f}${out ? " (iris out)" : ""} in ${fr.set}: moved ${r.moved.toFixed(2)} m (occluded at ${r.occluded.toFixed(2)}, clearance ${r.clearance.toFixed(2)})`); }
  };
  for (const s of Object.values(w.roots)) s.visible = true;
  for (let f = 0; f < film.frames; f++) check(f, false);
  for (const ir of film.irises) for (let f = ir.from; f < ir.from + ir.len; f++) check(f, true);
  console.log(`CAMERA REPORT: ${film.frames} frames, ${moved} corrected, closest surface ${minClear === Infinity ? "> margin" : minClear.toFixed(2) + " m"}`);
  for (const r of rows.slice(0, 400)) console.log("CAMERA REPORT: " + r);
};

/** every frame (every 2nd): does any opaque part of the Traveller's card pass through a 3D object of the set?
 *  The card's drawing is rasterised small, its opaque pixels placed in the world (position, yaw toward the camera,
 *  roll, mirror) and tested against the world boxes of the set's meshes (floors, walls, roads, the sky and NOINK
 *  things are skipped: he stands on floors and in front of walls). */
const intersectReport = (film: StoryFilm, w: World) => {
  const cv = document.createElement("canvas"), g = cv.getContext("2d")!;
  const boxes: Partial<Record<SetId, { b: THREE.Box3; name: string }[]>> = {};
  const boxesOf = (id: SetId) => boxes[id] ??= (() => {
    const out: { b: THREE.Box3; name: string }[] = [];
    w.roots[id].updateMatrixWorld(true);
    const moving = new Set<THREE.Object3D>();
    w.roots[id].traverse((o) => { if (o.userData.moving) o.traverse((c) => moving.add(c)); }); // traffic: boxes would be stale
    w.roots[id].traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || o.layers.mask !== 1 || !m.geometry || moving.has(o)) return;
      const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3());
      if (Math.max(sz.x, sz.y, sz.z) > 4.5 || Math.min(sz.x, sz.y, sz.z) > 3) return; // floors, walls, roads, buildings' bulk
      out.push({ b, name: `${m.geometry.type} ${sz.x.toFixed(2)}x${sz.y.toFixed(2)}x${sz.z.toFixed(2)} @ ${b.getCenter(new THREE.Vector3()).toArray().map((x) => x.toFixed(2)).join(",")}` });
    });
    return out;
  })();
  const hits: Record<string, number[]> = {};
  const p = new THREE.Vector3();
  for (let f = 0; f < film.frames; f += 2) {
    const fr = film.frameAt(f, false), tr = fr.traveller;
    if (!tr) continue;
    const W0 = tr.wide ? WIDE.w : 600, H0 = tr.wide ? WIDE.h : 1000, base = tr.wide ? WIDE.base : 975, k = 0.12;
    cv.width = Math.round(W0 * k); cv.height = Math.round(H0 * k);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(k, 0, 0, k, 0, 0);
    tr.draw(new Pen(g));
    const px = g.getImageData(0, 0, cv.width, cv.height).data;
    const c = fr.plan.cam.pos, yaw = tr.yaw ?? Math.atan2(c[0] - tr.pos[0], c[2] - tr.pos[2]), roll = tr.roll ?? 0, mir = tr.mirror ? -1 : 1;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
    for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
      if (px[(y * cv.width + x) * 4 + 3] < 128) continue;
      let lx = (x / k - W0 / 2) * SU * mir, ly = (base - y / k) * SU;
      const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr; lx = rx; ly = ry;
      p.set(tr.pos[0] + lx * cy, tr.pos[1] + ly, tr.pos[2] - lx * sy);
      for (const { b, name } of boxesOf(fr.set)) if (b.containsPoint(p)) { (hits[`${fr.set}: ${name}`] ??= []).push(f); break; }
    }
  }
  const keys = Object.keys(hits);
  console.log(`INTERSECT REPORT: ${keys.length ? keys.length + " object(s) touched" : "the Traveller never passes through a 3D object"}`);
  for (const k of keys) { const fs = [...new Set(hits[k])]; console.log(`INTERSECT REPORT: ${k}: ${fs.length} frames, ${fs[0]}-${fs[fs.length - 1]}`); }
};

const Inner: React.FC<{ film: StoryFilm; outgoing?: boolean; traffic: Vehicle[] }> = ({ film, outgoing, traffic }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const w = useMemo(() => buildWorld(traffic, film.sets), [traffic, film]);
  const life = useMemo(() => film.life?.(w.roots) ?? null, [w, film]);
  const post = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.6 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
    grain: new GrainEffect({ amount: 0.018, cellPx: 1.4 }),
    gradeNow: { p: GRADE_NIGHT as GradeParams },
  }), [camera, scene]);
  useEffect(() => () => post.ink.dispose(), [post]);
  const chain = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={post.ink} dispose={null} /> : <></>}
      {on.lens ? <primitive object={post.lens.pre} dispose={null} /> : <></>}
      {on.lens ? <primitive object={post.lens.main} dispose={null} /> : <></>}
      {on.bloom ? <primitive object={post.bloom} dispose={null} /> : <></>}
      <primitive object={post.tone} dispose={null} />
      {on.grade ? <primitive object={post.grade} dispose={null} /> : <></>}
      {film.fxAt ? <primitive object={post.grain} dispose={null} /> : <></>}
    </EffectComposer>
  ), [post, on, film]);
  useMemo(() => { if (on.camReport && !outgoing) { cameraReport(film, w); intersectReport(film, w); } }, [on, outgoing, film, w]);
  const gl = useThree((s3) => s3.gl);
  useFrame(() => { if (!outgoing) drawShatter(gl.domElement, film.shatterAt?.(f) ?? null); }, 2); // after the composer (priority 1)
  post.grain.seed = f;

  const fr = film.frameAt(f, !!outgoing);
  for (const [id, r] of Object.entries(w.roots)) r.visible = id === fr.set;
  // ---- the set's light ----
  let look: SetLook;
  if (fr.set === "courtyard") {
    const c = fr.courtyard ?? { levels: { main: 1, lanterns: 1, night: 1 } };
    w.fx!.grooves(...(c.grooves ?? [0, 0, 0, 0, 0.4]));
    w.fx!.mark(...(c.mark ?? [0, 0, 1, 0, 0]));
    const tp = fr.traveller?.pos ?? [0, 0, 0];
    w.courtFx!.update(c.rays === false ? { main: 0, lanterns: 0, night: 0 } : c.levels, c.swirl ?? 0, fr.t, [tp[0], 0, tp[2]]);
    const o = w.levels!.set(c.levels, LOOK);
    look = { lit: o.lit, shade: o.shade, lift: o.lift, sat: NIGHT.sat, charTint: NIGHT.charTint, cardGain: o.cardGain, grade: GRADE_NIGHT };
    w.court!.dust.update(fr.t); w.court!.mist.update(fr.t);
  } else {
    if (fr.hooks?.streetX !== undefined) w.street?.follow(fr.hooks.streetX as number);
    if (fr.set === "office") w.office?.setBanner((fr.hooks?.officeBanner as string | null) ?? null);
    if (fr.hooks?.graveFill !== undefined) w.cemetery?.setFill(fr.hooks.graveFill as number);
    const st = w.sets[fr.set];
    if (!st) throw new Error(`set "${fr.set}" is not built for this film (add it to film.sets)`);
    look = st.apply(fr.state, fr.t);
  }
  life?.update(fr, f);
  applyLook({
    ...(fr.set === "courtyard" ? LOOK : {}), lit: look.lit, shade: look.shade, lift: look.lift, sat: look.sat,
    charTint: look.charTint, cardGain: look.cardGain, cardPointK: look.cardPointK ?? 1, pointK: look.pointK ?? 1,
  });
  if (post.gradeNow.p !== look.grade) { post.grade.set(look.grade); post.gradeNow.p = look.grade; }
  // depth haze per set (the ink pass tints far lines toward it too)
  if (look.fog && film.fxAt) {
    const fg = (scene.fog as THREE.Fog | null) ?? (scene.fog = new THREE.Fog("#000", 1, 2));
    fg.color.set(look.fog[0]); fg.near = look.fog[1]; fg.far = look.fog[2];
  } else scene.fog = null;

  // ---- camera, checked against the set's geometry ----
  const pl = fr.plan;
  const checked = safeCam(w.roots[fr.set], pl.anchor ? { ...pl.cam, look: pl.anchor } : pl.cam);
  if (checked.moved > 0.001) console.warn(`camera collision: frame ${f} moved ${checked.moved.toFixed(2)} m`);
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, { ...pl.cam, pos: checked.cam.pos });

  // ---- the Traveller ----
  const tr = fr.traveller;
  const others = (fr.others ?? []).map((o) => ({ key: o.key, x: o.pos[0], y: o.pos[1], z: o.pos[2], draw: o.draw, mirror: o.mirror, roll: o.roll, yaw: o.yaw, wide: o.wide, scale: o.scale,
    blob: o.blob === undefined ? NIGHT.blob : o.blob, castShadow: o.castShadow ?? false }));
  w.cast.pose(cam, [...(tr ? [{ key: tr.key, x: tr.pos[0], y: tr.pos[1], z: tr.pos[2], draw: tr.draw, mirror: tr.mirror, roll: tr.roll, yaw: tr.yaw, wide: tr.wide, scale: tr.scale, blob: tr.blob === undefined ? NIGHT.blob : tr.blob, castShadow: true }] : []), ...others]);
  noInkFallback(w.root);
  cam.getWorldDirection(fwd);
  fpt.set(...pl.focus);
  post.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  post.lens.cInf = pl.cInf;
  post.lens.nearScale = pl.nearScale;
  return (
    <>
      <primitive object={w.root} dispose={null} />
      {chain}
    </>
  );
};

const View: React.FC<{ film: StoryFilm; outgoing?: boolean; traffic: Vehicle[]; style?: React.CSSProperties }> = ({ film, outgoing, traffic, style }) => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 45, near: 0.1, far: 600 }}>
        <Inner film={film} outgoing={outgoing} traffic={traffic} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// ---------------- the shatter ----------------
/** the 2D layer the shatter draws on (one per player, above the 3D view) */
let shatterCanvas: HTMLCanvasElement | null = null;
type Piece = { poly: [number, number][]; c: [number, number]; dir: [number, number]; speed: number; grow: number; spin: number };
let pieces: { key: string; list: Piece[]; rays: { a: number; pts: [number, number][] }[] } | null = null;
/** the pieces: rays from the impact point crossed with rings (jittered, deterministic) */
const makePieces = (x: number, y: number) => {
  const key = `${x}|${y}`;
  if (pieces?.key === key) return pieces;
  let sd = 77; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  const N = 15, RINGS = [0, 70, 170, 320, 520, 800, 1150, 2600];
  const angs = Array.from({ length: N }, (_, i) => ((i + 0.25 + 0.5 * r()) / N) * Math.PI * 2);
  const pt = (i: number, k: number): [number, number] => {
    const a = angs[i % N] + (k > 0 ? (r() - 0.5) * 0.05 : 0), rad = RINGS[k] * (k > 0 && k < RINGS.length - 1 ? 0.85 + 0.3 * r() : 1);
    return [x + Math.cos(a) * rad, y + Math.sin(a) * rad];
  };
  const grid = RINGS.map((_, k) => angs.map((_, i) => pt(i, k)));
  const list: Piece[] = [];
  for (let k = 0; k < RINGS.length - 1; k++) for (let i = 0; i < N; i++) {
    const a = grid[k][i], b = grid[k][(i + 1) % N], c = grid[k + 1][(i + 1) % N], d = grid[k + 1][i];
    const poly: [number, number][] = k === 0 ? [a, c, d] : [a, b, c, d];
    const cx = poly.reduce((m, p) => m + p[0], 0) / poly.length, cy = poly.reduce((m, p) => m + p[1], 0) / poly.length;
    const len = Math.hypot(cx - x, cy - y) || 1;
    list.push({ poly, c: [cx, cy], dir: [(cx - x) / len, (cy - y) / len], speed: 500 + 900 * r() + len * 0.6, grow: 0.8 + 2.4 * r() * (1 - k / RINGS.length) + 0.6, spin: (r() - 0.5) * 1.4 });
  }
  const rays = angs.map((a, i) => ({ a, pts: RINGS.map((_, k) => grid[k][i]) }));
  pieces = { key, list, rays };
  return pieces;
};
const drawShatter = (src: HTMLCanvasElement, s: Shatter | null) => {
  const cv = shatterCanvas; if (!cv) return;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, cv.width, cv.height);
  if (!s) return;
  const W = cv.width, H = cv.height, pc = makePieces(s.x, s.y);
  if (s.fly <= 0) {
    // the cracks running out from the impact: along each ray to crack * the frame's reach, then the rings
    const reach = s.crack * 2300;
    g.lineCap = "round"; g.lineJoin = "round";
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? "rgba(255,255,255,0.92)" : "rgba(10,12,20,0.55)"; g.lineWidth = pass ? 2.2 : 5;
      for (const ry of pc.rays) {
        g.beginPath(); g.moveTo(s.x, s.y);
        for (const p of ry.pts.slice(1)) { const d = Math.hypot(p[0] - s.x, p[1] - s.y); if (d > reach) { const k = reach / d; g.lineTo(s.x + (p[0] - s.x) * k, s.y + (p[1] - s.y) * k); break; } g.lineTo(p[0], p[1]); }
        g.stroke();
      }
      const rings = Math.max(0, (s.crack - 0.35) / 0.65);
      for (const pce of pc.list) {
        const d = Math.hypot(pce.c[0] - s.x, pce.c[1] - s.y);
        if (d > rings * 1400 || pce.poly.length < 4) continue;
        g.beginPath(); g.moveTo(...pce.poly[2]); g.lineTo(...pce.poly[3]); g.stroke();
      }
    }
    const glow = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 120); glow.addColorStop(0, `rgba(255,255,255,${0.6 * s.crack})`); glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow; g.fillRect(s.x - 120, s.y - 120, 240, 240);
    return;
  }
  // the pieces fly toward the lens: outward from the impact, growing (closer), spinning; the dark behind them
  g.fillStyle = `rgba(3,3,6,${s.black})`; g.fillRect(0, 0, W, H);
  const v = s.fly, ord = [...pc.list].sort((a, b) => a.grow - b.grow);
  for (const pce of ord) {
    const sc = 1 + v * v * pce.grow * 2.2, off = Math.pow(v, 1.5) * pce.speed;
    g.save();
    g.translate(pce.c[0] + pce.dir[0] * off, pce.c[1] + pce.dir[1] * off); g.rotate(pce.spin * v); g.scale(sc, sc); g.translate(-pce.c[0], -pce.c[1]);
    g.beginPath(); g.moveTo(...pce.poly[0]); for (const p of pce.poly.slice(1)) g.lineTo(...p); g.closePath();
    g.save(); g.clip(); g.globalAlpha = 1 - 0.35 * v; g.drawImage(src, 0, 0, src.width, src.height, 0, 0, W, H); g.restore();
    g.strokeStyle = `rgba(255,255,255,${0.85 - 0.5 * v})`; g.lineWidth = 2.5 / sc; g.stroke();
    g.restore();
  }
};
const ShatterLayer: React.FC = () => (
  <canvas ref={(c) => { shatterCanvas = c; }} width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
);

/** one SVG filter for the frame's picture effects: directional motion blur, then chromatic aberration (the red and blue
 *  channels pushed apart) and, in the day only, a glitch (horizontal slices displaced) */
const FxDefs: React.FC<{ fx: FrameFx; whipBlur: number; f: number }> = ({ fx, whipBlur, f }) => {
  const bx = Math.max(fx.blurX, whipBlur), by = fx.blurY, ca = fx.ca + fx.glitch * 14, gl = fx.glitch, hz = fx.haze ?? 0;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        <filter id="storyFx" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} result={hz > 0 ? "b0" : "b"} />
          {hz > 0 ? <>
            <feTurbulence type="turbulence" baseFrequency={`${(0.006 + 0.0006 * Math.sin(f * 0.21)).toFixed(5)} ${(0.022 + 0.002 * Math.sin(f * 0.17)).toFixed(5)}`} numOctaves={2} seed={Math.floor(f / 2) % 89} result="hn" />
            <feDisplacementMap in="b0" in2="hn" scale={hz.toFixed(1)} xChannelSelector="R" yChannelSelector="G" result="b" />
          </> : null}
          {gl > 0 ? <>
            <feTurbulence type="fractalNoise" baseFrequency={`0.0005 ${(0.02 + 0.03 * ((f * 7) % 5) / 5).toFixed(4)}`} numOctaves={1} seed={f % 97} result="n" />
            <feComponentTransfer in="n" result="steps"><feFuncR type="discrete" tableValues="0 0.2 0.5 0.8 1 0.4" /><feFuncG type="discrete" tableValues="0.5" /></feComponentTransfer>
            <feDisplacementMap in="b" in2="steps" scale={(120 * gl).toFixed(1)} xChannelSelector="R" yChannelSelector="G" result="b2" />
          </> : <feOffset in="b" dx={0} dy={0} result="b2" />}
          <feColorMatrix in="b2" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={ca.toFixed(2)} dy={0} result="r2" />
          <feColorMatrix in="b2" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="b2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bl" />
          <feOffset in="bl" dx={(-ca).toFixed(2)} dy={0} result="b3" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b3" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
};

/** one shared empty traffic list: a new [] on every render would rebuild the whole world every frame */
const NO_TRAFFIC: Vehicle[] = [];
export const StoryPlayer: React.FC<{ film: StoryFilm; traffic?: Vehicle[] }> = ({ film, traffic = NO_TRAFFIC }) => {
  const f = useCurrentFrame(), { width: wd, height: h } = useVideoConfig();
  const fx = film.fxAt?.(f);
  const whip = film.whips.map((w) => whipAt(f, w.from, w.len)).find((x) => x) ?? null;
  const ir = film.irises.find((r) => f >= r.from && f < r.from + r.len);
  const iris = ir ? irisAt(f, ir.from, ir.len, wd, h) : null;
  const acc = film.accentAt(f);
  const O = film.Overlay;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {film.audio ? <Audio src={staticFile(film.audio)} /> : null}
      {!fx && whip ? <WhipBlurDefs px={whip.blur} /> : null}
      {fx ? <FxDefs fx={fx} whipBlur={whip?.blur ?? 0} f={f} /> : null}
      <View film={film} traffic={traffic} style={fx
        ? { filter: "url(#storyFx)" + (fx.css ? " " + fx.css : ""), ...(fx.zoom ? { transform: `scale(${fx.zoom.scale})`, transformOrigin: `${fx.zoom.x}px ${fx.zoom.y}px` } : {}), ...(fx.clip ? { clipPath: fx.clip } : {}) }
        : whip ? { filter: "url(#whipBlur)" } : undefined} />
      {ir && iris ? <View film={film} outgoing traffic={traffic} style={{ clipPath: irisClip(iris.R, iris.rot, wd, h) }} /> : null}
      {iris ? <IrisRim R={iris.R} rot={iris.rot} u={iris.u} /> : null}
      {film.shatterAt ? <ShatterLayer /> : null}
      {acc.flash > 0 ? (
        <AbsoluteFill style={{
          pointerEvents: "none", mixBlendMode: "screen", opacity: acc.flash * (acc.warm ? 0.32 : 0.22),
          background: acc.warm ? "radial-gradient(circle at 50% 45%, rgba(255,214,150,1), rgba(232,176,75,0.35) 45%, rgba(0,0,0,0) 75%)"
            : "radial-gradient(circle at 50% 50%, rgba(255,140,120,1), rgba(200,80,70,0.3) 50%, rgba(0,0,0,0) 80%)",
        }} />
      ) : null}
      {fx && fx.vignette > 0 ? <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(3,4,12,${(0.55 * fx.vignette).toFixed(3)}) 100%)` }} /> : null}
      <O />
      {fx && fx.flash > 0 ? <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(circle at 50% 45%, #fffaf0, #fff3dc 60%, #ffe6b8)", opacity: Math.min(1, fx.flash) }} /> : null}
    </AbsoluteFill>
  );
};
