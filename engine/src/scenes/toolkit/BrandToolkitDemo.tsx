// BrandToolkitDemo: every brand piece in the rich courtyard with the Traveller, 25 s (timeline in timeline.ts).
// Text comes ONLY from content.ts (verbatim from the video 001 script and references.yaml on main).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback, NOINK } from "../../render/ink";
import { LensBlur } from "../../render/lensblur";
import { GradeEffect, GRADE_NIGHT } from "../../render/grade";
import { light2D } from "../../render/card";
import { applyCam } from "../../camera/ease";
import { traveller } from "../../characters/traveller";
import { applyLook, NIGHT } from "../courtyard-test/look";
import { WALL_Z } from "../courtyard-test/courtyard";
import { buildBeautyWorld, LOOK, MAIN, MOON_FROM } from "../courtyard-beauty/world";
import { FloorFx } from "../../brand/floorFx";
import { Levels } from "../../brand/levels";
import { openingAt, endingAt } from "../../brand/sequences";
import { Mercy } from "../../brand/mercy";
import { StarWipe } from "../../brand/StarWipe";
import { Captions, Phrase } from "../../text/Captions";
import { ArabicLine } from "../../text/ArabicLine";
import { SourceTag } from "../../text/SourceTag";
import { SourcesCard } from "../../text/SourcesCard";
import { FPS, T, TRAVELLER_AT, MARK_CENTRE, MERCY_CENTRE, shotAt } from "./timeline";
import { NARRATION, HADITH, ARABIC_DEMO, REVIEW_NOTE } from "./content";

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
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();
const GROOVE_FROM: [number, number] = [MAIN, WALL_Z + 0.5]; // the floor beneath the main lamp

const Inner: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const world = useMemo(() => {
    const w = buildBeautyWorld();
    const fx = new FloorFx(0.5, 0, 30);
    w.root.add(fx.mesh);
    const mercy = new Mercy(fx, { centre: MERCY_CENTRE, from: T.mercy[0], to: T.mercy[1], firstFill: 566, lastFill: 618, keepClear: [[TRAVELLER_AT[0], TRAVELLER_AT[2], 0.5]] });
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

  // ---- this frame: camera, light levels and floor effects from the timeline ----
  let shot = shotAt(f);
  let lv = { main: 1, lanterns: 1, night: 1 };
  world.fx.grooves(0, 0, 0, 0); world.fx.mark(0, 0, 1, 0, 0);
  if (f < T.open[1]) {
    const o = openingAt(t);
    lv = { main: o.main, lanterns: o.lanterns, night: o.night };
    world.fx.grooves(GROOVE_FROM[0], GROOVE_FROM[1], o.grooveRadius, o.grooveIntensity);
  }
  world.mercy.update(f);
  if (f >= T.end[0]) {
    const e = endingAt((f - T.end[0]) / (90), shotAt(T.end[0] - 1).cam, MARK_CENTRE);
    shot = { cam: e.cam, cInf: 2 };
    lv = { main: e.main, lanterns: e.lanterns, night: e.night };
    world.fx.grooves(MARK_CENTRE[0], MARK_CENTRE[2], e.grooveRadius, e.grooveIntensity, 0.15);
    world.fx.mark(MARK_CENTRE[0], MARK_CENTRE[2], 1.9, e.markProgress, e.markIntensity);
  }
  applyLook({ ...LOOK, ...world.levels.set(lv, LOOK) });

  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, shot.cam);
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const light = light2D(new THREE.Vector3(...MOON_FROM).normalize(), right);
  const [x, y, z] = TRAVELLER_AT;
  world.cast.pose(cam, [{
    key: `toolkit-front|${light.toFixed(3)}`, x, y, z, blob: NIGHT.blob, castShadow: true,
    draw: (p) => traveller(p, { mode: "stand", light, seed: 1 }),
  }]);
  world.dust.update(t); world.mist.update(t);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.set(x, 1.3, z);
  post.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  post.lens.cInf = shot.cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {chain}
    </>
  );
};

// ---- the text and transitions (2D, on top) ----
const PHRASES: Phrase[] = [
  { ...NARRATION.hook2, from: 72, to: 176 },
  { ...NARRATION.hadithIntro, from: 192, to: 270 },
  { text: HADITH.parts[0], keys: HADITH.keys, from: 276, to: 362 },
  { text: HADITH.parts[1], keys: HADITH.keys, from: 362, to: 450 },
  { ...NARRATION.weight2, from: 462, to: 538 },
  { ...NARRATION.mercy1, from: 556, to: 632 },
  { ...NARRATION.turn2, from: 640, to: 700 },
];

export const BrandToolkitDemo: React.FC = () => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 50, near: 0.1, far: 500 }}>
        <Inner />
      </ThreeCanvas>
      <ArabicLine words={ARABIC_DEMO} from={276} to={450} />
      <Captions phrases={PHRASES} />
      <SourceTag text={HADITH.tag} from={290} to={450} />
      <StarWipe from={T.wipe1} />
      <StarWipe from={T.wipe2} />
      <SourcesCard sources={[HADITH.card]} note={REVIEW_NOTE} from={698} to={750} />
    </AbsoluteFill>
  );
};
