// BrandToolkitDemo: every brand piece in the rich courtyard, with a living Traveller, a new camera move on every
// caption beat, kinetic captions with keyword pops, accents on the strongest words, a star iris and a whip pan.
// Played by the shared courtyard film player (film/CourtyardFilm.tsx); the film itself is in timeline.ts.
// Text comes ONLY from content.ts (verbatim from the video 001 script and references.yaml).
import React from "react";
import { CourtyardFilm } from "../../film/CourtyardFilm";
import { TOOLKIT_FILM } from "./timeline";

export { FRAMES as TOOLKIT_FRAMES, FPS as TOOLKIT_FPS } from "./timeline";

export const BrandToolkitDemo: React.FC = () => <CourtyardFilm film={TOOLKIT_FILM} />;
