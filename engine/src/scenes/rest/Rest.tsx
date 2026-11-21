// Video 004 "The Man Who Never Rested": the Traveller in a vast library at night, carried into book after book; he never
// rests until the last shot. The narration is a TikTok sound added in TikTok (only mixed into the PREVIEW); our file
// carries the sound design (tools/mix_rest.py). Picture: timeline.ts, life.ts, art.ts, Overlay.tsx; the library and
// book-world sets (sets/library.ts, sets/bookworlds.ts); timing: videos/004-never-rested/timing.json + shots.json.
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, sets: ["library", "bookworlds"], life: buildLife };
export { FRAMES as REST_FRAMES, FPS as REST_FPS };
export const Rest: React.FC = () => <StoryPlayer film={FILM} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const RestSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={FILM} /></Freeze>;
};
