"""Sound for "The First Question - QURAN" (Maryam 19:59-63; the video ends in the breath before 19:64). The recitation is NOT in this file: it is added in TikTok. Our track is
quiet so the recitation leads: soft pops on each caption reveal, soft whooshes on the cuts and camera moves, small story
sounds (dots, the phone, footsteps, takbir, the light returning) and light ambience per place. Every sound is
synthesized from filtered NOISE (the functions of mix_final001.py / mix_d3.py): no music, no instruments, no voice.

Reads videos/001-the-first-question/quran/timing.json and shots.json, the same files the picture reads, so every sound
lands on its frame. Writes two files:
  public/audio/quran001_mix.wav          the upload mix: -24 LUFS integrated, true peak <= -2 dBTP
  public/audio/quran001_preview_mix.wav  the same + the guide recitation (public/audio/guide/recitation_guide.mp4),
                                         ONLY for checking the sync; never upload
Run from engine/:  .venv-tts/Scripts/python tools/mix_quran001.py
"""
import json, subprocess, sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Pedalboard, Limiter, Gain
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mix_d3 import SR, rng, db, lp, hp, bp, noise, env, stereo, verb, ROOM, HALL, whoosh  # noqa: E402
from mix_final001 import bed, shimmer, ping, steps as _steps, cloth, relight, rise_air, card_in, iris, mend, true_peak  # noqa: E402

QDIR = HERE.parent.parent / "videos" / "001-the-first-question" / "quran"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "recitation_guide.mp4"
OUT = HERE.parent / "public" / "audio" / "quran001_mix.wav"
OUT_PREVIEW = HERE.parent / "public" / "audio" / "quran001_preview_mix.wav"
TARGET, TP_CEIL = -24.0, -2.0

timing = json.loads((QDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((QDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]
fr = lambda s: round(s * FPS) / FPS                                  # snap to the picture's frames (as timeline.ts)
TOTAL = timing["guide"]["recitationEnd"]                             # the end of the video: in the breath before 19:64
CARD = TOTAL - story["events"]["cardFadeSeconds"]                    # the end card crossfades in from here
PH = [{**p, "from": fr(p["start"]), "voice_s": p["voice"]} for p in timing["phrases"]]
REC_END = fr(timing["guide"]["recitationEnd"])
ev = lambda e: fr(e if isinstance(e, (int, float)) else timing["phrases"][e["phrase"]]["voice"] + e["plus"])
E = story["events"]
SHOTS = []
for s in story["shots"]:
    t = PH[s["phrase"]]["from"] if "phrase" in s else fr(s["at"])
    SHOTS.append({"kind": s["kind"], "set": s["set"], "from": t})
for i, s in enumerate(SHOTS): s["to"] = SHOTS[i + 1]["from"] if i + 1 < len(SHOTS) else TOTAL


# ---------------- soft one-shots (noise only) ----------------
def pop(k=1.0):
    """a caption reveal: a soft, rounded 'puff' with a tiny airy tick on top (no tone)"""
    n = int(0.16 * SR); t = np.arange(n) / SR
    body = lp(noise(n), 900) * np.exp(-t / 0.035) * np.minimum(1, t / 0.004) * 0.9
    tick = bp(noise(n), 2500, 7500) * np.exp(-t / 0.006) * 0.35
    return verb(stereo((body + tick) * k), ROOM) * db(-10)

def tick(k=1.0, pan=0.0):
    """a dot dimming / a small UI tick"""
    n = int(0.05 * SR)
    return stereo(bp(noise(n), 1500, 5000) * np.exp(-np.arange(n) / (0.004 * SR)) * 0.7 * k, pan) * db(-12)

def whoosh_soft():
    return whoosh(0.55, soft=True) * db(-6)

def flip_tap():
    """the phone turned over and laid face-down: a quick slide of cloth-like noise, then a soft muffled tap"""
    n = int(0.6 * SR); t = np.arange(n) / SR
    slide = bp(noise(n), 700, 4000) * np.sin(np.pi * np.minimum(1, t / 0.3)) ** 2 * (t < 0.3) * 0.35
    tap = lp(noise(n), 600) * np.exp(-np.maximum(0, t - 0.4) / 0.02) * (t >= 0.4) * 0.9
    return verb(stereo(slide + tap), ROOM) * db(-8)

def footsteps(times):
    out = np.zeros((2, int(4 * SR)))
    for k, t0 in enumerate(times):
        m = int(0.08 * SR); i = int(t0 * SR)
        x = lp(noise(m), 1400) * np.exp(-np.arange(m) / (0.012 * SR)) * 0.7
        out[:, i:i + m] += stereo(x, 0.15 * (-1) ** k)
    return verb(out, ROOM) * db(-10)


def main():
    n = int(TOTAL * SR) + 1
    # ---------------- beds: one per place, crossfaded at the cuts ----------------
    kinds = {"street": "city_night", "office": "office", "void": "void", "bedroom": "bedroom", "courtyard": "courtyard"}
    spans = []
    for s in SHOTS:
        k = kinds[s["set"]]
        if s["kind"] == "ending": k = "courtyard_soft"
        if spans and spans[-1][0] == k: spans[-1][2] = s["to"]
        else: spans.append([k, s["from"], s["to"]])
    beds = np.zeros((2, n)); XF = int(0.3 * SR)
    for k, a_s, z_s in spans:
        a, z = int(a_s * SR), min(n, int(z_s * SR))
        a0, z0 = max(0, a - XF // 2), min(n, z + XF // 2)
        x = bed(k, z0 - a0)
        if k == "void": x = x * db(10)                               # the void's bed is nearly silent: lift it a little
        r = np.ones(z0 - a0); m = min(XF, (z0 - a0) // 2)
        r[:m] = np.sin(np.linspace(0, np.pi / 2, m)) ** 2; r[-m:] = np.cos(np.linspace(0, np.pi / 2, m)) ** 2
        if a0 == 0: r[:m] = 1
        beds[:, a0:z0] += x * r
    # the courtyard before dawn is quieter; it opens up with the light at takbir; the card fades to silence
    tk = ev(E["takbir"]); t = np.arange(n) / SR
    court_from = next(s["from"] for s in SHOTS if s["set"] == "courtyard")
    open_up = np.where(t < court_from, 1.0, 0.6 + 0.4 * np.clip((t - tk) / 2.0, 0, 1))
    tail = np.clip((TOTAL - 0.05 - t) / (TOTAL - 0.05 - CARD), 0, 1) ** 1.5   # the ambience fades out under the card
    beds *= (open_up * tail) * db(-6)

    # ---------------- effects ----------------
    fx = np.zeros((2, n))
    def put(x, at, g=0.0):
        i = int(at * SR)
        if i < 0: x = x[:, -i:]; i = 0
        m = min(x.shape[1], n - i)
        if m > 0: fx[:, i:i + m] += x[:, :m] * db(g)
    for p in PH: put(pop(1.0 if not p["repeat"] else 0.9), p["from"] + 0.02)      # every caption reveal (repeats too)
    for s in SHOTS[1:]:
        put(whoosh_soft(), s["from"] - 0.32)                                      # each cut lands on the whoosh's peak
    irises = [PH[3]["from"] - 7 / FPS, PH[4]["from"] - 7 / FPS]
    for a in irises: put(iris(), a, -6)
    for i, d in enumerate(E["dims"]): put(tick(0.8, -0.5 + 0.25 * i), fr(d), -2)  # the five dots dim, left to right
    put(tick(0.7), fr(0.35), -4)                                                    # the tracker appears
    ph = next(s for s in SHOTS if s["kind"] == "phoneDown")
    for i in range(3): put(ping(soft=True), ph["from"] + 0.1 + 0.12 * i, -12)      # the notifications on the lock screen
    put(flip_tap(), fr(E["flip"]))
    wa, wb = E["walk"]; put(footsteps([0.1 + k * (wb - wa) / 4 for k in range(4)]), fr(wa))
    put(cloth(), tk - 0.05, -6); put(relight(), tk + 0.05, -10)                    # takbir: sleeves rise; the warm light returns
    put(tick(1.0), ev(E["fajrGlow"]), 0); put(mend(), ev(E["fajrGlow"]), -10)      # the Fajr dot glows orange
    ca, cb = E["craneUp"]; put(rise_air(cb - ca + 0.6), fr(ca) - 0.3, -6); put(shimmer(1.6, soft=True), fr(ca) + 0.8, -8)
    put(card_in(), CARD, -4)
    fx *= np.clip((TOTAL - 0.02 - t) / 0.25, 0, 1)                                # nothing rings past the last frame
    # moving shots get a very soft air swell over their move (camera moves, not only cuts)
    for s in SHOTS:
        if s["kind"] in ("street", "arcade"):
            d = s["to"] - s["from"]; m = int(d * SR); tt = np.arange(m) / SR
            put(verb(stereo(lp(noise(m), 700) * np.sin(np.pi * tt / d) ** 2 * 0.25), HALL), s["from"], -14)
    mixd = beds + fx

    # ---------------- master: -24 LUFS, true peak <= -2 dBTP ----------------
    meter = pyln.Meter(SR)
    g = TARGET - meter.integrated_loudness(mixd.T)
    def master(gain):
        up = resample_poly(mixd * db(gain), 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=TP_CEIL - 0.6, release_ms=120)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    for _ in range(10):
        y = master(g); L = meter.integrated_loudness(y.T)
        if abs(L - TARGET) < 0.05: break
        g += TARGET - L
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    print(f"{OUT.name}: {y.shape[1] / SR:.2f} s, {meter.integrated_loudness(y.T):.2f} LUFS, true peak {20 * np.log10(true_peak(y)):.2f} dBTP")

    # ---------------- preview: + the guide recitation (sync check only) ----------------
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(GUIDE), "-map", "0:a", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    gd = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T
    gd = np.pad(gd, ((0, 0), (0, max(0, n - gd.shape[1]))))[:, :n]
    pv = gd + y
    pk = true_peak(pv)
    if pk > db(-1): pv = pv * (db(-1) / pk)
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: {pv.shape[1] / SR:.2f} s, {meter.integrated_loudness(pv.T):.2f} LUFS (guide + ours; NOT for upload)")


if __name__ == "__main__":
    main()
