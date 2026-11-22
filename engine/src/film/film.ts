// A "film" in the rich courtyard: everything CourtyardFilm needs to play one video, as pure functions of the frame.
// The toolkit demo and each real video (e.g. video 001) are films; the player is shared (CourtyardFilm.tsx).
import { Cam, V3 } from "../camera/ease";
import type { Phrase } from "../text/Captions";
import type { MercyOpts } from "../brand/mercy";

/** one shot: a camera move, its focus point and lens */
export type Beat = { from: number; to: number; cam: (f: number) => Cam; focus: (f: number) => V3; cInf: number; nearScale?: number };
/** the camera at a frame (before the collision check); endingU = 0..1 through the signature ending, else null;
 *  anchor = the shot's real target, when cam.look is swung away (a whip pan): the collision check uses it */
export type Plan = { cam: Cam; focus: V3; cInf: number; nearScale: number; endingU: number | null; anchor?: V3 };

export type Act =
  | { view: "front"; arms: "down" | "chest"; turn: number; tilt: number }
  | { view: "q34"; mirror: boolean }
  | { view: "back" }
  | { view: "side"; mirror: boolean; phase: number; k: number; raise: number; settle: number };
/** where the Traveller stands, what he does, and his idle (breathing bob, breeze on the shawl) */
export type TravellerState = { pos: V3; act: Act; bob: number; wind: number };
/** strong-word accents: camera punch-in (0..1), tiny shake (0..1), light flash (0..1), warm (gold) or cool flash */
export type Accent = { punch: number; shake: number; flash: number; warm: boolean };

export type Film = {
  frames: number;
  fps: number;
  planAt: (f: number, outgoing?: Beat) => Plan;
  /** the running star iris at frame f (if any) and its outgoing shot */
  irisOut: (f: number) => { iris: { from: number; len: number }; beat: Beat } | null;
  irises: { from: number; len: number }[];
  whips: { from: number; len: number }[];
  travellerAt: (f: number) => TravellerState;
  strideUnits: number;
  accentAt: (f: number) => Accent;
  /** frames < openingTo play the signature opening (darkness, the lamp ignites, light runs along the grooves) */
  openingTo: number;
  /** the signature ending: the camera it starts from, where it rises to, and the star mark */
  ending: { from: Cam; top: Cam; markCentre: V3; markR: number };
  mercy: MercyOpts;
  /** an extra multiplier on the main lamp (e.g. a flicker), 1 = none */
  lampAt?: (f: number) => number;
  text: {
    phrases: Phrase[];
    /** the quoted source: Arabic words (verbatim; may be empty), the caption phrases it covers, and its source tag */
    quote?: { from: number; to: number; arabic: string[]; tag: string; tagFrom: number };
    card: { from: number; to: number; sources: string[]; note: string };
  };
  /** an audio file in public/ (staticFile path), if the film has sound */
  audio?: string;
};
