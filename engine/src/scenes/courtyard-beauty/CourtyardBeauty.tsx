// CourtyardBeauty: the rich, cinematic version of the night courtyard, for still "beauty" shots (props.shot =
// wide | low | close). Seven arches with a row of hanging lanterns (some lit) and the main lamp, a foreground arch,
// dome and minaret against a large soft moon and dense stars, an octagonal fountain with mirror-still water, potted
// palms, a tile band, an empty calligraphy panel, dust in the lamp light and low mist. Cool moonlight from high
// above, warm lamps. The Traveller stands on the prayer mat under the main lamp. The test scenes are unchanged.
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
import { Cast, light2D } from "../../render/card";
import { applyCam } from "../../camera/ease";
import { traveller } from "../../characters/traveller";
import { buildCourtyard, WALL_Z, APEX } from "../courtyard-test/courtyard";
import { buildLamp } from "../courtyard-test/lamp";
import { applyLook, NIGHT, PALETTE } from "../courtyard-test/look";
import { buildMat } from "../motion-test/mat";
import { MAT } from "../motion-test/timeline";
import { foregroundArch, skyline, moonDisc, fountain, palm, shrub, tileBand, panel, Dust, Mist } from "./set";
import { SHOTS, ShotName, TRAVELLER_AT } from "./shots";

const ARCHES = [-5.55, -3.7, -1.85, 0, 1.85, 3.7, 5.55];
const MAIN = 1.85;                                   // the main lamp hangs in this arch
const LIT = new Set([-3.7, 0, 5.55]);                // the other lanterns: only some are lit
const MOON_FROM: [number, number, number] = [-2, 10, 2.5]; // moonlight from high above (slightly in front)
const MOON_SEEN = new THREE.Vector3(0.03, 0.36, -0.93);     // where the moon disc hangs in the sky (between dome and minaret)
const WALL_FRONT = WALL_Z + 0.25;
// cooler, slightly brighter moonlight than the test scene, so it contrasts with the warm lamps
const LOOK = { lit: [0.16, 0.21, 0.42] as [number, number, number], shade: [0.06, 0.07, 0.16] as [number, number, number] };

export type BeautyProps = { shot: ShotName };
type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.7, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.7 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();

const Inner: React.FC<BeautyProps> = ({ shot }) => {
  const f = useCurrentFrame(), t = f / 30;
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const S = SHOTS[shot];
  const world = useMemo(() => {
    const root = new THREE.Group();
    root.add(buildCourtyard({ archX: ARCHES, moonFrom: MOON_FROM, denseStars: true }));
    root.add(buildLamp(MAIN, APEX, WALL_Z));
    for (const x of ARCHES) if (x !== MAIN) root.add(buildLamp(x, APEX, WALL_Z, { lit: LIT.has(x), pool: false, intensity: 1.6, scale: 0.85 }));
    root.add(skyline(), moonDisc(MOON_SEEN));
    root.add(foregroundArch(0.25, 7.2));
    root.add(fountain(-0.6, 2.2));
    root.add(palm(-3.0, -2.5, 2.5, 1), palm(3.15, -2.45, 2.2, 4), palm(-3.4, 4.6, 2.6, 2));
    root.add(shrub(-2.3, -2.75, 1), shrub(2.6, -2.8, 0.9), shrub(-2.7, 3.3, 1.1));
    root.add(tileBand(WALL_FRONT, 16, ARCHES.map((x): [number, number] => [x - 0.7, x + 0.7])));
    root.add(panel(0, 3.75, WALL_FRONT));
    root.add(buildMat(MAT.x, MAT.z, MAT.len, MAT.wid));
    const dust = new Dust(new THREE.Vector3(MAIN, 2.45, WALL_Z));
    const mist = new Mist(0, 2);
    root.add(dust.points, mist.group);
    const cast = new Cast();
    root.add(cast.root);
    return { root, cast, dust, mist };
  }, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: S.lens.maxCoC, nearScale: S.lens.nearScale }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
  }), [camera, scene, S]);
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

  applyLook(LOOK);
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, S.cam);
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const light = light2D(new THREE.Vector3(...MOON_FROM).normalize(), right);
  const [x, y, z] = TRAVELLER_AT;
  world.cast.pose(cam, [{
    key: `beauty-front|${light.toFixed(3)}`, x, y, z, blob: NIGHT.blob, castShadow: true,
    draw: (p) => traveller(p, { mode: "stand", light, seed: 1 }),
  }]);
  world.dust.update(t); world.mist.update(t);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.set(x, 1.3, z);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = S.lens.cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

export const CourtyardBeauty: React.FC<BeautyProps> = ({ shot }) => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={{ background: PALETTE.nightIndigo }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 50, near: 0.1, far: 500 }}>
        <Inner shot={shot} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
