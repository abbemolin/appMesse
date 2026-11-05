#!/usr/bin/env python3
"""Assemble data/messe/smmd.json : PDF de la communauté + commun Os Justi (C5) pour le B. Sopocko."""
import json, pathlib, re, sys

SRC, DO, OUT = sys.argv[1:4]
src = json.load(open(SRC, encoding="utf-8"))

def section(lang, fichier, cle):
    t = pathlib.Path(DO, lang, "Commune", fichier + ".txt").read_text(encoding="utf-8")
    m = re.search(r"^\[" + re.escape(cle) + r"\]\s*$(.*?)(?=^\[|\Z)", t, re.M | re.S)
    if not m:
        # Absent en français : même renvoi que le latin
        t2 = pathlib.Path(DO, "Latin", "Commune", fichier + ".txt").read_text(encoding="utf-8")
        m = re.search(r"^\[" + re.escape(cle) + r"\]\s*$(.*?)(?=^\[|\Z)", t2, re.M | re.S)
    corps = m.group(1).strip()
    if corps.startswith("@Commune/"):
        return section(lang, corps.split("/", 1)[1].split()[0].split(":")[0], cle)
    return corps

def ligne(cle, corps, latin):
    out = [f'<span class="do-titre"><b><i>{cle}</i></b></span> <br>']
    for l in corps.splitlines():
        l = l.strip()
        if not l or l.startswith("_"):
            continue
        if l.startswith("!"):
            out.append(f'<span class="do-rubr"><i>{l[1:]}</i></span><br>')
        elif l == "&Gloria":
            out.append('<span class="do-rubr"><i>℣.</i></span> ' + ("Glória Patri." if latin else "Gloire au Père.") + "<br>")
        elif l.startswith(("&", "$")):
            continue
        else:
            l = re.sub(r"^v\.\s*", "", l)
            l = re.sub(r"^V\.\s*", '<span class="do-rubr"><i>℣.</i></span> ', l)
            l = re.sub(r"\s*\((Allelúja, allelúja|Alléluia, alléluia|Allelúja|Alléluia)\.?\)", "", l)
            out.append(l + "<br>")
    s = " ".join(out)
    return s.replace("j", "i").replace("J", "I").replace('do-rubr', 'do-rubr') if latin else s

def os_iusti(cle):
    return [ligne(cle, section("Latin", "C5", cle), True), ligne(cle, section("Francais", "C5", cle), False)]

def sopocko(rows):
    par = {re.search(r"<i>(\w+)</i>", r[0]).group(1): r for r in rows}
    ordre = [("Introitus", os_iusti("Introitus")), ("Oratio", par["Oratio"]), ("Lectio", par["Lectio"]),
             ("Graduale", os_iusti("Graduale")), ("Evangelium", par["Evangelium"]),
             ("Offertorium", os_iusti("Offertorium")), ("Secreta", par["Secreta"]),
             ("Communio", os_iusti("Communio")), ("Postcommunio", par["Postcommunio"])]
    return [r for _, r in ordre]

FETES = [
 ("12-01", "foucauld", "S. Charles de Foucauld", "3e classe", 3),
 ("02-15", "sopocko", "B. Michel Sopocko", "3e classe", 3),
 ("10-05", "faustine", "Ste Faustine", "1re classe", 1),
 ("10-22", "jean-paul-ii", "S. Jean-Paul II", "3e classe", 3),
 ("11-16", "notre-dame", "Notre-Dame de la Miséricorde", "3e classe", 3),
]
res = {}
for jour, cle, titre, classe, rang in FETES:
    lignes = sopocko(src[cle]) if cle == "sopocko" else src[cle]
    res[jour] = {"titre": titre, "titre_fr": titre, "classe": classe, "rang": rang, "couleur": "Blanc", "lignes": lignes}
res["02-15"]["trait"] = os_iusti("Tractus")
pathlib.Path(OUT).write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print({k: len(v["lignes"]) for k, v in res.items()})
