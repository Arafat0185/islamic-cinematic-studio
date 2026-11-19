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
import { LensBlur } from "../render/lensblur";
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
import { SET_OFFSET, SetId, StoryFilm } from "./story";

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
  const levels = new Levels(court.root, MAIN, { mist: court.mist.group, dust: court.dust.points });
  const bedroom = buildBedroom(SET_OFFSET.bedroom);
  const street = buildStreet(SET_OFFSET.street); street.setTraffic(traffic);
  const office = buildOffice(SET_OFFSET.office);
  const gym = buildGym(SET_OFFSET.gym);
  root.add(court.root, bedroom.root, street.set.root, office.set.root, gym.root);
  const cast = new Cast(); root.add(cast.root);
  const roots: Record<SetId, THREE.Object3D> = { courtyard: court.root, bedroom: bedroom.root, street: street.set.root, office: office.set.root, gym: gym.root };
  return { root, roots, court, fx, levels, bedroom, street, office, gym, cast };
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
    </EffectComposer>
  ), [post, on]);
  useMemo(() => { if (on.camReport && !outgoing) cameraReport(film, w); }, [on, outgoing, film, w]);

  const fr = film.frameAt(f, !!outgoing);
  for (const [id, r] of Object.entries(w.roots)) r.visible = id === fr.set;
  // ---- the set's light ----
  let look: SetLook;
  if (fr.set === "courtyard") {
    const c = fr.courtyard ?? { levels: { main: 1, lanterns: 1, night: 1 } };
    w.fx.grooves(...(c.grooves ?? [0, 0, 0, 0, 0.4]));
    w.fx.mark(...(c.mark ?? [0, 0, 1, 0, 0]));
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

  // ---- camera, checked against the set's geometry ----
  const pl = fr.plan;
  const checked = safeCam(w.roots[fr.set], pl.anchor ? { ...pl.cam, look: pl.anchor } : pl.cam);
  if (checked.moved > 0.001) console.warn(`camera collision: frame ${f} moved ${checked.moved.toFixed(2)} m`);
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, { ...pl.cam, pos: checked.cam.pos });

  // ---- the Traveller ----
  const tr = fr.traveller;
  w.cast.pose(cam, tr ? [{ key: tr.key, x: tr.pos[0], y: tr.pos[1], z: tr.pos[2], draw: tr.draw, mirror: tr.mirror, roll: tr.roll, blob: tr.blob === undefined ? NIGHT.blob : tr.blob, castShadow: true }] : []);
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

export const StoryPlayer: React.FC<{ film: StoryFilm; traffic?: Vehicle[] }> = ({ film, traffic = [] }) => {
  const f = useCurrentFrame(), { width: wd, height: h } = useVideoConfig();
  const whip = film.whips.map((w) => whipAt(f, w.from, w.len)).find((x) => x) ?? null;
  const ir = film.irises.find((r) => f >= r.from && f < r.from + r.len);
  const iris = ir ? irisAt(f, ir.from, ir.len, wd, h) : null;
  const acc = film.accentAt(f);
  const O = film.Overlay;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {film.audio ? <Audio src={staticFile(film.audio)} /> : null}
      {whip ? <WhipBlurDefs px={whip.blur} /> : null}
      <View film={film} traffic={traffic} style={whip ? { filter: "url(#whipBlur)" } : undefined} />
      {ir && iris ? <View film={film} outgoing traffic={traffic} style={{ clipPath: irisClip(iris.R, iris.rot, wd, h) }} /> : null}
      {iris ? <IrisRim R={iris.R} rot={iris.rot} u={iris.u} /> : null}
      {acc.flash > 0 ? (
        <AbsoluteFill style={{
          pointerEvents: "none", mixBlendMode: "screen", opacity: acc.flash * (acc.warm ? 0.32 : 0.22),
          background: acc.warm ? "radial-gradient(circle at 50% 45%, rgba(255,214,150,1), rgba(232,176,75,0.35) 45%, rgba(0,0,0,0) 75%)"
            : "radial-gradient(circle at 50% 50%, rgba(255,140,120,1), rgba(200,80,70,0.3) 50%, rgba(0,0,0,0) 80%)",
        }} />
      ) : null}
      <O />
    </AbsoluteFill>
  );
};
