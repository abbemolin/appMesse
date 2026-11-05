// Titres liturgiques en français, partagés par le Bréviaire et la Messe
// Titres que Divinum Officium ne donne pas (ou mal) en français
const TITRES_FR = {
    'Dominica II Passionis seu in Palmis': 'Dimanche des Rameaux',
    'Dominica Sanctissimæ Trinitatis': 'Dimanche de la Très Sainte Trinité',
    'Beatæ Mariæ Virginis Reginæ': 'Bienheureuse Vierge Marie Reine',
    'Die Quarta Januarii': '4 janvier',
    'Die Quinta Januarii': '5 janvier',
    'Die Duodecima Januarii': '12 janvier',
    'In Cathedra S. Petri Apostoli': 'Chaire de saint Pierre, Apôtre',
    'In Conceptione Immaculata Beatæ Mariæ Virginis': 'Immaculée Conception de la Bienheureuse Vierge Marie',
    'In Conversione S. Pauli Apostoli': 'Conversion de saint Paul, Apôtre',
    'In Purificatione Beatæ Mariæ Virginis': 'Purification de la Bienheureuse Vierge Marie',
    'In Visitatione B. Mariæ Virginis': 'Visitation de la Bienheureuse Vierge Marie',
    'Sabbato Sancto': 'Samedi saint',
    'Sanctæ Mariæ Sabbato': 'Sainte Marie au samedi',
    'S. Agathæ Virginis et Martyris': 'Ste Agathe, Vierge et Martyre',
    'S. Agnetis Virginis et Martyris': 'Ste Agnès, Vierge et Martyre',
    'S. Andreæ Corsini Episcopi et Confessoris': 'S. André Corsini, Évêque et Confesseur',
    'S. Anselmi Episcopi Confessoris et Ecclesiæ Doctoris': 'S. Anselme, Évêque, Confesseur et Docteur de l’Église',
    'S. Catharinæ Senensis Virginis': 'Ste Catherine de Sienne, Vierge',
    'S. Cyrilli Episc. Alexandrini Confessoris et Ecclesiæ Doctoris': 'S. Cyrille d’Alexandrie, Évêque, Confesseur et Docteur de l’Église',
    'S. Fidelis de Sigmaringa Martyris': 'S. Fidèle de Sigmaringen, Martyr',
    'S. Francisci Salesii Episcopi Confessoris et Ecclesiæ Doctoris': 'S. François de Sales, Évêque, Confesseur et Docteur de l’Église',
    'S. Hermenegildi Martyris': 'S. Herménégilde, Martyr',
    'S. Ignatii Episcopi et Martyris': 'S. Ignace, Évêque et Martyr',
    'S. Joannis Chrysostomi Episcopi Confessoris et Ecclesiæ Doctoris': 'S. Jean Chrysostome, Évêque, Confesseur et Docteur de l’Église',
    'S. Joannis de Matha Confessoris': 'S. Jean de Matha, Confesseur',
    'S. Joseph Sponsi B.M.V. Confessoris': 'S. Joseph, Époux de la Bienheureuse Vierge Marie, Confesseur',
    'S. Justini Martyris': 'S. Justin, Martyr',
    'S. Marie Madeleine de Pazzi Virginis': 'Ste Marie-Madeleine de Pazzi, Vierge',
    'S. Martinæ Virginis et Martyris': 'Ste Martine, Vierge et Martyre',
    'S. Matthiæ Apostoli': 'S. Matthias, Apôtre',
    'S. Pauli Primi Eremitae Confessoris': 'S. Paul, premier Ermite, Confesseur',
    'S. Pauli a Cruce Confessoris': 'S. Paul de la Croix, Confesseur',
    'S. Petri Nolasci Confessoris': 'S. Pierre Nolasque, Confesseur',
    'S. Polycarpi Episcopi et Martyris': 'S. Polycarpe, Évêque et Martyr',
    'S. Raymundi de Peñafort Confessoris': 'S. Raymond de Peñafort, Confesseur',
    'S. Stanislai Episcopi et Martyris': 'S. Stanislas, Évêque et Martyr',
    'S. Titi Episcopi et Confessoris': 'S. Tite, Évêque et Confesseur',
};
const JOURS_FERIE = { secunda: 'Lundi', ii: 'Lundi', tertia: 'Mardi', iii: 'Mardi', quarta: 'Mercredi', iv: 'Mercredi',
                      quinta: 'Jeudi', v: 'Jeudi', sexta: 'Vendredi', vi: 'Vendredi' };

function romainVersEntier(r) {
    const v = { I: 1, V: 5, X: 10, L: 50 };
    return [...r].reduce((t, c, i, a) => t + (v[c] < (v[a[i + 1]] || 0) ? -v[c] : v[c]), 0);
}

const rangFr = n => n === 1 ? '1re' : n + 'e';

function titreFrancais(t) {
    t = t.replace(/\s+\d+(?:er|e) d(?:e |’|')\S+$/, '').replace('dans l’Octave de la Pentecôte', 'après l’Octave de la Pentecôte').trim();
    if (TITRES_FR[t]) return TITRES_FR[t];
    let m = t.match(/^Feria (\w+) infra Hebdomadam ([IVXL]+) post Octavam Pentecostes$/i);
    if (m && JOURS_FERIE[m[1].toLowerCase()]) {
        return `${JOURS_FERIE[m[1].toLowerCase()]} de la ${rangFr(romainVersEntier(m[2]))} semaine après l’Octave de la Pentecôte`;
    }
    m = t.match(/^Dominica ([IVXL]+)\.? Post (Pentecosten|Pascha)$/i);
    if (m) {
        const n = romainVersEntier(m[1]);
        return `${n === 1 ? '1er' : n + 'e'} dimanche après ${/pascha/i.test(m[2]) ? 'Pâques' : 'la Pentecôte'}`;
    }
    return t;
}
