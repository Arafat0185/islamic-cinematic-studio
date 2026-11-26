// Video 006, "Hold On To This": a sheikh's talk (a TikTok sound added in TikTok, 0 .. speechEnd) and Sheikh Yasser
// Al-Dossari's recitation of Ar-Ra'd 13:28-29 (in our file) over calm nature worlds (sets/nature.ts); no music.
// Picture: timeline.ts, Overlay.tsx; timing: videos/006-hold-on/timing.json; sound: public/audio/hold_mix.wav
// (tools/mix_hold.py: the recitation + wind, water, birds, leaves, steps, the car, the phone).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, audio: "audio/hold_mix.wav", sets: ["nature"] };
export { FRAMES as HOLD_FRAMES, FPS as HOLD_FPS };
export const Hold: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const HoldSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} /></Freeze>;
};
