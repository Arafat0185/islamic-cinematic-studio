// The list of videos ("compositions") this project can render.
import React from "react";
import { Composition } from "remotion";
import { CourtyardTest, COURTYARD_FRAMES, COURTYARD_FPS } from "./scenes/courtyard-test/CourtyardTest";
import { PoseSheet, POSE_SHEET_W, POSE_SHEET_H } from "./scenes/pose-sheet/PoseSheet";
import { TravellerMotionTest, MOTION_FRAMES, MOTION_FPS } from "./scenes/motion-test/TravellerMotionTest";
import { CourtyardBeauty } from "./scenes/courtyard-beauty/CourtyardBeauty";
import { TextSample } from "./scenes/toolkit/TextSample";

export const RemotionRoot: React.FC = () => (
  <>
    {/* Phase 2 engine test: the Traveller in the night courtyard, 10 s push-in */}
    <Composition
      id="CourtyardTest"
      component={CourtyardTest}
      durationInFrames={COURTYARD_FRAMES}
      fps={COURTYARD_FPS}
      width={1080}
      height={1920}
    />
    {/* 12 s: the Traveller's poses animated in the courtyard (stand, turn, walk to the mat, turn to the qibla, takbir) */}
    <Composition
      id="TravellerMotionTest"
      component={TravellerMotionTest}
      durationInFrames={MOTION_FRAMES}
      fps={MOTION_FPS}
      width={1080}
      height={1920}
    />
    {/* Still: the caption component on a plain background, with the 62-70 % band shown */}
    <Composition id="TextSample" component={TextSample} durationInFrames={60} fps={30} width={1080} height={1920} />
    {/* Still images: the rich courtyard, three beauty shots (wide establishing, low angle by the fountain, close-up) */}
    <Composition id="BeautyWide" component={CourtyardBeauty} defaultProps={{ shot: "wide" as const }} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="BeautyLow" component={CourtyardBeauty} defaultProps={{ shot: "low" as const }} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="BeautyClose" component={CourtyardBeauty} defaultProps={{ shot: "close" as const }} durationInFrames={1} fps={30} width={1080} height={1920} />
    {/* Still image only: every Traveller pose side by side (no 3D scene) */}
    <Composition
      id="PoseSheet"
      component={PoseSheet}
      durationInFrames={1}
      fps={30}
      width={POSE_SHEET_W}
      height={POSE_SHEET_H}
    />
  </>
);
