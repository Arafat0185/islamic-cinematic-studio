"""Quality check of the final video 001 before upload.
  1. short_qa.py: specs, loudness, black / white / frozen frames, pops, per-shot stats, contact sheets (2 s and 1 per s);
     the intended dark spans (the black silence after the shatter, the snuffed lamp after "lost") are passed to it
  2. captions vs audio: the finished file's audio is transcribed with local Whisper and matched word by word to the
     caption words (the plan's words); each word's caption time must be within 0.25 s of when it is heard
  3. the hadith: the on-screen quote (plan words) == script.md == references.yaml quoted_exactly; the source tag text
  4. no "draft" / "not yet reviewed" labels in the final scene's code
Run from engine/:  .venv-tts/Scripts/python tools/qa_final001.py out/The_First_Question_FINAL.mp4 out/qa_final001
"""
import difflib, json, re, subprocess, sys, os
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
VID, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
VDIR = HERE.parent.parent / "videos" / "001-the-first-question"
plan = json.loads((VDIR / "final" / "plan.json").read_text(encoding="utf-8"))
A, F = plan["anchors"], (lambda s: round(s * plan["fps"]))
OUT.mkdir(parents=True, exist_ok=True)
lines = []

# 1. frames and loudness
meta = {"shots": [{"id": i, "a": F(s["from"]), "b": F(s["to"])} for i, s in enumerate(plan["shots"])],
        "planned": [[F(t["at"]) - 6, F(t["at"]) + 14] for t in plan["transitions"]],
        "intended_dark": [[F(A["first"]), F(A["slam"]) + 2], [F(A["lost"]), F(A["mercy"]) + 2]]}
(OUT / "shots.json").write_text(json.dumps(meta), encoding="utf-8")
r = subprocess.run([sys.executable, str(HERE / "short_qa.py"), str(VID), str(OUT), str(OUT / "shots.json")], capture_output=True, text=True, encoding="utf-8", errors="replace")
lines.append("## short_qa\n" + (r.stdout or r.stderr).split("\nPER SHOT")[0])

# 2. captions vs audio (Whisper on the final mix)
import whisper, soundfile as sf
from scipy.signal import resample_poly
wav = OUT / "audio16k.wav"
subprocess.run([str(HERE.parent / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"), "-v", "error", "-y", "-i", str(VID), "-ac", "1", "-ar", "16000", str(wav)], check=True)
a, _ = sf.read(wav, dtype="float32")
res = whisper.load_model("small.en").transcribe(a, language="en", word_timestamps=True, condition_on_previous_text=False,
                                                 initial_prompt="Sallallahu alayhi wa sallam. Salat. Resurrection. Allah.")
heard = [(w["word"].strip(), w["start"]) for s in res["segments"] for w in s["words"]]
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
cap = []
for w in plan["words"]:
    for p in (["sallallahu", "alayhi", "wa", "sallam"] if w["word"] == "ﷺ" else [norm(w["word"])]):
        if p: cap.append((p, w["start"]))
sm = difflib.SequenceMatcher(a=[c[0] for c in cap], b=[norm(h[0]) for h in heard], autojunk=False)
matched, off, diffs = 0, [], []
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == "equal":
        for k in range(i2 - i1): matched += 1; off.append(heard[j1 + k][1] - cap[i1 + k][1])
    else: diffs.append(f"{op}: caption '{' '.join(c[0] for c in cap[i1:i2])}' / heard '{' '.join(h[0] for h in heard[j1:j2])}'")
off = np.array(off)
late = int((np.abs(off) > 0.25).sum())
lines.append(f"## captions vs audio\nwords in captions {len(cap)}, heard {len(heard)}, matched {matched}; timing offset median {np.median(off):+.3f} s, "
             f"max |offset| {np.abs(off).max():.3f} s, words off by > 0.25 s: {late}\nDIFFERENCES (Whisper vs captions): " + ("; ".join(diffs) if diffs else "none"))

# 3. the hadith
quote_plan = " ".join(w["word"] for w in plan["words"] if w["block"] == 6 and w["start"] >= A["indeed"] - 0.01).strip('"“”')
script = (VDIR / "script.md").read_text(encoding="utf-8")
refs = (VDIR / "references.yaml").read_text(encoding="utf-8")
q_script = re.search(r'"(Indeed the first deed[^"]+)"', script).group(1)
q_refs = " ".join(re.search(r"quoted_exactly: >-\n((?:\s{6}.*\n)+)", refs).group(1).split())
tag_ok = "JAMI' AT-TIRMIDHI 413 · SAHIH (DARUSSALAM)" in (HERE.parent / "src/scenes/final001/Overlay.tsx").read_text(encoding="utf-8")
lines.append(f"## hadith\non screen : {quote_plan}\nscript.md : {q_script}\nreferences: {q_refs}\nall identical: {quote_plan == q_script == q_refs}; source tag present: {tag_ok}")

# 4. labels
src = "".join(p.read_text(encoding="utf-8") for p in (HERE.parent / "src/scenes/final001").glob("*.ts*"))
bad = [w for w in ("DRAFT", "NOT YET REVIEWED") if w in src.upper().replace("DRAFT 3", "")]
lines.append(f"## labels\n'draft' / 'not yet reviewed' in the final scene's code: {bad or 'none'}")
(OUT / "qa.md").write_text("\n\n".join(lines) + "\n", encoding="utf-8")
print("\n\n".join(lines))
