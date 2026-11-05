#!/usr/bin/env python3
"""Extrait du PDF « Propre de la communauté » les Messes datées, au format de data/messe."""
import html, json, pathlib, re, sys
import pdfplumber

SECTIONS = [("Antiphona ad Introitum", "Introitus"), ("Oratio", "Oratio"), ("Graduale", "Graduale"),
            ("Antiphona ad Offertorium", "Offertorium"), ("Secreta", "Secreta"),
            ("Antiphona ad Communionem", "Communio"), ("Postcommunio", "Postcommunio")]
FETES = [("foucauld", 2, 4), ("sopocko", 5, 6), ("faustine", 7, 9), ("jean-paul-ii", 10, 12), ("notre-dame", 13, 16)]
COUPES = ("In Missis votivis", "Tempore autem paschali")

def rouge(w):
    c = w.get("non_stroking_color")
    return isinstance(c, (tuple, list)) and len(c) == 3 and c[0] > .6 and c[1] < .3 and c[2] < .3

def lignes(pg):
    ws = pg.extract_words(x_tolerance=2.2, y_tolerance=2, extra_attrs=["non_stroking_color", "fontname"])
    ws = sorted(ws, key=lambda w: (w["top"], w["x0"]))
    res = []
    for w in ws:
        if w["top"] < 72 or w["top"] > 775:      # logo et numéro de page
            continue
        for l in res:
            if abs(l[0]["top"] - w["top"]) < 5.5 or abs(l[0]["bottom"] - w["bottom"]) < 3:
                l.append(w)
                break
        else:
            res.append([w])
    return res

def texte(mots):
    mots = sorted(mots, key=lambda w: w["x0"])
    out, red = [], False
    for w in mots:
        t = html.escape(w["text"], quote=False)
        if rouge(w) != red:
            out.append("</i></span>" if red else '<span class="do-rubr"><i>')
            red = rouge(w)
        out.append(t + " ")
    if red:
        out.append("</i></span>")
    s = "".join(out).strip()
    s = re.sub(r"\s+</i></span>", "</i></span> ", s)
    return s.replace("V/.", "℣.").replace("V/ ", "℣. ")

def plein(l):
    xs = [w["x0"] for w in l]
    return min(xs) < 80

def titre(cle, ref=""):
    r = f'<span class="do-rubr"><i>{ref}</i></span><br> ' if ref else ""
    return f'<span class="do-titre"><b><i>{cle}</i></b></span> <br> {r}'

def fete(pdf, a, b):
    rows, g, d, sec, lect, mode = [], [], [], None, [], None
    def fin():
        nonlocal g, d, sec
        if sec:
            rows.append((sec, " ".join(g), " ".join(d)))
        g, d, sec = [], [], None
    def finlect():
        nonlocal lect, mode
        if lect:
            rows.append((mode, None, lect))
        lect, mode = [], None
    coupe = False
    for n in range(a - 1, b):
        for l in lignes(pdf.pages[n]):
            brut = " ".join(w["text"] for w in sorted(l, key=lambda w: w["x0"]))
            if re.match(r"^(Lecture|\+ ?Suite|Suite)", brut.lstrip("+✠ ")) or "Suite du saint Evangile" in brut:
                fin(); finlect()
                mode = "Evangelium" if "Evangile" in brut else "Lectio"
                lect = [brut.lstrip("+ ").strip()]
                coupe = False
                continue
            if mode:
                if plein(l) and not any(brut.startswith(k[0]) for k in SECTIONS):
                    lect.append(brut); continue
                if len(lect) == 1 and re.search(r"\d", brut) and len(brut) < 40:
                    lect.append("REF:" + brut); continue
                if re.match(r"^(Antiphona|Oratio|Graduale|Secreta|Postcommunio)", brut):
                    finlect()
                else:
                    lect.append(brut); continue
            if brut.startswith(COUPES) or brut.startswith("Alelúia") and coupe:
                coupe = True; continue
            for k, cle in SECTIONS:
                if brut.startswith(k):
                    fin(); coupe = False; sec = cle
                    break
            else:
                if sec is None or coupe:
                    continue
            if sec is None:
                continue
            mg = [w for w in l if w["x0"] < 300]; md = [w for w in l if w["x0"] >= 300]
            tg, td = texte(mg), texte(md)
            if tg: g.append(tg)
            if td: d.append(td)
    fin(); finlect()
    return rows

def net(s):
    s = re.sub(r"<span class=\"do-rubr\"><i>(Antiphona ad \w+|Antienne d[’'] ?\w+|Antienne de \w+|Graduale|Graduel|Oratio|Collecte|Secreta|Secrète|Postcommunion|Postcommunio)\s*", '<span class="do-rubr"><i>', s, count=1, flags=re.I)
    s = s.replace('<span class="do-rubr"><i></i></span>', "")
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"(?<=\w)- (?=\w)", "-", s)
    return re.sub(r"\s+", " ", s).strip()

def construire(chemin):
    res = {}
    with pdfplumber.open(chemin) as pdf:
        for cle, a, b in FETES:
            out = []
            for r in fete(pdf, a, b):
                if r[1] is None:
                    lect = r[2]
                    ref = next((x[4:] for x in lect if x.startswith("REF:")), "")
                    corps = " ".join(x for x in lect[1:] if not x.startswith("REF:"))
                    corps = re.sub(r"(?<=\w)- (?=\w)", "-", corps)
                    c = titre(r[0], html.escape(ref)) + html.escape(lect[0]) + "<br> " + html.escape(corps)
                    out.append([c, c])
                else:
                    out.append([titre(r[0]) + net(r[1]), titre(r[0]) + net(r[2])])
            res[cle] = out
    return res

if __name__ == "__main__":
    res = construire(sys.argv[1])
    pathlib.Path(sys.argv[2]).write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    for k, v in res.items():
        print("==", k, len(v))
        for la, fr in v:
            print(re.sub(r"<[^>]+>", "", la)[:230]); print("   FR:", re.sub(r"<[^>]+>", "", fr)[:150])
