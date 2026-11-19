// Text placement: captions and the Arabic line must never cover the Traveller's head or upper body. For each text
// unit (a caption, or the hadith group = Arabic line + two caption halves + source tag), project his head and upper
// body (waist to the top of the kufi, a little wider than his shoulders) through the planned camera on every 2nd frame
// the unit is on screen, take the union, and choose the first candidate position whose text block clears it. Blocks
// stay inside the safe area (12 % from the top, 82 % from the top at the bottom: clear of TikTok / Reels / Shorts
// buttons and descriptions). Pure: the same plan always gives the same layout.
import * as THREE from "three";
import { applyCam } from "../../camera/ease";
import { planAt, travellerAt } from "./timeline";

const W = 1080, H = 1920;
const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
const right = new THREE.Vector3(), p = new THREE.Vector3();

/** the screen box (fractions: 0 = top / left) of his head and upper body over frames [from, to) */
export const bodyBox = (from: number, to: number) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let f = from; f < to; f += 2) {
    applyCam(cam, planAt(f).cam);
    cam.updateProjectionMatrix();
    right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
    const [x, , z] = travellerAt(f).pos;
    for (const h of [0.95, 1.2, 1.45, 1.7, 1.9, 2.02]) for (const s of [-0.38, 0, 0.38]) {
      p.set(x, h, z).addScaledVector(right, s).project(cam);
      if (p.z > 1) continue; // behind the camera
      const sx = (p.x + 1) / 2, sy = (1 - p.y) / 2;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
  }
  return { x0, x1, y0, y1 };
};

/** a text block relative to its centre c: [top, bottom] offsets (fractions of the frame height) and its width */
export type Block = { up: number; down: number; x0: number; x1: number };
export const CAPTION_BLOCK: Block = { up: 0.04, down: 0.04, x0: 0.08, x1: 0.92 };
/** the hadith group: Arabic line at c - 0.085, two caption lines at c, the source tag at c + 0.115 */
export const QUOTE_BLOCK: Block = { up: 0.085 + 0.035, down: 0.115 + 0.015, x0: 0.04, x1: 0.96 };
const CANDIDATES = [0.66, 0.72, 0.6, 0.76, 0.36, 0.3, 0.25, 0.2];
const SAFE = { top: 0.12, bottom: 0.82 }, GAP = 0.02;

/** the centre (fraction of the frame height) for a block shown over frames [from, to) */
export const placeText = (from: number, to: number, block: Block) => {
  const b = bodyBox(from, to);
  const xOverlap = b.x1 > block.x0 && b.x0 < block.x1;
  let best = CANDIDATES[0], bestCost = Infinity;
  for (const c of CANDIDATES) {
    const top = c - block.up, bot = c + block.down;
    if (top < SAFE.top || bot > SAFE.bottom) continue;
    const overlap = xOverlap ? Math.max(0, Math.min(bot, b.y1 + GAP) - Math.max(top, b.y0 - GAP)) : 0;
    if (overlap === 0) return c;
    if (overlap < bestCost) { bestCost = overlap; best = c; }
  }
  return best; // nothing fully clears him: the least overlap (the backdrop keeps it readable)
};
