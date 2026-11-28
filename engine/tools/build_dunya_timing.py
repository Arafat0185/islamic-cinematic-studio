"""Timing sheet for video 005 "The Dunya" -> videos/005-the-dunya/timing.json

  0 .. SPEECH_END  an Arabic voice clip (a TikTok sound the channel owner adds in TikTok; NEVER in our file). Timing from
                   the guide public/audio/guide/dunya_guide.mp4 (preview only): local Whisper word timings
                   (narration/whisper_words.json, multilingual small) checked against the guide's burned-in subtitle
                   changes. The caption TEXT is the channel owner's (VOICE below), not Whisper's.
  REC_START ..     Sheikh Yasser Al-Dossari, Al-Hadid 57:22-23 (everyayah.com Yasser_Ad-Dussary_128kbps 057022 + 057023),
                   joined with GAP s between the verses. This audio IS in our file (tools/mix_dunya.py).
  phrases          Arabic + English: exact slices of the saved quran.com responses (quran/57_*.json: text_uthmani +
                   translation 20 = Saheeh International), timed from Whisper word timings on the recitation
                   (quran/whisper_words.json).
Run from engine/:  .venv-tts/Scripts/python tools/build_dunya_timing.py
"""
import json, re, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "005-the-dunya"
QDIR = VDIR / "quran"
REC = HERE.parent / "public" / "audio" / "recitation"
FPS = 30
SPEECH_END = 32.6         # "ان شاء الله تعالى" fades into the background by 32.6 s (voice band back at the pause level)
CLIP_END = 33.45          # the TikTok sound itself ends here (silence, then TikTok's outro at 33.6)
REC_START = 33.1          # ~0.5 s after the speech
GAP = 0.6                 # between the two verses
CARD_LEAD = 1.2           # the end card comes up over the recitation's last reverb tail (which fades out under it)
CARD = 3.0

# the voice: the channel owner's text (Arabic exactly as supplied, English as supplied), start = Whisper's first word
VOICE = [
    ("لا تهتم للدنيا ما تستاهل الدنيا", "Don't worry about the dunya. It isn't worth it.", 0.0, ["isn't worth it"]),
    ("الدنيا لا تستحق", "The dunya doesn't deserve it.", 3.0, ["doesn't deserve"]),
    ("ولا تستاهل ان نحمل هماً وغماً لاجلها", "It isn't worth carrying worry and grief for.", 4.44, ["worry and grief"]),
    ("ما هي كفو الدنيا", "The dunya isn't worth it.", 9.04, ["isn't worth it"]),
    ("دائماً قل لن يصيبنا إلا ما كتب الله لنا", "Always say: \"Never will we be struck except by what Allah has decreed for us.\"", 11.54, ["decreed"]),
    ("وان الارزاق مكتوبة", "Provision is written.", 15.14, ["written"]),
    ("وان الاعمال مكتوبة", "Our deeds are written.", 16.56, ["written"]),
    ("ولا تهتم لا تعطي الموضوع أكبر من حجمه", "Don't worry. Don't make it bigger than it is.", 17.9, ["bigger"]),
    ("الدنيا اجعلها في يدك ان جاءت", "Keep the dunya in your hand - if it comes,", 21.42, ["in your hand"]),
    ("وإن ذهبت فذهبت من اليد", "and if it goes, it only left your hand.", 24.48, ["left your hand"]),
    ("لا تدخل الدنيا الى قلبك", "Don't let the dunya into your heart.", 26.44, ["heart"]),
    ("وبهذا تعيش سعيداً", "And that's how you'll live happy,", 28.28, ["happy"]),
    ("ان شاء الله تعالى", "in sha Allah.", 30.66, []),
]
VOICE_TAG = {4: "QURAN 9:51"}

# (verse, first word index, last word index, English slice, start in that verse's file, Arabic key word indices)
PHRASES = [
    (22, 0, 5, "No disaster strikes upon the earth", 0.0, [3]),
    (22, 6, 8, "or among yourselves", 7.36, [8]),
    (22, 9, 16, "except that it is in a register before We bring it into being -", 10.8, [11]),
    (22, 17, 21, "indeed that, for Allāh, is easy -", 28.52, [21]),
    (23, 0, 4, "In order that you not despair over what has eluded you", 0.0, [1]),
    (23, 5, 9, "and not exult [in pride] over what He has given you.", 3.74, [6]),
    (23, 10, 15, "And Allāh does not like everyone self-deluded and boastful -", 8.72, [15]),
]
REPEAT = {2: 21.48}       # the Sheikh recites "إلا في كتاب من قبل أن نبرأها" twice
EN_KEYS = {0: ["disaster"], 1: [], 2: ["register"], 3: ["easy"], 4: ["despair"], 5: ["exult"], 6: ["boastful"]}


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def main():
    verses = {}
    for v in (22, 23):
        d = json.loads((QDIR / f"57_{v}.json").read_text(encoding="utf-8"))["verse"]
        verses[v] = {"ar": d["text_uthmani"].split(" "), "en": re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])}
    names = json.loads((QDIR / "translations_list.json").read_text(encoding="utf-8"))["translations"]
    assert [t["name"] for t in names if t["id"] == 20] == ["Saheeh International"], "translation 20 is not Saheeh International"
    for v in verses:                                                     # the phrases join back into each verse exactly
        ps = [p for p in PHRASES if p[0] == v]
        assert " ".join(" ".join(verses[v]["ar"][a:b + 1]) for _, a, b, *_ in ps) == " ".join(verses[v]["ar"]), f"Arabic of {v}"
        assert " ".join(p[3] for p in ps) == verses[v]["en"], f"English of {v}: {verses[v]['en']!r}"
    # 9:51's words in voice line 5 are the speaker's; the English follows Saheeh International's wording of 9:51
    q951 = json.loads((QDIR / "9_51.json").read_text(encoding="utf-8"))["verse"]
    assert "Never will we be struck except by what Allāh has decreed for us" in re.sub(r"<sup[^>]*>.*?</sup>", "", q951["translations"][0]["text"])
    d22, d23 = dur(REC / "dossari_057022.mp3"), dur(REC / "dossari_057023.mp3")
    start = {22: REC_START, 23: round(REC_START + d22 + GAP, 3)}
    rec_end = round(start[23] + d23, 3)
    card_from = round(round((rec_end - CARD_LEAD) * FPS) / FPS, 3)
    length = round(round((card_from + CARD) * FPS) / FPS, 3)
    phrases = []
    for i, (v, a, b, en, cut, keys) in enumerate(PHRASES):
        nxt = PHRASES[i + 1] if i + 1 < len(PHRASES) else None
        end = start[nxt[0]] + nxt[4] if nxt else card_from
        phrases.append({"i": i, "verse": f"57:{v}", "ar": " ".join(verses[v]["ar"][a:b + 1]), "arKeys": [k - a for k in keys], "en": en, "keys": EN_KEYS[i],
                        "start": round(start[v] + cut, 3), "end": round(end - 0.15, 3), **({"repeatAt": round(start[v] + REPEAT[i], 3)} if i in REPEAT else {})})
    voice = []
    for i, (ar, en, s, keys) in enumerate(VOICE):
        end = VOICE[i + 1][2] - 0.1 if i + 1 < len(VOICE) else SPEECH_END + 0.3
        voice.append({"i": i, "ar": ar, "en": en, "keys": keys, "start": s, "end": round(end, 3), **({"tag": VOICE_TAG[i]} if i in VOICE_TAG else {})})
    out = {"fps": FPS, "speechEnd": SPEECH_END, "clipEnd": CLIP_END, "recStart": REC_START, "recEnd": rec_end, "verseStarts": {f"57:{v}": s for v, s in start.items()},
           "gap": GAP, "cardFrom": card_from, "length": length, "surah": "Al-Hadid", "range": "57:22-23",
           "reciter": "Sheikh Yasser Al-Dossari", "translation": "Saheeh International", "voice": voice, "phrases": phrases,
           "sources": {"recitation": "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/057022.mp3 + 057023.mp3",
                       "text": "https://api.quran.com/api/v4/verses/by_key/57:{22..23}?fields=text_uthmani&translations=20"}}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {length:.2f} s ({round(length * FPS)} frames); recitation {REC_START}-{rec_end}; card from {card_from}")
    for p in voice + phrases: print(f"  {p['start']:6.2f}-{p['end']:6.2f} {p['en']}")


if __name__ == "__main__":
    main()
