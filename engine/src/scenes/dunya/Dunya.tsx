// Video 005, "The Dunya": an Arabic voice clip (a TikTok sound added in TikTok, 0 .. speechEnd) and Sheikh Yasser
// Al-Dossari's recitation of Al-Hadid 57:22-23 (in our file) over video 002's rainy scenes, re-shot slower; no music.
// Picture: timeline.ts (reuses scenes/lastrequest), Overlay.tsx; timing: videos/005-the-dunya/timing.json;
// sound: public/audio/dunya_mix.wav (tools/mix_dunya.py: the recitation + rain, rain on glass, thunder, a clock).
import React from "react";
import { Freeze, getInputProps, useCurrentFrame } from "remotion";
import { StoryPlayer } from "../../story/StoryPlayer";
import type { StoryFilm } from "../../story/story";
import type { Vehicle } from "../../sets/street";
import { BUS } from "../lastrequest/timeline";
import { buildLife } from "../lastrequest/life";
import { FPS, FRAMES, SETS, SHOTS, shotAt, srcFrame, accentAt, fxAt } from "./timeline";
import { Overlay } from "./Overlay";

/** 002's room/street/cemetery life, driven by the 002 frame being shown */
const life: StoryFilm["life"] = (roots) => { const inner = buildLife(roots); return { update: (fr, f) => inner.update(fr, Math.round(srcFrame(f))) }; };
const FILM: StoryFilm = { frames: FRAMES, fps: FPS, frameAt: (f) => shotAt(f).frame, irises: [], whips: [], accentAt, fxAt, Overlay, audio: "audio/dunya_mix.wav", sets: SETS, life };
export { FRAMES as DUNYA_FRAMES, FPS as DUNYA_FPS };
// the bus pulls away during "missBus" (this film's clock: the street's traffic runs on the frame time)
const mb = SHOTS.find((s) => s.kind === "missBus")!, busAt = (mb.from + ((2.0 * 30 - mb.sa) / (mb.sb - mb.sa)) * (mb.to - mb.from)) / FPS;
const TRAFFIC: Vehicle[] = [{ kind: "bus", passAt: busAt + (BUS.passAt - 2.0), passX: BUS.passX, speed: BUS.speed, lane: BUS.lane, colour: "#4a5866" }];
export const Dunya: React.FC = () => <StoryPlayer film={FILM} traffic={TRAFFIC} />;
/** preview only: frame i shows frame samples[i] (props {"samples": [...]}); render with --frames=0-<n-1> */
export const DunyaSamples: React.FC<{ samples?: number[] }> = ({ samples }) => {
  const i = useCurrentFrame(), s = samples ?? (getInputProps() as { samples?: number[] }).samples ?? [0];
  return <Freeze frame={s[Math.min(i, s.length - 1)]}><StoryPlayer film={{ ...FILM, audio: undefined }} traffic={TRAFFIC} /></Freeze>;
};
