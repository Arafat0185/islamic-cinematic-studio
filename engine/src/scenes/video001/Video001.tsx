// Video 001 · The First Question (draft): the film is in timeline.ts, played by the shared courtyard film player.
// Sound: public/audio/video001_mix.wav (tools/mix.py: voice, night ambience, water drops, ducked, -14 LUFS).
import React from "react";
import { CourtyardFilm } from "../../film/CourtyardFilm";
import { VIDEO001 } from "./timeline";

export { FRAMES as VIDEO001_FRAMES, FPS as VIDEO001_FPS } from "./timeline";

export const Video001: React.FC = () => <CourtyardFilm film={VIDEO001} />;
