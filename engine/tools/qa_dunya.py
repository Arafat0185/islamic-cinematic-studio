"""Quality check of video 005 "The Dunya" before upload.
  1. short_qa.py on the upload file: specs, frozen frames (12+ identical frames), white frames, sudden jumps (the planned
     transitions excepted)
  2. both files: the same frame count (timing.json length) and the same picture
  3. black: no stretch darker than 4 % mean brightness longer than 0.3 s anywhere
  4. the audio: the upload file has the recitation at about -14 LUFS and the rain under the voice part at about -26 LUFS,
     peak under -1 dBFS, NO voice clip (its envelope does not follow the guide voice's; the preview's does), and no
     silence (< -55 dBFS) longer than 0.5 s
  5. the text: every recitation caption is an exact slice of the saved quran.com responses
  6. the 45-degree rule on shots framing him (a still render's pitch report)
Run from engine/:  .venv-tts/Scripts/python tools/qa_dunya.py out/The_Dunya.mp4 out/The_Dunya_PREVIEW.mp4 out/qa_dunya
"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "005-the-dunya"
UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8")); story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS); FRAMES = F(timing["length"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
lines = []
starts = [F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": starts[i + 1] if i + 1 < len(starts) else FRAMES} for i, a in enumerate(starts)]
ev = story["events"]
planned = [[F(s["at"]) - 12, F(s["at"]) + 14] for s in story["shots"][1:]] + [[F(61.6), F(64.6)], [F(timing["cardFrom"]) - 30, FRAMES]]
meta = {"shots": shots, "planned": planned, "intended_dark": []}
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
long_black = [(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs if b0 - a0 + 1 > 0.3 * FPS]
lines.append(f"## black\nblack stretches over 0.3 s: {long_black or 'none'}; all: {[(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs] or 'none'}; darkest frame mean {lum.min():.3f}")
def pcm(src, sr=48000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
u, pv = pcm(UP), pcm(PV); NE = int(timing["speechEnd"] * 48000); g = pcm(HERE.parent / "public/audio/guide/dunya_guide.mp4")[:NE]
m = pyln.Meter(48000)
env = lambda x: np.convolve(np.abs(x.mean(axis=1)), np.ones(4800) / 4800, mode="valid")[::480]
n = min(len(env(u[:NE])), len(env(g)), len(env(pv[:NE])))
cu, cp = float(np.corrcoef(env(u[:NE])[:n], env(g)[:n])[0, 1]), float(np.corrcoef(env(pv[:NE])[:n], env(g)[:n])[0, 1])
w = int(0.05 * 48000); mono = u.mean(axis=1); rms = 20 * np.log10(np.sqrt(np.array([np.mean(mono[i:i + w] ** 2) for i in range(0, len(mono) - w, w)])) + 1e-9)
sil, cur = [], None
for i, x in enumerate(rms < -55):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: sil.append(cur); cur = None
if cur: sil.append(cur)
long_sil = [(round(a0 * 0.05, 2), round((b0 - a0 + 1) * 0.05, 2)) for a0, b0 in sil if (b0 - a0 + 1) * 0.05 > 0.5]
A, C = int(timing["recStart"] * 48000), int(timing["cardFrom"] * 48000)
lines.append(f"## audio\nupload: recitation part {m.integrated_loudness(u[A:C]):.1f} LUFS (target -14), voice part (rain only) {m.integrated_loudness(u[:NE]):.1f} LUFS (target ~-26), peak {20 * np.log10(np.abs(u).max()):.1f} dBFS (must be < -1); preview peak {20 * np.log10(np.abs(pv).max()):.1f} dBFS\n"
             f"envelope correlation with the guide voice (0 .. speech end): upload {cu:+.3f} (should be low), preview {cp:+.3f} (should be high): voice clip in the upload file: {'NO' if cu < 0.4 and cp > 0.6 else 'CHECK'}\n"
             f"quietest 50 ms window {rms.min():.1f} dBFS; silences over 0.5 s (< -55 dBFS): {long_sil or 'none'}")
bad = []
for p in timing["phrases"]:
    d = json.loads((VDIR / "quran" / f"{p['verse'].replace(':', '_')}.json").read_text(encoding="utf-8"))["verse"]
    en = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
    if p["ar"] not in d["text_uthmani"] or p["en"] not in en: bad.append(p["verse"] + " " + p["en"])
lines.append(f"## text\n{len(timing['phrases'])} recitation captions (57:22-23); not matching the saved API text: {bad or 'none'}; {len(timing['voice'])} voice captions (the channel owner's text)")
env2 = {**os.environ, "TEMP": str(HERE.parent / ".remotion-tmp"), "TMP": str(HERE.parent / ".remotion-tmp")}
(OUT / "pitch.json").write_text(json.dumps({"samples": [0], "post": {"pitchReport": True}}), encoding="utf-8")
pr = subprocess.run(["npx", "remotion", "render", "src/index.ts", "TheDunyaSamples", str(OUT / "pitch"), "--sequence", "--image-format=jpeg", "--frames=0-0", "--scale=0.25", f"--props={OUT / 'pitch.json'}", "--log=verbose"],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True, cwd=HERE.parent, env=env2)
pl = re.findall(r"PITCH REPORT: [^\x1b\n]*", pr.stdout + pr.stderr)
lines.append("## 45-degree rule\n" + (pl[0] if pl else "pitch report not found"))
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
