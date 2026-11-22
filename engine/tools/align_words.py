"""Word-level timing for a narration: words.json from voice/voice.wav with local Whisper, checked against the script.

Whisper's own transcript is only used for TIMING. The words written to words.json are always the script's words
(display form: ﷺ stays one sign, quotes and punctuation kept), matched to Whisper's words by sequence alignment;
anything Whisper heard differently is listed as a correction, and words it missed get times interpolated from their
neighbours. Each entry: {section, word, start, end} in seconds of voice.wav.

Run from engine/:  .venv-tts/Scripts/python tools/align_words.py ../videos/001-the-first-question
"""
import difflib
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import whisper
from scipy.signal import resample_poly

SALAWAT_SIGN, SALAWAT_SPOKEN = "ﷺ", ["sallallahu", "alayhi", "wa", "sallam"]
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def main(video_dir: Path) -> None:
    vdir = video_dir / "voice"
    meta = json.loads((vdir / "sections.json").read_text(encoding="utf-8"))
    audio, sr = sf.read(vdir / "voice.wav", dtype="float32")
    a16 = resample_poly(audio, 2, 3).astype(np.float32) if sr == 24000 else audio  # Whisper wants 16 kHz
    model = whisper.load_model("small.en")
    res = model.transcribe(a16, language="en", word_timestamps=True, condition_on_previous_text=False,
                           initial_prompt="Sallallahu alayhi wa sallam. Salat. Resurrection.")
    heard = [{"w": w["word"].strip(), "s": w["start"], "e": w["end"]} for seg in res["segments"] for w in seg["words"]]

    # the script's words: display tokens, each expanded into the words the voice actually says
    display, spoken = [], []  # display: (section, token); spoken: (display index, normalised word)
    for sec in meta["sections"]:
        for tok in " ".join(sec["lines"]).split():
            i = len(display)
            display.append((sec["section"], tok))
            parts = SALAWAT_SPOKEN if tok == SALAWAT_SIGN else [norm(tok)]
            for p in parts:
                if p: spoken.append((i, p))

    a, b = [p for _, p in spoken], [norm(h["w"]) for h in heard]
    times: list = [None] * len(spoken)
    fixes = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            for k in range(i2 - i1): times[i1 + k] = (heard[j1 + k]["s"], heard[j1 + k]["e"])
        elif op == "replace" and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["s"], heard[j1 + k]["e"])
                fixes.append(f"heard '{heard[j1 + k]['w']}' -> script '{a[i1 + k]}' ({heard[j1 + k]['s']:.2f} s)")
        elif op in ("replace", "delete"):
            if j2 > j1:  # several script words over several heard words: share the heard span evenly
                s0, e0 = heard[j1]["s"], heard[j2 - 1]["e"]
                for k in range(i2 - i1): times[i1 + k] = (s0 + (e0 - s0) * k / (i2 - i1), s0 + (e0 - s0) * (k + 1) / (i2 - i1))
                fixes.append(f"heard '{' '.join(h['w'] for h in heard[j1:j2])}' -> script '{' '.join(a[i1:i2])}'")
            else:
                fixes.append(f"missed by Whisper: '{' '.join(a[i1:i2])}' (timed from neighbours)")
        elif op == "insert":
            fixes.append(f"extra in Whisper (ignored): '{' '.join(h['w'] for h in heard[j1:j2])}'")
    # fill gaps by interpolation between known neighbours
    for k in range(len(times)):
        if times[k] is None:
            p = next((times[j] for j in range(k - 1, -1, -1) if times[j]), (0.0, 0.0))
            n = next((times[j] for j in range(k + 1, len(times)) if times[j]), (p[1] + 0.3, p[1] + 0.6))
            times[k] = (p[1], max(p[1] + 0.05, n[0]))

    words = []
    for i, (sec, tok) in enumerate(display):
        ts = [times[k] for k, (d, _) in enumerate(spoken) if d == i]
        if not ts:  # a token with no spoken word (e.g. a lone dash): glue to the previous word
            ts = [(words[-1]["end"], words[-1]["end"])] if words else [(0.0, 0.0)]
        words.append({"section": sec, "word": tok, "start": round(min(t[0] for t in ts), 3), "end": round(max(t[1] for t in ts), 3)})
    (video_dir / "words.json").write_text(json.dumps({"source": "voice/voice.wav", "whisper": "small.en", "words": words}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(words)} script words timed; Whisper heard {len(heard)} words")
    print("Whisper transcript:", res["text"].strip())
    print("corrections:" if fixes else "corrections: none"); [print("  " + f) for f in fixes]


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
