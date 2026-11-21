// Video 003 "The Sirat": a remake of the template's beats (the bridge over Hell) in our style. The recitation (the
// template's audio) is added in TikTok and only mixed into the PREVIEW file; our file carries the sound effects.
// Picture: timeline.ts, life.ts, art.ts, Overlay.tsx, the abyss set (sets/abyss.ts); timing:
// videos/003-the-sirat/timing.json + shots.json; sound: tools/mix_sirat.py.
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, sets: ["abyss"], life: buildLife };
export { FRAMES as SIRAT_FRAMES, FPS as SIRAT_FPS };
export const Sirat: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const SiratSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={FILM} /></Freeze>;
};
