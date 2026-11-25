"""Sound for video 005 "The Dunya" (sad, rainy, calm). No music, nothing tonal.
  recitation  Sheikh Yasser Al-Dossari, Al-Hadid 57:22 + 57:23 (everyayah.com, public/audio/recitation/dossari_0570xx.mp3),
              at timing.json verseStarts, -14 LUFS; its last reverb tail fades out gently under the end card
  under it    the whole way at about -26 LUFS: soft steady rain (muffled behind glass in the room, open outside), rain on
              the glass, distant thunder now and then (just after the lightning in the room), a slow clock tick (louder
              in the room)
The voice clip (0 .. clipEnd) is a TikTok sound added in TikTok: NOT in our file.
Writes public/audio/dunya_mix.wav (upload) and public/audio/dunya_preview_mix.wav (+ the guide's voice, from
public/audio/guide/dunya_guide.mp4, cut at clipEnd: checking only, never upload).
Run from engine/:  .venv-tts/Scripts/python tools/mix_dunya.py
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
from mix_d3 import SR, db, lp  # noqa: E402
from mix_lastrequest import load, smooth_avg, rain, glass, thunder, tick  # noqa: E402  (002's sounds, reused)

VDIR = HERE.parent.parent / "videos" / "005-the-dunya"
AUD = HERE.parent / "public" / "audio"
REC = AUD / "recitation"; GUIDE = AUD / "guide" / "dunya_guide.mp4"
OUT, OUT_PREVIEW = AUD / "dunya_mix.wav", AUD / "dunya_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(round(TOTAL * SR)); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
ROOM = {"windowRain", "grabPhone", "drainClose", "drainWave", "beadsFall", "toss3am", "wakePause", "fatherBed", "lightning2"}


def put(dst, x, at, g=0.0):
    i = int(at * SR)
    if i >= dst.shape[1]: return
    m = min(x.shape[1], dst.shape[1] - i); dst[:, i:i + m] += x[:, :m] * db(g)

def mask(spans, xf=0.6):
    m = np.zeros(N)
    for a, b in spans: m[int(a * SR):int(b * SR)] = 1
    return smooth_avg(m, int(xf * SR))

def limit(x, ceil):
    up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
    up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=150)])(up, SR * 4)
    return resample_poly(up, 1, 4, axis=1).astype(np.float64)


def main():
    t = np.arange(N) / SR; meter = pyln.Meter(SR)
    a, card = int(timing["recStart"] * SR), int(timing["cardFrom"] * SR)
    # ---------------- the recitation at -14 LUFS, its tail fading under the end card ----------------
    rec = np.zeros((2, N))
    for v, at in timing["verseStarts"].items(): put(rec, load(REC / f"dossari_0570{v.split(':')[1]}.mp3"), at)
    rec *= db(-14.0 - meter.integrated_loudness(rec[:, a:card].T))
    rec *= np.clip(1 - (t - timing["cardFrom"]) / (timing["recEnd"] - timing["cardFrom"] + 0.3), 0, 1) ** 1.5
    # ---------------- the rain, the glass, the thunder, the clock ----------------
    room = mask([(s["at"], s["to"]) for s in SHOTS if s["kind"] in ROOM])
    rn = rain(N)
    sfx = rn * (1 - room) * 0.8 + lp(rn, 1100) * room * 0.6 + glass(N, 70) * (0.25 + 0.5 * room)
    for i, at in enumerate(E["thunder"]): put(sfx, thunder(), at, -3 if i in (3, 4) else -7)
    k = 0.6
    while k < TOTAL - 1: put(sfx, tick(), k, -10 + 6 * room[int(k * SR)]); k += E["clockTick"]
    sfx *= 1 - 0.25 * np.clip(smooth_avg(np.abs(rec).mean(axis=0), int(0.25 * SR)) / (np.percentile(np.abs(rec[:, a:card]).mean(axis=0), 95) + 1e-9), 0, 1)   # dip under the recitation's peaks
    sfx *= db(-26.0 - meter.integrated_loudness(sfx.T))
    sfx *= np.clip((TOTAL - 0.05 - t) / 2.0, 0, 1)
    # ---------------- master: the recitation at -14 LUFS, peaks under -1 dBFS ----------------
    g = 0.0
    for _ in range(8):
        y = limit((rec + sfx) * db(g), -1.2); L = meter.integrated_loudness(y[:, a:card].T)
        if abs(L + 14.0) < 0.05: break
        g += -14.0 - L
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    print(f"{OUT.name}: {N / SR:.2f} s; the recitation part {meter.integrated_loudness(y[:, a:card].T):.1f} LUFS; effects {meter.integrated_loudness((sfx * db(g)).T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    gd = load(GUIDE); g2 = np.zeros((2, N)); m = min(gd.shape[1], int(timing["clipEnd"] * SR)); g2[:, :m] = gd[:, :m]
    pv = y + g2 * db(-14.0 - meter.integrated_loudness(g2[:, :m].T)); pv *= min(1.0, db(-1.0) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the guide voice to {timing['clipEnd']} s (NOT for upload)")


if __name__ == "__main__":
    main()
