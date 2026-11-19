// TravellerMotionTest timeline: everything is a pure function of time t (seconds), so any frame renders the same.
//   0-2 s   standing, front view
//   2-3 s   turns to a side view: front -> three-quarter -> side (instant drawing swaps), then a small settle
//   3-8 s   walks across the courtyard to the prayer mat by the lamp (feet planted, no sliding)
//   8-9 s   stops on the mat and turns to face the qibla (side view, facing screen left):
//           side -> 3/4 -> front -> 3/4 -> side, then a small settle
//   9-12 s  raises his hands into takbir and holds
import { Cam, V3, clamp01, glide, smooth } from "../../camera/ease";
import { SU } from "../../render/card";

export const FPS = 30;
export const FRAMES = 12 * FPS;

/** the prayer mat: centre, size (m). Its head (the mihrab arch) points to the qibla, which in this scene is -x
 *  (screen left). He stands at the +x end. */
export const MAT = { x: 0.85, z: -1.6, len: 1.25, wid: 0.7 };
export const QIBLA_SIGN = -1;
const START: V3 = [-1.2, 0, -1.0];
const STAND: V3 = [MAT.x + MAT.len / 2 - 0.24, 0, MAT.z];

// ---- the walk path: a cubic Bezier in the floor plane (x, z). It passes in front of the mat and steps onto its
//      +x end, so he never walks over the place of prostration. ----
const P = [[START[0], START[2]], [0.25, -1.0], [1.05, -1.22], [STAND[0], STAND[2]]];
const bez = (u: number): [number, number] => {
  const s = 1 - u, a = s * s * s, b = 3 * s * s * u, c = 3 * s * u * u, d = u * u * u;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
// arc-length table so the speed along the path is what we ask for
const N = 400, ARC: number[] = [0];
for (let i = 1; i <= N; i++) { const a = bez((i - 1) / N), b = bez(i / N); ARC.push(ARC[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
const D = ARC[N];
const atDist = (d: number) => {
  const t = Math.max(0, Math.min(D, d));
  let i = 1; while (i < N && ARC[i] < t) i++;
  const f = (t - ARC[i - 1]) / Math.max(1e-9, ARC[i] - ARC[i - 1]);
  return bez((i - 1 + f) / N);
};
const W0 = 3, W1 = 8, RAMP = 0.6;
/** distance walked at time t: speeds up over RAMP s, steady, slows down over RAMP s (a trapezoid speed profile) */
const walked = (t: number) => {
  const T = W1 - W0, v = D / (T - RAMP), x = Math.max(0, Math.min(T, t - W0));
  if (x < RAMP) return (v * x * x) / (2 * RAMP);
  if (x > T - RAMP) { const y = T - x; return D - (v * y * y) / (2 * RAMP); }
  return v * (x - RAMP / 2);
};

/** where he stands (soles) at time t */
export const posAt = (t: number): V3 => {
  if (t < W0) return START;
  if (t >= W1) return STAND;
  const [x, z] = atDist(walked(t));
  return [x, 0, z];
};

// ---- steps: the walk phase follows the sideways (screen x) distance, 8 steps from start to stop, so planted feet
//      stay put on screen and he starts and stops with his feet together ----
const STEPS = 8;
export const STRIDE_M = (STAND[0] - START[0]) / STEPS;
export const STRIDE_UNITS = STRIDE_M / SU;
const walkPhase = (t: number) => 0.25 + (posAt(t)[0] - START[0]) / (2 * STRIDE_M);
/** how much the walk is "on": eases in and out so arms, bob and foot lift start and stop softly */
const walkOn = (t: number) => smooth((t - W0) / 0.4) * smooth((W1 - t) / 0.4);

/** which drawing to use. Turns are instant swaps between drawings (no scaling): front -> three-quarter -> side,
 *  each in-between view held TURN_HOLD frames. mirror = the card is flipped to face screen left. bob = extra body drop
 *  (design units, + = down): the small settle after arriving in a new view. */
export type Look =
  | { view: "front" }
  | { view: "q34"; mirror: boolean }
  | { view: "side"; mirror: boolean; phase: number; k: number; raise: number; bob: number };

const TURN_HOLD = 3;
const TALL_UNITS = 870; // his height in design units
/** a weighted settle after a turn: dips ~1.5 % of his height and comes back with a tiny rebound (frames since arrival) */
const settle = (df: number) => {
  const A = 0.015 * TALL_UNITS;
  if (df < 0) return 0;
  if (df < 10) return A * Math.sin((Math.PI * df) / 10);
  if (df < 18) return -0.25 * A * Math.sin((Math.PI * (df - 10)) / 8);
  return 0;
};
// turn 1: front -> 3/4 -> side (facing right) at 2 s
const T1 = 2 * FPS;
// turn 2: side (right) -> 3/4 -> front -> 3/4 (left) -> side (left, toward the qibla), starting just after the walk
const T2 = W1 * FPS + 3;

/** which drawing to use at frame f */
export const lookAt = (f: number): Look => {
  const t = f / FPS, endPhase = walkPhase(W1);
  const side = (mirror: boolean, phase: number, k = 0, raise = 0, bob = 0): Look => ({ view: "side", mirror, phase, k, raise, bob });
  if (f < T1) return { view: "front" };
  if (f < T1 + TURN_HOLD) return { view: "q34", mirror: false };
  if (t < W0) return side(false, 0.25, 0, 0, settle(f - (T1 + TURN_HOLD)));
  if (f < T2) return side(false, walkPhase(t), walkOn(t));
  const g = f - T2;
  if (g < TURN_HOLD) return { view: "q34", mirror: false };
  if (g < 2 * TURN_HOLD) return { view: "front" };
  if (g < 3 * TURN_HOLD) return { view: "q34", mirror: QIBLA_SIGN < 0 };
  // facing the qibla; settle, then the takbir: the hands rise over 0.8 s and hold
  return side(QIBLA_SIGN < 0, endPhase, 0, clamp01((t - 9.15) / 0.8), settle(g - 3 * TURN_HOLD));
};

// ---- camera: follows him gently (it looks at where he has been on average over the last 1.2 s, so it lags and
//      never jerks), and pushes in slowly while he stands in takbir ----
const follow = (t: number): V3 => {
  let x = 0, z = 0;
  const n = 16;
  for (let i = 0; i < n; i++) { const q = posAt(t - (1.2 * i) / (n - 1)); x += q[0]; z += q[2]; }
  return [x / n, 0, z / n];
};
export const camAt = (f: number): Cam => {
  const t = f / FPS, c = follow(t);
  const dist = 5.0 - 0.7 * glide((t - 8.8) / 3.2);
  const look: V3 = [c[0] + 0.1, 1.15 + 0.08 * glide((t - 8.8) / 3.2), c[2]];
  return { pos: [look[0] - 0.15, look[1] + 0.2, look[2] + dist], look, fov: 45, roll: 0 };
};

/** lens: focus on his chest; gentle blur behind, strong on the near floor (as in the courtyard test) */
export const LENS = { cInf: 5, nearScale: 2.6, maxCoC: 28 };
export const focusAt = (t: number): V3 => { const q = posAt(t); return [q[0], 1.3, q[2]]; };
