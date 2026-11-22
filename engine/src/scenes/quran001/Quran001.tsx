// Video 001, "The First Question - QURAN": the recitation version (Maryam 19:59-63, Sheikh Yasser Al-Dossari, added
// in TikTok; the video ends in the breath before 19:64). Captions and story in timeline.ts and Overlay.tsx, timed by quran/timing.json and quran/shots.json.
// Sound (pops, whooshes, ambience; no voice, no music): public/audio/quran001_mix.wav (tools/mix_quran001.py).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt, IRISES, SETS } from "./timeline";
import { Overlay } from "./Overlay";
import { buildLife } from "./life";

const FILM: StoryFilm = {
  frames: FRAMES, fps: FPS, frameAt: (f, outgoing) => shotAt(f, outgoing).frame, irises: IRISES, whips: [], accentAt, fxAt,
  Overlay, audio: "audio/quran001_mix.wav", sets: SETS, life: buildLife,
};
export { FRAMES as QURAN001_FRAMES, FPS as QURAN001_FPS };
export const Quran001: React.FC = () => <StoryPlayer film={FILM} />;

/** preview only: frame i of this composition shows frame samples[i] of the video (pass {"samples":[...]}), so a whole
 *  contact sheet renders in one process:
 *  npx remotion render src/index.ts TheFirstQuestionQuranSamples out/x --sequence --frames=0-<n-1> --props='{"samples":[...]}' */
export const QURAN001_SAMPLE_DEFAULT = [0, 60, 120];
export const Quran001Samples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? QURAN001_SAMPLE_DEFAULT;
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} /></Freeze>;
};
