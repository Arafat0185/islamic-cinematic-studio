"""Narrator voice samples with Kokoro TTS (hexgrad/Kokoro-82M, Apache 2.0), run locally on the CPU.

For each voice: <voice>_normal.wav (speed 0.9) and <voice>_deep.wav (the same, pitch lowered 2 semitones with a
little warm reverb). Output: engine/out/voices/ (ignored by git).

Run from engine/:  .venv-tts/Scripts/python tools/voice_samples.py
The first run downloads the model (~330 MB) and voices from Hugging Face into the user cache.
"""
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline
from pedalboard import Pedalboard, PitchShift, Reverb, LowShelfFilter, HighShelfFilter

LINE = ("Before your money. Before your job. Before your followers. "
        "There is one thing you will be asked about first.")
VOICES = ["bm_george", "bm_lewis", "bm_daniel", "bm_fable", "am_adam", "am_michael"]
SPEED = 0.9
SR = 24000  # Kokoro's sample rate
OUT = Path(__file__).resolve().parent.parent / "out" / "voices"

# deep: -2 semitones (formant-preserving shift keeps the speed), a touch of low warmth, softened highs, small warm room
DEEP = Pedalboard([
    PitchShift(semitones=-2),
    LowShelfFilter(cutoff_frequency_hz=220, gain_db=2.0),
    HighShelfFilter(cutoff_frequency_hz=7000, gain_db=-2.0),
    Reverb(room_size=0.28, damping=0.6, wet_level=0.14, dry_level=0.9, width=0.8),
])


def speak(pipes: dict, voice: str) -> np.ndarray:
    lang = "b" if voice.startswith("b") else "a"  # British / American English
    pipe = pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M"))
    parts = [np.asarray(audio, dtype=np.float32) for _, _, audio in pipe(LINE, voice=voice, speed=SPEED)]
    return np.concatenate(parts)


def finish(x: np.ndarray, lead=0.25, tail=0.6) -> np.ndarray:
    """short silence before, room for the reverb after, peak-normalise to -1 dBFS"""
    x = np.concatenate([np.zeros(int(lead * SR), np.float32), x, np.zeros(int(tail * SR), np.float32)])
    return (x * (10 ** (-1 / 20) / max(1e-9, float(np.max(np.abs(x)))))).astype(np.float32)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pipes: dict = {}
    for v in VOICES:
        dry = finish(speak(pipes, v))
        sf.write(OUT / f"{v}_normal.wav", dry, SR, subtype="PCM_16")
        deep = finish(DEEP(dry[np.newaxis, :], SR)[0])
        sf.write(OUT / f"{v}_deep.wav", deep, SR, subtype="PCM_16")
        print(f"{v}: {len(dry) / SR:.1f} s")


if __name__ == "__main__":
    main()
