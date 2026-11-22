// Video 004 "The Man Who Never Rested": close-up drawings.
//  openHand   his open right hand, palm up, held out (waiting): a real hand - the palm, four separated fingers (each with
//             its joints), the thumb - with a slight tremble; the brown sleeve comes in from the bottom. Drawn in the
//             600 x 1000 card: the palm sits around (300, 380); place it with scale ~0.3.
import { mul, INK } from "../../draw/toon";
import { SKIN_T } from "../../characters/traveller";
import type { Card } from "../../characters/people";
import type { P2 } from "../../characters/traveller";

const SLEEVE = "#7B5238";
/** a rounded finger (capsule) from base a toward angle ang, length L, width w; bend 0..1 curls it slightly */
const finger = (a: P2, ang: number, L: number, w: number, bend: number): P2[] => {
  const pts: P2[] = [], n = 10, c = Math.cos(ang), s = Math.sin(ang), side = (k: number, d: number): P2 => {
    const u = k / n, curl = bend * u * u * 0.6, ca = Math.cos(ang + curl), sa = Math.sin(ang + curl);
    const x = a[0] + c * L * u * (1 - 0.15 * bend * u), y = a[1] + s * L * u * (1 - 0.15 * bend * u) + 0.25 * L * curl;
    return [x - sa * d * w * (1 - 0.18 * u), y + ca * d * w * (1 - 0.18 * u)];
  };
  for (let k = 0; k <= n; k++) pts.push(side(k, 1));
  const tip = side(n, 0); for (let k = 1; k < 8; k++) { const th = Math.PI / 2 - (k / 8) * Math.PI, rr = w * 0.82; pts.push([tip[0] + Math.cos(ang + th) * rr * 0.9, tip[1] + Math.sin(ang + th) * rr * 0.9]); }
  for (let k = n; k >= 0; k--) pts.push(side(k, -1));
  return pts;
};
export const openHand = (t: number): Card => {
  const k = Math.round(t * 12) / 12, tr = 0.025 * Math.sin(k * 23) + 0.012 * Math.sin(k * 41 + 1);
  return { key: `rhand2|${k}`, draw: (p) => {
    const g = p.g, skin = SKIN_T, dark = mul(skin, [0.72, 0.62, 0.6]), light = Math.PI * 0.75;
    g.save(); g.translate(300, 420); g.rotate(-0.18 + tr);
    // the sleeve
    const sl: P2[] = [[-120, 70], [80, 50], [190, 640], [-170, 640]];
    p.gradFill(sl, SLEEVE, mul(SLEEVE, [0.6, 0.6, 0.65]), light, 0.25); p.poly(sl, null, 11); p.stroke([[-30, 160], [-60, 620]], 5); p.stroke([[40, 150], [70, 620]], 5);
    // the palm (seen from above, slightly from the thumb side), cupped open
    const palm: P2[] = [[-95, 40], [-110, -40], [-100, -120], [-60, -150], [10, -158], [70, -140], [100, -95], [105, -20], [80, 50], [0, 70]];
    // the fingers first (behind the palm's top edge), spread apart
    const fingers: [P2, number, number, number][] = [[[-82, -118], -2.02, 150, 30], [[-28, -150], -1.72, 172, 32], [[28, -150], -1.45, 165, 31], [[78, -125], -1.18, 130, 27]];
    fingers.forEach(([a, ang, L, w], i) => { const f = finger(a, ang + 0.03 * Math.sin(k * 9 + i), L, w, 0.25 + 0.1 * i); p.gradFill(f, skin, dark, light, 0.3); p.poly(f, null, 8);
      const c = Math.cos(ang), s = Math.sin(ang); for (const u of [0.42, 0.72]) p.stroke([[a[0] + c * L * u - s * w * 0.55, a[1] + s * L * u + c * w * 0.55], [a[0] + c * L * u + s * w * 0.3, a[1] + s * L * u - c * w * 0.3]], 3.5, INK); });
    p.gradFill(palm, skin, dark, light, 0.3); p.poly(palm, null, 10);
    // the thumb, out to the side
    const th = finger([-96, -30], -2.75, 120, 33, 0.15); p.gradFill(th, skin, dark, light, 0.3); p.poly(th, null, 8);
    // palm lines
    p.stroke([[-80, -60], [-20, -95], [60, -100]], 4, mul(dark, [0.8, 0.8, 0.8])); p.stroke([[-70, -10], [0, -40], [50, -75]], 4, mul(dark, [0.8, 0.8, 0.8])); p.stroke([[-60, 30], [-80, -40], [-60, -90]], 4, mul(dark, [0.8, 0.8, 0.8]));
    g.restore();
  } };
};
