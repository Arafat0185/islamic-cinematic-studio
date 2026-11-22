"""Narration for the final version of a video: each script section (paragraph) is spoken by Kokoro as ONE continuous pass
(am_adam, speed 1.15, pitched down 2 semitones: "deep"), so nothing is ever cut inside a word.

Then only the SILENT gaps between phrases are tightened to ~0.13 s: a gap is cut only where the signal is below -50 dB
of the block's peak for more than 0.2 s, keeping a margin of 80 ms after the last sound and 80 ms before the next one,
joined with a 30 ms equal-power crossfade. Every block gets 30 ms fades at both ends.

Each block is then timed word by word with local Whisper (small.en), matched to the script's own words (the script's
spelling wins; the sign ﷺ is spoken as "sallallahu alayhi wa sallam" and shown as ﷺ).

Output: voice/final/<n>.wav and voice/final.json ({n: {section, text, duration, words: [{word, start, end}]}})
Run from engine/:  .venv-tts/Scripts/python tools/narrate_final.py ../videos/001-the-first-question
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

VOICE, LANG, SPEED, SEMITONES, SR = "am_adam", "a", 1.15, -2, 24000
SALAWAT_SIGN, SALAWAT_SPOKEN = "ﷺ", "sallallahu alayhi wa sallam"
FADE, XF, MARGIN, MIN_GAP, SIL_DB = 0.03, 0.03, 0.08, 0.2, -50
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def script_sections(script: Path):
    """{section number: narration text} from the lines starting with '> ' under each '### n.' heading"""
    raw, cur = {}, None
    for line in script.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^###\s+(\d+)\.", line)
        if m: cur = int(m.group(1)); continue
        if line.startswith("> ") and cur is not None: raw[cur] = (raw.get(cur, "") + " " + line[2:].strip()).strip()
    return raw


def spoken(text: str) -> str:
    return text.replace(SALAWAT_SIGN, SALAWAT_SPOKEN).replace("“", "").replace("”", "").replace('"', "")


def tighten(a: np.ndarray):
    """shorten silent gaps longer than MIN_GAP to 2*MARGIN - XF; returns the audio and the list of (kept_at, removed_s)"""
    env = np.sqrt(np.convolve(a ** 2, np.ones(240) / 240, "same"))
    loud = env > np.max(env) * 10 ** (SIL_DB / 20)
    idx = np.flatnonzero(loud)
    if len(idx) == 0: return a, []
    out, cuts, pos = [], [], 0
    m, x = int(MARGIN * SR), int(XF * SR)
    edges = np.flatnonzero(np.diff(loud.astype(np.int8)))  # transitions
    # silent runs between sound: (end of sound, start of next sound)
    runs = []
    for i in range(len(edges) - 1):
        s, e = edges[i] + 1, edges[i + 1] + 1
        if not loud[s] and e - s > MIN_GAP * SR and s > idx[0] and e <= idx[-1]: runs.append((s, e))
    w = np.sqrt(np.linspace(0, 1, x)).astype(np.float32)
    for s, e in runs:
        keep_to, resume = s + m, e - m          # keep MARGIN after the sound, resume MARGIN before the next sound
        head = a[pos:keep_to + x].copy()
        tail_start = resume
        head[-x:] = head[-x:] * w[::-1] + a[tail_start:tail_start + x] * w
        out.append(head)
        cuts.append((sum(len(o) for o in out) / SR, (resume - keep_to) / SR))
        pos = tail_start + x
    out.append(a[pos:])
    return np.concatenate(out).astype(np.float32), cuts


def align(audio16, tokens, model):
    """word times for the script tokens from Whisper's words (the script's words win)"""
    res = model.transcribe(audio16, language="en", word_timestamps=True, condition_on_previous_text=False,
                           initial_prompt="Sallallahu alayhi wa sallam. Salat. Resurrection. Allah.")
    heard = [{"w": w["word"].strip(), "s": w["start"], "e": w["end"]} for seg in res["segments"] for w in seg["words"]]
    sp = [(i, p) for i, tok in enumerate(tokens) for p in (SALAWAT_SPOKEN.split() if tok == SALAWAT_SIGN else [norm(tok)]) if p]
    a, b = [p for _, p in sp], [norm(h["w"]) for h in heard]
    times, notes = [None] * len(sp), []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["s"], heard[j1 + k]["e"])
                if op == "replace": notes.append(f"heard '{heard[j1 + k]['w']}' for '{a[i1 + k]}'")
        elif op == "replace" and j2 > j1:
            s0, e0 = heard[j1]["s"], heard[j2 - 1]["e"]
            for k in range(i2 - i1): times[i1 + k] = (s0 + (e0 - s0) * k / (i2 - i1), s0 + (e0 - s0) * (k + 1) / (i2 - i1))
            notes.append(f"heard '{' '.join(h['w'] for h in heard[j1:j2])}' for '{' '.join(a[i1:i2])}'")
        elif op == "delete": notes.append(f"NOT HEARD: '{' '.join(a[i1:i2])}'")
        elif op == "insert": notes.append(f"EXTRA heard: '{' '.join(h['w'] for h in heard[j1:j2])}'")
    for k in range(len(times)):
        if times[k] is None:
            p = next((times[j] for j in range(k - 1, -1, -1) if times[j]), (0.0, 0.0))
            n = next((times[j] for j in range(k + 1, len(times)) if times[j]), (p[1] + 0.3, p[1] + 0.6))
            times[k] = (p[1], max(p[1] + 0.05, n[0]))
    words = []
    for i, tok in enumerate(tokens):
        ts = [times[k] for k, (d, _) in enumerate(sp) if d == i] or [(words[-1]["end"], words[-1]["end"])]
        words.append({"word": tok, "start": round(min(t[0] for t in ts), 3), "end": round(max(t[1] for t in ts), 3)})
    return words, notes, res["text"].strip()


def main(video_dir: Path) -> None:
    secs = script_sections(video_dir / "script.md")
    out = video_dir / "voice" / "final"; out.mkdir(parents=True, exist_ok=True)
    pipe = KPipeline(lang_code=LANG, repo_id="hexgrad/Kokoro-82M")
    pitch = Pedalboard([PitchShift(semitones=SEMITONES)])
    model = whisper.load_model("small.en")
    meta, problems = {}, 0
    for n, text in sorted(secs.items()):
        audio = np.concatenate([np.asarray(a, dtype=np.float32) for _, _, a in pipe(spoken(text), voice=VOICE, speed=SPEED, split_pattern=None)])
        audio = pitch(audio[np.newaxis, :], SR)[0].astype(np.float32)
        raw_len = len(audio) / SR
        audio, cuts = tighten(audio)
        f = int(FADE * SR)
        audio[:f] *= np.linspace(0, 1, f); audio[-f:] *= np.linspace(1, 0, f)
        sf.write(out / f"{n:02d}.wav", audio, SR, subtype="PCM_24")
        tokens = text.split()
        words, notes, heard = align(resample_poly(audio, 2, 3).astype(np.float32), tokens, model)
        meta[str(n)] = {"section": n, "text": text, "duration": round(len(audio) / SR, 3), "words": words}
        print(f"[{n}] {raw_len:.2f} s -> {len(audio) / SR:.2f} s ({len(cuts)} gaps tightened, {sum(c[1] for c in cuts):.2f} s removed)")
        print(f"     whisper: {heard}")
        for x in notes:
            print("     note:", x)
            problems += x.startswith(("NOT HEARD", "EXTRA"))
    (video_dir / "voice" / "final.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")
    total = sum(m["duration"] for m in meta.values())
    print(f"total voice {total:.1f} s; words {sum(len(m['words']) for m in meta.values())}; problems {problems}")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
