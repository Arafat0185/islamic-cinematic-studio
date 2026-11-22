// Light levels for the brand moments (darkness -> one lamp ignites -> the night comes up; the lamp dims at the end).
// Levels remembers each light's and glow's original value once, then scales them every frame:
//   main      the main lamp (lights, glass, halo) at x = mainX
//   lanterns  every other lit lantern
//   night     moonlight on the world (via applyLook), sky, stars, moon disc, skyline windows, mist
// 1 = as built, 0 = off. Pure: the same levels always give the same picture.
import * as THREE from "three";
import { NIGHT } from "../scenes/courtyard-test/look";

type Lvl = { main: number; lanterns: number; night: number };
type Item = { set: (k: Lvl) => void };

export class Levels {
  private items: Item[] = [];
  constructor(root: THREE.Object3D, mainX: number, private extras: { mist?: THREE.Object3D; dust?: THREE.Points } = {}) {
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const isMain = (o: THREE.Object3D) => Math.abs(o.getWorldPosition(v).x - mainX) < 0.05;
    root.traverse((o) => {
      if ((o as THREE.Light).isLight && !(o as THREE.DirectionalLight).isDirectionalLight) {
        const l = o as THREE.Light, base = l.intensity, main = isMain(l);
        this.items.push({ set: (k) => { l.intensity = base * (main ? k.main : k.lanterns); } });
      }
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m || Array.isArray(m)) return;
      if (m.name === "lampGlass") {
        const mat = m as THREE.MeshBasicMaterial, base = mat.color.clone(), main = isMain(o);
        // unlit glass is dark amber, not black
        const off = new THREE.Color("#3a2c1e");
        this.items.push({ set: (k) => { const a = main ? k.main : k.lanterns; mat.color.copy(off).lerp(base, Math.min(1, a)).multiplyScalar(Math.max(1, a)); } });
      } else if (o.name === "lampHalo") {
        const mat = m as THREE.SpriteMaterial, main = isMain(o);
        this.items.push({ set: (k) => { mat.opacity = Math.min(1, main ? k.main : k.lanterns); } });
      } else if (m.name === "sky") {
        const u = (m as THREE.ShaderMaterial).uniforms, top = (u.uTop.value as THREE.Vector3).clone(), hor = (u.uHor.value as THREE.Vector3).clone(), sg = u.uStarGain.value as number;
        this.items.push({ set: (k) => { (u.uTop.value as THREE.Vector3).copy(top).multiplyScalar(k.night); (u.uHor.value as THREE.Vector3).copy(hor).multiplyScalar(k.night); u.uStarGain.value = sg * k.night; } });
      } else if (o.name === "moonDisc") {
        const mat = m as THREE.SpriteMaterial;
        this.items.push({ set: (k) => { mat.opacity = k.night; } });
      } else if (m.name === "skyWindow") {
        const mat = m as THREE.MeshBasicMaterial, base = mat.color.clone();
        this.items.push({ set: (k) => { mat.color.copy(base).multiplyScalar(k.night); } });
      }
    });
    const mist = extras.mist;
    if (mist) mist.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (mat && mat.opacity !== undefined) { const base = mat.opacity; this.items.push({ set: (k) => { mat.opacity = base * k.night; } }); }
    });
    const dust = extras.dust;
    if (dust) { const mat = dust.material as THREE.PointsMaterial; this.items.push({ set: (k) => { mat.opacity = Math.min(1, k.main); } }); }
  }
  /** set the levels; also returns the applyLook overrides for the moonlight on the world and the cards */
  set(k: Lvl, look: { lit: [number, number, number]; shade: [number, number, number] }) {
    for (const it of this.items) it.set(k);
    const n = k.night, sc = (c: [number, number, number], s: number) => c.map((x) => x * s) as [number, number, number];
    const glow = Math.max(n, 0.35 * Math.min(1, k.main)); // the lamp alone still shows him faintly
    return {
      lit: sc(look.lit, n), shade: sc(look.shade, n), lift: sc(NIGHT.lift, n),
      cardGain: NIGHT.cardGain * Math.max(0.04, glow),
    };
  }
}
