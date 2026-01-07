const menuHTML = `
    <style>
        :root {
            --nav-bg: #ffffff;
            --nav-active: #4f46e5;
            --nav-inactive: #94a3b8;
        }

        /* Barre de navigation basse (Mobile) */
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--nav-bg);
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 65px;
            border-top: 1px solid #e2e8f0;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            z-index: 1000;
            padding-bottom: env(safe-area-inset-bottom); /* Gère l'encoche du bas sur iPhone */
        }

        .nav-item {
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: var(--nav-inactive);
            transition: 0.2s;
        }

        .nav-item.active {
            color: var(--nav-active);
        }

        .nav-icon {
            font-size: 1.2rem;
            margin-bottom: 4px;
        }

        .nav-label {
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        /* Ajustement du corps de la page pour ne pas cacher le contenu sous le menu */
        body {
            padding-bottom: 80px; 
        }

        /* Masquer le menu sur les très grands écrans si besoin (optionnel) */
        @media (min-width: 1024px) {
            .mobile-nav {
                max-width: 400px;
                left: 50%;
                transform: translateX(-50%);
                border-radius: 20px 20px 0 0;
            }
        }
    </style>

    <nav class="mobile-nav">
        <a href="accueil.html" class="nav-item ${window.location.pathname.includes('accueil') ? 'active' : ''}">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">Accueil</span>
        </a>
        <a href="calendrier.html" class="nav-item ${window.location.pathname.includes('calendrier') ? 'active' : ''}">
            <span class="nav-icon">📅</span>
            <span class="nav-label">Calendrier</span>
        </a>
        <a href="intentions.html" class="nav-item ${window.location.pathname.includes('intentions') ? 'active' : ''}">
            <span class="nav-icon">✍️</span>
            <span class="nav-label">Gérer</span>
        </a>
        <a href="#" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Profil</span>
        </a>
    </nav>
`;

document.getElementById('menu-container').innerHTML = menuHTML;
