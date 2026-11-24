#!/usr/bin/env python3
"""Calendrier propre de La Croix glorieuse → fichiers de Divinum Officium.

Lit propre/calendrier.json et écrit, dans une copie du moteur (dossier web/) :
  - la version « Rubrics 1960 - Croix glorieuse » (code CG, fille de « Rubrics 1960 - 1960 »),
    déclarée dans Tabulae/data.txt et dans les listes [versions] de horas.dialog et missa.dialog ;
  - Tabulae/Kalendaria/CG.txt : seulement nos différences avec le calendrier de 1960 ;
  - horas|missa/Latin|Francais/Sancti/MM-JJcg.txt : une fête par fichier (commun + pièces propres) ;
  - la version « … communaute » (code CGC) : les fêtes de la communauté en 1re classe, pour proposer
    leur messe en second choix les jours où elles cèdent.

Usage : construire.py --do-root _do/web [--calendrier propre/calendrier.json]
"""
import argparse, json, pathlib, re, sys

VERSION = "Rubrics 1960 - Croix glorieuse"
VERSION_COMMUNAUTE = "Rubrics 1960 - Croix glorieuse communaute"
RANGS = {1: ("Duplex I classis", "6"), 2: ("Duplex II classis", "5"), 3: ("Duplex", "3"), "comm": ("Simplex", "1.1")}
RANGS_KAL = {1: "6", 2: "5", 3: "3", "comm": "1"}
CHAINE = ["1960", "1955", "1954", "1939", "1906", "1888", "1570"]   # calendrier de 1960 et ses bases
PIECES_OFFICE = ["Oratio", "Lectio4", "Lectio5", "Lectio6", "Responsory4", "Responsory5", "Responsory6",
                 "Ant 1", "Ant 2", "Ant 3", "Ant Matutinum", "Ant Laudes", "Ant Vespera",
                 "Hymnus Vespera", "Hymnus Matutinum", "Hymnus Laudes", "Capitulum Laudes", "Capitulum Vespera", "Invit"]
PIECES_MESSE = ["Introitus", "Oratio", "Lectio", "Graduale", "Tractus", "Sequentia", "Evangelium", "Offertorium", "Secreta", "Communio", "Postcommunio"]


def kalendrier(www, code):
    res = {}
    for l in (www / "Tabulae" / "Kalendaria" / f"{code}.txt").read_text(encoding="utf-8").splitlines():
        if "=" in l and not l.startswith(("#", "*")):
            jour, fichier = l.split("=")[:2]
            res[jour.strip()] = fichier.strip()
    return res


def romain(www, jour):
    """Fichier(s) de la fête romaine du jour dans le calendrier de 1960 (ex. « 07-21r~07-21 »), ou ''."""
    for code in CHAINE:
        f = kalendrier(www, code).get(jour)
        if f is not None:
            return "" if f.startswith("XXXXX") else f
    return ""


def ajouter_version(www):
    data = www / "Tabulae" / "data.txt"
    t = data.read_text(encoding="utf-8")
    for ligne in (f"{VERSION},CG,1960,1960,Rubrics 1960 - 1960", f"{VERSION_COMMUNAUTE},CGC,1960,1960,{VERSION}"):
        if ligne.split(",")[0] + "," not in t:
            t = t.replace("Rubrics 1960 - 2020 USA,NC,Newcal,Newcal,Rubrics 1960 - 1960\n",
                          "Rubrics 1960 - 2020 USA,NC,Newcal,Newcal,Rubrics 1960 - 1960\n" + ligne + "\n", 1)
    data.write_text(t, encoding="utf-8")
    for dialogue in (www / "horas" / "horas.dialog", www / "missa" / "missa.dialog"):
        t = dialogue.read_text(encoding="utf-8")
        def ajoute(m):
            liste = m.group(2)
            for v in (VERSION, VERSION_COMMUNAUTE):
                if v not in liste.split(","):
                    liste += "," + v
            return m.group(1) + liste
        t = re.sub(r"(^\[versions\]\n)([^\n]*)", ajoute, t, count=1, flags=re.M)
        dialogue.write_text(t, encoding="utf-8")


def texte(p, langue):
    v = (p or {}).get(langue) or ""
    return v.replace("\r\n", "\n").strip()


def fichier_fete(f, dossier, langue, base_romaine, base_texte=None):
    """Contenu d'un fichier Sancti (horas ou missa) pour une fête."""
    messe = dossier == "missa"
    lignes = []
    if base_romaine:
        lignes += [f"@Sancti/{base_romaine.split('~')[0]}", ""]
    nom = f["nom_la"] if langue == "Latin" else (f.get("nom_fr") or f["nom_la"])
    lignes += ["[Officium]", nom, ""]
    if langue == "Latin" and base_romaine:
        # Fête romaine reprise : seul le rang change (commun et règles du fichier romain)
        rang, num = RANGS[f["rang"]]
        rang_base = re.search(r"^\[Rank\]\s*\n(;;[^\n]*)", base_texte or "", re.M)
        vide = (re.search(r";;(vide|ex) [^;\n]+", rang_base.group(1)) if rang_base else None)
        lignes += ["[Rank]", f";;{rang};;{num}{vide.group(0) if vide else ''}", ""]
    elif langue == "Latin":
        rang, num = RANGS[f["rang"]]
        commun = f.get("commun") or ""
        vide = f";;vide {commun}" if commun else ""
        lignes += ["[Rank]", f";;{rang};;{num}{vide}", ""]
        regle = [f"vide {commun};" if commun else ""]
        if messe:
            regle.append("Gloria")
            if f["rang"] == 1:
                regle.append("Credo")
        else:
            regle.append("9 lectiones")
        lignes += ["[Rule]", *[r for r in regle if r], ""]
    nom_or = (f.get("nom_oraison") or {}).get("la" if langue == "Latin" else "fr")
    if nom_or:
        lignes += ["[Name]", nom_or, ""]
    pieces = f.get("messe" if messe else "office") or {}
    ordre = PIECES_MESSE if messe else PIECES_OFFICE
    # Messe : sans oraison propre de la messe, celle de l'office
    if messe and not texte(pieces.get("Oratio"), "la") and texte((f.get("office") or {}).get("Oratio"), "la"):
        pieces = dict(pieces, Oratio=f["office"]["Oratio"])
    for cle in ordre + [k for k in pieces if k not in ordre]:
        corps = texte(pieces.get(cle), "la" if langue == "Latin" else "fr")
        if corps:
            if cle == "Oratio" and "$Per" not in corps and "$Qui" not in corps:
                corps += "\n$Per Dominum"
            lignes += [f"[{cle}]", corps, ""]
    return "\n".join(lignes).rstrip() + "\n"


def construire(www, cal):
    ajouter_version(www)
    lignes_cg, lignes_cgc = [], []
    for f in sorted(cal["fetes"], key=lambda x: x["date"]):
        jour = f["date"]
        if not re.fullmatch(r"\d\d-\d\d", jour) or f["rang"] not in RANGS:
            sys.exit(f"Fête invalide : {f.get('id')}")
        ident = jour + "cg"
        base = romain(www, f["base"]) if f.get("base") else ""
        if f.get("base") and not base:
            sys.exit(f"{f['id']} : aucune fête romaine le {f['base']} à reprendre")
        for dossier in ("horas", "missa"):
            for langue in ("Latin", "Francais"):
                d = www / dossier / langue / "Sancti"
                d.mkdir(parents=True, exist_ok=True)
                bt = (www / dossier / "Latin" / "Sancti" / f"{base.split('~')[0]}.txt").read_text(encoding="utf-8") if base else None
                (d / f"{ident}.txt").write_text(fichier_fete(f, dossier, langue, base, bt), encoding="utf-8")
        fichiers = ident
        r = romain(www, jour)
        if r and f.get("romain", "commemorer") == "commemorer":
            fichiers += "~" + r
        lignes_cg.append(f"{jour}={fichiers}={f['nom_la']}={RANGS_KAL[f['rang']]}=")
        if f.get("groupe") == "communaute" and f["rang"] != 1:
            # Messe de la communauté proposée en second choix : la même fête, en 1re classe
            for dossier in ("horas", "missa"):
                for langue in ("Latin", "Francais"):
                    d = www / dossier / langue / "Sancti"
                    corps = f"@Sancti/{ident}\n\n[Officium]\n{f['nom_la'] if langue == 'Latin' else f.get('nom_fr') or f['nom_la']}\n"
                    if langue == "Latin":
                        corps += f"\n[Rank]\n;;Duplex I classis;;6;;vide {f.get('commun') or ''}\n"
                    (d / f"{jour}cgc.txt").write_text(corps, encoding="utf-8")
            lignes_cgc.append(f"{jour}={jour}cgc={f['nom_la']}=6=")
    k = www / "Tabulae" / "Kalendaria"
    (k / "CG.txt").write_text("#Calendrier propre de La Croix glorieuse : différences avec Rubrics 1960 - 1960\n"
                              + "\n".join(lignes_cg) + "\n", encoding="utf-8")
    (k / "CGC.txt").write_text("#Fêtes de la communauté en 1re classe (messe proposée en second choix)\n"
                               + "\n".join(lignes_cgc) + "\n", encoding="utf-8")
    return len(lignes_cg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--do-root", required=True)
    ap.add_argument("--calendrier", default=str(pathlib.Path(__file__).resolve().parents[2] / "propre" / "calendrier.json"))
    a = ap.parse_args()
    cal = json.loads(pathlib.Path(a.calendrier).read_text(encoding="utf-8"))
    n = construire(pathlib.Path(a.do_root) / "www", cal)
    print(f"Calendrier propre : {n} fêtes")


if __name__ == "__main__":
    main()
