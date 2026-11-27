"""Quality check of video 007 "The Lesson" before upload.
  1. short_qa.py on the upload file: specs, frozen frames (12+ identical frames), white frames, sudden jumps (the planned
     transitions excepted)
  2. both files: the same frame count (timing.json length) and the same picture
  3. black: inside the PICTURE (the letterbox bars are black on purpose), no stretch darker than 4 % mean brightness longer
     than 0.5 s (the fades through black are short; the end card is gold on black and counted separately)
  4. the letterbox: the bars stay black (only captions and tags in them)
  5. captions: every caption's text sits inside the bottom bar and the safe width; the Arabic and English text is the
     channel owner's, as supplied (timing.json)
  6. the audio: the upload file is sound design only at about -24 LUFS, peak under -1 dBFS, NO talk (its envelope does
     not follow the guide voice's; the preview's does), no silence (< -55 dBFS) longer than 0.5 s
  7. the 45-degree rule on shots framing him (a still render's pitch report)
Run from engine/:  .venv-tts/Scripts/python tools/qa_lesson.py out/The_Lesson.mp4 out/The_Lesson_PREVIEW.mp4 out/qa_lesson
"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "007-the-lesson"
UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8")); story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS); FRAMES = F(timing["length"]); CARD = F(timing["cardFrom"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
BAR, H, W = 285, 1920, 1080
lines = []
starts = [F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": starts[i + 1] if i + 1 < len(starts) else FRAMES} for i, a in enumerate(starts)]
tr = story["events"]["transitions"]
planned = [[F(s["at"]) - 16, F(s["at"]) + 16] for s in story["shots"][1:]] + [[F(l) - 2, F(l) + 16] for l in story["events"]["lightning"]] + [[CARD - 20, FRAMES]]
meta = {"shots": shots, "planned": planned, "intended_dark": [[CARD - 20, FRAMES]] + [[F(t) - 10, F(t) + 10] for t, k in tr if k == "black"]}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(UP), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## frames (upload file)\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])
def probe(f):
    o = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return int(o.strip().split(",")[0])
def vhash(f): return hashlib.md5(subprocess.run([FF, "-v", "error", "-i", str(f), "-map", "0:v", "-c", "copy", "-f", "h264", "-"], capture_output=True).stdout).hexdigest()
nu, npv = probe(UP), probe(PV)
lines.append(f"## files\nupload {nu} frames, preview {npv} frames, expected {FRAMES} ({FRAMES / FPS:.3f} s): {'OK' if nu == npv == FRAMES else 'MISMATCH'}; same picture: {vhash(UP) == vhash(PV)}")
# ---- black inside the picture, and the bars ----
sw, sh = 108, 192
g = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(UP), "-vf", f"scale={sw}:{sh},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout, np.uint8).reshape(-1, sh, sw).astype(float) / 255
b0, b1 = round(BAR / H * sh) + 1, round((H - BAR) / H * sh) - 1
pic = g[:, b0:b1].mean(axis=(1, 2)); topbar = g[:, :round(BAR / H * sh) - 6].mean(axis=(1, 2))
runs, cur = [], None
for i, x in enumerate(pic < 0.04):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: runs.append(cur); cur = None
if cur: runs.append(cur)
inside = lambda a0, b0_: all(not (a <= a0 and b0_ <= b) for a, b in meta["intended_dark"])
long_black = [(round(a0 / FPS, 2), round((b0_ - a0 + 1) / FPS, 2)) for a0, b0_ in runs if b0_ - a0 + 1 > 0.5 * FPS and inside(a0, b0_)]
card_lum = pic[CARD:].mean() if CARD < len(pic) else 0
lines.append(f"## black (picture area only)\nblack stretches over 0.5 s outside the planned fades/end card: {long_black or 'none'}; all dark runs: {[(round(a0 / FPS, 2), round((b0_ - a0 + 1) / FPS, 2)) for a0, b0_ in runs] or 'none'}; "
             f"darkest picture frame {pic.min():.3f} (frame {int(pic.argmin())}), end card mean {card_lum:.3f}\nletterbox: the top bar's darkest-to-brightest mean {topbar.min():.3f}-{topbar.max():.3f} (tags only)")
# ---- captions inside the bottom bar ----
full = lambda fr: np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{fr / FPS:.3f}", "-i", str(UP), "-frames:v", "1", "-vf", "format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout, np.uint8).reshape(H, W)
bad, boxes = [], []
for c in timing["talk"]:
    fr = F((c["start"] + min(c["end"], timing["cardFrom"])) / 2); im = full(fr)
    ys, xs = np.nonzero(im[H - BAR:, :] > 150)                            # bright text pixels inside the bottom bar (it is black)
    if ys.size == 0: bad.append(f"{c['i']}: no text found"); continue
    y0, y1, x0, x1 = ys.min() + H - BAR, ys.max() + H - BAR, xs.min(), xs.max()
    # text touching the bar's top edge would mean it spills onto the picture; also the bottom edge and the safe width
    if y0 < H - BAR + 6 or y1 > H - 30 or x1 - x0 > 790: bad.append(f"{c['i']} '{c['en'][:30]}': y {y0}-{y1}, x {x0}-{x1}")
    boxes.append((y0, y1, x0, x1))
lines.append(f"## captions\n{len(timing['talk'])} captions (the channel owner's Arabic + English); outside the bottom bar or too wide: {bad or 'none'}; text spans y {min(b[0] for b in boxes)}-{max(b[1] for b in boxes)} (bar {H - BAR}-{H}), widest {max(b[3] - b[2] for b in boxes)} px (limit 790)")
# ---- audio ----
def pcm(src, sr=48000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
u, pv = pcm(UP), pcm(PV); NE = int(timing["speechEnd"] * 48000); gd = pcm(HERE.parent / "public/audio/guide/lesson_guide.mp4")[:NE]
m = pyln.Meter(48000)
env = lambda x: np.convolve(np.abs(x.mean(axis=1)), np.ones(4800) / 4800, mode="valid")[::480]
n = min(len(env(u[:NE])), len(env(gd)), len(env(pv[:NE])))
cu, cp = float(np.corrcoef(env(u[:NE])[:n], env(gd)[:n])[0, 1]), float(np.corrcoef(env(pv[:NE])[:n], env(gd)[:n])[0, 1])
w = int(0.05 * 48000); mono = u.mean(axis=1); rms = 20 * np.log10(np.sqrt(np.array([np.mean(mono[i:i + w] ** 2) for i in range(0, len(mono) - w, w)])) + 1e-9)
sil, cur = [], None
for i, x in enumerate(rms < -55):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: sil.append(cur); cur = None
if cur: sil.append(cur)
long_sil = [(round(a0 * 0.05, 2), round((b0_ - a0 + 1) * 0.05, 2)) for a0, b0_ in sil if (b0_ - a0 + 1) * 0.05 > 0.5]
lines.append(f"## audio\nupload: {m.integrated_loudness(u):.1f} LUFS overall (target ~-24), peak {20 * np.log10(np.abs(u).max()):.1f} dBFS (must be < -1); preview peak {20 * np.log10(np.abs(pv).max()):.1f} dBFS\n"
             f"envelope correlation with the guide talk (0 .. speech end): upload {cu:+.3f} (should be low), preview {cp:+.3f} (should be high): talk in the upload file: {'NO' if cu < 0.4 and cp > 0.6 else 'CHECK'}\n"
             f"quietest 50 ms window {rms.min():.1f} dBFS; silences over 0.5 s (< -55 dBFS): {long_sil or 'none'}")
# ---- 45 degrees ----
env2 = {**os.environ, "TEMP": str(HERE.parent / ".remotion-tmp"), "TMP": str(HERE.parent / ".remotion-tmp")}
(OUT / "pitch.json").write_text(json.dumps({"samples": [0], "post": {"pitchReport": True}}), encoding="utf-8")
pr = subprocess.run(["npx", "remotion", "render", "src/index.ts", "TheLessonSamples", str(OUT / "pitch"), "--sequence", "--image-format=jpeg", "--frames=0-0", "--scale=0.25", f"--props={OUT / 'pitch.json'}", "--log=verbose"],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True, cwd=HERE.parent, env=env2)
pl = re.findall(r"PITCH REPORT: [^\x1b\n]*", pr.stdout + pr.stderr)
lines.append("## 45-degree rule\n" + (pl[0] if pl else "pitch report not found"))
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
