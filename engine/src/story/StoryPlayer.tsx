// The story player: plays a StoryFilm across several sets. Every set is built once at its own offset; each frame only
// the frame's set is visible (with its own sun, sky, light and colour grade). The camera is checked against that set's
// geometry (collision), the Traveller is posed as a lit card, and the effect chain (ink, lens blur, bloom, tone map,
// grade) runs as in the courtyard films. On top: a star iris (a second view of the outgoing shot), whip-pan blur,
// accent flashes, the film's 2D overlay and its audio.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
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
import type { SetLook } from "../sets/common";
import { SET_OFFSET, SetId, StoryFilm, FrameFx } from "./story";
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

/** all the sets, built once */
const buildWorld = (traffic: Vehicle[]) => {
  const root = new THREE.Group();
  const court = buildBeautyWorld();
  const fx = new FloorFx(0.5, 0, 30); court.root.add(fx.mesh);
  const courtFx = buildCourtyardFx(court.root);
  const levels = new Levels(court.root, MAIN, { mist: court.mist.group, dust: court.dust.points });
  const bedroom = buildBedroom(SET_OFFSET.bedroom);
  const street = buildStreet(SET_OFFSET.street); street.setTraffic(traffic);
  const office = buildOffice(SET_OFFSET.office);
  const gym = buildGym(SET_OFFSET.gym);
  root.add(court.root, bedroom.root, street.set.root, office.set.root, gym.root);
  const cast = new Cast(); root.add(cast.root);
  const roots: Record<SetId, THREE.Object3D> = { courtyard: court.root, bedroom: bedroom.root, street: street.set.root, office: office.set.root, gym: gym.root };
  return { root, roots, court, fx, courtFx, levels, bedroom, street, office, gym, cast };
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
  for (const r of rows.slice(0, 40)) console.log("CAMERA REPORT: " + r);
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
  const w = useMemo(() => buildWorld(traffic), [traffic]);
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
  post.grain.seed = f;

  const fr = film.frameAt(f, !!outgoing);
  for (const [id, r] of Object.entries(w.roots)) r.visible = id === fr.set;
  // ---- the set's light ----
  let look: SetLook;
  if (fr.set === "courtyard") {
    const c = fr.courtyard ?? { levels: { main: 1, lanterns: 1, night: 1 } };
    w.fx.grooves(...(c.grooves ?? [0, 0, 0, 0, 0.4]));
    w.fx.mark(...(c.mark ?? [0, 0, 1, 0, 0]));
    const tp = fr.traveller?.pos ?? [0, 0, 0];
    w.courtFx.update(c.rays === false ? { main: 0, lanterns: 0, night: 0 } : c.levels, c.swirl ?? 0, fr.t, [tp[0], 0, tp[2]]);
    const o = w.levels.set(c.levels, LOOK);
    look = { lit: o.lit, shade: o.shade, lift: o.lift, sat: NIGHT.sat, charTint: NIGHT.charTint, cardGain: o.cardGain, grade: GRADE_NIGHT };
    w.court.dust.update(fr.t); w.court.mist.update(fr.t);
  } else {
    if (fr.hooks?.streetX !== undefined) w.street.follow(fr.hooks.streetX as number);
    if (fr.set === "office") w.office.setBanner((fr.hooks?.officeBanner as string | null) ?? null);
    const sets = { bedroom: w.bedroom, street: w.street.set, office: w.office.set, gym: w.gym };
    look = sets[fr.set].apply(fr.state, fr.t);
  }
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
  w.cast.pose(cam, tr ? [{ key: tr.key, x: tr.pos[0], y: tr.pos[1], z: tr.pos[2], draw: tr.draw, mirror: tr.mirror, roll: tr.roll, yaw: tr.yaw, wide: tr.wide, blob: tr.blob === undefined ? NIGHT.blob : tr.blob, castShadow: true }] : []);
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

/** one SVG filter for the frame's picture effects: directional motion blur, then chromatic aberration (the red and blue
 *  channels pushed apart) and, in the day only, a glitch (horizontal slices displaced) */
const FxDefs: React.FC<{ fx: FrameFx; whipBlur: number; f: number }> = ({ fx, whipBlur, f }) => {
  const bx = Math.max(fx.blurX, whipBlur), by = fx.blurY, ca = fx.ca + fx.glitch * 14, gl = fx.glitch;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        <filter id="storyFx" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} result="b" />
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

export const StoryPlayer: React.FC<{ film: StoryFilm; traffic?: Vehicle[] }> = ({ film, traffic = [] }) => {
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
        ? { filter: "url(#storyFx)", ...(fx.zoom ? { transform: `scale(${fx.zoom.scale})`, transformOrigin: `${fx.zoom.x}px ${fx.zoom.y}px` } : {}) }
        : whip ? { filter: "url(#whipBlur)" } : undefined} />
      {ir && iris ? <View film={film} outgoing traffic={traffic} style={{ clipPath: irisClip(iris.R, iris.rot, wd, h) }} /> : null}
      {iris ? <IrisRim R={iris.R} rot={iris.rot} u={iris.u} /> : null}
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
