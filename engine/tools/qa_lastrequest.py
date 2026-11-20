"""Quality check of video 002 "The Last Request" before upload.
  1. short_qa.py on the upload file: specs, black / white / frozen frames (the planned dark: the fade into the end card), sudden jumps
  2. both files: the same frame count (timing.json length) and the same picture
  3. the audio: the recitation at about -14 LUFS, the ambience under the voice part about -24 LUFS, and NO guide voice in
     the upload file (its envelope does not follow the guide; the preview's does)
  4. the text: every caption is an exact slice of the saved quran.com responses (63:10-11)
Run from engine/:  .venv-tts/Scripts/python tools/qa_lastrequest.py out/The_Last_Request.mp4 out/The_Last_Request_PREVIEW.mp4 out/qa_lastrequest
"""
import hashlib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
import pyloudnorm as pyln

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "002-the-last-request"
UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
timing = json.loads((VDIR / "timing.json").read_text(encoding="utf-8")); story = json.loads((VDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS); FRAMES = F(timing["length"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
lines = []
starts = [F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": starts[i + 1] if i + 1 < len(starts) else FRAMES} for i, a in enumerate(starts)]
ev = story["events"]
trans = [(F(t0), k) for t0, k in ev.get("transitions", [])]
# planned: the lightning, the eerie transitions (blinks, smears, the heartbeat cut, dissolves), his collapse, the phone
# dropping and lighting up on the mat, the end card; intended dark: the cut to black, the closed eyelids, the smears
mat = next(s2 for s2 in story["shots"] if s2["kind"] in ("matPhone", "phoneMat"))["at"]
planned = [[F(e) - 2, F(e) + 10] for e in ev["lightning"]] + [[f0 - 12, f0 + 12] for f0, _ in trans] + [[F(timing["cardFrom"]) - 30, FRAMES]]
planned += [[F(ev[k]) - 6, F(ev[k]) + 18] for k in ("collapseBed", "phoneDrop", "fall", "flat") if k in ev]
planned += [[F(mat + d) - 2, F(mat + d) + 6] for d in (0.15, 0.95, 1.7, 2.6, 3.4, 4.2)]
dark = [[F(timing["cardFrom"]) - 30, FRAMES], [F(mat), F(mat) + 8]]
dark += [[f0 - 10, f0 + 10] for f0, k in trans if k in ("blink", "smear", "cut", "blinkOpen")]
meta = {"shots": shots, "planned": planned, "intended_dark": dark}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(UP), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## frames (upload file)\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])
def probe(f):
    o = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return int(o.strip().split(",")[0])
def vhash(f): return hashlib.md5(subprocess.run([FF, "-v", "error", "-i", str(f), "-map", "0:v", "-c", "copy", "-f", "h264", "-"], capture_output=True).stdout).hexdigest()
nu, npv = probe(UP), probe(PV)
lines.append(f"## files\nupload {nu} frames, preview {npv} frames, expected {FRAMES} ({FRAMES / FPS:.3f} s): {'OK' if nu == npv == FRAMES else 'MISMATCH'}; same picture: {vhash(UP) == vhash(PV)}")
def pcm(src, sr=48000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
u, pv = pcm(UP), pcm(PV); g = pcm(HERE.parent / "public/audio/guide/alborz_guide.mp4")
m = pyln.Meter(48000); a, b = int(timing["recStart"] * 48000), int(timing["recEnd"] * 48000); v = int(timing["voiceEnd"] * 48000)
env = lambda x: np.convolve(np.abs(x[:v].mean(axis=1)), np.ones(4800) / 4800, mode="valid")[::480]
n = min(len(env(u)), len(env(g)), len(env(pv)))
cu, cp = float(np.corrcoef(env(u)[:n], env(g)[:n])[0, 1]), float(np.corrcoef(env(pv)[:n], env(g)[:n])[0, 1])
lines.append(f"## audio\nrecitation span {m.integrated_loudness(u[a:b]):.1f} LUFS (target -14); ambience under the voice part {m.integrated_loudness(u[:v]):.1f} LUFS (target ~-24); peak {20 * np.log10(np.abs(u).max()):.1f} dBFS\n"
             f"envelope correlation with the guide voice (0-{timing['voiceEnd']} s): upload {cu:+.3f} (should be low), preview {cp:+.3f} (should be high): guide voice in the upload file: {'NO' if cu < 0.3 and cp > 0.6 else 'CHECK'} (negative = the rain dips under the voice, the voice itself is absent)")
# no black stretch longer than 0.3 s anywhere (mean brightness under 4 %), and no silence longer than 0.5 s
lum = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(UP), "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout, np.uint8).reshape(-1, 96 * 54).mean(1) / 255
runs, cur = [], None
for i, x in enumerate(lum < 0.04):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: runs.append(cur); cur = None
if cur: runs.append(cur)
long_black = [(round(a0 / FPS, 2), round((b0 - a0 + 1) / FPS, 2)) for a0, b0 in runs if b0 - a0 + 1 > 0.3 * FPS]
w = int(0.05 * 48000); mono = u.mean(axis=1); rms = 20 * np.log10(np.sqrt(np.array([np.mean(mono[i:i + w] ** 2) for i in range(0, len(mono) - w, w)])) + 1e-9)
sil, cur = [], None
for i, x in enumerate(rms < -55):
    if x: cur = [cur[0], i] if cur else [i, i]
    elif cur: sil.append(cur); cur = None
if cur: sil.append(cur)
long_sil = [(round(a0 * 0.05, 2), round((b0 - a0 + 1) * 0.05, 2)) for a0, b0 in sil if (b0 - a0 + 1) * 0.05 > 0.5]
lines.append(f"## black and silence\nblack stretches over 0.3 s: {long_black or 'none'}; quietest 50 ms window {rms.min():.1f} dBFS; silences over 0.5 s (< -55 dBFS): {long_sil or 'none'}")
bad = []
for p in timing["phrases"]:
    vv = int(p["verse"].split(":")[1]); d = json.loads((VDIR / "quran" / f"63_{vv}.json").read_text(encoding="utf-8"))["verse"]
    en = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
    if p["ar"] not in d["text_uthmani"] or p["en"] not in en: bad.append(p["i"])
lines.append(f"## text\n{len(timing['phrases'])} captions, range {timing['range']}; not matching the saved API text: {bad or 'none'}")
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
