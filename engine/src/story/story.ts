// A story film: several sets (bedroom, street, office, gym, courtyard) and one Traveller, everything a pure function of
// the frame. The player (StoryPlayer.tsx) builds every set once and shows only the one the frame is in.
import type React from "react";
import type * as THREE from "three";
import type { Cam, V3 } from "../camera/ease";
import type { Pen } from "../draw/toon";
import type { Accent } from "../film/film";

export type SetId = "city" | "lesson" | "courtyard" | "bedroom" | "street" | "office" | "gym" | "feed" | "void" | "deadlines" | "airport" | "car" | "sofa" | "hospital" | "cemetery" | "abyss" | "library" | "bookworlds" | "nature";
/** world offset of each set (local coordinates + offset = world) */
export const SET_OFFSET: Record<SetId, V3> = {
  courtyard: [0, 0, 0], bedroom: [200, 0, 0], street: [400, 0, 0], office: [600, 0, 0], gym: [800, 0, 0],
  feed: [1000, 0, 0], void: [1200, 0, 0], deadlines: [1400, 0, 0], airport: [1600, 0, 0], car: [1800, 0, 0], sofa: [2000, 0, 0],
  hospital: [2200, 0, 0], cemetery: [2400, 0, 0], abyss: [0, 0, 6000], library: [0, 0, -6000], bookworlds: [0, 0, 12000], nature: [0, 0, 18000], lesson: [0, 0, 24000], city: [0, 0, 30000],
};

/** the Traveller this frame (world position of his soles / the card's pivot), or null when he is off screen */
/** yaw: a fixed facing (radians; default: turned toward the camera) - e.g. parallel to the bed he sits on */
export type TravellerCard = { pos: V3; key: string; draw: (p: Pen) => void; mirror?: boolean; roll?: number; blob?: string | null; wide?: boolean; yaw?: number; scale?: number; castShadow?: boolean };
export type Plan = { cam: Cam; focus: V3; cInf: number; nearScale: number; anchor?: V3 };

/** what one view shows at one frame */
export type Frame = {
  set: SetId; state: string; t: number;           // set, its state, and time (s) for its animations
  plan: Plan;
  traveller: TravellerCard | null;
  /** other characters on screen this frame (friends, family, worshippers, passers-by, a cat) */
  others?: TravellerCard[];
  /** the courtyard's own effects: light levels, the tile glow and the star mark of the ending */
  courtyard?: { levels: { main: number; lanterns: number; night: number }; grooves?: [number, number, number, number, number]; mark?: [number, number, number, number, number]; swirl?: number; rays?: boolean };
  /** extra per-frame control of a set (e.g. the street's sun following him, a screen banner) */
  hooks?: Partial<Record<"streetX" | "officeBanner" | "graveFill", unknown>>;
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
  /** video 007: the black & gold grade (everything grey but gold; FrameFx.mono sets it per frame) and heavier grain */
  mono?: boolean;
  grainAmount?: number;
  /** the shatter: the rendered frame breaks into pieces that fly at the lens (see StoryPlayer) */
  shatterAt?: (f: number) => Shatter | null;
  /** extra background life for this film only (built once per view into the set roots; update runs every frame after
   *  the set's own light, before the camera). Things it adds should sit on the NOINK layer so collision ignores them. */
  life?: (roots: Partial<Record<SetId, THREE.Object3D>>) => { update: (fr: Frame, f: number) => void };
};

/** crack: 0..1 the cracks spreading from (x, y) over the frame; fly: 0..1 the pieces flying toward the lens and past
 *  the frame's edges; black: 0..1 the dark behind the pieces */
export type Shatter = { crack: number; fly: number; black: number; x: number; y: number };

export type FrameFx = {
  blurX: number; blurY: number; ca: number; glitch: number; flash: number; vignette: number; grain: boolean;
  zoom?: { scale: number; x: number; y: number; blur: number };
  /** extra CSS filters on the 3D picture (a film's colour grade, e.g. "saturate(0.45) brightness(0.9)") */
  css?: string;
  /** heat haze: the picture shimmers (turbulence displacement, px) */
  haze?: number;
  /** a CSS clip-path for the 3D picture (e.g. the page of a book the camera is pushing into); the overlay frames it */
  clip?: string;
  /** with film.mono: how grey everything but gold is (0..1, default 1), gold's kept saturation, the black crush */
  mono?: number; goldKeep?: number; crush?: number;
};
