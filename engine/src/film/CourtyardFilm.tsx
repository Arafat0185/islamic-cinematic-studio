// The courtyard film player: plays any Film (film.ts) in the rich courtyard. Builds the world once (dressing, lamps,
// floor effects, mercy lights, light levels), then every frame: the film's camera plan + the collision check, the
// signature opening / ending light and floor effects, the Traveller's drawing, and the effect chain. On top: the star
// iris (a second view of the outgoing shot), whip-pan blur, accent flashes, captions, the quote group, the sources
// card, and the film's audio.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback, NOINK } from "../render/ink";
import { LensBlur } from "../render/lensblur";
import { GradeEffect, GRADE_NIGHT } from "../render/grade";
import { light2D } from "../render/card";
import { applyCam, smooth } from "../camera/ease";
import { safeCam } from "../camera/collision";
import { Pen } from "../draw/toon";
import { traveller } from "../characters/traveller";
import { travellerWalkPhase, travellerThreeQuarterFront, travellerBack } from "../characters/travellerPoses";
import { applyLook, NIGHT } from "../scenes/courtyard-test/look";
import { WALL_Z } from "../scenes/courtyard-test/courtyard";
import { buildBeautyWorld, LOOK, MAIN, MOON_FROM } from "../scenes/courtyard-beauty/world";
import { FloorFx } from "../brand/floorFx";
import { Levels } from "../brand/levels";
import { openingAt, endingAt } from "../brand/sequences";
import { Mercy } from "../brand/mercy";
import { irisAt, irisClip, IrisRim, whipAt, WhipBlurDefs } from "../brand/transitions";
import { Captions, Backdrop } from "../text/Captions";
import { ArabicLine } from "../text/ArabicLine";
import { SourceTag } from "../text/SourceTag";
import { SourcesCard } from "../text/SourcesCard";
import { placeText, bodyBox, CAPTION_BLOCK, QUOTE_BLOCK } from "./layout";
import type { Beat, Film } from "./film";

/** camReport: log a frame-by-frame camera check and the text layout (render a still with --log=verbose) */
type PostToggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; dpr?: number; camReport?: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.7 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const q = (v: number, n: number) => Math.round(v * n) / n;
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), right = new THREE.Vector3();
const GROOVE_FROM: [number, number] = [MAIN, WALL_Z + 0.5];
const whipOf = (film: Film, f: number) => { for (const w of film.whips) { const r = whipAt(f, w.from, w.len); if (r) return r; } return null; };

/** every frame's camera against the scene: collision corrections, the closest surface, how steeply it looks down
 *  at the Traveller (should stay under ~45 deg) */
const cameraReport = (film: Film, root: THREE.Object3D) => {
  const rows: string[] = [];
  let worstPitch = 0, minClear = Infinity, moved = 0;
  const check = (f: number, out?: Beat, tag = "") => {
    const pl = film.planAt(f, out), r = safeCam(root, pl.anchor ? { ...pl.cam, look: pl.anchor } : pl.cam);
    const [x, , z] = film.travellerAt(f).pos, [cx, cy, cz] = pl.cam.pos;
    const pitch = (Math.atan2(cy - 1.35, Math.hypot(cx - x, cz - z)) * 180) / Math.PI;
    worstPitch = Math.max(worstPitch, pitch); minClear = Math.min(minClear, r.clearance);
    if (r.moved > 0.001) { moved++; rows.push(`frame ${f}${tag}: moved ${r.moved.toFixed(2)} m (occluded at ${r.occluded.toFixed(2)} m, clearance ${r.clearance.toFixed(2)} m)`); }
    if (pitch > 45) rows.push(`frame ${f}${tag}: looks down at him at ${pitch.toFixed(0)} deg`);
  };
  for (let f = 0; f < film.frames; f++) check(f);
  for (const ir of film.irises) for (let f = ir.from; f < ir.from + ir.len; f++) check(f, film.irisOut(f)!.beat, " (iris, outgoing)");
  console.log(`CAMERA REPORT: ${film.frames} frames, ${moved} corrected, closest surface ${minClear === Infinity ? "> margin" : minClear.toFixed(2) + " m"}, steepest look down at him ${worstPitch.toFixed(0)} deg`);
  for (const r of rows.slice(0, 40)) console.log("CAMERA REPORT: " + r);
};

/** the 3D world for frame f; `outgoing` = draw the outgoing shot of a running star iris instead of the main one */
const Inner: React.FC<{ film: Film; outgoing?: Beat }> = ({ film, outgoing }) => {
  const f = useCurrentFrame(), t = f / film.fps;
  const { camera, scene } = useThree();
  const on = useMemo(toggles, []);
  const world = useMemo(() => {
    const w = buildBeautyWorld();
    const fx = new FloorFx(0.5, 0, 30);
    w.root.add(fx.mesh);
    const mercy = new Mercy(fx, film.mercy);
    w.root.add(mercy.points);
    const levels = new Levels(w.root, MAIN, { mist: w.mist.group, dust: w.dust.points });
    return { ...w, fx, levels, mercy };
  }, [film]);
  const post = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.6 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADE_NIGHT, 1),
  }), [camera, scene]);
  useEffect(() => () => post.ink.dispose(), [post]);
  const chain = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={post.ink} dispose={null} /> : <></>}
      {on.lens ? <primitive object={post.lens.pre} dispose={null} /> : <></>}
      {on.lens ? <primitive object={post.lens.main} dispose={null} /> : <></>}
      {on.bloom ? <primitive object={post.bloom} dispose={null} /> : <></>}
      <primitive object={post.tone} dispose={null} />
      {on.grade ? <primitive object={post.grade} dispose={null} /> : <></>}
    </EffectComposer>
  ), [post, on]);

  // ---- camera: the planned move, then the collision check ----
  const plan = film.planAt(f, outgoing);
  // checked against the shot's real target (during a whip pan the look point swings away from it)
  const checked = safeCam(world.root, plan.anchor ? { ...plan.cam, look: plan.anchor } : plan.cam);
  const safe = { ...checked, cam: { ...plan.cam, pos: checked.cam.pos } };
  if (safe.moved > 0.001) console.warn(`camera collision: frame ${f} moved ${safe.moved.toFixed(2)} m`);
  // ---- light levels and floor effects ----
  let lv = { main: 1, lanterns: 1, night: 1 };
  world.fx.grooves(0, 0, 0, 0); world.fx.mark(0, 0, 1, 0, 0);
  if (f < film.openingTo) {
    const o = openingAt(t);
    lv = { main: o.main, lanterns: o.lanterns, night: o.night };
    world.fx.grooves(GROOVE_FROM[0], GROOVE_FROM[1], o.grooveRadius, o.grooveIntensity);
  }
  if (plan.endingU !== null) {
    const E = film.ending, e = endingAt(plan.endingU, E.from, E.markCentre, E.top);
    // the glowing star dims as the sources card comes up, so no bright line runs behind its text
    const dim = 1 - 0.85 * smooth((f - film.text.card.from + 6) / 14);
    lv = { main: e.main, lanterns: e.lanterns, night: e.night };
    world.fx.grooves(E.markCentre[0], E.markCentre[2], e.grooveRadius, e.grooveIntensity * dim, 0.15);
    world.fx.mark(E.markCentre[0], E.markCentre[2], E.markR, e.markProgress, e.markIntensity * dim);
  }
  if (film.lampAt) lv = { ...lv, main: lv.main * film.lampAt(f) };
  world.mercy.update(f);
  applyLook({ ...LOOK, ...world.levels.set(lv, LOOK) });
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  applyCam(cam, safe.cam);
  useMemo(() => { if (on.camReport && !outgoing) cameraReport(film, world.root); }, [on, outgoing, world, film]);

  // ---- the Traveller ----
  right.setFromMatrixColumn(cam.matrixWorld, 0);
  const tr = film.travellerAt(f), a = tr.act;
  const mirror = (a.view === "q34" || a.view === "side") && a.mirror;
  const light = light2D(new THREE.Vector3(...MOON_FROM).normalize(), right, mirror);
  const L = light.toFixed(3), bob = q(tr.bob, 4), wind = q(tr.wind, 20);
  let key: string, draw: (p: Pen) => void;
  if (a.view === "front") {
    key = `v2f|${a.arms}|${q(a.turn, 40)}|${q(a.tilt, 40)}|${bob}|${wind}|${L}`;
    draw = (p) => traveller(p, { mode: "stand", light, seed: 1, arms: a.arms, headTurn: a.turn, headTilt: a.tilt, bob, wind });
  } else if (a.view === "back") {
    key = `v2b|${L}`;
    draw = (p) => travellerBack(p, { light });
  } else if (a.view === "q34") {
    key = `v2q|${a.mirror}|${L}`;
    draw = (p) => travellerThreeQuarterFront(p, { light, shawlNear: a.mirror });
  } else {
    const ph = q(a.phase, 240), k = q(a.k, 60), r = q(a.raise, 60), b = q(a.settle + tr.bob, 4);
    key = `v2s|${a.mirror}|${ph}|${k}|${r}|${b}|${wind}|${L}`;
    draw = (p) => travellerWalkPhase(p, ph, k, film.strideUnits, { light, raise: r, bob: b, wind, shawlNear: a.mirror });
  }
  const [x, y, z] = tr.pos;
  world.cast.pose(cam, [{ key, x, y, z, draw, mirror, blob: NIGHT.blob, castShadow: true }]);
  world.dust.update(t); world.mist.update(t);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fpt.set(...plan.focus);
  post.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  post.lens.cInf = plan.cInf;
  post.lens.nearScale = plan.nearScale;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {chain}
    </>
  );
};

const View: React.FC<{ film: Film; outgoing?: Beat; style?: React.CSSProperties }> = ({ film, outgoing, style }) => {
  const dpr = toggles().dpr;
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 50, near: 0.1, far: 500 }}>
        <Inner film={film} outgoing={outgoing} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const fmt = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? +v.toFixed(3) : v));
/** where each piece of text sits (computed once): clear of his head and upper body in every shot */
const useTextLayout = (film: Film) => useMemo(() => {
  const Q = film.text.quote;
  const quote = Q ? placeText(film, Q.from, Q.to, QUOTE_BLOCK) : 0;
  const inQuote = (from: number, to: number) => !!Q && from >= Q.from && to <= Q.to;
  const phrases = film.text.phrases.map((ph) => ({ ...ph, centreY: inQuote(ph.from, ph.to) ? quote : placeText(film, ph.from, ph.to, CAPTION_BLOCK) }));
  if (toggles().camReport) {
    if (Q) console.log(`TEXT LAYOUT: quote group at ${quote.toFixed(2)}, his box ${fmt(bodyBox(film, Q.from, Q.to))}`);
    for (const ph of phrases) console.log(`TEXT LAYOUT: ${ph.from}-${ph.to} at ${ph.centreY?.toFixed(2)} box ${fmt(bodyBox(film, ph.from, ph.to))}`);
  }
  return { phrases, arabicY: quote - 0.085, tagY: quote + 0.115, quoteY: quote };
}, [film]);

export const CourtyardFilm: React.FC<{ film: Film }> = ({ film }) => {
  const f = useCurrentFrame(), { width: w, height: h } = useVideoConfig();
  const text = useTextLayout(film);
  const whip = whipOf(film, f);
  const out = film.irisOut(f);
  const iris = out ? irisAt(f, out.iris.from, out.iris.len, w, h) : null;
  const acc = film.accentAt(f);
  const Q = film.text.quote, inQuote = !!Q && f >= Q.from && f < Q.to, C = film.text.card;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {film.audio ? <Audio src={staticFile(film.audio)} /> : null}
      {whip ? <WhipBlurDefs px={whip.blur} /> : null}
      <View film={film} style={whip ? { filter: "url(#whipBlur)" } : undefined} />
      {/* star iris: the outgoing shot on top, everything outside the opening star */}
      {out && iris ? <View film={film} outgoing={out.beat} style={{ clipPath: irisClip(iris.R, iris.rot, w, h) }} /> : null}
      {iris ? <IrisRim R={iris.R} rot={iris.rot} u={iris.u} /> : null}
      {/* a brief, soft light flash on the strongest words */}
      {acc.flash > 0 ? (
        <AbsoluteFill style={{
          pointerEvents: "none", mixBlendMode: "screen", opacity: acc.flash * (acc.warm ? 0.32 : 0.22),
          background: acc.warm ? "radial-gradient(circle at 50% 45%, rgba(255,214,150,1), rgba(232,176,75,0.35) 45%, rgba(0,0,0,0) 75%)"
            : "radial-gradient(circle at 50% 50%, rgba(220,226,255,1), rgba(160,170,220,0.3) 50%, rgba(0,0,0,0) 80%)",
        }} />
      ) : null}
      {Q && inQuote ? <Backdrop centreY={text.quoteY} half={h * 0.16} strength={0.4}
        opacity={Math.min(1, (f - Q.from) / 8, (Q.to - f) / 6)} /> : null}
      {Q && Q.arabic.length ? <ArabicLine words={Q.arabic} from={Q.from} to={Q.to} centreY={text.arabicY} /> : null}
      <Captions phrases={text.phrases} backdrop={!inQuote} />
      {Q ? <SourceTag text={Q.tag} from={Q.tagFrom} to={Q.to} centreY={text.tagY} /> : null}
      <SourcesCard sources={C.sources} note={C.note} from={C.from} to={C.to} />
    </AbsoluteFill>
  );
};
