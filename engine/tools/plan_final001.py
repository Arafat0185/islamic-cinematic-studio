"""Video 001, final version: ONE plan that the picture (src/scenes/final001/*) and the sound (tools/mix_final001.py) both
read, so every cut, crack, pop-out and sound effect lands on the same frame as the word it belongs to.

Voice: voice/final/NN.wav (tools/narrate_final.py), one continuous pass per script section, placed WHOLE (never cut).
Each block's real first sound (onset) and last sound (offset) are measured from the audio; word boundaries from Whisper
are snapped to the nearest dip in loudness (within 0.1 s), so a cut "on a word" lands where the word really starts.

Story (seconds are computed, see the printout):
  cold open   crash-zoom down into the night shopping street ("Your money", coins at the lens), office ("Your job",
              papers), the feed world ("Your followers", notification bubbles): three hard cuts on the words
  shatter     "None of it comes first": the frame freezes, cracks spread, it shatters toward the lens on "first",
              black silence, then FIRST slams in orange as a spotlight bangs on in the dark void
  question    the void: the prayer tracker lights up above him
  chase       a wall of calendars and sticky notes, a phone flooded with pings, an airport departures board
  push back   a continuous time-lapse (the clock never jumps): bedroom at dawn ("One more minute": Fajr cracks), a car
              in traffic through the afternoon ("After this call": Asr cracks), the sofa at night ("One more video":
              Isha cracks); Dhuhr and Maghrib light up as prayed
  courtyard   match cut: the phone's glow -> the lamp's glow. From the hadith on: a different framing every 2-3 s,
              calm transitions; "lost": the lamp is snuffed out, silence; the mercy re-lights it and mends the dots;
              the walk to the mat, takbir, the crane up and the star mark
  quiet       5 s of soft courtyard ambience only (a recitation is added on TikTok)
  end card    the Maktabatu Al-Ilm logo and the source

Run from engine/:  .venv-tts/Scripts/python tools/plan_final001.py ../videos/001-the-first-question
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

FPS, SR = 30, 24000
# silence between one block's last sound and the next block's first sound (seconds)
GAP_AFTER = {1: 0.15, 2: 1.0, 3: 0.3, 4: 0.2, 5: 1.0, 6: 0.6, 7: 1.3, 8: 0.6}
START = 0.80          # the first word's first sound (the crash-zoom dives for 0.8 s before "Your money")
ENDING_LEN, QUIET_LEN, CARD_LEN = 3.5, 5.0, 5.0
REVERB_BLOCKS = {6, 7, 8, 9}  # the courtyard part


def envelope(a):
    return np.sqrt(np.convolve(a ** 2, np.ones(240) / 240, "same"))


def main(video_dir: Path) -> None:
    meta = json.loads((video_dir / "voice" / "final.json").read_text(encoding="utf-8"))
    blocks, words, t = [], [], None
    for k in sorted(meta, key=int):
        n, b = int(k), meta[k]
        a, sr = sf.read(video_dir / "voice" / "final" / f"{n:02d}.wav", dtype="float32")
        e = envelope(a); loud = np.flatnonzero(e > e.max() * 10 ** (-40 / 20))
        onset, offset = loud[0] / sr, loud[-1] / sr
        on_film = START if t is None else t
        at = on_film - onset                                     # where the file's sample 0 goes
        blocks.append({"block": n, "file": f"voice/final/{n:02d}.wav", "at": round(at, 4), "onset": round(on_film, 4),
                       "offset": round(at + offset, 4), "reverb": n in REVERB_BLOCKS})
        # word starts snapped to the quietest point within 0.1 s of Whisper's boundary (the first word: the onset)
        ws = b["words"]
        for i, w in enumerate(ws):
            if i == 0: s = onset
            else:
                lo, hi = int(max(0, w["start"] - 0.1) * sr), int(min(len(a) / sr, w["start"] + 0.1) * sr)
                s = (lo + int(np.argmin(e[lo:hi]))) / sr if hi > lo else w["start"]
                s = max(s, words[-1]["start"] - at + 0.04)
            words.append({"block": n, "word": w["word"], "start": round(at + s, 3), "end": round(at + max(s + 0.05, w["end"]), 3)})
        for i in range(len(words) - 1):
            if words[i + 1]["block"] == n and words[i]["block"] == n: words[i]["end"] = min(words[i]["end"], words[i + 1]["start"])
        words[-1]["end"] = round(at + offset, 3)
        t = at + offset + GAP_AFTER.get(n, 0)
    B = {b["block"]: b for b in blocks}

    def W(block, text, nth=1):
        """film time of the nth word in a block whose text starts with `text` (punctuation ignored)"""
        c = [w for w in words if w["block"] == block and w["word"].strip('"“”.,:?!').lower().startswith(text.lower())]
        return c[nth - 1]["start"]

    A = {}
    # ---- cold open ----
    A["money"] = W(1, "money"); A["your2"] = W(1, "your", 2); A["job"] = W(1, "job"); A["your3"] = W(1, "your", 3)
    A["followers"] = W(1, "followers")
    A["freeze"] = B[2]["onset"]; A["first"] = W(2, "first"); A["shatterEnd"] = A["first"] + 0.42
    A["slam"] = B[3]["onset"] - 0.62                 # black silence, then FIRST slams and the spotlight bangs on
    A["about"] = W(3, "about")
    # ---- chase ----
    A["chase"] = B[4]["onset"]; A["deadlines"] = W(4, "deadlines"); A["notifications"] = W(4, "notifications"); A["plans"] = W(4, "plans")
    # ---- push back ----
    A["pushBack"] = B[5]["onset"]; A["back"] = W(5, "back"); A["minute"] = W(5, "minute"); A["one1"] = W(5, "one", 1)
    A["after"] = W(5, "after"); A["call"] = W(5, "call"); A["one2"] = W(5, "one", 2); A["video"] = W(5, "video")
    A["matchCut"] = B[5]["offset"] + 0.45
    # ---- courtyard ----
    A["hadith"] = B[6]["onset"]; A["prophet"] = W(6, "prophet"); A["told"] = W(6, "told"); A["indeed"] = W(6, "indeed")
    A["deed"] = W(6, "deed"); A["account"] = W(6, "account"); A["salat"] = W(6, "salat"); A["hadithEnd"] = B[6]["offset"]
    A["weight"] = B[7]["onset"]; A["succeeded"] = W(7, "succeeded"); A["lacking"] = W(7, "lacking"); A["failed"] = W(7, "failed")
    A["lost"] = W(7, "lost"); A["lostEnd"] = B[7]["offset"]
    A["mercy"] = B[8]["onset"]; A["allah"] = W(8, "allah"); A["merciful"] = W(8, "merciful"); A["obligatory"] = W(8, "obligatory")
    A["he"] = W(8, "he"); A["look"] = W(8, "look"); A["voluntary"] = W(8, "voluntary"); A["and8"] = W(8, "and")
    A["completed"] = W(8, "completed"); A["mercyEnd"] = B[8]["offset"]
    A["turn"] = B[9]["onset"]; A["perfect"] = W(9, "perfect"); A["its"] = W(9, "it's"); A["stand"] = W(9, "stand")
    A["nextOne"] = W(9, "next", 1); A["your9"] = W(9, "your"); A["closer"] = W(9, "closer"); A["think"] = W(9, "think")
    A["voiceEnd"] = B[9]["offset"]
    A["takbir"] = A["think"] + 0.05
    A["ending"] = B[9]["offset"] + 0.35
    A["quiet"] = A["ending"] + ENDING_LEN
    A["card"] = A["quiet"] + QUIET_LEN
    total = A["card"] + CARD_LEN
    frames = int(round(total * FPS))

    A["split"] = (A["matchCut"] + A["indeed"]) / 2   # lamp close / arch low: an even split of the opening of the hadith
    # ---- shots: kind, set, [from, to) ----
    S = lambda kind, st, a, b: {"kind": kind, "set": st, "from": round(a, 4), "to": round(b, 4)}
    shots = [
        S("crash", "street", 0.0, A["money"]),
        S("shopsTrack", "street", A["money"], A["your2"]),
        S("officeDutch", "office", A["your2"], A["your3"]),
        S("feedOrbit", "feed", A["your3"], A["freeze"]),
        S("freeze", "feed", A["freeze"], A["slam"]),          # the frozen frame (the last frame of feedOrbit), cracking, shattering
        S("voidLow", "void", A["slam"], A["about"]),
        S("voidHigh", "void", A["about"], A["chase"]),
        S("deadlinesTrack", "deadlines", A["chase"], A["notifications"]),
        S("phonePOV", "void", A["notifications"], A["plans"]),  # the phone fills the frame; the void's dark bokeh behind
        S("airportBoard", "airport", A["plans"], A["pushBack"]),
        S("bedLapse", "bedroom", A["pushBack"], A["one1"]),
        S("bedClose", "bedroom", A["one1"], A["after"]),
        S("carCall", "car", A["after"], A["one2"]),
        S("sofaPhone", "sofa", A["one2"], A["matchCut"]),
        # the courtyard: a different framing every 2-3 s
        S("lampClose", "courtyard", A["matchCut"], A["split"]),
        S("archLow", "courtyard", A["split"], A["indeed"]),
        S("orbitHead", "courtyard", A["indeed"], A["account"]),
        S("chestHand", "courtyard", A["account"], A["weight"]),
        S("poolLow", "courtyard", A["weight"], A["failed"]),
        S("lampFlicker", "courtyard", A["failed"], A["mercy"]),
        S("wideSwirl", "courtyard", A["mercy"], A["he"]),
        S("trackerUp", "courtyard", A["he"], A["and8"]),
        S("healClose", "courtyard", A["and8"], A["turn"]),
        S("mediumPush", "courtyard", A["turn"], A["its"]),
        S("walkTrack", "courtyard", A["its"], A["your9"]),
        S("takbirSide", "courtyard", A["your9"], A["ending"]),
        S("ending", "courtyard", A["ending"], A["quiet"]),
        S("quiet", "courtyard", A["quiet"], A["card"]),
        S("card", "courtyard", A["card"], total),
    ]
    # the walk to the mat, the turn to the qibla and the takbir
    A["walk"] = A["stand"] - 0.2; A["walkEnd"] = A["your9"] + 0.3; A["turnQibla"] = A["closer"] - 0.1

    # ---- transitions (motivated) ----
    T = lambda typ, at, **k: {"type": typ, "at": round(at, 4), **k}
    transitions = [
        T("crashLand", A["money"]), T("whip", A["your2"]), T("zoom", A["your3"], into="laptop"),
        T("shatter", A["first"]), T("slam", A["slam"]), T("punch", A["about"]),
        T("glitch", A["chase"]), T("whip", A["notifications"], dir="down"), T("zoom", A["plans"], into="ping"),
        T("glitch", A["pushBack"]), T("punch", A["one1"]), T("whip", A["after"]), T("glitch", A["one2"]),
        T("match", A["matchCut"], what="phone glow -> lamp glow"),
        T("soft", A["split"]), T("soft", A["indeed"]), T("soft", A["account"]), T("iris", A["weight"]),
        T("soft", A["failed"]), T("flash", A["mercy"] + 0.02), T("soft", A["he"]), T("soft", A["and8"]),
        T("match", A["turn"], what="moon"), T("soft", A["its"]), T("soft", A["your9"]),
    ]

    # ---- the clock: one smooth time-lapse 05:02 -> 22:40 across the push-back beats, never jumping ----
    lapse0, lapse1 = A["pushBack"], A["matchCut"]
    clock = [[0.0, 4 * 60 + 58], [lapse0, 5 * 60 + 2], [A["after"], 9 * 60 + 40], [A["one2"], 18 * 60 + 25], [lapse1, 22 * 60 + 40]]
    # prayers: [name, time (min)], when the dot cracks (missed) or lights (prayed)
    prayers = [["Fajr", 5 * 60 + 13], ["Dhuhr", 12 * 60 + 31], ["Asr", 15 * 60 + 48], ["Maghrib", 18 * 60 + 4], ["Isha", 19 * 60 + 32]]
    cracks = {0: A["minute"], 2: A["call"], 4: A["video"]}
    mends = {0: A["voluntary"], 2: A["and8"], 4: A["completed"]}

    # ---- pop-outs (things flying at the lens) ----
    pops = [
        {"kind": "coins", "from": A["money"], "to": A["your2"]},
        {"kind": "papers", "from": A["job"] - 0.08, "to": A["your3"]},
        {"kind": "bubbles", "from": A["followers"] - 0.08, "to": A["freeze"]},
        {"kind": "notes", "from": A["deadlines"] - 0.05, "to": A["notifications"]},
        {"kind": "pings", "from": A["notifications"], "to": A["plans"]},
        {"kind": "tickets", "from": A["plans"] + 0.15, "to": A["pushBack"]},
    ]

    # ---- the sound map: every sound tied to something seen or said ----
    fx = []
    E = lambda t0, kind, g=0.0, pan=0.0: fx.append({"t": round(t0, 4), "kind": kind, "gain": g, "pan": pan})
    E(0.0, "riser_short", -4)                                   # the dive starts
    E(A["money"] - 0.02, "impact_big", 0); E(A["money"], "sub_drop", -2)
    for i in range(7): E(A["money"] + 0.05 + i * 0.055, "coin", -9, (-0.6 + 0.2 * i))
    E(A["your2"] - 0.12, "whoosh_fast", -4); E(A["your2"], "impact", -2)
    for i in range(5): E(A["job"] + i * 0.06, "paper", -10, (0.5 - 0.25 * i))
    E(A["job"] + 0.05, "keys", -12)
    E(A["your3"] - 0.18, "zoom_in", -5); E(A["your3"], "impact", -2)
    for i in range(6): E(A["followers"] + i * 0.07, "ping", -12, (-0.5 + 0.2 * i))
    E(A["freeze"], "freeze", -3)                                 # tape-stop: the world freezes
    for i, k in enumerate([0.0, 0.26, 0.5]): E(A["freeze"] + 0.08 + k * (A["first"] - A["freeze"]), "glass_crack", -5 + i, (-0.3 + 0.3 * i))
    E(A["first"] - 0.02, "shatter", 0); E(A["first"], "sub_drop", -2)
    E(A["slam"], "slam", 0); E(A["slam"], "spot_on", -6)
    E(A["about"], "whoosh_soft", -10)
    E(A["about"] + 0.3, "dots_on", -12)
    E(A["chase"] - 0.06, "glitch", -9); E(A["chase"], "impact", -9)  # softer: the cut lands on "You" and the word must stay clear
    for i in range(4): E(A["deadlines"] + i * 0.12, "paper", -11, (-0.5 + 0.3 * i))
    E(A["notifications"] - 0.1, "whoosh_fast", -5)
    for i in range(10): E(A["notifications"] + 0.04 + i * 0.065, "ping", -10 + (i % 3), (-0.6 + 0.13 * i))
    E(A["plans"] - 0.18, "zoom_in", -6); E(A["plans"], "impact", -4); E(A["plans"] + 0.1, "board_flap", -8)
    E(A["pushBack"] - 0.06, "glitch", -7); E(A["pushBack"], "lapse", -8)  # the time-lapse whirr runs to the match cut
    E(A["one1"], "punch_hit", -6)
    E(A["minute"] + 0.02, "dot_crack", -3)
    E(A["after"] - 0.12, "whoosh_fast", -5); E(A["after"], "impact", -5)
    E(A["call"] + 0.02, "dot_crack", -3)
    E(A["one2"] - 0.06, "glitch", -8); E(A["one2"], "impact", -6)
    E(A["video"] + 0.02, "dot_crack", -3)
    E(A["matchCut"] - 0.5, "riser", -10)
    E(A["matchCut"], "lamp_whoosh", -8)                          # into the courtyard: soft
    for k in ["split", "indeed", "account"]: E(A[k], "whoosh_soft", -14)
    E(A["weight"] - 0.25, "iris", -10)
    E(A["succeeded"], "hit_soft", -10)
    E(A["failed"], "whoosh_soft", -14); E(A["failed"] + 0.05, "hit_soft", -9)
    E(A["lost"], "snuff", -2); E(A["lost"], "sub_drop", -4)
    E(A["mercy"] - 0.8, "riser_soft", -12); E(A["mercy"] + 0.02, "relight", -6)
    E(A["merciful"], "shimmer_soft", -12)
    for d in mends.values(): E(d, "mend", -9)
    for k in ["he", "and8", "turn", "its", "your9"]: E(A[k], "whoosh_soft", -15)
    E(A["walk"] + 0.2, "steps", -14)
    E(A["takbir"], "cloth", -12)
    E(A["ending"], "rise_air", -12)
    E(A["card"], "card_in", -12)
    for i, s in enumerate(shots):
        if s["set"] == "courtyard" and s["kind"] == "lampFlicker": E(s["from"] + 0.3, "flicker", -12)

    # ---- ambience beds per location (crossfade 0.12 s at each cut, none during the black silence) ----
    BED_OF = {"crash": "city_night", "shopsTrack": "city_night", "officeDutch": "office", "feedOrbit": "feed", "freeze": None,
              "voidLow": "void", "voidHigh": "void", "deadlinesTrack": "deadlines", "phonePOV": "phone", "airportBoard": "airport",
              "bedLapse": "bedroom", "bedClose": "bedroom", "carCall": "traffic", "sofaPhone": "sofa"}
    beds = []
    for s in shots:
        k = BED_OF.get(s["kind"], "courtyard")
        if s["kind"] == "card": k = "courtyard_soft"
        if s["kind"] == "freeze": continue
        if beds and beds[-1]["kind"] == k and abs(beds[-1]["to"] - s["from"]) < 1e-6: beds[-1]["to"] = s["to"]
        else: beds.append({"kind": k, "from": s["from"], "to": s["to"]})

    plan = {
        "fps": FPS, "frames": frames, "duration": round(total, 3), "voice": blocks, "words": words, "anchors": {k: round(v, 4) for k, v in A.items()},
        "shots": shots, "transitions": transitions, "clock": clock, "prayers": prayers,
        "cracks": {str(k): round(v, 4) for k, v in cracks.items()}, "mends": {str(k): round(v, 4) for k, v in mends.items()},
        "pops": pops, "sfx": sorted(fx, key=lambda e: e["t"]), "beds": beds,
        "silences": [[round(A["first"] + 0.42, 4), round(A["slam"], 4)], [round(A["lost"] + 0.5, 4), round(A["mercy"] - 0.8, 4)]],
        "quiet": [round(A["quiet"], 4), round(A["card"], 4)],
    }
    out = video_dir / "final"; out.mkdir(exist_ok=True)
    (out / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False), encoding="utf-8")

    # the narration as one track (blocks placed whole), for the mix
    n = int(total * SR) + SR
    track = np.zeros(n, np.float32); rv = np.zeros(n, np.float32)
    for b in blocks:
        a, sr = sf.read(video_dir / b["file"], dtype="float32")
        i = int(round(b["at"] * SR)); track[i:i + len(a)] += a
        if b["reverb"]: rv[i:i + len(a)] += a
    sf.write(out / "voice_dry.wav", track, SR, subtype="PCM_24")
    sf.write(out / "voice_court.wav", rv, SR, subtype="PCM_24")

    print(f"total {total:.2f} s = {frames} frames")
    for s in shots: print(f"  {s['from']:6.2f}-{s['to']:6.2f} ({s['to'] - s['from']:.2f} s) {s['set']:10s} {s['kind']}")
    print("longest shot (excluding quiet / card / ending):", max((s["to"] - s["from"], s["kind"]) for s in shots if s["kind"] not in ("quiet", "card", "ending")))


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
