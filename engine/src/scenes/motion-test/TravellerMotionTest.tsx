// TravellerMotionTest (12 s): the Traveller's poses animated in the night courtyard. He stands, turns, walks to a
// prayer mat by the lamp, turns to face the qibla and raises his hands into takbir. The courtyard, lamp, light and
// post chain are the same as CourtyardTest (that composition is unchanged); the timeline lives in timeline.ts.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../../render/ink";
import { LensBlur } from "../../render/lensblur";
import { GradeEffect, GRADE_NIGHT } from "../../render/grade";
import { Cast, light2D } from "../../render/card";
import { applyCam } from "../../camera/ease";
import { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import { travellerWalkPhase, travellerThreeQuarterFront } from "../../characters/travellerPoses";
import { buildCourtyard, ARCH_X, APEX, WALL_Z } from "../courtyard-test/courtyard";
import { buildLamp } from "../courtyard-test/lamp";
import { applyLook, moonDir, NIGHT, PALETTE } from "../courtyard-test/look";
import { buildMat } from "./mat";
import { FPS, MAT, STRIDE_UNITS, camAt, focusAt, lookAt, posAt, LENS } from "./timeline";

export { FRAMES as MOTION_FRAMES, FPS as MOTION_FPS } from "./timeline";

type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** bloom for emissive sources only, same settings as CourtyardTest */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.6, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const q = (v: number, n = 240) => Math.round(v * n) / n; // quantise drawing parameters for the canvas cache key
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const world = useMemo(() => {
    const root = new THREE.Group();
    root.add(buildCourtyard());
    root.add(buildLamp(ARCH_X[2], APEX, WALL_Z));
    root.add(buildMat(MAT.x, MAT.z, MAT.len, MAT.wid));
    const cast = new Cast();
    root.add(cast.root);
    return { root, cast };
  }, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: LENS.maxCoC, nearScale: LENS.nearScale }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : <></>}
      {on.lens ? <primitive object={fx.lens.pre} dispose={null} /> : <></>}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : <></>}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : <></>}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : <></>}
    </EffectComposer>
  ), [fx, on]);

  // ---- pose this frame ----
  applyLook();
  const cam = camera as THREE.PerspectiveCamera;
  applyCam(cam, camAt(f));
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const [x, y, z] = posAt(t);
  const lk = lookAt(f);
  const mirror = lk.view !== "front" && lk.mirror;
  const light = light2D(moonDir(), right, mirror);
  let key: string, draw: (p: Pen) => void;
  if (lk.view === "front") {
    key = `tr-front|${light.toFixed(3)}`;
    draw = (p) => traveller(p, { mode: "stand", light, seed: 1 });
  } else if (lk.view === "q34") {
    // a left-facing (mirrored) card shows his left side, so the shawl goes over the near shoulder
    key = `tr-q34|${mirror}|${light.toFixed(3)}`;
    draw = (p) => travellerThreeQuarterFront(p, { light, shawlNear: mirror });
  } else {
    const ph = q(lk.phase), k = q(lk.k, 60), r = q(lk.raise, 60), b = q(lk.bob, 4);
    key = `tr-side|${mirror}|${ph}|${k}|${r}|${b}|${light.toFixed(3)}`;
    draw = (p) => travellerWalkPhase(p, ph, k, STRIDE_UNITS, { light, raise: r, bob: b, shawlNear: mirror });
  }
  world.cast.pose(cam, [{ key, x, y, z, draw, mirror, blob: NIGHT.blob, castShadow: true }]);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.set(...focusAt(t));
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = LENS.cInf;

  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

export const TravellerMotionTest: React.FC = () => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={{ background: PALETTE.nightIndigo }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 45, near: 0.1, far: 500 }}>
        <Inner />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
