#!/usr/bin/env python3
"""Jours à recalculer après une modification du calendrier propre.

Compare deux versions de propre/calendrier.json et donne, de --from à --to, chaque jour dont une fête
a changé, ainsi que la veille (premières Vêpres, Complies). Sortie : AAAA-MM-JJ séparés par des virgules.
Usage : dates.py ancien.json nouveau.json --from 2026-11-24 --to 2027-12-31
"""
import argparse, datetime as dt, json, pathlib

def lire(chemin):
    p = pathlib.Path(chemin)
    if not p.exists() or not p.read_text(encoding="utf-8").strip():
        return {"fetes": [], "mentions": []}
    return json.loads(p.read_text(encoding="utf-8"))

def par_jour(cal):
    res = {}
    for f in cal.get("fetes", []):
        res.setdefault(f["date"], []).append(json.dumps(f, sort_keys=True, ensure_ascii=False))
    return {k: sorted(v) for k, v in res.items()}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ancien"); ap.add_argument("nouveau")
    ap.add_argument("--from", dest="debut", required=True); ap.add_argument("--to", dest="fin", required=True)
    a = ap.parse_args()
    av, ap_ = par_jour(lire(a.ancien)), par_jour(lire(a.nouveau))
    jours = {j for j in set(av) | set(ap_) if av.get(j) != ap_.get(j)}
    # Fête de la communauté : la messe en second choix dépend aussi du reste du calendrier ; fête « reprise » d'un autre jour
    for f in lire(a.nouveau).get("fetes", []):
        if f.get("base") and f["date"] in jours:
            jours.add(f["base"])
    debut, fin = dt.date.fromisoformat(a.debut), dt.date.fromisoformat(a.fin)
    res = set()
    d = debut
    while d <= fin:
        if d.strftime("%m-%d") in jours:
            for x in (d - dt.timedelta(1), d):
                if debut <= x <= fin:
                    res.add(x)
        d += dt.timedelta(1)
    print(",".join(x.isoformat() for x in sorted(res)))

if __name__ == "__main__":
    main()
