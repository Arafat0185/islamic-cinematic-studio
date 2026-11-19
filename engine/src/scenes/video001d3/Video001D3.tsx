// Video 001 draft 3. The story is in timeline.ts and Overlay.tsx (timed by draft3/plan.json), played by the story
// player across the bedroom, street, office, gym and courtyard sets, with its picture effects (fxAt).
// Sound: public/audio/video001_d3_mix.wav (tools/mix_d3.py).
import React from "react";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import { FPS, FRAMES, shotAt, accentAt, fxAt, IRIS, WHIP_LIST, TRAFFIC } from "./timeline";
import { Overlay } from "./Overlay";

const FILM: StoryFilm = {
  frames: FRAMES, fps: FPS, frameAt: (f, outgoing) => shotAt(f, outgoing).frame, irises: [IRIS], whips: WHIP_LIST, accentAt, fxAt,
  Overlay, audio: "audio/video001_d3_mix.wav",
};
export { FRAMES as VIDEO001D3_FRAMES, FPS as VIDEO001D3_FPS };
export const Video001D3: React.FC = () => <StoryPlayer film={FILM} traffic={TRAFFIC} />;
