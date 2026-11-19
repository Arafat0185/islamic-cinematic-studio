// A story film: several sets (bedroom, street, office, gym, courtyard) and one Traveller, everything a pure function of
// the frame. The player (StoryPlayer.tsx) builds every set once and shows only the one the frame is in.
import type React from "react";
import type { Cam, V3 } from "../camera/ease";
import type { Pen } from "../draw/toon";
import type { Accent } from "../film/film";

export type SetId = "courtyard" | "bedroom" | "street" | "office" | "gym" | "feed" | "void" | "deadlines" | "airport" | "car" | "sofa";
/** world offset of each set (local coordinates + offset = world) */
export const SET_OFFSET: Record<SetId, V3> = {
  courtyard: [0, 0, 0], bedroom: [200, 0, 0], street: [400, 0, 0], office: [600, 0, 0], gym: [800, 0, 0],
  feed: [1000, 0, 0], void: [1200, 0, 0], deadlines: [1400, 0, 0], airport: [1600, 0, 0], car: [1800, 0, 0], sofa: [2000, 0, 0],
};

/** the Traveller this frame (world position of his soles / the card's pivot), or null when he is off screen */
/** yaw: a fixed facing (radians; default: turned toward the camera) - e.g. parallel to the bed he sits on */
export type TravellerCard = { pos: V3; key: string; draw: (p: Pen) => void; mirror?: boolean; roll?: number; blob?: string | null; wide?: boolean; yaw?: number };
export type Plan = { cam: Cam; focus: V3; cInf: number; nearScale: number; anchor?: V3 };

/** what one view shows at one frame */
export type Frame = {
  set: SetId; state: string; t: number;           // set, its state, and time (s) for its animations
  plan: Plan;
  traveller: TravellerCard | null;
  /** the courtyard's own effects: light levels, the tile glow and the star mark of the ending */
  courtyard?: { levels: { main: number; lanterns: number; night: number }; grooves?: [number, number, number, number, number]; mark?: [number, number, number, number, number]; swirl?: number; rays?: boolean };
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
  /** per-frame picture effects (optional): motion blur (px), chromatic aberration (px), glitch (0..1), a zoom-through
   *  (scale about a screen point, with blur), a white flash (0..1), vignette (0..1), film grain on/off */
  fxAt?: (f: number) => FrameFx;
  /** the 2D layer (tracker, labels, captions, cards) */
  Overlay: React.FC;
  audio?: string;
  /** the sets this film uses (only these are built; default: the original five) */
  sets?: SetId[];
  /** the shatter: the rendered frame breaks into pieces that fly at the lens (see StoryPlayer) */
  shatterAt?: (f: number) => Shatter | null;
};

/** crack: 0..1 the cracks spreading from (x, y) over the frame; fly: 0..1 the pieces flying toward the lens and past
 *  the frame's edges; black: 0..1 the dark behind the pieces */
export type Shatter = { crack: number; fly: number; black: number; x: number; y: number };

export type FrameFx = {
  blurX: number; blurY: number; ca: number; glitch: number; flash: number; vignette: number; grain: boolean;
  zoom?: { scale: number; x: number; y: number; blur: number };
};
