#!/usr/bin/env node
/**
 * generate_semaine.js
 * Génère CALENDRIER_DE_LA_SEMAINE.docx depuis Google Agenda + Supabase (ordo)
 * Tous les événements viennent UNIQUEMENT de Google Agenda.
 *
 * Usage : node generate_semaine.js <date-YYYY-MM-DD> [sortie.docx]
 * Ex :    node generate_semaine.js 2026-03-09
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, VerticalAlign
} = require('docx');
const fs    = require('fs');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────────
const GOOGLE_API_KEY = 'AIzaSyAI5N6lamviexKaPR-WoOP4006m5IClDoQ';
const CALENDAR_ID    = 'saintlouisenville67@gmail.com';
const SUPABASE_URL   = 'https://pmeaimfcwtykhqtueomd.supabase.co';
const SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';

const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MOIS_FR  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// ── Fetch JSON ──────────────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Accept': 'application/json', ...headers } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

// ── Formatage timezone-safe ──────────────────────────────────────────────────
// Extrait "YYYY-MM-DD" en heure locale (jamais UTC)
function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function fmtHeure(dateTime) {
  const d = new Date(dateTime);
  const h = d.getHours(), m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
}

function estMesse(summary) {
  return /^(messe|grand'?messe)/i.test(summary.trim());
}

// ── Construire les données de la semaine ─────────────────────────────────────
async function buildSemaineData(lundiISO) {
  const lundi    = new Date(lundiISO + 'T12:00:00');
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
  const dimISO   = isoLocal(dimanche);
  dimanche.setHours(23, 59, 59);

  console.log(`📅 Semaine : ${lundiISO} → ${dimISO}`);

  // Google Agenda — toute la semaine
  const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
    + `?key=${GOOGLE_API_KEY}`
    + `&timeMin=${lundi.toISOString()}&timeMax=${dimanche.toISOString()}`
    + `&singleEvents=true&orderBy=startTime&maxResults=500`;
  console.log('📡 Chargement Google Agenda…');
  const gcal   = await fetchJSON(gcalUrl);
  const events = gcal.items || [];
  console.log(`   → ${events.length} événements`);

  // Ordo liturgique
  const ordoUrl = `${SUPABASE_URL}/rest/v1/ordo_liturgique?date=gte.${lundiISO}&date=lte.${dimISO}&select=date,fete`;
  const ordo    = await fetchJSON(ordoUrl, { apikey: SUPABASE_KEY });
  const ordoMap = {};
  (ordo || []).forEach(o => ordoMap[o.date] = o.fete);
  console.log(`   → ${Object.keys(ordoMap).length} jours ordo`);

  // Construire jour par jour
  const jours = [];
  for (let i = 0; i < 7; i++) {
    const d   = new Date(lundi); d.setDate(lundi.getDate() + i);
    const dow = d.getDay();
    const iso = isoLocal(d);

    // Tous les événements du jour depuis Google Agenda, triés par heure
    const evtsJour = events
      .filter(e => (e.start.dateTime || e.start.date).startsWith(iso))
      .sort((a,b) => (a.start.dateTime||a.start.date).localeCompare(b.start.dateTime||b.start.date));

    const horaires = evtsJour.map(e => ({
      heure:     e.start.dateTime ? fmtHeure(e.start.dateTime) : '',
      label:     e.summary.trim(),
      bold:      estMesse(e.summary),
      underline: false,
      extra1: '', extra2: ''
    }));

    jours.push({
      dateFr:    `${JOURS_FR[dow]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`,
      iso, dow,
      sousTitre: ordoMap[iso] || null,
      notes:     [],
      horaires
    });
  }
  return jours;
}

// ── Construire le document Word ──────────────────────────────────────────────
function buildDoc(jours) {
  const PAGE_W = 11906, PAGE_H = 16838, MARGIN_TB = 142, MARGIN_LR = 720;
  const CONTENT_W = PAGE_W - 2*MARGIN_LR;
  const COL_WIDTHS = [322,1143,2174,1903,2882,71,36];
  const scale = CONTENT_W / COL_WIDTHS.reduce((a,b)=>a+b,0);
  const COLS  = COL_WIDTHS.map(c => Math.round(c*scale));
  COLS[COLS.length-1] += CONTENT_W - COLS.reduce((a,b)=>a+b,0);

  const noBorder  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const cellMar   = { top: 15, bottom: 15, left: 115, right: 115 };

  const cell = (children, span=1) => new TableCell({
    width: { size: COLS.slice(0,span).reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnSpan: span, borders: noBorders, margins: cellMar,
    verticalAlign: VerticalAlign.CENTER, children
  });
  const para = runs => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0, line: 240 }, children: runs });
  const r    = (text, opts={}) => new TextRun({ text, font: 'Calibri', size: 24, color: '000000', ...opts });
  const row  = (children, h=20) => new TableRow({ children, height: { value: h, rule: 'auto' } });

  const tableRows = [];

  jours.forEach(jour => {
    // En-tête du jour
    const headRuns = [r(jour.dateFr + ' ', { bold: true })];
    if (jour.sousTitre) {
      headRuns.push(r('– ', { italics: true }));
      headRuns.push(r(jour.sousTitre, { italics: true }));
    }
    tableRows.push(row([cell([para(headRuns)], 5), cell([para([])], 1), cell([para([])], 1)]));

    // Horaires — 100% Google Agenda
    jour.horaires.forEach(evt => {
      const heureRuns = [r(evt.heure, { bold: evt.bold })];
      const labelRuns = [];
      if (evt.bold) {
        // Messe : "Messe" gras + " (intention)" normal si parenthèse
        const m = evt.label.match(/^([^(]+?)(\s*\(.+\))?$/);
        if (m && m[2]) {
          labelRuns.push(r(m[1].trim(), { bold: true }));
          labelRuns.push(r(' ' + m[2].trim()));
        } else {
          labelRuns.push(r(evt.label, { bold: true }));
        }
      } else {
        labelRuns.push(r(evt.label));
      }

      tableRows.push(row([
        cell([para([])], 1),
        cell([para(heureRuns)], 1),
        cell([para(labelRuns)], 4),
        cell([para([])], 1),
      ]));
    });
  });

  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: COLS, rows: tableRows,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder }
  });

  return new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 24, color: '000000' } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN_TB, right: MARGIN_LR, bottom: MARGIN_TB, left: MARGIN_LR } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80, line: 240 },
          children: [new TextRun({ text: 'CALENDRIER DE LA SEMAINE', bold: true, font: 'Calibri', size: 32, color: '000000' })]
        }),
        table
      ]
    }]
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let lundiArg = process.argv[2];
  if (!lundiArg) {
    const now = new Date();
    const dow = now.getDay();
    now.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
    lundiArg = isoLocal(now);
    console.log(`Semaine courante : ${lundiArg}`);
  }
  // Ajuster au lundi si besoin
  const d = new Date(lundiArg + 'T00:00:00');
  if (d.getDay() !== 1) {
    d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()));
    lundiArg = isoLocal(d);
  }

  try {
    const jours  = await buildSemaineData(lundiArg);
    const doc    = buildDoc(jours);
    const buf    = await Packer.toBuffer(doc);
    const out    = process.argv[3] || `/tmp/CALENDRIER_${lundiArg}.docx`;
    fs.writeFileSync(out, buf);
    console.log(`✅ ${out} (${buf.length} bytes)`);
  } catch(err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
