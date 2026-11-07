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

    /* ── Styles — alignés sur le widget horaires du site ──── */
    const CSS = `
    #annonces-paroissiales {
        --ann-accent: #551a25;
        --ann-texte: #292529;
        --ann-doux: #8a888a;
        --ann-ligne: #e6e2e2;
        --ann-fond: #faf8f8;
        font-family: "Source Sans Pro", Arial, sans-serif;
        color: var(--ann-texte);
        max-width: 560px;
        margin: 0 auto;
        padding: 8px 16px;
        box-sizing: border-box;
        text-align: center;
    }
    @media (min-width: 768px) {
        #annonces-paroissiales {
            max-width: 100%;
            padding: 8px 32px;
        }
        .ann-grille {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }
    }
    #annonces-paroissiales * { box-sizing: border-box; }

    /* ── Titre ── */
    .ann-titre {
        font-family: "Book Antiqua", Palatino, "Palatino Linotype", Georgia, serif;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: .6px;
        line-height: 1.2;
        color: #000;
        margin: 0 0 10px;
    }

    /* ── Bouton résumé / trigger ── */
    .ann-resume {
        max-width: 100%;
        text-align: center;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border: 0;
        background: none;
        cursor: pointer;
        font: inherit;
        font-size: 18px;
        color: var(--ann-texte);
        padding: 6px 4px;
        border-bottom: 1px solid var(--ann-ligne);
        text-decoration: none;
    }
    .ann-resume:hover, .ann-resume:focus-visible {
        border-bottom-color: var(--ann-accent);
    }
    #annonces-paroissiales.ouvert .ann-resume {
        color: var(--ann-accent);
        border-bottom-color: var(--ann-accent);
    }

    /* ── Flèche ── */
    .ann-fleche {
        width: 8px;
        height: 8px;
        border-right: 2px solid var(--ann-accent);
        border-bottom: 2px solid var(--ann-accent);
        transform: translateY(-3px) rotate(45deg);
        transition: transform .25s;
        flex: 0 0 auto;
    }
    #annonces-paroissiales.ouvert .ann-fleche {
        transform: translateY(2px) rotate(-135deg);
    }

    /* ── Panneau dépliable (animation identique au widget horaires) ── */
    .ann-panneau {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows .3s ease;
        text-align: left;
    }
    #annonces-paroissiales.ouvert .ann-panneau {
        grid-template-rows: 1fr;
    }
    .ann-interieur {
        overflow: hidden;
        min-height: 0;
    }

    /* ── Grille de cartes ── */
    .ann-grille {
        padding: 16px 0 4px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
    }

    /* ── Carte ── */
    .ann-carte {
        border: 1px solid var(--ann-ligne);
        border-radius: 4px;
        overflow: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
    }
    .ann-carte.prioritaire {
        border-color: var(--ann-accent);
        border-top-width: 3px;
    }
    .ann-carte-img {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: #f4f0eb;
    }
    .ann-carte-corps {
        padding: 12px 14px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .ann-badge-prio {
        display: inline-block;
        font-family: Arial, sans-serif;
        font-size: .68rem;
        font-weight: bold;
        letter-spacing: .1em;
        text-transform: uppercase;
        color: var(--ann-accent);
        border: 1px solid var(--ann-accent);
        border-radius: 2px;
        padding: 2px 7px;
        align-self: flex-start;
    }
    .ann-carte-titre {
        font-family: "Book Antiqua", Palatino, Georgia, serif;
        font-size: 1.05rem;
        font-weight: 700;
        color: #000;
        line-height: 1.3;
        margin: 0;
    }
    .ann-carte-dates {
        font-family: Arial, sans-serif;
        font-size: .78rem;
        color: var(--ann-accent);
    }
    .ann-carte-desc {
        font-size: .95rem;
        color: #444;
        line-height: 1.55;
        flex: 1;
        margin: 0;
    }
    .ann-carte-lien {
        display: inline-block;
        margin-top: 6px;
        padding: 7px 16px;
        background: var(--ann-accent);
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
    .ann-carte-lien:hover { background: #3d1219; }

    /* ── États ── */
    .ann-vide, .ann-chargement {
        text-align: center;
        color: var(--ann-doux);
        font-style: italic;
        padding: 24px 0;
    }

    @media (max-width: 480px) {
        .ann-titre  { font-size: 24px; }
        .ann-resume { font-size: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .ann-panneau, .ann-fleche { transition: none; }
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
        const img      = a.image_url ? `<img class="ann-carte-img" src="${escHTML(a.image_url)}" alt="${escHTML(a.titre)}" loading="lazy">` : '';
        const prio     = a.prioritaire ? `<span class="ann-badge-prio">À la une</span>` : '';
        let eventHtml = '';
        if (a.event_date) {
            const evDate = fmtDate(a.event_date);
            const evHeure = a.event_heure ? ' à ' + a.event_heure.slice(0, 5) : '';
            eventHtml = `<div class="ann-carte-dates">📅 ${escHTML(evDate + evHeure)}</div>`;
        }
        const desc     = a.description ? `<p class="ann-carte-desc">${escHTML(a.description).replace(/\n/g, '<br>')}</p>` : '';
        const lienLabel = a.lien_label || 'En savoir plus';
        const lien     = a.lien ? `<a class="ann-carte-lien" href="${escHTML(a.lien)}" target="_blank" rel="noopener">${escHTML(lienLabel)} →</a>` : '';

        return `
        <article class="ann-carte${a.prioritaire ? ' prioritaire' : ''}">
            ${img}
            <div class="ann-carte-corps">
                ${prio}
                <h3 class="ann-carte-titre">${escHTML(a.titre)}</h3>
                ${eventHtml}
                ${desc}
                ${lien}
            </div>
        </article>`;
    }

    /* ── Chargement depuis Supabase ────────────────────────── */
    async function charger(conteneur) {
        const today = new Date().toISOString().split('T')[0];

        try {
            const url = `${SUPABASE_URL}/rest/v1/annonces`
                + `?select=*`
                + `&actif=eq.true`
                + `&or=(date_debut.is.null,date_debut.lte.${today})`
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

            const grille = conteneur.querySelector('.ann-grille');
            if (!annonces.length) {
                grille.innerHTML = '<p class="ann-vide">Aucune annonce en ce moment.</p>';
                return;
            }
            grille.innerHTML = annonces.map(renderCarte).join('');

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

        const conteneur = document.getElementById(CONTENEUR_ID);
        if (!conteneur) {
            console.warn('[Annonces widget] Élément #annonces-paroissiales introuvable.');
            return;
        }

        // Structure : accordéon FERMÉ par défaut (pas d'attribut "open")
        conteneur.innerHTML = `
            <h2 class="ann-titre">Annonces paroissiales</h2>
            <button type="button" class="ann-resume" aria-expanded="false" aria-controls="ann-panneau">
                <span>Voir les annonces</span>
                <span class="ann-fleche" aria-hidden="true"></span>
            </button>
            <div class="ann-panneau" id="ann-panneau" role="region">
                <div class="ann-interieur">
                    <div class="ann-grille">
                        <p class="ann-chargement">Chargement…</p>
                    </div>
                </div>
            </div>`;

        const btn = conteneur.querySelector('.ann-resume');
        let chargeDone = false;

        btn.addEventListener('click', function () {
            const ouvert = conteneur.classList.toggle('ouvert');
            btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
            // Charger les données au premier clic seulement
            if (ouvert && !chargeDone) {
                chargeDone = true;
                charger(conteneur);
            }
        });
    }

    // Lancer après chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
