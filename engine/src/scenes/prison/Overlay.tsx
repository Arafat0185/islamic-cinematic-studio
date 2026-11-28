// The 2D layer of video 008 "The Prison" (teal & orange film):
//  - captions copied from the guide: the same words, chunks, line breaks and on/off times (timing.json "captions");
//    centred, the caption's centre at 62 % of the frame height; Poppins SemiBold 40 white, key words (Allah, iman,
//    Jannah, forbidden) in warm amber; the salawat sign drawn from Amiri
//  - behind them a cinematic strip: a full-width band, black at 65 %, soft feathered top and bottom, as tall as the
//    text + padding, fading in and out with the caption
//  - a small "SAHIH MUSLIM 2956" tag while the hadith is on screen
//  - transitions: warm light leaks, soft dissolves (a dip through teal haze); whip-pan blur and match cuts are in the
//    picture (timeline.ts fxAt)
//  - the end card: the logo + "Hadith: Sahih Muslim 2956", over warm light (the sunrise's light filling the frame)
import React from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { smooth } from "../../camera/ease";
import { FONT, useFonts } from "../../text/fonts";
import { FPS, FRAMES, CARD_FROM, TRANSITIONS, CHARACTER_SHOTS, shotOf, pitchAt } from "./timeline";
import TIMING from "../../../../videos/008-the-prison/timing.json";

const W = 1080, H = 1920, AMBER = "#FFB24A", SIZE = 40, LH = 1.32, PAD = 34, CY = 0.62 * H;
const LOGO = "brand/logo/traveller_logo_transparent.svg";
type Cap = { i: number; text: string; keys: string[]; f0: number; f1: number };
const CAPS = TIMING.captions as Cap[];
const HAD = [Math.round(TIMING.hadith[0] * FPS), Math.round(TIMING.hadith[1] * FPS)];

/** one line: key words in amber, the salawat sign in Amiri */
const Line: React.FC<{ s: string; keys: string[] }> = ({ s, keys }) => {
  const parts: React.ReactNode[] = []; let rest = s, n = 0;
  while (rest.length) {
    let best = -1, len = 0, kind = "";
    for (const k of keys) { const i = rest.indexOf(k); if (i >= 0 && (best < 0 || i < best)) { best = i; len = k.length; kind = "key"; } }
    const sw = rest.indexOf("ﷺ"); if (sw >= 0 && (best < 0 || sw < best)) { best = sw; len = 1; kind = "saw"; }
    if (best < 0) { parts.push(rest); break; }
    if (best > 0) parts.push(rest.slice(0, best));
    const piece = rest.slice(best, best + len);
    parts.push(kind === "key" ? <span key={n++} style={{ color: AMBER, textShadow: "0 0 14px rgba(255,170,60,0.35)" }}>{piece}</span>
      : <span key={n++} style={{ fontFamily: FONT.arabic, fontWeight: 400, fontSize: SIZE * 1.05, lineHeight: 0, verticalAlign: "-0.05em", padding: "0 0.12em" }}>{piece}</span>);
    rest = rest.slice(best + len);
  }
  return <div>{parts}</div>;
};
const Caption: React.FC<{ c: Cap; f: number; nextSame: boolean; prevSame: boolean }> = ({ c, f }) => {
  const k = Math.min(smooth((f - c.f0 + 2) / 5), 1 - smooth((f - c.f1 + 5) / 5));
  const lines = c.text.split("\n"), th = lines.length * SIZE * LH, band = th + 2 * PAD;
  return (
    <>
      <div style={{ position: "absolute", left: 0, width: W, top: CY - band / 2 - 26, height: band + 52, opacity: k,
        background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.65) 22%, rgba(0,0,0,0.65) 78%, rgba(0,0,0,0))" }} />
      <div style={{ position: "absolute", left: 60, width: W - 120, top: CY - th / 2, textAlign: "center", fontFamily: FONT.poppins, fontWeight: 600, fontSize: SIZE, lineHeight: LH,
        color: "#FFFFFF", opacity: k, textShadow: "0 2px 10px rgba(0,0,0,0.45)", transform: `translateY(${(1 - k) * 6}px)` }}>
        {lines.map((s, i) => <Line key={i} s={s} keys={c.keys} />)}
      </div>
    </>
  );
};
const Tag: React.FC<{ f: number }> = ({ f }) => {
  const k = Math.min(smooth((f - HAD[0]) / 10), 1 - smooth((f - HAD[1] + 10) / 10)); if (k <= 0) return null;
  return <div style={{ position: "absolute", left: 0, width: W, top: CY - 150, textAlign: "center", opacity: 0.9 * k }}>
    <span style={{ fontFamily: FONT.poppins, fontWeight: 600, fontSize: 19, letterSpacing: "0.3em", color: "#F3D9AE", padding: "8px 20px", border: "1.5px solid rgba(255,178,74,0.7)", borderRadius: 999, background: "rgba(10,14,16,0.45)" }}>{TIMING.hadithTag}</span></div>;
};
/** light leaks and dissolves around the planned cuts */
const Transition: React.FC<{ f: number }> = ({ f }) => {
  for (const tr of TRANSITIONS) { const d = f - tr.f;
    if (tr.kind === "leak" && Math.abs(d) < 14) { const g = smooth(1 - Math.abs(d) / 14), x = 20 + 60 * ((d + 14) / 28);
      return <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.9 * g, background: `radial-gradient(ellipse at ${x}% 35%, rgba(255,190,110,0.95), rgba(255,120,40,0.55) 30%, rgba(255,90,20,0) 65%), linear-gradient(90deg, rgba(255,140,60,0.25), rgba(0,0,0,0) 60%)` }} />; }
    if (tr.kind === "dissolve" && Math.abs(d) < 9) { const g = smooth(1 - Math.abs(d) / 9);
      return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(40,70,78,0.75), rgba(8,18,22,0.92))", opacity: 0.85 * g }} />; }
  }
  return null;
};
/** the sunrise light filling the frame at the end (only light), then the end card on it */
const EndLight: React.FC<{ f: number }> = ({ f }) => {
  const k = smooth((f - (CARD_FROM - 95)) / 95); if (k <= 0) return null;
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,246,226,1), rgba(255,214,150,0.95) 40%, rgba(240,160,80,0.85) 80%)", opacity: 0.92 * k }} />;
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const k = smooth((f - CARD_FROM) / 16); if (k <= 0) return null; const lk = smooth((f - CARD_FROM - 8) / 18);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(70,48,30,${k}), rgba(18,26,30,${k}) 80%)`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(255,190,110,0.35), rgba(0,0,0,0) 60%)", opacity: k * (0.85 + 0.15 * Math.sin(f / FPS * 1.4)) }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
        <Img src={staticFile(LOGO)} style={{ width: 360, height: 360, objectFit: "contain", opacity: lk }} />
        <div style={{ width: 120, height: 3, background: AMBER, margin: "44px auto 30px", opacity: lk }} />
        <div style={{ fontFamily: FONT.poppins, fontWeight: 600, fontSize: 40, color: "#FFF3DE", opacity: smooth((f - CARD_FROM - 14) / 14), textShadow: "0 0 18px rgba(255,170,60,0.35)" }}>{TIMING.cardLine}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Overlay: React.FC = () => {
  const ready = useFonts(), f = useCurrentFrame();
  React.useMemo(() => {
    if (!(getInputProps() as { post?: { pitchReport?: boolean } }).post?.pitchReport) return;
    let worst = -90, at = 0; for (let g = 0; g < FRAMES; g++) { if (!CHARACTER_SHOTS.has(shotOf(g).kind)) continue; const pp = pitchAt(g); if (pp > worst) { worst = pp; at = g; } }
    console.log(`PITCH REPORT: steepest downward look on him ${worst.toFixed(1)} degrees at frame ${at} (${shotOf(at).kind}); limit 45`);
  }, []);
  if (!ready) return null;
  const ci = CAPS.findIndex((c) => f >= c.f0 && f < c.f1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Transition f={f} />
      <EndLight f={f} />
      {ci >= 0 ? <Caption c={CAPS[ci]} f={f} nextSame={false} prevSame={false} /> : null}
      <Tag f={f} />
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
