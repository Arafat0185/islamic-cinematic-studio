"""Timing sheet for video 003 "The Sirat" -> videos/003-the-sirat/timing.json

  the sound   Sheikh Yasser Al-Dossari, Surat Maryam 19:66-72, a Taraweeh recording (public/audio/guide/sirat_recitation.mp4,
              NEVER committed). It is IN our file (tools/mix_sirat.py): from its 0:00, cut at END, inside the breath after
              19:72 ("... fiha jithiyya", the voice stops at 110.05 s) and before 19:73 ("wa idha", from 110.3 s); its echo
              fades out over ~1.5 s under the start of the 5 s end card.
  phrases     Arabic + English caption phrases: exact slices of the saved quran.com responses (quran/19_*.json,
              text_uthmani + translation 20 = Saheeh International). The starts follow the guide's burned-in captions (they
              change on each recited phrase; measured at 10 fps), cross-checked with local Whisper word timings
              (quran/whisper_words.json, model "small", Arabic): they agree within ~0.3 s except where Whisper smears a
              long held note. The reciter restarts 19:72's second half ("wa nadharu z-zalimin" .. then the whole of it).
Run from engine/:  .venv-tts/Scripts/python tools/build_sirat_timing.py
"""
import json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
VDIR = HERE.parent.parent / "videos" / "003-the-sirat"
QDIR = VDIR / "quran"
FPS = 30
END = 110.2               # inside the breath after 19:72 (voice 110.05-110.30 s): the recitation is cut here
CONTINUE_FROM = 104.6     # the ending: the near-black ember frame, "How fast will you cross?"
CARD = 5.0                # the end card, after the recitation

# (verse, first word, last word, English slice, start s, partial). Word indices count the Uthmani text split on spaces
# (the pause mark "ۚ" is a token). partial: the reciter stops and restarts (not part of the verse's join check).
PHRASES = [
    (66, 0, 4, 'And man [i.e., the disbeliever] says, "When I have died,', 0.0, False),
    (66, 5, 7, 'am I going to be brought forth alive?"', 5.3, False),
    (67, 0, 5, "Does man not remember that We created him", 8.0, False),
    (67, 6, 9, "before, while he was nothing?", 15.8, False),
    (68, 0, 2, "So by your Lord, We will surely gather them and the devils;", 18.3, False),
    (68, 3, 6, "then We will bring them to be present around Hell", 31.4, False),
    (68, 7, 7, "upon their knees.", 45.3, False),
    (69, 0, 4, "Then We will surely extract from every sect", 46.3, False),
    (69, 5, 9, "those of them who were worst against the Most Merciful in insolence.", 59.5, False),
    (70, 0, 4, "Then, surely it is We who are most knowing of those", 64.7, False),
    (70, 5, 7, "most worthy of burning therein.", 70.0, False),
    (71, 0, 4, "And there is none of you except he will come to it.", 73.4, False),
    (71, 5, 9, "This is upon your Lord an inevitability decreed.", 86.2, False),
    (72, 0, 3, "Then We will save those who feared Allāh", 92.5, False),
    (72, 4, 5, "and leave the wrongdoers", 100.5, True),
    (72, 4, 7, "and leave the wrongdoers within it, on their knees.", 105.3, False),
]
EN_KEYS = {1: ["brought forth alive"], 3: ["nothing"], 4: ["the devils"], 5: ["around Hell"], 6: ["upon their knees"], 7: ["extract"], 8: ["insolence"],
           10: ["burning therein"], 11: ["none of you", "come to it"], 12: ["inevitability decreed"], 13: ["save"], 14: ["wrongdoers"], 15: ["wrongdoers", "on their knees"]}
AR_KEYS = {(66, 7), (68, 2), (68, 6), (68, 7), (69, 1), (69, 9), (70, 7), (71, 3), (71, 9), (72, 1), (72, 5), (72, 7)}


def main():
    verses = {}
    for v in sorted({p[0] for p in PHRASES}):
        d = json.loads((QDIR / f"19_{v}.json").read_text(encoding="utf-8"))["verse"]
        assert d["verse_key"] == f"19:{v}" and d["translations"][0]["resource_id"] == 20
        verses[v] = {"ar": d["text_uthmani"].split(" "), "en": re.sub(r"<sup[^>]*>.*?</sup>", "", d["translations"][0]["text"])}
    names = json.loads((QDIR / "translations_list.json").read_text(encoding="utf-8"))["translations"]
    assert [t["name"] for t in names if t["id"] == 20] == ["Saheeh International"], "translation 20 is not Saheeh International"
    for v, a, b, en, _, _ in PHRASES:
        assert en in verses[v]["en"], f"English of 19:{v}: {en!r}"
    for v in verses:   # each verse's (non-partial) phrases join back into the verse exactly
        ps = [p for p in PHRASES if p[0] == v and not p[5]]
        assert " ".join(" ".join(verses[v]["ar"][a:b + 1]) for _, a, b, _, _, _ in ps) == " ".join(verses[v]["ar"]), f"Arabic of 19:{v}"
        assert " ".join(e for _, _, _, e, _, _ in ps) == verses[v]["en"], f"English of 19:{v}: {verses[v]['en']!r}"
    assert all(PHRASES[i][4] < PHRASES[i + 1][4] for i in range(len(PHRASES) - 1))
    phrases = []
    for i, (v, a, b, en, st, part) in enumerate(PHRASES):
        end = PHRASES[i + 1][4] if i + 1 < len(PHRASES) else END
        phrases.append({"i": i, "verse": f"19:{v}", "ar": " ".join(verses[v]["ar"][a:b + 1]), "arKeys": [k - a for k in range(a, b + 1) if (v, k) in AR_KEYS],
                        "en": en, "keys": EN_KEYS.get(i, []), "start": st, "end": round(end, 3), **({"partial": True} if part else {})})
    out = {"fps": FPS, "length": round(END + CARD, 3), "recStart": 0.0, "recEnd": END, "continueFrom": CONTINUE_FROM, "cardFrom": END,
           "surah": "Maryam", "range": "19:66-72", "reciter": "Sheikh Yasser Al-Dossari", "translation": "Saheeh International", "phrases": phrases,
           "notes": "the reciter stops after 'wa nadharu z-zalimin' (19:72) and restarts the phrase in full; the recitation is cut in the breath after 19:72 (110.2 s), before 19:73; then the 5 s end card",
           "sources": {"recitation": "public/audio/guide/sirat_recitation.mp4 (Taraweeh; never committed; in our file, cut at 110.2 s)",
                       "text": "https://api.quran.com/api/v4/verses/by_key/19:{66..72}?fields=text_uthmani&translations=20"}}
    (VDIR / "timing.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"length {out['length']} s ({round(out['length'] * FPS)} frames); recitation 0-{END}; continue {CONTINUE_FROM}; end card {END}-{out['length']}")
    for p in phrases: print(f"  {p['start']:6.1f}-{p['end']:6.1f} {p['verse']}{' (restart)' if p.get('partial') else ''}  {p['ar']}  |  {p['en']}")


if __name__ == "__main__":
    main()
