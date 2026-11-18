// The night look of the courtyard: palette, moonlight, lamp and character-card settings in one place.
// Tune the scene's mood here; the other files only read these values.
import * as THREE from "three";
import { TONE, CHAR } from "../../render/shade";
import { CARD_K } from "../../render/cardshade";

/** brand palette, Concept A "The Courtyard" (docs/phase-1-plan.md) */
export const PALETTE = {
  nightIndigo: "#0E1430",
  lapis: "#1F3B73",
  limestone: "#D9CBB0",
  lampGold: "#E8B04B",
  dawnRose: "#C98B7A",
} as const;

type C3 = [number, number, number];
export const NIGHT = {
  // sky: on-screen colours (the sky shader pre-inverts the tone map), top -> horizon
  skyTop: PALETTE.nightIndigo, skyHorizon: "#24386a",
  // moon = directional light 0, the only shadow caster: world direction it comes FROM (not normalised)
  moonFrom: [-4.5, 7.5, 6.5] as C3,
  // world two-tone (render/shade.ts TONE): linear RGB multipliers
  lit: [0.26, 0.28, 0.42] as C3, shade: [0.075, 0.085, 0.19] as C3, lift: [0.01, 0.014, 0.04] as C3,
  lambert: 0.35, sideK: 0.8, term: 0.2, sat: 0.9, pointK: 1,
  // lamp: a warm point light for the glow on the stone around it, plus a wide downward spot light that paints the
  // pool of light on the floor and casts soft shadows (the Traveller's included). Candela; falls off with distance^2.
  lampCol: PALETTE.lampGold, lampI: 2.5, glass: [6.0, 3.4, 1.1] as C3,
  poolI: 44, poolTarget: [1.2, 0, -2.4] as C3, poolAngle: 0.75, poolPenumbra: 1,
  // wall stone tint: warms the limestone so it reads as #D9CBB0 cooled by moonlight, not cold grey
  wallTint: "#ffdcae",
  // floor tint: a little darker than the wall, so the lamp pool reads against the moonlit floor
  floorTint: "#a29c93",
  // character cards (render/cardshade.ts CHAR / CARD_K): cool moon tint, darker overall so he sits in the night
  charTint: [0.7, 0.76, 1.0] as C3, charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.85, 0.86, 0.98] as C3,
  cardGain: 0.62, cardPointK: 1,
  // contact shadow under the feet (multiply colour)
  blob: "#3a3a5a",
};

/** push the night preset into the shared shader uniforms (cheap: call once per frame) */
export const applyLook = () => {
  const L = NIGHT;
  TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
  TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
  TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = L.sat; TONE.uPointK.value = L.pointK;
  CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
  CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
  CARD_K.uGain.value = L.cardGain; CARD_K.uCardPointK.value = L.cardPointK;
};

export const moonDir = () => new THREE.Vector3(...NIGHT.moonFrom).normalize();
