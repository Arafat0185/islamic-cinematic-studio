"""Narration for a video, read straight from its script.md, with Kokoro TTS (local).

Only the narration lines are spoken (lines starting with "> " under each "### N. Title" section). Wherever the script
has the sign ﷺ, the voice says "sallallahu alayhi wa sallam". One file per section (voice/secN.wav) and the
combined voice/voice.wav with a short natural pause between sections; voice/sections.json lists every section's
spoken text and its start/end in voice.wav.

Run from engine/:  .venv-tts/Scripts/python tools/narrate.py ../videos/001-the-first-question
Voice: bm_lewis at speed 0.9, pitch lowered 1 semitone (no reverb).
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline
from pedalboard import Pedalboard, PitchShift

VOICE, SPEED, SEMITONES = "bm_lewis", 0.9, -1
SR = 24000
PAUSE = 0.85  # seconds of silence between sections
SALAWAT_SIGN, SALAWAT_SPOKEN = "ﷺ", "sallallahu alayhi wa sallam"


def read_sections(script: Path):
    """[(number, title, [display lines])] for every section that has narration"""
    out, cur = [], None
    for line in script.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^###\s+(\d+)\.\s+(.*?)\s+·", line)
        if m:
            cur = (int(m.group(1)), m.group(2), [])
            out.append(cur)
        elif line.startswith("> ") and cur is not None:
            cur[2].append(line[2:].strip())
    return [s for s in out if s[2]]


def spoken(text: str) -> str:
    """what the voice says: the salawat in full, typographic quotes dropped"""
    t = text.replace(SALAWAT_SIGN, SALAWAT_SPOKEN)
    return t.replace("“", "").replace("”", "").replace('"', "")


def main(video_dir: Path) -> None:
    out = video_dir / "voice"
    out.mkdir(parents=True, exist_ok=True)
    pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    pitch = Pedalboard([PitchShift(semitones=SEMITONES)])
    pieces, meta, t = [], [], 0.0
    for num, title, lines in read_sections(video_dir / "script.md"):
        text = " ".join(lines)
        audio = np.concatenate([np.asarray(a, dtype=np.float32) for _, _, a in pipe(spoken(text), voice=VOICE, speed=SPEED)])
        audio = pitch(audio[np.newaxis, :], SR)[0].astype(np.float32)
        sf.write(out / f"sec{num}.wav", audio, SR, subtype="PCM_16")
        if pieces:
            pieces.append(np.zeros(int(PAUSE * SR), np.float32)); t += PAUSE
        meta.append({"section": num, "title": title, "lines": lines, "spoken": spoken(text), "start": round(t, 3), "end": round(t + len(audio) / SR, 3)})
        pieces.append(audio); t += len(audio) / SR
        print(f"section {num} ({title}): {len(audio) / SR:.1f} s")
    voice = np.concatenate(pieces)
    sf.write(out / "voice.wav", voice, SR, subtype="PCM_16")
    (out / "sections.json").write_text(json.dumps({"voice": VOICE, "speed": SPEED, "semitones": SEMITONES, "sampleRate": SR,
                                                   "duration": round(len(voice) / SR, 3), "sections": meta}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"voice.wav: {len(voice) / SR:.1f} s")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
