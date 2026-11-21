"""Quality check of video 003 "The Sirat" before upload.
  1. short_qa.py on the upload file: specs, frozen frames (12+ identical frames), white frames, sudden jumps (the planned
     transitions, lightning and impacts excepted)
  2. both files: the same frame count (timing.json length) and the same picture
  3. black: no stretch darker than 4 % mean brightness longer than 0.3 s anywhere (the smash cuts are 0.2-0.25 s)
  4. the audio: both files carry the recitation (-14 LUFS, cut before 19:73: nothing of it after 110.3 s) and the
     effects; peak under -1 dBFS; no silence (< -55 dBFS) longer than 0.5 s
  5. the text: every caption is an exact slice of the saved quran.com responses (19:66-72)
  6. the 45-degree rule on character shots (the camera's steepest downward look, from a still render's pitch report)
Run from engine/:  .venv-tts/Scripts/python tools/qa_sirat.py out/The_Sirat.mp4 out/The_Sirat_PREVIEW.mp4 out/qa_sirat
"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "003-the-sirat"
UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8")); story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS); FRAMES = F(timing["length"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
lines = []
starts = [F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": starts[i + 1] if i + 1 < len(starts) else FRAMES} for i, a in enumerate(starts)]
ev = story["events"]
planned = [[F(t) - 12, F(t) + 14] for t, _ in ev["transitions"]] + [[F(t) - 2, F(t) + 18] for t in ev["lightning"]]
planned += [[F(ev[k]) - 15, F(ev[k]) + 20] for k in ("strike", "snatch", "pass")] + [[F(c) - 10, F(c) + 70] for c in ev["collapse"]] + [[F(timing["continueFrom"]) - 12, FRAMES]]
smash = [[s["a"], s["b"]] for s, raw in zip(shots, story["shots"]) if raw["kind"].startswith("smash")]
meta = {"shots": shots, "planned": planned, "intended_dark": smash}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(UP), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## frames (upload file)\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])
def probe(f):
    o = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return int(o.strip().split(",")[0])
def vhash(f): return hashlib.md5(subprocess.run([FF, "-v", "error", "-i", str(f), "-map", "0:v", "-c", "copy", "-f", "h264", "-"], capture_output=True).stdout).hexdigest()
nu, npv = probe(UP), probe(PV)
lines.append(f"## files\nupload {nu} frames, preview {npv} frames, expected {FRAMES} ({FRAMES / FPS:.3f} s): {'OK' if nu == npv == FRAMES else 'MISMATCH'}; same picture: {vhash(UP) == vhash(PV)}")
# black stretches (all of them, the smash cuts included: none may last longer than 0.3 s)
lum = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(UP), "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout, np.uint8).reshape(-1, 96 * 54).mean(1) / 255
runs, cur = [], None
for i, x in enumerate(lum < 0.04):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: runs.append(cur); cur = None
if cur: runs.append(cur)
long_black = [(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs if b0 - a0 + 1 > 0.3 * FPS]
all_black = [(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs]
lines.append(f"## black\nblack stretches over 0.3 s: {long_black or 'none'}; all black stretches: {all_black or 'none'}; darkest frame mean {lum.min():.3f}")
# audio
def pcm(src, sr=48000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
u, pv = pcm(UP), pcm(PV); RE = timing["recEnd"]; g = pcm(HERE.parent / "public/audio/guide/sirat_recitation.mp4")[: int(RE * 48000)]
m = pyln.Meter(48000); ce = int(RE * 48000)
env = lambda x: np.convolve(np.abs(x.mean(axis=1)), np.ones(4800) / 4800, mode="valid")[::480]
n = min(len(env(u[:ce])), len(env(g)), len(env(pv[:ce])))
cu, cp = float(np.corrcoef(env(u[:ce])[:n], env(g)[:n])[0, 1]), float(np.corrcoef(env(pv[:ce])[:n], env(g)[:n])[0, 1])
# nothing of 19:73: the guide after the cut must not be in our file (its envelope over 110.3-112.5 s vs ours)
g73 = pcm(HERE.parent / "public/audio/guide/sirat_recitation.mp4")[int(110.3 * 48000):int(112.5 * 48000)]; o73 = u[int(110.3 * 48000):int(112.5 * 48000)]
k = min(len(g73), len(o73)); c73 = float(np.corrcoef(np.abs(g73[:k].mean(1))[::480], np.abs(o73[:k].mean(1))[::480])[0, 1])
w = int(0.05 * 48000); mono = u.mean(axis=1); rms = 20 * np.log10(np.sqrt(np.array([np.mean(mono[i:i + w] ** 2) for i in range(0, len(mono) - w, w)])) + 1e-9)
sil, cur = [], None
for i, x in enumerate(rms < -55):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: sil.append(cur); cur = None
if cur: sil.append(cur)
long_sil = [(round(a0 * 0.05, 2), round((b0 - a0 + 1) * 0.05, 2)) for a0, b0 in sil if (b0 - a0 + 1) * 0.05 > 0.5]
lines.append(f"## audio\nupload: recitation span (0-{RE} s) {m.integrated_loudness(u[:ce]):.1f} LUFS (target -14); whole file peak {20 * np.log10(np.abs(u).max()):.1f} dBFS (must be < -1); preview peak {20 * np.log10(np.abs(pv).max()):.1f} dBFS\n"
             f"envelope correlation with the recitation: upload {cu:+.3f}, preview {cp:+.3f} (both should be high: the recitation is in both files): {'OK' if cu > 0.6 and cp > 0.6 else 'CHECK'}\n"
             f"19:73 leaking in after the cut (110.3-112.5 s): correlation {c73:+.3f} (should be near 0): {'NO' if c73 < 0.3 else 'CHECK'}\n"
             f"quietest 50 ms window {rms.min():.1f} dBFS; silences over 0.5 s (< -55 dBFS): {long_sil or 'none'} (the very end fades out)")
# text
bad = []
for p in timing["phrases"]:
    vv = int(p["verse"].split(":")[1]); d = json.loads((VDIR / "quran" / f"19_{vv}.json").read_text(encoding="utf-8"))["verse"]
    en = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
    if p["ar"] not in d["text_uthmani"] or p["en"] not in en: bad.append(p["i"])
lines.append(f"## text\n{len(timing['phrases'])} captions, range {timing['range']}; not matching the saved API text: {bad or 'none'}")
# the 45-degree rule (a 1-frame still render logs the pitch report)
env2 = {**os.environ, "TEMP": str(HERE.parent / ".remotion-tmp"), "TMP": str(HERE.parent / ".remotion-tmp")}
(OUT / "pitch.json").write_text(json.dumps({"samples": [0], "post": {"pitchReport": True}}), encoding="utf-8")
pr = subprocess.run(["npx", "remotion", "render", "src/index.ts", "TheSiratSamples", str(OUT / "pitch"), "--sequence", "--image-format=jpeg", "--frames=0-0", "--scale=0.25", f"--props={OUT / 'pitch.json'}", "--log=verbose"],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True, cwd=HERE.parent, env=env2)
pl = re.findall(r"PITCH REPORT: [^\x1b\n]*", pr.stdout + pr.stderr)
lines.append("## 45-degree rule\n" + (pl[0] if pl else "pitch report not found"))
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
