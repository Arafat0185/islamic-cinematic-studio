// Video 001, "The First Question": the final (upload) version. The story is in timeline.ts and Overlay.tsx, timed by
// final/plan.json (tools/plan_final001.py); played by the story player across its sets, with the shatter and the
// picture effects. Sound: public/audio/final001_mix.wav (tools/mix_final001.py).
import React from "react";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt, shatterAt, IRIS, WHIP_LIST, SETS } from "./timeline";
import { Overlay } from "./Overlay";

const FILM: StoryFilm = {
  frames: FRAMES, fps: FPS, frameAt: (f, outgoing) => shotAt(f, outgoing).frame, irises: [IRIS], whips: WHIP_LIST, accentAt, fxAt, shatterAt,
  Overlay, audio: "audio/final001_mix.wav", sets: SETS,
};
export { FRAMES as FINAL001_FRAMES, FPS as FINAL001_FPS };
export const Final001: React.FC = () => <StoryPlayer film={FILM} />;
