"""Timing sheet for video 004 "The Man Who Never Rested" -> videos/004-never-rested/timing.json

  the narration  a TikTok sound the channel owner adds in TikTok from 0:00 (timing guide: public/audio/guide/rest_guide.mp4,
                 never committed; its sound is only in the PREVIEW file). It runs 0-55.3 s; after that the guide is a
                 TikTok outro (ignored).
  words          local Whisper word timings (narration/whisper_words.json, model small.en). Whisper cannot hear the words
                 under 15-24 s (soft humming): there the phrase windows come from the guide's burned-in captions (their
                 change times, measured at 10 fps) and the words are spread evenly inside each window.
  text           the spoken words (checked against the guide's captions; the differences are listed in NOTES).
  quran          35:34 and 13:24: Arabic + English are exact slices of the saved quran.com responses (quran/*.json,
                 text_uthmani + translation 20 = Saheeh International). 39:10 is only referenced ("cf. QURAN 39:10").
Run from engine/:  .venv-tts/Scripts/python tools/build_rest_timing.py
"""
import json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "004-never-rested"
FPS = 30
NARR_END = 55.3
SIT = 52.6            # he finally sits down
CARD_FROM = 59.0      # the end card
LENGTH = 62.0

# (start, end, text, speaker card or None, key words). Times = the phrase window; words get Whisper times where heard.
PHRASES = [
    (0.0, 0.95, "Ibn al-Jawzi, he says:", "jawzi", ["Ibn al-Jawzi"]),
    (1.0, 2.55, "Whoever seeks absolute comfort", None, ["absolute comfort"]),
    (2.6, 5.1, "is seeking something that was never created.", None, ["never created"]),
    (5.2, 6.9, "Sufyan al-Thawri, he says that", "thawri", ["Sufyan al-Thawri"]),
    (7.0, 10.5, "this dunya is created for hardship and anxiety, not for rest and tranquility.", None, ["hardship", "anxiety"]),
    (10.6, 12.1, "And Imam Ahmad was asked:", "ahmad", ["Imam Ahmad"]),
    (12.2, 15.0, "When does one feel true rest? He says:", None, ["true rest"]),
    (15.05, 17.35, "At the first step he takes into Jannah.", None, ["first step", "Jannah"]),
    (17.4, 19.95, "The sorrows of my heart will never vanish", None, ["sorrows"]),
    (20.0, 22.45, "until I am given the glad tidings of acceptance,", None, ["acceptance"]),
    (22.5, 24.85, "and until I see my Record delivered into my right hand,", None, ["right hand"]),
    (24.9, 26.95, "and my eyes are cooled by the sight of the Messenger ﷺ.", None, []),
    (27.0, 29.45, "The people of Paradise, when they first enter, they will say:", None, ["Paradise"]),
    (33.5, 35.15, "True bliss is not attained through bliss,", "qayyim", ["True bliss"]),
    (35.2, 37.75, "and whoever chooses comfort misses out on comfort,", None, ["misses out"]),
    (37.8, 40.55, "and that in proportion to facing hardships and enduring struggles", None, ["hardships", "struggles"]),
    (40.6, 42.6, "do joy and delight come.", None, ["joy", "delight"]),
    (43.05, 45.35, "If you're going through hardships and struggles,", None, ["hardships"]),
    (45.4, 47.05, "know that this patience that you're upon", None, ["patience"]),
    (47.1, 50.4, "is your ticket to a reward that has no limit.", None, ["no limit"]),
]
QURAN = [
    # (key, first word, last word, English slice, start, end, tag)
    ("35:34", 1, 6, "Praise to Allāh, who has removed from us [all] sorrow.", 29.5, 33.3, "QURAN 35:34"),
    ("13:24", 0, 7, '"Peace [i.e., security] be upon you for what you patiently endured. And excellent is the final home."', 50.9, 58.6, "QURAN 13:24"),
]
# the original Arabic of the two VERIFIED quotes, copied exactly from the sources (never written or translated by us):
#   Imam Ahmad: al-Jami' li-'Ulum al-Imam Ahmad 2/191 (citing Tabaqat al-Hanabila 2/290), https://shamela.ws/book/20870/187
#   Ibn al-Qayyim: Miftah Dar al-Sa'ada, vol. 2 (web transcription: https://www.islamicbook.ws/amma/mftah-dar-alsaadt-003.html)
SOURCE_AR = {
    "ahmad": "متى يجد العبد طعم الراحة؟ قال: عند أول قدم يضعها في الجنة",
    "qayyim": "وقد أجمع عقلاء كل أمة على أن النعيم لا يدرك بالنعيم وإن من آثر الراحة فاتته الراحة وإن بحسب ركوب الأهوال وإحتمال المشاق تكون الفرحة واللذة",
}
# whose quote each phrase belongs to (the label above the caption), and the exact slice of the source Arabic shown with it
QUOTE = {0: "jawzi", 1: "jawzi", 2: "jawzi", 3: "thawri", 4: "thawri", 5: "ahmad", 6: "ahmad", 7: "ahmad", 13: "qayyim", 14: "qayyim", 15: "qayyim", 16: "qayyim"}
AR_SLICE = {6: "متى يجد العبد طعم الراحة؟", 7: "قال: عند أول قدم يضعها في الجنة", 13: "النعيم لا يدرك بالنعيم", 14: "وإن من آثر الراحة فاتته الراحة",
            15: "وإن بحسب ركوب الأهوال وإحتمال المشاق", 16: "تكون الفرحة واللذة"}
SPEAKERS = {"jawzi": ("ابن الجوزي", "Ibn al-Jawzi", "d. 597 AH"), "thawri": ("سفيان الثوري", "Sufyan al-Thawri", "d. 161 AH"),
            "ahmad": ("الإمام أحمد بن حنبل", "Imam Ahmad ibn Hanbal", "d. 241 AH"), "qayyim": ("ابن القيم", "Ibn al-Qayyim", "d. 751 AH")}
LABEL = {"jawzi": "IBN AL-JAWZI", "thawri": "SUFYAN AL-THAWRI", "ahmad": "IMAM AHMAD", "qayyim": "IBN AL-QAYYIM"}
NOTES = [
    "0-1 s: the guide's caption reads 'Ibn al-Jawzi, he says:'; Whisper hears only 'He says' (the name is said very softly at 0 s).",
    "1-2.6 s: the guide's caption adds 'in this world'; it is not spoken, so it is not in our caption.",
    "7-10.5 s: spoken 'this dunya'; the guide's caption says 'This world'. Our caption follows the speech.",
    "15-24 s: Whisper cannot hear the words (humming); the caption windows come from the guide's captions.",
    "35-37.7 s: spoken 'misses out on comfort'; the guide's caption adds '(true)'. Our caption follows the speech.",
    "50.9-55.3 s: the narrator recites 13:24 in Arabic; our caption shows the verse (Arabic + Saheeh International).",
]


def main():
    words_w = json.loads((VDIR / "narration" / "whisper_words.json").read_text(encoding="utf-8"))["words"]
    heard = [w for w in words_w if not (14.9 < w["start"] < 27.0)]
    out_ph = []
    for i, (a, b, text, spk, keys) in enumerate(PHRASES):
        toks = text.split(" ")
        inside = [w for w in heard if a - 0.05 <= w["start"] < b]
        if len(inside) >= max(2, len(toks) // 2):
            # map the caption words onto Whisper's times in order (spread proportionally when the counts differ)
            times = [inside[min(len(inside) - 1, round(j * (len(inside) - 1) / max(1, len(toks) - 1)))]["start"] for j in range(len(toks))]
            times = [max(a, min(b - 0.05, x)) for x in times]
            for j in range(1, len(times)): times[j] = max(times[j], times[j - 1] + 0.06)
        else:
            times = [round(a + (b - a) * 0.85 * j / max(1, len(toks)), 3) for j in range(len(toks))]
        if i in AR_SLICE: assert AR_SLICE[i] in SOURCE_AR[QUOTE[i]], f"phrase {i}: the Arabic is not an exact slice of the source"
        out_ph.append({"i": i, "text": text, "start": a, "end": b, "words": [{"w": t, "at": round(x, 3)} for t, x in zip(toks, times)],
                       **({"speaker": spk} if spk else {}), **({"quote": QUOTE[i]} if i in QUOTE else {}), **({"ar": AR_SLICE[i]} if i in AR_SLICE else {}), "keys": keys})
    quran = []
    for key, w0, w1, en, a, b, tag in QURAN:
        d = json.loads((VDIR / "quran" / f"{key.replace(':', '_')}.json").read_text(encoding="utf-8"))["verse"]
        assert d["verse_key"] == key and d["translations"][0]["resource_id"] == 20
        ar_all = d["text_uthmani"].split(" "); en_all = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
        ar = " ".join(ar_all[w0:w1 + 1])
        assert en in en_all, f"{key}: English slice not in the API text"
        quran.append({"key": key, "ar": ar, "en": en, "start": a, "end": b, "tag": tag})
    names = json.loads((VDIR / "quran" / "translations_list.json").read_text(encoding="utf-8"))["translations"]
    assert [t["name"] for t in names if t["id"] == 20] == ["Saheeh International"]
    out = {"fps": FPS, "length": LENGTH, "narrEnd": NARR_END, "sit": SIT, "cardFrom": CARD_FROM, "phrases": out_ph, "quran": quran,
           "speakers": {k: {"ar": v[0], "en": v[1], "died": v[2], "label": LABEL[k], "attributed": k in ("jawzi", "thawri")} for k, v in SPEAKERS.items()}, "sourceAr": SOURCE_AR, "cf": {"tag": "cf. QURAN 39:10", "start": 47.1, "end": 50.4},
           "notes": NOTES, "sources": {"narration": "public/audio/guide/rest_guide.mp4 (TikTok sound; never committed; PREVIEW only)",
                                       "quran": "https://api.quran.com/api/v4/verses/by_key/{35:34,13:24,39:10}?fields=text_uthmani&translations=20"}}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {LENGTH} s; {len(out_ph)} narration phrases; {len(quran)} Quran captions")
    for p in out_ph: print(f"  {p['start']:5.2f}-{p['end']:5.2f} {('[' + p['speaker'] + '] ') if 'speaker' in p else ''}{p['text']}")
    for q in quran: print(f"  {q['start']:5.2f}-{q['end']:5.2f} [{q['tag']}] {q['ar']} | {q['en']}")


if __name__ == "__main__":
    main()
