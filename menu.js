(function() {
    const href = window.location.href;
    const isAccueil    = href.includes('accueil') || href.endsWith('/') || href.endsWith('index.html');
    const isCalendrier = href.includes('calendrier.html');
    const isIntentions = href.includes('intentions');
    const isSemaine    = href.includes('calendrier_semaine');

    const menuHTML = `
    <style>
        .mobile-nav {
            position:fixed; bottom:0; left:0; right:0;
            background:var(--ink, #1a1108);
            display:flex; justify-content:space-around; align-items:center;
            height:65px; border-top:2px solid var(--gold, #b8962a);
            z-index:1000; padding-bottom:env(safe-area-inset-bottom);
            box-shadow:0 -4px 20px rgba(0,0,0,.35);
        }
        .nav-item {
            text-decoration:none; display:flex; flex-direction:column;
            align-items:center; justify-content:center; flex:1;
            color:rgba(240,230,184,.45); transition:color .2s; padding:8px 0; gap:3px;
        }
        .nav-item.active { color:var(--gold-light, #d4af37); }
        .nav-icon { font-size:1.2rem; }
        .nav-label {
            font-family:'Cinzel',serif; font-size:.5rem; font-weight:600;
            text-transform:uppercase; letter-spacing:.1em;
        }
        .nav-refresh {
            background:none; border:none; cursor:pointer;
            display:flex; flex-direction:column; align-items:center;
            justify-content:center; flex:1; padding:8px 0; gap:3px;
            color:rgba(240,230,184,.45); transition:color .2s;
        }
        .nav-refresh:active { color:var(--gold-light, #d4af37); }
        .nav-refresh .nav-icon { transition:transform .4s ease; }
        .nav-refresh.spinning .nav-icon { animation:spin-refresh .6s linear infinite; }
        @keyframes spin-refresh { to { transform:rotate(360deg); } }
        @media(min-width:1024px){
            .mobile-nav{max-width:400px;left:50%;transform:translateX(-50%);border-radius:3px 3px 0 0}
        }
    </style>
    <nav class="mobile-nav">
        <a href="accueil.html" class="nav-item ${isAccueil ? 'active' : ''}">
            <span class="nav-icon">✝</span>
            <span class="nav-label">Accueil</span>
        </a>
        <a href="calendrier.html" class="nav-item ${isCalendrier ? 'active' : ''}">
            <span class="nav-icon">📅</span>
            <span class="nav-label">Calendrier</span>
        </a>
        <a href="intentions.html" class="nav-item ${isIntentions ? 'active' : ''}">
            <span class="nav-icon">✍️</span>
            <span class="nav-label">Gérer</span>
        </a>
        <a href="calendrier_semaine.html" class="nav-item ${isSemaine ? 'active' : ''}">
            <span class="nav-icon">📄</span>
            <span class="nav-label">Semaine</span>
        </a>
        <button class="nav-refresh" id="btn-nav-refresh" onclick="navRefresh()" title="Actualiser">
            <span class="nav-icon" id="nav-refresh-icon">↻</span>
            <span class="nav-label">Actualiser</span>
        </button>
    </nav>`;

    document.getElementById('menu-container').innerHTML = menuHTML;
})();

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
    if      (href.includes('intentions'))        fn = window.chargerDemandes;
    else if (href.includes('calendrier_semaine')) fn = window.chargerSemaine;
    else if (href.includes('calendrier.html'))    fn = window.chargerAgenda;
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
