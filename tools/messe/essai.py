#!/usr/bin/env python3
"""Essai : Messe depuis Divinum Officium (rubriques 1960), calendrier d'une année et jours types."""
import concurrent.futures as fu, datetime as dt, json, os, pathlib, re, subprocess, sys, urllib.parse
sys.path.insert(0, "tools/breviaire")
import generate as g

DO = pathlib.Path("_do/web/cgi-bin/missa")
OUT = pathlib.Path("tools/messe/essai")
OUT.mkdir(parents=True, exist_ok=True)

def perl(date, lang1="Latin", lang2="Francais", propres="1", numero=None):
    q = {"command": "praySanctaMissa", "date": date.strftime("%m-%d-%Y"), "version": "Rubrics 1960 - 1960",
         "lang1": lang1, "lang2": lang2, "langfb": "Latin", "content": "1", "Propers": propres}
    if numero: q["missanumber"] = str(numero)
    env = dict(os.environ, REQUEST_METHOD="GET", QUERY_STRING=urllib.parse.urlencode(q),
               SCRIPT_NAME="/cgi-bin/missa/missa.pl", LC_ALL="C.UTF-8")
    p = subprocess.run(["perl", "missa.pl"], cwd=DO, env=env, capture_output=True, timeout=180)
    return p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace")[-300:]

def couleur(page):
    m = re.search(r'<FONT[^>]*COLOR="?([a-zA-Z#0-9]+)"?[^>]*>', page[:2500], re.I)
    return m.group(1) if m else ""

def jour(d):
    page, err = perl(d)
    o = g.parse_office(page)
    fr, _ = perl(d, "Francais", "Francais")
    t = lambda c: g.plain(c)[:40]
    return d.isoformat(), {"titre": o["titre"], "sous": o["sous"], "titre_fr": g.parse_office(fr)["titre"],
        "couleur": couleur(page), "lignes": len(o["lignes"]), "taille": len(page),
        "parties": [t(r[0]) for r in o["lignes"]], "egales": sum(1 for a, b in o["lignes"] if a == b and len(g.plain(a)) > 40), "err": err if not o["lignes"] else ""}

debut, fin = dt.date(2026, 11, 5), dt.date(2027, 12, 31)
dates = [debut + dt.timedelta(n) for n in range((fin - debut).days + 1)]
with fu.ThreadPoolExecutor(os.cpu_count() or 2) as pool:
    cal = dict(pool.map(jour, dates))
(OUT / "calendrier.json").write_text(json.dumps(cal, ensure_ascii=False, indent=0), encoding="utf-8")

TYPES = {"2026-11-05": None, "2026-11-04": None, "2026-11-08": None, "2026-11-02": None, "2026-12-25": None, "2027-02-10": None,
         "2027-03-21": None, "2027-03-25": None, "2027-03-26": None, "2027-03-27": None, "2027-03-28": None, "2027-05-16": None, "2027-05-27": None, "2027-08-15": None}
for iso in TYPES:
    d = dt.date.fromisoformat(iso)
    page, err = perl(d)
    (OUT / f"{iso}.json").write_text(json.dumps({**g.parse_office(page), "err": err}, ensure_ascii=False), encoding="utf-8")
    if iso == "2026-11-04":
        (OUT / "brut.html").write_text(page[:30000], encoding="utf-8")
        complet, _ = perl(d, propres="")
        (OUT / "complet.json").write_text(json.dumps(g.parse_office(complet), ensure_ascii=False), encoding="utf-8")
for n in (1, 2, 3):
    for iso in ("2026-12-25", "2027-11-02"):
        page, _ = perl(dt.date.fromisoformat(iso), numero=n)
        (OUT / f"{iso}-m{n}.json").write_text(json.dumps(g.parse_office(page), ensure_ascii=False), encoding="utf-8")
print(len(cal), sum(1 for v in cal.values() if not v["lignes"]))
