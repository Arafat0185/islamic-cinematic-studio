// Cast sheet: the new everyday poses and the other faceless characters (characters/people.ts), for review.
// Render: npx remotion still src/index.ts CastSheet out/cast_sheet.png
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { Pen } from "../../draw/toon";
import { walker, waveArm, reachArm, wuduArms, stoop, sit, hug, cat, front, ruku, sujood } from "../../characters/people";

const BG = "#DADADA";
const COLS = 8, PANEL_W = 600, ROW_H = 900;
const K = 0.8, TOP_Y = 60, DRAW_TOP = 130, LIGHT = (-120 * Math.PI) / 180;
type Panel = { label: string; note: string; draw: (p: Pen) => void };
const w = wuduArms(0.3);
const PANELS: Panel[] = [
  { label: "Wave", note: "walking, waving", draw: walker("traveller", { phase: 0.1, k: 1, armN: waveArm(0.2) }).draw },
  { label: "Handshake", note: "reaching forward", draw: walker("traveller", { armN: reachArm(0.3) }).draw },
  { label: "Open window", note: "reaching up", draw: walker("traveller", { armN: reachArm(0, 1) }).draw },
  { label: "Wudu", note: "hands at the basin", draw: walker("traveller", { armN: w.N, armF: w.F, headRot: 0.25 }).draw },
  { label: "Carrying bags", note: "walking", draw: walker("traveller", { phase: 0.1, k: 1, bags: "#d9c7a0", armN: { E: [300, 460], W: [306, 600], hand: "dot" }, armF: { E: [296, 462], W: [300, 602], hand: "dot" } }).draw },
  { label: "Barefoot", note: "shoes off", draw: walker("traveller", { phase: 0.3, k: 1, barefoot: true }).draw },
  { label: "Stoop", note: "picking up a bag", draw: stoop("traveller", 1, LIGHT, "#d9c7a0").draw },
  { label: "Stoop half", note: "", draw: stoop("traveller", 0.5, LIGHT).draw },
  { label: "Sit: eat", note: "bread to the mouth", draw: sit("traveller", "eat", 0.4).draw },
  { label: "Sit: tea", note: "", draw: sit("father", "cup", 0).draw },
  { label: "Sit: read", note: "the Quran", draw: sit("traveller", "read", 0).draw },
  { label: "Sit: point", note: "teaching", draw: sit("traveller", "point", 0.5).draw },
  { label: "Sit: pass", note: "passing a plate", draw: sit("friend", "pass", 0.6).draw },
  { label: "Sit: laugh", note: "", draw: sit("w3", "laugh", 0.2).draw },
  { label: "Sit: listen", note: "boy", draw: sit("boy", "listen", 0).draw },
  { label: "Hug", note: "with a brother", draw: hug("hugger", 0.3).draw },
  { label: "Friend", note: "walking", draw: walker("friend", { phase: 0.6, k: 1 }).draw },
  { label: "Old man", note: "with bags", draw: walker("oldMan", { phase: 0.4, k: 0.7, bags: "#c9b48a", armN: { E: [300, 460], W: [306, 600], hand: "dot" } }).draw },
  { label: "Father", note: "", draw: walker("father", {}).draw },
  { label: "Little brother", note: "", draw: walker("brother", { phase: 0.2, k: 1 }).draw },
  { label: "Shopkeeper", note: "waving", draw: walker("shopkeeper", { armN: waveArm(0.6) }).draw },
  { label: "Worshipper", note: "qiyam, front", draw: front("w2", "qiyam").draw },
  { label: "Worshipper", note: "ruku", draw: ruku("w1").draw },
  { label: "Worshipper", note: "sujood", draw: sujood("w5").draw },
  { label: "Kid", note: "running", draw: walker("kid1", { phase: 0.15, k: 1, swing: 1.8, stride: 140 }).draw },
  { label: "Cat", note: "walking", draw: cat("walk", 0.3).draw },
  { label: "Cat", note: "drinking", draw: cat("drink", 0.2).draw },
  { label: "Cat", note: "sitting", draw: cat("sit").draw },
];
const ROWS = Math.ceil(PANELS.length / COLS);
export const CAST_SHEET_W = COLS * PANEL_W, CAST_SHEET_H = ROWS * ROW_H;

export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("draw cast sheet"));
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = BG; g.fillRect(0, 0, CAST_SHEET_W, CAST_SHEET_H);
    PANELS.forEach((o, i) => {
      const x0 = (i % COLS) * PANEL_W, y0 = Math.floor(i / COLS) * ROW_H;
      g.save();
      g.beginPath(); g.rect(x0, y0, PANEL_W, ROW_H); g.clip();
      // floor line under the figure
      g.fillStyle = "#c4c4c4"; g.fillRect(x0 + 30, y0 + DRAW_TOP + (975 - TOP_Y) * K, PANEL_W - 60, 3);
      g.setTransform(K, 0, 0, K, x0 + PANEL_W / 2 - 300 * K, y0 + DRAW_TOP - TOP_Y * K);
      o.draw(new Pen(g));
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.textAlign = "center";
      g.fillStyle = "#241726"; g.font = "bold 46px Arial, Helvetica, sans-serif";
      g.fillText(o.label, x0 + PANEL_W / 2, y0 + 62);
      g.fillStyle = "#5c5560"; g.font = "26px Arial, Helvetica, sans-serif";
      g.fillText(o.note, x0 + PANEL_W / 2, y0 + 100);
      if (i % COLS) { g.fillStyle = "#c8c8c8"; g.fillRect(x0 - 1, y0 + 30, 2, ROW_H - 60); }
    });
    g.fillStyle = "#c8c8c8";
    for (let r = 1; r < ROWS; r++) g.fillRect(30, r * ROW_H - 1, CAST_SHEET_W - 60, 2);
    continueRender(handle);
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <canvas ref={ref} width={CAST_SHEET_W} height={CAST_SHEET_H} />
    </AbsoluteFill>
  );
};
