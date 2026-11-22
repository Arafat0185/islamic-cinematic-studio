"""Video 001 draft 3: the storyboard, in one plan that the picture (TypeScript) and the sound (tools/mix_d3.py) share.

Narration: voice/blocks/*.wav (tools/narrate_blocks.py), each block one continuous Kokoro pass, placed WHOLE (never
cut inside), with its own word timings -> voice/voice3.wav, draft3/plan.json.

  0.0  recitation slot: 5 s of the courtyard at night, the lamp, a slow push-in; soft ambience only (no narration,
       no sound effects; a recitation will be added here later - none is written or generated)
  5.0  match cut: the lamp's glow -> the phone's alarm glow. The day (draft 2's story, +5 s), with glitch / whip /
       zoom-through transitions, speed ramps on the leap out of bed and the bus
  26.0 the phone goes dark; the sound fades to a short real silence; the cracked dots come to the centre on a hit;
       the hook
  31.x the flashbacks, a glitch cut on each key word
  41.x zoom-through into a cracked tracker dot -> the courtyard. From here: a camera change every 2-3 s, cut on words
       hadith, (star iris) weight -> "lost": the lamp snuffs out, (white flash) mercy: a swirl of gold light, the
       cracks heal, (whip) the turn: walk to the mat, takbir, the next prayer; the signature ending; sources card

Run from engine/:  .venv-tts/Scripts/python tools/plan_video001_d3.py ../videos/001-the-first-question
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

FPS, SR = 30, 24000
INTRO = 5.0
D = INTRO  # the day's times are draft 2's + 5 s

ANCHORS = {
    "fajrTone": D + 0.25, "alarmBuzz": D + 0.9, "label1min": D + 1.25, "fajrCrack": D + 1.9, "timeJump": D + 2.35,
    "alarmLoud": D + 2.85, "sitUp": D + 3.0, "jumpOut": D + 3.25, "land": D + 3.45, "cutStreet": D + 3.75,
    "car1": D + 4.35, "horn": D + 5.05, "phoneCheck": D + 5.45, "bus": D + 6.0, "cutOffice": D + 6.6,
    "dhuhrTone": D + 7.1, "wave": D + 7.7, "labelCall": D + 7.9, "dhuhrCrack": D + 8.9, "laptopPing": D + 11.0,
    "cutAsr": D + 12.2, "asrTone": D + 12.7, "asrCrack": D + 13.9,
    "cutGym": D + 15.7, "maghribTone": D + 16.1, "label5min": D + 16.5, "maghribCrack": D + 17.4,
    "cutNight": D + 18.0, "ishaTone": D + 18.4, "labelVideo": D + 18.9, "ishaCrack": D + 19.9, "clockLate": D + 20.4,
    "phoneOff": D + 21.0, "dotsCentre": D + 21.55,
}
# speed ramps: [real from, real to, power]; inside, the story's time runs slow first and fast after (endpoints fixed)
RAMPS = [(D + 3.05, D + 3.75, 2.2), (D + 5.75, D + 6.45, 2.0)]


def ramp_inv(s: float) -> float:
    """the real time at which the story reaches time s (inverse of the speed ramp)"""
    for a, b, p in RAMPS:
        if a <= s <= b: return a + (b - a) * ((s - a) / (b - a)) ** (1 / p)
    return s


def nearest_word(words, target, lo=-1e9, hi=1e9):
    c = [w for w in words if lo <= w["start"] <= hi]
    return min(c, key=lambda w: abs(w["start"] - target))["start"] if c else target


def main(video_dir: Path) -> None:
    blocks = json.loads((video_dir / "voice" / "blocks.json").read_text(encoding="utf-8"))
    A = dict(ANCHORS)
    place = {}  # block -> film time of its first sample
    place["money_job"] = D + 9.3 - 0.15
    place["followers"] = D + 14.25 - 0.15
    hook_at = A["dotsCentre"] + 0.55
    place["hook"] = hook_at
    hook_end = hook_at + blocks["hook"]["duration"]
    A["dotsBack"] = hook_end + 0.15
    place["chasing"] = hook_end + 0.35
    chasing_end = place["chasing"] + blocks["chasing"]["duration"]
    A["zoomDot"] = chasing_end + 0.2                     # zoom-through into a cracked dot -> the courtyard
    place["hadith"] = A["zoomDot"] + 0.7
    hadith_end = place["hadith"] + blocks["hadith"]["duration"]
    A["iris"] = hadith_end + 0.15
    place["weight"] = A["iris"] + 0.55
    weight_end = place["weight"] + blocks["weight"]["duration"]
    A["flash"] = weight_end + 0.95                       # white light flash into the mercy (after the dark "lost")
    place["mercy"] = A["flash"] + 0.35
    mercy_end = place["mercy"] + blocks["mercy"]["duration"]
    A["whipTurn"] = mercy_end + 0.3
    place["turn"] = A["whipTurn"] + 0.4
    turn_end = place["turn"] + blocks["turn"]["duration"]
    A["ending"] = turn_end + 0.55
    ENDING_SEC = 4.8
    duration = round(A["ending"] + ENDING_SEC, 3)
    A["card"] = A["ending"] + 1.6

    # every word at its film time
    words = []
    for name, b in blocks.items():
        for w in b["words"]:
            words.append({**w, "block": name, "start": round(w["start"] + place[name], 3), "end": round(w["end"] + place[name], 3)})
    words.sort(key=lambda w: w["start"])
    W = lambda block: [w for w in words if w["block"] == block]
    def word(block, w, k=0):
        hits = [x for x in W(block) if re.sub(r"[^\w']", "", x["word"]).lower() == w]
        return hits[k]["start"]
    A["firstWord"] = word("hook", "first"); A["lostWord"] = word("weight", "lost"); A["mercyWord"] = word("mercy", "mercy")
    A["voluntaryWord"] = word("mercy", "voluntary"); A["completedWord"] = word("mercy", "completed")
    A["hadithFirst"] = word("hadith", "first", 0); A["quoteStart"] = word("hadith", "indeed")
    A["standWord"] = word("turn", "stand"); A["nextWord"] = word("turn", "your", 0) if False else word("turn", "next", 1)
    A["walk"] = word("turn", "it's") - 0.05; A["walkEnd"] = A["walk"] + 2.2
    A["turnQibla"] = word("turn", "your") - 0.25; A["takbir"] = A["turnQibla"] + 0.6; A["nextPrayer"] = word("turn", "your") - 0.2
    v0, c0 = A["voluntaryWord"], A["completedWord"] + 0.25
    A["mends"] = [round(v0 + (c0 - v0) * k / 4, 3) for k in range(5)]
    A["snuff"] = A["lostWord"] + 0.12
    # flashback cuts on key words of the chasing block
    fb_words = [("we", 0), ("things", 0), ("never", 0), ("deadlines", 0), ("notifications", 0), ("plans", 0)]
    A["fb"] = [round(word("chasing", w, k) - 0.04, 3) for w, k in fb_words]
    A["fbEnd"] = A["zoomDot"]

    # courtyard shot cuts: on the word start nearest to evenly spaced targets (a change every 2-3 s)
    def cuts(t0, t1, n, block):
        ws = W(block)
        return [round(nearest_word(ws, t0 + (t1 - t0) * k / n, t0 + 1.4, t1 - 1.4) - 0.05, 3) for k in range(1, n)]
    shots = []
    hw = W("hadith")
    intro_cut = round(nearest_word(hw, (A["zoomDot"] + A["quoteStart"]) / 2, A["zoomDot"] + 2.0, A["quoteStart"] - 1.6) - 0.05, 3)
    shots.append({"from": A["zoomDot"], "kinds": ["orbitHead", "archLow", "lampClose", "matDrift", "chestHand"],
                  "cuts": [intro_cut, round(A["quoteStart"] - 0.05, 3)] + cuts(A["quoteStart"], hadith_end, 3, "hadith")})
    shots.append({"from": A["iris"], "kinds": ["poolLow", "craneWide", "lampFlicker", "pushIn"], "cuts": cuts(place["weight"], weight_end, 4, "weight")})
    shots.append({"from": A["flash"], "kinds": ["craneThrough", "highFloor", "trackerUp", "wideSwirl", "healClose"], "cuts": cuts(place["mercy"], mercy_end, 5, "mercy")})
    shots.append({"from": A["whipTurn"], "kinds": ["mediumPush", "walkTrack", "takbirSide"], "cuts": [A["walk"] - 0.1, A["turnQibla"] - 0.15]})

    # the voice track: every block whole, with its fades
    voice = np.zeros(int(round(duration * SR)) + SR, np.float32)
    for name, at in place.items():
        a, sr = sf.read(video_dir / "voice" / "blocks" / f"{name}.wav", dtype="float32")
        i = int(round(at * SR)); voice[i:i + len(a)] += a
    sf.write(video_dir / "voice" / "voice3.wav", voice[: int(round(duration * SR))], SR, subtype="PCM_16")

    # transitions (picture) - the sound plan follows them
    T = [
        {"type": "match", "at": INTRO}, {"type": "glitch", "at": A["cutStreet"]}, {"type": "whip", "at": A["cutOffice"]},
        {"type": "glitch", "at": A["cutAsr"]}, {"type": "zoom", "at": A["cutGym"], "into": "phone"}, {"type": "whip", "at": A["cutNight"]},
        *[{"type": "glitch", "at": t} for t in A["fb"][1:]],
        {"type": "zoom", "at": A["zoomDot"], "into": "dot"}, {"type": "iris", "at": A["iris"]}, {"type": "flash", "at": A["flash"]},
        {"type": "whip", "at": A["whipTurn"]},
    ]

    # sound events
    ev = []
    add = lambda kind, t, **kw: ev.append({"kind": kind, "t": round(t, 3), **kw})
    for k in ("fajrTone", "dhuhrTone", "asrTone", "maghribTone", "ishaTone"): add("tone", A[k])
    for k in ("fajrCrack", "dhuhrCrack", "asrCrack", "maghribCrack", "ishaCrack"): add("crack", A[k])
    # the recitation slot (0-5 s) has no sound effects: the opening drop lands as the day begins
    add("drop", INTRO); add("drop", A["ending"] + 0.05)
    add("buzz", A["alarmBuzz"], dur=1.0); add("tick_whirr", A["timeJump"], dur=0.5); add("whoosh", A["timeJump"], dur=0.45)
    add("alarm", A["alarmLoud"], dur=0.7); add("whoosh", ramp_inv(A["jumpOut"]) - 0.08, dur=0.4); add("impact", ramp_inv(A["land"]))
    add("car", A["car1"]); add("horn", A["horn"]); add("riser", ramp_inv(A["bus"]) - 0.9, dur=0.9, soft=True); add("car", ramp_inv(A["bus"]), big=True)
    add("buzz", A["phoneCheck"], dur=0.35)
    add("swish", A["wave"]); add("ping", A["laptopPing"])
    for k in range(7): add("ping", A["cutAsr"] + 0.25 + k * 0.45, soft=True)
    add("buzz", A["cutAsr"] + 1.1, dur=0.3); add("buzz", A["asrCrack"] + 0.6, dur=0.3)
    for k in range(3): add("tap", A["labelVideo"] + 0.45 * k)
    add("tick_whirr", A["clockLate"], dur=0.55); add("click", A["phoneOff"])
    add("hit", A["dotsCentre"], sub=True); add("hit", A["firstWord"], soft=True, sub=True)
    for t in A["fb"]: add("cut", t)
    for t in A["fb"][1:]: add("glitch", t)
    for tr in T:
        if tr["type"] in ("whip", "glitch"): add("whoosh", tr["at"] - 0.12, dur=0.3, soft=tr["type"] == "glitch")
        if tr["type"] == "zoom": add("riser", tr["at"] - 1.1, dur=1.1); add("whoosh", tr["at"] - 0.2, dur=0.45)
        if tr["type"] == "iris": add("riser", tr["at"] - 0.9, dur=0.9, soft=True); add("shimmer", tr["at"] + 0.1, dur=0.7, soft=True)
        if tr["type"] == "flash": add("riser", tr["at"] - 0.85, dur=0.85); add("shimmer", tr["at"], dur=1.4)
        if tr["type"] == "match": add("shimmer", tr["at"], dur=0.5, soft=True)
    add("thud", A["snuff"]); add("hit", A["lostWord"], sub=True)
    add("hit", A["mercyWord"], soft=True, sub=True); add("shimmer", A["mercyWord"], dur=2.4)
    for t in A["mends"]: add("shimmer", t - 0.9, dur=1.1, soft=True); add("chime_soft", t)
    add("whoosh", A["walk"], dur=0.4, soft=True); add("swish", A["takbir"] + 0.2, soft=True)
    add("riser", A["ending"] - 0.6, dur=0.7, soft=True)

    beds = [{"kind": kind, "from": round(a, 3), "to": round(b, 3)} for a, b, kind in [
        (0.0, INTRO, "courtyard_intro"), (INTRO, A["timeJump"], "room_dawn"), (A["timeJump"], A["cutStreet"], "room_morning"),
        (A["cutStreet"], A["cutOffice"], "city"), (A["cutOffice"], A["cutAsr"], "office"), (A["cutAsr"], A["cutGym"], "city_afternoon"),
        (A["cutGym"], A["cutNight"], "gym"), (A["cutNight"], A["phoneOff"], "room_night"),
        (A["phoneOff"] + 0.18, A["dotsCentre"], "silence"), (A["dotsCentre"], A["fb"][0], "room_still"),
        *[(a, b, kind) for a, b, kind in zip(A["fb"], A["fb"][1:] + [A["zoomDot"]], ["fb_city", "fb_office", "fb_gym", "fb_office", "fb_city", "fb_city"])],
        (A["zoomDot"], duration, "courtyard")]]

    clock = [
        (0.0, 23 * 60 + 58), (INTRO - 0.01, 23 * 60 + 58), (INTRO, 5 * 60 + 12), (A["timeJump"], 5 * 60 + 13), (A["alarmLoud"], 7 * 60 + 48),
        (A["cutStreet"], 8 * 60 + 21), (A["cutOffice"], 8 * 60 + 23), (A["cutOffice"] + 0.01, 12 * 60 + 31), (A["cutAsr"], 12 * 60 + 33),
        (A["cutAsr"] + 0.01, 15 * 60 + 47), (A["cutGym"], 15 * 60 + 49), (A["cutGym"] + 0.01, 18 * 60 + 22), (A["cutNight"], 18 * 60 + 24),
        (A["cutNight"] + 0.01, 19 * 60 + 58), (A["clockLate"], 20 * 60 + 0), (A["phoneOff"], 23 * 60 + 41), (duration, 23 * 60 + 59),
    ]
    prayers = [{"name": n, "time": t, "crack": A[c]} for n, t, c in [("Fajr", 312, "fajrCrack"), ("Dhuhr", 751, "dhuhrCrack"),
               ("Asr", 947, "asrCrack"), ("Maghrib", 1102, "maghribCrack"), ("Isha", 1198, "ishaCrack")]]
    plan = {
        "fps": FPS, "duration": duration, "frames": int(round(duration * FPS)), "intro": INTRO,
        "ending": {"from": A["ending"], "sec": ENDING_SEC}, "ramps": RAMPS, "place": place,
        "words": words, "anchors": A, "clock": clock, "prayers": prayers, "transitions": T, "shots": shots,
        "sound": {"events": sorted(ev, key=lambda e: e["t"]), "beds": beds, "voice": "voice/voice3.wav"},
    }
    (video_dir / "draft3").mkdir(exist_ok=True)
    (video_dir / "draft3" / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"plan: {duration:.1f} s, {plan['frames']} frames, {len(words)} words, {len(ev)} sound events, {len(T)} transitions")
    for name, at in place.items(): print(f"  {name:10s} {at:6.2f} - {at + blocks[name]['duration']:6.2f}")
    for s in shots: print("  shots", s["kinds"], [round(c, 2) for c in s["cuts"]])


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
