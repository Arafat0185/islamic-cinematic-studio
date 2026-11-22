"""Sound design for video 004 "The Man Who Never Rested" (the star of this video). Natural foley only, made from shaped
noise: no music, no instruments, no tonal chimes. Every action has a sound.
  library     deep room tone, the lamp flame flickering, footsteps echoing on stone, ladder creaks, a book sliding off the
              shelf, heavy book thuds, dust puffs, pages fluttering, the leather cover creaking open
  into a book a rising wind whoosh + a paper flutter swirl as the gold letters pour out, a deep "air pressure" boom as the
              camera dives into the page; out of the page: reversed paper whooshes
  the letters a soft quill scratch as each caption word forms
  the worlds  sand hissing and crumbling, desert wind, running steps on sand; storm waves, rain lashing, thunder, the boat
              creaking, oars splashing; rain on the hand; a night breeze; the rain stopping, dawn birds (short swept chirps,
              very soft); the forge (hammer clangs, sparks, the blade sizzling in water), bubbling water, a rock cracking, a
              seed splitting, stone grinding, crystal crackle; wind in leaves; hourglass sand pouring, stopping, reversing
  the ending  everything drops to near-silence: the book closing, the chair creaking, a long deep exhale, the lamp
  levels      about -20 LUFS integrated, ducking 5 dB under the narrator's words (the TikTok sound); peaks under -1 dBFS
Writes public/audio/rest_mix.wav (UPLOAD: sound design only) and public/audio/rest_preview_mix.wav (+ the narration from
public/audio/guide/rest_guide.mp4 up to the end of the narration, for checking only; never uploaded, never committed).
Run from engine/:  .venv-tts/Scripts/python tools/mix_rest.py
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
from mix_lastrequest import load, smooth_avg, put, tt, thunder, breath, creak, rumble, howl  # noqa: E402

VDIR = HERE.parent.parent / "videos" / "004-never-rested"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "rest_guide.mp4"
OUT = HERE.parent / "public" / "audio" / "rest_mix.wav"
OUT_PREVIEW = HERE.parent / "public" / "audio" / "rest_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(TOTAL * SR); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(4)
def span(*kinds): return [(S[k]["at"], S[k]["to"]) for k in kinds]
def mask(spans, xf=0.25):
    m = np.zeros(N)
    for a, b in spans: m[int(max(0, a) * SR):int(min(TOTAL, b) * SR)] = 1
    return smooth_avg(m, int(xf * SR))
def env_seg(d, a=0.01, rel=0.1):
    t = tt(d); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / rel)

# ---------------- the sounds (all filtered / shaped noise) ----------------
def room_tone(n):
    t = np.arange(n) / SR; return stereo(lp(noise(n), 120) * 1.4 + bp(noise(n), 150, 600) * 0.18 * (0.8 + 0.2 * np.sin(2 * np.pi * t / 7)))
def lamp_flicker(n):
    """an oil flame: a soft breathy flutter with tiny crackles"""
    t = np.arange(n) / SR; flut = bp(noise(n), 300, 1400) * (0.5 + 0.5 * np.abs(lp(noise(n), 6) * 20).clip(0, 1)) * 0.25
    d = np.zeros(n); idx = r.integers(0, n, int(n / SR * 3)); d[idx] = r.uniform(0.2, 1, idx.size)
    return stereo(flut + bp(d, 2500, 8000) * 0.8, 0.1)
def step_stone(k=1.0): t = tt(0.3); return verb(stereo((lp(noise(t.size), 400) * 1.2 + bp(noise(t.size), 1500, 5000) * 0.25) * env_seg(0.3, 0.002, 0.03) * k, r.uniform(-0.3, 0.3)), HALL)
def step_sand(k=1.0): t = tt(0.25); return stereo((bp(noise(t.size), 300, 3000) * 0.9) * env_seg(0.25, 0.01, 0.06) * k, r.uniform(-0.3, 0.3))
def book_slide(d=0.5): t = tt(d); return verb(stereo(bp(noise(t.size), 600, 3500) * np.sin(np.pi * t / d) ** 0.6 * 0.5), ROOM)
def book_thud(k=1.0): t = tt(1.0); return verb(stereo((lp(noise(t.size), 150) * 2.4 + bp(noise(t.size), 200, 900) * 0.6) * env_seg(1.0, 0.003, 0.08) * k), HALL)
def dust_puff(): t = tt(0.8); return stereo(bp(noise(t.size), 800, 6000) * env_seg(0.8, 0.02, 0.25) * 0.35)
def pages(d=0.7, k=1.0):
    """pages fluttering: a quick run of paper flicks"""
    out = np.zeros((2, int(d * SR) + 4000))
    for i in range(int(d * 22)):
        at = i / 22 + r.uniform(0, 0.02); m = int(0.04 * SR); j = int(at * SR)
        out[:, j:j + m] += stereo(bp(noise(m), 1500, 7000) * env_seg(0.04, 0.003, 0.012)[:m] * r.uniform(0.4, 1.0) * k, r.uniform(-0.5, 0.5))
    return out
def leather_creak(d=0.6): return creak(d) * 0.9
def whoosh(d=0.8, k=1.0, lo=150, hi=3000, rev=False):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n); seg = int(0.02 * SR)
    for i in range(0, n, seg):
        u = i / n; c = lo + (hi - lo) * (u if not rev else 1 - u); w = min(seg, n - i); x[i:i + w] = bp(noise(w + 2000), c * 0.6, c * 1.5)[1000:1000 + w]
    env = (t / d) ** 2 if not rev else (1 - t / d) ** 0.5 * np.minimum(1, t / 0.03)
    return stereo(x * env * k)
def pressure_boom(k=1.0):
    """a deep 'air pressure' boom: a sub thump with a soft pressure release"""
    t = tt(2.0); return verb(stereo((lp(noise(t.size), 55) * 4 + lp(noise(t.size), 200) * np.exp(-t / 0.05) * 1.2) * np.minimum(1, t / 0.01) * np.exp(-t / 0.5) * k), HALL)
def quill(k=1.0):
    """a quill scratching a word onto parchment"""
    d = 0.22; t = tt(d); g = np.abs(np.sin(2 * np.pi * 18 * t)) ** 3
    return stereo(bp(noise(t.size), 2500, 7000) * g * np.sin(np.pi * t / d) * 0.18 * k, r.uniform(-0.3, 0.3))
def sand_crumble(d=1.4):
    t = tt(d); hissy = bp(noise(t.size), 2000, 9000) * np.exp(-t / 0.6) * 0.5
    d0 = np.zeros(t.size); idx = r.integers(0, t.size, 90); d0[idx] = r.uniform(0.2, 1, 90)
    return stereo(hissy + bp(d0, 1000, 6000) * np.exp(-t / 0.7) * 1.2 + lp(noise(t.size), 300) * np.exp(-t / 0.15) * 0.6, r.uniform(-0.3, 0.3))
def desert_wind(n): t = np.arange(n) / SR; g = 0.55 + 0.45 * np.sin(2 * np.pi * t / 5.3) ** 2; return np.stack([bp(noise(n), 200, 1800) * g, bp(noise(n), 200, 1800) * np.roll(g, 9000)]) * 0.5
def rain(n, k=1.0):
    d0 = np.zeros(n); idx = r.integers(0, n, int(n / SR * 2500)); d0[idx] = r.uniform(0.2, 1, idx.size)
    return np.stack([hp(noise(n), 2500) * 0.35 + bp(d0, 1500, 8000) * 0.9, hp(noise(n), 2500) * 0.35 + bp(np.roll(d0, 777), 1500, 8000) * 0.9]) * k
def waves(n):
    t = np.arange(n) / SR; sw = 0.45 + 0.55 * np.clip(np.sin(2 * np.pi * t / 3.1) * np.sin(2 * np.pi * t / 7.7 + 1) + 0.4, 0, 1)
    return np.stack([lp(noise(n), 500) * sw * 1.6 + bp(noise(n), 800, 4000) * sw ** 3 * 0.5, lp(noise(n), 500) * np.roll(sw, 8000) * 1.6 + bp(noise(n), 800, 4000) * np.roll(sw, 8000) ** 3 * 0.5])
def splash(k=1.0): t = tt(0.6); return stereo((bp(noise(t.size), 400, 5000) * env_seg(0.6, 0.01, 0.12) + lp(noise(t.size), 300) * env_seg(0.6, 0.005, 0.05)) * k, r.uniform(-0.4, 0.4))
def clang(k=1.0):
    """a hammer on hot metal: an inharmonic clatter of narrow noise bands (no musical pitch), quick decay"""
    t = tt(0.9); x = np.zeros(t.size)
    for f0 in [1830, 2710, 3390, 4520, 6150]: x += bp(noise(t.size), f0 * 0.985, f0 * 1.015) * np.exp(-t / (0.08 + 0.1 * r.random()))
    x += lp(noise(t.size), 300) * env_seg(0.9, 0.001, 0.02) * 2
    return verb(stereo(x * 2.2 * k), ROOM)
def sizzle(d=2.0): t = tt(d); return stereo((hp(noise(t.size), 3000) * np.exp(-t / 0.7) * 1.2 + bp(noise(t.size), 400, 2000) * np.exp(-t / 0.4) * 0.5) * np.minimum(1, t / 0.01))
def bubbles(d, rate=8.0):
    n = int(d * SR); out = np.zeros(n)
    for _ in range(int(d * rate)):
        i = int(r.uniform(0, d - 0.1) * SR); m = int(0.06 * SR); u = np.arange(m) / SR; f0 = r.uniform(400, 1200)
        out[i:i + m] += bp(noise(m), f0, f0 * 1.4) * np.exp(-u / 0.02) * r.uniform(0.3, 1.0)
    return stereo(out * 1.4, r.uniform(-0.3, 0.3))
def rock_crack(k=1.0): t = tt(1.4); return verb(stereo((bp(noise(t.size), 400, 5000) * env_seg(1.4, 0.001, 0.03) * 2 + lp(noise(t.size), 250) * env_seg(1.4, 0.002, 0.18) * 1.2) * k), HALL)
def grind(d=1.2): t = tt(d); return stereo(lp(noise(t.size), 260) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.sin(np.pi * t / d) * 1.4)
def crystal(d=1.2):
    """crystal crackle: bright noise ticks, thinning (no tones)"""
    n = int(d * SR); x = np.zeros(n); idx = r.integers(0, n, int(d * 60)); x[idx] = r.uniform(0.2, 1, idx.size) * np.exp(-idx / SR / 0.6)
    return stereo(bp(x, 5000, 12000) * 2.0, 0.2)
def leaves(n): t = np.arange(n) / SR; return stereo(bp(noise(n), 1500, 7000) * (0.4 + 0.3 * np.sin(2 * np.pi * t / 2.7) ** 2) * 0.35, -0.1)
def birds(d):
    """dawn birds, far and soft: short swept chirps"""
    n = int(d * SR); out = np.zeros(n)
    for _ in range(int(d * 2.5)):
        i = int(r.uniform(0, d - 0.3) * SR); m = int(r.uniform(0.06, 0.14) * SR); u = np.arange(m) / SR; f0, f1 = r.uniform(2500, 4200), r.uniform(3000, 5500)
        out[i:i + m] += np.sin(2 * np.pi * (f0 * u + (f1 - f0) * u * u / (2 * u[-1]))) * np.sin(np.pi * u / u[-1]) * 0.12
    return verb(stereo(out, r.uniform(-0.6, 0.6)), HALL)
def sand_pour(d): t = tt(d); return stereo(bp(noise(t.size), 1500, 9000) * 0.35 * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.2), 0.05)
def chair_creak(): return creak(0.9) * 1.2
def exhale(d=2.6):
    """a long, deep exhale"""
    t = tt(d); x = bp(noise(t.size), 200, 1600) * np.sin(np.pi * np.minimum(1, t / d) ** 0.7) ** 1.5 * np.exp(-t / 1.8) * 0.9
    return stereo(x)


def main():
    t = np.arange(N) / SR
    lib = mask([(0, 3.2), (5.2, 7.0), (10.6, 13.3), (50.4, TOTAL)])
    # ---------------- beds ----------------
    bed = room_tone(N) * (0.35 + 0.65 * lib) + lamp_flicker(N) * lib * 0.8
    bed += desert_wind(N) * mask(span("comfortRun", "comfortWind", "desertTrack", "desertDrone")) * 1.2
    sea = mask([(7.0, 10.6), (27.0, 33.4)], 0.4); rainK = mask([(7.0, 10.6), (17.4, 24.9), (27.0, 29.6)], 0.4)
    bed += waves(N) * sea * (1 - 0.5 * mask([(29.5, 33.4)], 1.5)) * 0.9 + rain(N) * rainK * (0.9 - 0.4 * mask(span("handRain", "rainWalk", "handLight")))

    bed += stereo(bp(noise(N), 150, 900) * 0.12) * mask(span("starsLook"))                                   # a night breeze
    bed += leaves(N) * mask(span("treeJoy"), 0.4) + stereo(lp(noise(N), 250) * 0.6) * mask(span("oyster"), 0.2)   # leaves; under the water
    fx = np.zeros((2, N))
    # ---------------- the library ----------------
    put(fx, whoosh(0.8, 1.2, 100, 2500), -0.05, -2); put(fx, rumble(1.2, 1.0), 0.0, -6)                     # the slam-zoom down the aisle
    for k, at in enumerate([0.9, 5.3, 5.75, 6.15]): put(fx, creak(0.5) * 0.7, at, -8)                       # the ladder creaking under him
    for pull, thud in zip([1.0, 6.2, 11.2], E["bookThud"]):
        put(fx, book_slide(0.5), pull, -4); put(fx, dust_puff(), pull + 0.15, -8); put(fx, book_thud(1.2), thud - 0.05, 0)
        put(fx, leather_creak(0.5), thud + 0.02, -6); put(fx, pages(0.6), thud + 0.08, -4)
    for i in range(5): put(fx, step_stone(0.8), 10.65 + 0.42 * i, -4)                                     # striding along the shelves
    for a, k in E["transitions"]:
        if k == "enterPage": put(fx, whoosh(1.1, 1.5, 100, 3200), a - 0.7, 0); put(fx, pressure_boom(1.3), a + 0.25, 0)   # into the page: a deep whoosh + the air-pressure boom
        if k == "exitPage": put(fx, whoosh(1.0, 1.3, 120, 3000, rev=True), a - 0.8, -1); put(fx, pages(0.6, 0.8), a - 0.1, -6)   # out: the reversed whoosh, a flutter
        if k == "pageTurn": put(fx, whoosh(0.5, 0.8, 600, 3000), a - 0.3, -8); put(fx, pages(0.25, 1.0), a - 0.1, -6)
        if k == "inkSpread": put(fx, whoosh(0.6, 0.5, 100, 800), a - 0.4, -10)
        if k == "paperBurn": put(fx, sizzle(0.9) * 0.5, a - 0.4, -10)
        if k == "whip": put(fx, whoosh(0.35, 1.2, 400, 5000), a - 0.2, -6)
        if k == "flashGold": put(fx, crystal(0.8) * 0.6, a - 0.1, -10)
    for at in [2.3, 6.5, 11.9]: put(fx, pages(0.6, 1.2), at, -2)                                              # the pages flipping fast to the drawing
    for p in timing["phrases"]:                                                                              # a quill scratch + a gold shimmer as each phrase appears
        put(fx, quill(1.0), p["start"], -10); put(fx, crystal(0.35) * 0.5, p["start"], -16)
    # ---------------- inside the books ----------------
    for i in range(8): put(fx, step_sand(1.1), 3.25 + 0.24 * i, -4)                                       # running on sand
    for at in E["crumble"]: put(fx, sand_crumble(1.4), at, -2)
    for at in E["lightning"]: put(fx, thunder(close=True), at + 0.05, -2)
    put(fx, thunder(), 18.5, -8); put(fx, thunder(), 23.0, -10); put(fx, thunder(), 28.0, -8)
    for k in range(int((10.6 - 7.0) / 0.55)): put(fx, creak(0.4) * 0.5, 7.1 + 0.55 * k, -10)               # the boat creaking
    for k in range(int((10.6 - 7.0) / 1.2)): put(fx, splash(1.0), 7.4 + 1.2 * k, -4)                        # the oars
    for k in range(int((33.4 - 27.0) / 1.25)): put(fx, splash(0.6), 27.3 + 1.25 * k, -8)
    for i in range(4): put(fx, step_sand(0.8), 13.4 + 1.0 * i, -8); put(fx, step_sand(0.6), 20.1 + 0.95 * i, -10)
    put(fx, birds(4.0), 29.4, -6)                                                                            # the rain stops; dawn birds
    put(fx, whoosh(1.4, 0.8, 200, 2000, rev=True), 29.3, -6)                                                  # the rain rising as light
    # ---------------- the montage ----------------
    for i in range(4): put(fx, clang(1.0), 33.45 + i * (0.6 * (34.6 - 33.4) / 0.58 / 4) * 0.58, -2); put(fx, crystal(0.3) * 0.8, 33.47 + i * 0.3, -10)
    put(fx, sizzle(2.0), 35.05, 0); put(fx, bubbles(1.0, 20), 35.1, -6)                                   # the blade into the water
    put(fx, bubbles(1.6, 10), 35.85, -4); put(fx, whoosh(0.6, 0.6, 200, 900), 36.1, -12)                 # the oyster opening
    put(fx, rock_crack(1.2), 37.55, 0); put(fx, sand_crumble(1.0), 37.7, -6); put(fx, creak(1.4) * 0.5, 38.0, -10)   # the seed splitting the rock, growing
    put(fx, grind(1.0), 39.25, -2); put(fx, rock_crack(0.8), 39.9, -2); put(fx, crystal(1.3), 40.0, -2)  # coal crushed into a diamond
    put(fx, sand_pour(2.4), 43.0, -4); put(fx, sand_pour(1.6) * np.linspace(1, 0, int(1.6 * SR))[None, :], 45.4, -6)   # the hourglass: pouring, stopping
    rev = sand_pour(1.6)[:, ::-1].copy(); put(fx, rev, 46.0, -6); put(fx, whoosh(1.2, 1.4, 200, 6000), 46.6, -2); put(fx, crystal(2.0), 47.1, -4); put(fx, pressure_boom(0.6), 47.1, -6)
    # ---------------- the ending: near silence, the chair, the exhale ----------------
    put(fx, book_thud(0.4), E["closeBook"] + 0.35, -8); put(fx, book_thud(0.5), E["closeBook"] + 1.1, -6)
    put(fx, chair_creak(), E["sit"] + 0.3, -2); put(fx, exhale(2.8), E["exhale"], 2)
    sfx = bed + fx
    quiet = mask([(52.4, TOTAL)], 1.2); sfx *= 1 - 0.55 * quiet                                          # everything drops toward silence
    # ---------------- duck 5 dB under the narrator's words ----------------
    spoken = mask([(p["start"], p["end"]) for p in timing["phrases"]] + [(q["start"], min(q["end"], timing["narrEnd"])) for q in timing["quran"] if q["start"] < timing["narrEnd"]], 0.15)
    sfx *= db(-5.0 * spoken)
    sfx *= np.clip((TOTAL - 0.05 - t) / 2.0, 0.02, 1) * np.clip(t / 0.03, 0, 1)
    meter = pyln.Meter(SR)
    def limit(x, ceil):
        up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=120)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    g = 0.0
    for _ in range(10):
        y = limit(sfx * db(g), -3.0) * db(-2.6); L = meter.integrated_loudness(y.T)   # -2.6: AAC adds up to ~1 dB to the peaks
        if abs(L + 19.5) < 0.1: break
        g += -19.5 - L
    y = y * min(1.0, db(-2.6) / np.abs(y).max())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    print(f"{OUT.name}: {y.shape[1] / SR:.2f} s; {meter.integrated_loudness(y.T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    # the PREVIEW: + the narration (up to the end of the narration; the guide's TikTok outro is cut)
    gd = load(GUIDE); nar = np.zeros((2, N)); m = min(gd.shape[1], int((timing["narrEnd"] + 1.2) * SR)); nar[:, :m] = gd[:, :m]
    fo = int(0.8 * SR); nar[:, m - fo:m] *= np.linspace(1, 0, fo)
    nar *= db(-16.0 - meter.integrated_loudness(nar[:, :int(timing["narrEnd"] * SR)].T))
    pv = y + nar; pv = pv * min(1.0, db(-1.5) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the narration (NOT for upload); peak {20 * np.log10(np.abs(pv).max()):.1f} dBFS")


if __name__ == "__main__":
    main()
