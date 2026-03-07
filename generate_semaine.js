#!/usr/bin/env node
/**
 * generate_semaine.js
 * Génère CALENDRIER_DE_LA_SEMAINE.docx depuis Google Agenda + Supabase
 * Usage : node generate_semaine.js <date-lundi-YYYY-MM-DD>
 * Ex :    node generate_semaine.js 2026-03-09
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, VerticalAlign, ShadingType
} = require('docx');
const fs = require('fs');
const https = require('https');

// ── Config ─────────────────────────────────────────────────────────────────
const GOOGLE_API_KEY = 'AIzaSyAI5N6lamviexKaPR-WoOP4006m5IClDoQ';
const CALENDAR_ID    = 'saintlouisenville67@gmail.com';
const SUPABASE_URL   = 'https://pmeaimfcwtykhqtueomd.supabase.co';
const SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';

// ── Événements récurrents fixes par jour de semaine (0=Dim, 1=Lun…6=Sam)
// Format : { heure, label, bold, underline, extra1, extra2 }
const RECURRENTS = {
  1: [ // Lundi — aucun fixe hors messe
  ],
  2: [ // Mardi
    { heure: '6h40', label: 'Laudes',   extra1: '7h-8h', extra2: 'Adoration' },
    { heure: '18h',  label: 'Vêpres' },
    { heure: '19h30',label: 'Enseignement Groupe Saint Louis (Étudiants & Jeunes professionnels)' },
    { heure: '20h',  label: 'Adoration et confessions (Fraternités Cor Unum, ouvert à tous)' },
  ],
  3: [ // Mercredi
    { heure: '6h40', label: 'Laudes',   extra1: '7h-8h', extra2: 'Adoration' },
    { heure: '10h30',label: 'Catéchisme maternelles et primaires' },
    { heure: '11h30-17h', label: 'Patronage Saint Louis' },
    { heure: '17h',  label: 'Catéchisme 6e-5e' },
    { heure: '18h',  label: 'Vêpres' },
    { heure: '20h',  label: 'Ouvroir' },
  ],
  4: [ // Jeudi
    { heure: '6h40', label: 'Laudes',   extra1: '7h-8h', extra2: 'Adoration' },
    { heure: '18h',  label: 'Vêpres' },
  ],
  5: [ // Vendredi
    { note: 'Jeûne et abstinence de viande' },
    { heure: '7h40', label: 'Laudes' },
    { heure: '9h',   label: 'Groupe Sainte Attale (chapelet à 8h40)' },
    { heure: '15h-17h30', label: 'Adoration' },
    { heure: '17h45',label: 'Chemin de Croix', underline: true },
    { heure: '19h30',label: 'Maraude / Aumônerie des lycéens' },
  ],
  6: [ // Samedi
    { heure: '7h40', label: 'Laudes',   extra1: '8h-9h', extra2: 'Adoration' },
    { heure: '10h',  label: 'Aumônerie des collégiens / Catéchisme pour les catéchumènes' },
    { heure: '14h30',label: 'Catéchisme Complémentaire pour les adultes' },
  ],
  0: [ // Dimanche
    { heure: '7h40', label: 'Laudes',   extra1: '8h-9h', extra2: 'Adoration' },
    { heure: '15h',  label: 'Chapelet de la Miséricorde et Rosaire' },
    { heure: '18h',  label: 'Vêpres et Salut du Saint-Sacrement' },
  ],
};

// ── Helpers fetch ─────────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const options = {
      hostname: opts.hostname, path: opts.pathname + opts.search,
      headers: { 'Accept': 'application/json', ...headers }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + data.slice(0,200))); }
      });
    }).on('error', reject);
  });
}

// ── Formatage heure Google → "18h30" ─────────────────────────────────────
function fmtHeure(dateTime) {
  const d = new Date(dateTime);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
}

// ── Ordinal français ──────────────────────────────────────────────────────
function ordinal(n) {
  if (n === 1) return '1er';
  return `${n}e`;
}

// ── Semaine liturgique depuis ordo ────────────────────────────────────────
async function getSemaineLiturgique(dateISO) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/ordo_liturgique?date=eq.${dateISO}&select=fete`;
    const data = await fetchJSON(url, { apikey: SUPABASE_KEY });
    if (data && data[0]) return data[0].fete;
  } catch(e) {}
  return null;
}

// ── Calculer numéro de semaine dans l'année liturgique (approx) ───────────
// Pour le sous-titre du jour, on récupère la fête du dimanche de la semaine
async function getSousTitreSemaine(lundiDate) {
  // Chercher le dimanche de la même semaine
  const dim = new Date(lundiDate);
  dim.setDate(dim.getDate() + 6);
  const dimISO = dim.toISOString().split('T')[0];
  const fete = await getSemaineLiturgique(dimISO);
  return fete; // ex: "4ème Dimanche de Carême"
}

// ── Construire le sous-titre de chaque jour ───────────────────────────────
async function getSousTitreJour(dateObj, sousTitreSemaine) {
  const iso = dateObj.toISOString().split('T')[0];
  const fete = await getSemaineLiturgique(iso);
  // On retourne la fête propre du jour si dispo, sinon le sous-titre de semaine
  return fete || sousTitreSemaine || null;
}

// ── Noms des jours ────────────────────────────────────────────────────────
const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS_FR  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// ── Construire les données de la semaine ──────────────────────────────────
async function buildSemaineData(lundiDate) {
  // Plage lundi → dimanche
  const lundi = new Date(lundiDate + 'T00:00:00');
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
  dimanche.setHours(23,59,59);

  console.log(`📅 Semaine : ${lundiDate} → ${dimanche.toISOString().split('T')[0]}`);

  // 1. Récupérer tous les événements Google Agenda
  const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
    + `?key=${GOOGLE_API_KEY}`
    + `&timeMin=${lundi.toISOString()}`
    + `&timeMax=${dimanche.toISOString()}`
    + `&singleEvents=true&orderBy=startTime&maxResults=200`;

  console.log('📡 Chargement Google Agenda…');
  const gcal = await fetchJSON(gcalUrl);
  const events = gcal.items || [];
  console.log(`   → ${events.length} événements trouvés`);

  // 2. Récupérer l'ordo pour toute la semaine
  const dimISO = dimanche.toISOString().split('T')[0];
  const ordoUrl = `${SUPABASE_URL}/rest/v1/ordo_liturgique?date=gte.${lundiDate}&date=lte.${dimISO}&select=date,fete,classe,couleur`;
  const ordo = await fetchJSON(ordoUrl, { apikey: SUPABASE_KEY });
  const ordoMap = {};
  (ordo || []).forEach(o => { ordoMap[o.date] = o; });
  console.log(`   → ${Object.keys(ordoMap).length} entrées ordo`);

  // 3. Construire jour par jour
  const jours = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i);
    const dow = d.getDay(); // 0=dim
    const iso = d.toISOString().split('T')[0];
    const dateFr = `${JOURS_FR[dow]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;

    // Sous-titre liturgique
    const ordoJour = ordoMap[iso];
    let sousTitre = ordoJour ? ordoJour.fete : null;

    // Événements Google de ce jour (classés par heure)
    const evtsGcal = events.filter(e => {
      const start = e.start.dateTime || e.start.date;
      return start.startsWith(iso);
    }).sort((a,b) => {
      const ta = a.start.dateTime || a.start.date;
      const tb = b.start.dateTime || b.start.date;
      return ta.localeCompare(tb);
    });

    // Construire la liste d'événements du jour
    // Séparer messes et autres
    const estMesse = e => /^(messe|grand'?messe)/i.test(e.summary.trim());
    const gcalMesses = evtsGcal.filter(estMesse);
    const gcalAutres = evtsGcal.filter(e => !estMesse(e));

    // Événements fixes récurrents
    const fixes = RECURRENTS[dow] || [];

    // Fusion : fixes + messes Google + autres Google
    // On insère les messes Google à leur heure dans la liste fixes
    // Construire une liste unifiée triée par heure
    const allEvts = [];

    // Notes (ligne pleine largeur)
    fixes.filter(f => f.note).forEach(f => allEvts.push({ type: 'note', texte: f.note }));

    // Construire les lignes horaires
    const horaires = [];
    fixes.filter(f => !f.note).forEach(f => {
      horaires.push({
        heure: f.heure || '',
        label: f.label,
        bold: f.bold || false,
        underline: f.underline || false,
        extra1: f.extra1 || '',
        extra2: f.extra2 || '',
        source: 'fixe'
      });
    });

    // Messes Google Agenda (remplacent/ajoutent selon heure)
    gcalMesses.forEach(e => {
      const h = e.start.dateTime ? fmtHeure(e.start.dateTime) : '';
      // Chercher l'intention associée si on en a (optionnel, ici on met juste le résumé)
      horaires.push({
        heure: h,
        label: e.summary.trim(),
        bold: true,
        underline: false,
        extra1: '', extra2: '',
        source: 'gcal_messe'
      });
    });

    // Autres événements Google (hors messes)
    gcalAutres.forEach(e => {
      const h = e.start.dateTime ? fmtHeure(e.start.dateTime) : '';
      // Éviter les doublons avec les fixes (même heure + même début de label)
      const isDuplicate = horaires.some(existing =>
        existing.heure === h && existing.label.substring(0,10).toLowerCase() === e.summary.substring(0,10).toLowerCase()
      );
      if (!isDuplicate) {
        horaires.push({
          heure: h,
          label: e.summary.trim(),
          bold: false,
          underline: false,
          extra1: '', extra2: '',
          source: 'gcal_autre'
        });
      }
    });

    // Trier par heure
    const parseHeure = h => {
      if (!h) return 999;
      const m = h.match(/(\d+)h(\d*)/);
      if (!m) return 999;
      return parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
    };
    horaires.sort((a, b) => parseHeure(a.heure) - parseHeure(b.heure));

    jours.push({ dateFr, iso, dow, sousTitre, notes: fixes.filter(f=>f.note).map(f=>f.note), horaires });
  }

  return jours;
}

// ── Construire le document Word ───────────────────────────────────────────
function buildDoc(jours) {
  // Dimensions
  const PAGE_W    = 11906; // A4 portrait
  const PAGE_H    = 16838;
  const MARGIN_TB = 142;   // 0.10"
  const MARGIN_LR = 720;   // 0.50"
  const CONTENT_W = PAGE_W - 2 * MARGIN_LR; // 10466 DXA

  // Colonnes identiques à l'original
  const COL_WIDTHS = [322, 1143, 2174, 1903, 2882, 71, 36];
  // Total : 8531 DXA — on scale au content width
  const scale = CONTENT_W / COL_WIDTHS.reduce((a,b)=>a+b,0);
  const COLS = COL_WIDTHS.map(c => Math.round(c * scale));
  // Corriger l'arrondi sur la dernière colonne
  const sum = COLS.reduce((a,b)=>a+b,0);
  COLS[COLS.length-1] += CONTENT_W - sum;

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const cellMar = { top: 15, bottom: 15, left: 115, right: 115 };

  // Helper : cellule simple
  function cell(children, span = 1, opts = {}) {
    return new TableCell({
      width: { size: COLS.slice(0, span).reduce((a,b)=>a+b,0), type: WidthType.DXA },
      columnSpan: span,
      borders: noBorders,
      margins: cellMar,
      verticalAlign: VerticalAlign.CENTER,
      children,
      ...opts
    });
  }

  // Helper : paragraphe Calibri 12pt
  function para(runs, align = AlignmentType.LEFT) {
    return new Paragraph({
      alignment: align,
      spacing: { after: 0, line: 240, lineRule: 'auto' },
      children: runs
    });
  }

  function run(text, opts = {}) {
    return new TextRun({
      text,
      font: 'Calibri',
      size: 24, // 12pt
      color: '000000',
      ...opts
    });
  }

  // ── Construire les lignes du tableau ─────────────────────────────────
  const tableRows = [];

  jours.forEach(jour => {
    // ── Ligne en-tête de jour ──────────────────────────────────────────
    // Format : "Lundi 9 mars" [GRAS] + " – " [italique] + "de la 3ème semaine de Carême" [italique]
    // Le sous-titre vient de l'ordo : ex "Férie – 3ème semaine de Carême" ou "4ème Dimanche de Carême"
    const headRuns = [
      run(jour.dateFr + ' ', { bold: true }),
    ];
    if (jour.sousTitre) {
      headRuns.push(run('– ', { italics: true }));
      headRuns.push(run(jour.sousTitre, { italics: true }));
    }

    tableRows.push(new TableRow({
      tableHeader: false,
      children: [
        cell([para(headRuns)], 5),
        // 2 cellules vides à droite
        cell([para([])], 1),
        cell([para([])], 1),
      ],
      height: { value: 20, rule: 'auto' }
    }));

    // ── Notes (ligne pleine largeur) ──────────────────────────────────
    jour.notes.forEach(note => {
      tableRows.push(new TableRow({
        children: [
          cell([para([run(note, { italics: true })])], 5),
          cell([para([])], 1),
          cell([para([])], 1),
        ],
        height: { value: 20, rule: 'auto' }
      }));
    });

    // ── Lignes horaires ───────────────────────────────────────────────
    jour.horaires.forEach(evt => {
      const heureRuns = [run(evt.heure, { bold: evt.bold })];
      const labelRuns = [];

      if (evt.bold) {
        // Décomposer "Messe (intention)" → "Messe" gras + " (intention)" normal
        const matchParen = evt.label.match(/^([^(]+?)(\s*\(.+\))?$/);
        if (matchParen && matchParen[2]) {
          labelRuns.push(run(matchParen[1].trim(), { bold: true }));
          labelRuns.push(run(' ' + matchParen[2].trim()));
        } else {
          labelRuns.push(run(evt.label, { bold: true }));
        }
      } else if (evt.underline) {
        labelRuns.push(run(evt.label, { underline: { type: 'single' } }));
      } else {
        labelRuns.push(run(evt.label));
      }

      // Ligne avec extra (ex: Laudes | 7h-8h | Adoration)
      if (evt.extra1 || evt.extra2) {
        tableRows.push(new TableRow({
          children: [
            cell([para([])], 1),                          // col 0 vide
            cell([para(heureRuns)], 1),                   // col 1 heure
            cell([para(labelRuns)], 1),                   // col 2 label
            cell([para([run(evt.extra1)])], 1),           // col 3 extra1
            cell([para([run(evt.extra2)])], 2),           // col 4+5 extra2
            cell([para([])], 1),                          // col 6 marge
          ],
          height: { value: 20, rule: 'auto' }
        }));
      } else {
        tableRows.push(new TableRow({
          children: [
            cell([para([])], 1),                          // col 0 vide
            cell([para(heureRuns)], 1),                   // col 1 heure
            cell([para(labelRuns)], 4),                   // col 2-5 label
            cell([para([])], 1),                          // col 6 marge
          ],
          height: { value: 20, rule: 'auto' }
        }));
      }
    });
  });

  // ── Tableau ─────────────────────────────────────────────────────────
  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: COLS,
    rows: tableRows,
    borders: {
      top:    noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideH: noBorder, insideV: noBorder
    },
  });

  // ── Document ─────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24, color: '000000' }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN_TB, right: MARGIN_LR, bottom: MARGIN_TB, left: MARGIN_LR }
        }
      },
      children: [
        // Titre centré
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80, line: 240 },
          children: [
            run('CALENDRIER DE LA SEMAINE', { bold: true, size: 32 })
          ]
        }),
        table
      ]
    }]
  });

  return doc;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  let lundiArg = process.argv[2];

  if (!lundiArg) {
    // Par défaut : lundi de la semaine courante
    const now = new Date();
    const dow = now.getDay(); // 0=dim
    const diff = dow === 0 ? -6 : 1 - dow;
    const lundi = new Date(now);
    lundi.setDate(now.getDate() + diff);
    lundiArg = lundi.toISOString().split('T')[0];
    console.log(`Aucune date fournie — semaine en cours : ${lundiArg}`);
  }

  // Valider que c'est bien un lundi
  const d = new Date(lundiArg + 'T00:00:00');
  if (d.getDay() !== 1) {
    console.error(`⚠️  ${lundiArg} n'est pas un lundi — ajustement automatique`);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    lundiArg = d.toISOString().split('T')[0];
    console.log(`   → Lundi ajusté : ${lundiArg}`);
  }

  try {
    const jours = await buildSemaineData(lundiArg);
    const doc   = buildDoc(jours);
    const buf   = await Packer.toBuffer(doc);
    const outPath = process.argv[3] || `/tmp/CALENDRIER_${lundiArg}.docx`;
    fs.writeFileSync(outPath, buf);
    console.log(`✅ Document généré : ${outPath}`);
  } catch(err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
}

main();
