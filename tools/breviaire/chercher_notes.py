#!/usr/bin/env python3
"""Deuxième passe : pièces à fichier vide et « Benedicta filia » (essai)."""
import csv, io, json, pathlib, re, time, urllib.parse, urllib.request, unicodedata

BASE = "https://gregobase.selapa.net/"
OUT = pathlib.Path("tools/breviaire/candidats")
IDS = {"pentecote-1": [19943], "pentecote-2": [2393, 12623, 12938, 3330], "pentecote-3": [2527, 12054],
       "pentecote-4": [2550, 13306], "pentecote-5": [2311, 12181],
       "assomption-1": [2561, 3331], "assomption-2": [2912], "assomption-3": [2963], "assomption-5": [2861]}

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "appMesse-breviaire"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.headers.get("Content-Type"), r.read().decode("utf-8", "replace")

def norm(t):
    return unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()

_, _, data = get("csv.php")
for row in csv.reader(io.StringIO(data)):
    if len(row) >= 3 and "ntiphon" in row[0] and norm(row[1]).startswith("benedicta filia"):
        IDS.setdefault("assomption-4", []).append(int(row[2]))

journal = {}
for cle, ids in IDS.items():
    for i in ids:
        time.sleep(1)
        info = {}
        st, ct, gabc = get(f"download.php?id={i}&format=gabc")
        info.update(statut=st, type=ct, octets=len(gabc))
        time.sleep(1)
        _, _, page = get(f"chant.php?id={i}")
        liens = re.findall(r'href="([^"]*(?:sourceandsummit|scrib\.io)[^"]*)"', page)
        info["liens"] = len(liens)
        if liens:
            info["extrait_lien"] = urllib.parse.unquote(liens[0])[:1500]
        info["extrait_page"] = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))[:300]
        if gabc.strip():
            (OUT / f"{cle}--{i}.gabc").write_text(gabc, encoding="utf-8")
        journal[f"{cle}--{i}"] = info
(OUT / "passe2.json").write_text(json.dumps(journal, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(journal))
