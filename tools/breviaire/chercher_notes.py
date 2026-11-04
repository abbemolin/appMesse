#!/usr/bin/env python3
"""Récupère depuis GregoBase les candidats pour les antiennes de Vêpres sans notes (essai)."""
import csv, html, io, json, pathlib, re, time, unicodedata, urllib.request

BASE = "https://gregobase.selapa.net/"
PIECES = {
    "pentecote-1": "cum complerentur", "pentecote-2": "spiritus domini", "pentecote-3": "repleti sunt",
    "pentecote-4": "fontes et omnia", "pentecote-5": "loquebantur",
    "assomption-1": "assumpta est maria", "assomption-2": "maria virgo assumpta",
    "assomption-3": "in odorem", "assomption-4": "benedicta", "assomption-5": "pulchra es",
}
OUT = pathlib.Path("tools/breviaire/candidats")

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "appMesse-breviaire"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def norm(t):
    t = unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", t.replace("j", "i").replace("(ant.)", "")).strip()

rows = list(csv.reader(io.StringIO(get("csv.php"))))
OUT.mkdir(parents=True, exist_ok=True)
index = {"lignes_csv": len(rows), "pieces": {}}
for cle, incipit in PIECES.items():
    trouves = []
    for row in rows:
        if len(row) >= 3 and "ntiphon" in row[0] and norm(row[1]).startswith(incipit.replace("j", "i")):
            trouves.append({"id": row[2], "incipit": row[1]})
    for t in trouves[:8]:
        time.sleep(1)
        try:
            page = get(f"chant.php?id={t['id']}")
            texte = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style).*?</\1>", " ", page, flags=re.S))))
            t["sources"] = sorted(set(re.findall(r"[A-Z][\w' .-]{3,40}, (?:Solesmes|[A-Z][a-z]+)?,? ?\d{4}, p\. ?\[?\d+\]?", texte)))[:6]
            t["version"] = (re.search(r"Solesmes \d{4}|Vatican[^ ]* \d{4}", texte) or [""])[0]
            time.sleep(1)
            gabc = get(f"download.php?id={t['id']}&format=gabc")
            (OUT / f"{cle}--{t['id']}.gabc").write_text(gabc, encoding="utf-8")
            t["gabc_octets"] = len(gabc)
        except Exception as err:
            t["erreur"] = str(err)[:200]
    index["pieces"][cle] = {"cherche": incipit, "trouves": trouves}
(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
print({k: len(v["trouves"]) for k, v in index["pieces"].items()})
