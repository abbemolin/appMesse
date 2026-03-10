/**
 * ORDO 1962 — Moteur du calendrier liturgique selon le Missel Romain de 1962
 * Calcul dynamique pour n'importe quelle date de n'importe quelle année.
 *
 * API publique :
 *   Ordo1962.getDay(year, month, day)
 *   → { fete, rang, classe, couleur, saison, commemoration, temporal }
 *
 *   Ordo1962.getWeek(year, month, day)  // lundi de la semaine
 *   → tableau de 7 jours
 */

const Ordo1962 = (() => {

  // ══════════════════════════════════════════════════════════
  // 1. UTILITAIRES
  // ══════════════════════════════════════════════════════════

  function dateAdd(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function fromISO(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function diffDays(a, b) {
    return Math.round((a - b) / 86400000);
  }
  function dow(d) { // 0=dim, 1=lun … 6=sam
    return d.getDay();
  }

  // ══════════════════════════════════════════════════════════
  // 2. CALCUL DE PÂQUES (algorithme de Butcher / Meeus)
  // ══════════════════════════════════════════════════════════

  function paques(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  // ══════════════════════════════════════════════════════════
  // 3. FÊTES MOBILES DU TEMPORAL — ancrées sur Pâques
  // ══════════════════════════════════════════════════════════

  function getMobileFeasts(year) {
    const E  = paques(year);         // Pâques
    const feasts = {};

    function set(d, obj) {
      feasts[isoDate(d)] = obj;
    }

    // ── Temps Pascal ─────────────────────────────────────────
    set(E, { fete: 'Dimanche de Pâques', rang: 1, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,1),  { fete: 'Lundi de Pâques', rang: 1, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,2),  { fete: 'Mardi de Pâques', rang: 1, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,3),  { fete: 'Mercredi de Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,4),  { fete: 'Jeudi de Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,5),  { fete: 'Vendredi de Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,6),  { fete: 'Samedi de Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,7),  { fete: '2e Dimanche après Pâques (Dominica in Albis)', rang: 1, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,14), { fete: '3e Dimanche après Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,21), { fete: '4e Dimanche après Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });
    set(dateAdd(E,28), { fete: '5e Dimanche après Pâques', rang: 2, couleur: 'Blanc', saison: 'Temps Pascal' });

    // Rogations (lundi-mercredi avant Ascension)
    set(dateAdd(E,36), { fete: 'Lundi des Rogations', rang: 3, couleur: 'Violet', saison: 'Temps Pascal' });
    set(dateAdd(E,37), { fete: 'Mardi des Rogations', rang: 3, couleur: 'Violet', saison: 'Temps Pascal' });
    set(dateAdd(E,38), { fete: 'Mercredi des Rogations', rang: 3, couleur: 'Violet', saison: 'Temps Pascal' });

    // Ascension (39 jours après Pâques = jeudi)
    const ASC = dateAdd(E, 39);
    set(ASC, { fete: 'Ascension de Notre-Seigneur', rang: 1, couleur: 'Blanc', saison: "Temps de l'Ascension" });
    set(dateAdd(ASC,1), { fete: 'Vendredi après l\'Ascension', rang: 3, couleur: 'Blanc', saison: "Temps de l'Ascension" });
    set(dateAdd(ASC,2), { fete: 'Samedi après l\'Ascension', rang: 3, couleur: 'Blanc', saison: "Temps de l'Ascension" });
    set(dateAdd(ASC,3), { fete: '6e Dimanche après Pâques', rang: 2, couleur: 'Blanc', saison: "Temps de l'Ascension" });

    // Vigile de la Pentecôte
    set(dateAdd(E,48), { fete: 'Vigile de la Pentecôte', rang: 1, couleur: 'Rouge', saison: "Temps de l'Ascension" });

    // Pentecôte (49 jours après Pâques)
    const PENT = dateAdd(E, 49);
    set(PENT, { fete: 'Dimanche de la Pentecôte', rang: 1, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,1), { fete: 'Lundi de la Pentecôte', rang: 1, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,2), { fete: 'Mardi de la Pentecôte', rang: 1, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,3), { fete: 'Mercredi des Quatre-Temps de la Pentecôte', rang: 2, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,4), { fete: 'Jeudi de la Pentecôte', rang: 3, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,5), { fete: 'Vendredi des Quatre-Temps de la Pentecôte', rang: 2, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });
    set(dateAdd(PENT,6), { fete: 'Samedi des Quatre-Temps de la Pentecôte', rang: 2, couleur: 'Rouge', saison: 'Temps de la Pentecôte' });

    // Trinité (dimanche après Pentecôte)
    const TRIN = dateAdd(PENT, 7);
    set(TRIN, { fete: 'Fête de la Très Sainte Trinité', rang: 1, couleur: 'Blanc', saison: 'Temps après la Pentecôte' });

    // Fête-Dieu (jeudi après Trinité)
    const FD = dateAdd(TRIN, 4);
    set(FD, { fete: 'Fête du Saint-Sacrement (Corpus Christi)', rang: 1, couleur: 'Blanc', saison: 'Temps après la Pentecôte' });

    // Sacré-Cœur (vendredi après octave de la Fête-Dieu = 19 jours après Pentecôte + 7)
    const SC = dateAdd(PENT, 19);
    // Vendredi après la 2e semaine après Pentecôte
    const SC2 = dateAdd(TRIN, 11); // Vendredi après l'octave du Corpus
    set(SC2, { fete: 'Fête du Sacré-Cœur de Jésus', rang: 1, couleur: 'Rouge', saison: 'Temps après la Pentecôte' });

    // Dimanches après la Pentecôte (2e au 28e selon Pâques)
    for (let n = 2; n <= 28; n++) {
      const d = dateAdd(TRIN, (n-1)*7);
      if (d.getFullYear() === year || (n <= 4 && d.getFullYear() === year)) {
        const iso = isoDate(d);
        if (!feasts[iso]) {
          set(d, { fete: `${n}e Dimanche après la Pentecôte`, rang: 2, couleur: 'Vert', saison: 'Temps après la Pentecôte' });
        }
      }
    }

    // ── Semaine Sainte ───────────────────────────────────────
    const DOM_PALM = dateAdd(E, -7);
    set(DOM_PALM,    { fete: 'Dimanche des Rameaux et de la Passion', rang: 1, couleur: 'Rouge', saison: 'Semaine Sainte' });
    set(dateAdd(E,-6), { fete: 'Lundi Saint', rang: 1, couleur: 'Violet', saison: 'Semaine Sainte' });
    set(dateAdd(E,-5), { fete: 'Mardi Saint', rang: 1, couleur: 'Violet', saison: 'Semaine Sainte' });
    set(dateAdd(E,-4), { fete: 'Mercredi Saint', rang: 1, couleur: 'Violet', saison: 'Semaine Sainte' });
    set(dateAdd(E,-3), { fete: 'Jeudi Saint', rang: 1, couleur: 'Blanc', saison: 'Semaine Sainte' });
    set(dateAdd(E,-2), { fete: 'Vendredi Saint', rang: 1, couleur: 'Noir', saison: 'Semaine Sainte' });
    set(dateAdd(E,-1), { fete: 'Samedi Saint', rang: 1, couleur: 'Violet', saison: 'Semaine Sainte' });

    // ── Temps de la Passion ──────────────────────────────────
    const DOM_PASS = dateAdd(E, -14);
    set(DOM_PASS,      { fete: '1er Dimanche de la Passion', rang: 2, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-13), { fete: 'Lundi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-12), { fete: 'Mardi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-11), { fete: 'Mercredi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-10), { fete: 'Jeudi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-9),  { fete: 'Vendredi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });
    set(dateAdd(E,-8),  { fete: 'Samedi de la Passion', rang: 3, couleur: 'Violet', saison: 'Temps de la Passion' });

    // ── Carême ───────────────────────────────────────────────
    const CENDRES = dateAdd(E, -46);
    set(CENDRES, { fete: 'Mercredi des Cendres', rang: 1, couleur: 'Violet', saison: 'Temps du Carême' });

    // Dimanches de Carême
    const dimsCareme = [
      { off: -42, nom: '1er Dimanche du Carême' },
      { off: -35, nom: '2e Dimanche du Carême' },
      { off: -28, nom: '3e Dimanche du Carême' },
      { off: -21, nom: '4e Dimanche du Carême (Lætare)' },
    ];
    dimsCareme.forEach(({ off, nom }) => {
      set(dateAdd(E, off), { fete: nom, rang: 1, couleur: off === -21 ? 'Rose' : 'Violet', saison: 'Temps du Carême' });
    });

    // Féries du Carême (lun-sam de chaque semaine)
    for (let off = -45; off <= -15; off++) {
      const d = dateAdd(E, off);
      const w = dow(d);
      if (w === 0) continue; // dimanche déjà posé
      const iso = isoDate(d);
      if (feasts[iso]) continue;
      // Semaine
      const semaineNum = Math.ceil((off + 46) / 7);
      const joursNom = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      const jourNom = joursNom[w === 0 ? 6 : w - 1];
      // Quatre-Temps du Carême (Mercredi/Vendredi/Samedi de la 1re semaine)
      let rang = 3;
      let nom = `${jourNom} de la ${semaineNum}e semaine du Carême`;
      if (w === 3 && semaineNum === 1) { nom = 'Mercredi des Quatre-Temps du Carême'; rang = 2; }
      if (w === 5 && semaineNum === 1) { nom = 'Vendredi des Quatre-Temps du Carême'; rang = 2; }
      if (w === 6 && semaineNum === 1) { nom = 'Samedi des Quatre-Temps du Carême'; rang = 2; }
      set(d, { fete: nom, rang, couleur: 'Violet', saison: 'Temps du Carême' });
    }

    // ── Septuagésime ─────────────────────────────────────────
    set(dateAdd(E,-63), { fete: 'Dimanche de la Septuagésime', rang: 2, couleur: 'Violet', saison: 'Temps de la Septuagésime' });
    set(dateAdd(E,-56), { fete: 'Dimanche de la Sexagésime', rang: 2, couleur: 'Violet', saison: 'Temps de la Septuagésime' });
    set(dateAdd(E,-49), { fete: 'Dimanche de la Quinquagésime', rang: 2, couleur: 'Violet', saison: 'Temps de la Septuagésime' });
    set(dateAdd(E,-48), { fete: 'Lundi de la Quinquagésime', rang: 3, couleur: 'Violet', saison: 'Temps de la Septuagésime' });
    set(dateAdd(E,-47), { fete: 'Mardi de la Quinquagésime (Mardi Gras)', rang: 3, couleur: 'Violet', saison: 'Temps de la Septuagésime' });

    // Féries de Septuagésime et Sexagésime
    for (let off = -62; off <= -50; off++) {
      const d = dateAdd(E, off);
      if (dow(d) === 0) continue;
      const iso = isoDate(d);
      if (feasts[iso]) continue;
      set(d, { fete: null, rang: 4, couleur: 'Violet', saison: 'Temps de la Septuagésime' });
    }

    return feasts;
  }

  // ══════════════════════════════════════════════════════════
  // 4. TEMPORAL FIXE — Avent + Noël + Épiphanie
  // ══════════════════════════════════════════════════════════

  function getAdventAndXmas(year) {
    const feasts = {};

    function set(d, obj) { feasts[isoDate(d)] = obj; }

    // ── Avent ── 1er dimanche = dimanche le plus proche du 30 nov
    const nov30 = new Date(year, 10, 30);
    const dNov30 = dow(nov30);
    // Recul au dimanche précédent ou avancer
    const avOff = dNov30 === 0 ? 0 : -(dNov30);
    const ADV1 = dateAdd(nov30, avOff === 0 ? 0 : (7 - dNov30 < dNov30 ? 7 - dNov30 : -dNov30));

    // Recalcul propre : 1er dim de l'Avent = 4e dimanche avant Noël
    const noel = new Date(year, 11, 25);
    const dNoel = dow(noel);
    // jours jusqu'au dimanche précédent noël
    const joursDim = dNoel === 0 ? 0 : dNoel; // jours depuis dim précédent
    const DOM4 = dateAdd(noel, -(joursDim + 21)); // 3 semaines avant le dim de noël
    // 1er dimanche de l'avent = 4 semaines avant noël dim (approx)
    // Règle exacte: le dimanche le + proche du 30 nov (entre nov 27 et dec 3)
    const ADV1x = (() => {
      let d = new Date(year, 10, 27); // 27 nov
      while (dow(d) !== 0) d = dateAdd(d, 1);
      return d; // premier dimanche entre nov 27 et dec 3
    })();

    set(ADV1x,           { fete: "1er Dimanche de l'Avent", rang: 1, couleur: 'Violet', saison: "Temps de l'Avent" });
    set(dateAdd(ADV1x,7),{ fete: "2e Dimanche de l'Avent", rang: 1, couleur: 'Violet', saison: "Temps de l'Avent" });
    set(dateAdd(ADV1x,14),{ fete: "3e Dimanche de l'Avent (Gaudete)", rang: 1, couleur: 'Rose', saison: "Temps de l'Avent" });
    set(dateAdd(ADV1x,21),{ fete: "4e Dimanche de l'Avent", rang: 1, couleur: 'Violet', saison: "Temps de l'Avent" });

    // Féries de l'Avent (lun-sam)
    for (let i = 1; i <= 27; i++) {
      const d = dateAdd(ADV1x, i);
      const iso = isoDate(d);
      if (feasts[iso]) continue;
      if (dow(d) === 0) continue;
      const m = d.getMonth()+1, day = d.getDate();
      if (m === 12 && day >= 17 && day <= 23) {
        // Grandes féries
        const nomsFeries = { 17:'O Sapientia', 18:'O Adonai', 19:'O Radix Jesse', 20:'O Clavis David', 21:'O Oriens', 22:'O Rex Gentium', 23:'O Emmanuel' };
        set(d, { fete: `Férie de l'Avent — ${nomsFeries[day]}`, rang: 2, couleur: 'Violet', saison: "Temps de l'Avent" });
      } else {
        set(d, { fete: "Férie de l'Avent", rang: 3, couleur: 'Violet', saison: "Temps de l'Avent" });
      }
    }

    // Quatre-Temps de l'Avent (mercredi, vendredi, samedi de la 3e semaine de l'Avent)
    const ADV3 = dateAdd(ADV1x, 14);
    let qt = dateAdd(ADV3, 3); // mercredi
    set(qt, { fete: "Mercredi des Quatre-Temps de l'Avent", rang: 2, couleur: 'Violet', saison: "Temps de l'Avent" });
    qt = dateAdd(ADV3, 5); // vendredi
    set(qt, { fete: "Vendredi des Quatre-Temps de l'Avent", rang: 2, couleur: 'Violet', saison: "Temps de l'Avent" });
    qt = dateAdd(ADV3, 6); // samedi
    set(qt, { fete: "Samedi des Quatre-Temps de l'Avent", rang: 2, couleur: 'Violet', saison: "Temps de l'Avent" });

    // Vigile de la Nativité
    set(new Date(year, 11, 24), { fete: 'Vigile de la Nativité', rang: 1, couleur: 'Violet', saison: "Temps de l'Avent" });

    // ── Noël et son octave ───────────────────────────────────
    set(new Date(year, 11, 25), { fete: 'Nativité de Notre-Seigneur Jésus-Christ', rang: 1, couleur: 'Blanc', saison: 'Temps de Noël' });
    set(new Date(year, 11, 26), { fete: 'Saint Étienne, premier martyr', rang: 1, couleur: 'Rouge', saison: 'Temps de Noël' });
    set(new Date(year, 11, 27), { fete: 'Saint Jean, apôtre et évangéliste', rang: 1, couleur: 'Blanc', saison: 'Temps de Noël' });
    set(new Date(year, 11, 28), { fete: 'Saints Innocents, martyrs', rang: 1, couleur: 'Rouge', saison: 'Temps de Noël' });
    set(new Date(year, 11, 29), { fete: 'Saint Thomas de Cantorbéry, évêque et martyr', rang: 3, couleur: 'Rouge', saison: 'Temps de Noël' });
    set(new Date(year, 11, 30), { fete: 'Férie dans l\'Octave de la Nativité', rang: 3, couleur: 'Blanc', saison: 'Temps de Noël' });
    set(new Date(year, 11, 31), { fete: 'Saint Sylvestre, pape et confesseur', rang: 3, couleur: 'Blanc', saison: 'Temps de Noël' });

    // Dimanche dans l'octave de Noël (si existe entre 26 et 31 déc)
    for (let d2 = 26; d2 <= 31; d2++) {
      const dd = new Date(year, 11, d2);
      if (dow(dd) === 0) {
        feasts[isoDate(dd)] = { fete: 'Dimanche dans l\'Octave de la Nativité', rang: 2, couleur: 'Blanc', saison: 'Temps de Noël' };
      }
    }

    // Octave de Noël = 1er janvier
    set(new Date(year, 0, 1), { fete: 'Octave de la Nativité — Circoncision de Notre-Seigneur', rang: 1, couleur: 'Violet', saison: 'Temps de Noël' });
    set(new Date(year, 0, 2), { fete: "Octave de Saint Étienne", rang: 3, couleur: 'Rouge', saison: 'Temps de Noël' });
    set(new Date(year, 0, 3), { fete: "Octave de Saint Jean", rang: 3, couleur: 'Blanc', saison: 'Temps de Noël' });
    set(new Date(year, 0, 4), { fete: "Octave des Saints Innocents", rang: 3, couleur: 'Rose', saison: 'Temps de Noël' });

    // ── Épiphanie ────────────────────────────────────────────
    set(new Date(year, 0, 6), { fete: "Épiphanie de Notre-Seigneur", rang: 1, couleur: 'Blanc', saison: "Temps de l'Épiphanie" });

    // Sainte Famille = 1er dimanche après l'Épiphanie
    const epiphanie = new Date(year, 0, 6);
    let sfam = dateAdd(epiphanie, 1);
    while (dow(sfam) !== 0) sfam = dateAdd(sfam, 1);
    set(sfam, { fete: 'Fête de la Sainte Famille', rang: 2, couleur: 'Blanc', saison: "Temps de l'Épiphanie" });

    // 1er dimanche après l'Épiphanie (= Sainte Famille) — géré ci-dessus
    // Dimanches 2e à 6e après l'Épiphanie
    const DIM1EP = sfam;
    for (let n = 2; n <= 6; n++) {
      const d = dateAdd(DIM1EP, (n-1)*7);
      // S'arrête si on arrive à la Septuagésime
      const iso = isoDate(d);
      if (!feasts[iso]) {
        set(d, { fete: `${n}e Dimanche après l'Épiphanie`, rang: 2, couleur: 'Vert', saison: "Temps après l'Épiphanie" });
      }
    }

    // Féries de l'Épiphanie (jan 7-12)
    for (let d2 = 7; d2 <= 12; d2++) {
      const dd = new Date(year, 0, d2);
      if (!feasts[isoDate(dd)]) {
        set(dd, { fete: "Férie dans l'Octave de l'Épiphanie", rang: 3, couleur: 'Blanc', saison: "Temps de l'Épiphanie" });
      }
    }
    set(new Date(year, 0, 13), { fete: "Octave de l'Épiphanie", rang: 2, couleur: 'Blanc', saison: "Temps de l'Épiphanie" });

    // Quatre-Temps de septembre (mercredi, vendredi, samedi après le 3e dimanche de septembre)
    const sep1 = new Date(year, 8, 1);
    let dimSep = new Date(sep1);
    while (dow(dimSep) !== 0) dimSep = dateAdd(dimSep, 1);
    const dim3Sep = dateAdd(dimSep, 14); // 3e dimanche
    const qtSep = dateAdd(dim3Sep, 3); // mercredi
    set(qtSep,             { fete: 'Mercredi des Quatre-Temps de septembre', rang: 2, couleur: 'Violet', saison: 'Temps après la Pentecôte' });
    set(dateAdd(qtSep,2),  { fete: 'Vendredi des Quatre-Temps de septembre', rang: 2, couleur: 'Violet', saison: 'Temps après la Pentecôte' });
    set(dateAdd(qtSep,3),  { fete: 'Samedi des Quatre-Temps de septembre', rang: 2, couleur: 'Violet', saison: 'Temps après la Pentecôte' });

    // Quatre-Temps de juin (mercredi, vendredi, samedi après la Trinité) — déjà fait dans mobile

    return feasts;
  }

  // ══════════════════════════════════════════════════════════
  // 5. SANCTORAL FIXE — 268 fêtes du missel 1962
  // ══════════════════════════════════════════════════════════

  const RANK_MAP = { '1re classe': 1, '2e classe': 2, '3e classe': 3, 'Mémoire': 4 };

  const SANCTORAL = [
    // JANVIER
    { m:1, d:2,  name:'Saints Nom de Jésus', rang:2, couleur:'Blanc' },
    { m:1, d:3,  name:'Sainte Geneviève, vierge', rang:3, couleur:'Blanc' },
    { m:1, d:5,  name:'Saint Télesphore, pape et martyr', rang:4, couleur:'Rouge' },
    { m:1, d:11, name:'Saint Hygin, pape et martyr', rang:4, couleur:'Rouge' },
    { m:1, d:14, name:'Saint Hilaire, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:1, d:15, name:'Saint Paul, premier ermite, confesseur', rang:3, couleur:'Blanc' },
    { m:1, d:16, name:'Saint Marcel Ier, pape et martyr', rang:4, couleur:'Rouge' },
    { m:1, d:17, name:'Saint Antoine, abbé', rang:3, couleur:'Blanc' },
    { m:1, d:18, name:'Sainte Prisque, vierge et martyre', rang:4, couleur:'Rouge' },
    { m:1, d:19, name:'Saints Marius, Marthe, Audifax et Abachus, martyrs', rang:4, couleur:'Rouge' },
    { m:1, d:19, name:'Saint Canut, roi et martyr', rang:4, couleur:'Rouge' },
    { m:1, d:20, name:'Saints Fabien et Sébastien, martyrs', rang:2, couleur:'Rouge' },
    { m:1, d:21, name:'Sainte Agnès, vierge et martyre', rang:2, couleur:'Rouge' },
    { m:1, d:22, name:'Saints Vincent et Anastase, martyrs', rang:3, couleur:'Rouge' },
    { m:1, d:23, name:'Saint Raymond de Peñafort, confesseur', rang:3, couleur:'Blanc' },
    { m:1, d:24, name:'Saint Timothée, évêque et martyr', rang:4, couleur:'Rouge' },
    { m:1, d:25, name:'Conversion de saint Paul, apôtre', rang:2, couleur:'Blanc' },
    { m:1, d:26, name:'Saint Polycarpe, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:1, d:27, name:'Saint Jean Chrysostome, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:1, d:28, name:'Saint Pierre Nolasque, confesseur', rang:3, couleur:'Blanc' },
    { m:1, d:29, name:'Saint François de Sales, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:1, d:31, name:'Saint Jean Bosco, confesseur', rang:3, couleur:'Blanc' },
    // FÉVRIER
    { m:2, d:1,  name:'Saint Ignace, évêque et martyr', rang:4, couleur:'Rouge' },
    { m:2, d:2,  name:'Purification de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:2, d:3,  name:'Saint Blaise, évêque et martyr', rang:4, couleur:'Rouge' },
    { m:2, d:4,  name:'Saint André Corsini, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:2, d:5,  name:'Sainte Agathe, vierge et martyre', rang:2, couleur:'Rouge' },
    { m:2, d:6,  name:'Saints Tite et Dorotée, martyrs', rang:4, couleur:'Rouge' },
    { m:2, d:7,  name:'Saint Romuald, abbé', rang:3, couleur:'Blanc' },
    { m:2, d:8,  name:'Saint Jean de Matha, confesseur', rang:3, couleur:'Blanc' },
    { m:2, d:9,  name:'Sainte Apolline, vierge et martyre', rang:4, couleur:'Rouge' },
    { m:2, d:10, name:'Sainte Scholastique, vierge', rang:3, couleur:'Blanc' },
    { m:2, d:11, name:'Apparition de la Très Sainte Vierge Marie à Lourdes', rang:3, couleur:'Blanc' },
    { m:2, d:14, name:'Saint Valentin, prêtre et martyr', rang:4, couleur:'Rouge' },
    { m:2, d:15, name:'Saints Faustin et Jovite, martyrs', rang:4, couleur:'Rouge' },
    { m:2, d:18, name:'Saint Siméon, évêque et martyr', rang:4, couleur:'Rouge' },
    { m:2, d:22, name:'Chaire de saint Pierre à Antioche', rang:2, couleur:'Blanc' },
    { m:2, d:23, name:'Saint Pierre Damien, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:2, d:24, name:'Saint Mathias, apôtre', rang:2, couleur:'Rouge' },
    { m:2, d:27, name:'Saint Gabriel de l\'Addolorata, confesseur', rang:3, couleur:'Blanc' },
    // MARS
    { m:3, d:4,  name:'Saint Casimir, confesseur', rang:3, couleur:'Blanc' },
    { m:3, d:6,  name:'Saints Perpétue et Félicité, martyres', rang:3, couleur:'Rouge' },
    { m:3, d:7,  name:'Saint Thomas d\'Aquin, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:3, d:8,  name:'Saint Jean de Dieu, confesseur', rang:3, couleur:'Blanc' },
    { m:3, d:9,  name:'Sainte Françoise Romaine, veuve', rang:3, couleur:'Blanc' },
    { m:3, d:12, name:'Saint Grégoire le Grand, pape, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:3, d:17, name:'Saint Patrice, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:3, d:18, name:'Saint Cyrille de Jérusalem, évêque, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:3, d:19, name:'Saint Joseph, époux de la Très Sainte Vierge Marie', rang:1, couleur:'Blanc' },
    { m:3, d:21, name:'Saint Benoît, abbé', rang:3, couleur:'Blanc' },
    { m:3, d:25, name:'Annonciation de la Très Sainte Vierge Marie', rang:1, couleur:'Blanc' },
    { m:3, d:27, name:'Saint Jean Damascène, confesseur et docteur', rang:4, couleur:'Blanc' },
    // AVRIL
    { m:4, d:2,  name:'Saint François de Paule, confesseur', rang:3, couleur:'Blanc' },
    { m:4, d:4,  name:'Saint Isidore de Séville, évêque, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:4, d:5,  name:'Saint Vincent Ferrier, confesseur', rang:3, couleur:'Blanc' },
    { m:4, d:11, name:'Saint Léon le Grand, pape, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:4, d:13, name:'Saint Herménégilde, martyr', rang:4, couleur:'Rouge' },
    { m:4, d:14, name:'Saint Justin, martyr', rang:4, couleur:'Rouge' },
    { m:4, d:17, name:'Saint Anicet, pape et martyr', rang:4, couleur:'Rouge' },
    { m:4, d:21, name:'Saint Anselme, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:4, d:22, name:'Saints Soter et Caïus, papes et martyrs', rang:4, couleur:'Rouge' },
    { m:4, d:23, name:'Saint Georges, martyr', rang:4, couleur:'Rouge' },
    { m:4, d:24, name:'Saint Fidèle de Sigmaringen, martyr', rang:4, couleur:'Rouge' },
    { m:4, d:25, name:'Saint Marc, évangéliste', rang:2, couleur:'Rouge' },
    { m:4, d:26, name:'Saints Clet et Marcellin, papes et martyrs', rang:4, couleur:'Rouge' },
    { m:4, d:27, name:'Saint Pierre Canisius, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:4, d:28, name:'Saint Paul de la Croix, confesseur', rang:3, couleur:'Blanc' },
    { m:4, d:29, name:'Saint Pierre de Vérone, martyr', rang:3, couleur:'Rouge' },
    { m:4, d:30, name:'Sainte Catherine de Sienne, vierge', rang:3, couleur:'Blanc' },
    // MAI
    { m:5, d:1,  name:'Saint Joseph, Artisan', rang:1, couleur:'Blanc' },
    { m:5, d:2,  name:'Saint Athanase, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:5, d:3,  name:'Saints Philippe et Jacques, apôtres', rang:2, couleur:'Rouge' },
    { m:5, d:4,  name:'Saint Monique, veuve', rang:3, couleur:'Blanc' },
    { m:5, d:5,  name:'Saint Pie V, pape et confesseur', rang:3, couleur:'Blanc' },
    { m:5, d:6,  name:'Saint Jean devant la Porte Latine', rang:3, couleur:'Rouge' },
    { m:5, d:7,  name:'Saint Stanislas, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:5, d:9,  name:'Saint Grégoire de Nazianze, évêque, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:5, d:10, name:'Saint Antonin, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:5, d:11, name:'Saints Mamert, Philippe de Neri — Mémoire', rang:4, couleur:'Blanc' },
    { m:5, d:12, name:'Saints Nérée, Achillée et Domitille, martyrs', rang:3, couleur:'Rouge' },
    { m:5, d:13, name:'Saint Robert Bellarmin, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:5, d:14, name:'Saint Boniface de Tarse, martyr', rang:4, couleur:'Rouge' },
    { m:5, d:15, name:'Saint Jean-Baptiste de La Salle, confesseur', rang:3, couleur:'Blanc' },
    { m:5, d:16, name:'Saint Ubald, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:5, d:17, name:'Saint Pascal Baylon, confesseur', rang:4, couleur:'Blanc' },
    { m:5, d:18, name:'Saint Venant, martyr', rang:4, couleur:'Rouge' },
    { m:5, d:19, name:'Saint Pierre Célestin, pape et confesseur', rang:4, couleur:'Blanc' },
    { m:5, d:20, name:'Saint Bernardin de Sienne, confesseur', rang:3, couleur:'Blanc' },
    { m:5, d:25, name:'Saint Grégoire VII, pape et confesseur', rang:4, couleur:'Blanc' },
    { m:5, d:26, name:'Saint Philippe Néri, confesseur', rang:3, couleur:'Blanc' },
    { m:5, d:27, name:'Saint Bède le Vénérable, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:5, d:28, name:'Saint Augustin de Cantorbéry, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:5, d:29, name:'Saint Marie-Madeleine de Pazzi, vierge', rang:4, couleur:'Blanc' },
    { m:5, d:30, name:'Sainte Jeanne d\'Arc, vierge', rang:3, couleur:'Blanc' },
    { m:5, d:31, name:'Sainte Reine de Marie (Notre-Dame de la Médaille Miraculeuse)', rang:3, couleur:'Blanc' },
    // JUIN
    { m:6, d:1,  name:'Saint Nicomède, martyr', rang:4, couleur:'Rouge' },
    { m:6, d:2,  name:'Saints Marcellin et Pierre, martyrs', rang:4, couleur:'Rouge' },
    { m:6, d:4,  name:'Saint François Caracciolo, confesseur', rang:3, couleur:'Blanc' },
    { m:6, d:5,  name:'Saint Boniface, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:6, d:6,  name:'Saint Norbert, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:6, d:9,  name:'Saints Félicien et Primor, martyrs', rang:4, couleur:'Rouge' },
    { m:6, d:10, name:'Sainte Marguerite, reine', rang:4, couleur:'Blanc' },
    { m:6, d:11, name:'Saint Barnabé, apôtre', rang:2, couleur:'Rouge' },
    { m:6, d:12, name:'Saint Jean de Sahagun, confesseur', rang:4, couleur:'Blanc' },
    { m:6, d:13, name:'Saint Antoine de Padoue, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:6, d:14, name:'Saint Basile le Grand, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:6, d:15, name:'Saints Vite, Modeste et Crescence, martyrs', rang:4, couleur:'Rouge' },
    { m:6, d:18, name:'Saint Ephrem, diacre, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:6, d:19, name:'Saints Gervais et Protais, martyrs', rang:3, couleur:'Rouge' },
    { m:6, d:20, name:'Saint Silverio, pape et martyr', rang:4, couleur:'Rouge' },
    { m:6, d:21, name:'Saint Aloyse de Gonzague, confesseur', rang:3, couleur:'Blanc' },
    { m:6, d:22, name:'Saint Paulin de Nole, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:6, d:24, name:'Nativité de saint Jean-Baptiste', rang:1, couleur:'Blanc' },
    { m:6, d:25, name:'Saint Guillaume de Verceil, abbé', rang:4, couleur:'Blanc' },
    { m:6, d:26, name:'Saints Jean et Paul, martyrs', rang:3, couleur:'Rouge' },
    { m:6, d:28, name:'Vigile de la fête de saints Pierre et Paul', rang:2, couleur:'Violet' },
    { m:6, d:29, name:'Saints Pierre et Paul, apôtres', rang:1, couleur:'Rouge' },
    { m:6, d:30, name:'Commémoraison de saint Paul, apôtre', rang:2, couleur:'Rouge' },
    // JUILLET
    { m:7, d:1,  name:'Précieux Sang de Notre-Seigneur', rang:1, couleur:'Rouge' },
    { m:7, d:2,  name:'Visitation de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:7, d:3,  name:'Saint Léon II, pape et confesseur', rang:4, couleur:'Blanc' },
    { m:7, d:4,  name:'Sainte Élisabeth de Portugal, reine', rang:3, couleur:'Blanc' },
    { m:7, d:5,  name:'Saint Antoine Zaccaria, confesseur', rang:4, couleur:'Blanc' },
    { m:7, d:7,  name:'Saints Cyrille et Méthode, évêques et confesseurs', rang:3, couleur:'Blanc' },
    { m:7, d:8,  name:'Saint Procope, martyr', rang:4, couleur:'Rouge' },
    { m:7, d:10, name:'Sept Frères martyrs, et saintes Rufine et Seconde, martyres', rang:3, couleur:'Rouge' },
    { m:7, d:11, name:'Saint Pie Ier, pape et martyr', rang:4, couleur:'Rouge' },
    { m:7, d:12, name:'Saint Jean Gualbert, abbé', rang:3, couleur:'Blanc' },
    { m:7, d:13, name:'Saint Anaclet, pape et martyr', rang:4, couleur:'Rouge' },
    { m:7, d:14, name:'Saint Bonaventure, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:7, d:15, name:'Saint Henri, empereur', rang:4, couleur:'Blanc' },
    { m:7, d:16, name:'Notre-Dame du Mont-Carmel', rang:3, couleur:'Blanc' },
    { m:7, d:17, name:'Saint Alexis, confesseur', rang:4, couleur:'Blanc' },
    { m:7, d:18, name:'Saint Camille de Lellis, confesseur', rang:3, couleur:'Blanc' },
    { m:7, d:19, name:'Saint Vincent de Paul, confesseur', rang:3, couleur:'Blanc' },
    { m:7, d:20, name:'Saint Jérôme Émilien, confesseur', rang:3, couleur:'Blanc' },
    { m:7, d:21, name:'Saint Praxède, vierge', rang:4, couleur:'Blanc' },
    { m:7, d:22, name:'Sainte Marie-Madeleine, pénitente', rang:3, couleur:'Blanc' },
    { m:7, d:23, name:'Saint Apollinaire de Ravenne, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:7, d:24, name:'Saint Christine, vierge et martyre', rang:4, couleur:'Rouge' },
    { m:7, d:25, name:'Saint Jacques le Majeur, apôtre', rang:2, couleur:'Rouge' },
    { m:7, d:26, name:'Sainte Anne, mère de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:7, d:27, name:'Saint Pantaléon, martyr', rang:4, couleur:'Rouge' },
    { m:7, d:28, name:'Saints Nazaire, Celse, Victor et Innocent, martyrs', rang:4, couleur:'Rouge' },
    { m:7, d:29, name:'Sainte Marthe, vierge', rang:3, couleur:'Blanc' },
    { m:7, d:30, name:'Saints Abdon et Sennen, martyrs', rang:4, couleur:'Rouge' },
    { m:7, d:31, name:'Saint Ignace de Loyola, confesseur', rang:3, couleur:'Blanc' },
    // AOÛT
    { m:8, d:1,  name:'Saint Pierre ès-Liens', rang:2, couleur:'Rouge' },
    { m:8, d:2,  name:'Saint Alphonse de Liguori, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:8, d:3,  name:'Invention des reliques de saint Étienne', rang:4, couleur:'Rouge' },
    { m:8, d:4,  name:'Saint Dominique, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:5,  name:'Dédicace de la basilique Sainte-Marie-Majeure', rang:3, couleur:'Blanc' },
    { m:8, d:6,  name:'Transfiguration de Notre-Seigneur', rang:2, couleur:'Blanc' },
    { m:8, d:7,  name:'Saint Gaétan, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:8,  name:'Saints Cyriac, Larges et Smaragde, martyrs', rang:4, couleur:'Rouge' },
    { m:8, d:9,  name:'Vigile de saint Laurent', rang:2, couleur:'Violet' },
    { m:8, d:10, name:'Saint Laurent, martyr', rang:1, couleur:'Rouge' },
    { m:8, d:11, name:'Saints Tiburce et Susanne, martyrs', rang:4, couleur:'Rouge' },
    { m:8, d:12, name:'Sainte Claire, vierge', rang:3, couleur:'Blanc' },
    { m:8, d:13, name:'Saints Hippolyte et Cassien, martyrs', rang:4, couleur:'Rouge' },
    { m:8, d:14, name:'Vigile de l\'Assomption', rang:2, couleur:'Violet' },
    { m:8, d:15, name:'Assomption de la Très Sainte Vierge Marie', rang:1, couleur:'Blanc' },
    { m:8, d:16, name:'Saint Joachim, père de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:8, d:17, name:'Saint Hyacinthe, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:18, name:'Sainte Hélène, impératrice', rang:4, couleur:'Blanc' },
    { m:8, d:19, name:'Saint Jean Eudes, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:20, name:'Saint Bernard, abbé, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:8, d:21, name:'Sainte Jeanne de Chantal, veuve', rang:3, couleur:'Blanc' },
    { m:8, d:22, name:'Immaculé-Cœur de Marie', rang:2, couleur:'Blanc' },
    { m:8, d:23, name:'Saint Philippe Béniti, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:24, name:'Saint Barthélémy, apôtre', rang:2, couleur:'Rouge' },
    { m:8, d:25, name:'Saint Louis, roi de France', rang:4, couleur:'Blanc' },
    { m:8, d:26, name:'Saint Zéphyrin, pape et martyr', rang:4, couleur:'Rouge' },
    { m:8, d:27, name:'Saint Joseph Calasanz, confesseur', rang:3, couleur:'Blanc' },
    { m:8, d:28, name:'Saint Augustin, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:8, d:29, name:'Décollation de saint Jean-Baptiste', rang:2, couleur:'Rouge' },
    { m:8, d:30, name:'Sainte Rose de Lima, vierge', rang:3, couleur:'Blanc' },
    { m:8, d:31, name:'Saint Raymond Nonnat, confesseur', rang:4, couleur:'Blanc' },
    // SEPTEMBRE
    { m:9, d:1,  name:'Saint Gilles, abbé', rang:4, couleur:'Blanc' },
    { m:9, d:2,  name:'Saint Étienne de Hongrie, roi', rang:4, couleur:'Blanc' },
    { m:9, d:5,  name:'Saint Laurent Justinien, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:9, d:8,  name:'Nativité de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:9, d:9,  name:'Saint Gorgon, martyr', rang:4, couleur:'Rouge' },
    { m:9, d:10, name:'Saint Nicolas de Tolentino, confesseur', rang:3, couleur:'Blanc' },
    { m:9, d:11, name:'Saints Prote et Hyacinthe, martyrs', rang:4, couleur:'Rouge' },
    { m:9, d:12, name:'Saint Nom de Marie', rang:3, couleur:'Blanc' },
    { m:9, d:14, name:'Exaltation de la Sainte Croix', rang:2, couleur:'Rouge' },
    { m:9, d:15, name:'Sept Douleurs de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:9, d:16, name:'Saints Corneille et Cyprien, martyrs', rang:3, couleur:'Rouge' },
    { m:9, d:17, name:'Saint Pierre d\'Alcantara, confesseur', rang:4, couleur:'Blanc' },
    { m:9, d:18, name:'Saint Joseph de Cupertino, confesseur', rang:4, couleur:'Blanc' },
    { m:9, d:19, name:'Saints Janvier, évêque, et compagnons, martyrs', rang:3, couleur:'Rouge' },
    { m:9, d:20, name:'Saints Eustache et compagnons, martyrs', rang:4, couleur:'Rouge' },
    { m:9, d:21, name:'Saint Matthieu, apôtre et évangéliste', rang:2, couleur:'Rouge' },
    { m:9, d:22, name:'Saint Thomas de Villeneuve, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:9, d:23, name:'Saint Lin, pape et martyr', rang:4, couleur:'Rouge' },
    { m:9, d:24, name:'Notre-Dame de la Merci', rang:3, couleur:'Blanc' },
    { m:9, d:26, name:'Saints Côme et Damien, martyrs', rang:3, couleur:'Rouge' },
    { m:9, d:27, name:'Saints Côme et Damien — Fête', rang:3, couleur:'Rouge' },
    { m:9, d:28, name:'Saint Wenceslas, martyr', rang:4, couleur:'Rouge' },
    { m:9, d:29, name:'Dédicace de saint Michel Archange', rang:1, couleur:'Blanc' },
    { m:9, d:30, name:'Saint Jérôme, prêtre, confesseur et docteur', rang:3, couleur:'Blanc' },
    // OCTOBRE
    { m:10, d:1,  name:'Saint Rémi, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:2,  name:'Saints Anges Gardiens', rang:2, couleur:'Blanc' },
    { m:10, d:3,  name:'Saint Thérèse de l\'Enfant-Jésus, vierge', rang:3, couleur:'Blanc' },
    { m:10, d:4,  name:'Saint François d\'Assise, confesseur', rang:3, couleur:'Blanc' },
    { m:10, d:5,  name:'Saint Placide et compagnons, martyrs', rang:4, couleur:'Rouge' },
    { m:10, d:6,  name:'Saint Bruno, confesseur', rang:3, couleur:'Blanc' },
    { m:10, d:7,  name:'Rosaire de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:10, d:8,  name:'Sainte Brigitte, veuve', rang:3, couleur:'Blanc' },
    { m:10, d:9,  name:'Saint Jean Léonard, confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:10, name:'Saint François de Borgia, confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:11, name:'Maternité divine de la Très Sainte Vierge Marie', rang:2, couleur:'Blanc' },
    { m:10, d:13, name:'Saint Édouard, roi et confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:14, name:'Saint Calliste Ier, pape et martyr', rang:3, couleur:'Rouge' },
    { m:10, d:15, name:'Sainte Thérèse d\'Avila, vierge', rang:3, couleur:'Blanc' },
    { m:10, d:16, name:'Saint Hedwige, veuve', rang:4, couleur:'Blanc' },
    { m:10, d:17, name:'Saint Marguerite Marie Alacoque, vierge', rang:3, couleur:'Blanc' },
    { m:10, d:18, name:'Saint Luc, évangéliste', rang:2, couleur:'Rouge' },
    { m:10, d:19, name:'Saint Pierre d\'Alcantara', rang:4, couleur:'Blanc' },
    { m:10, d:20, name:'Saint Jean de Capistran, confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:21, name:'Sainte Ursule et compagnes, martyres', rang:4, couleur:'Rouge' },
    { m:10, d:23, name:'Saint Antoine Marie Claret, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:10, d:24, name:'Saint Raphaël, archange', rang:2, couleur:'Blanc' },
    { m:10, d:25, name:'Saints Chrysanthe et Darie, martyrs', rang:4, couleur:'Rouge' },
    { m:10, d:26, name:'Saint Évariste, pape et martyr', rang:4, couleur:'Rouge' },
    { m:10, d:28, name:'Saints Simon et Jude, apôtres', rang:2, couleur:'Rouge' },
    // NOVEMBRE
    { m:11, d:1,  name:'Toussaint', rang:1, couleur:'Blanc' },
    { m:11, d:2,  name:'Commémoration des fidèles défunts', rang:1, couleur:'Noir' },
    { m:11, d:4,  name:'Saint Charles Borromée, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:11, d:8,  name:'Dédicace des Saints Michel, Gabriel et Raphaël', rang:4, couleur:'Blanc' },
    { m:11, d:9,  name:'Dédicace de la basilique du Latran', rang:2, couleur:'Blanc' },
    { m:11, d:10, name:'Saint André Avellin, confesseur', rang:4, couleur:'Blanc' },
    { m:11, d:11, name:'Saint Martin, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:11, d:12, name:'Saint Martin, pape et martyr', rang:4, couleur:'Rouge' },
    { m:11, d:13, name:'Saint Stanislas Kostka, confesseur', rang:3, couleur:'Blanc' },
    { m:11, d:14, name:'Saint Josaphat, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:11, d:15, name:'Saint Albert le Grand, évêque, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:11, d:16, name:'Saint Edmond, évêque et confesseur', rang:4, couleur:'Blanc' },
    { m:11, d:17, name:'Sainte Élisabeth de Hongrie, veuve', rang:3, couleur:'Blanc' },
    { m:11, d:18, name:'Dédicace des basiliques des saints Pierre et Paul', rang:3, couleur:'Blanc' },
    { m:11, d:19, name:'Sainte Élisabeth, veuve', rang:4, couleur:'Blanc' },
    { m:11, d:20, name:'Saint Félix de Valois, confesseur', rang:4, couleur:'Blanc' },
    { m:11, d:21, name:'Présentation de la Très Sainte Vierge Marie', rang:3, couleur:'Blanc' },
    { m:11, d:22, name:'Sainte Cécile, vierge et martyre', rang:3, couleur:'Rouge' },
    { m:11, d:23, name:'Saint Clément Ier, pape et martyr', rang:3, couleur:'Rouge' },
    { m:11, d:24, name:'Saint Jean de la Croix, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:11, d:25, name:'Sainte Catherine d\'Alexandrie, vierge et martyre', rang:4, couleur:'Rouge' },
    { m:11, d:26, name:'Saint Silvestre Gozzolini, abbé', rang:4, couleur:'Blanc' },
    { m:11, d:29, name:'Vigile de saint André', rang:2, couleur:'Violet' },
    { m:11, d:30, name:'Saint André, apôtre', rang:2, couleur:'Rouge' },
    // DÉCEMBRE
    { m:12, d:3,  name:'Saint François-Xavier, confesseur', rang:3, couleur:'Blanc' },
    { m:12, d:4,  name:'Saint Pierre Chrysologue, évêque, confesseur et docteur', rang:4, couleur:'Blanc' },
    { m:12, d:5,  name:'Saint Sabas, abbé', rang:4, couleur:'Blanc' },
    { m:12, d:6,  name:'Saint Nicolas, évêque et confesseur', rang:3, couleur:'Blanc' },
    { m:12, d:7,  name:'Saint Ambroise, évêque, confesseur et docteur', rang:3, couleur:'Blanc' },
    { m:12, d:8,  name:'Immaculée Conception de la Très Sainte Vierge Marie', rang:1, couleur:'Blanc' },
    { m:12, d:10, name:'Notre-Dame de Lorette', rang:3, couleur:'Blanc' },
    { m:12, d:11, name:'Saint Damase Ier, pape et confesseur', rang:4, couleur:'Blanc' },
    { m:12, d:13, name:'Sainte Lucie, vierge et martyre', rang:3, couleur:'Rouge' },
    { m:12, d:16, name:'Saint Eusèbe, évêque et martyr', rang:4, couleur:'Rouge' },
    { m:12, d:21, name:'Saint Thomas, apôtre', rang:2, couleur:'Rouge' },
    { m:12, d:26, name:'Saint Étienne, premier martyr', rang:1, couleur:'Rouge' },
    { m:12, d:27, name:'Saint Jean, apôtre et évangéliste', rang:1, couleur:'Blanc' },
    { m:12, d:28, name:'Saints Innocents, martyrs', rang:1, couleur:'Rouge' },
    { m:12, d:29, name:'Saint Thomas de Cantorbéry, évêque et martyr', rang:3, couleur:'Rouge' },
    { m:12, d:31, name:'Saint Sylvestre Ier, pape et confesseur', rang:3, couleur:'Blanc' },
  ];

  // ══════════════════════════════════════════════════════════
  // 6. RÈGLES DE PRÉSÉANCE — Missel de 1962
  //    rang 1 > 2 > 3 > 4 (Mémoire)
  //    Temporal > Sanctoral à rang égal
  // ══════════════════════════════════════════════════════════

  function couleurSaison(saison) {
    if (!saison) return 'Vert';
    if (saison.includes('Avent') || saison.includes('Carême') || saison.includes('Passion') || saison.includes('Septuagésime')) return 'Violet';
    if (saison.includes('Pascal') || saison.includes('Noël') || saison.includes('Épiphanie') || saison.includes('Ascension')) return 'Blanc';
    if (saison.includes('Pentecôte') && !saison.includes('après')) return 'Rouge';
    return 'Vert';
  }

  function getSaisonCourante(year, month, day) {
    const E = paques(year);
    const d = new Date(year, month-1, day);
    const diff = diffDays(d, E);

    if (diff >= -63 && diff < -49) return 'Temps de la Septuagésime';
    if (diff >= -49 && diff < -14) return 'Temps du Carême';
    if (diff >= -14 && diff < 0)   return 'Semaine Sainte';
    if (diff >= 0 && diff < 42)    return 'Temps Pascal';
    if (diff >= 42 && diff < 49)   return "Temps de l'Ascension";
    if (diff >= 49 && diff < 56)   return 'Temps de la Pentecôte';

    // Avent
    const noel = new Date(year, 11, 25);
    const dNoel = dow(noel);
    let adv1 = new Date(year, 10, 27);
    while (dow(adv1) !== 0) adv1 = dateAdd(adv1, 1);
    if (d >= adv1) return "Temps de l'Avent";
    if (month === 12 && day <= 31 && month >= 12 && d < adv1) return "Temps de l'Avent"; // ne devrait pas

    if (month === 1 && day <= 13) return "Temps de l'Épiphanie";
    if (month === 1 && day <= 31) return "Temps après l'Épiphanie";
    if (month === 12 && day >= 25) return 'Temps de Noël';

    return 'Temps après la Pentecôte';
  }

  // ══════════════════════════════════════════════════════════
  // 7. CALCUL PRINCIPAL — getDay(year, month, day)
  // ══════════════════════════════════════════════════════════

  const _cache = {};

  function getDay(year, month, day) {
    const key = `${year}-${month}-${day}`;
    if (_cache[key]) return _cache[key];

    const d = new Date(year, month-1, day);
    const iso = isoDate(d);

    // Construire le temporal de l'année (et de l'année précédente pour jan-jan)
    const mobileThis = getMobileFeasts(year);
    const mobilePrev = getMobileFeasts(year - 1);
    const fixedThis  = getAdventAndXmas(year);
    const fixedPrev  = getAdventAndXmas(year - 1);

    const allTemporal = { ...mobilePrev, ...fixedPrev, ...mobileThis, ...fixedThis };

    // Fête temporale du jour
    const temporalDay = allTemporal[iso] || null;

    // Fête(s) sanctorale(s) du jour
    const sanctoralDay = SANCTORAL.filter(f => f.m === month && f.d === day);

    // Saison courante (pour les jours sans fête temporale définie)
    const saison = temporalDay ? temporalDay.saison : getSaisonCourante(year, month, day);

    // Appliquer les règles de préséance
    let principale = null;
    let commemoration = null;

    if (temporalDay && sanctoralDay.length > 0) {
      const bestSanc = sanctoralDay.reduce((a, b) => a.rang <= b.rang ? a : b);

      if (temporalDay.rang <= bestSanc.rang) {
        // Temporal prend le dessus
        principale = { ...temporalDay, source: 'temporal' };
        // Commémoraison du sanctoral si rang 3 ou 4
        if (bestSanc.rang >= 3) {
          commemoration = bestSanc.name;
        }
        // Si temporal rang 1 et sanctoral rang 1 : cas exceptionnel (translation)
        if (temporalDay.rang === 1 && bestSanc.rang === 1) {
          // Même rang 1 des deux côtés : le temporal l'emporte déjà
          // Si c'est la même fête (ex: Noël + St Étienne qui est dans le temporal)
          // pas de commémoraison redondante
          commemoration = null;
        }
      } else {
        // Sanctoral prend le dessus
        principale = { fete: bestSanc.name, rang: bestSanc.rang, couleur: bestSanc.couleur, saison, source: 'sanctoral' };
        if (temporalDay.rang >= 3) {
          commemoration = temporalDay.fete;
        }
      }
    } else if (temporalDay) {
      principale = { ...temporalDay, source: 'temporal' };
    } else if (sanctoralDay.length > 0) {
      const best = sanctoralDay.reduce((a, b) => a.rang <= b.rang ? a : b);
      principale = { fete: best.name, rang: best.rang, couleur: best.couleur, saison, source: 'sanctoral' };
    } else {
      // Férie ordinaire
      const joursNom = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      const jourNom = joursNom[dow(d)];
      principale = {
        fete: null,
        rang: 4,
        couleur: couleurSaison(saison),
        saison,
        source: 'ferie'
      };
    }

    // Couleur liturgique finale
    if (!principale.couleur) {
      principale.couleur = temporalDay ? (temporalDay.couleur || couleurSaison(saison)) : couleurSaison(saison);
    }

    const result = {
      date: iso,
      fete: principale.fete || null,
      rang: principale.rang,
      classe: principale.rang === 1 ? '1re classe' : principale.rang === 2 ? '2e classe' : principale.rang === 3 ? '3e classe' : 'Mémoire',
      couleur: principale.couleur,
      saison: principale.saison || saison,
      source: principale.source,
      commemoration: commemoration || null,
      // Fêtes sanctorales secondaires (si plusieurs le même jour)
      autres: sanctoralDay.length > 1 ? sanctoralDay.slice(1).map(f => f.name) : [],
    };

    _cache[key] = result;
    return result;
  }

  function getWeek(year, month, day) {
    const lundi = new Date(year, month-1, day);
    return Array.from({length:7}, (_, i) => {
      const d = dateAdd(lundi, i);
      return getDay(d.getFullYear(), d.getMonth()+1, d.getDate());
    });
  }

  // ══════════════════════════════════════════════════════════
  // API PUBLIQUE
  // ══════════════════════════════════════════════════════════
  return { getDay, getWeek, paques, isoDate };

})();

// Export pour Node.js (tests) et navigateur
if (typeof module !== 'undefined') module.exports = Ordo1962;


// ══════════════════════════════════════════════════════════
// RÉSOLUTION DES PROPRES — getProperKey(ordoResult)
// Retourne "temporal/S/N" ou "sanctoral/M/N"
// ══════════════════════════════════════════════════════════
(function() {
  var FETES_TEMPORALES = {
  "1er dimanche de l'avent": "temporal/0/0",
  "2e dimanche de l'avent": "temporal/0/0",
  "3e dimanche de l'avent": "temporal/0/0",
  "4e dimanche de l'avent": "temporal/0/5",
  "mercredi des quatre-temps de l'avent": "temporal/0/3",
  "vendredi des quatre-temps de l'avent": "temporal/0/4",
  "samedi des quatre-temps de l'avent": "temporal/0/5",
  "vigile de la nativité": "temporal/0/5",
  "nativité de notre-seigneur": "temporal/1/0",
  "noël": "temporal/1/0",
  "dimanche dans l'octave de la nativité": "temporal/1/1",
  "octave de la nativité": "temporal/1/8",
  "fête du saint nom de jésus": "temporal/1/9",
  "épiphanie de notre-seigneur": "temporal/2/0",
  "épiphanie": "temporal/2/0",
  "fête de la sainte famille": "temporal/2/1",
  "1er dimanche après l'épiphanie": "temporal/2/2",
  "2e dimanche après l'épiphanie": "temporal/3/0",
  "3e dimanche après l'épiphanie": "temporal/3/0",
  "4e dimanche après l'épiphanie": "temporal/3/3",
  "5e dimanche après l'épiphanie": "temporal/3/3",
  "6e dimanche après l'épiphanie": "temporal/3/4",
  "dimanche de la septuagésime": "temporal/4/0",
  "dimanche de la sexagésime": "temporal/4/0",
  "dimanche de la quinquagésime": "temporal/4/2",
  "mercredi des cendres": "temporal/5/0",
  "jeudi après les cendres": "temporal/5/1",
  "vendredi après les cendres": "temporal/5/2",
  "samedi après les cendres": "temporal/5/3",
  "1er dimanche du carême": "temporal/5/4",
  "lundi de la 1re semaine du carême": "temporal/5/5",
  "mardi de la 1re semaine du carême": "temporal/5/5",
  "mercredi des quatre-temps du carême": "temporal/5/7",
  "jeudi de la 1re semaine du carême": "temporal/5/7",
  "vendredi des quatre-temps du carême": "temporal/5/9",
  "samedi des quatre-temps du carême": "temporal/5/10",
  "2e dimanche du carême": "temporal/5/11",
  "lundi de la 2e semaine du carême": "temporal/5/12",
  "mardi de la 2e semaine du carême": "temporal/5/13",
  "mercredi de la 2e semaine du carême": "temporal/5/14",
  "jeudi de la 2e semaine du carême": "temporal/5/12",
  "vendredi de la 2e semaine du carême": "temporal/5/16",
  "samedi de la 2e semaine du carême": "temporal/5/17",
  "3e dimanche du carême": "temporal/5/18",
  "lundi de la 3e semaine du carême": "temporal/5/19",
  "mardi de la 3e semaine du carême": "temporal/5/20",
  "mercredi de la 3e semaine du carême": "temporal/5/18",
  "jeudi de la 3e semaine du carême": "temporal/5/20",
  "vendredi de la 3e semaine du carême": "temporal/5/16",
  "samedi de la 3e semaine du carême": "temporal/5/17",
  "4e dimanche du carême": "temporal/5/25",
  "lundi de la 4e semaine du carême": "temporal/5/26",
  "mardi de la 4e semaine du carême": "temporal/5/27",
  "mercredi de la 4e semaine du carême": "temporal/5/28",
  "jeudi de la 4e semaine du carême": "temporal/5/29",
  "vendredi de la 4e semaine du carême": "temporal/5/30",
  "samedi de la 4e semaine du carême": "temporal/5/31",
  "dimanche de la passion": "temporal/6/0",
  "lundi de la passion": "temporal/6/1",
  "mardi de la passion": "temporal/6/1",
  "mercredi de la passion": "temporal/6/3",
  "jeudi de la passion": "temporal/6/4",
  "vendredi de la passion": "temporal/6/5",
  "samedi de la passion": "temporal/6/6",
  "dimanche des rameaux": "temporal/6/7",
  "lundi saint": "temporal/6/8",
  "mardi saint": "temporal/6/9",
  "mercredi saint": "temporal/6/10",
  "jeudi saint": "temporal/6/11",
  "vendredi saint": "temporal/6/12",
  "la vigile pascale": "temporal/6/13",
  "vigile pascale": "temporal/6/13",
  "samedi saint": "temporal/6/13",
  "dimanche de pâques": "temporal/7/0",
  "pâques": "temporal/7/0",
  "lundi de pâques": "temporal/7/1",
  "mardi de pâques": "temporal/7/2",
  "mercredi de pâques": "temporal/7/3",
  "jeudi de pâques": "temporal/7/3",
  "vendredi de pâques": "temporal/7/5",
  "samedi de pâques in albis": "temporal/7/5",
  "samedi de pâques": "temporal/7/5",
  "dimanche in albis": "temporal/7/7",
  "2e dimanche après pâques": "temporal/7/8",
  "3e dimanche après pâques": "temporal/7/10",
  "4e dimanche après pâques": "temporal/7/10",
  "5e dimanche après pâques": "temporal/7/11",
  "vigile de l'ascension": "temporal/7/11",
  "ascension de notre-seigneur": "temporal/8/0",
  "ascension": "temporal/8/0",
  "dimanche après l'ascension": "temporal/8/1",
  "vigile de la pentecôte": "temporal/8/2",
  "dimanche de la pentecôte": "temporal/8/3",
  "pentecôte": "temporal/8/3",
  "lundi de pentecôte": "temporal/8/4",
  "mardi de pentecôte": "temporal/8/5",
  "mercredi des quatre-temps de pentecôte": "temporal/8/6",
  "jeudi de pentecôte": "temporal/8/7",
  "vendredi des quatre-temps de pentecôte": "temporal/8/8",
  "samedi des quatre-temps de pentecôte": "temporal/8/9",
  "fête de la très sainte trinité": "temporal/9/0",
  "trinité": "temporal/9/0",
  "1er dimanche après la pentecôte": "temporal/9/1",
  "fête-dieu": "temporal/9/2",
  "corpus christi": "temporal/9/2",
  "2e dimanche après la pentecôte": "temporal/9/3",
  "fête du sacré-cœur de jésus": "temporal/9/4",
  "sacré-cœur": "temporal/9/4",
  "3e dimanche après la pentecôte": "temporal/9/6",
  "4e dimanche après la pentecôte": "temporal/9/6",
  "5e dimanche après la pentecôte": "temporal/9/7",
  "6e dimanche après la pentecôte": "temporal/9/7",
  "7e dimanche après la pentecôte": "temporal/9/9",
  "8e dimanche après la pentecôte": "temporal/9/10",
  "9e dimanche après la pentecôte": "temporal/9/10",
  "10e dimanche après la pentecôte": "temporal/9/12",
  "11e dimanche après la pentecôte": "temporal/9/13",
  "12e dimanche après la pentecôte": "temporal/9/14",
  "13e dimanche après la pentecôte": "temporal/9/15",
  "14e dimanche après la pentecôte": "temporal/9/16",
  "15e dimanche après la pentecôte": "temporal/9/17",
  "16e dimanche après la pentecôte": "temporal/9/18",
  "17e dimanche après la pentecôte": "temporal/9/19",
  "mercredi des quatre-temps d'automne": "temporal/9/20",
  "vendredi des quatre-temps d'automne": "temporal/9/21",
  "samedi des quatre-temps d'automne": "temporal/9/22",
  "18e dimanche après la pentecôte": "temporal/9/23",
  "19e dimanche après la pentecôte": "temporal/9/24",
  "20e dimanche après la pentecôte": "temporal/9/24",
  "21e dimanche après la pentecôte": "temporal/9/26",
  "22e dimanche après la pentecôte": "temporal/9/27",
  "23e dimanche après la pentecôte": "temporal/9/28",
  "24e dimanche après la pentecôte": "temporal/9/29",
  "dernier dimanche après la pentecôte": "temporal/9/30"
};
  var SANCTORAL_DATE   = {
  "01-03": [
    "sanctoral/1/0"
  ],
  "01-05": [
    "sanctoral/1/1"
  ],
  "01-11": [
    "sanctoral/1/2"
  ],
  "01-14": [
    "sanctoral/1/4"
  ],
  "01-15": [
    "sanctoral/1/6"
  ],
  "01-16": [
    "sanctoral/1/8"
  ],
  "01-17": [
    "sanctoral/1/10"
  ],
  "01-18": [
    "sanctoral/1/12"
  ],
  "01-19": [
    "sanctoral/1/13",
    "sanctoral/1/14"
  ],
  "01-20": [
    "sanctoral/1/15"
  ],
  "01-21": [
    "sanctoral/1/16"
  ],
  "01-22": [
    "sanctoral/1/17"
  ],
  "01-23": [
    "sanctoral/1/18"
  ],
  "01-24": [
    "sanctoral/1/20"
  ],
  "01-25": [
    "sanctoral/1/21"
  ],
  "01-26": [
    "sanctoral/1/22"
  ],
  "01-27": [
    "sanctoral/1/23"
  ],
  "01-28": [
    "sanctoral/1/24"
  ],
  "01-29": [
    "sanctoral/1/25"
  ],
  "01-30": [
    "sanctoral/1/26"
  ],
  "01-31": [
    "sanctoral/1/27"
  ],
  "02-01": [
    "sanctoral/2/1"
  ],
  "02-02": [
    "sanctoral/2/2"
  ],
  "02-03": [
    "sanctoral/2/3"
  ],
  "02-04": [
    "sanctoral/2/4"
  ],
  "02-05": [
    "sanctoral/2/5"
  ],
  "02-06": [
    "sanctoral/2/6"
  ],
  "02-07": [
    "sanctoral/2/7"
  ],
  "02-08": [
    "sanctoral/2/8"
  ],
  "02-09": [
    "sanctoral/2/9"
  ],
  "02-10": [
    "sanctoral/2/10"
  ],
  "02-11": [
    "sanctoral/2/11"
  ],
  "02-12": [
    "sanctoral/2/12"
  ],
  "02-14": [
    "sanctoral/2/14"
  ],
  "02-15": [
    "sanctoral/2/15"
  ],
  "02-18": [
    "sanctoral/2/17",
    "sanctoral/2/18"
  ],
  "02-22": [
    "sanctoral/2/22"
  ],
  "02-23": [
    "sanctoral/2/23"
  ],
  "02-24": [
    "sanctoral/2/24"
  ],
  "02-27": [
    "sanctoral/2/27"
  ],
  "03-04": [
    "sanctoral/3/3",
    "sanctoral/3/4"
  ],
  "03-06": [
    "sanctoral/3/6"
  ],
  "03-07": [
    "sanctoral/3/7"
  ],
  "03-08": [
    "sanctoral/3/8"
  ],
  "03-09": [
    "sanctoral/3/9"
  ],
  "03-10": [
    "sanctoral/3/10"
  ],
  "03-12": [
    "sanctoral/3/12"
  ],
  "03-17": [
    "sanctoral/3/17"
  ],
  "03-18": [
    "sanctoral/3/18"
  ],
  "03-19": [
    "sanctoral/3/19"
  ],
  "03-21": [
    "sanctoral/3/21"
  ],
  "03-24": [
    "sanctoral/3/24"
  ],
  "03-25": [
    "sanctoral/3/25"
  ],
  "03-27": [
    "sanctoral/3/27"
  ],
  "03-28": [
    "sanctoral/3/28"
  ],
  "04-02": [
    "sanctoral/4/2"
  ],
  "04-04": [
    "sanctoral/4/4"
  ],
  "04-05": [
    "sanctoral/4/5"
  ],
  "04-11": [
    "sanctoral/4/11"
  ],
  "04-13": [
    "sanctoral/4/13"
  ],
  "04-17": [
    "sanctoral/4/17"
  ],
  "04-21": [
    "sanctoral/4/21"
  ],
  "04-22": [
    "sanctoral/4/22"
  ],
  "04-23": [
    "sanctoral/4/23"
  ],
  "04-24": [
    "sanctoral/4/24"
  ],
  "04-25": [
    "sanctoral/4/25"
  ],
  "04-26": [
    "sanctoral/4/26"
  ],
  "04-27": [
    "sanctoral/4/27"
  ],
  "04-28": [
    "sanctoral/4/28"
  ],
  "04-29": [
    "sanctoral/4/29"
  ],
  "04-30": [
    "sanctoral/4/30"
  ],
  "05-01": [
    "sanctoral/5/1"
  ],
  "05-02": [
    "sanctoral/5/2"
  ],
  "05-03": [
    "sanctoral/5/3"
  ],
  "05-04": [
    "sanctoral/5/4"
  ],
  "05-05": [
    "sanctoral/5/5"
  ],
  "05-07": [
    "sanctoral/5/7"
  ],
  "05-09": [
    "sanctoral/5/9"
  ],
  "05-10": [
    "sanctoral/5/10"
  ],
  "05-11": [
    "sanctoral/5/11"
  ],
  "05-12": [
    "sanctoral/5/12"
  ],
  "05-13": [
    "sanctoral/5/13"
  ],
  "05-14": [
    "sanctoral/5/14"
  ],
  "05-16": [
    "sanctoral/5/16"
  ],
  "05-17": [
    "sanctoral/5/17"
  ],
  "05-19": [
    "sanctoral/5/19"
  ],
  "05-20": [
    "sanctoral/5/20"
  ],
  "05-25": [
    "sanctoral/5/25"
  ],
  "05-26": [
    "sanctoral/5/26"
  ],
  "05-27": [
    "sanctoral/5/27"
  ],
  "05-28": [
    "sanctoral/5/28"
  ],
  "05-29": [
    "sanctoral/5/29"
  ],
  "05-30": [
    "sanctoral/5/30"
  ],
  "05-31": [
    "sanctoral/5/31"
  ],
  "06-01": [
    "sanctoral/6/1"
  ],
  "06-03": [
    "sanctoral/6/3"
  ],
  "06-04": [
    "sanctoral/6/4"
  ],
  "06-05": [
    "sanctoral/6/5"
  ],
  "06-06": [
    "sanctoral/6/6"
  ],
  "06-09": [
    "sanctoral/6/9"
  ],
  "06-10": [
    "sanctoral/6/10"
  ],
  "06-11": [
    "sanctoral/6/11"
  ],
  "06-12": [
    "sanctoral/6/12"
  ],
  "06-13": [
    "sanctoral/6/13"
  ],
  "06-14": [
    "sanctoral/6/14"
  ],
  "06-15": [
    "sanctoral/6/15"
  ],
  "06-17": [
    "sanctoral/6/17"
  ],
  "06-18": [
    "sanctoral/6/18"
  ],
  "06-19": [
    "sanctoral/6/19"
  ],
  "06-20": [
    "sanctoral/6/20"
  ],
  "06-21": [
    "sanctoral/6/21"
  ],
  "06-22": [
    "sanctoral/6/22"
  ],
  "06-23": [
    "sanctoral/6/23"
  ],
  "06-24": [
    "sanctoral/6/24"
  ],
  "06-25": [
    "sanctoral/6/25"
  ],
  "06-26": [
    "sanctoral/6/26"
  ],
  "06-28": [
    "sanctoral/6/28"
  ],
  "06-29": [
    "sanctoral/6/29"
  ],
  "06-30": [
    "sanctoral/6/30"
  ],
  "07-01": [
    "sanctoral/7/1"
  ],
  "07-02": [
    "sanctoral/7/2"
  ],
  "07-03": [
    "sanctoral/7/3"
  ],
  "07-05": [
    "sanctoral/7/5"
  ],
  "07-07": [
    "sanctoral/7/7"
  ],
  "07-08": [
    "sanctoral/7/8"
  ],
  "07-10": [
    "sanctoral/7/10"
  ],
  "07-11": [
    "sanctoral/7/11"
  ],
  "07-12": [
    "sanctoral/7/12"
  ],
  "07-14": [
    "sanctoral/7/14"
  ],
  "07-15": [
    "sanctoral/7/15"
  ],
  "07-16": [
    "sanctoral/7/16"
  ],
  "07-17": [
    "sanctoral/7/17"
  ],
  "07-18": [
    "sanctoral/7/18"
  ],
  "07-19": [
    "sanctoral/7/19"
  ],
  "07-20": [
    "sanctoral/7/20"
  ],
  "07-21": [
    "sanctoral/7/21"
  ],
  "07-22": [
    "sanctoral/7/22"
  ],
  "07-23": [
    "sanctoral/7/23"
  ],
  "07-24": [
    "sanctoral/7/24"
  ],
  "07-25": [
    "sanctoral/7/25"
  ],
  "07-26": [
    "sanctoral/7/26"
  ],
  "07-27": [
    "sanctoral/7/27"
  ],
  "07-28": [
    "sanctoral/7/28"
  ],
  "07-29": [
    "sanctoral/7/29"
  ],
  "07-30": [
    "sanctoral/7/30"
  ],
  "07-31": [
    "sanctoral/7/31"
  ],
  "08-01": [
    "sanctoral/8/1"
  ],
  "08-02": [
    "sanctoral/8/2"
  ],
  "08-04": [
    "sanctoral/8/4"
  ],
  "08-05": [
    "sanctoral/8/5"
  ],
  "08-06": [
    "sanctoral/8/6"
  ],
  "08-07": [
    "sanctoral/8/7"
  ],
  "08-08": [
    "sanctoral/8/8"
  ],
  "08-09": [
    "sanctoral/8/9"
  ],
  "08-10": [
    "sanctoral/8/10"
  ],
  "08-11": [
    "sanctoral/8/11"
  ],
  "08-12": [
    "sanctoral/8/12"
  ],
  "08-13": [
    "sanctoral/8/13"
  ],
  "08-14": [
    "sanctoral/8/14"
  ],
  "08-15": [
    "sanctoral/8/15"
  ],
  "08-16": [
    "sanctoral/8/16"
  ],
  "08-17": [
    "sanctoral/8/17"
  ],
  "08-18": [
    "sanctoral/8/18"
  ],
  "08-19": [
    "sanctoral/8/19"
  ],
  "08-20": [
    "sanctoral/8/20"
  ],
  "08-21": [
    "sanctoral/8/21"
  ],
  "08-22": [
    "sanctoral/8/22"
  ],
  "08-23": [
    "sanctoral/8/23"
  ],
  "08-24": [
    "sanctoral/8/24"
  ],
  "08-25": [
    "sanctoral/8/25"
  ],
  "08-26": [
    "sanctoral/8/26"
  ],
  "08-27": [
    "sanctoral/8/27"
  ],
  "08-28": [
    "sanctoral/8/28"
  ],
  "08-29": [
    "sanctoral/8/29"
  ],
  "08-30": [
    "sanctoral/8/30"
  ],
  "08-31": [
    "sanctoral/8/31"
  ],
  "09-01": [
    "sanctoral/9/1",
    "sanctoral/9/2"
  ],
  "09-02": [
    "sanctoral/9/3"
  ],
  "09-03": [
    "sanctoral/9/4"
  ],
  "09-05": [
    "sanctoral/9/6"
  ],
  "09-08": [
    "sanctoral/9/7"
  ],
  "09-09": [
    "sanctoral/9/9"
  ],
  "09-10": [
    "sanctoral/9/10"
  ],
  "09-11": [
    "sanctoral/9/12"
  ],
  "09-12": [
    "sanctoral/9/13"
  ],
  "09-14": [
    "sanctoral/9/14"
  ],
  "09-15": [
    "sanctoral/9/15"
  ],
  "09-16": [
    "sanctoral/9/16"
  ],
  "09-17": [
    "sanctoral/9/17"
  ],
  "09-18": [
    "sanctoral/9/18"
  ],
  "09-19": [
    "sanctoral/9/19"
  ],
  "09-20": [
    "sanctoral/9/20"
  ],
  "09-21": [
    "sanctoral/9/21"
  ],
  "09-22": [
    "sanctoral/9/22"
  ],
  "09-23": [
    "sanctoral/9/23"
  ],
  "09-24": [
    "sanctoral/9/24"
  ],
  "09-26": [
    "sanctoral/9/26"
  ],
  "09-27": [
    "sanctoral/9/27"
  ],
  "09-28": [
    "sanctoral/9/28"
  ],
  "09-29": [
    "sanctoral/9/29"
  ],
  "09-30": [
    "sanctoral/9/30"
  ],
  "10-01": [
    "sanctoral/10/1"
  ],
  "10-02": [
    "sanctoral/10/2"
  ],
  "10-03": [
    "sanctoral/10/3"
  ],
  "10-04": [
    "sanctoral/10/4"
  ],
  "10-05": [
    "sanctoral/10/5"
  ],
  "10-06": [
    "sanctoral/10/6"
  ],
  "10-07": [
    "sanctoral/10/7"
  ],
  "10-08": [
    "sanctoral/10/8"
  ],
  "10-09": [
    "sanctoral/10/9"
  ],
  "10-10": [
    "sanctoral/10/10"
  ],
  "10-11": [
    "sanctoral/10/11"
  ],
  "10-13": [
    "sanctoral/10/13"
  ],
  "10-14": [
    "sanctoral/10/14"
  ],
  "10-15": [
    "sanctoral/10/15"
  ],
  "10-16": [
    "sanctoral/10/16"
  ],
  "10-17": [
    "sanctoral/10/17"
  ],
  "10-18": [
    "sanctoral/10/18"
  ],
  "10-19": [
    "sanctoral/10/19"
  ],
  "10-20": [
    "sanctoral/10/20"
  ],
  "10-21": [
    "sanctoral/10/21"
  ],
  "10-23": [
    "sanctoral/10/23"
  ],
  "10-24": [
    "sanctoral/10/24"
  ],
  "10-25": [
    "sanctoral/10/25"
  ],
  "10-26": [
    "sanctoral/10/26"
  ],
  "10-28": [
    "sanctoral/10/28"
  ],
  "11-01": [
    "sanctoral/11/1"
  ],
  "11-02": [
    "sanctoral/11/2"
  ],
  "11-04": [
    "sanctoral/11/4"
  ],
  "11-08": [
    "sanctoral/11/8"
  ],
  "11-09": [
    "sanctoral/11/9"
  ],
  "11-10": [
    "sanctoral/11/10"
  ],
  "11-11": [
    "sanctoral/11/11"
  ],
  "11-12": [
    "sanctoral/11/12"
  ],
  "11-13": [
    "sanctoral/11/13"
  ],
  "11-14": [
    "sanctoral/11/14"
  ],
  "11-15": [
    "sanctoral/11/15"
  ],
  "11-16": [
    "sanctoral/11/16"
  ],
  "11-17": [
    "sanctoral/11/17"
  ],
  "11-18": [
    "sanctoral/11/18"
  ],
  "11-19": [
    "sanctoral/11/19"
  ],
  "11-20": [
    "sanctoral/11/20"
  ],
  "11-21": [
    "sanctoral/11/21"
  ],
  "11-22": [
    "sanctoral/11/22"
  ],
  "11-23": [
    "sanctoral/11/23"
  ],
  "11-24": [
    "sanctoral/11/24"
  ],
  "11-25": [
    "sanctoral/11/25"
  ],
  "11-26": [
    "sanctoral/11/26"
  ],
  "11-29": [
    "sanctoral/11/29"
  ],
  "11-30": [
    "sanctoral/11/30"
  ],
  "12-02": [
    "sanctoral/12/2"
  ],
  "12-03": [
    "sanctoral/12/3"
  ],
  "12-04": [
    "sanctoral/12/4"
  ],
  "12-05": [
    "sanctoral/12/5"
  ],
  "12-06": [
    "sanctoral/12/6"
  ],
  "12-07": [
    "sanctoral/12/7"
  ],
  "12-08": [
    "sanctoral/12/8"
  ],
  "12-10": [
    "sanctoral/12/10"
  ],
  "12-11": [
    "sanctoral/12/11"
  ],
  "12-13": [
    "sanctoral/12/13"
  ],
  "12-16": [
    "sanctoral/12/16"
  ],
  "12-21": [
    "sanctoral/12/21"
  ]
};

  function getProperKey(ordo) {
    if (!ordo) return null;

    // 1. Sanctoral : résolution par date exacte
    if (ordo.source === 'sanctoral' && ordo.date) {
      var p = ordo.date.split('-');
      var dk = (p[1] || '').padStart(2,'0') + '-' + (p[2] || '').padStart(2,'0');
      var keys = SANCTORAL_DATE[dk];
      if (keys && keys.length > 0) return keys[0];
    }

    // 2. Temporal : résolution par nom normalisé
    var fete = (ordo.fete || '').toLowerCase().trim();
    if (FETES_TEMPORALES[fete]) return FETES_TEMPORALES[fete];

    // 3. Recherche partielle
    for (var k in FETES_TEMPORALES) {
      if (fete.indexOf(k) !== -1 || k.indexOf(fete) !== -1) {
        return FETES_TEMPORALES[k];
      }
    }
    return null;
  }

  if (typeof Ordo1962 !== 'undefined') Ordo1962.getProperKey = getProperKey;
  if (typeof module !== 'undefined') module.exports.getProperKey = getProperKey;
})();
