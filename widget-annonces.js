/**
 * Widget Annonces Paroissiales — La Croix Glorieuse
 * À intégrer dans une page IONOS via un bloc HTML personnalisé.
 *
 * Usage :
 *   1. Ajouter un bloc HTML avec : <div id="annonces-paroissiales"></div>
 *   2. Coller ce script dans un bloc Script (ou à la fin du bloc HTML)
 */
(function () {
    const SUPABASE_URL = 'https://pmeaimfcwtykhqtueomd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';
    const CONTENEUR_ID = 'annonces-paroissiales';

    /* ── Styles ────────────────────────────────────────────── */
    const CSS = `
    #annonces-paroissiales {
        font-family: Georgia, 'Times New Roman', serif;
        max-width: 900px;
        margin: 0 auto;
        padding: 0 16px 40px;
    }
    .ann-titre-section {
        text-align: center;
        font-size: 1.5rem;
        font-weight: bold;
        color: #1a1a1a;
        margin-bottom: 6px;
        letter-spacing: .02em;
    }
    .ann-sous-titre {
        text-align: center;
        font-size: .95rem;
        color: #888;
        margin-bottom: 32px;
        font-style: italic;
    }
    .ann-grille {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 24px;
    }
    .ann-carte {
        border: 1px solid #e8e0d8;
        border-radius: 4px;
        overflow: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
        transition: box-shadow .2s, transform .2s;
    }
    .ann-carte:hover {
        box-shadow: 0 4px 18px rgba(0,0,0,.1);
        transform: translateY(-2px);
    }
    .ann-carte.prioritaire {
        border-color: #8b1a1a;
        border-top-width: 3px;
    }
    .ann-carte-img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        display: block;
        background: #f4f0eb;
    }
    .ann-carte-corps {
        padding: 16px 18px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ann-badge-prio {
        display: inline-block;
        font-family: Arial, sans-serif;
        font-size: .68rem;
        font-weight: bold;
        letter-spacing: .1em;
        text-transform: uppercase;
        color: #8b1a1a;
        border: 1px solid #8b1a1a;
        border-radius: 2px;
        padding: 2px 7px;
        align-self: flex-start;
    }
    .ann-carte-titre {
        font-size: 1.05rem;
        font-weight: bold;
        color: #1a1a1a;
        line-height: 1.35;
        margin: 0;
    }
    .ann-carte-dates {
        font-family: Arial, sans-serif;
        font-size: .78rem;
        color: #8b1a1a;
        font-style: normal;
    }
    .ann-carte-desc {
        font-size: .95rem;
        color: #444;
        line-height: 1.6;
        flex: 1;
    }
    .ann-carte-lien {
        display: inline-block;
        margin-top: 4px;
        padding: 8px 18px;
        background: #8b1a1a;
        color: #fff !important;
        text-decoration: none !important;
        font-family: Arial, sans-serif;
        font-size: .78rem;
        font-weight: bold;
        letter-spacing: .08em;
        text-transform: uppercase;
        border-radius: 2px;
        align-self: flex-start;
        transition: background .2s;
    }
    .ann-carte-lien:hover { background: #6b1414; }
    .ann-vide {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 32px 0;
        grid-column: 1 / -1;
    }
    .ann-chargement {
        text-align: center;
        color: #bbb;
        font-style: italic;
        padding: 24px 0;
    }
    @media (max-width: 600px) {
        .ann-grille { grid-template-columns: 1fr; }
        .ann-carte-img { height: 200px; }
    }
    `;

    /* ── Utilitaires ───────────────────────────────────────── */
    function escHTML(s) {
        return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T12:00:00');
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function fmtDates(debut, fin) {
        if (!debut && !fin) return '';
        if (debut && fin && debut === fin) return fmtDate(debut);
        if (debut && fin) return `Du ${fmtDate(debut)} au ${fmtDate(fin)}`;
        if (debut) return `À partir du ${fmtDate(debut)}`;
        return `Jusqu\'au ${fmtDate(fin)}`;
    }

    /* ── Rendu d'une carte ─────────────────────────────────── */
    function renderCarte(a) {
        const img     = a.image_url ? `<img class="ann-carte-img" src="${escHTML(a.image_url)}" alt="${escHTML(a.titre)}" loading="lazy">` : '';
        const prio    = a.prioritaire ? `<span class="ann-badge-prio">À la une</span>` : '';
        const dates   = fmtDates(a.date_debut, a.date_fin);
        const datesHtml = dates ? `<div class="ann-carte-dates">📅 ${escHTML(dates)}</div>` : '';
        const desc    = a.description ? `<p class="ann-carte-desc">${escHTML(a.description).replace(/\n/g, '<br>')}</p>` : '';
        const lienLabel = a.lien_label || 'En savoir plus';
        const lien    = a.lien ? `<a class="ann-carte-lien" href="${escHTML(a.lien)}" target="_blank" rel="noopener">${escHTML(lienLabel)} →</a>` : '';

        return `
        <article class="ann-carte${a.prioritaire ? ' prioritaire' : ''}">
            ${img}
            <div class="ann-carte-corps">
                ${prio}
                <h3 class="ann-carte-titre">${escHTML(a.titre)}</h3>
                ${datesHtml}
                ${desc}
                ${lien}
            </div>
        </article>`;
    }

    /* ── Chargement depuis Supabase ────────────────────────── */
    async function charger() {
        const conteneur = document.getElementById(CONTENEUR_ID);
        if (!conteneur) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            const url = `${SUPABASE_URL}/rest/v1/annonces`
                + `?select=*`
                + `&actif=eq.true`
                + `&or=(date_fin.is.null,date_fin.gte.${today})`
                + `&order=prioritaire.desc,ordre.asc,created_at.desc`;

            const res = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            const annonces = await res.json();

            if (!annonces.length) {
                conteneur.querySelector('.ann-grille').innerHTML =
                    '<p class="ann-vide">Aucune annonce en ce moment.</p>';
                return;
            }

            conteneur.querySelector('.ann-grille').innerHTML =
                annonces.map(renderCarte).join('');

        } catch (e) {
            console.error('[Annonces widget]', e);
            const grille = conteneur.querySelector('.ann-grille');
            if (grille) grille.innerHTML = '<p class="ann-vide">Les annonces ne peuvent pas être chargées pour le moment.</p>';
        }
    }

    /* ── Init ──────────────────────────────────────────────── */
    function init() {
        // Injecter les styles
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        // Structurer le conteneur
        const conteneur = document.getElementById(CONTENEUR_ID);
        if (!conteneur) {
            console.warn('[Annonces widget] Élément #annonces-paroissiales introuvable.');
            return;
        }

        conteneur.innerHTML = `
            <h2 class="ann-titre-section">Annonces paroissiales</h2>
            <p class="ann-sous-titre">Informations de la paroisse La Croix Glorieuse</p>
            <div class="ann-grille">
                <p class="ann-chargement">Chargement…</p>
            </div>`;

        charger();
    }

    // Lancer après chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
