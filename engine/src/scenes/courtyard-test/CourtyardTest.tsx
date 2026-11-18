// Phase 2 engine test: the Traveller standing in a night courtyard, 10 s, slow push-in.
// Post chain (same order as the original bridge short, see render/*):
//   InkPass (world outlines, own pass) -> lens blur pre + main (depth of field) ->
//   [bloom (lamp glass only) + NEUTRAL tone mapping + night colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the blur so lines soften with what they belong to; bloom after the blur so the glow defocuses with
// its source; the grade is display-referred, so it comes after tone mapping.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../../render/ink";
import { LensBlur, GrainEffect } from "../../render/lensblur";
import { GradeEffect, GRADE_NIGHT } from "../../render/grade";
import { Cast, light2D } from "../../render/card";
import { applyCam } from "../../camera/ease";
import { traveller } from "../../characters/traveller";
import { buildCourtyard, ARCH_X, APEX, WALL_Z } from "./courtyard";
import { buildLamp } from "./lamp";
import { applyLook, moonDir, NIGHT, PALETTE } from "./look";
import { camAt, dofAt, TRAVELLER_AT } from "./shot";

export { FRAMES as COURTYARD_FRAMES, FPS as COURTYARD_FPS } from "./shot";

/** A/B switches for test stills (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default */
type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; grain: boolean; dpr?: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only. Its MIP chain always starts at 540x960 (half of 1080x1920), whatever the output
 *  size, so the glow keeps the same size relative to the frame at every render scale. ADD blend: HDR-safe. */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.6, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const world = useMemo(() => {
    const root = new THREE.Group();
    root.add(buildCourtyard());
    root.add(buildLamp(ARCH_X[2], APEX, WALL_Z));
    const cast = new Cast();
    root.add(cast.root);
    return { root, cast };
  }, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
    grain: new GrainEffect({ amount: 0.02, cellPx: 1.5 }),
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
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : <></>}
    </EffectComposer>
  ), [fx, on]);

  // ---- pose this frame ----
  applyLook();
  const cam = camera as THREE.PerspectiveCamera;
  applyCam(cam, camAt(f));
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const light = light2D(moonDir(), right);
  const [tx, ty, tz] = TRAVELLER_AT;
  world.cast.pose(cam, [{
    key: `traveller|${light.toFixed(3)}`, x: tx, y: ty, z: tz, blob: NIGHT.blob,
    draw: (p) => traveller(p, { mode: "stand", light, seed: 1 }),
  }]);
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the focus point
  const d = dofAt();
  cam.getWorldDirection(fwd);
  fpt.set(...d.focus);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  fx.grain.seed = f; // deterministic per frame

  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

export const CourtyardTest: React.FC = () => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={{ background: PALETTE.nightIndigo }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 50, near: 0.1, far: 500 }}>
        <Inner />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
