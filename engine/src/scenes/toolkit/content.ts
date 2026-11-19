// Every piece of text the toolkit demo shows, in ONE place, copied word for word from the sources below. Nothing here
// is invented: no other Quran verse, hadith or Arabic text may be added.
//   NARRATION: videos/001-the-first-question/script.md on main (sections 2, 4, 5, 6, 7)
//   HADITH:    videos/001-the-first-question/references.yaml on main (tirmidhi-413: quoted_exactly, grade, graded_by)
//   ARABIC:    the single word الصلاة (the demo of the Arabic line component; NOT the hadith's Arabic text, which is
//              still a TODO in references.yaml and must be copied verbatim from sunnah.com before production)
// Keyword colours follow the script's own notes: "first" gold, "succeeded" green, "lost" red,
// "voluntary prayers" gold. The others ("mercy", "Salat", "stand up") follow the colour rules (gold = Allah /
// reward / key term, green = right action).
import type { KeyKind } from "../../text/Captions";

type Line = { text: string; keys?: Record<string, KeyKind> };

export const NARRATION = {
  // section 2 (hook)
  hook2: { text: "There is one thing you will be asked about first.", keys: { first: "gold" } } as Line,
  // section 4 (the hadith)
  hadithIntro: { text: "But the Prophet ﷺ told us what comes first:", keys: { first: "gold" } } as Line,
  // section 5 (paraphrase)
  weight1: { text: "He ﷺ said that if it is sound, the servant has succeeded,", keys: { succeeded: "green" } } as Line,
  weight2: { text: "and if it is lacking, he has failed and lost.", keys: { lost: "red", failed: "red" } } as Line,
  // section 6 (paraphrase)
  mercy1: { text: "But then comes the mercy.", keys: { mercy: "gold" } } as Line,
  mercy3: { text: "And with them, what was lacking is completed.", keys: { completed: "gold" } } as Line,
  // section 7
  turn2: { text: "It's whether you'll stand up for the next one.", keys: { "stand up": "green" } } as Line,
};

/** references.yaml, tirmidhi-413 (quoted_exactly), shown in quotation marks because it is an exact translation */
export const HADITH = {
  text: "“Indeed the first deed by which a servant will be called to account on the Day of Resurrection is his Salat.”",
  keys: { "his Salat": "gold" } as Record<string, KeyKind>,
  /** the source tag, exactly as the script asks for it */
  tag: "JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)",
  /** for the sources card: collection, number, grade and grader from references.yaml */
  card: "Jami` at-Tirmidhi 413, graded Sahih (Darussalam)",
};

/** the only Arabic in the demo */
export const ARABIC_DEMO = ["الصلاة"]; // الصلاة
