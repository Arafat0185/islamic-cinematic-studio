// Video 008, "The Prison" (teal & orange film): an Arabic narration on the hadith "The world is a prison for the
// believer and a paradise for the disbeliever" (Sahih Muslim 2956), a TikTok sound added in TikTok (NOT in our file),
// over an old Islamic city (sets/city.ts). Picture: timeline.ts, life.ts, Overlay.tsx; timing:
// videos/008-the-prison/timing.json; sound: public/audio/prison_mix.wav (tools/mix_prison.py: sound design only).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, audio: "audio/prison_mix.wav",
  sets: ["city"], life: buildLife, grainAmount: 0.035 };
export { FRAMES as PRISON_FRAMES, FPS as PRISON_FPS };
export const Prison: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const PrisonSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} /></Freeze>;
};
