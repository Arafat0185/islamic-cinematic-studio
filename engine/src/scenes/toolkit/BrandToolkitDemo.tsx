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
import { applyCam, smooth } from "../../camera/ease";
import { safeCam } from "../../camera/collision";
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
import { Captions, Backdrop } from "../../text/Captions";
import { ArabicLine } from "../../text/ArabicLine";
import { SourceTag } from "../../text/SourceTag";
import { SourcesCard } from "../../text/SourcesCard";
import {
  FPS, FRAMES, PHRASES, ARABIC, TAG, CARD, WHIP, MARK_CENTRE, MERCY_CENTRE, P2, STRIDE_UNITS, IRIS, ENDING_TOP,
  irisOut, travellerAt, accentAt, planAt, BEATS, Beat,
} from "./timeline";
import { placeText, bodyBox, CAPTION_BLOCK, QUOTE_BLOCK } from "./layout";
import { HADITH, ARABIC_DEMO, REVIEW_NOTE } from "./content";

export { FRAMES as TOOLKIT_FRAMES, FPS as TOOLKIT_FPS } from "./timeline";

/** camReport: log a frame-by-frame camera check (collision corrections, closest surface, angle down to him) */
type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number; camReport?: boolean };
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

/** check every frame's camera against the scene: collision corrections, the closest surface, and how steeply it looks
 *  down at the Traveller (should stay under ~45 deg). Logged to the console (render a still with --log=verbose). */
const cameraReport = (root: THREE.Object3D) => {
  const rows: string[] = [];
  let worstPitch = 0, minClear = Infinity, moved = 0;
  const check = (f: number, out?: Beat, tag = "") => {
    const pl = planAt(f, out), r = safeCam(root, pl.cam);
    const [x, , z] = travellerAt(f).pos, [cx, cy, cz] = pl.cam.pos;
    const pitch = (Math.atan2(cy - 1.35, Math.hypot(cx - x, cz - z)) * 180) / Math.PI;
    worstPitch = Math.max(worstPitch, pitch); minClear = Math.min(minClear, r.clearance);
    if (r.moved > 0.001) { moved++; rows.push(`frame ${f}${tag}: moved ${r.moved.toFixed(2)} m (occluded at ${r.occluded.toFixed(2)} m, clearance ${r.clearance.toFixed(2)} m)`); }
    if (pitch > 45) rows.push(`frame ${f}${tag}: looks down at him at ${pitch.toFixed(0)} deg`);
  };
  for (let f = 0; f < FRAMES; f++) check(f);
  for (const ir of IRIS) for (let f = ir.from; f < ir.from + ir.len; f++) check(f, irisOut(f)!.beat, " (iris, outgoing)");
  console.log(`CAMERA REPORT: ${FRAMES} frames, ${moved} corrected, closest surface ${minClear === Infinity ? "> margin" : minClear.toFixed(2) + " m"}, steepest look down at him ${worstPitch.toFixed(0)} deg`);
  for (const r of rows.slice(0, 40)) console.log("CAMERA REPORT: " + r);
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

  // ---- camera: the planned move (beat, whip pan, ending, accents, handheld), then the collision check ----
  const plan = planAt(f, outgoing);
  const safe = safeCam(world.root, plan.cam);
  if (safe.moved > 0.001) console.warn(`camera collision: frame ${f} moved ${safe.moved.toFixed(2)} m`);
  const c = safe.cam, focus = plan.focus;
  // ---- light levels and floor effects ----
  let lv = { main: 1, lanterns: 1, night: 1 };
  world.fx.grooves(0, 0, 0, 0); world.fx.mark(0, 0, 1, 0, 0);
  if (f < 66) {
    const o = openingAt(t);
    lv = { main: o.main, lanterns: o.lanterns, night: o.night };
    world.fx.grooves(GROOVE_FROM[0], GROOVE_FROM[1], o.grooveRadius, o.grooveIntensity);
  }
  if (plan.endingU !== null) {
    const e = endingAt(plan.endingU, BEATS.endLow.cam(676), MARK_CENTRE, ENDING_TOP);
    // the glowing star dims as the sources card comes up, so no bright line runs behind its text
    const dim = 1 - 0.85 * smooth((f - CARD.from + 6) / 14);
    lv = { main: e.main, lanterns: e.lanterns, night: e.night };
    world.fx.grooves(MARK_CENTRE[0], MARK_CENTRE[2], e.grooveRadius, e.grooveIntensity * dim, 0.15);
    world.fx.mark(MARK_CENTRE[0], MARK_CENTRE[2], 1.9, e.markProgress, e.markIntensity * dim);
  }
  world.mercy.update(f);
  applyLook({ ...LOOK, ...world.levels.set(lv, LOOK) });
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, c);
  useMemo(() => { if (on.camReport && !outgoing) cameraReport(world.root); }, [on, outgoing, world]);

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
  post.lens.cInf = plan.cInf;
  post.lens.nearScale = plan.nearScale;
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

/** where each piece of text sits (computed once): clear of his head and upper body in every shot */
const useTextLayout = () => useMemo(() => {
  const quote = placeText(ARABIC.from, ARABIC.to, QUOTE_BLOCK);
  const phrases = PHRASES.map((ph) => (ph.from >= ARABIC.from && ph.to <= ARABIC.to ? { ...ph, centreY: quote } : { ...ph, centreY: placeText(ph.from, ph.to, CAPTION_BLOCK) }));
  if (toggles().camReport) {
    console.log(`TEXT LAYOUT: quote group at ${quote.toFixed(2)}, his box ${JSON.stringify(bodyBox(ARABIC.from, ARABIC.to), (_k, v) => (typeof v === "number" ? +v.toFixed(3) : v))}`);
    for (const ph of phrases) console.log(`TEXT LAYOUT: ${ph.from}-${ph.to} at ${ph.centreY?.toFixed(2)} box ${JSON.stringify(bodyBox(ph.from, ph.to), (_k, v) => (typeof v === "number" ? +v.toFixed(3) : v))}`);
  }
  return { phrases, arabicY: quote - 0.085, tagY: quote + 0.115, quoteY: quote };
}, []);

export const BrandToolkitDemo: React.FC = () => {
  const f = useCurrentFrame(), { width: w, height: h } = useVideoConfig();
  const text = useTextLayout();
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
      {f >= ARABIC.from && f < ARABIC.to ? <Backdrop centreY={text.quoteY} half={h * 0.16} strength={0.4}
        opacity={Math.min(1, (f - ARABIC.from) / 8, (ARABIC.to - f) / 6)} /> : null}
      <ArabicLine words={ARABIC_DEMO} from={ARABIC.from} to={ARABIC.to} centreY={text.arabicY} />
      <Captions phrases={text.phrases} backdrop={!(f >= ARABIC.from && f < ARABIC.to)} />
      <SourceTag text={HADITH.tag} from={TAG.from} to={TAG.to} centreY={text.tagY} />
      <SourcesCard sources={[HADITH.card]} note={REVIEW_NOTE} from={CARD.from} to={CARD.to} />
    </AbsoluteFill>
  );
};
