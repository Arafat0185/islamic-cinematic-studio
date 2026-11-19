"""Video 001 draft 2 - "A day of chasing": the storyboard and the re-timed narration, in one place.

This script is the single source of timing for the draft. It
  1. cuts the existing narration (voice/voice.wav + words.json) into its sentences and places each sentence at a new
     time in the story (long pauses trimmed; the audio of each sentence is kept intact) -> voice/voice2.wav
  2. writes words2.json: every script word with its new start / end (seconds of the film)
  3. writes plan.json: the film length, the sentences (with word times), the story's named moments (anchors), the
     clock keyframes for the prayer tracker, the scene spans and the sound events. The video (TypeScript) and the
     sound mix (tools/mix_d2.py) both read plan.json, so picture and sound line up exactly.

Story (seconds of the film):
  0.0  Fajr, pre-dawn bedroom: a soft distant tone; the phone alarm buzzes; "1 more minute"; the Fajr dot cracks
  2.35 the clock races to 07:48; a loud alarm; he jumps out of bed
  3.6  city street: rushing, cars, a horn
  6.6  office, Dhuhr: on a video call; the tone; he waves it off ("after this call"); crack;
       narration: "Before your money." "Before your job."
  12.2 street, Asr: walking on his phone, notifications swarm; the tone; crack; "Before your followers."
  15.7 gym, Maghrib: running on the treadmill; the tone; "5 more minutes"; crack
  18.0 bedroom, night, Isha: scrolling in bed; the tone; "one more video"; crack; the clock runs late; the phone goes
       dark. Silence. The cracked dots come to the centre: "There is one thing you will be asked about first."
  25.4 flashbacks of the day under "We spend our days chasing..." / "Deadlines." / "Notifications." / "Plans..."
  33.4 star iris into the courtyard: the hadith (exact quote, source tag), the weight, the mercy (gold lights rise
       and mend the cracked dots), the turn (he walks to the mat, takbir; the clock shows the next prayer), the
       signature ending and the sources card.

Run from engine/:  .venv-tts/Scripts/python tools/plan_video001_d2.py ../videos/001-the-first-question
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

FPS = 30
PRE, POST = 0.04, 0.16  # audio kept before the first word / after the last word of a sentence (seconds)

# where each narration sentence starts in the film (index = sentence number in the script, 0-based)
SENTENCE_AT = {
    0: 9.30,   # Before your money.            (office, after the Dhuhr crack)
    1: 10.95,  # Before your job.
    2: 14.25,  # Before your followers.        (street, Asr, notifications)
    3: 22.40,  # There is one thing ... first. (night, after the silence, cracked dots in the centre)
    4: 25.40,  # We spend our days chasing ... (flashbacks)
    5: 30.10,  # Deadlines.
    6: 30.95,  # Notifications.
    7: 31.90,  # Plans for next year.
    8: 33.80,  # But the Prophet ... first:    (courtyard)
    9: 39.05,  # "Indeed the first deed ..."
    10: 45.90, # He ... succeeded, ... lost.
    11: 54.80, # But then comes the mercy.
    12: 56.65, # If something is missing ...
    13: 60.80, # look, does My servant have voluntary prayers?
    14: 63.80, # And with them, what was lacking is completed.
    15: 67.60, # So the question isn't whether you're perfect.
    16: 70.40, # It's whether you'll stand up for the next one.
    17: 72.80, # Your next prayer is closer than you think.
}
ENDING_FROM, ENDING_SEC, CARD_AFTER = 75.6, 4.8, 1.6

ANCHORS = {
    # day
    "fajrTone": 0.25, "alarmBuzz": 0.9, "label1min": 1.25, "fajrCrack": 1.9, "timeJump": 2.35, "alarmLoud": 2.85,
    "jumpOut": 3.1, "land": 3.32, "cutStreet": 3.6, "car1": 4.25, "horn": 5.0, "phoneCheck": 5.4, "bus": 5.95,
    "cutOffice": 6.6, "dhuhrTone": 7.1, "wave": 7.7, "labelCall": 7.9, "dhuhrCrack": 8.9, "laptopPing": 11.0,
    "cutAsr": 12.2, "asrTone": 12.7, "asrCrack": 13.9,
    "cutGym": 15.7, "maghribTone": 16.1, "label5min": 16.5, "maghribCrack": 17.4,
    "cutNight": 18.0, "ishaTone": 18.4, "labelVideo": 18.9, "ishaCrack": 19.9, "clockLate": 20.4, "phoneOff": 21.0,
    "dotsCentre": 21.9, "dotsBack": 25.0,
    # flashbacks (hard cuts)
    "fb1": 25.4, "fb2": 27.2, "fb3": 28.6, "fbDeadlines": 30.05, "fbNotif": 30.9, "fbPlans": 31.85,
    # courtyard
    "iris": 33.4, "trackerHide": 33.4, "trackerShow": 45.6, "whip1": 45.6, "whip2": 54.5, "whip3": 67.25,
    "walk": 69.9, "walkEnd": 72.1, "turnQibla": 72.5, "takbir": 73.1, "nextPrayer": 72.6,
    "ending": ENDING_FROM, "card": ENDING_FROM + CARD_AFTER,
}

# the prayer tracker's clock: (film seconds, minutes after midnight); linear between keys, flat after the last
CLOCK = [
    (0.0, 5 * 60 + 12), (2.35, 5 * 60 + 13), (2.85, 7 * 60 + 48), (3.6, 8 * 60 + 21), (6.6, 8 * 60 + 23),
    (6.61, 12 * 60 + 31), (12.2, 12 * 60 + 33), (12.21, 15 * 60 + 47), (15.7, 15 * 60 + 49), (15.71, 18 * 60 + 22),
    (18.0, 18 * 60 + 24), (18.01, 19 * 60 + 58), (20.4, 20 * 60 + 0), (21.0, 23 * 60 + 41), (80.0, 23 * 60 + 56),
]
PRAYERS = [("Fajr", 5 * 60 + 12), ("Dhuhr", 12 * 60 + 31), ("Asr", 15 * 60 + 47), ("Maghrib", 18 * 60 + 22), ("Isha", 19 * 60 + 58)]
CRACKS = ["fajrCrack", "dhuhrCrack", "asrCrack", "maghribCrack", "ishaCrack"]

# scenes: [from, to, set, time-of-day / state]
SCENES = [
    (0.0, 3.6, "bedroom", "dawn"), (3.6, 6.6, "street", "morning"), (6.6, 12.2, "office", "noon"),
    (12.2, 15.7, "street", "afternoon"), (15.7, 18.0, "gym", "sunset"), (18.0, 25.4, "bedroom", "night"),
    (25.4, 27.2, "street", "morning"), (27.2, 28.6, "office", "noon"), (28.6, 30.05, "gym", "sunset"),
    (30.05, 30.9, "office", "noon"), (30.9, 31.85, "street", "afternoon"), (31.85, 33.4, "street", "morning"),
    (33.4, None, "courtyard", "night"),
]


def sentences(words):
    out, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r'[.?!:]["”]?$', w["word"]):
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out


def main(video_dir: Path) -> None:
    words = json.loads((video_dir / "words.json").read_text(encoding="utf-8"))["words"]
    voice, sr = sf.read(video_dir / "voice" / "voice.wav", dtype="float32")
    sents = sentences(words)
    assert len(sents) == len(SENTENCE_AT), f"{len(sents)} sentences in the script, {len(SENTENCE_AT)} placed"
    duration = ENDING_FROM + ENDING_SEC
    out = np.zeros(int(round(duration * sr)) + sr, np.float32)
    plan_sents, words2 = [], []
    for i, s in enumerate(sents):
        # the source span: a little before the first word / after the last, never into a neighbouring sentence
        s0, s1 = s[0]["start"] - PRE, s[-1]["end"] + POST
        if i > 0: s0 = max(s0, (sents[i - 1][-1]["end"] + s[0]["start"]) / 2)
        if i + 1 < len(sents): s1 = min(s1, (s[-1]["end"] + sents[i + 1][0]["start"]) / 2)
        clip = voice[int(s0 * sr): int(s1 * sr)]
        at = SENTENCE_AT[i]                 # film time of the first word
        dst = int(round((at - (s[0]["start"] - s0)) * sr))
        out[dst: dst + len(clip)] += clip
        shift = at - s[0]["start"]
        ws = [{"section": w["section"], "word": w["word"], "start": round(w["start"] + shift, 3), "end": round(w["end"] + shift, 3)} for w in s]
        words2 += ws
        plan_sents.append({"index": i, "section": s[0]["section"], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    # no two sentences may overlap
    for a, b in zip(plan_sents, plan_sents[1:]):
        assert b["start"] > a["end"] + 0.2, f"sentences {a['index']} and {b['index']} overlap"
    out = out[: int(round(duration * sr))]
    sf.write(video_dir / "voice" / "voice2.wav", out, sr, subtype="PCM_16")

    word = lambda sec, w: next(x for x in words2 if x["section"] == sec and re.sub(r"[^\w']", "", x["word"]).lower() == w)
    anchors = dict(ANCHORS)
    anchors.update({
        "firstWord": word(2, "first")["start"], "lostWord": word(5, "lost")["start"], "succeededWord": word(5, "succeeded")["start"],
        "mercyWord": word(6, "mercy")["start"], "voluntaryWord": word(6, "voluntary")["start"], "completedWord": word(6, "completed")["start"],
    })
    # the gold lights mend the five cracked dots one by one, the last as "completed" is said
    v, c = anchors["voluntaryWord"], anchors["completedWord"]
    anchors["mends"] = [round(v + (c - v) * k / 4, 3) for k in range(5)]

    # sound events (seconds): name, time, extra
    ev = []
    add = lambda kind, t, **kw: ev.append({"kind": kind, "t": round(t, 3), **kw})
    for k in ("fajrTone", "dhuhrTone", "asrTone", "maghribTone", "ishaTone"): add("tone", anchors[k])
    for k in CRACKS: add("crack", anchors[k])
    add("buzz", anchors["alarmBuzz"], dur=1.0); add("tick_whirr", anchors["timeJump"], dur=0.5)
    add("whoosh", anchors["timeJump"] + 0.02, dur=0.5); add("alarm", anchors["alarmLoud"], dur=0.75)
    add("whoosh", anchors["jumpOut"] - 0.05, dur=0.35); add("impact", anchors["land"])
    for k in ("cutStreet", "cutOffice", "cutAsr", "cutGym", "cutNight"): add("whoosh", anchors[k] - 0.12, dur=0.3)
    add("car", anchors["car1"]); add("horn", anchors["horn"]); add("car", anchors["bus"], big=True); add("buzz", anchors["phoneCheck"], dur=0.35)
    add("swish", anchors["wave"]); add("ping", anchors["laptopPing"])
    for k in range(7): add("ping", anchors["cutAsr"] + 0.25 + k * 0.45, soft=True)
    add("buzz", anchors["cutAsr"] + 1.1, dur=0.3); add("buzz", anchors["asrCrack"] + 0.6, dur=0.3)
    add("tap", anchors["labelVideo"]); add("tap", anchors["labelVideo"] + 0.45); add("tap", anchors["labelVideo"] + 0.9)
    add("tick_whirr", anchors["clockLate"], dur=0.55); add("click", anchors["phoneOff"])
    add("hit", anchors["dotsCentre"]); add("hit", anchors["firstWord"], soft=True)
    for k in ("fb1", "fb2", "fb3", "fbDeadlines", "fbNotif", "fbPlans"): add("cut", anchors[k])
    add("whoosh", anchors["iris"] - 0.1, dur=0.5); add("shimmer", anchors["iris"] + 0.15, dur=0.6, soft=True)
    for k in ("whip1", "whip2", "whip3"): add("whoosh", anchors[k] - 0.1, dur=0.35, soft=True)
    add("hit", anchors["lostWord"]); add("shimmer", anchors["mercyWord"], dur=1.2)
    for t in anchors["mends"]: add("shimmer", t - 0.9, dur=1.1); add("chime_soft", t)
    add("whoosh", anchors["walk"], dur=0.4, soft=True); add("swish", anchors["takbir"] + 0.15, soft=True)
    add("drop", anchors["ending"])

    beds = [{"kind": kind, "from": f, "to": t} for f, t, kind in [
        (0.0, 2.35, "room_dawn"), (2.35, 3.6, "room_morning"), (3.6, 6.6, "city"), (6.6, 12.2, "office"),
        (12.2, 15.7, "city_afternoon"), (15.7, 18.0, "gym"), (18.0, 21.0, "room_night"),
        (21.0, 21.9, "silence"), (21.9, 25.4, "room_still"),
        (25.4, 27.2, "fb_city"), (27.2, 28.6, "fb_office"), (28.6, 30.05, "fb_gym"), (30.05, 30.9, "fb_office"),
        (30.9, 31.85, "fb_city"), (31.85, 33.4, "fb_city"), (33.4, duration, "courtyard")]]

    plan = {
        "fps": FPS, "duration": duration, "frames": int(round(duration * FPS)), "ending": {"from": ENDING_FROM, "sec": ENDING_SEC},
        "sentences": plan_sents, "anchors": anchors, "clock": CLOCK,
        "prayers": [{"name": n, "time": t, "crack": anchors[c]} for (n, t), c in zip(PRAYERS, CRACKS)],
        "scenes": [{"from": f, "to": t if t is not None else duration, "set": s, "state": st} for f, t, s, st in SCENES],
        "sound": {"events": ev, "beds": beds, "voice": "voice/voice2.wav"},
    }
    (video_dir / "draft2").mkdir(exist_ok=True)
    (video_dir / "draft2" / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False), encoding="utf-8")
    (video_dir / "draft2" / "words2.json").write_text(json.dumps({"source": "voice/voice2.wav", "words": words2}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"plan: {duration:.1f} s, {plan['frames']} frames, {len(plan_sents)} sentences, {len(ev)} sound events")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
