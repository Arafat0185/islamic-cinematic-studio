// Video 001 draft 2 - "A day of chasing". The story is in timeline.ts and Overlay.tsx (timed by plan.json), played
// by the story player across the bedroom, street, office, gym and courtyard sets.
// Sound: public/audio/video001_d2_mix.wav (tools/mix_d2.py).
import React from "react";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, IRISES, WHIP_LIST, TRAFFIC } from "./timeline";
import { Overlay } from "./Overlay";

const FILM: StoryFilm = {
  frames: FRAMES, fps: FPS, frameAt: (f, outgoing) => shotAt(f, outgoing).frame, irises: IRISES, whips: WHIP_LIST, accentAt,
  Overlay, audio: "audio/video001_d2_mix.wav",
};
export { FRAMES as VIDEO001D2_FRAMES, FPS as VIDEO001D2_FPS };
export const Video001D2: React.FC = () => <StoryPlayer film={FILM} traffic={TRAFFIC} />;
