"""Quality check of video 002 "The Last Request" before upload.
  1. short_qa.py on the upload file: specs, black / white / frozen frames (the planned dark: the room going black at the
     end of the voice part, the fade into the end card), sudden jumps
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
meta = {"shots": shots, "planned": [[F(e), F(e) + 8] for e in story["events"]["lightning"]] + [[F(timing["cardFrom"]) - 30, FRAMES]],
        "intended_dark": [[F(story["events"]["lightOut"]), F(timing["recStart"]) + 8], [F(timing["cardFrom"]) - 30, FRAMES]]}
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
bad = []
for p in timing["phrases"]:
    vv = int(p["verse"].split(":")[1]); d = json.loads((VDIR / "quran" / f"63_{vv}.json").read_text(encoding="utf-8"))["verse"]
    en = re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])
    if p["ar"] not in d["text_uthmani"] or p["en"] not in en: bad.append(p["i"])
lines.append(f"## text\n{len(timing['phrases'])} captions, range {timing['range']}; not matching the saved API text: {bad or 'none'}")
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8"); print("\n\n".join(lines))
