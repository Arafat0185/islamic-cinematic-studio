// A story film: several sets (bedroom, street, office, gym, courtyard) and one Traveller, everything a pure function of
// the frame. The player (StoryPlayer.tsx) builds every set once and shows only the one the frame is in.
import type React from "react";
import type { Cam, V3 } from "../camera/ease";
import type { Pen } from "../draw/toon";
import type { Accent } from "../film/film";

export type SetId = "courtyard" | "bedroom" | "street" | "office" | "gym";
/** world offset of each set (local coordinates + offset = world) */
export const SET_OFFSET: Record<SetId, V3> = {
  courtyard: [0, 0, 0], bedroom: [200, 0, 0], street: [400, 0, 0], office: [600, 0, 0], gym: [800, 0, 0],
};

/** the Traveller this frame (world position of his soles / the card's pivot), or null when he is off screen */
export type TravellerCard = { pos: V3; key: string; draw: (p: Pen) => void; mirror?: boolean; roll?: number; blob?: string | null };
export type Plan = { cam: Cam; focus: V3; cInf: number; nearScale: number; anchor?: V3 };

/** what one view shows at one frame */
export type Frame = {
  set: SetId; state: string; t: number;           // set, its state, and time (s) for its animations
  plan: Plan;
  traveller: TravellerCard | null;
  /** the courtyard's own effects: light levels, the tile glow and the star mark of the ending */
  courtyard?: { levels: { main: number; lanterns: number; night: number }; grooves?: [number, number, number, number, number]; mark?: [number, number, number, number, number] };
  /** extra per-frame control of a set (e.g. the street's sun following him, a screen banner) */
  hooks?: Partial<Record<"streetX" | "officeBanner", unknown>>;
};

export type StoryFilm = {
  frames: number;
  fps: number;
  /** outgoing = the outgoing shot of a running star iris (drawn on top, outside the opening star) */
  frameAt: (f: number, outgoing?: boolean) => Frame;
  irises: { from: number; len: number }[];
  whips: { from: number; len: number }[];
  accentAt: (f: number) => Accent;
  /** the 2D layer (tracker, labels, captions, cards) */
  Overlay: React.FC;
  audio?: string;
};
