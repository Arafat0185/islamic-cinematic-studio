// One hanging oil lamp: a brass cap and base around a glowing glass body, on a short chain from the apex of an arch.
// The glass is brighter than white (HDR), so the bloom pass makes it glow; a warm point light lights the stone.
import * as THREE from "three";
import { twoTone } from "../../render/shade";
import { NOINK } from "../../render/ink";
import { NIGHT } from "./look";

/** builds the lamp hanging from (x, top, z); the glass centre ends up about 0.6 m below `top` */
export const buildLamp = (x: number, top: number, z: number) => {
  const root = new THREE.Group();
  root.position.set(x, top, z);
  const brass = twoTone(new THREE.MeshLambertMaterial({ color: "#9a7a40" }));

  // chain: a thin rod
  const chainLen = 0.32;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, chainLen, 6), brass);
  chain.position.y = -chainLen / 2;
  root.add(chain);

  // brass cap (a small dome-topped cone)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.12, 16), brass);
  cap.position.y = -chainLen - 0.06;
  root.add(cap);

  // glass body: a lathe profile, wide at the shoulder, narrowing to the base
  const prof = [[0.0, 0.0], [0.05, 0.01], [0.09, 0.06], [0.115, 0.14], [0.1, 0.22], [0.07, 0.26], [0.0, 0.27]]
    .map(([r, y]) => new THREE.Vector2(r, -y));
  const glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...NIGHT.glass), fog: false });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), glassMat);
  glass.position.y = -chainLen - 0.1;
  root.add(glass);

  // brass base ring and finial
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.04, 16), brass);
  ring.position.y = -chainLen - 0.1 - 0.27;
  root.add(ring);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 10), brass);
  fin.rotation.x = Math.PI; fin.position.y = ring.position.y - 0.065;
  root.add(fin);

  // soft halo card around the glass (additive, camera-facing, not outlined)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1.0, 0.62, 0.25), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.set(1.1, 1.1, 1); halo.position.y = glass.position.y - 0.13; halo.layers.set(NOINK);
  root.add(halo);

  // the light itself, at the flame
  const light = new THREE.PointLight(NIGHT.lampCol, NIGHT.lampI, 0, 2);
  light.position.y = glass.position.y - 0.13;
  root.add(light);

  return root;
};

const haloTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.25, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
