// The list of videos ("compositions") this project can render.
import React from "react";
import { Composition } from "remotion";
import { CourtyardTest, COURTYARD_FRAMES, COURTYARD_FPS } from "./scenes/courtyard-test/CourtyardTest";

export const RemotionRoot: React.FC = () => (
  <>
    {/* Phase 2 engine test: the Traveller in the night courtyard, 10 s push-in */}
    <Composition
      id="CourtyardTest"
      component={CourtyardTest}
      durationInFrames={COURTYARD_FRAMES}
      fps={COURTYARD_FPS}
      width={1080}
      height={1920}
    />
  </>
);
