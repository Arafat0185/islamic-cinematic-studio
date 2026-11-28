"""Quality check of video 008 "The Prison" before upload.
  1. short_qa.py on the upload file: specs, frozen frames (12+ identical frames), white frames, sudden jumps (the planned
     transitions excepted)
  2. both files: the same frame count (timing.json length) and the same picture
  3. black: no stretch darker than 4 % mean brightness longer than 0.5 s
  4. captions vs the guide: for every caption, the frame where our caption appears/changes is found in the render
     (white text in the caption strip at 62 % height) and compared with the guide's own caption change frame
     (the same detection on the guide's burned-in captions); the text was read from the guide frame by frame
  5. the audio: sound design only at about -26 LUFS, peak under -1 dBFS, NO narration (its envelope does not follow the
     guide voice's; the preview's does), no silence (< -55 dBFS) longer than 0.5 s
  6. the 45-degree rule on shots framing him
Run from engine/:  .venv-tts/Scripts/python tools/qa_prison.py out/The_Prison.mp4 out/The_Prison_PREVIEW.mp4 out/qa_prison
"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "008-the-prison"
UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8")); story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS); FRAMES = F(timing["length"]); CARD = F(timing["cardFrom"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
GUIDE = HERE.parent / "public/audio/guide/prison_guide.mp4"
lines = []
starts = [F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": starts[i + 1] if i + 1 < len(starts) else FRAMES} for i, a in enumerate(starts)]
planned = [[F(s["at"]) - 16, F(s["at"]) + 16] for s in story["shots"][1:]] + [[CARD - 100, FRAMES]]
meta = {"shots": shots, "planned": planned, "intended_dark": [[F(t) - 10, F(t) + 10] for t, k in story["events"]["transitions"] if k == "dissolve"]}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(UP), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## frames (upload file)\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])
def probe(f):
    o = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return int(o.strip().split(",")[0])
def vhash(f): return hashlib.md5(subprocess.run([FF, "-v", "error", "-i", str(f), "-map", "0:v", "-c", "copy", "-f", "h264", "-"], capture_output=True).stdout).hexdigest()
nu, npv = probe(UP), probe(PV)
lines.append(f"## files\nupload {nu} frames, preview {npv} frames, expected {FRAMES} ({FRAMES / FPS:.3f} s): {'OK' if nu == npv == FRAMES else 'MISMATCH'}; same picture: {vhash(UP) == vhash(PV)}")
lum = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(UP), "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout, np.uint8).reshape(-1, 96 * 54).mean(1) / 255
runs, cur = [], None
for i, x in enumerate(lum < 0.04):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: runs.append(cur); cur = None
if cur: runs.append(cur)
long_black = [(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs if b0 - a0 + 1 > 0.5 * FPS]
lines.append(f"## black\nblack stretches over 0.5 s: {long_black or 'none'}; darkest frame mean {lum.min():.3f} (frame {int(lum.argmin())})")
# ---- captions: change frames in our render vs the guide ----
def changes(src, x0, y0, w, h, thr, min_px):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"crop={w}:{h}:{x0}:{y0},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8); n = fr.size // (w * h); m = fr[:n * w * h].reshape(n, h, w) > thr
    on = m.sum((1, 2)) > min_px; ch = [0] * n
    for i in range(1, n): ch[i] = (m[i] ^ m[i - 1]).sum() / max(1, (m[i] | m[i - 1]).sum())
    return on, np.array(ch)
on_u, ch_u = changes(UP, 60, int(0.62 * 1920) - 120, 960, 240, 225, 400)
cap = timing["captions"]; err = []
for c in cap:
    f0, f1 = c["f0"], c["f1"]
    # our caption must be up through its span, and appear / change within 3 frames of the guide's frame
    present = on_u[f0 + 6:max(f0 + 7, f1 - 6)].mean() if f1 - f0 > 12 else 1.0
    near = [f for f in range(max(1, f0 - 4), min(len(ch_u), f0 + 5)) if ch_u[f] > 0.3 or (on_u[f] and not on_u[f - 1])]
    if present < 0.9 or not near: err.append(f"{c['i']} '{c['text'][:28]}' present {present:.2f}, change near frame {f0}: {near[:3] or 'none'}")
lines.append(f"## captions vs the guide\n{len(cap)} captions, text read from the guide's burned-in captions (same words, chunks and line breaks); "
             f"on/off frames = the guide's caption-change frames; in our render, captions not up for their span or not changing within 4 frames of the guide: {err or 'none'}")
# ---- audio ----
def pcm(src, sr=48000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
u, pv = pcm(UP), pcm(PV); NE = int(timing["speechEnd"] * 48000); gd = pcm(GUIDE)[:NE]
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
long_sil = [(round(a0 * 0.05, 2), round((b0 - a0 + 1) * 0.05, 2)) for a0, b0 in sil if (b0 - a0 + 1) * 0.05 > 0.5]
lines.append(f"## audio\nupload: {m.integrated_loudness(u):.1f} LUFS overall (target ~-26), peak {20 * np.log10(np.abs(u).max()):.1f} dBFS (must be < -1); preview peak {20 * np.log10(np.abs(pv).max()):.1f} dBFS\n"
             f"envelope correlation with the guide narration (0 .. speech end): upload {cu:+.3f} (should be low), preview {cp:+.3f} (should be high): narration in the upload file: {'NO' if cu < 0.4 and cp > 0.6 else 'CHECK'}\n"
             f"quietest 50 ms window {rms.min():.1f} dBFS; silences over 0.5 s (< -55 dBFS): {long_sil or 'none'}")
env2 = {**os.environ, "TEMP": str(HERE.parent / ".remotion-tmp"), "TMP": str(HERE.parent / ".remotion-tmp")}
(OUT / "pitch.json").write_text(json.dumps({"samples": [0], "post": {"pitchReport": True}}), encoding="utf-8")
pr = subprocess.run(["npx", "remotion", "render", "src/index.ts", "ThePrisonSamples", str(OUT / "pitch"), "--sequence", "--image-format=jpeg", "--frames=0-0", "--scale=0.25", f"--props={OUT / 'pitch.json'}", "--log=verbose"],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True, cwd=HERE.parent, env=env2)
pl = re.findall(r"PITCH REPORT: [^\x1b\n]*", pr.stdout + pr.stderr)
lines.append("## 45-degree rule\n" + (pl[0] if pl else "pitch report not found"))
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
