// Fonts for on-screen text. All free, SIL Open Font License 1.1, installed from npm (@fontsource):
//   Inter               captions and small labels
//   Cormorant Garamond  titles
//   Amiri               Arabic
// useFonts() holds the render until the fonts have really loaded, so no frame is ever drawn in a fallback font.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";

export const FONT = {
  caption: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  title: "'Cormorant Garamond', Georgia, serif",
  arabic: "'Amiri', 'Times New Roman', serif",
} as const;

let loaded: Promise<unknown> | null = null;
const loadAll = () => (loaded ??= Promise.all([
  document.fonts.load("500 60px Inter"), document.fonts.load("600 60px Inter"), document.fonts.load("700 60px Inter"),
  document.fonts.load("600 60px 'Cormorant Garamond'"), document.fonts.load("700 60px 'Cormorant Garamond'"),
  document.fonts.load("400 60px Amiri", "ال"), document.fonts.load("700 60px Amiri", "ال"),
  // the salawat sign (U+FDFA) is drawn from Amiri inside English captions: load the face that has it
  document.fonts.load("400 60px Amiri", "ﷺ"),
]));

/** call in any component that draws text; resolves once (cached) */
export const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => { loadAll().then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  return ready;
};

let ctx: CanvasRenderingContext2D | null = null;
/** width in px of `text` in a CSS font string (for line breaking) */
export const measure = (text: string, font: string) => {
  ctx ??= document.createElement("canvas").getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
};
