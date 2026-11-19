// Quick still for checking the text components on a plain night background (no 3D scene). Shows the 62-70 % caption
// band as faint guide lines. Text comes only from content.ts.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "../../text/Captions";
import { NARRATION } from "./content";

export const TextSample: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#0E1430, #1F3B73)" }}>
    {[0.62, 0.7].map((k) => (
      <div key={k} style={{ position: "absolute", left: 0, right: 0, top: `${k * 100}%`, borderTop: "2px dashed rgba(255,255,255,0.18)" }} />
    ))}
    <Captions phrases={[{ ...NARRATION.weight1, from: 0, to: 60 }]} />
  </AbsoluteFill>
);
