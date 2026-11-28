// Video 007, "The Lesson" (Black & Gold Noir): a young man's talk about what he learned on his sickbed (a TikTok sound
// added in TikTok, 0 .. speechEnd; NOT in our file) over a near-monochrome film whose only colour is gold.
// Picture: timeline.ts, life.ts, fx3d.ts, Overlay.tsx; sets: hospital (the anchor) + lesson (dunes, corridor, entrance);
// timing: videos/007-the-lesson/timing.json; sound: public/audio/lesson_mix.wav (tools/mix_lesson.py: sound design only).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, audio: "audio/lesson_mix.wav",
  sets: ["hospital", "lesson"], life: buildLife, mono: true, grainAmount: 0.05 };
export { FRAMES as LESSON_FRAMES, FPS as LESSON_FPS };
export const Lesson: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const LessonSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} /></Freeze>;
};
