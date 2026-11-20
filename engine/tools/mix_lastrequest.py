"""Sound for video 002 "The Last Request". No music, no melodic drones: natural and eerie sounds only.
  recitation  Al-Munafiqun 63:10-11 (public/audio/recitation/recitation_63_10-11.m4a, its own echo kept, nothing added),
              placed at timing.json recStart, at -14 LUFS
  under it    rain the whole way (muffled behind glass indoors, open outside), wind and a howl through a gap, thunder near
              and far, a slow clock (racing while the barakah drains), and the story: a heartbeat under the voice part that
              slows and grows heavier, his breathing as he runs, splashing steps, the bus pulling away, the crowd, bed
              sheets, a door creak, the prayer beads scattering, a low 60 Hz rumble on the big moments, the phone buzzing
              and cracking in the puddle, his fall, the monitor's beep slowing to a flatline, a distant dog, the janazah's
              steps in the mud, rain on the umbrellas, soil, the last footsteps fading.
  levels      ambience and effects about -24 LUFS under the voice part, about -26 LUFS under the recitation (it has no
              gaps), and they dip a little more under the recitation's loudest moments
Writes public/audio/lastrequest_mix.wav (upload) and public/audio/lastrequest_preview_mix.wav (+ the guide voice for
0 .. voiceEnd, public/audio/guide/alborz_guide.mp4: checking only, never upload).
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
REC = HERE.parent / "public" / "audio" / "recitation" / "recitation_63_10-11.m4a"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "alborz_guide.mp4"
OUT = HERE.parent / "public" / "audio" / "lastrequest_mix.wav"
OUT_PREVIEW = HERE.parent / "public" / "audio" / "lastrequest_preview_mix.wav"
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
TOTAL = timing["length"]; N = int(TOTAL * SR); E = story["events"]
SHOTS = [{**s, "to": story["shots"][i + 1]["at"] if i + 1 < len(story["shots"]) else TOTAL} for i, s in enumerate(story["shots"])]
S = {s["kind"]: s for s in SHOTS}
r = np.random.default_rng(2)


def load(p: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-map", "0:a", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)

def smooth_avg(m: np.ndarray, k: int) -> np.ndarray:
    c = np.cumsum(np.concatenate([[0.0], m])); i = np.arange(len(m)); lo = np.clip(i - k // 2, 0, len(m)); hi = np.clip(i + k // 2, 0, len(m))
    return (c[hi] - c[lo]) / np.maximum(1, hi - lo)

def envelope(x: np.ndarray, win=0.25) -> np.ndarray:
    m = np.abs(x).mean(axis=0) if x.ndim == 2 else np.abs(x)
    e = smooth_avg(m, int(win * SR))
    return np.clip(e / (np.percentile(e[e > 0], 95) + 1e-9), 0, 1)

def mask(spans, xf=0.4):
    m = np.zeros(N)
    for a, b in spans: m[int(a * SR):int(b * SR)] = 1
    return smooth_avg(m, int(xf * SR))

def put(dst, x, at, g=0.0):
    i = int(at * SR)
    if i >= dst.shape[1] or i + x.shape[1] <= 0: return
    if i < 0: x = x[:, -i:]; i = 0
    m = min(x.shape[1], dst.shape[1] - i); dst[:, i:i + m] += x[:, :m] * db(g)

def tt(d): return np.arange(int(d * SR)) / SR

# ---------------- the sounds ----------------
def rain(n):
    hiss = hp(noise(n), 1500) * 0.35 + bp(noise(n), 400, 1500) * 0.25
    drops = np.zeros(n); idx = r.integers(0, n, int(n / SR * 900)); drops[idx] = r.uniform(0.3, 1.0, idx.size)
    drops = bp(drops, 1500, 7000) * 1.6
    return np.stack([hiss + drops, hp(noise(n), 1500) * 0.35 + bp(noise(n), 400, 1500) * 0.25 + np.roll(drops, 1777)])
def glass(n, rate=60):
    d = np.zeros(n); idx = r.integers(0, n, int(n / SR * rate)); d[idx] = r.uniform(0.3, 1.0, idx.size)
    return stereo(bp(d, 1200, 5000) * 1.2)
def wind(n):
    t = np.arange(n) / SR; swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 9.0) * np.sin(2 * np.pi * t / 23.0 + 1)
    return np.stack([lp(noise(n), 350) * swell * 0.9, lp(noise(n), 350) * np.roll(swell, int(1.3 * SR)) * 0.9])
def howl(d):
    """wind through a gap: a narrow band of noise sliding slowly up and down (no pitch)"""
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n); seg = int(0.05 * SR)
    for i in range(0, n, seg):
        c = 700 + 350 * np.sin(2 * np.pi * i / SR / 3.1); w = min(seg, n - i)
        x[i:i + w] = bp(noise(w + 2000), c * 0.85, c * 1.15)[1000:1000 + w]
    return stereo(x * np.sin(np.pi * t / d) ** 2 * 0.5, 0.2)
def thunder(close=False):
    d = 4.5 if not close else 5.5; t = tt(d)
    roll = lp(noise(t.size), 110 if not close else 180) * (np.minimum(1, t / (0.6 if not close else 0.04)) * np.exp(-t / (1.6 if not close else 1.3))) * (1.0 + 0.5 * lp(noise(t.size), 3))
    x = roll * (0.8 if not close else 1.5)
    if close: x = x + bp(noise(t.size), 300, 3000) * np.exp(-t / 0.08) * 1.0
    return verb(stereo(x), HALL)
def rumble(d, k=1.0):
    """a low 60 Hz rumble swelling under a big moment"""
    t = tt(d); return stereo((np.sin(2 * np.pi * 60 * t) * 0.6 + lp(noise(t.size), 90) * 0.8) * np.sin(np.pi * t / d) ** 1.5 * k)
def tick(k=1.0):
    m = int(0.04 * SR); return stereo(bp(noise(m), 2000, 6000) * np.exp(-np.arange(m) / (0.004 * SR)) * 0.5 * k)
def heartbeat(k=1.0):
    """lub-dub: two low, soft thumps (filtered noise with a little body)"""
    t = tt(0.55); x = np.zeros(t.size)
    for t0, g in [(0.0, 1.0), (0.2, 0.65)]:
        u = np.clip(t - t0, 0, None); env = (t >= t0) * np.exp(-u / 0.05) * np.minimum(1, u / 0.006)
        x += (lp(noise(t.size), 80) * 1.6 + np.sin(2 * np.pi * 48 * u) * 0.9) * env * g
    return stereo(x * k)
def breath(d, rate=2.2):
    """hard breathing as he runs: in and out through the mouth (filtered noise)"""
    t = tt(d); ph = (t * rate) % 1
    env = np.where(ph < 0.45, np.sin(np.pi * ph / 0.45) * 0.6, np.sin(np.pi * (ph - 0.45) / 0.55) * 1.0) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)
    return stereo(bp(noise(t.size), 500, 2600) * env * 0.5, -0.1)
def splash_step(k=1.0, wet=1.0):
    m = int(0.2 * SR); t = np.arange(m) / SR
    return stereo(lp(noise(m), 600) * np.exp(-t / 0.035) * 0.7 * k + bp(noise(m), 1500, 7000) * np.exp(-t / (0.06 * wet)) * 0.45 * k * wet, r.uniform(-0.3, 0.3))
def steps(at, n, gap, g=0.0, wet=1.0, fade=False, jitter=0.05):
    return [(at + i * gap + r.uniform(-jitter, jitter), g - (12 * i / max(1, n - 1) if fade else 0), wet) for i in range(n)]
def bus_away(d=3.2):
    t = tt(d); eng = lp(noise(t.size), 140) * (0.4 + 0.8 * np.minimum(1, t / 0.6)) * np.exp(-np.maximum(0, t - 1.0) / 1.2)
    tyres = bp(noise(t.size), 800, 4000) * 0.25 * np.exp(-np.maximum(0, t - 1.2) / 1.0)
    brake = bp(noise(t.size), 2500, 9000) * np.exp(-t / 0.25) * 0.6
    return np.stack([eng + tyres * 0.8 + brake, eng * 0.8 + tyres + brake * 0.8])
def sheets(d):
    t = tt(d); return verb(stereo(bp(noise(t.size), 800, 6000) * np.abs(np.sin(2 * np.pi * t * 1.3)) ** 2 * 0.35), ROOM)
def creak(d=1.4):
    """a door's creak: a rasping band of noise pulsing as the hinge drags"""
    t = tt(d); band = bp(noise(t.size), 350, 900) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * (18 + 6 * t) * t))) * np.sin(np.pi * t / d)
    return verb(stereo(band * 0.5), ROOM)
def beads_scatter():
    out = np.zeros((2, int(2.4 * SR)))
    for k in range(40):
        at = 0.05 + 0.6 * r.random() ** 1.5 + 0.12 * (k % 3); m = int(0.025 * SR); i = int(at * SR)
        out[:, i:i + m] += stereo(bp(noise(m), 2500, 9000) * np.exp(-np.arange(m) / (0.003 * SR)) * (0.6 - 0.35 * at / 1.5), r.uniform(-0.6, 0.6))
    return verb(out, ROOM)
def buzz(d=0.7):
    t = tt(d); return stereo(lp(noise(t.size), 230) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * t))) * np.sin(np.pi * t / d) ** 0.4 * 0.9)
def crack():
    t = tt(0.5); return verb(stereo(bp(noise(t.size), 1500, 8000) * np.exp(-t / 0.02) * 1.0 + bp(noise(t.size), 3000, 9000) * np.exp(-np.maximum(0, t - 0.04) / 0.05) * (t > 0.04) * 0.5), ROOM)
def body_fall():
    t = tt(0.9); return verb(stereo(lp(noise(t.size), 250) * np.exp(-t / 0.09) * 1.2 + bp(noise(t.size), 1000, 6000) * np.exp(-t / 0.15) * 0.5), ROOM)
def beep(f0=1000, d=0.12):
    t = tt(d); return stereo(np.sin(2 * np.pi * f0 * t) * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.01) * 0.25)
def bark():
    out = np.zeros((2, int(1.0 * SR)))
    for at in (0.0, 0.32):
        t = tt(0.16); x = bp(noise(t.size), 450, 1500) * np.sin(np.pi * t / 0.16) ** 0.7 * 0.6; i = int(at * SR)
        out[:, i:i + t.size] += stereo(x, 0.5)
    return verb(out, HALL)
def umbrella_rain(d):
    n = int(d * SR); x = np.zeros(n); idx = r.integers(0, n, int(d * 500)); x[idx] = r.uniform(0.2, 1.0, idx.size)
    return stereo(bp(x, 600, 2500) * 1.4)
def wings():
    """crows taking off: a flurry of wing beats (noise bursts), thinning out"""
    n = int(1.8 * SR); t = np.arange(n) / SR; beat = np.maximum(0, np.sin(2 * np.pi * 7.5 * t)) ** 3
    return stereo(bp(noise(n), 300, 2600) * beat * np.exp(-t / 0.8) * 0.9, -0.3)
def latch_soft():
    t = tt(0.25); return verb(stereo(lp(noise(t.size), 900) * np.exp(-t / 0.02) * 0.8), ROOM)
def soil():
    t = tt(0.9); thud = lp(noise(t.size), 300) * np.exp(-t / 0.06) * 0.8
    scatter = bp(noise(t.size), 600, 4000) * np.exp(-np.maximum(0, t - 0.03) / 0.25) * (t > 0.03) * 0.35
    return verb(stereo(thud + scatter), ROOM)


def main():
    t = np.arange(N) / SR
    a, b = int(timing["recStart"] * SR), int(timing["recEnd"] * SR)
    # ---------------- the recitation at -14 LUFS ----------------
    rec = np.zeros((2, N)); put(rec, load(REC), timing["recStart"])
    meter = pyln.Meter(SR)
    rec *= db(-14.0 - meter.integrated_loudness(rec[:, a:b].T))
    # ---------------- the beds ----------------
    indoor = mask([(s["at"], s["to"]) for s in SHOTS if s["set"] in ("bedroom", "hospital")])
    room = mask([(s["at"], s["to"]) for s in SHOTS if s["set"] == "bedroom"])
    rn = rain(N)
    amb = rn * (1 - indoor) * 0.9 + lp(rn, 1100) * indoor * 0.55 + glass(N) * indoor * 0.35
    amb += glass(N, 160) * mask([(S["bedRail"]["at"], S["flatline"]["to"])]) * 0.6
    amb += wind(N) * (0.35 + 0.65 * (1 - indoor))
    # ---------------- the story ----------------
    fx = np.zeros((2, N))
    hb = 0.3                                                                   # the heartbeat under the voice part: slower, heavier
    while hb < 19.7:
        put(fx, heartbeat(0.6 + 0.6 * hb / 19.7), hb, -6); hb += 0.75 + 0.55 * (hb / 19.7) ** 1.3
    put(fx, breath(3.0), 0.0, -4)                                              # running: breathing, splashing, the bus, the crowd
    for at, g, w in steps(0.05, 9, 0.31, 0, 1.4): put(fx, splash_step(1.0, w), at, g)
    put(fx, bus_away(), E["busPass"][0], -2)
    for at, g, w in steps(3.1, 10, 0.13, -8, 1.2, jitter=0.06): put(fx, splash_step(0.8, w), at, g)
    put(fx, sheets(S["toss3am"]["to"] - S["toss3am"]["at"] + 0.4), S["toss3am"]["at"], -4); put(fx, tick(1.2), S["grabPhone"]["at"] + 0.5, -2)
    for at, g, w in steps(S["pastShelf"]["at"] + 0.2, 5, 0.42, -6, 0.3): put(fx, splash_step(0.6, w), at, g)
    for at, g, w in steps(S["pastMasjid"]["at"] + 0.05, 5, 0.38, -4, 1.2): put(fx, splash_step(0.8, w), at, g)
    put(fx, creak(), S["pastMasjid"]["at"] + 0.4, -6)
    put(fx, beads_scatter(), E["beads"] + 0.35, 0)
    put(fx, rumble(4.4, 1.0), S["drainWave"]["at"] - 0.2, -4); put(fx, howl(4.2), S["drainWave"]["at"], -6)   # the barakah drains
    rt, gap = S["drainWave"]["at"], 0.5
    while rt < S["collapseBed"]["at"]: put(fx, tick(0.9), rt, -4); rt += gap; gap = max(0.07, gap * 0.9)
    put(fx, body_fall(), E["collapseBed"] + 0.25, 0); put(fx, rumble(1.6, 1.3), E["collapseBed"] + 0.1, -2)
    put(fx, heartbeat(1.6), E["phoneOff"], 0); put(fx, thunder(close=True), E["phoneOff"] + 0.02, -2)   # the hard cut on "up": a heavy heartbeat, a crack of thunder
    for k in range(4): put(fx, buzz(0.5), S["bankPanic"]["at"] + 0.2 + 0.65 * k, -10)   # 63:10
    for at, g, w in steps(S["walkHome"]["at"] + 0.1, 8, 0.36, -4, 1.0): put(fx, splash_step(0.7, w), at, g)
    put(fx, splash_step(1.2, 1.6), E["phoneDrop"] + 0.3, 0); put(fx, crack(), E["phoneDrop"] + 0.32, -2)
    for at, g, w in steps(S["collapseStreet"]["at"] + 0.05, 2, 0.5, -6, 1.0): put(fx, splash_step(0.8, w), at, g)
    put(fx, body_fall(), E["fall"] + 0.25, 0); put(fx, splash_step(1.4, 1.8), E["fall"] + 0.26, 0); put(fx, rumble(2.0, 1.2), E["fall"], -4)
    bt, per = S["bedRail"]["at"], 0.9                                          # the monitor slowing to a flatline
    while bt < E["flat"]: put(fx, beep(), bt, -10); bt += per; per *= 1.18
    fl = beep(1000, 2.4); fl[:, -int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR)); put(fx, fl, E["flat"], -12)
    put(fx, rumble(2.2, 1.0), E["flat"] - 0.1, -6)
    put(fx, howl(2.8), S["emptyCurtain"]["at"], -8); put(fx, bark(), S["emptyCurtain"]["at"] + 0.9, -14)
    # the people he left behind: his father's beads, the phone picked up, the mushaf, the laptop, the box, the door
    for k in range(5): put(fx, tick(0.6), S["fatherBed"]["at"] + 0.3 + 0.38 * k, -10)
    for d in [0.05, 0.35]: put(fx, buzz(0.3), S["phoneMat"]["at"] + d, -8)
    put(fx, tick(1.0), E["phonePick"] + 0.15, -4)
    put(fx, sheets(0.5), S["mushafBlow"]["at"] + 0.35, -8); put(fx, breath(0.5, 2.0), E["blow"], -6)
    put(fx, tick(0.9), S["laptopClose"]["at"] + 0.2, -6); put(fx, latch_soft(), E["laptopClose"][1] - 0.1, -2)
    put(fx, body_fall() * 0.25, E["wallet"] + 0.15, -10)
    put(fx, tick(1.0), E["kufi"] + 0.25, -4); put(fx, creak(1.6), S["kufiDoor"]["at"] + 0.3, -12)
    put(fx, howl(3.0), S["fatherBed"]["at"], -10)
    for at in [2.2, 12.0, 26.0, 38.5, 47.0, 58.0, 68.5]: put(fx, thunder(), at, -6)
    for at in E["lightning"]: put(fx, thunder(close=True), at + 0.05, 0)
    jz0, jz1 = S["janazahTrack"]["at"], S["graveSoil"]["at"]                 # the janazah
    for at, g, w in steps(jz0, int((jz1 - jz0) / 0.36), 0.36, -2, 1.3): put(fx, splash_step(0.9, w), at, g)
    put(fx, umbrella_rain(S["umbrellaLine"]["to"] - S["umbrellaLine"]["at"] + 2.0), S["janazahTrack"]["at"] + 2.0, -10)
    s0, s1 = E["soil"]; st = s0
    while st < s1: put(fx, soil(), st, -2); st += 0.75 + 0.2 * r.random()
    for at, g, w in steps(S["walkAway"]["at"] + 0.2, 10, 0.34, -2, 1.1, fade=True): put(fx, splash_step(0.8, w), at, g)
    put(fx, umbrella_rain(1.0) * 1.5, S["waterGrave"]["at"] + 0.1, -6)
    put(fx, wings(), E["crows"], -2); put(fx, howl(4.0), S["gravesTrack"]["at"], -4)
    put(fx, rumble(2.4, 0.8), S["fogPullback"]["at"], -6)
    for k in range(int(TOTAL)): put(amb, tick() * (0.2 + 0.8 * room[min(N - 1, int(k * SR))]), k + 0.3, -8)   # the slow clock
    sfx = amb + fx
    cut = (t >= E["phoneOff"]) & (t < timing["recStart"]); sfx[:, cut] *= 0.35  # the hard cut to black: only a little rain
    v = int(timing["voiceEnd"] * SR)
    gd = load(GUIDE); g2 = np.zeros((2, N)); m = min(gd.shape[1], N); g2[:, :m] = gd[:, :m]; g2[:, v:] = 0
    sfx *= 1 - 0.3 * np.clip(envelope(g2) + envelope(rec), 0, 1)                  # dip under the voice and the recitation's peaks
    gv = db(-24.0 - meter.integrated_loudness(sfx[:, :v].T)); gr = db(-26.0 - meter.integrated_loudness(sfx[:, a:b].T))
    sfx *= smooth_avg(np.where(t < timing["recStart"], gv, gr), int(0.6 * SR))
    sfx *= np.clip((TOTAL - 0.05 - t) / 2.5, 0, 1)
    # ---------------- master ----------------
    mix = rec + sfx
    def limit(x, ceil):
        up = resample_poly(x, 4, 1, axis=1).astype(np.float32)
        up = Pedalboard([Limiter(threshold_db=ceil - 0.6, release_ms=120)])(up, SR * 4)
        return resample_poly(up, 1, 4, axis=1).astype(np.float32)
    g = 0.0
    for _ in range(8):
        y = limit(mix * db(g), -1.0); L = meter.integrated_loudness(y[:, a:b].T)
        if abs(L + 14.0) < 0.05: break
        g += -14.0 - L
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, y.T, SR, subtype="PCM_24")
    sv = limit(sfx * db(g), -1.0)
    print(f"{OUT.name}: {y.shape[1] / SR:.2f} s; with the recitation {meter.integrated_loudness(y[:, a:b].T):.1f} LUFS; effects under the voice part {meter.integrated_loudness(sv[:, :v].T):.1f} LUFS; under the recitation {meter.integrated_loudness(sv[:, a:b].T):.1f} LUFS; peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
    pv = y + g2 * db(-14.0 - meter.integrated_loudness(g2[:, :m].T)); pv = pv * min(1.0, db(-1.0) / np.abs(pv).max())
    sf.write(OUT_PREVIEW, pv.T, SR, subtype="PCM_24")
    print(f"{OUT_PREVIEW.name}: + the guide voice (NOT for upload)")


if __name__ == "__main__":
    main()
