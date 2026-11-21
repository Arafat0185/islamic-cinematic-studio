"""Sound for video 003 "The Sirat". No music, no instruments, no melodic drones: natural and eerie sounds only.
  always      a deep 30-60 Hz rumble from the abyss (swelling on the reveals and the eruption), roaring fire, crackling
              embers, gusts of hot wind howling over the pit with distant moans blended INTO it (filtered noise with slowly
              gliding vowel formants: no pitch, never screams)
  the story   chains dragging; iron and rock grinding up out of the lava, pillars cracking and falling, a burning boulder, the
              line crumbling, a fire burst; the shared heartbeat (shots.json heartRate:
              slow, then faster through the feet and the breaking); heavy breathing on the close-ups; stones crumbling
              into the pit; the bridge creaking under each step; thunder on the red lightning; the eruption's roar; a huge
              impact as the fire bursts; a falling whoosh into a fire roar on the fall; whooshes on the whip-pans
  levels      the effects at about -26 LUFS, dipping under the reciter's phrases and rising in his pauses; peaks < -1 dBFS
Writes public/audio/sirat_mix.wav (the UPLOAD sound) and public/audio/sirat_preview_mix.wav (the same): Sheikh Yasser
Al-Dossari's Maryam 19:66-72 (public/audio/guide/sirat_recitation.mp4, never committed) at -14 LUFS, cut in the breath after
19:72 (no 19:73), its echo fading over ~1.5 s under the 5 s end card; the effects at about -26 LUFS under it; only rumble
and fire under the end card, fading to silence at the very end.
Run from engine/:  .venv-tts/Scripts/python tools/mix_sirat.py
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
from mix_lastrequest import load, smooth_avg, envelope, put, tt, thunder, heartbeat, breath, howl, creak, rumble  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "003-the-sirat"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "sirat_recitation.mp4"
OUT = HERE.parent / "public" / "audio" / "sirat_mix.wav"
OUT_PREVIEW = HERE.parent / "public" / "audio" / "sirat_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(TOTAL * SR); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(3)


def mask(spans, xf=0.6):
    m = np.zeros(N)
    for a, b in spans: m[int(max(0, a) * SR):int(min(TOTAL, b) * SR)] = 1
    return smooth_avg(m, int(xf * SR))

# ---------------- the sounds ----------------
def abyss_rumble(n):
    t = np.arange(n) / SR
    x = lp(noise(n), 60) * 2.2 + lp(noise(n), 35) * 1.6 + np.sin(2 * np.pi * (38 + 6 * np.sin(2 * np.pi * t / 17)) * t) * 0.15
    return stereo(x * (0.8 + 0.2 * lp(noise(n), 0.5) * 8))
def fire_roar(n, k=1.0):
    t = np.arange(n) / SR; mod = 0.7 + 0.3 * np.clip(lp(noise(n), 2) * 12, -1, 1)
    body = bp(noise(n), 120, 900) * 0.9 + bp(noise(n), 900, 3500) * 0.25
    return np.stack([body * mod * k, (bp(noise(n), 120, 900) * 0.9 + bp(noise(n), 900, 3500) * 0.25) * np.roll(mod, int(0.7 * SR)) * k])
def crackle(n, rate=40):
    d = np.zeros(n); idx = r.integers(0, n, int(n / SR * rate)); d[idx] = r.uniform(0.2, 1.0, idx.size) * np.where(r.random(idx.size) < 0.1, 2.5, 1)
    return np.stack([bp(d, 1800, 9000) * 1.3, bp(np.roll(d, 997), 1800, 9000) * 1.3])
def hot_wind(n):
    t = np.arange(n) / SR; g = 0.45 + 0.55 * np.clip(np.sin(2 * np.pi * t / 7.3) * np.sin(2 * np.pi * t / 19 + 1) + 0.3, 0, 1)
    return np.stack([lp(noise(n), 500) * g, lp(noise(n), 500) * np.roll(g, int(1.1 * SR))]) * 0.9
def moans(d, seed=0):
    """distant moans INSIDE the wind: noise through two slowly gliding vowel-like formants (no pitch), very soft"""
    n = int(d * SR); x = np.zeros(n); seg = int(0.04 * SR); rr = np.random.default_rng(seed); ph = rr.uniform(0, 6)
    for i in range(0, n, seg):
        u = i / SR; f1 = 420 + 160 * np.sin(2 * np.pi * u / 3.7 + ph); f2 = 950 + 300 * np.sin(2 * np.pi * u / 5.1 + ph * 1.3); w = min(seg, n - i)
        x[i:i + w] = (bp(noise(w + 3000), f1 * 0.9, f1 * 1.1)[1500:1500 + w] + 0.6 * bp(noise(w + 3000), f2 * 0.92, f2 * 1.08)[1500:1500 + w])
    env = np.sin(np.pi * np.arange(n) / n) ** 2
    return verb(stereo(x * env * 0.5, rr.uniform(-0.6, 0.6)), HALL)
def chains(d=2.2):
    """chains dragging: a rough scrape and a run of metal clinks (short ringing noise bursts)"""
    n = int(d * SR); out = np.zeros(n); t = np.arange(n) / SR
    scrape = bp(noise(n), 1500, 6000) * (0.25 + 0.2 * np.abs(np.sin(2 * np.pi * 1.7 * t))) * np.sin(np.pi * t / d)
    out += scrape
    for k in range(int(d * 9)):
        at = r.uniform(0, d - 0.1); m = int(0.07 * SR); i = int(at * SR); f0 = r.uniform(2500, 5200)
        out[i:i + m] += bp(noise(m), f0 * 0.97, f0 * 1.03) * np.exp(-np.arange(m) / (0.015 * SR)) * 3.0
    return verb(stereo(out * 0.6, r.uniform(-0.5, 0.5)), HALL)
def scrape(d=1.4, k=1.0):
    """iron scraping on iron: a narrow resonant band sliding down"""
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n); seg = int(0.03 * SR)
    for i in range(0, n, seg):
        c = 3200 - 1700 * (i / n); w = min(seg, n - i); x[i:i + w] = bp(noise(w + 2000), c * 0.96, c * 1.04)[1000:1000 + w]
    return verb(stereo(x * np.sin(np.pi * t / d) ** 0.5 * 1.6 * k), HALL)
def whoosh(d=0.6, k=1.0, lo=200, hi=2400):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n); seg = int(0.02 * SR)
    for i in range(0, n, seg):
        u = i / n; c = lo + (hi - lo) * np.sin(np.pi * u); w = min(seg, n - i); x[i:i + w] = bp(noise(w + 2000), c * 0.6, c * 1.5)[1000:1000 + w]
    env = np.sin(np.pi * t / d) ** 2
    return np.stack([x * env * k * (1 - 0.5 * t / d), x * env * k * (0.5 + 0.5 * t / d)])
def snap(k=1.0):
    t = tt(0.4); return verb(stereo(bp(noise(t.size), 1500, 9000) * np.exp(-t / 0.012) * 2.2 * k + lp(noise(t.size), 200) * np.exp(-t / 0.05) * 1.5 * k), ROOM)
def impact(k=1.0):
    """a heavy impact: a sub boom, a crash, a long ringing tail of noise"""
    t = tt(3.0); boom = (lp(noise(t.size), 70) * 4 + np.sin(2 * np.pi * 34 * t) * 1.2) * np.exp(-t / 0.5) * np.minimum(1, t / 0.004)
    crash = bp(noise(t.size), 600, 7000) * np.exp(-t / 0.18) * 1.8 + bp(noise(t.size), 2500, 5000) * np.exp(-t / 0.9) * 0.4
    return verb(stereo((boom + crash) * k), HALL)
def stones(d=1.6):
    n = int(d * SR); out = np.zeros(n)
    for k in range(26):
        at = (r.random() ** 1.6) * (d - 0.15); m = int(0.05 * SR); i = int(at * SR)
        out[i:i + m] += bp(noise(m), 700, 5000) * np.exp(-np.arange(m) / (0.008 * SR)) * (1.0 - 0.5 * at / d)
    return verb(stereo(out + bp(noise(n), 300, 2500) * np.exp(-np.arange(n) / SR / 0.3) * 0.4, -0.2), HALL)
def bridge_creak(k=1.0):
    return creak(0.5 + 0.3 * r.random()) * 0.8 * k
def volcano_boom(k=1.0):
    """a far volcano erupting: a deep boom rolling away (filtered noise, no tone)"""
    t = tt(4.0); x = lp(noise(t.size), 90) * 2.6 * np.minimum(1, t / 0.03) * np.exp(-t / 0.9) + bp(noise(t.size), 90, 500) * np.exp(-t / 0.4) * 0.8
    return verb(stereo(x * k), HALL)
def lava_bubbles(d, rate=3.0):
    """lava bubbling and bursting: thick low pops"""
    n = int(d * SR); out = np.zeros(n)
    for _ in range(int(d * rate)):
        i = int(r.uniform(0, d - 0.3) * SR); m = int(0.25 * SR); u = np.arange(m) / SR; f0 = r.uniform(70, 160)
        out[i:i + m] += (lp(noise(m), 300) * 1.4 + bp(noise(m), f0, f0 * 3)) * np.exp(-u / 0.06) * np.minimum(1, u / 0.01) * r.uniform(0.4, 1.0)
    return stereo(out, r.uniform(-0.4, 0.4))
def tornado_roar(d):
    """a fire tornado: a roaring, swirling band of noise (its pan circling)"""
    n = int(d * SR); t = np.arange(n) / SR; x = bp(noise(n), 150, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 2.3 * t)) * np.sin(np.pi * t / d) ** 0.7
    pan = np.sin(2 * np.pi * 0.6 * t)
    return np.stack([x * (0.6 - 0.4 * pan), x * (0.6 + 0.4 * pan)])
def rock_crack(k=1.0):
    t = tt(1.6); x = bp(noise(t.size), 400, 5000) * np.exp(-t / 0.03) * 2.0 + lp(noise(t.size), 250) * np.exp(-t / 0.2) * 1.2
    return verb(stereo(x * k), HALL)
def hiss(d):
    """cinders hissing as they land"""
    n = int(d * SR); d0 = np.zeros(n); idx = r.integers(0, n, int(d * 25)); d0[idx] = 1
    env = smooth_avg(d0, int(0.05 * SR)) * 30
    return stereo(hp(noise(n), 5000) * np.clip(env, 0, 1) * 0.5)
def fall_whoosh(d=3.8):
    """the fall: wind tearing past, rising, into the roar of the fire"""
    n = int(d * SR); t = np.arange(n) / SR; u = t / d
    wind = bp(noise(n), 200, 3000) * (0.3 + 1.2 * u ** 2)
    roar = (bp(noise(n), 80, 900) * 1.4 + lp(noise(n), 60) * 2) * np.clip((u - 0.55) / 0.45, 0, 1) ** 2
    return stereo(wind + roar)

# ---------------- the heartbeat (the same schedule as the picture's pulsing vignette) ----------------
def beats():
    out = []
    for a, b, r0, r1 in E["heartRate"]:
        t = a
        while t < b: out.append(t); t += 60.0 / (r0 + (r1 - r0) * (t - a) / (b - a))
    return out


def main():
    t = np.arange(N) / SR
    sh = lambda k: S[k]["at"]
    # ---------------- the beds ----------------
    reveal = mask([(0, 6.0), (31.8, 41.0), (65.4, 67.8), (98.85, 104.6)], 1.2)
    erupt = mask([(31.8, 40.8), (65.4, 67.8)], 1.5)
    bed = abyss_rumble(N) * (0.55 + 0.45 * reveal + 0.6 * erupt)
    bed += fire_roar(N) * (0.35 + 0.3 * reveal + 0.9 * erupt)
    amb = crackle(N) * 0.5 + crackle(N, 12) * 0.6 + hot_wind(N) * 0.55
    for i, at in enumerate([3.0, 18.5, 26.0, 43.0, 55.0, 70.0, 88.0, 100.0]): put(amb, moans(6.0, i), at, -16)
    for i, at in enumerate([1.0, 12.0, 24.0, 47.0, 61.0, 79.0, 95.0]): put(amb, howl(4.5), at, -8)
    # ---------------- the story ----------------
    fx = np.zeros((2, N))
    put(fx, whoosh(1.2, 1.4, 100, 1800), 0.0, -2); put(fx, rumble(3.0, 1.4), 0.0, -2)              # bursting out of the smoke
    for a, k in E["transitions"]:
        if k == "whip": put(fx, whoosh(0.45, 1.3, 300, 4500), a - 0.25, -4)
        if k == "smoke": put(fx, whoosh(0.9, 0.8, 120, 900), a - 0.45, -8)
        if k == "burn": put(fx, fire_roar(int(0.9 * SR), 1.3) * np.sin(np.pi * np.arange(int(0.9 * SR)) / int(0.9 * SR)), a - 0.45, -2)
    for at in E["lightning"]: put(fx, thunder(close=True), at + 0.03, -4)
    e0 = E["erupt"][0]; put(fx, rumble(9.0, 1.6), e0, 0); put(fx, thunder(close=True), E["erupt"][1] - 0.05, 0); put(fx, fire_roar(int(7 * SR), 1.6), E["erupt"][1], -2)   # the eruption
    put(fx, fire_roar(int(2.6 * SR), 1.3), E["rise"][0], -3); put(fx, rumble(2.6, 1.2), E["rise"][0], -4)
    for at in [9.0, 20.0, 47.0, 50.5, 53.0, 57.0, 62.0]: put(fx, chains(2.4), at, -8)            # chains: the gathering, the dragging out (19:68-70)
    for b in beats(): put(fx, heartbeat(0.9 + 0.5 * min(1, (b - 10) / 90)), b, -3)
    for k in ["fearUp", "hands", "fearTight", "stareA", "stareB", "lookDown2", "breaking"]:          # heavy breathing on the close-ups
        d = S[k]["to"] - S[k]["at"]; put(fx, breath(d, 1.4 if k in ("lookDown2", "breaking") else 0.9), S[k]["at"], -4)
    put(fx, stones(1.8), E["crumble"], -2)
    for a, b, P in [(sh("feetEdge"), sh("sideTrack"), 0.62), (sh("sideTrack"), sh("underCross"), 0.66), (sh("crossersPast"), sh("lookDown2"), 0.6), (sh("feetFire"), sh("breaking"), 0.45)]:
        st = a + 0.2
        while st < b: put(fx, bridge_creak(), st, -6); st += P + r.uniform(-0.05, 0.05)
    put(fx, rumble(2.0, 1.2), sh("feetVertigo"), -4); put(fx, whoosh(1.8, 0.9, 80, 600), sh("feetVertigo") + 0.1, -6)  # the vertigo
    # the ruins (no hooks): iron and rock grinding up out of the lava, pillars cracking and falling, a boulder, the line breaking
    for i in range(6): put(fx, scrape(1.6, 0.5), E["pillarRise"][0] + 0.6 * i, -14); put(fx, rumble(1.6, 0.8), E["pillarRise"][0] + 0.6 * i, -10)
    for at in E["collapse"]: put(fx, rock_crack(1.3), at, -2); put(fx, rumble(2.6, 1.4), at + 0.3, -2); put(fx, stones(2.0), at + 0.8, -4)
    put(fx, fire_roar(int(1.6 * SR), 1.4), sh("stumbleAhead") + 0.6, -4); put(fx, snap(0.6), sh("stumbleAhead") + 1.2, -8)   # a geyser bursts beside him
    put(fx, whoosh(1.4, 1.8, 120, 2800), E["pass"] - 0.7, 0); put(fx, impact(0.8), E["pass"] + 0.6, -6)            # the burning boulder
    put(fx, rock_crack(1.2), E["snatch"] - 0.05, 0); put(fx, stones(1.6), E["snatch"] + 0.1, -2); put(fx, whoosh(0.9, 1.2, 150, 1500), E["snatch"] + 0.2, -4)   # the line crumbles
    for i in range(14): put(fx, bp(noise(int(0.08 * SR)), 2000, 8000)[None, :].repeat(2, 0) * np.exp(-np.arange(int(0.08 * SR)) / (0.01 * SR)) * 1.2, E["items"] + 0.08 * i + 0.1, -10)   # coins
    put(fx, fire_roar(int(2.0 * SR), 1.2), sh("matFire") + 0.3, -6)
    put(fx, scrape(2.0, 0.9), sh("breaking") + 0.3, -6); put(fx, rumble(2.2, 1.4), sh("breaking"), -4)
    put(fx, whoosh(0.5, 2.0, 200, 3500), E["strike"] - 0.45, 0); put(fx, impact(1.4), E["strike"] - 0.02, 0); put(fx, fire_roar(int(1.8 * SR), 1.8), E["strike"], 0)   # the fire burst that engulfs
    put(fx, fall_whoosh(3.4), sh("fallWith"), 0); put(fx, rumble(3.6, 1.6), sh("fallWith"), -2)          # the fall
    put(fx, rumble(3.0, 0.9), sh("continue"), -8)
    # nature, no beings: volcanoes, lava, fire tornadoes, rock, chains in the dark, cinders
    for at in [4.5, 16.0, 29.0, 52.0, 63.5, 79.0, 93.0]: put(fx, volcano_boom(), at, -6)
    put(amb, lava_bubbles(TOTAL - 1), 0.2, -10)
    for k in ["bridgeFly", "underBridge", "eruptRise", "underCross", "feetFire", "topDown"]: put(fx, lava_bubbles(S[k]["to"] - S[k]["at"], 9.0), S[k]["at"], -4)
    for k in ["burst", "topDown", "eruptWide", "wideLone", "eruptRise"]: put(fx, tornado_roar(S[k]["to"] - S[k]["at"] + 0.6), S[k]["at"], -6)
    for at in [9.5, 22.5, 74.0, 76.0]: put(fx, rock_crack(), at, -4); put(fx, stones(1.4), at + 0.1, -6)
    for at in [3.5, 14.0, 37.0, 60.8, 70.5, 81.0, 91.5]: put(fx, chains(2.0), at, -12)
    put(amb, hiss(TOTAL - 1), 0.2, -14)
    put(fx, bp(noise(int(1.6 * SR)), 2500, 7000)[None, :].repeat(2, 0) * 0.08, sh("hourglass"), -14)   # the last grains of sand
    put(fx, howl(3.2) * 1.8, sh("smokeDevils"), 0); put(fx, hot_wind(int(3.0 * SR)) * 1.6, sh("smokeDevils"), -2)   # "the devils": only the wind louder
    # ---------------- the recitation, IN our file: cut in the breath after 19:72, its echo fading under the end card ----------------
    meter = pyln.Meter(SR)
    RE = timing["recEnd"]; ce = int(RE * SR)
    gd = load(GUIDE); rec = np.zeros((2, N)); m = min(gd.shape[1], ce); rec[:, :m] = gd[:, :m]
    fo = int(0.03 * SR); rec[:, ce - fo:ce] *= np.linspace(1, 0, fo)                                   # nothing of 19:73 (it starts at 110.3 s)
    # the echo tail: the last 1.2 s of his voice through a 1.6 s decaying room (made here, NOT taken from the recording)
    src = rec[:, ce - int(1.2 * SR):ce]; tl_ = np.arange(int(1.6 * SR)) / SR
    ir = noise(tl_.size) * np.exp(-tl_ / 0.45); ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = np.stack([np.convolve(src[0], ir)[:src.shape[1] + ir.size], np.convolve(src[1], np.roll(ir, 37))[:src.shape[1] + ir.size]]) * 0.5
    tail = wet[:, src.shape[1]:]; tail *= np.clip(1 - np.arange(tail.shape[1]) / int(1.5 * SR), 0, 1) ** 1.5
    put(rec, tail, RE, 0)
    rec *= db(-14.0 - meter.integrated_loudness(rec[:, :ce].T))
    # ---------------- the effects under it: the beds (rumble, fire) duck hard under the phrases, the rest dips a little ----------------
    env = np.clip(smooth_avg(envelope(rec, 0.15), int(0.4 * SR)), 0, 1)
    sfx = bed * (1 - 0.6 * env) + (amb + fx) * (1 - 0.3 * env)
    for a in [sh("smash1"), sh("smash2")]:                                   # a sudden silence (the smash to black), then the roar
        i0, i1 = int((a - 0.05) * SR), int((a + 0.22) * SR); fade = np.ones(N); fade[i0:i1] = db(-34); sfx *= smooth_avg(fade, int(0.02 * SR))
    sfx *= db(-26.0 - meter.integrated_loudness(sfx[:, :ce].T))
    # the end card: only the low rumble and the fire, fading to silence at the very end
    card = timing["cardFrom"]; endk = np.clip((t - card) / (TOTAL - card), 0, 1)
    low = bed * (1 - 0.6 * env); low *= db(-27.0 - meter.integrated_loudness(low[:, :ce].T))
    blend = np.clip((t - card) / 0.8, 0, 1)                                    # the effects give way to the low bed over 0.8 s
    sfx = (sfx * (1 - blend) + low * blend) * (1 - endk) ** 0.55 * np.clip(t / 0.05, 0, 1)
    def limit(x, ceil):
        up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=120)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    mix = rec + sfx
    g = 0.0
    for _ in range(10):                                                       # the recitation at -14 LUFS, peaks under -1 dBFS
        y = limit(mix * db(g), -2.2) * db(-1.8); L = meter.integrated_loudness(y[:, :ce].T)   # the limiter normalises its ceiling to 0 dBFS: bring it to -1.8 (AAC adds ~0.3 dB)
        if abs(L + 14.0) < 0.1: break
        g += -14.0 - L
    y = y * min(1.0, db(-1.8) / np.abs(y).max())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, y.T, SR, subtype="PCM_24"); sf.write(OUT_PREVIEW, y.T, SR, subtype="PCM_24")
    sv = limit(sfx * db(g), -1.5)
    print(f"{OUT.name} (= {OUT_PREVIEW.name}): {y.shape[1] / SR:.2f} s; recitation span {meter.integrated_loudness(y[:, :ce].T):.1f} LUFS; effects alone {meter.integrated_loudness(sv[:, :ce].T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")


if __name__ == "__main__":
    main()
