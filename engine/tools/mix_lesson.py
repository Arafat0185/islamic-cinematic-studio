"""Sound for video 007 "The Lesson": sound design ONLY (no recitation, no music, nothing melodic; the talk is a TikTok
sound the channel owner adds in TikTok and is NEVER in our file).
  hospital   the room's machine hum (filtered noise), rain on the window (heavier on the hardest lines), a slow clock,
             the monitor's beeps on its heartbeat (it slows on the deathbed lines), the IV drip
  corridor   the fluorescent buzz and the flicker's clicks, the building's low air
  dunes      wind over the sand, sand hissing; every worldly thing that disintegrates: a soft dry crumble + a sand whoosh
             (the palace: bigger, with a pressure boom and the sandstorm)
  heartbeat  slow, on the deathbed lines (30.9 s, 36.6-42.4 s slowing, 50.1-54.9 s)
  big moments distant thunder; deep sub-bass swells (filtered noise, no pitch) on the realisations
  dawn       the doors sliding, steps on the paving, steps in the sand, the foundation's stones set down, the wind
             calming, dawn birds very faint
  transitions a sand whoosh for every sand wipe, a rain swell for every rain dissolve
  levels     about -24 LUFS overall, ducked ~5 dB under the voice (the guide talk's own envelope, timing only)
Writes public/audio/lesson_mix.wav (upload) and public/audio/lesson_preview_mix.wav (+ the guide talk, cut at clipEnd:
checking only, never upload).
Run from engine/:  .venv-tts/Scripts/python tools/mix_lesson.py
"""
import json, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Pedalboard, Limiter
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mix_d3 import SR, db, lp, hp, bp, noise, stereo, verb, ROOM, HALL  # noqa: E402
from mix_lastrequest import load, smooth_avg, rain, glass, howl, thunder, tick, heartbeat, beep  # noqa: E402
from mix_rest import desert_wind, sand_crumble, sand_pour, step_sand, step_stone, birds, whoosh, book_thud, pressure_boom  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "007-the-lesson"
AUD = HERE.parent / "public" / "audio"
GUIDE = AUD / "guide" / "lesson_guide.mp4"
OUT, OUT_PREVIEW = AUD / "lesson_mix.wav", AUD / "lesson_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(round(TOTAL * SR)); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(7)
TARGET = -24.0


def put(dst, x, at, g=0.0):
    i = int(at * SR)
    if i >= dst.shape[1] or at < 0: return
    m = min(x.shape[1], dst.shape[1] - i); dst[:, i:i + m] += x[:, :m] * db(g)

def mask(spans, xf=0.35):
    m = np.zeros(N)
    for a, b in spans: m[int(a * SR):int(b * SR)] = 1
    return smooth_avg(m, int(xf * SR))

def world(*ws): return mask([(s["at"], s["to"]) for s in SHOTS if s["world"] in ws])
def kinds(*ks): return mask([(s["at"], s["to"]) for s in SHOTS if s["kind"] in ks])
def tt(d): return np.arange(int(d * SR)) / SR

def hum(n):
    """machines in the room: a soft low air-handling hum (filtered noise, no pitch) with a faint electrical hiss"""
    return np.stack([lp(noise(n), 140) * 0.9 + bp(noise(n), 2000, 6000) * 0.04, lp(noise(n), 140) * 0.9 + bp(noise(n), 2000, 6000) * 0.04])

def fluoro(n):
    """fluorescent tubes: a buzzy band with a flutter"""
    t = np.arange(n) / SR; fl = 0.7 + 0.3 * np.sign(np.sin(2 * np.pi * 7.3 * t)) * (np.sin(2 * np.pi * 0.37 * t) > 0.4)
    return stereo(bp(noise(n), 900, 2600) * 0.18 * fl + lp(noise(n), 160) * 0.5)

def sand_hiss(n):
    t = np.arange(n) / SR; g = 0.6 + 0.4 * np.sin(2 * np.pi * t / 3.7) ** 2
    return np.stack([hp(noise(n), 3500) * 0.25 * g, hp(noise(n), 3500) * 0.25 * np.roll(g, 7000)])

def swell(d=3.5, k=1.0):
    """a deep sub-bass swell: very low filtered noise rising and falling (no pitch)"""
    t = tt(d); x = lp(lp(noise(t.size), 45), 45) * 6.0 * np.sin(np.pi * t / d) ** 2
    return stereo(x * k)

def crumble(k=1.0, d=1.6):
    """a worldly thing turning to sand: a soft dry crumble and a sand whoosh, the grains pouring after"""
    out = np.zeros((2, int((d + 1.4) * SR))); c = sand_crumble(d); w = whoosh(d * 0.8, 0.9, 300, 4000)
    out[:, :c.shape[1]] += c; out[:, :w.shape[1]] += w * 0.7; p = sand_pour(1.6) * 0.8; out[:, int(0.5 * SR):int(0.5 * SR) + p.shape[1]] += p
    return out * k

def drip():
    t = tt(0.18); return verb(stereo(bp(noise(t.size), 1800, 5000) * np.exp(-t / 0.012) * 0.35), ROOM)

def doors(d=1.2):
    t = tt(d); return verb(stereo(bp(noise(t.size), 400, 3000) * np.sin(np.pi * t / d) ** 1.2 * 0.35 + lp(noise(t.size), 120) * np.exp(-((t - 0.1) / 0.06) ** 2) * 0.6), ROOM)

def limit(x, ceil):
    up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
    up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=150)])(up, SR * 4)
    return resample_poly(up, 1, 4, axis=1).astype(np.float64)

def bpm(t): return 72 if t < 36.6 else (72 + (48 - 72) * min(1, (t - 36.6) / 5.8) if t < 42.4 else (50 if t < 54.9 else 58))


def main():
    t = np.arange(N) / SR; meter = pyln.Meter(SR)
    room, corr, dunes, ext = world("room"), world("corridor"), world("dunes"), world("exterior")
    dawn = kinds("footprints", "foundation", "crestSun") * 0 + mask([(S["footprints"]["at"], TOTAL)])
    night_dunes = dunes * (1 - dawn)
    # ---------------- beds ----------------
    heavy = kinds("rainGlass") * 0.8 + kinds("windowPush", "fingersSheet") * 0.3
    bed = (hum(N) * 0.55 + rain(N) * (0.55 + 0.6 * heavy) + glass(N, 70) * (0.5 + heavy)) * room
    bed += fluoro(N) * corr * 0.9
    wind_k = night_dunes * (1.0 + 0.8 * kinds("palace", "windAway") + 0.4 * kinds("duneCrest")) + dawn * np.clip(1.0 - (t - S["footprints"]["at"]) / 9.0, 0.35, 1.0) * 0.8
    bed += desert_wind(N) * wind_k * 1.6 + sand_hiss(N) * (night_dunes * 0.9 + dawn * 0.4)
    bed += (lp(np.stack([noise(N), noise(N)]), 300) * 0.25) * ext
    # ---------------- the hospital ----------------
    fx = np.zeros((2, N))
    k = 0.4
    while k < TOTAL:                                                  # a slow clock, only in the room
        if room[min(N - 1, int(k * SR))] > 0.5: put(fx, verb(tick(0.8), ROOM), k, -10)
        k += 1.0
    ph, f = 0.0, 0                                                    # the monitor beeps on the heartbeat (the picture's phase)
    for f in range(1, int(TOTAL * 30)):
        n2 = ph + bpm(f / 30) / 60 / 30
        if int(n2) > int(ph) and room[min(N - 1, int(f / 30 * SR))] > 0.5: put(fx, verb(beep(980, 0.1), ROOM), f / 30, -12 if S["ivDrip"]["at"] <= f / 30 < S["ivDrip"]["to"] else -15)
        ph = n2
    k = S["ivDrip"]["at"] + 1.32
    while k < S["ivDrip"]["to"]: put(fx, drip(), k, -6); k += 2.4
    for l in E["thunder"]: put(fx, thunder(close=l > 50), l, -8 if l > 50 else -12)
    # ---------------- the heart, slow, on the deathbed lines ----------------
    for a0, b0 in [(30.85, 32.75), (36.6, 42.4), (50.1, 54.9)]:
        k = a0 + 0.1
        while k < b0: put(fx, heartbeat(1.0), k, -4); k += 60 / (bpm(k) - (14 if a0 > 36 else 8))
    # ---------------- the dunya turning to sand ----------------
    put(fx, crumble(1.0), E["carCrumble"], -4)
    put(fx, crumble(1.1, 2.0), E["housePour"], -3); put(fx, sand_pour(2.2), E["housePour"] + 0.2, -6)
    put(fx, crumble(1.4, 2.4), E["palaceCollapse"], 0); put(fx, pressure_boom(0.8), E["palaceCollapse"] + 0.1, -4); put(fx, whoosh(2.5, 1.0, 120, 2500), E["palaceCollapse"] + 0.4, -4)
    for i in range(8): put(fx, crumble(0.8 + 0.06 * i, 1.2), E["rowCrumble"] + E["rowGap"] * i, -6)
    for x in [E["carAppear"], E["houseRise"][0], E["rowAppear"]]: put(fx, whoosh(1.2, 0.5, 2000, 6000, rev=True), x, -14)   # a faint shimmer as they appear
    # ---------------- realisations ----------------
    for s0 in E["swells"]: put(fx, swell(3.6, 1.0), s0 - 0.8, -2)
    # ---------------- transitions ----------------
    for at, kind in E["transitions"]:
        if kind == "sand": put(fx, whoosh(0.9, 1.0, 200, 5000), at - 0.55, -6); put(fx, sand_pour(0.8), at - 0.2, -10)
        if kind == "rain": put(fx, rain(int(1.6 * SR)) * np.sin(np.pi * tt(1.6) / 1.6) ** 2, at - 0.8, -6)
    # ---------------- dawn ----------------
    put(fx, doors(1.3), E["doorsOpen"] - 0.05, -6)
    for i in range(5): put(fx, step_stone(0.6), E["doorsOpen"] + 0.55 + 0.5 * i, -12)
    for i in range(int((S["footprints"]["to"] - S["footprints"]["at"]) / 0.5)): put(fx, step_sand(0.7), S["footprints"]["at"] + 0.15 + 0.5 * i, -10)
    f0 = S["foundation"]["at"] + 0.15
    for i in range(6): put(fx, book_thud(0.9), f0 + 0.16 * i + 0.45, -8)
    bird = np.zeros((2, N)); k = S["doorsDawn"]["at"] + 0.5
    while k < TOTAL - 1: put(bird, birds(1.4 + r.random()), k, -14 - 4 * r.random()); k += 1.3 + 1.5 * r.random()
    sfx = bed + fx + bird * 0.5
    # ---------------- levels: ducked under the voice, then -24 LUFS overall ----------------
    g = load(GUIDE); g = g[:, :min(g.shape[1], int(timing["clipEnd"] * SR))]
    ge = np.zeros(N); e = smooth_avg(np.abs(g.mean(axis=0)), int(0.12 * SR)); ge[:e.size] = e
    voice = np.clip(ge / (np.percentile(e, 90) + 1e-9), 0, 1); voice = smooth_avg(voice, int(0.25 * SR))
    sfx *= 1 - (1 - db(-5.0)) * voice
    sfx *= np.clip((TOTAL - 0.05 - t) / 2.0, 0, 1)                    # the wind calms to the end
    gain = 0.0
    for _ in range(8):
        y = limit(sfx * db(gain), -1.5); L = meter.integrated_loudness(y.T)
        if abs(L - TARGET) < 0.05: break
        gain += TARGET - L
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    print(f"{OUT.name}: {N / SR:.2f} s; {L:.1f} LUFS overall; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    g2 = np.zeros((2, N)); m = g.shape[1]; g2[:, :m] = g; g2 *= np.clip((timing["clipEnd"] - t) / 0.12, 0, 1)
    pv = y + g2 * db(-14.0 - meter.integrated_loudness(g2[:, :m].T)); pv *= min(1.0, db(-1.0) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the guide talk to {timing['clipEnd']} s (NOT for upload)")


if __name__ == "__main__":
    main()
