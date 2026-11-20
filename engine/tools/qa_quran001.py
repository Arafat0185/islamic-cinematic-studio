"""Quality check of "The First Question - QURAN" (Maryam 19:59-63) before upload.
  1. short_qa.py on the upload file: specs, loudness, black / white / frozen frames, pops, per-shot stats, contact
     sheets (the star irises, the takbir's soft flash and the end card's crossfade are planned)
  2. both files: same frame count (the length in timing.json), same picture (the preview is a stream copy)
  3. the upload file: about -24 LUFS, and NO guide recitation in it (its audio does not correlate with the guide)
  4. the end: from 19:63's last sound to the last frame, the guide is inside the breath after 19:63 (room tone only), so no part of 19:64 is heard
  5. the text: every caption in timing.json is an exact slice of the saved quran.com responses; no 19:64-65 left in code
Run from engine/:  .venv-tts/Scripts/python tools/qa_quran001.py out/The_First_Question_QURAN.mp4 out/The_First_Question_QURAN_PREVIEW.mp4 out/qa_quran001
"""
import hashlib, json, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_quran_timing as B  # noqa: E402

UP, PV, OUT = (Path(a).resolve() for a in sys.argv[1:4])
OUT.mkdir(parents=True, exist_ok=True)
QDIR = B.QDIR
timing = json.loads((QDIR / "timing.json").read_text(encoding="utf-8"))
story = json.loads((QDIR / "shots.json").read_text(encoding="utf-8"))
FPS = timing["fps"]; F = lambda s: round(s * FPS)
FRAMES = F(timing["guide"]["recitationEnd"]); CARD = FRAMES - F(story["events"]["cardFadeSeconds"])
FF = str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")
lines = []

# 1. frames
froms = [F(timing["phrases"][s["phrase"]]["start"]) if "phrase" in s else F(s["at"]) for s in story["shots"]]
shots = [{"id": i, "a": a, "b": froms[i + 1] if i + 1 < len(froms) else FRAMES} for i, a in enumerate(froms)]
p = timing["phrases"]; tk = F(p[5]["voice"] + story["events"]["takbir"]["plus"])
meta = {"shots": shots, "planned": [[F(p[3]["start"]) - 7, F(p[3]["start"]) + 7], [F(p[4]["start"]) - 7, F(p[4]["start"]) + 7], [tk, tk + 12], [CARD, FRAMES]],
        "intended_dark": [[CARD, FRAMES]]}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(UP), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## frames (upload file)\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])

# 2. both files
def probe(f):
    o = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets",
                        "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return int(o.strip().split(",")[0])
def vhash(f):
    return hashlib.md5(subprocess.run([FF, "-v", "error", "-i", str(f), "-map", "0:v", "-c", "copy", "-f", "h264", "-"], capture_output=True).stdout).hexdigest()
nu, npv = probe(UP), probe(PV)
lines.append(f"## files\nupload {nu} frames, preview {npv} frames, expected {FRAMES} ({FRAMES / FPS:.3f} s): {'OK' if nu == npv == FRAMES else 'MISMATCH'}; "
             f"same picture: {vhash(UP) == vhash(PV)}")

# 3. the upload file's audio: loudness, and no guide recitation in it
def pcm(src, sr=8000, ss=None, t=None):
    a = ["ffmpeg", "-v", "error"] + (["-ss", str(ss)] if ss is not None else []) + ["-i", str(src)] + (["-t", str(t)] if t else []) + ["-map", "0:a", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(a, capture_output=True).stdout, dtype=np.float32)
e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(UP), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
I = [l.strip() for l in e[e.rfind("Summary:"):].splitlines() if l.strip().startswith(("I:", "Peak:"))]
u, g, pvw = pcm(UP), pcm(B.GUIDE), pcm(PV)
m = min(len(u), len(g), len(pvw))
env = lambda x: np.convolve(np.abs(x[:m]), np.ones(400) / 400, mode="valid")[::80]   # 10 ms loudness envelope
c_up = float(np.corrcoef(env(u), env(g))[0, 1]); c_pv = float(np.corrcoef(env(pvw), env(g))[0, 1])
lines.append(f"## upload audio\nloudness {' | '.join(I)}\nenvelope correlation with the guide recitation: upload {c_up:+.3f} (should be ~0), preview {c_pv:+.3f} (should be high)\n"
             f"guide recitation in the upload file: {'NO' if abs(c_up) < 0.2 and c_pv > 0.6 else 'CHECK'}")

# 4. the end: no 19:64
br = timing["guide"]["breath"]
dbs, _ = B.loudness()
end = timing["guide"]["recitationEnd"]
tail = dbs[int((br['voice6303End'] + 0.05) * 100): int(end * 100)]   # from just after 19:63's voice to the last frame
lines.append(f"## the end\n19:63 voice ends {br['voice6303End']} s, 19:64 starts {br['voice6401Start']} s, video ends {end:.3f} s "
             f"({br['voice6401Start'] - end:.2f} s before 19:64). Guide loudness from 19:63's end + 0.05 s to the video's end: max {tail.max():.1f} dB "
             f"(breath floor {br['floorDb']} dB, voice ~{np.median(dbs):.1f} dB): {'breath only' if tail.max() < br['floorDb'] + 6 else 'CHECK'}")

# 5. the text
verses = B.load_verses(); B.check_text(verses)
bad = []
for q in timing["phrases"]:
    v = int(q["verse"].split(":")[1]); src = next(x for x in B.PHRASES if x[0] == v and x[3] == q["en"])
    if q["ar"] != " ".join(verses[v]["ar"].split(" ")[src[1]:src[2] + 1]) or q["en"] not in verses[v]["en"]: bad.append(q["i"])
code = "".join(f.read_text(encoding="utf-8") for f in (HERE.parent / "src/scenes/quran001").glob("*.ts*"))
left = (["59-65 in code"] if "59-65" in code else []) + [q["verse"] for q in timing["phrases"] if q["verse"] in ("19:64", "19:65")]
lines.append(f"## text\n{len(timing['phrases'])} captions, verses {sorted(verses)}; captions not matching the saved API text: {bad or 'none'}; "
             f"range {timing['range']}; 19:64-65 left in code / timing: {left or 'none'}")
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8")
print("\n\n".join(lines))
