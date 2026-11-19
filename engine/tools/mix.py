"""The sound track of a courtyard film: narration, quiet night ambience, a water drop under the opening and the ending.
No music, no instruments. Everything but the voice is synthesized here (no sample libraries, nothing to license).

  voice     voice/voice.wav (tools/narrate.py), placed after the opening; gentle high-pass and compression
  wind      soft filtered noise with slow gusts, stereo
  lamp      a faint flame: very quiet crackles and a soft low breath, a little to the lamp's side
  drops     one water drop under the opening (dropAtSec) and one as the ending begins
  ducking   the ambience dips about 9 dB under the voice (follows the voice's envelope)
  loudness  the whole mix to -14 LUFS integrated, true peaks kept under -1 dBFS

Timing comes from the same files as the video: words.json (last word) and the film's film.json, so the sound lines
up with the picture frame for frame.

Run from engine/:
  .venv-tts/Scripts/python tools/mix.py ../videos/001-the-first-question src/scenes/video001/film.json public/audio/video001_mix.wav
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
rng = np.random.default_rng(1)


def lowpass(x, hz, order=2): return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)
def highpass(x, hz, order=2): return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)
def bandpass(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def db(x): return 10 ** (x / 20)


def wind(n):
    """two decorrelated channels of soft low wind with slow gusts"""
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        w = lowpass(rng.standard_normal(n), 420, 2)
        gust = 0.55 + 0.25 * np.sin(2 * np.pi * 0.07 * t + ch) + 0.2 * np.sin(2 * np.pi * 0.19 * t + 2 * ch + 1)
        whoosh = bandpass(rng.standard_normal(n), 300, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t + 3 + ch)) ** 3 * 0.25
        out.append((w * gust + whoosh).astype(np.float32))
    return np.stack(out)


def lamp(n):
    """a faint flame: sparse soft crackles (high-passed) and a gentle low breath; panned a little right"""
    t = np.arange(n) / SR
    imp = np.zeros(n)
    k = rng.poisson(2.5 * n / SR)
    pos = rng.integers(0, n, k)
    imp[pos] = rng.uniform(0.2, 1.0, k) * rng.choice([-1, 1], k)
    env = np.exp(-np.arange(int(0.012 * SR)) / (0.003 * SR))
    crackle = highpass(np.convolve(imp, env)[:n], 1800, 2)
    breath = bandpass(rng.standard_normal(n), 120, 380) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.6 * t) * np.sin(2 * np.pi * 0.23 * t + 1))
    mono = crackle * 0.12 + breath * 0.05
    return np.stack([mono * 0.75, mono * 1.0]).astype(np.float32)


def drop():
    """one water drop: a short sine that rises in pitch, a quick decay, a softer second 'plip', in a small room"""
    d = int(0.5 * SR)
    t = np.arange(d) / SR
    def plip(f0, rise, decay, amp, delay):
        tt = np.clip(t - delay, 0, None)
        f = f0 * (1 + rise * (1 - np.exp(-tt / 0.01)))
        ph = 2 * np.pi * np.cumsum(f) / SR
        env = (t >= delay) * (1 - np.exp(-tt / 0.0008)) * np.exp(-tt / decay)
        return amp * np.sin(ph) * env
    x = plip(620, 1.3, 0.055, 1.0, 0.0) + plip(1100, 0.6, 0.03, 0.25, 0.085)
    room = Pedalboard([Reverb(room_size=0.55, damping=0.5, wet_level=0.3, dry_level=0.85, width=0.9)])
    out = room(np.stack([x, x]).astype(np.float32), SR)
    return out / np.max(np.abs(out))


def envelope(x, attack=0.05, release=0.45, hop=0.01):
    """the voice's level over time (0..1), with a fast attack and a slow release, at the sample rate"""
    h = int(hop * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(h) / h, "same")[::h] + 1e-12)
    lvl = np.clip((20 * np.log10(rms) + 50) / 30, 0, 1)  # -50 dBFS -> 0, -20 dBFS -> 1
    a, r = np.exp(-hop / attack), np.exp(-hop / release)
    e = np.zeros_like(lvl)
    for i in range(1, len(lvl)):
        k = a if lvl[i] > e[i - 1] else r
        e[i] = k * e[i - 1] + (1 - k) * lvl[i]
    return np.interp(np.arange(len(x)), np.arange(len(e)) * h, e)


def main(video_dir: Path, film_json: Path, out: Path) -> None:
    cfg = json.loads(film_json.read_text(encoding="utf-8"))
    words = json.loads((video_dir / "words.json").read_text(encoding="utf-8"))["words"]
    fps = cfg["fps"]
    F = lambda t: round((cfg["openSec"] + t) * fps)  # the same rounding as the video's timeline.ts
    last_end = max(w["end"] for w in words)
    ending_from = F(last_end) + round(cfg["tailSec"] * fps)
    frames = ending_from + round(cfg["endingSec"] * fps)
    n = int(round(frames / fps * SR))

    # voice: 24 kHz -> 48 kHz, high-pass, gentle compression, placed after the opening
    v, vsr = sf.read(video_dir / "voice" / "voice.wav", dtype="float32")
    if vsr != SR: v = resample_poly(v, SR // np.gcd(SR, vsr), vsr // np.gcd(SR, vsr)).astype(np.float32)
    v = Pedalboard([HighpassFilter(80), Compressor(threshold_db=-22, ratio=2.5, attack_ms=5, release_ms=120)])(v[np.newaxis, :], SR)[0]
    voice = np.zeros(n, np.float32)
    s0 = int(round(cfg["openSec"] * SR))
    voice[s0:s0 + len(v)] = v[: n - s0]
    meter = pyln.Meter(SR)
    voice *= db(-16 - meter.integrated_loudness(voice[s0:s0 + len(v)]))  # the voice alone at -16 LUFS

    # ambience: wind + lamp, about 20 dB under the voice, faded up out of the darkness and down at the very end
    amb = wind(n) + lamp(n)
    amb *= db(-36 - meter.integrated_loudness(amb.T))
    t = np.arange(n) / SR
    fade = np.clip((t - 0.25) / 1.9, 0, 1) * np.clip((t[-1] - t) / 2.0, 0, 1)
    duck = 1 - 0.65 * envelope(voice)  # about -9 dB under the voice
    amb *= fade * duck

    # water drops: under the opening (as the lamp ignites) and as the ending begins
    dr = drop()
    drops = np.zeros((2, n), np.float32)
    for at in (cfg["dropAtSec"], ending_from / fps):
        i = int(at * SR); m = min(dr.shape[1], n - i)
        drops[:, i:i + m] += dr[:, :m] * db(-20)

    mix = np.stack([voice, voice]) + amb + drops
    # loudness to -14 LUFS with peaks under -1 dBFS. (pedalboard's Limiter, from JUCE, does not cap at its threshold:
    # it adds threshold dB of gain and caps at 0 dBFS. So: no added gain, then the output lowered by CEIL dB.)
    CEIL = 1.5
    lim = Pedalboard([Limiter(threshold_db=0.0, release_ms=80)])
    raw, target = mix.copy(), -14.0
    for _ in range(6):  # each pass starts again from the unlimited mix, so the limiter is applied once
        g = raw * db(target + CEIL - meter.integrated_loudness(raw.T))
        mix = lim(g.astype(np.float32), SR) * db(-CEIL)
        err = -14.0 - meter.integrated_loudness(mix.T)
        if abs(err) < 0.05: break
        target += err
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.T, SR, subtype="PCM_24")
    print(f"{out.name}: {n / SR:.2f} s ({frames} frames at {fps} fps), {meter.integrated_loudness(mix.T):.1f} LUFS, "
          f"peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS; drops at {cfg['dropAtSec']:.2f} s and {ending_from / fps:.2f} s")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve())
