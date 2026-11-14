(function() {
    const href = window.location.href;
    const isAccueil    = href.includes('accueil') || href.endsWith('/') || href.endsWith('index.html');
    const isCalendrier = href.includes('calendrier.html');
    const isIntentions = href.includes('intentions');
    const isAnnonces   = href.includes('annonces');
    const isSemaine    = href.includes('calendrier_semaine');
    const isBible      = href.includes('bible.html');
    const isBreviaire  = href.includes('breviaire.html');
    const isNewsletter = href.includes('newsletter.html');
    // "Plus" actif si on est sur une des pages secondaires
    const isPlus = isIntentions || isAnnonces || isSemaine || isNewsletter;

    const menuHTML = `
    <style>
        .mobile-nav {
            position:fixed; bottom:0; left:0; right:0;
            background:#1a1108;
            display:flex; justify-content:space-around; align-items:center;
            height:65px; border-top:2px solid #b8962a;
            z-index:1000; padding-bottom:env(safe-area-inset-bottom);
            box-shadow:0 -4px 20px rgba(0,0,0,.45);
        }
        .nav-item {
            text-decoration:none; display:flex; flex-direction:column;
            align-items:center; justify-content:center; flex:1;
            color:rgba(240,230,184,.32); transition:color .2s; padding:8px 0; gap:3px;
            position:relative; border-radius:6px;
        }
        .nav-item.active { color:#f0d060; }
        .nav-item.active::after {
            content:''; position:absolute; inset:-2px 4px -6px;
            border-radius:6px; background:rgba(201,168,64,.15); z-index:-1;
        }
        .nav-icon { display:flex; line-height:0; }
        .nav-icon svg { width:22px; height:22px; }
        .nav-label {
            font-family:'Cinzel',serif; font-size:.5rem; font-weight:600;
            text-transform:uppercase; letter-spacing:.1em;
        }
        /* Bouton "Plus" */
        .nav-more-btn {
            background:none; border:none; cursor:pointer;
            display:flex; flex-direction:column; align-items:center;
            justify-content:center; flex:1; padding:8px 0; gap:3px;
            color:rgba(240,230,184,.32); transition:color .2s;
            font-family:'Cinzel',serif; position:relative; border-radius:6px;
        }
        .nav-more-btn.active { color:#f0d060; }
        .nav-more-btn.active::after {
            content:''; position:absolute; inset:-2px 4px -6px;
            border-radius:6px; background:rgba(201,168,64,.15); z-index:-1;
        }
        /* SVG icons panneau */
        .nav-svg { display:flex; line-height:0; color:inherit; }
        .nav-svg svg { width:22px; height:22px; }
        .nav-panel-item .nav-svg, .nav-panel-refresh .nav-svg { opacity:.85; }
        /* Panneau secondaire */
        .nav-panel {
            position:fixed; bottom:65px; left:0; right:0;
            background:#1a1108; border-top:1px solid #b8962a44;
            z-index:999; padding:0;
            transform:translateY(100%); opacity:0;
            transition:transform .25s ease, opacity .2s ease;
            pointer-events:none;
            box-shadow:0 -4px 20px rgba(0,0,0,.55);
        }
        .nav-panel.open {
            transform:translateY(0); opacity:1; pointer-events:auto;
        }
        .nav-panel-inner {
            display:flex; flex-wrap:wrap; justify-content:space-around;
            padding:12px 8px calc(8px); gap:4px;
        }
        .nav-panel-item {
            text-decoration:none; display:flex; flex-direction:column;
            align-items:center; justify-content:center;
            width:calc(25% - 8px); padding:10px 4px; gap:4px;
            color:rgba(240,230,184,.55); transition:color .2s;
            border-radius:8px;
        }
        .nav-panel-item:active, .nav-panel-item.active {
            color:var(--gold-light, #d4af37);
            background:rgba(184,150,42,.1);
        }
        .nav-panel-refresh {
            background:none; border:none; cursor:pointer;
            display:flex; flex-direction:column; align-items:center;
            justify-content:center; width:calc(25% - 8px); padding:10px 4px; gap:4px;
            color:rgba(240,230,184,.55); transition:color .2s;
            border-radius:8px; font-family:inherit;
        }
        .nav-panel-refresh:active { color:var(--gold-light, #d4af37); }
        .nav-panel-refresh .nav-svg { transition:transform .4s ease; }
        .nav-panel-refresh.spinning .nav-svg { animation:spin-refresh .6s linear infinite; }
        @keyframes spin-refresh { to { transform:rotate(360deg); } }
        .nav-panel-label {
            font-family:'Cinzel',serif; font-size:.48rem; font-weight:600;
            text-transform:uppercase; letter-spacing:.08em;
        }
        /* Overlay pour fermer le panneau en cliquant en dehors */
        .nav-overlay {
            display:none; position:fixed; inset:0; bottom:65px;
            z-index:998; background:rgba(0,0,0,.18);
            backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
            transition:opacity .2s ease;
        }
        .nav-overlay.open { display:block; }
        @media(max-width:420px){ .nav-label{font-size:.44rem;letter-spacing:.04em} }
        @media(min-width:1024px){
            .mobile-nav{max-width:400px;left:50%;transform:translateX(-50%);border-radius:3px 3px 0 0}
            .nav-panel{max-width:400px;left:50%;transform:translateX(-50%) translateY(100%);}
            .nav-panel.open{transform:translateX(-50%) translateY(0);}
        }
    </style>
    <!-- Overlay -->
    <div class="nav-overlay" id="nav-overlay" onclick="navTogglePlus(false)"></div>
    <!-- Panneau secondaire -->
    <div class="nav-panel" id="nav-panel">
        <div class="nav-panel-inner">
            <a href="intentions.html" class="nav-panel-item ${isIntentions ? 'active' : ''}" onclick="navTogglePlus(false)">
                <span class="nav-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
                </svg></span>
                <span class="nav-panel-label">Gérer</span>
            </a>
            <a href="annonces.html" class="nav-panel-item ${isAnnonces ? 'active' : ''}" onclick="navTogglePlus(false)">
                <span class="nav-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg></span>
                <span class="nav-panel-label">Annonces</span>
            </a>
            <a href="calendrier_semaine.html" class="nav-panel-item ${isSemaine ? 'active' : ''}" onclick="navTogglePlus(false)">
                <span class="nav-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                </svg></span>
                <span class="nav-panel-label">Semaine</span>
            </a>
            <a href="newsletter.html" class="nav-panel-item ${isNewsletter ? 'active' : ''}" onclick="navTogglePlus(false)">
                <span class="nav-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="1"/><polyline points="2,4 12,13 22,4"/>
                </svg></span>
                <span class="nav-panel-label">Newsletter</span>
            </a>
            <button class="nav-panel-refresh" id="btn-nav-refresh" onclick="navRefresh(); navTogglePlus(false);" title="Actualiser">
                <span class="nav-svg" id="nav-refresh-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
                </svg></span>
                <span class="nav-panel-label">Actualiser</span>
            </button>
        </div>
    </div>
    <!-- Barre principale (5 items) -->
    <nav class="mobile-nav">
        <a href="accueil.html" class="nav-item ${isAccueil ? 'active' : ''}">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round">
                <path d="M12 3 L12 21" stroke-width="1.6"/>
                <path d="M6 8.5 L18 8.5" stroke-width="1.6"/>
            </svg></span>
            <span class="nav-label">Accueil</span>
        </a>
        <a href="calendrier.html" class="nav-item ${isCalendrier ? 'active' : ''}">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round">
                <rect x="3" y="5" width="18" height="16" rx="1.5" stroke-width="1.4"/>
                <path d="M3 11 L21 11" stroke-width="1.2"/>
                <path d="M8 3 L8 7" stroke-width="1.6"/>
                <path d="M16 3 L16 7" stroke-width="1.6"/>
                <path d="M7.5 15 L10 15" stroke-width="1.2"/>
                <path d="M14 15 L16.5 15" stroke-width="1.2"/>
                <path d="M7.5 19 L10 19" stroke-width="1.2"/>
                <path d="M14 19 L16.5 19" stroke-width="1.2"/>
            </svg></span>
            <span class="nav-label">Calendrier</span>
        </a>
        <a href="bible.html" class="nav-item ${isBible ? 'active' : ''}">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 5 C3 5 7 5.5 12 5" stroke-width="1.4"/>
                <path d="M3 5 L3 19 C7 18.5 12 19 12 19" stroke-width="1.4"/>
                <path d="M21 5 C17 5.5 12 5 12 5" stroke-width="1.4"/>
                <path d="M21 5 L21 19 C17 18.5 12 19 12 19" stroke-width="1.4"/>
                <path d="M6 9 L10 9" stroke-width="1"/>
                <path d="M6 11.5 L10 11.5" stroke-width="1"/>
                <path d="M6 14 L10 14" stroke-width="1"/>
                <path d="M14 9 L18 9" stroke-width="1"/>
                <path d="M14 11.5 L18 11.5" stroke-width="1"/>
                <path d="M14 14 L18 14" stroke-width="1"/>
            </svg></span>
            <span class="nav-label">Bible</span>
        </a>
        <a href="breviaire.html" class="nav-item ${isBreviaire ? 'active' : ''}">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 8.5C10 7 7 6.6 3 7v12c4-.4 7 0 9 1.5 2-1.5 5-1.9 9-1.5V7c-4-.4-7 0-9 1.5z" stroke-width="1.4"/>
                <path d="M12 8.5v12" stroke-width="1.3"/>
                <path d="M12 1.5v5" stroke-width="1.5"/>
                <path d="M9.8 3.4h4.4" stroke-width="1.5"/>
            </svg></span>
            <span class="nav-label">Bréviaire</span>
        </a>
        <button class="nav-more-btn ${isPlus ? 'active' : ''}" id="btn-nav-more" onclick="navTogglePlus()" aria-label="Plus de pages">
            <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">
                <circle cx="6.5"  cy="12" r="1.4" fill="currentColor"/>
                <circle cx="12"   cy="12" r="1.4" fill="currentColor"/>
                <circle cx="17.5" cy="12" r="1.4" fill="currentColor"/>
            </svg></span>
            <span class="nav-label">Plus</span>
        </button>
    </nav>`;

    const container = document.getElementById('menu-container');
    if (container) {
        container.innerHTML = menuHTML;
    } else {
        // DOM pas encore prêt — attendre
        document.addEventListener('DOMContentLoaded', function() {
            const c = document.getElementById('menu-container');
            if (c) c.innerHTML = menuHTML;
        });
    }
})();

// ── Panneau "Plus" ────────────────────────────────────────────────
function navTogglePlus(force) {
    const panel   = document.getElementById('nav-panel');
    const overlay = document.getElementById('nav-overlay');
    const btn     = document.getElementById('btn-nav-more');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    const shouldOpen = (force === undefined) ? !isOpen : !!force;
    panel.classList.toggle('open', shouldOpen);
    if (overlay) overlay.classList.toggle('open', shouldOpen);
    if (btn) btn.classList.toggle('active', shouldOpen);
}

// ── Actualisation — appelle la fonction propre à chaque page ─────
function navRefresh() {
    const btn  = document.getElementById('btn-nav-refresh');
    const icon = document.getElementById('nav-refresh-icon');
    if (!btn) return;

    btn.classList.add('spinning');
    btn.disabled = true;

    // Détecter la page et appeler la bonne fonction
    const href = window.location.href;
    let fn = null;
    if      (href.includes('intentions'))         fn = window.chargerDemandes;
    else if (href.includes('annonces'))           fn = window.charger;
    else if (href.includes('calendrier_semaine')) fn = window.chargerSemaine;
    else if (href.includes('calendrier.html'))    fn = window.chargerAgenda;
    else if (href.includes('newsletter'))         fn = window.chargerNewsletter;
    else if (href.includes('accueil') || href.endsWith('/') || href.endsWith('index.html'))
                                                  fn = window.initDashboard;

    const stop = () => {
        btn.classList.remove('spinning');
        btn.disabled = false;
    };

    if (fn) {
        const result = fn();
        // Si la fonction retourne une Promise, attendre qu'elle se termine
        if (result && typeof result.finally === 'function') {
            result.finally(stop);
        } else {
            setTimeout(stop, 800);
        }
    } else {
        // Fallback : recharger la page
        window.location.reload();
    }
}
