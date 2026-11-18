// Pose sheet: every Traveller pose side by side, large, on plain grey, labelled. A still image (no 3D scene), drawn
// with the same Pen as the scene cards. Render: npm run pose-sheet  ->  out/pose_sheet.png
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { Pen } from "../../draw/toon";
import { traveller } from "../../characters/traveller";
import { travellerSide, travellerBack, travellerWalkSide, travellerRuku, travellerSujood, travellerJalsa } from "../../characters/travellerPoses";

const BG = "#DADADA";
const COLS = 6, PANEL_W = 600, ROW_H = 900;
const K = 0.8;            // px per design unit (the figure is ~700 px tall)
const TOP_Y = 60;         // design y shown at the top of the drawing area
const DRAW_TOP = 130;     // px below the row top where TOP_Y lands (room for the labels)
const LIGHT = (-120 * Math.PI) / 180; // key light from the upper left, as in the scene

type Panel = { label: string; note: string; draw: (p: Pen) => void };
const PANELS: Panel[] = [
  { label: "1  Standing", note: "front view", draw: (p) => traveller(p, { mode: "stand", light: LIGHT, seed: 1 }) },
  { label: "2  Standing", note: "side view", draw: (p) => travellerSide(p, { light: LIGHT }) },
  { label: "3  Standing", note: "back view", draw: (p) => travellerBack(p, { light: LIGHT }) },
  { label: "4a  Walk", note: "contact: right foot forward", draw: (p) => travellerWalkSide(p, 0, { light: LIGHT }) },
  { label: "4b  Walk", note: "passing", draw: (p) => travellerWalkSide(p, 1, { light: LIGHT }) },
  { label: "4c  Walk", note: "contact: left foot forward", draw: (p) => travellerWalkSide(p, 2, { light: LIGHT }) },
  { label: "4d  Walk", note: "passing", draw: (p) => travellerWalkSide(p, 3, { light: LIGHT }) },
  { label: "5  Takbir", note: "hands at ear level, palms forward", draw: (p) => traveller(p, { mode: "stand", arms: "takbir", light: LIGHT, seed: 1 }) },
  { label: "6  Qiyam", note: "right hand over left, on the chest", draw: (p) => traveller(p, { mode: "stand", arms: "qiyam", light: LIGHT, seed: 1 }) },
  { label: "7  Ruku", note: "back flat and level, hands on knees", draw: (p) => travellerRuku(p, { light: LIGHT }) },
  { label: "8  Sujood", note: "forehead and nose down, elbows raised", draw: (p) => travellerSujood(p, { light: LIGHT }) },
  { label: "9  Sitting", note: "between the prostrations", draw: (p) => travellerJalsa(p, { light: LIGHT }) },
];
const ROWS = Math.ceil(PANELS.length / COLS);
export const POSE_SHEET_W = COLS * PANEL_W, POSE_SHEET_H = ROWS * ROW_H;

export const PoseSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("draw pose sheet"));
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = BG; g.fillRect(0, 0, POSE_SHEET_W, POSE_SHEET_H);
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
    for (let r = 1; r < ROWS; r++) g.fillRect(30, r * ROW_H - 1, POSE_SHEET_W - 60, 2);
    continueRender(handle);
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <canvas ref={ref} width={POSE_SHEET_W} height={POSE_SHEET_H} />
    </AbsoluteFill>
  );
};
