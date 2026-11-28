"""Timing sheet for video 008 "The Prison" -> videos/008-the-prison/timing.json

  0 .. SPEECH_END  an ARABIC narration (a TikTok sound the channel owner adds in TikTok; NEVER in our file); the guide
                   (public/audio/guide/prison_guide.mp4, timing + preview only, its pictures never used) burns in ENGLISH
                   captions. Our captions copy those exactly: the same wording, the same chunks and line breaks, the same
                   on/off times. Times = the frames where the guide's caption text changes (white text in its caption
                   band, read frame by frame), cross-checked with Whisper word timings of the Arabic voice
                   (narration/whisper_words.json; the voice is band-limited first: it is heavily processed).
  the hadith       Sahih Muslim 2956 (Book of Zuhd, 1): "The world is a prison-house for a believer and Paradise for a
                   non-believer" (hadith/eng-muslim_7417.json, ara-muslim_7417.json; fawazahmed0/hadith-api = sunnah.com
                   USC-MSA English). The narration's own wording is captioned (as the guide shows it); the tag names
                   the source while the hadith is on screen.
  CARD             the end card (logo + "Hadith: Sahih Muslim 2956"), 3 s
Run from engine/:  .venv-tts/Scripts/python tools/build_prison_timing.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "008-the-prison"
FPS = 30
SPEECH_END = 80.45        # "نفسك" ends ~80.36 s (Whisper); the last caption stays to 80.8; TikTok's outro sound at ~81.3
CLIP_END = 80.9           # the guide talk is cut here in the preview
CARD_FROM = 81.0
CARD = 3.0
HADITH = (0.23, 8.63)     # "The Prophet ﷺ said:" and the hadith's two caption lines

# (frame on, frame off (inclusive), text with the guide's line break as "\n", key words in amber)
CAPS = [
    (7, 116, "The Prophet Muhammad ﷺ said:", []),
    (117, 178, "“The world is a prison\nfor the believer”", []),
    (179, 258, "“and a paradise\nfor the disbeliever.”", []),
    (259, 309, "Because this dunya", []),
    (310, 430, "was never meant to give you\neverything your soul desires.", []),
    (431, 532, "You were not created to\nfollow every desire", []),
    (533, 612, "that passes through your heart", []),
    (613, 679, "Sometimes you want something.", []),
    (680, 777, "but Allah has forbidden it.", ["Allah", "forbidden"]),
    (778, 824, "You see something you desire", []),
    (825, 892, "but you lower your gaze", []),
    (893, 944, "You want to speak", []),
    (945, 1015, "but you choose silence.", []),
    (1016, 1083, "You want to follow your heart", []),
    (1084, 1181, "but you choose what pleases Allah.", ["Allah"]),
    (1182, 1221, "You choose modesty", []),
    (1222, 1336, "when the world tells you\nto reveal more", []),
    (1337, 1427, "You cover what Allah commanded\nyou to cover", ["Allah"]),
    (1428, 1524, "even when it feels difficult.", []),
    (1525, 1605, "And this is the struggle", []),
    (1606, 1656, "The dunya tells you:", []),
    (1657, 1721, "“Follow what you desire.”", []),
    (1722, 1795, "But your iman tells you:", ["iman"]),
    (1796, 1884, "“Follow what Allah loves.”", ["Allah"]),
    (1885, 1986, "Every desire you resist for His sake", []),
    (1987, 2095, "every temptation you leave behind", []),
    (2096, 2196, "is another step closer to Jannah.", ["Jannah"]),
    (2197, 2259, "Because one day you will enter", []),
    (2260, 2424, "a place where nothing you desire will\never be forbidden again", ["forbidden"]),
]


def main():
    caps = []
    for i, (a, b, text, keys) in enumerate(CAPS):
        assert b >= a and (i == 0 or a == CAPS[i - 1][1] + 1 or a > CAPS[i - 1][1]), i
        for k in keys: assert k in text, (text, k)
        assert text.count("\n") <= 1
        caps.append({"i": i, "text": text, "keys": keys, "start": round(a / FPS, 3), "end": round((b + 1) / FPS, 3), "f0": a, "f1": b + 1})
    length = round(round((CARD_FROM + CARD) * FPS) / FPS, 3)
    out = {"fps": FPS, "speechEnd": SPEECH_END, "clipEnd": CLIP_END, "cardFrom": CARD_FROM, "length": length, "hadith": HADITH,
           "hadithTag": "SAHIH MUSLIM 2956", "cardLine": "Hadith: Sahih Muslim 2956", "captions": caps}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {length:.2f} s ({round(length * FPS)} frames); {len(caps)} captions; card from {CARD_FROM}")


if __name__ == "__main__":
    main()
