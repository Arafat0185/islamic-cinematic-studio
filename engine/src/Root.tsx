// The list of videos ("compositions") this project can render.
import React from "react";
import { Composition } from "remotion";
import { CourtyardTest, COURTYARD_FRAMES, COURTYARD_FPS } from "./scenes/courtyard-test/CourtyardTest";
import { PoseSheet, POSE_SHEET_W, POSE_SHEET_H } from "./scenes/pose-sheet/PoseSheet";
import { TravellerMotionTest, MOTION_FRAMES, MOTION_FPS } from "./scenes/motion-test/TravellerMotionTest";
import { CourtyardBeauty } from "./scenes/courtyard-beauty/CourtyardBeauty";
import { TextSample } from "./scenes/toolkit/TextSample";
import { BrandToolkitDemo, TOOLKIT_FRAMES, TOOLKIT_FPS } from "./scenes/toolkit/BrandToolkitDemo";
import { Video001, VIDEO001_FRAMES, VIDEO001_FPS } from "./scenes/video001/Video001";

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
    {/* Video 001 · The First Question: the full draft, timed to the narration (with sound) */}
    <Composition id="Video001" component={Video001} durationInFrames={VIDEO001_FRAMES} fps={VIDEO001_FPS} width={1080} height={1920} />
    {/* 25 s: every brand piece in the rich courtyard with the Traveller (opening, captions, Arabic line, source tag,
        star wipes, mercy effect, ending, sources card) */}
    <Composition id="BrandToolkitDemo" component={BrandToolkitDemo} durationInFrames={TOOLKIT_FRAMES} fps={TOOLKIT_FPS} width={1080} height={1920} />
    {/* Stills: the text components on a plain background (captions with the 62-70 % band, quote, sources card) */}
    <Composition id="TextSampleCaptions" component={TextSample} defaultProps={{ variant: "captions" as const }} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="TextSampleQuote" component={TextSample} defaultProps={{ variant: "quote" as const }} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="TextSampleCard" component={TextSample} defaultProps={{ variant: "card" as const }} durationInFrames={60} fps={30} width={1080} height={1920} />
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
