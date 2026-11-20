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
from mix_final001 import bed, shimmer, ping, steps as _steps, cloth, relight, rise_air, card_in, iris, mend, true_peak  # noqa: F401  # noqa: E402

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

def buzz():
    """a phone vibrating on wood: a short pulsed rumble of low noise (no tone)"""
    n = int(0.3 * SR); t = np.arange(n) / SR
    return verb(stereo(lp(noise(n), 260) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * t))) * np.sin(np.pi * t / 0.3) ** 0.5 * 0.8), ROOM) * db(-6)

def water(dur):
    """a tap running over hands: bright noise with a fast, uneven flutter, swelling in and out"""
    n = int(dur * SR); t = np.arange(n) / SR
    flut = 0.6 + 0.4 * np.abs(lp(noise(n), 18) * 4).clip(0, 1)
    x = bp(noise(n), 700, 7000) * flut * np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3) * 0.45
    return verb(stereo(x), ROOM) * db(-6)

def door():
    """a front door: the latch, a soft swing of air, the street opening up"""
    n = int(0.9 * SR); t = np.arange(n) / SR
    latch = bp(noise(n), 1500, 6000) * np.exp(-t / 0.008) * 0.8
    swing = lp(noise(n), 900) * np.sin(np.pi * np.minimum(1, t / 0.7)) ** 2 * 0.25
    return verb(stereo(latch + swing), ROOM) * db(-6)

def latch():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return verb(stereo(bp(noise(n), 2000, 8000) * (np.exp(-t / 0.006) + 0.6 * np.exp(-np.maximum(0, t - 0.06) / 0.005) * (t > 0.06)) * 0.8), ROOM) * db(-8)

def footsteps(times, double=False, light=False):
    """soft steps on stone or pavement; double: two people walking together; light: a child running"""
    out = np.zeros((2, int((max(times) + 1.0) * SR)))
    for k, t0 in enumerate(times):
        for j in ([0, 0.23] if double else [0]):
            m = int(0.08 * SR); i = int((t0 + j) * SR)
            x = lp(noise(m), 2400 if light else 1400) * np.exp(-np.arange(m) / ((0.007 if light else 0.012) * SR)) * (0.5 if light else 0.7) * (0.8 if j else 1)
            out[:, i:i + m] += stereo(x, 0.15 * (-1) ** (k + int(j > 0)))
    return verb(out, ROOM) * db(-10)

def bag_drop():
    """two bags hitting the floor (a soft thump and a paper crush), then oranges rolling away in small taps"""
    n = int(2.8 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for t0, g in [(0.0, 1.0), (0.09, 0.8)]:
        i = int(t0 * SR); m = int(0.25 * SR); u = np.arange(m) / SR
        x[i:i + m] += lp(noise(m), 220) * np.exp(-u / 0.05) * g + bp(noise(m), 1500, 6000) * np.exp(-u / 0.06) * 0.25 * g
    for k in range(9):
        t0 = 0.2 + 0.11 * k + 0.02 * k * k; i = int(t0 * SR); m = int(0.03 * SR)
        x[i:i + m] += bp(noise(m), 600, 3000) * np.exp(-np.arange(m) / (0.004 * SR)) * 0.35 * (1 - k / 10)
    return verb(stereo(x), ROOM) * db(-6)

def ball_roll(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return stereo(lp(noise(n), 320) * (1 - t / dur) * 0.5 * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))) * db(-8)

def ball_catch():
    n = int(0.2 * SR); t = np.arange(n) / SR
    return verb(stereo(lp(noise(n), 700) * np.exp(-t / 0.02) * 0.8), ROOM) * db(-8)

def wings():
    """a few birds' wings beating as they cross: soft whirring bursts of noise"""
    n = int(1.6 * SR); t = np.arange(n) / SR
    beat = np.maximum(0, np.sin(2 * np.pi * 9 * t)) ** 3
    return stereo(bp(noise(n), 400, 2500) * beat * np.sin(np.pi * t / 1.6) ** 2 * 0.5, 0.3) * db(-8)

def pats(k=3):
    out = np.zeros(int(1.2 * SR))
    for j in range(k):
        i = int(j * 0.28 * SR); m = int(0.05 * SR)
        out[i:i + m] += lp(noise(m), 900) * np.exp(-np.arange(m) / (0.008 * SR)) * 0.7
    return verb(stereo(out), ROOM) * db(-8)

def pour():
    n = int(1.1 * SR); t = np.arange(n) / SR
    return verb(stereo(bp(noise(n), 1200, 5000) * (0.6 + 0.4 * np.abs(lp(noise(n), 30) * 5).clip(0, 1)) * np.sin(np.pi * t / 1.1) ** 0.6 * 0.35), ROOM) * db(-10)

def plates(k):
    """plates and glasses set down on a cloth: muffled taps (no ringing)"""
    out = np.zeros(int((0.45 * k + 0.3) * SR)); r2 = np.random.default_rng(11)
    for j in range(k):
        i = int((0.45 * j + 0.1 * r2.random()) * SR); m = int(0.04 * SR)
        out[i:i + m] += bp(noise(m), 500, 2500) * np.exp(-np.arange(m) / (0.005 * SR)) * 0.5
    return verb(stereo(out), ROOM) * db(-8)

def page():
    n = int(0.45 * SR); t = np.arange(n) / SR
    return verb(stereo(bp(noise(n), 2500, 9000) * np.sin(np.pi * t / 0.45) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t)) * 0.35), ROOM) * db(-6)


def main():
    n = int(TOTAL * SR) + 1
    # ---------------- beds: one per place, crossfaded at the cuts ----------------
    kinds = {"street": "city_night", "office": "office", "void": "void", "bedroom": "bedroom", "courtyard": "courtyard"}
    spans = []
    for s in SHOTS:
        k = kinds[s["set"]]
        if s["kind"] in ("ending", "nightPray", "nightSujood", "reading", "teaching"): k = "courtyard_soft" if s["set"] == "courtyard" else "bedroom"
        if s["kind"] in ("wave", "handshake"): k = "traffic"
        if spans and spans[-1][0] == k: spans[-1][2] = s["to"]
        else: spans.append([k, s["from"], s["to"]])
    beds = np.zeros((2, n)); XF = int(0.3 * SR)
    for k, a_s, z_s in spans:
        a, z = int(a_s * SR), min(n, int(z_s * SR))
        a0, z0 = max(0, a - XF // 2), min(n, z + XF // 2)
        x = bed(k, z0 - a0)
        if k == "void": x = x * db(10)                               # the void's bed is nearly silent: lift it a little
        if k == "traffic": x = x * db(-8)                            # the morning street: a quiet distant hum, under everything
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
    for prev, s in zip(SHOTS, SHOTS[1:]):                                          # a cut: a soft whoosh when the place changes, a breath of air otherwise
        put(whoosh_soft(), s["from"] - 0.32, 0 if s["set"] != prev["set"] else -12)
    put(iris(), PH[3]["from"] - 7 / FPS, -6)
    for i, d in enumerate(E["dims"]): put(tick(0.8, -0.5 + 0.25 * i), fr(d), -2)  # the five dots dim, left to right
    put(tick(0.7), fr(0.35), -4)                                                    # the tracker appears
    S = {s["kind"]: s for s in SHOTS}
    # 11-17 s: the alarm buzzing on the nightstand, the phone turned over, getting up, wudu, the front door
    for k in range(3): put(buzz(), S["alarm"]["from"] + 0.15 + 0.42 * k, -8)
    for i in range(3): put(ping(soft=True), S["phoneDown"]["from"] + 0.1 + 0.12 * i, -12)
    put(flip_tap(), fr(E["flip"]))
    put(cloth(), S["rise"]["from"] + 0.2, -4); put(footsteps([0.0, 0.45]), S["rise"]["from"] + 0.95, -2)
    put(water(S["wudu"]["to"] - S["wudu"]["from"]), S["wudu"]["from"], -4)
    put(door(), fr(E["door"]) - 0.1, -2)
    put(footsteps([k * 0.55 for k in range(4)]), fr(E["door"]) + 0.25, -2)
    put(footsteps([k * 0.52 for k in range(4)], double=True), S["friend"]["from"] + 0.6, -2)
    put(footsteps([k * 0.55 for k in range(2)]), S["shoes"]["from"] + 0.1, -2); put(tick(0.9), fr(S["shoes"]["from"] + 32 / FPS), -4); put(tick(0.8), fr(S["shoes"]["from"] + 44 / FPS), -6)
    # the prayer: sleeves at takbir, the light back, the Fajr dot; the row bows and prostrates
    tk = ev(E["takbir"])
    put(cloth(), tk - 0.05, -6); put(relight(), tk + 0.05, -10)
    put(tick(1.0), ev(E["fajrGlow"]), 0); put(mend(), ev(E["fajrGlow"]), -10)
    put(cloth(), S["rowRuku"]["from"] + 0.05, -2); put(cloth(), S["rowSujood"]["from"] + 0.05, -2)
    # the old man's bags; the ball
    put(footsteps([k * 0.7 for k in range(2)]), S["bags"]["from"] + 0.1, -6)
    put(bag_drop(), fr(E["bagDrop"]), 0)
    put(cloth(), S["help"]["from"] + 0.2, -6); put(footsteps([k * 0.55 for k in range(2)], double=True), S["help"]["from"] + 1.05, -4)
    put(footsteps([k * 0.28 for k in range(8)], light=True), S["garden"]["from"] + 0.1, -10)
    b0, b1 = E["ball"]; put(ball_roll(0.7), fr(b0), -4); put(tick(0.9), fr(b0) + 1.0, -2); put(whoosh(0.35, soft=True) * db(-12), fr(b0) + 1.42); put(ball_catch(), fr(b0) + 1.95, -2)
    put(footsteps([k * 0.25 for k in range(4)], light=True), fr(b0) + 2.2, -8)
    # night: alone; the sleeves at ruku and sujood
    put(cloth(), S["nightPray"]["from"] + 34 / FPS, -6); put(cloth(), S["nightSujood"]["from"] + 0.05, -6); put(cloth(), S["nightSujood"]["from"] + 36 / FPS, -8)
    # sunrise: air rising with the camera, the birds' wings; the window latch and the morning air
    la = S["lapse"]; put(rise_air(la["to"] - la["from"] + 0.4), la["from"] - 0.2, -8); put(wings(), la["from"] + 0.9, -6)
    put(footsteps([0.0, 0.45]), S["window"]["from"] + 0.1, -4); put(latch(), fr(E["window"]) - 0.1, -2); put(shimmer(1.2, soft=True), fr(E["window"]) + 0.2, -12)
    # greetings
    put(footsteps([k * 0.55 for k in range(3)]), S["wave"]["from"] + 0.1, -6)
    put(footsteps([0.0, 0.42]), S["hug"]["from"] + 0.05, -6); put(cloth(), S["hug"]["from"] + 0.5, -2); put(pats(), S["hug"]["from"] + 0.8, -4)
    put(pats(2), S["handshake"]["from"] + 0.2, -6)
    # meals and the book
    put(pour(), S["breakfast"]["from"] + 0.3, -6); put(plates(4), S["breakfast"]["from"] + 0.9, -4)
    put(plates(6), S["sunsetMeal"]["from"] + 0.3, -4)
    put(page(), S["reading"]["from"] + 0.4, -4); put(page(), S["teaching"]["from"] + 0.3, -8)
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
