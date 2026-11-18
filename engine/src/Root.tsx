// The list of videos ("compositions") this project can render.
import React from "react";
import { Composition } from "remotion";
import { CourtyardTest, COURTYARD_FRAMES, COURTYARD_FPS } from "./scenes/courtyard-test/CourtyardTest";
import { PoseSheet, POSE_SHEET_W, POSE_SHEET_H } from "./scenes/pose-sheet/PoseSheet";

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
