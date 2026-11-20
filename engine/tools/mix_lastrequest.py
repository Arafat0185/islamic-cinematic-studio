"""Sound for video 002 "The Last Request". No music, no pops, no whooshes: only natural sounds.
  recitation  Sheikh Yasser Ad-Dussary, Al-Munafiqun 63:9-11 (public/audio/recitation/063009..011.mp3, everyayah.com),
              placed at timing.json verseStarts, normalised to -14 LUFS (integrated over the recitation)
  ambience    heavy rain the whole way (muffled behind glass indoors, open and close outside), wind, distant thunder
              (one close crack with the lightning), a slow clock tick (clear in his room, faint elsewhere), footsteps in
              the mud with the janazah, soil falling at the grave. It sinks under the voice and the recitation and
              rises in the pauses; about -24 LUFS on its own.
Writes public/audio/lastrequest_mix.wav (upload: recitation + ambience) and public/audio/lastrequest_preview_mix.wav
(+ the guide voice for 0 .. voiceEnd, public/audio/guide/alborz_guide.mp4: for checking only, never upload).
Run from engine/:  .venv-tts/Scripts/python tools/mix_lastrequest.py
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Pedalboard, Limiter
from scipy.signal import resample_poly

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mix_d3 import SR, db, lp, hp, bp, noise, stereo, verb, ROOM, HALL  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "002-the-last-request"
REC = HERE.parent / "public" / "audio" / "recitation"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "alborz_guide.mp4"
OUT = HERE.parent / "public" / "audio" / "lastrequest_mix.wav"
OUT_PREVIEW = HERE.parent / "public" / "audio" / "lastrequest_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(TOTAL * SR); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
r = np.random.default_rng(2)


def load(p: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-map", "0:a", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def envelope(x: np.ndarray, win=0.25) -> np.ndarray:
    """a smooth 0..1 loudness envelope (mono), for ducking"""
    m = np.abs(x).mean(axis=0) if x.ndim == 2 else np.abs(x)
    k = int(win * SR); c = np.cumsum(np.concatenate([[0.0], m])); i = np.arange(len(m)); lo = np.clip(i - k // 2, 0, len(m)); hi = np.clip(i + k // 2, 0, len(m))
    e = (c[hi] - c[lo]) / np.maximum(1, hi - lo)
    return np.clip(e / (np.percentile(e[e > 0], 95) + 1e-9), 0, 1)


def put(dst, x, at, g=0.0):
    i = int(at * SR)
    if i >= dst.shape[1]: return
    m = min(x.shape[1], dst.shape[1] - i); dst[:, i:i + m] += x[:, :m] * db(g)


def fade_mask(spans, n, xf=0.4):
    """1 inside the spans, 0 outside, with soft edges"""
    m = np.zeros(n)
    for a, b in spans: m[int(a * SR):int(b * SR)] = 1
    k = int(xf * SR); c = np.cumsum(np.concatenate([[0.0], m])); i = np.arange(n); lo = np.clip(i - k // 2, 0, n); hi = np.clip(i + k // 2, 0, n)
    return (c[hi] - c[lo]) / np.maximum(1, hi - lo)


# ---------------- sounds (all filtered noise: no tones) ----------------
def rain(n):
    hiss = hp(noise(n), 1500) * 0.35 + bp(noise(n), 400, 1500) * 0.25
    drops = np.zeros(n); idx = r.integers(0, n, int(n / SR * 900)); drops[idx] = r.uniform(0.3, 1.0, idx.size)
    drops = bp(drops, 1500, 7000) * 1.6
    return np.stack([hiss + drops, hp(noise(n), 1500) * 0.35 + bp(noise(n), 400, 1500) * 0.25 + np.roll(drops, 1777)])

def glass(n):
    """rain hitting a window: sparse taps, close"""
    d = np.zeros(n); idx = r.integers(0, n, int(n / SR * 60)); d[idx] = r.uniform(0.3, 1.0, idx.size)
    return stereo(bp(d, 1200, 5000) * 1.2)

def wind(n):
    t = np.arange(n) / SR
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 9.0) * np.sin(2 * np.pi * t / 23.0 + 1)
    return np.stack([lp(noise(n), 350) * swell * 0.9, lp(noise(n), 350) * np.roll(swell, int(1.3 * SR)) * 0.9])

def thunder(close=False):
    d = 4.5 if not close else 5.5; n = int(d * SR); t = np.arange(n) / SR
    roll = lp(noise(n), 110 if not close else 180) * (np.minimum(1, t / (0.6 if not close else 0.05)) * np.exp(-t / (1.6 if not close else 1.3))) * (1.0 + 0.5 * lp(noise(n), 3))
    x = roll * (0.8 if not close else 1.4)
    if close: x = x + bp(noise(n), 300, 3000) * np.exp(-t / 0.08) * 0.9
    return verb(stereo(x), HALL)

def tick():
    m = int(0.04 * SR)
    return stereo(bp(noise(m), 2000, 6000) * np.exp(-np.arange(m) / (0.004 * SR)) * 0.5)

def mud_step(k=1.0):
    m = int(0.18 * SR); t = np.arange(m) / SR
    return stereo(lp(noise(m), 700) * np.exp(-t / 0.05) * 0.6 * k + bp(noise(m), 800, 3000) * np.exp(-t / 0.03) * 0.25 * k, r.uniform(-0.3, 0.3))

def soil():
    m = int(0.9 * SR); t = np.arange(m) / SR
    thud = lp(noise(m), 300) * np.exp(-t / 0.06) * 0.8
    scatter = bp(noise(m), 600, 4000) * np.exp(-np.maximum(0, t - 0.03) / 0.25) * (t > 0.03) * 0.35
    return verb(stereo(thud + scatter), ROOM)


def main():
    t = np.arange(N) / SR
    # ---------------- the recitation at -14 LUFS ----------------
    rec = np.zeros((2, N))
    for key, start in timing["verseStarts"].items():
        v = int(key.split(":")[1]); put(rec, load(REC / f"063{v:03d}.mp3"), start)
    meter = pyln.Meter(SR)
    a, b = int(timing["recStart"] * SR), int(timing["recEnd"] * SR)
    rec *= db(-14.0 - meter.integrated_loudness(rec[:, a:b].T))
    # ---------------- ambience ----------------
    indoor = fade_mask([(s["at"], s["to"]) for s in SHOTS if s["set"] in ("bedroom", "hospital")], N)
    room = fade_mask([(s["at"], s["to"]) for s in SHOTS if s["set"] == "bedroom"], N)
    rn = rain(N)
    amb = rn * (1 - indoor) * 0.9 + lp(rn, 1100) * indoor * 0.55 + glass(N) * indoor * 0.35
    amb += wind(N) * (0.35 + 0.65 * (1 - indoor))
    for at in [2.4, 16.5, 31.0, 45.0, 64.0, 73.5]: put(amb, thunder(), at, -6)        # distant
    put(amb, thunder(close=True), E["lightning"][0] + 0.05, 0)                             # the close one, with the flash
    for k in range(int(TOTAL)): put(amb, tick() * (0.25 + 0.75 * room[min(N - 1, int(k * SR))]), k + 0.3, -6)   # slow, one a second
    # footsteps in the mud with the janazah (slow), soil at the grave
    jz = [s for s in SHOTS if s["kind"] in ("janazah", "janazahLow")]
    tt = jz[0]["at"]
    while tt < jz[-1]["to"]: put(amb, mud_step(0.8 + 0.4 * r.random()), tt, -4); tt += 0.36 + 0.08 * r.random()
    s0, s1 = E["soil"]; tt = s0
    while tt < s1: put(amb, soil(), tt, -2); tt += 0.75 + 0.2 * r.random()
    # the voice (guide, for the ducking only) and the recitation: the ambience sinks under them, rises in the pauses
    gd = load(GUIDE); g2 = np.zeros((2, N)); m = min(gd.shape[1], N); g2[:, :m] = gd[:, :m]
    g2[:, int(timing["voiceEnd"] * SR):] = 0
    # level the ambience shot by shot (his room and the hospital a little quieter than outside), smoothly
    lev = np.zeros(N)
    for sh in SHOTS:
        i0, i1 = int(sh["at"] * SR), min(N, int(sh["to"] * SR))
        L = meter.integrated_loudness(amb[:, i0:i1].T) if i1 - i0 > SR // 2 else -24
        lev[i0:i1] = (-25.0 if sh["set"] in ("bedroom", "hospital") else -22.5) - (L if np.isfinite(L) else -24)
    k = int(0.6 * SR); c = np.cumsum(np.concatenate([[0.0], lev])); ii = np.arange(N); lo = np.clip(ii - k // 2, 0, N); hi = np.clip(ii + k // 2, 0, N)
    amb *= 10 ** (((c[hi] - c[lo]) / np.maximum(1, hi - lo)) / 20)
    duck = 1 - 0.45 * np.clip(envelope(g2) + envelope(rec), 0, 1)
    amb *= duck
    amb *= np.clip((TOTAL - 0.05 - t) / 2.0, 0, 1)                                         # the rain fades to nothing under the end card
    amb *= db(-24.0 - meter.integrated_loudness(amb.T))
    # ---------------- master ----------------
    mix = rec + amb
    def limit(x, ceil):
        up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=120)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    # the limiter adds make-up gain: measure after it and correct until the recitation sits at -14 LUFS
    g = 0.0
    for _ in range(8):
        y = limit(mix * db(g), -1.0); L = meter.integrated_loudness(y[:, a:b].T)
        if abs(L + 14.0) < 0.05: break
        g += -14.0 - L
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    amb_only = limit(amb * db(g), -1.0)
    print(f"{OUT.name}: {y.shape[1] / SR:.2f} s; with the recitation {meter.integrated_loudness(y[:, a:b].T):.1f} LUFS; ambience alone {meter.integrated_loudness(amb_only.T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    pv = y + g2 * db(-14.0 - meter.integrated_loudness(g2[:, :m].T)); pv = pv * min(1.0, db(-1.0) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the guide voice (NOT for upload)")


if __name__ == "__main__":
    main()
