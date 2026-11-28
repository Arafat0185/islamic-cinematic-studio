"""Timing sheet for video 006 "Hold On To This" -> videos/006-hold-on/timing.json

  0 .. SPEECH_END  an Arabic talk by a sheikh (a TikTok sound the channel owner adds in TikTok; NEVER in our file). Timing
                   from the guide public/audio/guide/deen_guide.mp4 (timing + preview only): local Whisper word timings
                   (narration/whisper_words.json, multilingual small). The caption TEXT is the channel owner's (TALK).
  a beat           ~0.8 s of nature sound only
  REC_START ..     Sheikh Yasser Al-Dossari, Ar-Ra'd 13:28-29 (everyayah.com Yasser_Ad-Dussary_128kbps 013028 + 013029),
                   joined with GAP s. This audio IS in our file (tools/mix_hold.py).
  phrases          Arabic + English: exact slices of the saved quran.com responses (quran/13_*.json: text_uthmani +
                   translation 20 = Saheeh International); 13:28's English ends with the closing quotation mark of a
                   quotation that opens in 13:27, which is left off the caption (checked below). Phrase starts: Whisper
                   word timings (quran/whisper_words.json) and the reciter's breaths.
Run from engine/:  .venv-tts/Scripts/python tools/build_hold_timing.py
"""
import json, re, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "006-hold-on"
QDIR = VDIR / "quran"
REC = HERE.parent / "public" / "audio" / "recitation"
FPS = 30
SPEECH_END = 39.7         # "ليش تطفش؟" ends 39.64 s (Whisper; the voice band falls to silence by 39.8); TikTok's outro follows at 40.0
CLIP_END = 39.9           # the guide voice is cut here in the preview (before TikTok's outro)
REC_START = 40.5          # a 0.8 s beat of nature only
GAP = 0.3
CARD_LEAD = 1.0
CARD = 3.2

# the talk: the channel owner's text, exactly as supplied; start = Whisper's first word of the line
TALK = [
    ("أعظم شيء تتمسك فيه دين الله جل وعلا", "The greatest thing you can hold on to is the religion of Allah, Exalted is He.", 0.0, ["religion of Allah"]),
    ("ترى، شوف يا شاب، أقسم بالله", "Look, young man - I swear by Allah,", 3.0, ["young man"]),
    ("أنك عزيز وكريم بهذا الدين", "this religion is what gives you honour and dignity.", 6.64, ["honour", "dignity"]),
    ("والله، تفقد أبوك، عادي", "Wallah, you lose your father - you'll cope.", 9.94, ["father"]),
    ("تفقد أمك، عادي", "You lose your mother - you'll cope.", 12.04, ["mother"]),
    ("تفقد مالك، عادي", "You lose your wealth - you'll cope.", 13.94, ["wealth"]),
    ("تفقد زوجتك وأولادك، عادي", "You lose your wife and children - you'll cope.", 15.64, ["wife and children"]),
    ("تفقد أعضاءك، تصير مشلول، عادي", "You lose your limbs, become paralysed - you'll cope.", 18.12, ["limbs"]),
    ("لكن تفقد هذا الدين، أقسم بالله أنك خسران", "But lose this religion - I swear by Allah, you've truly lost.", 22.84, ["lose this religion", "truly lost"]),
    ("إي والله. والله أعرف شاب", "Yes, wallah. I know a young man", 25.86, []),
    ("عنده أجمل السيارات، ومعه ثلاث بطاقات صراف إلكتروني", "who has the finest cars, three bank cards,", 28.44, ["finest cars"]),
    ("وكل شي يبغاه يجيه", "and everything he wants comes to him.", 32.06, ["everything"]),
    ("أقسم بالله إنه دائمًا يتصل علي يقول: إني طفشان وزهقان", "I swear he always calls me and says, \"I'm bored and fed up.\"", 33.58, ["bored and fed up"]),
    ("قلت: يا أخي، ليش تطفش؟", "I said, \"Brother - why are you bored?\"", 36.86, ["why are you bored?"]),
]
# (verse, first word index, last word index, English slice, start in that verse's file, Arabic key word indices)
PHRASES = [
    (28, 0, 1, "Those who have believed", 0.0, []),
    (28, 2, 6, "and whose hearts are assured by the remembrance of Allāh.", 2.16, [2, 4]),
    (28, 7, 11, "Unquestionably, by the remembrance of Allāh hearts are assured.", 9.75, [8, 10]),
    (29, 0, 3, "Those who have believed and done righteous deeds -", 0.0, [3]),
    (29, 4, 7, "a good state is theirs and a good return.", 4.28, [4, 7]),
]
EN_KEYS = {0: ["believed"], 1: ["hearts are assured", "remembrance of Allāh"], 2: ["hearts are assured"], 3: ["righteous deeds"], 4: ["a good state", "a good return"]}
DROP_END = {28: '"'}        # the closing quotation mark of the quotation opened in 13:27


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def main():
    verses = {}
    for v in (28, 29):
        d = json.loads((QDIR / f"13_{v}.json").read_text(encoding="utf-8"))["verse"]
        verses[v] = {"ar": d["text_uthmani"].split(" "), "en": re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])}
    names = json.loads((QDIR / "translations_list.json").read_text(encoding="utf-8"))["translations"]
    assert [t["name"] for t in names if t["id"] == 20] == ["Saheeh International"], "translation 20 is not Saheeh International"
    for v in verses:
        ps = [p for p in PHRASES if p[0] == v]
        assert " ".join(" ".join(verses[v]["ar"][a:b + 1]) for _, a, b, *_ in ps) == " ".join(verses[v]["ar"]), f"Arabic of {v}"
        assert " ".join(p[3] for p in ps) + DROP_END.get(v, "") == verses[v]["en"], f"English of {v}: {verses[v]['en']!r}"
    d28, d29 = dur(REC / "dossari_013028.mp3"), dur(REC / "dossari_013029.mp3")
    start = {28: REC_START, 29: round(REC_START + d28 + GAP, 3)}
    rec_end = round(start[29] + d29, 3)
    card_from = round(round((rec_end - CARD_LEAD) * FPS) / FPS, 3)
    length = round(round((card_from + CARD) * FPS) / FPS, 3)
    phrases = []
    for i, (v, a, b, en, cut, keys) in enumerate(PHRASES):
        nxt = PHRASES[i + 1] if i + 1 < len(PHRASES) else None
        end = start[nxt[0]] + nxt[4] if nxt else card_from
        phrases.append({"i": i, "verse": f"13:{v}", "ar": " ".join(verses[v]["ar"][a:b + 1]), "arKeys": [k - a for k in keys], "en": en, "keys": EN_KEYS[i],
                        "start": round(start[v] + cut, 3), "end": round(end - 0.12, 3)})
    talk = []
    for i, (ar, en, s, keys) in enumerate(TALK):
        end = TALK[i + 1][2] - 0.1 if i + 1 < len(TALK) else SPEECH_END + 0.5
        talk.append({"i": i, "ar": ar, "en": en, "keys": keys, "start": s, "end": round(end, 3)})
    out = {"fps": FPS, "speechEnd": SPEECH_END, "clipEnd": CLIP_END, "recStart": REC_START, "recEnd": rec_end, "verseStarts": {f"13:{v}": s for v, s in start.items()},
           "gap": GAP, "cardFrom": card_from, "length": length, "surah": "Ar-Ra'd", "range": "13:28-29",
           "reciter": "Sheikh Yasser Al-Dossari", "translation": "Saheeh International", "talk": talk, "phrases": phrases,
           "sources": {"recitation": "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/013028.mp3 + 013029.mp3",
                       "text": "https://api.quran.com/api/v4/verses/by_key/13:{28..29}?fields=text_uthmani&translations=20"}}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {length:.2f} s ({round(length * FPS)} frames); recitation {REC_START}-{rec_end}; card from {card_from}")
    for p in talk + phrases: print(f"  {p['start']:6.2f}-{p['end']:6.2f} {p['en']}")


if __name__ == "__main__":
    main()
