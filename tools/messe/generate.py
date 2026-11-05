#!/usr/bin/env python3
"""Génère le calendrier liturgique et le propre de la Messe depuis Divinum Officium (rubriques 1960).

data/messe/AAAA/MM-JJ.json : messes du jour, latin et français.
data/messe/calendrier.js   : titre, classe, couleur de chaque jour, pour un affichage immédiat.
"""
import argparse, concurrent.futures as fu, datetime as dt, json, os, pathlib, re, subprocess, sys, urllib.parse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "breviaire"))
import generate as g

COULEURS = {"": "Blanc", "black": "Blanc", "blue": "Blanc", "red": "Rouge", "green": "Vert",
            "purple": "Violet", "grey": "Noir", "deeppink": "Rose"}
CLASSES = {"I": "1re classe", "II": "2e classe", "III": "3e classe", "IV": "4e classe"}
RANGS = {"I": 1, "II": 2, "III": 3, "IV": 4}


def perl(root, date, lang1="Latin", lang2="Francais", numero=None):
    q = {"command": "praySanctaMissa", "date": date.strftime("%m-%d-%Y"), "version": g.VERSION,
         "lang1": lang1, "lang2": lang2, "langfb": "Latin", "content": "1", "Propers": "1"}
    if numero:
        q["missanumber"] = str(numero)
    env = dict(os.environ, REQUEST_METHOD="GET", QUERY_STRING=urllib.parse.urlencode(q),
               SCRIPT_NAME="/cgi-bin/missa/missa.pl", LC_ALL="C.UTF-8")
    p = subprocess.run(["perl", "missa.pl"], cwd=pathlib.Path(root) / "cgi-bin" / "missa", env=env,
                       capture_output=True, timeout=180)
    if p.returncode:
        raise RuntimeError(p.stderr.decode("utf-8", "replace")[-300:])
    return p.stdout.decode("utf-8", "replace")


def couleur(page):
    """Couleur de la première balise du titre du jour ; sans couleur = blanc chez Divinum Officium."""
    tete = page.split("</P>", 1)[0]
    m = re.search(r"<FONT\b([^>]*)>", tete, re.I)
    c = re.search(r'COLOR="?([a-zA-Z#0-9]+)', m.group(1), re.I) if m else None
    return COULEURS.get(c.group(1).lower() if c else "", "Blanc")


def jour(args, d):
    messes, vus, tete = [], set(), None
    for n in (1, 2, 3):
        page = perl(args.do_root, d, numero=n)
        o = g.parse_office(page)
        cle = json.dumps(o["lignes"], ensure_ascii=False)
        if cle in vus:
            continue
        vus.add(cle)
        if len(o["lignes"]) < g.MIN_ROWS:
            raise RuntimeError(f"seulement {len(o['lignes'])} lignes")
        fr = g.parse_office(perl(args.do_root, d, "Francais", "Francais", numero=n))["titre"]
        messes.append({"titre": o["titre"], "titre_fr": re.split(r"\s+~\s+", fr)[0].strip(), "lignes": o["lignes"]})
        if tete is None:
            tete = (o, page)
    o, page = tete
    rang = (re.search(r"~ ([IV]+)\. classis", o["titre"]) or [None, None])[1]
    principal = 0
    if re.search(r"chrismatis", messes[0]["titre"]) and len(messes) > 1:
        principal = 1   # Jeudi saint : la Messe du soir d'abord
    cal = {"titre": o["titre"].split(" ~ ")[0], "titre_fr": messes[principal]["titre_fr"], "couleur": couleur(page),
           "classe": CLASSES.get(rang, ""), "rang": RANGS.get(rang, 4), "comm": o["sous"]}
    path = pathlib.Path(args.out) / d.strftime("%Y") / (d.strftime("%m-%d") + ".json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"date": d.isoformat(), **cal, "principal": principal, "messes": messes},
                               ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return d.isoformat(), cal, sum(1 for m in messes for a, b in m["lignes"] if a == b and len(g.plain(a)) > 40)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--do-root", required=True)
    ap.add_argument("--out", default="data/messe")
    ap.add_argument("--from", dest="start", required=True)
    ap.add_argument("--to", dest="end", required=True)
    a = ap.parse_args()
    s, e = dt.date.fromisoformat(a.start), dt.date.fromisoformat(a.end)
    dates = [s + dt.timedelta(n) for n in range((e - s).days + 1)]
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    cal_path = out / "calendrier.json"
    cal = json.loads(cal_path.read_text(encoding="utf-8")) if cal_path.exists() else {}
    echecs, repli = [], {}
    with fu.ThreadPoolExecutor(os.cpu_count() or 2) as pool:
        jobs = {pool.submit(jour, a, d): d for d in dates}
        for j in fu.as_completed(jobs):
            try:
                iso, c, n = j.result()
                cal[iso] = c
                if n:
                    repli[iso] = n
            except Exception as err:
                echecs.append(f"{jobs[j]}: {err}")
    cal = dict(sorted(cal.items()))
    cal_path.write_text(json.dumps(cal, ensure_ascii=False, indent=0), encoding="utf-8")
    (out / "calendrier.js").write_text("window.CALENDRIER_MESSE=" + json.dumps(cal, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    (out / "rapport.json").write_text(json.dumps({"ecrits": len(dates) - len(echecs), "echecs": sorted(echecs), "repli_latin": repli}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(dates) - len(echecs), "jours,", len(echecs), "échecs,", len(repli), "avec repli latin")
    for x in sorted(echecs)[:30]:
        print("ÉCHEC", x, file=sys.stderr)
    sys.exit(1 if echecs else 0)


if __name__ == "__main__":
    main()
