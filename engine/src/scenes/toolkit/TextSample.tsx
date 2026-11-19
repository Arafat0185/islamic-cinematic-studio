// Quick stills for checking the text components on a plain night background (no 3D scene). The caption variant shows
// the 62-70 % caption band as faint guide lines. All text comes from content.ts.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "../../text/Captions";
import { ArabicLine } from "../../text/ArabicLine";
import { SourceTag } from "../../text/SourceTag";
import { SourcesCard } from "../../text/SourcesCard";
import { NARRATION, HADITH, ARABIC_DEMO, REVIEW_NOTE } from "./content";

export type TextSampleProps = { variant: "captions" | "quote" | "card" };

export const TextSample: React.FC<TextSampleProps> = ({ variant }) => (
  <AbsoluteFill style={{ background: "linear-gradient(#0E1430, #1F3B73)" }}>
    {variant === "captions" && [0.62, 0.7].map((k) => (
      <div key={k} style={{ position: "absolute", left: 0, right: 0, top: `${k * 100}%`, borderTop: "2px dashed rgba(255,255,255,0.18)" }} />
    ))}
    {variant === "captions" && <Captions phrases={[{ ...NARRATION.weight1, from: 0, to: 60 }]} />}
    {variant === "quote" && <>
      <ArabicLine words={ARABIC_DEMO} from={0} to={60} />
      <Captions phrases={[{ text: HADITH.parts[0], keys: HADITH.keys, from: 0, to: 30 }, { text: HADITH.parts[1], keys: HADITH.keys, from: 30, to: 60 }]} />
      <SourceTag text={HADITH.tag} from={0} to={60} />
    </>}
    {variant === "card" && <SourcesCard sources={[HADITH.card]} note={REVIEW_NOTE} from={0} to={60} />}
  </AbsoluteFill>
);
