"""Narration in BLOCKS: every group of sentences that plays together in the film is spoken by Kokoro as ONE continuous
pass (bm_lewis, speed 0.9, -1 semitone), so nothing is ever cut inside or between its words: the natural pauses and
breaths between its sentences are Kokoro's own. Each block is then timed word by word with local Whisper (small.en),
matched to the script's own words (the script's spelling wins), and written with 30 ms fades at both ends.

Blocks come straight from script.md: a block is a list of (section, sentence index within the section). The sign ﷺ is
spoken as "sallallahu alayhi wa sallam".

Output: voice/blocks/<name>.wav and voice/blocks.json ({name: {text, duration, words: [{section, word, start, end}]}})
Run from engine/:  .venv-tts/Scripts/python tools/narrate_blocks.py ../videos/001-the-first-question
"""
import difflib
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import whisper
from kokoro import KPipeline
from pedalboard import Pedalboard, PitchShift
from scipy.signal import resample_poly

VOICE, SPEED, SEMITONES, SR = "bm_lewis", 0.9, -1, 24000
SALAWAT_SIGN, SALAWAT_SPOKEN = "ﷺ", "sallallahu alayhi wa sallam"
FADE = 0.03
# block name -> [(section, sentence number within that section)]
BLOCKS = {
    "money_job": [(2, 0), (2, 1)],                   # office
    "followers": [(2, 2)],                           # street, Asr
    "hook": [(2, 3)],                                # night: There is one thing ... first.
    "chasing": [(3, 0), (3, 1), (3, 2), (3, 3)],     # flashbacks: We spend our days ... Plans for next year.
    "hadith": [(4, 0), (4, 1)],                      # But the Prophet ... first: "Indeed the first deed ..."
    "weight": [(5, 0)],                              # He ... succeeded, ... lost.
    "mercy": [(6, 0), (6, 1), (6, 2), (6, 3)],       # But then comes the mercy. ... completed.
    "turn": [(7, 0), (7, 1), (7, 2)],                # So the question ... closer than you think.
}
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def script_sentences(script: Path):
    """{section: [sentence text, ...]} from the narration lines (lines starting with '> '): each section's lines are
    joined first, then split at sentence ends (. ? ! or : optionally followed by a closing quote)"""
    raw, cur = {}, None
    for line in script.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^###\s+(\d+)\.", line)
        if m: cur = int(m.group(1)); continue
        if line.startswith("> ") and cur is not None: raw[cur] = (raw.get(cur, "") + " " + line[2:].strip()).strip()
    return {k: [m.group(0).strip() for m in re.finditer(r'.+?[.?!:]["”]?(?=\s|$)', v)] for k, v in raw.items()}


def spoken(text: str) -> str:
    return text.replace(SALAWAT_SIGN, SALAWAT_SPOKEN).replace("“", "").replace("”", "").replace('"', "")


def align(audio16, display, model):
    """word times for the display tokens [(section, token)] from Whisper's words (the script's words win)"""
    res = model.transcribe(audio16, language="en", word_timestamps=True, condition_on_previous_text=False,
                           initial_prompt="Sallallahu alayhi wa sallam. Salat. Resurrection.")
    heard = [{"w": w["word"].strip(), "s": w["start"], "e": w["end"]} for seg in res["segments"] for w in seg["words"]]
    spoken_w = []
    for i, (_, tok) in enumerate(display):
        for p in (SALAWAT_SPOKEN.split() if tok == SALAWAT_SIGN else [norm(tok)]):
            if p: spoken_w.append((i, p))
    a, b = [p for _, p in spoken_w], [norm(h["w"]) for h in heard]
    times, fixes = [None] * len(spoken_w), []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["s"], heard[j1 + k]["e"])
                if op == "replace": fixes.append(f"heard '{heard[j1 + k]['w']}' -> '{a[i1 + k]}'")
        elif op == "replace" and j2 > j1:
            s0, e0 = heard[j1]["s"], heard[j2 - 1]["e"]
            for k in range(i2 - i1): times[i1 + k] = (s0 + (e0 - s0) * k / (i2 - i1), s0 + (e0 - s0) * (k + 1) / (i2 - i1))
            fixes.append(f"heard '{' '.join(h['w'] for h in heard[j1:j2])}' -> '{' '.join(a[i1:i2])}'")
        elif op == "delete": fixes.append(f"missed: '{' '.join(a[i1:i2])}'")
    for k in range(len(times)):
        if times[k] is None:
            p = next((times[j] for j in range(k - 1, -1, -1) if times[j]), (0.0, 0.0))
            n = next((times[j] for j in range(k + 1, len(times)) if times[j]), (p[1] + 0.3, p[1] + 0.6))
            times[k] = (p[1], max(p[1] + 0.05, n[0]))
    words = []
    for i, (sec, tok) in enumerate(display):
        ts = [times[k] for k, (d, _) in enumerate(spoken_w) if d == i] or [(words[-1]["end"], words[-1]["end"])]
        words.append({"section": sec, "word": tok, "start": round(min(t[0] for t in ts), 3), "end": round(max(t[1] for t in ts), 3)})
    return words, fixes, res["text"].strip()


def main(video_dir: Path) -> None:
    sents = script_sentences(video_dir / "script.md")
    out = video_dir / "voice" / "blocks"; out.mkdir(parents=True, exist_ok=True)
    pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    pitch = Pedalboard([PitchShift(semitones=SEMITONES)])
    model = whisper.load_model("small.en")
    meta = {}
    for name, refs in BLOCKS.items():
        texts = [sents[s][i] for s, i in refs]
        # one continuous pass for the whole block (Kokoro splits only at newlines; there are none)
        audio = np.concatenate([np.asarray(a, dtype=np.float32) for _, _, a in pipe(spoken(" ".join(texts)), voice=VOICE, speed=SPEED, split_pattern=None)])
        audio = pitch(audio[np.newaxis, :], SR)[0].astype(np.float32)
        f = int(FADE * SR)
        audio[:f] *= np.linspace(0, 1, f); audio[-f:] *= np.linspace(1, 0, f)
        sf.write(out / f"{name}.wav", audio, SR, subtype="PCM_16")
        display = [(s, tok) for (s, i), txt in zip(refs, texts) for tok in txt.split()]
        words, fixes, heard = align(resample_poly(audio, 2, 3).astype(np.float32), display, model)
        meta[name] = {"text": " ".join(texts), "duration": round(len(audio) / SR, 3), "words": words}
        print(f"{name}: {len(audio) / SR:.2f} s; whisper: {heard}")
        for x in fixes: print("   fix:", x)
    (video_dir / "voice" / "blocks.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
