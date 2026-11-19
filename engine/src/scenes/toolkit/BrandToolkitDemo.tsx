// BrandToolkitDemo v2: every brand piece in the rich courtyard, with a living Traveller, a new camera move on every
// caption beat, kinetic captions with keyword pops, accents on the strongest words, a star iris and a whip pan.
// Timeline: timeline.ts. Text comes ONLY from content.ts (verbatim from the video 001 script and references.yaml).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback, NOINK } from "../../render/ink";
import { LensBlur } from "../../render/lensblur";
import { GradeEffect, GRADE_NIGHT } from "../../render/grade";
import { light2D } from "../../render/card";
import { Cam, applyCam } from "../../camera/ease";
import { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import { travellerWalkPhase, travellerThreeQuarterFront } from "../../characters/travellerPoses";
import { applyLook, NIGHT } from "../courtyard-test/look";
import { WALL_Z } from "../courtyard-test/courtyard";
import { buildBeautyWorld, LOOK, MAIN, MOON_FROM } from "../courtyard-beauty/world";
import { FloorFx } from "../../brand/floorFx";
import { Levels } from "../../brand/levels";
import { openingAt, endingAt } from "../../brand/sequences";
import { Mercy } from "../../brand/mercy";
import { irisAt, irisClip, IrisRim, whipAt, WhipBlurDefs } from "../../brand/transitions";
import { Captions } from "../../text/Captions";
import { ArabicLine } from "../../text/ArabicLine";
import { SourceTag } from "../../text/SourceTag";
import { SourcesCard } from "../../text/SourcesCard";
import {
  FPS, PHRASES, ARABIC, TAG, CARD, WHIP, MARK_CENTRE, MERCY_CENTRE, P2, STRIDE_UNITS, ENDING,
  beatAt, irisOut, travellerAt, handheld, accentAt, BEATS, Beat,
} from "./timeline";
import { HADITH, ARABIC_DEMO, REVIEW_NOTE } from "./content";

export { FRAMES as TOOLKIT_FRAMES, FPS as TOOLKIT_FPS } from "./timeline";

type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.7 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const q = (v: number, n: number) => Math.round(v * n) / n;
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();
const GROOVE_FROM: [number, number] = [MAIN, WALL_Z + 0.5];

/** turn a camera's view sideways (whip pan): rotate its look point around the camera by `yaw` radians */
const yawed = (c: Cam, yaw: number): Cam => {
  if (!yaw) return c;
  const dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], cs = Math.cos(yaw), sn = Math.sin(yaw);
  return { ...c, look: [c.pos[0] + dx * cs + dz * sn, c.look[1], c.pos[2] - dx * sn + dz * cs] };
};

/** the 3D world for frame f; `outgoing` = draw the outgoing shot of a running star iris instead of the main one */
const Inner: React.FC<{ outgoing?: Beat }> = ({ outgoing }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const world = useMemo(() => {
    const w = buildBeautyWorld();
    const fx = new FloorFx(0.5, 0, 30);
    w.root.add(fx.mesh);
    const mercy = new Mercy(fx, { centre: MERCY_CENTRE, from: 536, to: 636, firstFill: 566, lastFill: 618, keepClear: [[P2[0], P2[2], 0.5]] });
    w.root.add(mercy.points);
    const levels = new Levels(w.root, MAIN, { mist: w.mist.group, dust: w.dust.points });
    return { ...w, fx, levels, mercy };
  }, []);
  const post = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.6 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
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

  // ---- camera: the beat's move (+ whip pan, strong-word accents, handheld drift) ----
  const beat = outgoing ?? beatAt(f);
  let c = beat.cam(f), focus = beat.focus(f), cInf = beat.cInf;
  const whip = outgoing ? null : whipAt(f, WHIP.from, WHIP.len);
  if (whip) { const b = whip.side === "out" ? BEATS.quote : BEATS.weight; c = yawed(b.cam(f), whip.yaw); focus = b.focus(f); cInf = b.cInf; }
  // ---- light levels and floor effects ----
  let lv = { main: 1, lanterns: 1, night: 1 };
  world.fx.grooves(0, 0, 0, 0); world.fx.mark(0, 0, 1, 0, 0);
  if (f < 66) {
    const o = openingAt(t);
    lv = { main: o.main, lanterns: o.lanterns, night: o.night };
    world.fx.grooves(GROOVE_FROM[0], GROOVE_FROM[1], o.grooveRadius, o.grooveIntensity);
  }
  let hand = 1;
  if (!outgoing && f >= ENDING.from) {
    const e = endingAt((f - ENDING.from) / ENDING.len, BEATS.endLow.cam(ENDING.from), MARK_CENTRE);
    c = e.cam; cInf = 2; focus = [MARK_CENTRE[0], 0, MARK_CENTRE[2]]; hand = 1 - Math.min(1, (f - ENDING.from) / 40);
    lv = { main: e.main, lanterns: e.lanterns, night: e.night };
    world.fx.grooves(MARK_CENTRE[0], MARK_CENTRE[2], e.grooveRadius, e.grooveIntensity, 0.15);
    world.fx.mark(MARK_CENTRE[0], MARK_CENTRE[2], 1.9, e.markProgress, e.markIntensity);
  }
  world.mercy.update(f);
  applyLook({ ...LOOK, ...world.levels.set(lv, LOOK) });
  const acc = accentAt(f), hh = handheld(f, hand);
  const sh = acc.shake * 0.012;
  c = {
    ...c,
    pos: [c.pos[0] + hh.pos[0] + sh * Math.sin(f * 2.7), c.pos[1] + hh.pos[1] + sh * Math.sin(f * 3.9 + 1), c.pos[2] + hh.pos[2]],
    look: [c.look[0] + hh.look[0], c.look[1] + hh.look[1], c.look[2] + hh.look[2]],
    fov: c.fov * (1 - 0.05 * acc.punch),
  };
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, c);

  // ---- the Traveller ----
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const tr = travellerAt(f), a = tr.act;
  const mirror = a.view !== "front" && a.mirror;
  const light = light2D(new THREE.Vector3(...MOON_FROM).normalize(), right, mirror);
  const L = light.toFixed(3), bob = q(tr.bob, 4), wind = q(tr.wind, 20);
  let key: string, draw: (p: Pen) => void;
  if (a.view === "front") {
    key = `v2f|${a.arms}|${q(a.turn, 40)}|${q(a.tilt, 40)}|${bob}|${wind}|${L}`;
    draw = (p) => traveller(p, { mode: "stand", light, seed: 1, arms: a.arms, headTurn: a.turn, headTilt: a.tilt, bob, wind });
  } else if (a.view === "q34") {
    key = `v2q|${a.mirror}|${L}`;
    draw = (p) => travellerThreeQuarterFront(p, { light, shawlNear: a.mirror });
  } else {
    const ph = q(a.phase, 240), k = q(a.k, 60), r = q(a.raise, 60), b = q(a.settle + tr.bob, 4);
    key = `v2s|${a.mirror}|${ph}|${k}|${r}|${b}|${wind}|${L}`;
    draw = (p) => travellerWalkPhase(p, ph, k, STRIDE_UNITS, { light, raise: r, bob: b, wind, shawlNear: a.mirror });
  }
  const [x, y, z] = tr.pos;
  world.cast.pose(cam, [{ key, x, y, z, draw, mirror, blob: NIGHT.blob, castShadow: true }]);
  world.dust.update(t); world.mist.update(t);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.set(...focus);
  post.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  post.lens.cInf = cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {chain}
    </>
  );
};

const View: React.FC<{ outgoing?: Beat; style?: React.CSSProperties }> = ({ outgoing, style }) => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 50, near: 0.1, far: 500 }}>
        <Inner outgoing={outgoing} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const BrandToolkitDemo: React.FC = () => {
  const f = useCurrentFrame(), { width: w, height: h } = useVideoConfig();
  const whip = whipAt(f, WHIP.from, WHIP.len);
  const out = irisOut(f);
  const iris = out ? irisAt(f, out.iris.from, out.iris.len, w, h) : null;
  const acc = accentAt(f);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {whip ? <WhipBlurDefs px={whip.blur} /> : null}
      <View style={whip ? { filter: "url(#whipBlur)" } : undefined} />
      {/* star iris: the outgoing shot on top, everything outside the opening star */}
      {out && iris ? <View outgoing={out.beat} style={{ clipPath: irisClip(iris.R, iris.rot, w, h) }} /> : null}
      {iris ? <IrisRim R={iris.R} rot={iris.rot} u={iris.u} /> : null}
      {/* a brief, soft light flash on the strongest words */}
      {acc.flash > 0 ? (
        <AbsoluteFill style={{
          pointerEvents: "none", mixBlendMode: "screen", opacity: acc.flash * (acc.warm ? 0.32 : 0.22),
          background: acc.warm ? "radial-gradient(circle at 50% 45%, rgba(255,214,150,1), rgba(232,176,75,0.35) 45%, rgba(0,0,0,0) 75%)"
            : "radial-gradient(circle at 50% 50%, rgba(220,226,255,1), rgba(160,170,220,0.3) 50%, rgba(0,0,0,0) 80%)",
        }} />
      ) : null}
      <ArabicLine words={ARABIC_DEMO} from={ARABIC.from} to={ARABIC.to} />
      <Captions phrases={PHRASES} />
      <SourceTag text={HADITH.tag} from={TAG.from} to={TAG.to} />
      <SourcesCard sources={[HADITH.card]} note={REVIEW_NOTE} from={CARD.from} to={CARD.to} />
    </AbsoluteFill>
  );
};
