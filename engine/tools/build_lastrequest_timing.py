"""Timing sheet for video 002 "The Last Request" -> videos/002-the-last-request/timing.json

  0 .. VOICE_END   the voice clip (added in TikTok; timing from the guide public/audio/guide/alborz_guide.mp4, never
                   exported). Its words come from local Whisper (voice/transcript.json, small.en, word timings), with two
                   mis-heard words corrected by hand (see FIXES).
  REC_START ..     Sheikh Yasser Ad-Dussary, Al-Munafiqun 63:10-11 (everyayah.com, Yasser_Ad-Dussary_128kbps), joined with
                   GAP s between the verses. This audio IS in our file (tools/mix_lastrequest.py).
  phrases          Arabic + English caption phrases: exact slices of the saved quran.com responses (quran/63_*.json, text
                   uthmani + translation 20 = Saheeh International). Times inside each verse come from multilingual Whisper
                   word timings (quran/whisper_words.json) cross-checked with the reciter's breaths.
Run from engine/:  .venv-tts/Scripts/python tools/build_lastrequest_timing.py
"""
import json, re, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "002-the-last-request"
QDIR = VDIR / "quran"
REC = HERE.parent / "public" / "audio" / "recitation"
FPS = 30
VOICE_END = 21.7          # the clip's sound ends here in the guide (its last word "up?" ends ~20.0 s)
REC_START = 22.2          # half a second of rain, then the recitation
GAP = 0.7                 # between the verses
HOLD = 1.0                # after the last verse, before the end card
CARD = 3.0                # the end card

# (verse, first word index, last word index, English slice, start in the recitation file in s)
# The recitation (public/audio/recitation/recitation_63_10-11.m4a, one file, 47.7 s, its own echo) has no gaps between
# the verses. Phrase starts: Whisper word timings (quran/whisper_words_new.json) checked against the reciter's breaths.
# The reciter repeats 63:11's first sentence (34.0-40.8 s): its caption stays up through both readings (repeatAt).
PHRASES = [
    (10, 0, 3, 'And spend [in the way of Allāh] from what We have provided you', 0.3),
    (10, 4, 9, 'before death approaches one of you', 3.6),
    (10, 10, 13, 'and he says, "My Lord, if only You would delay me', 7.85),
    (10, 14, 16, 'for a brief term', 14.4),
    (10, 17, 20, 'so I would give charity and be of the righteous."', 22.0),
    (11, 0, 7, 'But never will Allāh delay a soul when its time has come.', 27.75),
    (11, 8, 11, 'And Allāh is Aware of what you do.', 40.9),
]
REPEAT = {5: 34.0}
REC_FILE = "recitation_63_10-11.m4a"
AR_KEYS = {(10, 9): True, (10, 13): True, (10, 16): True, (11, 1): True, (11, 6): True, (11, 9): True}
EN_KEYS = {0: ["spend"], 1: ["death"], 2: ["delay me"], 3: ["brief term"], 4: ["charity"], 5: ["never", "delay a soul"], 6: ["Aware"]}
FIXES = {"Qiyamulay,": "Qiyam al-Layl,", "tomb": "tongue"}        # Whisper mis-heard these (meaning checked against the context)
VOICE_KEYS = {"punished", "sins?", "deprived", "heart", "closing", "wake", "up?"}


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def main():
    verses = {}
    for v in (10, 11):
        d = json.loads((QDIR / f"63_{v}.json").read_text(encoding="utf-8"))["verse"]
        en = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
        verses[v] = {"ar": d["text_uthmani"].split(" "), "en": en}
    names = json.loads((QDIR / "translations_list.json").read_text(encoding="utf-8"))["translations"]
    assert [t["name"] for t in names if t["id"] == 20] == ["Saheeh International"], "translation 20 is not Saheeh International"
    # the phrases join back into each verse exactly
    for v in verses:
        ps = [p for p in PHRASES if p[0] == v]
        assert " ".join(" ".join(verses[v]["ar"][a:b + 1]) for _, a, b, _, _ in ps) == " ".join(verses[v]["ar"]), f"Arabic of {v}"
        assert " ".join(e for *_, e, _ in ps) == verses[v]["en"], f"English of {v}: {verses[v]['en']!r}"
    rec_end = round(REC_START + dur(REC / REC_FILE), 3)
    starts = {v: round(REC_START + min(p[4] for p in PHRASES if p[0] == v), 3) for v in (10, 11)}
    length = round(round((rec_end + HOLD + CARD) * FPS) / FPS, 3)
    phrases = []
    for i, (v, a, b, en, cut) in enumerate(PHRASES):
        nxt = PHRASES[i + 1] if i + 1 < len(PHRASES) else None
        end = (REC_START + nxt[4]) if nxt else rec_end + HOLD
        ar = " ".join(verses[v]["ar"][a:b + 1])
        phrases.append({"i": i, "verse": f"63:{v}", "ar": ar, "arKeys": [k - a for k in range(a, b + 1) if AR_KEYS.get((v, k))], "en": en, "keys": EN_KEYS.get(i, []),
                        "start": round(REC_START + cut, 3), "end": round(end, 3), **({"repeatAt": round(REC_START + REPEAT[i], 3)} if i in REPEAT else {})})
    tr = json.loads((VDIR / "voice" / "transcript.json").read_text(encoding="utf-8"))
    words = [{"w": FIXES.get(w["w"], w["w"]), "start": w["start"], "end": w["end"], "key": w["w"].lower() in VOICE_KEYS} for w in tr["words"]]
    # Whisper split "Qur'an" in two: join it back
    j = []
    for w in words:
        if j and w["w"].startswith("'"): j[-1] = {**j[-1], "w": j[-1]["w"] + w["w"], "end": w["end"]}
        else: j.append(w)
    out = {"fps": FPS, "voiceEnd": VOICE_END, "recStart": REC_START, "recEnd": rec_end, "verseStarts": {f"63:{v}": s for v, s in starts.items()},
           "gap": GAP, "cardFrom": round(rec_end + HOLD, 3), "length": length, "reciter": None,
           "surah": "Al-Munafiqun", "range": "63:10-11", "translation": "Saheeh International", "voice": j, "phrases": phrases,
           "sources": {"recitation": "public/audio/recitation/recitation_63_10-11.m4a (a TikTok upload by @islamthetruth100; reciter not confirmed)",
                       "text": "https://api.quran.com/api/v4/verses/by_key/63:{10..11}?fields=text_uthmani&translations=20"}}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {length:.2f} s ({round(length * FPS)} frames); recitation {REC_START}-{rec_end}; card from {out['cardFrom']}")
    for p in phrases: print(f"  {p['start']:6.2f}-{p['end']:6.2f} {p['verse']:7s} {p['en']}")


if __name__ == "__main__":
    main()
