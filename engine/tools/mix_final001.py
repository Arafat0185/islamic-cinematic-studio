"""Sound for video 001, final version. Every sound is synthesized here (nothing sampled, downloaded or licensed). No
music, no instruments, no adhan, no Quran audio, and no musical notes: risers, shimmers, pings, glitches, buzzes and
glass are all made from filtered NOISE. The only sine waves left are the low "body" of hits and thuds (continuous
downward sweeps under ~120 Hz that die away in under a second, like a kick of air) and the crickets in the courtyard
ambience.

Reads videos/<id>/final/plan.json, the plan the picture uses, so every sound lands on its frame:
  sfx     the sound map: each effect tied to something on screen or a spoken word (coins = clinks, bubbles = pings,
          cracks = glass, cuts = whooshes, slams = impacts, the lamp = flicker / snuff ...)
  beds    an ambience per location (night city, office, feed world, the void, the deadline wall, the phone, the airport,
          the bedroom, traffic, the sofa, the courtyard), crossfaded at the cuts
  silences  hard silences (after the shatter, after "you've lost"): beds and effects drop out
  quiet   the 5 s quiet moment: soft courtyard ambience only (no voice, no effects)
  voice   final/voice_dry.wav (+ voice_court.wav: the courtyard part, which gets a little room reverb): high-pass, a cut
          in the low mids, a presence lift, compression: close and upfront
The beds dip ~12 dB and the effects ~9 dB under the voice. Master: -14 LUFS integrated, true peak <= -1 dBTP.

Run from engine/:
  .venv-tts/Scripts/python tools/mix_final001.py ../videos/001-the-first-question public/audio/final001_mix.wav
"""
import json
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Pedalboard, Compressor, HighpassFilter, LowShelfFilter, PeakFilter, Reverb, Limiter, Gain
from scipy.signal import resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mix_d3 import (SR, rng, db, lp, hp, bp, noise, tt, env, stereo, verb, ROOM, HALL, impact, hit, hit_layered,
                    whoosh, sub_drop, thud, bed as bed_d3, envelope)

# ---------------- noise-only versions of draft 3's tonal sounds (no pitches, no notes) ----------------
def riser(dur=1.0, soft=False):
    """a riser before a reveal: band-passed NOISE whose band sweeps upward and swells (no tone, no pitch glide)"""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = np.zeros(n); x = noise(n)
    for k in range(12):
        a, b = int(k * n / 12), int((k + 1) * n / 12); c = 400 + 4500 * ((k + 0.5) / 12) ** 2
        nz[a:b] = bp(x, c * 0.6, c * 1.6)[a:b]
    air = hp(noise(n), 3000) * 0.15
    e = u ** 2.2 * (1 - np.clip((u - 0.97) / 0.03, 0, 1))
    return verb(stereo((nz * 0.7 + air) * e * (0.55 if soft else 1.0))) * db(-8)

def shimmer(dur=1.0, soft=False):
    """soft light: a cloud of tiny bursts of high, wide-band NOISE (airy sparkle, no tones), with a slow swell"""
    n = int(dur * SR); x = np.zeros(n); t = np.arange(n) / SR
    for _ in range(int(80 * dur)):
        m = int(rng.uniform(0.02, 0.06) * SR); i = rng.integers(0, max(1, n - m))
        lo = rng.uniform(3500, 7000)
        x[i:i + m] += bp(noise(m), lo, min(lo * 1.8, 20000)) * np.hanning(m) * rng.uniform(0.3, 1.0)
    x *= np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    return verb(stereo(x * 0.35 * (0.6 if soft else 1.0)), HALL) * db(-6)

def ping(soft=False):
    """a notification: a short bright tick-pop of band-passed NOISE (no tone, no chime)"""
    n = int(0.12 * SR); t = np.arange(n) / SR
    pop = (bp(noise(n), 1800, 6000) * np.exp(-t / 0.018) * 0.9 + bp(noise(n), 4000, 11000) * np.exp(-t / 0.004) * 0.5) * np.minimum(1, t / 0.002)
    return verb(stereo(pop, rng.uniform(-0.6, 0.6))) * db(-9 if soft else -6)

def glitch():
    """a short digital stutter: gated bursts of bright NOISE (no buzz tones)"""
    n = int(0.22 * SR); x = np.zeros(n)
    for k in range(5):
        a = int(k * 0.044 * SR); m = int(0.022 * SR)
        x[a:a + m] = (bp(noise(m), 1500, 7000) * 0.7 + lp(noise(m), 600) * 0.4) * (rng.random() > 0.25)
    return stereo(x, rng.uniform(-0.4, 0.4)) * db(-12)

def crack():
    """glass cracking: a sharp NOISE burst, short glassy noise 'tings' (band-passed noise, no sine pings), crackles
    and a dull low thud"""
    n = int(0.9 * SR); t = np.arange(n) / SR
    glass = hp(noise(n), 2500, 4) * env(n, 0.0005, 0.035)
    for lo in (3000, 4400, 6000):
        glass += bp(noise(n), lo, lo * 1.5) * env(n, 0.0005, 0.05) * (rng.random() + 0.5) * 0.6
    tick = np.zeros(n)
    for k in range(5):
        i = int((0.03 + 0.05 * k + rng.random() * 0.03) * SR); m = int(0.01 * SR)
        tick[i:i + m] += hp(noise(m), 3000) * np.exp(-np.arange(m) / (0.002 * SR)) * 0.5
    thud = np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.03)) * t) * env(n, 0.002, 0.16) * 1.4
    return verb(stereo(glass * 0.8 + tick + thud)) * db(-2)

def crack_layered():
    c = crack(); d = sub_drop(); m = min(c.shape[1], d.shape[1]); c[:, :m] += d[:, :m] * 0.35
    return c

def traffic_pass():
    """a car passing in the distance: a swell of low road NOISE (replaces the two-tone horns)"""
    n = int(1.4 * SR); t = np.arange(n) / SR
    return stereo(lp(noise(n), 500) * np.sin(np.pi * t / 1.4) ** 2 * 0.6, rng.uniform(-0.7, 0.7)) * db(-6)

def mains_buzz(n, t, hz=100):
    """an electrical buzz: NOISE switched on and off 100 times a second (a texture, not a held note)"""
    return bp(noise(n), 150, 3000) * (np.sin(2 * np.pi * hz * t) > 0.6) * 0.5

# ---------------- new one-shots ----------------
def impact_big():
    """the crash-zoom landing: a heavy boom, a sub drop and a bright transient"""
    h = hit_layered(False, True)
    n = int(0.08 * SR); tr = hp(noise(n), 2000) * np.exp(-np.arange(n) / (0.01 * SR)) * 0.8
    h[:, :n] += stereo(tr)
    return h

def coin(pan=0.0):
    """a coin: a short bright metallic 'chink' made of NOISE (a sharp tick and quickly decaying high noise bands, no
    sine partials)"""
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = hp(noise(n), 5000) * np.exp(-t / 0.003) * 0.8
    for lo in rng.uniform(2500, 7000, 3):
        x += bp(noise(n), lo, min(lo * 1.6, 20000)) * np.exp(-t / rng.uniform(0.02, 0.05)) * 0.5
    return verb(stereo(x * 0.6, pan)) * db(-6)

def paper(pan=0.0):
    """a sheet of paper flying past: a crisp flutter"""
    n = int(0.3 * SR); t = np.arange(n) / SR
    flut = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * rng.uniform(25, 40) * t)))
    return stereo(bp(noise(n), 1500, 7000) * flut * np.sin(np.pi * t / 0.3) ** 2 * 0.6, pan) * db(-6)

def keys():
    """frantic typing: a burst of keyboard clicks"""
    n = int(0.5 * SR); x = np.zeros(n)
    for k in range(14):
        i = int((k * 0.034 + rng.random() * 0.01) * SR); m = int(0.012 * SR)
        if i + m < n: x[i:i + m] += bp(noise(m), 1500, 5000) * np.exp(-np.arange(m) / (0.003 * SR))
    return stereo(x * 0.7, 0.2) * db(-4)

def zoom_in(dur=0.3):
    """a zoom-through: a rising whoosh that is sucked in (reversed-swell feel)"""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    out = np.zeros(n); x = noise(n)
    for k in range(8):
        a, b = int(k * n / 8), int((k + 1) * n / 8); c = 500 + 4000 * ((k + 0.5) / 8) ** 2
        out[a:b] = bp(x, c * 0.6, c * 1.4)[a:b]
    return stereo(out * u ** 2.5 * 0.9) * db(-4)

def freeze():
    """the world freezes: everything stops like a tape halting (a falling-pitch tone and a muffled thump)"""
    n = int(0.45 * SR); t = np.arange(n) / SR
    x = np.zeros(n); src = noise(n)                    # NOISE whose low-pass closes down fast (no falling tone)
    for k in range(9):
        a, b = int(k * n / 9), int((k + 1) * n / 9); c = 3500 * np.exp(-((k + 0.5) / 9) / 0.25) + 60
        x[a:b] = lp(src, c)[a:b]
    x = x * np.exp(-t / 0.25) * 0.9 + lp(noise(n), 400) * np.exp(-t / 0.06) * 0.5
    return verb(stereo(x)) * db(-3)

def shatter():
    """the frame shatters toward the lens: a big glass burst, many pieces, a low boom, spreading across"""
    n = int(1.6 * SR); out = np.zeros((2, n))
    burst = lp(hp(noise(n), 1800, 4), 12000) * env(n, 0.003, 0.12) * 1.2   # 3 ms attack, no top end: it encodes cleanly
    out += stereo(burst)
    for _ in range(40):  # pieces flying past and tinkling
        c = crack() * rng.uniform(0.08, 0.3); i = int(rng.uniform(0.0, 0.7) * SR); m = min(c.shape[1], n - i)
        pan = rng.uniform(-0.9, 0.9); out[0, i:i + m] += c[0, :m] * (1 - pan) / 2 * 2; out[1, i:i + m] += c[1, :m] * (1 + pan) / 2 * 2
    h = hit(False); m = min(n, h.shape[1]); out[:, :m] += h[:, :m] * 0.8
    return verb(out, HALL) * db(-2)

def slam():
    """FIRST slams in: a huge layered hit, sub drop, and a whip crack of air"""
    h = hit_layered(False, True) * 1.1
    n = int(0.05 * SR); h[:, :n] += stereo(bp(noise(n), 800, 6000) * np.exp(-np.arange(n) / (0.008 * SR)))
    return h

def spot_on():
    """a big stage spotlight switching on: a heavy clunk and a short electric hum swelling"""
    n = int(1.2 * SR); t = np.arange(n) / SR
    clunk = lp(noise(n), 1200) * env(n, 0.001, 0.03) * 1.2 + np.sin(2 * np.pi * 90 * t) * env(n, 0.001, 0.08)
    hum = mains_buzz(n, t) * np.minimum(1, t / 0.05) * np.exp(-t / 0.5) * 0.25
    return verb(stereo(clunk + hum), HALL) * db(-4)

def dots_on():
    """the five dots light up one after another: five small soft clicks"""
    n = int(0.8 * SR); x = np.zeros(n)
    for k in range(5):
        i = int(k * 0.12 * SR); m = int(0.03 * SR)
        x[i:i + m] += bp(noise(m), 1200, 4500) * np.exp(-np.arange(m) / (0.004 * SR)) * 0.8
    return stereo(x) * db(-4)

def whoosh_fast():
    return whoosh(0.22) * db(2)

def whoosh_soft():
    return whoosh(0.5, soft=True) * db(-2)

def board_flap():
    """the departures board flipping: a fast clatter of small plastic flaps"""
    n = int(0.7 * SR); x = np.zeros(n)
    for k in range(40):
        i = int((k * 0.016 + rng.random() * 0.006) * SR); m = int(0.008 * SR)
        if i + m < n: x[i:i + m] += bp(noise(m), 1200, 6000) * np.exp(-np.arange(m) / (0.0015 * SR)) * (1 - k / 45)
    return verb(stereo(x * 0.7), HALL) * db(-4)

def lapse(dur):
    """the time-lapse: a clock's ticks racing, a whirr under them, for the whole time-lapse"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n); tp, gap = 0.0, 0.06
    while tp < dur:
        i = int(tp * SR); m = min(int(0.005 * SR), n - i)
        x[i:i + m] += hp(noise(m), 2500) * np.exp(-np.arange(m) / (0.0012 * SR)) * 0.8
        tp += gap; gap = max(0.028, gap * 0.97)
    whirr = bp(noise(n), 600, 2400) * (0.4 + 0.2 * np.sin(2 * np.pi * 6 * t)) * 0.25
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.25)
    return stereo((x + whirr) * e) * db(-6)

def punch_hit():
    return impact() * db(-1)

def lamp_whoosh():
    """into the courtyard: a soft rush of air that becomes the lamp's warm hush"""
    n = int(1.0 * SR); t = np.arange(n) / SR
    air = bp(noise(n), 300, 2000) * np.exp(-t / 0.35) * np.minimum(1, t / 0.03)
    flame = lp(noise(n), 500) * np.minimum(1, t / 0.2) * np.exp(-t / 0.6) * 0.6
    return verb(stereo(air * 0.6 + flame), HALL) * db(-4)

def iris():
    """the star iris: a soft, rounded swish"""
    n = int(0.45 * SR); t = np.arange(n) / SR
    return verb(stereo(bp(noise(n), 500, 2500) * np.sin(np.pi * t / 0.45) ** 2 * 0.5), HALL) * db(-6)

def hit_soft():
    return hit(True) * db(-4)

def snuff():
    """the lamp snuffed out: a puff of air and a low thud, then nothing"""
    n = int(0.3 * SR); t = np.arange(n) / SR
    puff = bp(noise(n), 400, 2500) * np.exp(-t / 0.05) * 0.6
    th = thud(); th[:, :n] += stereo(puff)
    return th

def riser_soft():
    return riser(0.8, soft=True)

def relight():
    """the lamp re-lit by the mercy: a soft whoomp of flame and a warm swell of light"""
    n = int(1.4 * SR); t = np.arange(n) / SR
    whoomp = lp(noise(n), 700) * (1 - np.exp(-t / 0.02)) * np.exp(-t / 0.25) * 1.2 + np.sin(2 * np.pi * (60 + 30 * np.exp(-t / 0.05)) * t) * env(n, 0.004, 0.3) * 0.8
    s = shimmer(1.4, soft=True); m = min(n, s.shape[1])
    out = verb(stereo(whoomp), HALL); out[:, :m] += s[:, :m] * 0.7
    return out * db(-2)

def shimmer_soft():
    return shimmer(1.0, soft=True)

def mend():
    """a cracked dot mended by a light: a soft airy brush and a few fine sparkles (not a note)"""
    s = shimmer(0.6, soft=True)
    n = s.shape[1]; t = np.arange(n) / SR
    s += stereo(bp(noise(n), 2000, 8000) * np.sin(np.pi * np.minimum(1, t / 0.6)) ** 2 * 0.15)
    return s * db(2)

def steps():
    """four soft footsteps on stone (the walk to the mat)"""
    n = int(2.2 * SR); x = np.zeros(n)
    for k in range(4):
        i = int(k * 0.42 * SR); m = int(0.08 * SR)
        x[i:i + m] += lp(noise(m), 1500) * np.exp(-np.arange(m) / (0.012 * SR)) * 0.8 + np.sin(2 * np.pi * 110 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.015 * SR)) * 0.3
    return verb(stereo(x), ROOM) * db(-4)

def cloth():
    """takbir: the rustle of sleeves as the hands rise"""
    n = int(0.45 * SR); t = np.arange(n) / SR
    return verb(stereo(bp(noise(n), 800, 5000) * np.sin(np.pi * t / 0.45) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t)) * 0.5)) * db(-4)

def rise_air(dur=3.2):
    """the crane up: a long, soft swell of open air"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(noise(n), 900) * np.sin(np.pi * t / dur) ** 2 * 0.5
    return verb(stereo(x), HALL) * db(-4)

def card_in():
    """the end card: a soft low settle and a breath of air"""
    n = int(1.0 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (70 + 20 * np.exp(-t / 0.05)) * t) * env(n, 0.01, 0.35) * 0.6 + bp(noise(n), 300, 2000) * env(n, 0.02, 0.2) * 0.25
    return verb(stereo(x), HALL) * db(-4)

def flicker():
    """the lamp flickering: small irregular crackles of a flame"""
    n = int(1.2 * SR); x = np.zeros(n)
    for _ in range(18):
        i = rng.integers(0, n - 2000); m = int(0.01 * SR)
        x[i:i + m] += bp(noise(m), 800, 4000) * np.exp(-np.arange(m) / (0.002 * SR)) * rng.uniform(0.3, 1.0)
    return verb(stereo(x * 0.6 + lp(noise(n), 300) * 0.15)) * db(-4)

def dot_crack():
    return crack_layered()

ONE = {
    "riser_short": lambda e: riser(0.8), "impact_big": lambda e: impact_big(), "sub_drop": lambda e: sub_drop(), "coin": lambda e: coin(e["pan"]),
    "whoosh_fast": lambda e: whoosh_fast(), "impact": lambda e: impact() * db(2), "paper": lambda e: paper(e["pan"]), "keys": lambda e: keys(),
    "zoom_in": lambda e: zoom_in(), "ping": lambda e: ping() * db(3), "freeze": lambda e: freeze(), "glass_crack": lambda e: crack(),
    "shatter": lambda e: shatter(), "slam": lambda e: slam(), "spot_on": lambda e: spot_on(), "whoosh_soft": lambda e: whoosh_soft(),
    "dots_on": lambda e: dots_on(), "glitch": lambda e: glitch() * db(6), "board_flap": lambda e: board_flap(), "punch_hit": lambda e: punch_hit(),
    "dot_crack": lambda e: dot_crack(), "riser": lambda e: riser(0.5), "lamp_whoosh": lambda e: lamp_whoosh(), "iris": lambda e: iris(),
    "hit_soft": lambda e: hit_soft(), "snuff": lambda e: snuff(), "riser_soft": lambda e: riser_soft(), "relight": lambda e: relight(),
    "shimmer_soft": lambda e: shimmer_soft(), "mend": lambda e: mend(), "steps": lambda e: steps(), "cloth": lambda e: cloth(),
    "rise_air": lambda e: rise_air(), "card_in": lambda e: card_in(), "flicker": lambda e: flicker(),
}

# ---------------- beds ----------------
def bed(kind, n):
    t = np.arange(n) / SR
    if kind == "city_night":
        x = bed_d3("city", n) * db(-2)
        for k in range(int(n / SR / 2) + 1):  # cars passing in the distance now and then
            i = int((0.5 + 1.7 * k) * SR); h = traffic_pass() * db(-8)
            if i < n: m = min(h.shape[1], n - i); x[:, i:i + m] += h[:, :m]
        return x
    if kind == "office": return bed_d3("office", n) * db(3)
    if kind == "feed":   # electronics: a low hum, a digital hiss, faint data blips
        x = stereo(lp(noise(n), 160) * 0.5 + mains_buzz(n, t) * 0.15 + bp(noise(n), 5000, 9000) * 0.03)
        for _ in range(int(n / SR * 8)):   # data ticks: tiny noise clicks
            i = rng.integers(0, n - 1000); m = int(0.008 * SR)
            x[:, i:i + m] += hp(noise(m), 2500) * np.exp(-np.arange(m) / (0.0015 * SR)) * 0.2
        return x * db(-16)
    if kind == "void": return stereo(lp(noise(n), 120) * 0.5) * db(-28)
    if kind == "deadlines":  # fluorescent buzz, a fast ticking clock, a printer in the distance
        x = stereo(mains_buzz(n, t) * 0.12 + lp(noise(n), 300) * 0.3)
        for k in range(int(n / SR * 4)):
            i = int(k * SR / 4); m = int(0.006 * SR)
            if i + m < n: x[:, i:i + m] += hp(noise(m), 2500) * np.exp(-np.arange(m) / (0.0015 * SR)) * 0.4
        x += stereo(bp(noise(n), 600, 2000) * (np.sin(2 * np.pi * 7 * t) > 0) * 0.06, 0.6)
        return x * db(-16)
    if kind == "phone": return stereo(lp(noise(n), 250) * 0.4) * db(-24)
    if kind == "airport":    # a big hall: crowd wash, rolling suitcases, the air system (no announcements)
        crowd = bp(noise(n), 300, 2500) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))
        roll = bp(noise(n), 150, 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * 0.15
        return verb(stereo(crowd + roll + lp(noise(n), 150) * 0.4), HALL) * db(-14)
    if kind == "bedroom": return bed_d3("room_dawn", n) * db(4)
    if kind == "traffic":    # idling engines, a rumble, horns
        x = stereo(lp(noise(n), 140) * 0.8 + lp(noise(n), 60) * 0.5 + bp(noise(n), 300, 900) * 0.2)
        h = traffic_pass(); i = int(0.1 * SR); m = min(h.shape[1], n - i)
        if m > 0: x[:, i:i + m] += h[:, :m]
        return x * db(-14)
    if kind == "sofa": return bed_d3("room_night", n) * db(2)
    if kind == "courtyard": return bed_d3("courtyard", n) * db(2)
    if kind == "courtyard_soft": return bed_d3("courtyard", n) * db(-2)
    raise ValueError(kind)

# ---------------- voice ----------------
CHAIN = Pedalboard([
    HighpassFilter(85), LowShelfFilter(cutoff_frequency_hz=220, gain_db=-1.5), PeakFilter(cutoff_frequency_hz=350, gain_db=-2.0, q=1.0),
    PeakFilter(cutoff_frequency_hz=3800, gain_db=3.5, q=0.8), PeakFilter(cutoff_frequency_hz=9000, gain_db=1.5, q=0.7),
    Compressor(threshold_db=-22, ratio=3.5, attack_ms=3, release_ms=90), Gain(6),
])
ROOMV = Pedalboard([Reverb(room_size=0.28, damping=0.6, wet_level=1.0, dry_level=0.0, width=0.8)])

TP_WAV = -2.8   # the WAV's true-peak ceiling: AAC encoding overshoots, and the final file must stay <= -1 dBTP

def true_peak(x):
    return float(np.max(np.abs(resample_poly(x, 4, 1, axis=1))))


def main(video_dir: Path, out: Path) -> None:
    plan = json.loads((video_dir / "final" / "plan.json").read_text(encoding="utf-8"))
    total = plan["duration"]; n = int(total * SR) + 1
    # voice
    dry, vsr = sf.read(video_dir / "final" / "voice_dry.wav", dtype="float32")
    court, _ = sf.read(video_dir / "final" / "voice_court.wav", dtype="float32")
    dry = resample_poly(dry, SR, vsr).astype(np.float32)[:n]; court = resample_poly(court, SR, vsr).astype(np.float32)[:n]
    dry = np.pad(dry, (0, n - len(dry))); court = np.pad(court, (0, n - len(court)))
    v = CHAIN(dry[np.newaxis, :], SR)[0]
    wet = ROOMV(np.stack([CHAIN(court[np.newaxis, :], SR)[0]] * 2), SR) * db(-15)
    voice = np.stack([v, v]) + wet[:, :n]
    # the voice envelope drives the ducking
    duck = envelope(v, 0.02, 0.35)
    # beds, crossfaded 0.12 s at each change, out in the silences and dimmed in the quiet
    beds = np.zeros((2, n)); XF = int(0.12 * SR)
    for b in plan["beds"]:
        a, z = int(b["from"] * SR), min(n, int(b["to"] * SR))
        a0, z0 = max(0, a - XF // 2), min(n, z + XF // 2)
        x = bed(b["kind"], z0 - a0)
        ramp = np.ones(z0 - a0); k = min(XF, (z0 - a0) // 2)
        ramp[:k] = np.sin(np.linspace(0, np.pi / 2, k)) ** 2; ramp[-k:] = np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        if a0 == 0: ramp[:k] = 1
        beds[:, a0:z0] += x * ramp
    sil = np.ones(n)
    for a, z in plan["silences"]:
        ia, iz = int(a * SR), int(z * SR); k = int(0.08 * SR)
        sil[ia:iz] = 0; sil[max(0, ia - k):ia] = np.minimum(sil[max(0, ia - k):ia], np.linspace(1, 0, ia - max(0, ia - k)))
        sil[iz:iz + k] = np.minimum(sil[iz:iz + k], np.linspace(0, 1, len(sil[iz:iz + k])))
    beds *= sil * (1 - 0.75 * duck)   # ~12 dB down under the voice
    # effects (none in the quiet moment)
    fx = np.zeros((2, n)); q0, q1 = plan["quiet"]; a_l0, a_l1 = plan["anchors"]["pushBack"], plan["anchors"]["matchCut"]
    for e in plan["sfx"]:
        if q0 <= e["t"] < q1: continue
        x = lapse(a_l1 - a_l0) if e["kind"] == "lapse" else ONE[e["kind"]](e)
        x = x * db(e["gain"])
        i = int(e["t"] * SR); m = min(x.shape[1], n - i)
        if m > 0: fx[:, i:i + m] += x[:, :m]
    fx *= (1 - 0.65 * duck)           # ~9 dB down under the voice (hits that land on a word never mask it)
    for a, z in plan["silences"]:      # anything still ringing into a silence fades out with it
        ia, iz = int(a * SR) + int(0.25 * SR), int(z * SR)
        if iz > ia: fx[:, ia:iz] *= np.linspace(1, 0, iz - ia) ** 3
    mixd = voice * db(0) + beds + fx
    # master: -14 LUFS integrated, true peak <= -1 dBTP (limit, re-measure, repeat)
    meter = pyln.Meter(SR)
    raw = mixd.copy()
    gain_db = -14.0 - meter.integrated_loudness(raw.T)
    # true-peak limiting: the limiter runs on a 4x upsampled copy (the peaks between samples become real samples), then
    # back down; the loop sets the gain for -14 LUFS. No scaling afterwards (that made the loop crush the voice).
    def master(g):
        up = resample_poly(raw * db(g), 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=0.0, release_ms=120), Gain(TP_WAV - 0.3)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    for _ in range(12):
        y = master(gain_db); L = meter.integrated_loudness(y.T)
        if abs(L + 14.0) < 0.04: break
        gain_db += (-14.0 - L)
    unlimited = meter.integrated_loudness((raw * db(gain_db + TP_WAV - 0.3)).T)
    print(f"master: gain {gain_db:+.1f} dB; loudness taken off by the limiter {unlimited - L:.1f} LU")
    # the quiet moment and the card: check the voice really is absent there
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, y.T, SR, subtype="PCM_24")
    qa, qz = int(q0 * SR), int(q1 * SR)
    print(f"{out}: {y.shape[1] / SR:.2f} s, {meter.integrated_loudness(y.T):.2f} LUFS, true peak {20 * np.log10(true_peak(y)):.2f} dBTP; "
          f"quiet moment {20 * np.log10(np.sqrt(np.mean(y[:, qa:qz] ** 2)) + 1e-9):.1f} dBFS RMS; voice in quiet: {np.max(np.abs(v[qa:qz])):.4f}")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
