// MonoGoldEffect (video 007, "Black & Gold Noir"): a selective colour grade as a postprocessing Effect, placed after the
// GradeEffect. Every colour is pulled to a cold silver-grey EXCEPT gold (warm yellow-orange hues): those keep their
// colour (and get a little richer), so gold is the only colour in the picture. Then the blacks are crushed a little
// and the shadows lean cold.
//   uMono   0 = off, 1 = everything but gold fully grey
//   uKeep   how much of gold's own saturation survives (1 = all of it)
//   uCrush  0..1 deepens the blacks (a soft toe)
import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

const frag = /* glsl */ `
uniform float uMono;
uniform float uKeep;
uniform float uCrush;
vec3 mgHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  vec3 h = mgHsv(c);
  // gold, measured on LINEAR values (where #E8B04B sits at 30 degrees and skin at 21): hue 0.066 .. 0.15, soft edges;
  // only where there is real colour
  float gold = smoothstep(0.066, 0.08, h.x) * (1.0 - smoothstep(0.15, 0.18, h.x)) * smoothstep(0.12, 0.3, h.y);
  float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 grey = vec3(y) * vec3(0.95, 0.99, 1.06);                     // cold silver
  vec3 keep = mix(vec3(y), c, uKeep * 1.12);
  vec3 o = mix(c, mix(grey, keep, gold), uMono);
  // a soft toe: the blacks go deeper, the mids stay
  vec3 deep = o * smoothstep(vec3(0.0), vec3(0.16), o);
  o = mix(o, deep, uCrush * (1.0 - smoothstep(0.0, 0.2, y)));
  outputColor = vec4(max(o, 0.0), inputColor.a);
}`;

export class MonoGoldEffect extends Effect {
  constructor() {
    super("MonoGoldEffect", frag, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([["uMono", new Uniform(1)], ["uKeep", new Uniform(1)], ["uCrush", new Uniform(0.5)]]),
    });
  }
  set(mono: number, keep = 1, crush = 0.5) {
    this.uniforms.get("uMono")!.value = mono; this.uniforms.get("uKeep")!.value = keep; this.uniforms.get("uCrush")!.value = crush;
  }
}
