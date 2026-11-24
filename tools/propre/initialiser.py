#!/usr/bin/env python3
"""Crée propre/calendrier.json la première fois : fêtes de la communauté (messe tirée de data/messe/smmd.json)
et propre de Strasbourg (communs choisis par l'abbé Molin le 24 novembre 2026). Ne sert qu'une fois."""
import html, json, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parents[2]

def vers_do(cellule):
    """HTML d'une pièce (format data/messe) → texte au format Divinum Officium."""
    t = re.sub(r'^\s*<span class="do-titre"><b><i>[^<]*</i></b></span>\s*(<br>\s*)?', "", cellule)
    t = re.sub(r'<span class="do-rubr"><i>\s*℣\.?\s*</i></span>\s*', "\nV. ", t)
    t = re.sub(r'<span class="do-rubr"><i>\s*℟\.?\s*</i></span>\s*', "\nR. ", t)
    # Références (avec un chiffre) : ligne de rubrique ; autres rubriques (« T. P. ») : gardées dans le texte
    t = re.sub(r'<span class="do-rubr"><i>([^<]*)</i></span>\s*(<br>)?',
               lambda m: f"\n!{m.group(1).strip()}\n" if re.search(r"\d", m.group(1)) else m.group(1).strip() + " ", t)
    t = re.sub(r"<br\s*/?>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    lignes = [re.sub(r"\s+", " ", l).strip() for l in t.split("\n")]
    lignes = [l for l in lignes if l]
    lignes = ["&Gloria" if re.fullmatch(r"V\. (Gl[óo]ria Patri|Gloire au P[èe]re)\.?", l) else l for l in lignes]
    # « Per Dóminum. » final : conclusion donnée par le moteur
    if lignes:
        fin = re.sub(r"\s*(Per (eúndem )?D[óo]minum|Par (le même )?(Notre-Seigneur|Jésus-Christ))[^.]*\.?\s*$", "", lignes[-1])
        if fin != lignes[-1]:
            lignes[-1:] = [x for x in (fin, "$Per Dominum") if x]
    return "\n".join(lignes)

def messe_smmd(jour):
    m = json.loads((RACINE / "data/messe/smmd.json").read_text(encoding="utf-8"))[jour]
    res = {}
    for la, fr in m["lignes"]:
        cle = re.search(r'<span class="do-titre"><b><i>([^<]+)</i>', la).group(1).strip()
        res[cle] = {"la": vers_do(la), "fr": vers_do(fr)}
    if m.get("trait"):
        res["Tractus"] = {"la": vers_do(m["trait"][0]), "fr": vers_do(m["trait"][1])}
    return res

def fete(id, groupe, date, nom_la, nom_fr, rang, commun, nom_or=None, base=None, romain="commemorer", messe=None, note=""):
    f = {"id": id, "groupe": groupe, "date": date, "nom_la": nom_la, "nom_fr": nom_fr, "rang": rang, "commun": commun,
         "base": base, "romain": romain, "nom_oraison": nom_or or {}, "office": {}, "messe": messe or {}, "note": note}
    if messe and messe.get("Oratio"):
        f["office"]["Oratio"] = messe["Oratio"]
    return f

FETES = [
    fete("foucauld", "communaute", "12-01", "S. Caroli de Foucauld Presbyteri", "Saint Charles de Foucauld, prêtre", 3, "C5",
         {"la": "Cároli", "fr": "Charles"}, messe=messe_smmd("12-01")),
    fete("sopocko", "communaute", "02-15", "B. Michaëlis Sopoćko Presbyteri", "Bienheureux Michel Sopoćko, prêtre", 3, "C5",
         {"la": "Michaëlis", "fr": "Michel"}, messe=messe_smmd("02-15")),
    fete("faustine", "communaute", "10-05", "S. Faustinæ Virginis", "Sainte Faustine, vierge", 1, "C6a",
         {"la": "Faustínæ Vírginis tuæ", "fr": "Faustine, votre vierge"}, messe=messe_smmd("10-05")),
    fete("jean-paul-ii", "communaute", "10-22", "S. Joannis Pauli II Papæ", "Saint Jean-Paul II, pape", 3, "C4b",
         {"la": "Joánnem Paulum", "fr": "Jean-Paul"}, messe=messe_smmd("10-22")),
    fete("notre-dame-misericorde", "communaute", "11-16", "Beatæ Mariæ Virginis Matris Misericordiæ", "Notre-Dame de la Miséricorde", 3, "C11",
         messe=messe_smmd("11-16")),
    fete("leon-ix", "strasbourg", "04-19", "S. Leonis IX Papæ Confessoris", "Saint Léon IX, pape", 2, "C4", {"la": "Leónem", "fr": "Léon"}),
    fete("arbogast", "strasbourg", "07-21", "S. Arbogasti Episcopi Confessoris", "Saint Arbogast, évêque, patron du diocèse", 2, "C4", {"la": "Arbogástum", "fr": "Arbogast"}),
    fete("dedicace-cathedrale", "strasbourg", "09-07", "In Dedicatione Ecclesiæ Cathedralis", "Dédicace de la Cathédrale", 2, "C8"),
    fete("odile", "strasbourg", "12-13", "S. Odiliæ Abbatissæ Virginis", "Sainte Odile, abbesse, patronne de l’Alsace", 2, "C6a",
         {"la": "Odíliæ Vírginis tuæ", "fr": "Odile, votre vierge"}, romain="omettre"),
    fete("translation-odile", "strasbourg", "07-07", "In Translatione S. Odiliæ Virginis", "Translation des reliques de Sainte Odile", 3, "C6a",
         {"la": "Odíliæ Vírginis tuæ", "fr": "Odile, votre vierge"}),
    fete("materne", "strasbourg", "09-12", "S. Materni Episcopi et Sociorum", "Saint Materne et les premiers apôtres de l’Alsace", 3, "C4",
         {"la": "Matérnum", "fr": "Materne"}, romain="omettre"),
    fete("eugenie-attale", "strasbourg", "09-25", "Ss. Eugeniæ et Attalæ Virginum", "Saintes Eugénie et Attale, vierges", 3, "C6a",
         {"la": "Eugéniæ et Attalæ Vírginum tuárum", "fr": "Eugénie et Attale, vos vierges"}, note="Commun d'une vierge : oraison propre au pluriel à saisir."),
    fete("amand", "strasbourg", "10-26", "S. Amandi Episcopi Confessoris", "Saint Amand, premier évêque de Strasbourg", 3, "C4", {"la": "Amándum", "fr": "Amand"}),
    fete("florent", "strasbourg", "11-07", "S. Florentii Episcopi Confessoris", "Saint Florent, évêque", 3, "C4", {"la": "Floréntium", "fr": "Florent"}),
    fete("lucie", "strasbourg", "12-15", "S. Luciæ Virginis et Martyris", "Sainte Lucie, vierge et martyre", 3, "", base="12-13"),
]
MENTIONS = [("01-27", "S. Amarin, abbé"), ("02-01", "Ste Brigide, abbesse"), ("02-12", "S. Ludan, pèlerin"),
    ("02-13", "S. Benoît d’Aniane, abbé"), ("03-06", "S. Fridolin, moine missionnaire"), ("05-25", "S. Urbain Ier, pape"),
    ("06-04", "S. Morand, moine"), ("06-19", "Ss. Modeste Andlauer et André Bauer, martyrs"), ("07-04", "S. Ulrich, évêque"),
    ("07-20", "S. Apollinaire, évêque et martyr"), ("08-12", "B. Jean-Georges Rehm, prêtre et martyr"), ("08-30", "S. Adelphe, évêque"),
    ("09-09", "Bse Mère Alphonse-Marie"), ("09-11", "Saint Nom de Marie"), ("09-17", "S. Lambert, évêque et martyr"),
    ("09-18", "Ste Richarde, impératrice"), ("09-22", "S. Maurice et ses compagnons, martyrs"), ("10-05", "S. Léger, évêque et martyr"),
    ("10-13", "Ste Aurélie, vierge"), ("10-16", "S. Gall, missionnaire"), ("11-03", "S. Pirmin, évêque"), ("12-16", "Ste Adélaïde, impératrice")]

cal = {"version": 1, "fetes": FETES, "mentions": [{"date": d, "nom": n, "groupe": "strasbourg"} for d, n in MENTIONS]}
sortie = RACINE / "propre" / "calendrier.json"
sortie.write_text(json.dumps(cal, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(sortie, len(FETES), "fêtes,", len(MENTIONS), "mentions")
