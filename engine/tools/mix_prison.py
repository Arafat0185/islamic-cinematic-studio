"""Sound for video 008 "The Prison": subtle cinematic sound design ONLY (no music, nothing melodic; the narration is a
TikTok sound the channel owner adds in TikTok and is NEVER in our file).
  city       distant traffic and the city's low air, a soft night wind; the market's murmur and clatter (no words)
  canal      water lapping under the embankment, light rain (heavier with the storm), the wind at its strongest on
             "And this is the struggle" with a deep sub swell
  story      footsteps on stone while he walks, a soft click as the traffic light changes, the gate closing behind him
             in the courtyard, pigeons' and doves' wings, birds over the roofs at sunrise
  transitions a soft air whoosh on every whip-pan
  end        a gentle wind rising into light (filtered noise, no pitch), fading under the end card
  levels     about -26 LUFS overall, ducked ~5 dB under the voice (the guide narration's own envelope, timing only)
Writes public/audio/prison_mix.wav (upload) and public/audio/prison_preview_mix.wav (+ the guide narration, cut at
clipEnd: checking only, never upload).
Run from engine/:  .venv-tts/Scripts/python tools/mix_prison.py
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
from mix_lastrequest import load, smooth_avg, rain, wind, wings, tick, rumble  # noqa: E402
from mix_rest import step_stone, whoosh  # noqa: E402
from mix_hold import lapping, door_thunk, engine_pass  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "008-the-prison"
AUD = HERE.parent / "public" / "audio"
GUIDE = AUD / "guide" / "prison_guide.mp4"
OUT, OUT_PREVIEW = AUD / "prison_mix.wav", AUD / "prison_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(round(TOTAL * SR)); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(8)
TARGET = -26.0


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

def traffic(n):
    """the city far off: a low rumble of traffic with slow swells (filtered noise)"""
    t = np.arange(n) / SR; sw = 0.7 + 0.3 * np.sin(2 * np.pi * t / 11) * np.sin(2 * np.pi * t / 4.3 + 1)
    return np.stack([lp(noise(n), 220) * sw, lp(noise(n), 220) * np.roll(sw, 9000)]) * 0.9

def murmur(n):
    """a market's murmur: many voices far off, no words (band noise with a fast, uneven amplitude), plus clatter"""
    t = np.arange(n) / SR; am = 0.6 + 0.4 * np.abs(lp(noise(n), 6)) / (np.abs(lp(noise(n), 6)).max() + 1e-9)
    x = np.stack([bp(noise(n), 250, 2200) * am, bp(noise(n), 250, 2200) * np.roll(am, 5000)]) * 0.5
    cl = np.zeros(n); idx = r.integers(0, n, int(n / SR * 4)); cl[idx] = r.uniform(0.3, 1, idx.size)
    return x + stereo(bp(cl, 2500, 7000) * 1.2)

def click():
    t = tt(0.06); return verb(stereo(bp(noise(t.size), 1500, 6000) * np.exp(-t / 0.004) * 0.9 + lp(noise(t.size), 400) * np.exp(-t / 0.01) * 0.6), ROOM)

def swell(d=3.6, k=1.0):
    t = tt(d); return stereo(lp(lp(noise(t.size), 45), 45) * 6.0 * np.sin(np.pi * t / d) ** 2 * k)

def rise(d):
    """wind rising into light: filtered noise opening upward (no pitch), with a soft airy shimmer"""
    t = tt(d); u = t / d; out = np.zeros(t.size); seg = int(0.02 * SR)
    for i in range(0, t.size, seg):
        c = 300 + 3500 * u[i] ** 1.5; w = min(seg, t.size - i); out[i:i + w] = bp(noise(w + 2000), c * 0.5, c * 1.6)[1000:1000 + w]
    return stereo(out * (0.25 + 0.75 * u) * np.minimum(1, (d - t) / 1.5) * 0.8) + stereo(hp(noise(t.size), 6000) * u ** 2 * 0.15)

def limit(x, ceil):
    up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
    up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=150)])(up, SR * 4)
    return resample_poly(up, 1, 4, axis=1).astype(np.float64)


def main():
    t = np.arange(N) / SR; meter = pyln.Meter(SR)
    street, court, canal, roof = world("street"), world("court"), world("canal"), world("roof")
    storm = kinds("scarfClose") * 0.6 + kinds("rainSteady") * 0.75 + kinds("canalWind") * 1.0
    gold = kinds("bridgeGold")
    # ---------------- beds ----------------
    bed = traffic(N) * (street * 0.8 + court * 0.35 + canal * (1 - gold) * 0.5 + roof * 0.3 + gold * 0.4)
    bed += wind(N) * (0.5 + 0.6 * storm + 1.4 * kinds("canalWind") + 0.4 * roof + 0.3 * court)
    bed += murmur(N) * (kinds("marketWide", "marketWalk", "marketLow") * 1.0 + kinds("marketPull") * 0.6 + kinds("cafeArgue") * 0.45)
    bed += lapping(N) * canal * 1.3 + rain(N) * storm * 0.9
    # ---------------- the story ----------------
    fx = np.zeros((2, N))
    walking = [("marketWalk", 0.55), ("marketLow", 0.55), ("emptyStreet", 0.6), ("billboards", 0.6), ("scarfWalk", 0.62), ("rainSteady", 0.6), ("canalWind", 0.7),
               ("courtEnter", 0.62), ("matchRed", 0.6), ("matchShop", 0.6), ("matchCafe", 0.6), ("matchNeon", 0.6), ("bridgeGold", 0.55)]
    for k, gap in walking:
        a, b = S[k]["at"], S[k]["to"]; x = a + 0.15
        while x < b - 0.1: put(fx, step_stone(0.55 + 0.15 * r.random()), x, -12); x += gap
    x = S["redLight"]["at"] + 0.1
    while x < E["redLight"] + 0.2: put(fx, step_stone(0.5), x, -12); x += 0.6
    put(fx, click(), E["amber"], -10); put(fx, click(), E["redLight"], -6)
    put(fx, door_thunk(), E["doorClose"], -10)
    put(fx, wings(), E["birdsUp"], -8); put(fx, wings(), E["birdsUp"] + 0.4, -12)
    put(fx, wings(), E["dovesUp"], -6); put(fx, wings(), E["dovesUp"] + 0.5, -9)
    for k in range(4): put(fx, wings(), S["rooftop"]["at"] + 1.2 + 1.6 * k, -16)
    put(fx, engine_pass(3.0), S["emptyStreet"]["at"] + 0.4, -16)
    put(fx, swell(4.2, 1.0), E["swell"] - 1.0, 0); put(fx, rumble(3.0, 0.5), E["swell"] - 0.4, -10)
    for at, kind in E["transitions"]:
        if kind == "whip": put(fx, whoosh(0.5, 1.0, 400, 5000), at - 0.3, -12)
    put(fx, rise(TOTAL - S["riseLight"]["at"]), S["riseLight"]["at"], -2)
    sfx = bed + fx
    # ---------------- levels: ducked under the voice, then -26 LUFS overall ----------------
    g = load(GUIDE); g = g[:, :min(g.shape[1], int(timing["clipEnd"] * SR))]
    ge = np.zeros(N); e = smooth_avg(np.abs(g.mean(axis=0)), int(0.12 * SR)); ge[:e.size] = e
    voice = smooth_avg(np.clip(ge / (np.percentile(e, 90) + 1e-9), 0, 1), int(0.25 * SR))
    sfx *= 1 - (1 - db(-5.0)) * voice
    sfx *= np.clip((TOTAL - 0.05 - t) / 1.6, 0, 1)
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
    print(f"{OUT_PREVIEW.name}: + the guide narration to {timing['clipEnd']} s (NOT for upload)")


if __name__ == "__main__":
    main()
