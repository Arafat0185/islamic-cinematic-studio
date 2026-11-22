"""Timing sheet for "The First Question - QURAN" (Maryam 19:59-63, recited by Sheikh Yasser Al-Dossari).

The video ENDS in the breath between 19:63 and 19:64 (see END below), so when TikTok cuts its sound at the end of
the video, no part of 19:64 is heard.

The Quran text is NEVER typed here. Arabic and English come from the raw quran.com API responses saved in
videos/001-the-first-question/quran/19_<n>.json (text_uthmani + translation 20 = Saheeh International):
  - an Arabic phrase is a range of the verse's words (split on spaces), so it is an exact slice of the API text
  - an English chunk is written out below, but the script FAILS unless the chunks of a verse, joined with spaces,
    are exactly the API translation (footnote markers <sup ...>n</sup> removed, nothing else changed)
  - key words must appear inside their chunk
Timing (guide: engine/public/audio/guide/recitation_guide.mp4, a screen recording, used ONLY for timing):
  - the recording has room tone and crowd under the voice, so plain silence detection finds no gaps; instead the
    breath gaps are found as dips in the voice-band loudness (150-3500 Hz, 10 ms hops)
  - each phrase has an approximate start: when the TikTok's own on-screen caption changed (measured from the video's
    caption band). The real start is snapped to the audio: the deepest loudness dip within -0.7..+0.45 s of it, then
    the first moment after the dip the voice rises 6 dB above it.
  - cross-check with the TikTok: its caption starts fading 0.26-0.58 s BEFORE the voice comes back at every clear
    breath. Where the reciter joins two phrases without a breath (61 r-rahmanu|ibadahu, 63 min|ibadina,
    64 khalfana|wa ma bayna), the deepest dip can sit inside the previous word, i.e. BEFORE the TikTok fade. Then the
    start is snapped again inside 0..0.7 s after the fade. Repeats (60: fa-ula'ika yadkhuluna l-jannah, twice)
    are separate phrases with the same text.
  - a caption shows from 2 frames before its phrase starts until the next phrase starts
Writes videos/001-the-first-question/quran/timing.json and prints a report.
Run from engine/:  .venv-tts/Scripts/python tools/build_quran_timing.py
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
QDIR = HERE.parent.parent / "videos" / "001-the-first-question" / "quran"
GUIDE = HERE.parent / "public" / "audio" / "guide" / "recitation_guide.mp4"
FPS = 30
LEAD = 2 / FPS

# (verse, first word, last word inclusive, english chunk, key words, approximate start from the TikTok's caption change)
PHRASES = [
    (59, 0, 5, "But there came after them successors [i.e., later generations] who neglected", ["neglected"], 0.3),
    (59, 6, 9, "prayer and pursued desires;", ["prayer", "desires"], 4.8),
    (59, 10, 12, "so they are going to meet evil -", ["evil"], 7.6),
    (60, 0, 5, "Except those who repent, believe and do righteousness;", ["repent"], 11.4),
    (60, 6, 8, "for those will enter Paradise", ["Paradise"], 17.3),
    (60, 6, 8, "for those will enter Paradise", ["Paradise"], 22.5),           # recited twice
    (60, 9, 11, "and will not be wronged at all.", [], 27.5),
    (61, 0, 4, "[Therein are] gardens of perpetual residence which the Most Merciful has promised", ["Most Merciful"], 30.4),
    (61, 5, 7, "His servants in the unseen.", ["unseen"], 34.9),
    (61, 8, 11, "Indeed, His promise has ever been eminent.", ["promise"], 39.8),
    (62, 0, 6, "They will not hear therein any ill speech - only [greetings of] peace -", ["peace"], 44.8),
    (62, 7, 11, "and they will have their provision therein, morning and afternoon.", ["provision"], 50.3),
    (63, 0, 4, "That is Paradise, which We give as inheritance to those of", ["Paradise"], 56.8),
    (63, 5, 8, "Our servants who were fearing of Allāh.", ["fearing of Allāh"], 61.2),
]
SURAH = "MARYAM"
RANGE = "19:59-63"
# where 19:64 starts (approximately: the TikTok's caption change); the end of the video is placed in the breath before it
NEXT_APPROX = 66.3
# Arabic key words, by word number in the verse (counted on the API text, see the printout of --words): the words that
# carry the same meaning as the English key words (neglected, prayer, desires, evil / repented, Paradise / the Most
# Merciful, the unseen, His promise / peace, provision / Paradise, fearing / the order of your Lord, forgetful /
# Lord, worship Him, be patient, similar). Only colour changes: the words themselves come from the API.
AR_KEYS = {59: [5, 6, 8, 12], 60: [2, 8], 61: [4, 6, 10], 62: [5, 8], 63: [1, 8]}


def load_verses():
    out = {}
    for v in sorted({p[0] for p in PHRASES}):
        raw = json.loads((QDIR / f"19_{v}.json").read_text(encoding="utf-8"))["verse"]
        tr = raw["translations"]
        assert len(tr) == 1 and tr[0]["resource_id"] == 20, f"19:{v}: expected translation 20 only"
        en = re.sub(r"<sup[^>]*>.*?</sup>", "", tr[0]["text"])
        assert "<" not in en, f"19:{v}: unexpected markup left: {en}"
        out[v] = {"key": raw["verse_key"], "ar": raw["text_uthmani"], "en": en}
    info = json.loads((QDIR / "translations_list.json").read_text(encoding="utf-8"))
    name = next(t["name"] for t in info["translations"] if t["id"] == 20)
    assert name == "Saheeh International", name
    return out


def check_text(verses):
    for v, d in verses.items():
        ps = [p for p in PHRASES if p[0] == v]
        seen, ar_parts, en_parts = set(), [], []
        for p in ps:
            if (p[1], p[2]) in seen: continue                 # a repeat: same words, same chunk
            seen.add((p[1], p[2])); ar_parts.append((p[1], p[2])); en_parts.append(p[3])
        words = d["ar"].split(" ")
        # the word ranges cover every word of the verse once, in order
        assert ar_parts[0][0] == 0 and ar_parts[-1][1] == len(words) - 1 and all(ar_parts[i][1] + 1 == ar_parts[i + 1][0] for i in range(len(ar_parts) - 1)), f"19:{v} word ranges"
        assert " ".join(" ".join(words[a:b + 1]) for a, b in ar_parts) == d["ar"], f"19:{v} Arabic does not rebuild"
        assert " ".join(en_parts) == d["en"], f"19:{v} English does not match the API text:\n  ours: {' '.join(en_parts)}\n  API : {d['en']}"
        for p in ps:
            for k in p[4]: assert k in p[3], f"key '{k}' not in '{p[3]}'"


def loudness():
    a = subprocess.run(["ffmpeg", "-v", "error", "-i", str(GUIDE), "-map", "0:a", "-ac", "1", "-ar", "16000", "-af", "highpass=f=150,lowpass=f=3500",
                        "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(a, dtype=np.float32); hop = 160; n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12))
    return np.convolve(db, np.ones(5) / 5, mode="same"), len(x) / 16000


def caption_band():
    """share of bright pixels in the TikTok's caption band, 10 per second (white captions; coloured ones read low)"""
    W, H = 256, 144
    v = subprocess.run(["ffmpeg", "-v", "error", "-i", str(GUIDE), "-map", "0:v", "-vf", f"fps=10,scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                       capture_output=True, check=True).stdout
    fr = np.frombuffer(v, dtype=np.uint8).reshape(-1, H, W)
    return (fr[:, int(H * 0.33):int(H * 0.80), int(W * 0.05):int(W * 0.95)] > 170).mean((1, 2)) * 100


def tiktok_fade(band, approx):
    """when the TikTok's previous caption has half faded (None when it is too faint to measure, e.g. coloured text)"""
    i0 = int((approx - 1.2) * 10); plat = float(np.median(band[i0 - 10:i0]))
    if plat < 2: return None
    for k in range(16):
        if band[i0 + k] < 0.5 * plat: return (i0 + k) / 10
    return None


def snap(dbs, approx, lo_s=None, hi_s=None):
    lo, hi = max(0, int(((approx - 0.7) if lo_s is None else lo_s) * 100)), int(((approx + 0.45) if hi_s is None else hi_s) * 100)
    i = lo + int(np.argmin(dbs[lo:hi])); floor = dbs[i]
    j = i
    while j < len(dbs) - 1 and dbs[j] < floor + 6: j += 1
    return i / 100, j / 100, floor


def main():
    verses = load_verses(); check_text(verses)
    if "--words" in sys.argv:
        for v, d in verses.items(): print(v, " | ".join(f"{i}:{w}" for i, w in enumerate(d["ar"].split(" "))))
    dbs, dur = loudness(); band = caption_band()
    rows = []
    for k, (v, a, b, en, keys, approx) in enumerate(PHRASES):
        dip, onset, floor = (0.0, 0.0, 0.0) if k == 0 else snap(dbs, approx)
        fade = None if k == 0 else tiktok_fade(band, approx); how = "audio"
        if fade is not None and onset < fade:          # a joined phrase: the dip found was inside the previous word
            dip, onset, floor = snap(dbs, approx, fade, fade + 0.7); how = "audio after tiktok fade"
        if k == 0:  # the first phrase: the first moment the voice is up
            onset = float(np.argmax(dbs > np.median(dbs) - 6)) / 100
        words = verses[v]["ar"].split(" ")
        ar_keys = [w - a for w in AR_KEYS.get(v, []) if a <= w <= b]
        rows.append({"i": k, "verse": f"19:{v}", "ar": " ".join(words[a:b + 1]), "arKeys": ar_keys, "en": en, "keys": keys,
                     "repeat": any(p[0] == v and p[1] == a for p in PHRASES[:k]), "voice": round(onset, 2), "approx": approx,
                     "dip": round(dip, 2), "dipDb": round(float(floor), 1),
                     "tiktokFade": fade, "how": "first voice" if k == 0 else how})
    # the breath after 19:63: 19:64's onset (the same snap as every phrase), the dip before it, and the last moment of
    # 19:63's voice before the dip (looking back from the dip until the voice is 6 dB above the dip's floor). The video
    # ends on the last frame boundary before the middle of the breath.
    nd, n_onset, nfloor = snap(dbs, NEXT_APPROX)
    j = int(nd * 100)
    while j > 0 and dbs[j] < nfloor + 6: j -= 1
    voice_end = j / 100
    mid = (voice_end + n_onset) / 2
    video_end = int(mid * FPS) / FPS
    assert voice_end + 0.05 < video_end < n_onset - 0.08, (voice_end, video_end, n_onset)
    rec_end = round(video_end, 4)
    for k, r in enumerate(rows):
        r["start"] = round(max(0.0, r["voice"] - LEAD), 3)
        r["end"] = round(rows[k + 1]["voice"] - LEAD, 3) if k + 1 < len(rows) else rec_end
    out = {
        "source": {"api": "https://api.quran.com/api/v4/verses/by_key/19:{n}?fields=text_uthmani&translations=20",
                   "translation": "Saheeh International (quran.com translation 20)", "script": "text_uthmani",
                   "note": "footnote markers <sup>n</sup> removed from the English; nothing else changed"},
        "surah": SURAH, "range": RANGE, "reciter": "Sheikh Yasser Al-Dossari",
        "guide": {"file": "engine/public/audio/guide/recitation_guide.mp4", "duration": round(dur, 3), "recitationEnd": rec_end,
                  "breath": {"voice6303End": voice_end, "voice6401Start": n_onset, "floorDb": round(float(nfloor), 1), "videoEnd": rec_end,
                             "note": "the video ends here, inside the breath before 19:64"},
                  "note": "timing only; never in the upload file"},
        "fps": FPS, "leadFrames": 2, "phrases": rows,
    }
    (QDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"guide {dur:.2f} s; 19:63 voice ends {voice_end:.2f} s, breath floor {nfloor:.1f} dB, 19:64 starts {n_onset:.2f} s -> video ends {rec_end:.4f} s ({round(rec_end * FPS)} frames)")
    for r in rows:
        print(f"{r['i']:2d} {r['verse']} voice {r['voice']:6.2f} [{r['how']}] (tiktok fade {r['tiktokFade']}, dip {r['dip']:6.2f} @ {r['dipDb']:5.1f} dB)  "
              f"show {r['start']:6.2f}-{r['end']:6.2f}{'  REPEAT' if r['repeat'] else ''}  {r['en']}")
        print("      AR:", r["ar"], "  key words:", " / ".join(r["ar"].split(" ")[j] for j in r["arKeys"]))


if __name__ == "__main__":
    main()
