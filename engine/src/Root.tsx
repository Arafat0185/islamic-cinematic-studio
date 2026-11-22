// The list of videos ("compositions") this project can render.
import React from "react";
import { Composition } from "remotion";
import { CourtyardTest, COURTYARD_FRAMES, COURTYARD_FPS } from "./scenes/courtyard-test/CourtyardTest";
import { PoseSheet, POSE_SHEET_W, POSE_SHEET_H } from "./scenes/pose-sheet/PoseSheet";
import { CastSheet, CAST_SHEET_W, CAST_SHEET_H } from "./scenes/pose-sheet/CastSheet";
import { LastRequest, LastRequestSamples, LASTREQUEST_FRAMES, LASTREQUEST_FPS } from "./scenes/lastrequest/LastRequest";
import { TravellerMotionTest, MOTION_FRAMES, MOTION_FPS } from "./scenes/motion-test/TravellerMotionTest";
import { CourtyardBeauty } from "./scenes/courtyard-beauty/CourtyardBeauty";
import { TextSample } from "./scenes/toolkit/TextSample";
import { BrandToolkitDemo, TOOLKIT_FRAMES, TOOLKIT_FPS } from "./scenes/toolkit/BrandToolkitDemo";
import { Video001, VIDEO001_FRAMES, VIDEO001_FPS } from "./scenes/video001/Video001";
import { Video001D2, VIDEO001D2_FRAMES, VIDEO001D2_FPS } from "./scenes/video001d2/Video001D2";
import { Video001D3, VIDEO001D3_FRAMES, VIDEO001D3_FPS } from "./scenes/video001d3/Video001D3";
import { Final001, FINAL001_FRAMES, FINAL001_FPS } from "./scenes/final001/Final001";
import { Quran001, Quran001Samples, QURAN001_FRAMES, QURAN001_FPS } from "./scenes/quran001/Quran001";

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
    {/* Video 001 draft 3: recitation slot, the day with varied transitions and effects, the faster courtyard (with sound) */}
    <Composition id="Video001D3" component={Video001D3} durationInFrames={VIDEO001D3_FRAMES} fps={VIDEO001D3_FPS} width={1080} height={1920} />
    <Composition id="TheFirstQuestionFinal" component={Final001} durationInFrames={FINAL001_FRAMES} fps={FINAL001_FPS} width={1080} height={1920} />
    {/* Video 001, Quran version: captions of the recitation of Maryam 19:59-63 over the Traveller's story (the recitation is added in TikTok) */}
    {/* Video 002 "The Last Request": the voice clip (added in TikTok) + Al-Mu'minun 23:99-101 recited (in our file) */}
    <Composition id="TheLastRequest" component={LastRequest} durationInFrames={LASTREQUEST_FRAMES} fps={LASTREQUEST_FPS} width={1080} height={1920} />
    <Composition id="TheLastRequestSamples" component={LastRequestSamples} durationInFrames={LASTREQUEST_FRAMES} fps={LASTREQUEST_FPS} width={1080} height={1920} />
    <Composition id="TheFirstQuestionQuran" component={Quran001} durationInFrames={QURAN001_FRAMES} fps={QURAN001_FPS} width={1080} height={1920} />
    {/* preview only: chosen frames of the Quran version, one per output frame (props {"samples": [frame, ...]}); as long as
        the video (Remotion clamps the frame to the composition's length), render it with --frames=0-<n-1> */}
    <Composition id="TheFirstQuestionQuranSamples" component={Quran001Samples} durationInFrames={QURAN001_FRAMES} fps={QURAN001_FPS} width={1080} height={1920} />
    {/* Video 001 draft 2 - "A day of chasing": the story version across five sets (with sound) */}
    <Composition id="Video001D2" component={Video001D2} durationInFrames={VIDEO001D2_FRAMES} fps={VIDEO001D2_FPS} width={1080} height={1920} />
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
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={CAST_SHEET_W} height={CAST_SHEET_H} />
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
