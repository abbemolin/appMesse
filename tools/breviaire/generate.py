#!/usr/bin/env python3
"""Génère les offices du bréviaire (latin + français) depuis Divinum Officium.

Lance officium.pl pour chaque jour et chaque heure, nettoie le HTML produit et
écrit data/breviaire/AAAA/MM-JJ/<Heure>.json. Le français manquant retombe sur
le latin (jamais sur l'anglais, repli par défaut de Divinum Officium).

Usage : generate.py --do-root _do/web --out data/breviaire --from 2026-11-01 --to 2027-12-31
        generate.py ... --dates 2026-11-04,2027-03-26
"""
import argparse
import concurrent.futures as futures
import datetime as dt
import html
from html.parser import HTMLParser
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.parse

VERSION = "Rubrics 1960 - 1960"
HOURS = ["Matutinum", "Laudes", "Prima", "Tertia", "Sexta", "Nona", "Vespera", "Completorium"]
MIN_ROWS = 3


class OfficeParser(HTMLParser):
    """Sépare le titre du jour et les lignes du tableau, en ne gardant que des balises sûres."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.row, self.cell = [], None, None
        self.head = []
        self.in_table = False
        self.seen_table = False
        self.skip = 0          # profondeur d'un élément à ignorer (H2, liens Top/Next, script…)
        self.spans = []        # balises ouvertes dans la cellule : classe CSS ou None
        self.gabc = None       # source d'une partition en cours de lecture
        self.gabc_depth = 0

    def out(self, text):
        if self.cell is not None:
            self.cell.append(text)

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if self.gabc is not None:
            self.gabc_depth += tag == "div"
            self.gabc.append(self.get_starttag_text() or "")
            return
        if tag == "div" and a.get("class") == "GABC" and self.cell is not None and not self.skip:
            self.gabc, self.gabc_depth = [], 0
            return
        if tag in ("script", "style", "h2", "input"):
            if tag != "input":
                self.skip += 1
            return
        if tag == "div" and a.get("align", "").lower() == "right":
            self.skip += 1
            return
        if self.skip:
            if tag in ("div", "h2", "script", "style"):
                self.skip += 1
            return
        if tag == "table":
            self.in_table = self.seen_table = True
        elif tag == "tr" and self.in_table:
            self.row = []
        elif tag == "td" and self.row is not None:
            self.cell, self.spans = [], []
        elif self.cell is not None:
            if tag == "br":
                self.out("<br>")
            elif tag in ("b", "i"):
                self.out(f"<{tag}>")
            elif tag in ("font", "span"):
                cls = css_class(a)
                self.spans.append(cls)
                if cls:
                    self.out(f'<span class="{cls}">')
        elif not self.seen_table and tag == "br":
            self.head.append("\n")

    def handle_endtag(self, tag):
        if self.gabc is not None:
            if tag == "div" and self.gabc_depth == 0:
                source = html.escape("".join(self.gabc).strip(), quote=False)
                self.out(f'<div class="gabc">{source}</div>')
                self.gabc = None
            else:
                self.gabc_depth -= tag == "div"
                self.gabc.append(f"</{tag}>")
            return
        if self.skip:
            if tag in ("div", "h2", "script", "style"):
                self.skip -= 1
            return
        if tag == "table":
            self.in_table = False
        elif tag == "td" and self.cell is not None:
            while self.spans:
                if self.spans.pop():
                    self.out("</span>")
            self.row.append(clean_cell("".join(self.cell)))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if any(self.row):
                self.rows.append(self.row)
            self.row = None
        elif self.cell is not None:
            if tag in ("b", "i"):
                self.out(f"</{tag}>")
            elif tag in ("font", "span") and self.spans:
                if self.spans.pop():
                    self.out("</span>")

    def handle_data(self, data):
        if self.gabc is not None:
            self.gabc.append(data)
            return
        if self.skip:
            return
        if self.cell is not None:
            self.out(html.escape(data, quote=False))
        elif not self.seen_table:
            self.head.append(data)


def css_class(attrs):
    style = attrs.get("style", "").lower().replace(" ", "")
    color = attrs.get("color", "").lower().strip("\"'")
    size = attrs.get("size", "")
    if "color:red" in style or color == "red":
        if size == "+1":
            return "do-titre"
        if size == "1":
            return "do-petit"
        return "do-rubr"
    if size == "1" or "color:grey" in style:
        return "do-petit"
    return None


def clean_cell(text):
    text = re.sub(r"(?:\s*<br>\s*)+$", "", text.strip())
    text = re.sub(r"^(?:\s*<br>\s*)+", "", text)
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    return text.replace(" ", " ").strip()


def plain(text):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text)).strip()


def parse_office(page):
    """Renvoie {titre, sous, lignes:[[la, fr], …]} depuis la sortie de officium.pl."""
    page = re.sub(r"\A(?:Content-type:[^\n]*\n|Set-Cookie:[^\n]*\n|\r?\n)+", "", page, flags=re.I)
    parser = OfficeParser()
    parser.feed(page)
    parser.close()
    rows = []
    for row in parser.rows:
        if len(row) == 1:
            row = row * 2
        rows.append([row[0], row[1]])
    head = [re.sub(r"\s+", " ", l).strip() for l in "".join(parser.head).split("\n")]
    head = [l for l in head if l]
    return {"titre": head[0] if head else "", "sous": " · ".join(head[1:]), "lignes": rows}


def run_perl(do_root, date, hour, chant=False):
    params = {
        "command": "pray" + hour,
        "date": date.strftime("%m-%d-%Y"),
        "version": VERSION,
        "lang1": "Latin-gabc" if chant else "Latin",
        "lang2": "Latin-gabc" if chant else "Francais",
        "langfb": "Latin",
        "expand": "tota",
        "content": "1",
    }
    env = dict(os.environ, REQUEST_METHOD="GET", QUERY_STRING=urllib.parse.urlencode(params),
               SCRIPT_NAME="/cgi-bin/horas/officium.pl", LC_ALL="C.UTF-8")
    proc = subprocess.run(["perl", "officium.pl"], cwd=pathlib.Path(do_root) / "cgi-bin" / "horas",
                          env=env, capture_output=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace")[-400:])
    return proc.stdout.decode("utf-8", "replace")


def check_office(office):
    """Liste les anomalies qui rendraient un fichier inutilisable."""
    problems = []
    if len(office["lignes"]) < MIN_ROWS:
        problems.append(f"seulement {len(office['lignes'])} lignes")
    if not office["titre"]:
        problems.append("pas de titre")
    if not any(fr for _, fr in office["lignes"]):
        problems.append("colonne française vide")
    joined = plain(" ".join(c for row in office["lignes"] for c in row))
    for bad in ("Cannot open", "Software error", "Unknown version", "Unknown language"):
        if bad in joined:
            problems.append(f"message d'erreur : {bad}")
    return problems


def latin_only(office):
    """Nombre de lignes de texte où le français est identique au latin (repli)."""
    return sum(1 for la, fr in office["lignes"] if la == fr and len(plain(la)) > 40)


def build_chant(args, date):
    """Vêpres en grégorien : colonne unique ; les pièces sans partition restent en latin."""
    office = parse_office(run_perl(args.do_root, date, "Vespera", chant=True))
    lignes = [row[0] for row in office["lignes"]]
    if len(lignes) < MIN_ROWS or not any('class="gabc"' in c for c in lignes):
        raise RuntimeError(f"grégorien : {len(lignes)} lignes, aucune partition")
    office = {"date": date.isoformat(), "heure": "Vespera", "titre": office["titre"],
              "sous": office["sous"], "lignes": lignes}
    path = pathlib.Path(args.out) / date.strftime("%Y") / date.strftime("%m-%d") / "Vespera-gregorien.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(office, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return 0


def build_one(args, date, hour):
    office = parse_office(run_perl(args.do_root, date, hour))
    problems = check_office(office)
    if problems:
        raise RuntimeError("; ".join(problems))
    office = {"date": date.isoformat(), "heure": hour, **office}
    path = pathlib.Path(args.out) / date.strftime("%Y") / date.strftime("%m-%d") / f"{hour}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(office, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return latin_only(office)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--do-root", required=True, help="dossier web/ de Divinum Officium")
    ap.add_argument("--out", default="data/breviaire")
    ap.add_argument("--from", dest="start")
    ap.add_argument("--to", dest="end")
    ap.add_argument("--dates", help="dates AAAA-MM-JJ séparées par des virgules")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 2)
    args = ap.parse_args()

    if args.dates:
        dates = [dt.date.fromisoformat(d.strip()) for d in args.dates.split(",")]
    else:
        start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
        dates = [start + dt.timedelta(n) for n in range((end - start).days + 1)]

    failures, fallback, done = [], {}, 0
    with futures.ThreadPoolExecutor(args.jobs) as pool:
        jobs = {pool.submit(build_one, args, d, h): (d, h) for d in dates for h in HOURS}
        jobs.update({pool.submit(build_chant, args, d): (d, "Vespera-gregorien") for d in dates})
        for job in futures.as_completed(jobs):
            d, h = jobs[job]
            try:
                count = job.result()
                done += 1
                if count:
                    fallback[f"{d} {h}"] = count
            except Exception as err:  # on continue pour tout signaler d'un coup
                failures.append(f"{d} {h}: {err}")

    print(f"{done} offices écrits, {len(failures)} en échec.")
    print(f"{len(fallback)} offices ont au moins une ligne en latin faute de français.")
    report = pathlib.Path(args.out) / "rapport.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps({"version": VERSION, "ecrits": done, "echecs": sorted(failures),
                                  "repli_latin": dict(sorted(fallback.items()))},
                                 ensure_ascii=False, indent=1), encoding="utf-8")
    for line in sorted(failures)[:40]:
        print("ÉCHEC", line, file=sys.stderr)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
