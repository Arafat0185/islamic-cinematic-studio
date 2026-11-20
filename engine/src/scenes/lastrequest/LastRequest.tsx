// Video 002, "The Last Request": the voice clip (added in TikTok, 0 .. voiceEnd) and Sheikh Yasser Al-Dossari's
// recitation of Al-Mu'minun 23:99-101 (in our file) over a cold, slow story; no music. Picture: timeline.ts, life.ts,
// Overlay.tsx; timing: videos/002-the-last-request/timing.json; sound: public/audio/lastrequest_mix.wav
// (tools/mix_lastrequest.py: the recitation + rain, thunder, a clock, wind).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt, SETS } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, audio: "audio/lastrequest_mix.wav", sets: SETS, life: buildLife };
export { FRAMES as LASTREQUEST_FRAMES, FPS as LASTREQUEST_FPS };
export const LastRequest: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const LastRequestSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} /></Freeze>;
};
