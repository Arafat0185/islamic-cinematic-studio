# Copied from claude-animated-shorts (templates/scripts/short_qa.py), MIT License, Copyright (c) 2026 Mr omi (see NOTICE.md).
# Changes in this copy: frames are read as a PNG stream (the bundled ffmpeg has no rawvideo muxer); ffmpeg / ffprobe are Remotion's bundled binaries (nothing on PATH on this machine); the black and
# frozen checks skip spans the plan marks as intended (the black silence after the shatter, the end card); also writes
# a 1-frame-per-second contact sheet.
# Frame-by-frame QA of a rendered vertical short (every frame at 30 fps): specs, loudness, per-frame luma / saturation /
# motion, black-white-frozen-pop detection (ignoring planned flashes and crossfades), per-shot colour stats and 2 s
# contact sheets (60 frames each, frame numbers burned in for the reviewer only).
# Usage: python scripts/short_qa.py <video.mp4> <outdir> [shots.json]
#   shots.json: [{"id":1,"a":0,"b":130}, ...] plus optional {"flash":[130,134], "xfade":[[1131,1137], ...]}
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

vid, out = sys.argv[1], sys.argv[2]
meta = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
shots = meta.get("shots", [])
planned = set()
for a, b in meta.get("xfade", []) + meta.get("planned", []) + ([meta["flash"]] if "flash" in meta else []):
    planned.update(range(a - 1, b + 1))
for s in shots:
    planned.update((s["a"] - 1, s["a"]))
os.makedirs(out, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
BIN = os.path.join(HERE, "..", "node_modules", "@remotion", "compositor-win32-x64-msvc")
FFMPEG, FFPROBE = os.path.join(BIN, "ffmpeg.exe"), os.path.join(BIN, "ffprobe.exe")
def run(*a):
    a = list(a); a[0] = {"ffmpeg": FFMPEG, "ffprobe": FFPROBE}.get(a[0], a[0])
    return subprocess.run(a, capture_output=True, text=True, encoding="utf-8", errors="replace")
R = []

pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels:format=duration", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video")
au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
R.append(f"SPECS {v['width']}x{v['height']} {v['r_frame_rate']} fps, {v.get('nb_frames')} frames, {float(pr['format']['duration']):.3f} s; audio: "
         + ", ".join(f"{s['codec_name']} {s['sample_rate']} Hz {s['channels']}ch" for s in au) if au else "NONE")
if au:
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = e[e.rfind("Summary:"):]
    I = [l.strip() for l in tail.splitlines() if l.strip().startswith(("I:", "LRA:", "Peak:"))]
    R.append("LOUDNESS " + " | ".join(I))
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "silencedetect=n=-45dB:d=0.3", "-f", "null", "-").stderr
    R.append("SILENCES " + ("; ".join(l.split("] ")[-1] for l in e.splitlines() if "silence_" in l) or "none"))

W, H = 180, 320
# Remotion's ffmpeg has no rawvideo muxer: read the frames as a PNG stream and decode them with Pillow
import io
raw = subprocess.run([FFMPEG, "-v", "error", "-i", vid, "-vf", f"scale={W}:{H}:flags=area", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
ends = []
i = 0
while True:
    j = raw.find(b"IEND", i)
    if j < 0: break
    ends.append(j + 8); i = j + 8
starts = [0] + ends[:-1]
F = np.stack([np.asarray(Image.open(io.BytesIO(raw[a:b])).convert("RGB")) for a, b in zip(starts, ends)])
n = len(F)
f32 = F.astype(np.float32) / 255
luma = (f32 @ np.array([0.2126, 0.7152, 0.0722], np.float32))
mx, mn = f32.max(-1), f32.min(-1)
sat = np.where(mx > 0.06, (mx - mn) / np.maximum(mx, 1e-6), 0)
L = luma.reshape(n, -1)
stats = {"mean": L.mean(1), "std": L.std(1), "p2": np.percentile(L, 2, 1), "p98": np.percentile(L, 98, 1), "sat": sat.reshape(n, -1).mean(1)}
diff = np.abs(np.diff(F.astype(np.int16), axis=0)).mean(axis=(1, 2, 3))
med = np.array([np.median(diff[max(0, i - 8):i + 9]) for i in range(len(diff))])
pops = [i + 1 for i in range(len(diff)) if diff[i] > 3 * med[i] + 1.0 and (i + 1) not in planned]
intended = set()
for a, b in meta.get("intended_dark", []): intended.update(range(a, b))
black = [i for i in range(n) if stats["mean"][i] < 0.04 and i not in intended]
white = [i for i in range(n) if stats["mean"][i] > 0.93 and i not in planned]
frozen, run_start = [], None
for i in range(len(diff)):
    if diff[i] < 0.02 and (i + 1) not in intended:
        run_start = i if run_start is None else run_start
    else:
        if run_start is not None and i - run_start >= 12: frozen.append((run_start, i))
        run_start = None
R.append(f"FRAMES {n}; black {black[:20]}; unplanned white {white[:20]}; frozen spans >=12f {frozen[:20]}")
R.append(f"POPS (unplanned frame-diff spikes > 3x local median): {pops[:40]}")
R.append(f"MOTION mean diff {diff.mean():.2f}; frames with diff<0.3 (held): {int((diff < 0.3).sum())} ({(diff < 0.3).mean() * 100:.0f}%)")

R.append("\nPER SHOT  (luma mean / std / p2 / p98 / saturation mean, medians over the shot)")
for s in shots or [{"id": 0, "a": 0, "b": n}]:
    a, b = s["a"], min(s["b"], n)
    if a >= b: continue
    R.append(f"  shot {s['id']:>2} f{a}-{b - 1}: " + " / ".join(f"{np.median(stats[k][a:b]):.3f}" for k in ("mean", "std", "p2", "p98", "sat")))
np.savez(os.path.join(out, "perframe.npz"), diff=diff, **stats)

# 2 s contact sheets, 10 x 6 frames of 108x192 each
cw, ch = 108, 192
for k in range(0, n, 60):
    S = Image.new("RGB", (cw * 10, ch * 6), "black"); d = ImageDraw.Draw(S)
    for j in range(min(60, n - k)):
        x, y = (j % 10) * cw, (j // 10) * ch
        S.paste(Image.fromarray(F[k + j]).resize((cw, ch)), (x, y))
        d.rectangle([x, y, x + 34, y + 12], fill="black"); d.text((x + 2, y + 1), str(k + j), fill="yellow")
    S.save(os.path.join(out, f"sheet_{k:04d}.jpg"), quality=85)
# one frame per second, 10 x 6 per sheet
idx = list(range(0, n, 30))
for k in range(0, len(idx), 60):
    S = Image.new("RGB", (cw * 10, ch * 6), "black"); d = ImageDraw.Draw(S)
    for j, fi in enumerate(idx[k:k + 60]):
        x, y = (j % 10) * cw, (j // 10) * ch
        S.paste(Image.fromarray(F[fi]).resize((cw, ch)), (x, y))
        d.rectangle([x, y, x + 40, y + 12], fill="black"); d.text((x + 2, y + 1), f"{fi // 30}s", fill="yellow")
    S.save(os.path.join(out, f"persecond_{k // 60}.jpg"), quality=88)
open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(R) + "\n")
print("\n".join(R))
