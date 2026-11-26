"""Sound for video 006 "Hold On To This" (peaceful, natural; no music, nothing tonal but birdsong).
  recitation  Sheikh Yasser Al-Dossari, Ar-Ra'd 13:28 + 13:29 (everyayah.com, public/audio/recitation/dossari_0130xx.mp3)
              at timing.json verseStarts, -14 LUFS; its last tail fades out gently under the end card
  nature      per world (shots.json): wind through the pines and grass, leaves, birdsong, a river far below, a stream,
              water lapping on the lake, the bamboo rustling at night, the penthouse's quiet hum; dawn birds and water
              under the recitation
  story       soft footsteps, coins into the water, the swing's creak, the lantern going out (a soft low swell), the car
              passing (engine) and its door, the phone buzzing, water over his hands, birds taking off
  levels      about -26 LUFS under the talk, a touch higher in its pauses and in the beat before the recitation
The talk (0 .. clipEnd) is a TikTok sound added in TikTok: NOT in our file.
Writes public/audio/hold_mix.wav (upload) and public/audio/hold_preview_mix.wav (+ the guide talk, cut at clipEnd:
checking only, never upload).
Run from engine/:  .venv-tts/Scripts/python tools/mix_hold.py
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
from mix_d3 import SR, db, lp, hp, bp, noise, stereo, verb  # noqa: E402
from mix_lastrequest import load, smooth_avg, creak, rumble, buzz, wings  # noqa: E402
from mix_rest import step_sand, step_stone, splash, bubbles, leaves, birds  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "006-hold-on"
AUD = HERE.parent / "public" / "audio"
REC = AUD / "recitation"; GUIDE = AUD / "guide" / "deen_guide.mp4"
OUT, OUT_PREVIEW = AUD / "hold_mix.wav", AUD / "hold_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(round(TOTAL * SR)); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(6)


def put(dst, x, at, g=0.0):
    i = int(at * SR)
    if i >= dst.shape[1] or at < 0: return
    m = min(x.shape[1], dst.shape[1] - i); dst[:, i:i + m] += x[:, :m] * db(g)

def mask(spans, xf=0.5):
    m = np.zeros(N)
    for a, b in spans: m[int(a * SR):int(b * SR)] = 1
    return smooth_avg(m, int(xf * SR))

def world(*ws): return mask([(s["at"], s["to"]) for s in SHOTS if s["world"] in ws])
def kinds(*ks): return mask([(s["at"], s["to"]) for s in SHOTS if s["kind"] in ks])

def wind(n, k=1.0, cut=500):
    t = np.arange(n) / SR; sw = 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.0) * np.sin(2 * np.pi * t / 17.0 + 1)
    return np.stack([lp(noise(n), cut) * sw, lp(noise(n), cut) * np.roll(sw, int(1.1 * SR))]) * k

def flow(n, lo=300, hi=2500, k=1.0):
    """running water: band noise with a slow bubbling swell"""
    t = np.arange(n) / SR; m = 0.75 + 0.25 * lp(noise(n), 4) / (np.abs(lp(noise(n), 4)).max() + 1e-9)
    return np.stack([bp(noise(n), lo, hi) * m, bp(noise(n), lo, hi) * np.roll(m, int(0.7 * SR))]) * k

def lapping(n):
    t = np.arange(n) / SR; w = np.maximum(0, np.sin(2 * np.pi * t / 2.6)) ** 3 + 0.5 * np.maximum(0, np.sin(2 * np.pi * t / 3.7 + 1)) ** 3
    return stereo(bp(noise(n), 200, 1800) * (0.15 + w) * 0.6)

def engine_pass(d=3.0):
    t = np.arange(int(d * SR)) / SR; env = np.exp(-((t - d * 0.55) / (d * 0.3)) ** 2)
    return stereo(lp(noise(t.size), 180) * env * 1.3 + bp(noise(t.size), 300, 1200) * env * 0.3, 0.3)

def door_thunk():
    t = np.arange(int(0.6 * SR)) / SR; return verb(stereo(lp(noise(t.size), 220) * np.exp(-t / 0.05) * 1.8 + bp(noise(t.size), 1500, 5000) * np.exp(-t / 0.01) * 0.4))

def coin_drop(k=1.0):
    t = np.arange(int(0.25 * SR)) / SR; return stereo((bp(noise(t.size), 2500, 9000) * np.exp(-t / 0.012) * 0.8 + bp(noise(t.size), 400, 2500) * np.exp(-t / 0.05) * 0.5) * k, r.uniform(-0.4, 0.4))

def snuff():
    t = np.arange(int(0.8 * SR)) / SR; return stereo(hp(noise(t.size), 1500) * np.exp(-t / 0.15) * np.minimum(1, t / 0.03) * 0.5)

def limit(x, ceil):
    up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
    up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=150)])(up, SR * 4)
    return resample_poly(up, 1, 4, axis=1).astype(np.float64)


def main():
    t = np.arange(N) / SR; meter = pyln.Meter(SR)
    a, card = int(timing["recStart"] * SR), int(timing["cardFrom"] * SR)
    # ---------------- the recitation ----------------
    rec = np.zeros((2, N))
    for v, at in timing["verseStarts"].items(): put(rec, load(REC / f"dossari_0130{v.split(':')[1]}.mp3"), at)
    rec *= db(-14.0 - meter.integrated_loudness(rec[:, a:card].T))
    rec *= np.clip(1 - (t - timing["cardFrom"]) / (timing["recEnd"] - timing["cardFrom"] + 0.4), 0, 1) ** 1.5
    # ---------------- nature, per world ----------------
    bird = np.zeros((2, N)); k = 0.3
    while k < TOTAL - 2: put(bird, birds(1.6 + 1.2 * r.random()), k, -4 - 6 * r.random()); k += 1.2 + 1.8 * r.random()
    nat = (wind(N, 0.9) + leaves(N) * 0.5) * world("forest", "wheat", "lavender", "home")
    nat += wind(N, 1.4, 700) * world("cliff") + (flow(N, 150, 900, 0.9) + wind(N, 0.6)) * world("canyon")
    nat += flow(N, 400, 3500, 0.8) * world("stream") + lapping(N) * world("lake") + (leaves(N) * 0.9 + wind(N, 0.5, 300)) * world("bamboo")
    nat += stereo(lp(noise(N), 120) * 0.25) * world("pent", "window", "valley")
    nat += bird * (world("forest", "stream", "wheat", "lavender", "valley", "window", "canyon") * 0.9 + kinds("walkMasjid", "pray", "birds") * 1.2)
    # ---------------- the story ----------------
    fx = np.zeros((2, N))
    for i in range(int((S["forestWalk"]["to"] - 0.3) / 0.62)): put(fx, step_sand(0.6), 0.25 + 0.62 * i, -8)
    for i in range(12): put(fx, coin_drop(0.7 + 0.3 * r.random()), E["coinsFrom"] + 0.55 + 0.09 * i + 0.03 * r.random(), -6)
    put(fx, splash(0.5), E["coinsFrom"] + 0.6, -12)
    for i in range(3): put(fx, creak(0.9) * 0.5, S["homeDusk"]["at"] + 0.3 + 0.95 * i, -16)
    put(fx, snuff(), E["lanternOut"], -8); put(fx, rumble(2.6, 0.5), E["lanternOut"] - 0.2, -10)
    put(fx, engine_pass(3.0), S["bambooCar"]["at"] - 0.2, -2); put(fx, door_thunk(), S["pentCards"]["at"] - 0.25, -6)
    for i in range(3): put(fx, buzz(0.5), E["phoneBuzz"] + 0.8 * i, -10)
    put(fx, bubbles(2.4, 10), S["wudu"]["at"] + 0.3, -8); put(fx, splash(0.4), S["wudu"]["at"] + 0.4, -10)
    for i in range(int((S["walkMasjid"]["to"] - S["walkMasjid"]["at"]) / 0.55)): put(fx, step_stone(0.5), S["walkMasjid"]["at"] + 0.2 + 0.55 * i, -12)
    put(fx, wings(), E["birdsFrom"] + 0.2, -6); put(fx, wings(), E["birdsFrom"] + 0.7, -9)
    for i in range(int((TOTAL - S["walkHome"]["at"]) / 0.6)): put(fx, step_sand(0.5), S["walkHome"]["at"] + 0.2 + 0.6 * i, -12 - 10 * i / 14)
    sfx = nat + fx
    # ---------------- levels: -26 LUFS under the talk, a touch higher in its pauses and the beat ----------------
    talk = timing["talk"]; speak = mask([(p["start"], min(p["end"], timing["speechEnd"])) for p in talk], 0.3)
    beat = mask([(timing["speechEnd"], timing["recStart"] + 0.3)], 0.3)
    sfx *= db(-26.0 - meter.integrated_loudness(sfx[:, :int(timing["speechEnd"] * SR)].T))
    sfx *= db(2.5) * (1 - speak) + speak; sfx *= 1 + (db(2.0) - 1) * beat
    sfx *= 1 - 0.25 * np.clip(smooth_avg(np.abs(rec).mean(axis=0), int(0.25 * SR)) / (np.percentile(np.abs(rec[:, a:card]).mean(axis=0), 95) + 1e-9), 0, 1)
    sfx *= np.clip((TOTAL - 0.05 - t) / 2.0, 0, 1)
    # ---------------- master ----------------
    g = 0.0
    for _ in range(8):
        y = limit((rec + sfx) * db(g), -1.2); L = meter.integrated_loudness(y[:, a:card].T)
        if abs(L + 14.0) < 0.05: break
        g += -14.0 - L
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    print(f"{OUT.name}: {N / SR:.2f} s; recitation part {L:.1f} LUFS; under the talk {meter.integrated_loudness(y[:, :int(timing['speechEnd'] * SR)].T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    gd = load(GUIDE); g2 = np.zeros((2, N)); m = min(gd.shape[1], int(timing["clipEnd"] * SR)); g2[:, :m] = gd[:, :m]
    fade = np.clip((timing["clipEnd"] - t) / 0.15, 0, 1); g2 *= fade
    pv = y + g2 * db(-14.0 - meter.integrated_loudness(g2[:, :m].T)); pv *= min(1.0, db(-1.0) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the guide talk to {timing['clipEnd']} s (NOT for upload)")


if __name__ == "__main__":
    main()
