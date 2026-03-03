(function() {
    // Détection robuste de la page active (fonctionne sur GitHub Pages, sous-dossiers, etc.)
    const href = window.location.href;
    const isAccueil     = href.includes('accueil')     || href.endsWith('/') || href.endsWith('index.html');
    const isCalendrier  = href.includes('calendrier');
    const isIntentions  = href.includes('intentions');

    const menuHTML = `
    <style>
        :root {
            --nav-bg: #ffffff;
            --nav-active: #4f46e5;
            --nav-inactive: #94a3b8;
        }
        .mobile-nav {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: var(--nav-bg);
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 65px;
            border-top: 1px solid #e2e8f0;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            z-index: 1000;
            padding-bottom: env(safe-area-inset-bottom);
        }
        .nav-item {
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: var(--nav-inactive);
            transition: color 0.2s;
            padding: 8px 0;
        }
        .nav-item.active { color: var(--nav-active); }
        .nav-icon { font-size: 1.3rem; margin-bottom: 3px; }
        .nav-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        body { padding-bottom: calc(65px + env(safe-area-inset-bottom)); }
        @media (min-width: 1024px) {
            .mobile-nav { max-width: 400px; left: 50%; transform: translateX(-50%); border-radius: 20px 20px 0 0; }
        }
    </style>
    <nav class="mobile-nav">
        <a href="accueil.html" class="nav-item ${isAccueil ? 'active' : ''}">
            <span class="nav-icon">🏠</span>
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
    </nav>`;

    document.getElementById('menu-container').innerHTML = menuHTML;
})();
