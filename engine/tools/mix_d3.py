"""Sound for video 001 draft 3. Every sound is synthesized here (nothing sampled, nothing downloaded, nothing to license).
No music, no instruments, no adhan or Quran audio: the prayer cue is a single soft, distant, wordless tone.

Draft 3 adds: an ambience bed for every place (courtyard: night wind and crickets; city hum; office murmur), risers
before reveals, sub-bass drops and layered impacts on the key words, the lamp being snuffed out, glitch stutters, soft
whooshes on every camera cut in the courtyard, smooth crossfades between beds (no chops), a fade into the silence, and
the 5 s recitation slot at the start with soft ambience only.

Reads videos/<id>/draft3/plan.json (the same plan the picture uses), so every hit lands on its frame:
  beds    per-scene room tones: dawn hush, a ticking clock, city hum and traffic, office murmur and keyboard, gym
          treadmill thump, night room; loud and busy in the day, then a hard silence, then the still courtyard
  events  tone (prayer cue), crack (a dot cracks: glass + dull thud), buzz (phone), alarm, tick_whirr (time jumps),
          whoosh, impact, car / horn / bus, swish, ping, tap, click, hit, cut, shimmer, chime_soft, drop
  voice   voice/voice2.wav (re-timed narration), gentle high-pass and compression
The beds and events dip about 10 dB under the voice; the whole mix goes to -14 LUFS with peaks under -1 dBFS.

Run from engine/:
  .venv-tts/Scripts/python tools/mix_d3.py ../videos/001-the-first-question public/audio/video001_d3_mix.wav
"""
import json
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Pedalboard, Compressor, HighpassFilter, Limiter, Reverb
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
rng = np.random.default_rng(7)
def db(x): return 10 ** (x / 20)
def lp(x, hz, o=2): return sosfilt(butter(o, hz, "low", fs=SR, output="sos"), x)
def hp(x, hz, o=2): return sosfilt(butter(o, hz, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(n): return rng.standard_normal(n)
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.003, d=0.1):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / d)
def stereo(x, pan=0.0):  # pan -1 .. 1
    return np.stack([x * np.sqrt((1 - pan) / 2) * 1.414, x * np.sqrt((1 + pan) / 2) * 1.414])
ROOM = Pedalboard([Reverb(room_size=0.35, damping=0.55, wet_level=0.22, dry_level=0.9, width=0.9)])
HALL = Pedalboard([Reverb(room_size=0.85, damping=0.4, wet_level=0.45, dry_level=0.7, width=1.0)])
def verb(x, board=ROOM): return board(x.astype(np.float32), SR)

# ---------------- one-shot sounds ----------------
def tone(dur=2.2):
    """the prayer cue: one soft, distant, wordless tone (a warm sine pair with a slow swell), far away in a big space"""
    t = tt(dur)
    x = (np.sin(2 * np.pi * 294 * t) + 0.45 * np.sin(2 * np.pi * 441 * t) + 0.2 * np.sin(2 * np.pi * 588 * t))
    e = np.minimum(1, t / 0.5) * np.exp(-np.maximum(0, t - 0.6) / 0.7)
    return verb(stereo(lp(x * e, 1400) * 0.5), HALL) * db(-8)

def crack():
    """a dot cracks: a sharp glass crack (bright noise burst + a few high pings) over a dull, low thud"""
    n = int(0.9 * SR); t = np.arange(n) / SR
    glass = hp(noise(n), 2500, 4) * env(n, 0.0005, 0.035)
    for f in (3200, 4700, 6100):
        glass += 0.25 * np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.06) * (rng.random() + 0.5)
    tick = hp(noise(n), 4000) * 0.0
    for k in range(5):  # little crackles after the break
        i = int((0.03 + 0.05 * k + rng.random() * 0.03) * SR); m = int(0.01 * SR)
        tick[i:i + m] += hp(noise(m), 3000) * np.exp(-np.arange(m) / (0.002 * SR)) * 0.5
    thud = np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.03)) * t) * env(n, 0.002, 0.16) * 1.4
    return verb(stereo(glass * 0.8 + tick + thud)) * db(-2)

def buzz(dur=0.8):
    """a phone vibrating on a hard surface: a rough 170 Hz buzz in short pulses"""
    t = tt(dur)
    x = np.sign(np.sin(2 * np.pi * 172 * t)) * 0.5 + np.sin(2 * np.pi * 344 * t) * 0.3
    gate = (np.sin(2 * np.pi * 2.6 * t) > -0.2).astype(float)
    return stereo(lp(x * gate, 2500) * np.minimum(1, t / 0.01), -0.3) * db(-6)

def alarm(dur=0.75):
    """a loud digital alarm: fast square beeps"""
    t = tt(dur)
    x = np.sign(np.sin(2 * np.pi * 2900 * t)) * (np.sin(2 * np.pi * 8 * t) > 0)
    return verb(stereo(lp(x, 6000) * 0.5)) * db(-4)

def tick_whirr(dur=0.5):
    """time racing: clock ticks speeding up into a whirr"""
    n = int(dur * SR); x = np.zeros(n)
    tp = 0.0; gap = 0.09
    while tp < dur:
        i = int(tp * SR); m = min(int(0.006 * SR), n - i)
        x[i:i + m] += hp(noise(m), 2000) * np.exp(-np.arange(m) / (0.0015 * SR))
        tp += gap; gap = max(0.012, gap * 0.8)
    return stereo(x * 0.9) * db(-6)

def whoosh(dur=0.4, soft=False):
    """air rushing past: band-passed noise sweeping up and back down"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = noise(n); out = np.zeros(n)
    for k in range(8):  # a sweeping band, piecewise
        a, b = int(k * n / 8), int((k + 1) * n / 8)
        c = 300 + 2200 * np.sin(np.pi * (k + 0.5) / 8)
        out[a:b] = bp(x, c * 0.6, c * 1.4)[a:b]
    e = np.sin(np.pi * t / dur) ** 2
    return stereo(out * e * (0.5 if soft else 1.0), np.sin(np.pi * 0.3)) * db(-6)

def impact():
    """landing on the floor: a low thump and a little body"""
    n = int(0.5 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (55 + 60 * np.exp(-t / 0.02)) * t) * env(n, 0.001, 0.12) * 1.5 + lp(noise(n), 900) * env(n, 0.001, 0.04)
    return verb(stereo(x)) * db(-3)

def car(big=False):
    """a vehicle passing close: rising then falling engine rumble and tyre hiss, panning across"""
    dur = 1.8 if big else 1.3; n = int(dur * SR); t = np.arange(n) / SR
    doppler = 1 + 0.12 * np.tanh((dur / 2 - t) * 5)
    f0 = (48 if big else 72) * doppler
    eng = np.sin(2 * np.pi * np.cumsum(f0) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f0 * 2) / SR)
    hiss = bp(noise(n), 900, 4000)
    e = np.exp(-((t - dur / 2) / (dur / 4.5)) ** 2)
    pan = np.tanh((t - dur / 2) * 4)
    x = (lp(eng, 600) * (1.3 if big else 0.9) + hiss * 0.35) * e
    return np.stack([x * np.sqrt((1 - pan) / 2) * 1.414, x * np.sqrt((1 + pan) / 2) * 1.414]) * db(-4 if big else -7)

def horn():
    """a short car horn: two detuned square tones"""
    t = tt(0.38)
    x = np.sign(np.sin(2 * np.pi * 420 * t)) + np.sign(np.sin(2 * np.pi * 530 * t))
    return verb(stereo(lp(x, 3000) * np.minimum(1, t / 0.01) * np.minimum(1, (0.38 - t) / 0.03) * 0.35, 0.4)) * db(-6)

def swish(soft=False):
    """a hand waved through the air"""
    n = int(0.22 * SR); t = np.arange(n) / SR
    return stereo(bp(noise(n), 700, 3500) * np.sin(np.pi * t / 0.22) ** 3 * (0.5 if soft else 1.0), 0.2) * db(-10)

def ping(soft=False):
    """a notification: a short bright two-note chime (synthetic, not a melody)"""
    t = tt(0.35)
    x = np.sin(2 * np.pi * 1320 * t) * env(len(t), 0.002, 0.06) + 0.7 * np.sin(2 * np.pi * 1760 * np.maximum(0, t - 0.07)) * env(len(t), 0.002, 0.08) * (t > 0.07)
    return verb(stereo(x * 0.5, rng.uniform(-0.6, 0.6))) * db(-11 if soft else -8)

def tap():
    """a thumb tapping glass"""
    n = int(0.05 * SR)
    return stereo(hp(noise(n), 1500) * np.exp(-np.arange(n) / (0.004 * SR)) * 0.6, -0.2) * db(-10)

def click():
    """the phone's side button: the screen goes dark"""
    n = int(0.04 * SR)
    return stereo(bp(noise(n), 1500, 6000) * np.exp(-np.arange(n) / (0.003 * SR))) * db(-6)

def hit(soft=False):
    """a single deep hit for the strongest moments: a low boom with a long tail"""
    n = int(2.5 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (42 + 30 * np.exp(-t / 0.05)) * t) * env(n, 0.003, 0.6) + lp(noise(n), 200) * env(n, 0.002, 0.08) * 0.5
    return verb(stereo(x * (0.55 if soft else 1.0)), HALL) * db(-3)

def cut():
    """a flashback cut: a short reversed swell into a soft knock"""
    n = int(0.25 * SR); t = np.arange(n) / SR
    sw = bp(noise(n), 400, 3000) * (t / 0.25) ** 3
    knock = np.zeros(n); m = int(0.04 * SR); knock[-m:] = np.sin(2 * np.pi * 90 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.01 * SR))
    return stereo(sw * 0.4 + knock) * db(-9)

def shimmer(dur=1.0, soft=False):
    """soft gold light: a cloud of tiny high sine grains, rising, with a slow swell"""
    n = int(dur * SR); x = np.zeros(n); t = np.arange(n) / SR
    for _ in range(int(60 * dur)):
        i = rng.integers(0, max(1, n - int(0.15 * SR))); m = int(0.15 * SR)
        f = rng.uniform(2200, 5200) * (1 + 0.2 * i / n)
        x[i:i + m] += np.sin(2 * np.pi * f * np.arange(m) / SR) * np.hanning(m) * rng.uniform(0.3, 1.0)
    x *= np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    return verb(stereo(x * 0.18 * (0.6 if soft else 1.0)), HALL) * db(-6)

def chime_soft():
    """a dot mended: one soft, pure, bell-like sine (no melody), long and gentle"""
    t = tt(1.6)
    x = np.sin(2 * np.pi * 880 * t) + 0.3 * np.sin(2 * np.pi * 1760 * t) * np.exp(-t / 0.3)
    return verb(stereo(x * env(len(t), 0.01, 0.5) * 0.35), HALL) * db(-8)

def drop():
    """one water drop: a short sine rising in pitch, a softer second plip, in a small room"""
    d = int(0.5 * SR); t = np.arange(d) / SR
    def plip(f0, rise, decay, amp, delay):
        tq = np.clip(t - delay, 0, None)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + rise * (1 - np.exp(-tq / 0.01)))) / SR
        return amp * np.sin(ph) * (t >= delay) * (1 - np.exp(-tq / 0.0008)) * np.exp(-tq / decay)
    x = plip(620, 1.3, 0.055, 1.0, 0.0) + plip(1100, 0.6, 0.03, 0.25, 0.085)
    return verb(stereo(x), Pedalboard([Reverb(room_size=0.55, damping=0.5, wet_level=0.3, dry_level=0.85)])) * db(-6)

def sub_drop():
    """a sub-bass drop: a deep sine sliding down, felt more than heard"""
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 30 + 55 * np.exp(-t / 0.18)
    return stereo(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.55) * 1.2) * db(-2)

def riser(dur=1.0, soft=False):
    """a riser before a reveal: filtered noise and a sine glide swelling up, cut off at the reveal"""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = np.zeros(n); x = noise(n)
    for k in range(10):
        a, b = int(k * n / 10), int((k + 1) * n / 10); c = 400 + 3500 * ((k + 0.5) / 10) ** 2
        nz[a:b] = bp(x, c * 0.7, c * 1.3)[a:b]
    glide = np.sin(2 * np.pi * np.cumsum(180 + 520 * u ** 2) / SR) * 0.25
    e = u ** 2.2 * (1 - np.clip((u - 0.97) / 0.03, 0, 1))
    return verb(stereo((nz * 0.6 + glide) * e * (0.55 if soft else 1.0))) * db(-8)

def thud():
    """the lamp snuffed out: a soft low thump and a short breath of air"""
    n = int(0.9 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (48 + 40 * np.exp(-t / 0.03)) * t) * env(n, 0.002, 0.2) * 1.4 + bp(noise(n), 300, 1500) * env(n, 0.003, 0.09) * 0.35
    return verb(stereo(x), HALL) * db(-3)

def glitch():
    """a short digital stutter: a few gated bursts of bright noise and a buzz"""
    n = int(0.22 * SR); x = np.zeros(n)
    for k in range(5):
        a = int(k * 0.044 * SR); m = int(0.022 * SR)
        x[a:a + m] = (bp(noise(m), 1500, 7000) * 0.6 + np.sign(np.sin(2 * np.pi * (180 + 90 * k) * np.arange(m) / SR)) * 0.25) * (rng.random() > 0.25)
    return stereo(x, rng.uniform(-0.4, 0.4)) * db(-12)

def hit_layered(soft=False, sub=False):
    """a key-word hit: the deep hit, plus a sub-bass drop under it"""
    h = hit(soft)
    if sub:
        d = sub_drop(); m = min(h.shape[1], d.shape[1]); h[:, :m] += d[:, :m] * (0.6 if soft else 1.0)
    return h

def crack_layered():
    """a dot cracks: glass, a dull thud and a little sub"""
    c = crack(); d = sub_drop(); m = min(c.shape[1], d.shape[1]); c[:, :m] += d[:, :m] * 0.35
    return c

EVENTS = {
    "tone": lambda e: tone(), "crack": lambda e: crack_layered(), "riser": lambda e: riser(e.get("dur", 1.0), e.get("soft", False)),
    "thud": lambda e: thud(), "glitch": lambda e: glitch(), "buzz": lambda e: buzz(e.get("dur", 0.8)), "alarm": lambda e: alarm(e.get("dur", 0.75)),
    "tick_whirr": lambda e: tick_whirr(e.get("dur", 0.5)), "whoosh": lambda e: whoosh(e.get("dur", 0.4), e.get("soft", False)),
    "impact": lambda e: impact(), "car": lambda e: car(e.get("big", False)), "horn": lambda e: horn(), "swish": lambda e: swish(e.get("soft", False)),
    "ping": lambda e: ping(e.get("soft", False)), "tap": lambda e: tap(), "click": lambda e: click(), "hit": lambda e: hit_layered(e.get("soft", False), e.get("sub", False)),
    "cut": lambda e: cut(), "shimmer": lambda e: shimmer(e.get("dur", 1.0), e.get("soft", False)), "chime_soft": lambda e: chime_soft(), "drop": lambda e: drop(),
}

# ---------------- beds (continuous room tones) ----------------
def bed(kind, n):
    t = np.arange(n) / SR
    if kind == "silence": return np.zeros((2, n))
    if kind in ("room_dawn", "room_night", "room_still", "room_morning"):
        hush = lp(noise(n), 300) * (0.25 if kind != "room_still" else 0.12)
        x = stereo(hush)
        if kind in ("room_dawn", "room_night", "room_morning"):  # a wall clock ticking
            for k in range(int(n / SR) + 1):
                i = int(k * SR) + int(0.2 * SR); m = int(0.008 * SR)
                if i + m < n: x[:, i:i + m] += hp(noise(m), 2500) * np.exp(-np.arange(m) / (0.002 * SR)) * 0.35
        if kind == "room_morning":
            x += stereo(bp(noise(n), 200, 900) * 0.25)  # morning: distant traffic through the window
        return x * db(-24 if kind != "room_still" else -30)
    if kind in ("city", "city_afternoon", "fb_city"):
        # city hum: low traffic rumble, crowd, footsteps on the pavement
        hum = lp(noise(n), 250) * 0.9 + bp(noise(n), 300, 1200) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t))
        steps = np.zeros(n)
        for k in range(int(n / SR * 4)):
            i = int(k * SR / 4 + rng.integers(0, 2000)); m = int(0.03 * SR)
            if i + m < n: steps[i:i + m] += bp(noise(m), 300, 2500) * np.exp(-np.arange(m) / (0.006 * SR)) * 0.5
        hum = hum + steps
        crowd = bp(noise(n), 350, 2400) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t + 1))
        return np.stack([hum + crowd, lp(noise(n), 250) * 0.9 + crowd * 0.8]) * db(-14 if kind != "city_afternoon" else -16)
    if kind in ("office", "fb_office"):
        # people talking in the distance (formant-shaped noise, no words), the air conditioning, the keyboard
        talk = sum(bp(noise(n), lo, hi) * (0.4 + 0.6 * (np.sin(2 * np.pi * r0 * t + r0) > 0)) for lo, hi, r0 in ((300, 800, 3.1), (900, 2200, 4.3), (500, 1300, 2.2)))
        murmur = lp(talk, 2500) * 0.16 + lp(noise(n), 120) * 0.4
        x = stereo(murmur)
        for _ in range(int(n / SR * 6)):  # keyboard
            i = rng.integers(0, n - 2000); m = int(0.012 * SR)
            x[:, i:i + m] += bp(noise(m), 1500, 5000) * np.exp(-np.arange(m) / (0.003 * SR)) * 0.6
        return x * db(-19)
    if kind in ("gym", "fb_gym"):
        x = stereo(lp(noise(n), 180) * 0.6)
        for k in range(int(n / SR * 5.5)):  # footfalls on the treadmill belt
            i = int(k * SR / 5.5); m = int(0.07 * SR)
            if i + m < n: x[:, i:i + m] += np.sin(2 * np.pi * 70 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.02 * SR)) * 0.9
        x += stereo(bp(noise(n), 600, 3000) * 0.08)  # the motor
        return x * db(-15)
    if kind in ("courtyard", "courtyard_intro"):
        wind = np.stack([lp(noise(n), 420) * (0.55 + 0.25 * np.sin(2 * np.pi * 0.07 * t + ch)) for ch in (0, 1)])
        # crickets: short chirp trains (4.4 kHz carrier, 30 Hz pulses), a few insects at different places and rates
        cr = np.zeros((2, n))
        for k in range(4):
            f0, rate, pan, ph = 4200 + 300 * k, 0.55 + 0.2 * k, (-0.7, 0.6, -0.2, 0.85)[k], k * 1.3
            gate = (np.sin(2 * np.pi * rate * t + ph) > 0.55).astype(float) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t))
            chirp = np.sin(2 * np.pi * f0 * t) * lp(gate, 200) * 0.05
            cr += stereo(chirp, pan)
        return (wind * db(-26) + cr * db(-14)) * (db(5) if kind == "courtyard_intro" else 1.0)
    raise ValueError(kind)

def envelope(x, attack=0.04, release=0.4, hop=0.01):
    h = int(hop * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(h) / h, "same")[::h] + 1e-12)
    lvl = np.clip((20 * np.log10(rms) + 50) / 30, 0, 1)
    a, r = np.exp(-hop / attack), np.exp(-hop / release)
    e = np.zeros_like(lvl)
    for i in range(1, len(lvl)):
        k = a if lvl[i] > e[i - 1] else r
        e[i] = k * e[i - 1] + (1 - k) * lvl[i]
    return np.interp(np.arange(len(x)), np.arange(len(e)) * h, e)

def main(video_dir: Path, out: Path) -> None:
    plan = json.loads((video_dir / "draft3" / "plan.json").read_text(encoding="utf-8"))
    n = int(round(plan["frames"] / plan["fps"] * SR))
    # voice
    v, vsr = sf.read(video_dir / plan["sound"]["voice"], dtype="float32")
    if vsr != SR: v = resample_poly(v, SR // np.gcd(SR, vsr), vsr // np.gcd(SR, vsr)).astype(np.float32)
    v = Pedalboard([HighpassFilter(80), Compressor(threshold_db=-22, ratio=2.5, attack_ms=5, release_ms=120)])(v[np.newaxis, :], SR)[0]
    voice = np.zeros(n, np.float32); voice[: min(n, len(v))] = v[:n]
    meter = pyln.Meter(SR)
    voice *= db(-16 - meter.integrated_loudness(voice))
    # beds, overlapping by 100 ms with equal-power crossfades at every boundary (no chops); the bed before the
    # silence fades out over 150 ms, the silence itself is truly silent
    beds = np.zeros((2, n)); X = int(0.1 * SR)
    for b in plan["sound"]["beds"]:
        if b["kind"] == "silence": continue
        i0, i1 = max(0, int(b["from"] * SR) - X // 2), min(n, int(b["to"] * SR) + X // 2)
        if i1 <= i0: continue
        x = bed(b["kind"], i1 - i0)
        ramp = np.ones(i1 - i0)
        fi = X if i0 > 0 else min(int(1.5 * SR), (i1 - i0) // 2)          # the very start fades in over 1.5 s
        fo = int(0.15 * SR) if b["kind"] == "room_night" else X
        ramp[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)); ramp[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo))
        if b["kind"] == "room_night": i1 = min(i1, int(b["to"] * SR) + int(0.18 * SR)); ramp = ramp[: i1 - i0]; x = x[:, : i1 - i0]
        beds[:, i0:i1] += x * ramp
    # events (+ a soft whoosh on every camera cut in the courtyard)
    fx = np.zeros((2, n))
    events = list(plan["sound"]["events"])
    for g in plan["shots"]:
        for c in g["cuts"]: events.append({"kind": "whoosh", "t": c - 0.15, "dur": 0.3, "soft": True})
    for e in events:
        x = EVENTS[e["kind"]](e)
        fl = min(int(0.004 * SR), x.shape[1] // 2); x[:, :fl] *= np.linspace(0, 1, fl); x[:, -fl:] *= np.linspace(1, 0, fl)
        i = int(e["t"] * SR); m = min(x.shape[1], n - i)
        if m > 0: fx[:, i:i + m] += x[:, :m]
    # ducking: beds and (a little less) effects dip under the voice
    d = envelope(voice)
    beds *= 1 - 0.68 * d
    fx *= 1 - 0.45 * d
    mix = np.stack([voice, voice]) + beds + fx
    # -14 LUFS, peaks under -1 dBFS (the limiter adds no gain; the output is lowered by CEIL)
    CEIL, raw, target = 1.5, mix.copy(), -14.0
    lim = Pedalboard([Limiter(threshold_db=0.0, release_ms=60)])
    for _ in range(6):
        g = raw * db(target + CEIL - meter.integrated_loudness(raw.T))
        mix = lim(g.astype(np.float32), SR) * db(-CEIL)
        err = -14.0 - meter.integrated_loudness(mix.T)
        if abs(err) < 0.05: break
        target += err
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.T, SR, subtype="PCM_24")
    # the loudness of each part of the story, to check the contrast
    def lufs(a, b):
        s = mix[:, int(a * SR): int(b * SR)]
        return meter.integrated_loudness(s.T) if s.shape[1] > SR * 0.5 else float("nan")
    A = plan["anchors"]
    print(f"{out.name}: {n / SR:.2f} s, {meter.integrated_loudness(mix.T):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS; {len(events)} events")
    sil = mix[:, int((A['phoneOff'] + 0.2) * SR): int(A['dotsCentre'] * SR)]
    print(f"  intro {lufs(0, plan['intro']):.1f} LUFS | day {lufs(plan['intro'], A['phoneOff']):.1f} | silence {20 * np.log10(np.sqrt(np.mean(sil ** 2)) + 1e-12):.1f} dBFS rms | "
          f"flashbacks {lufs(A['fb'][0], A['zoomDot']):.1f} | courtyard {lufs(A['zoomDot'], A['ending']):.1f}")

if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
