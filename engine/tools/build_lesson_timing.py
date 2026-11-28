"""Timing sheet for video 007 "The Lesson" -> videos/007-the-lesson/timing.json

  0 .. SPEECH_END  an Arabic talk by a young man about what he learned on his sickbed (a TikTok sound the channel owner
                   adds in TikTok; NEVER in our file). Timing from the guide public/audio/guide/lesson_guide.mp4 (timing +
                   preview only, its pictures are never used): local Whisper word timings (narration/whisper_words.json,
                   multilingual "small") cross-checked with the guide's own subtitle changes (white-text changes in its
                   subtitle band). The caption TEXT is the channel owner's (TALK), exactly as supplied.
  SPEECH_END       "قلبي" ends 66.84 s (Whisper); the voice band fades to silence by 67.2; TikTok's outro starts at 67.3
  CARD             the end card (logo + the closing line), 3 s, inside the letterbox
No recitation in this video. Our file is sound design only (tools/mix_lesson.py).
Run from engine/:  .venv-tts/Scripts/python tools/build_lesson_timing.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "007-the-lesson"
FPS = 30
SPEECH_END = 67.15
CLIP_END = 67.2            # the guide talk is cut here in the preview (TikTok's outro starts at 67.3)
CARD_FROM = 67.3
CARD = 3.0

# (Arabic, English, start s (Whisper first word, checked against the guide's subtitle change), English key words in gold)
TALK = [
    ("أنا دائمًا أقول", "I always say,", 0.0, []),
    ("من أعظم الدروس", "one of the greatest lessons", 0.78, ["greatest lessons"]),
    ("اللي تلقيتها وشربتها في مرضي", "I took in and absorbed during my illness:", 2.1, ["my illness"]),
    ("استحقرت الدنيا!", "I came to see the dunya as worthless.", 6.9, ["worthless"]),
    ("صح أبغى أمتلك سيارة جميلة", "Sure, I want to own a nice car,", 9.85, ["nice car"]),
    ("بيت وأمور دنيوية هذي، أبغاها", "a house, these worldly things - I want them,", 11.9, ["a house", "worldly things"]),
    ("بس ما كان لها قيمة كبيرة في قلبي، ليش؟", "but they didn't mean much in my heart. Why?", 15.2, ["in my heart"]),
    ("لأني لما أكون في المستشفى", "Because when I'm in hospital,", 19.6, ["hospital"]),
    ("خاصة لما أكون في أسوأ", "especially at my worst,", 21.3, ["at my worst"]),
    ("وأصعب مراحلي الصحية", "in the hardest stages of my health,", 23.85, ["hardest stages"]),
    ("تحس حتى لو عندك قصور", "you feel that even if you had palaces,", 27.5, ["palaces"]),
    ("إيش بتسوي ذاك القصر؟", "what would that palace do for you?", 29.1, ["that palace"]),
    ("أنت مريض! على فراش الموت", "You're ill - on your deathbed.", 30.85, ["on your deathbed"]),
    ("لو عندك من الخدم والحشم", "If you had servants and attendants,", 32.75, ["servants and attendants"]),
    ("والسيارات والقصور", "cars and palaces,", 34.95, ["cars and palaces"]),
    ("وأنت مريض", "and you're ill,", 36.6, ["ill"]),
    ("إيش الفايدة؟ إيش الفايدة؟", "what's the use? What's the use?", 37.4, ["what's the use? What's the use?"]),
    ("إيش بتسوي فيهم؟ إيش بيسووا لك؟", "What would you do with them? What would they do for you?", 40.0, ["What would they do for you?"]),
    ("هنا أدركت أن القيمة... الدنيا ما فيها", "That's when I realised - the dunya has no value.", 42.4, ["no value"]),
    ("إيش اسم الدنيا؟ من الدناءة!", "What does \"dunya\" mean? It comes from \"lowliness\"!", 46.75, ["\"lowliness\""]),
    ("هي دنيئة جدًا", "It's truly lowly.", 49.1, ["truly lowly"]),
    ("هذا الشي أدركته ووعيت فيه وأنا على فراش الموت", "This is something I realised and took to heart on my deathbed.", 50.1, ["on my deathbed"]),
    ("أدركت أن الدنيا ما لها قيمة", "I realised the dunya has no value,", 54.9, ["no value"]),
    ("فصرت مؤمن بربي إيمان قوي", "so I came to believe in my Lord with strong faith.", 56.6, ["strong faith"]),
    ("صرت أريد الآخرة، وأسعى لها وأعد لها", "I began to want the Hereafter, to strive for it and prepare for it,", 58.75, ["the Hereafter"]),
    ("مع طبعاً أمور الدنيا", "along with worldly matters, of course,", 61.05, []),
    ("ولكن الآخرة هي الأساس", "but the Hereafter is the foundation,", 62.95, ["the foundation"]),
    ("وماخذة معظم قلبي", "and it has taken most of my heart.", 65.3, ["most of my heart"]),
]


def main():
    talk = []
    for i, (ar, en, s, keys) in enumerate(TALK):
        end = TALK[i + 1][2] - 0.08 if i + 1 < len(TALK) else SPEECH_END + 0.1
        for k in keys: assert k in en, (en, k)
        talk.append({"i": i, "ar": ar, "en": en, "keys": keys, "start": s, "end": round(end, 3)})
    length = round(round((CARD_FROM + CARD) * FPS) / FPS, 3)
    out = {"fps": FPS, "speechEnd": SPEECH_END, "clipEnd": CLIP_END, "cardFrom": CARD_FROM, "length": length,
           "closing": "The dunya is lowly. The Hereafter is the foundation.", "talk": talk}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {length:.2f} s ({round(length * FPS)} frames); speech to {SPEECH_END}; card from {CARD_FROM}")
    for p in talk: print(f"  {p['start']:6.2f}-{p['end']:6.2f} {p['en']}")


if __name__ == "__main__":
    main()
