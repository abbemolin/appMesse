// ══════════════════════════════════════════════════════════
// MESSE — calendrier et propre issus de Divinum Officium (rubriques 1960)
// data/messe/calendrier.js et data/messe/AAAA/MM-JJ.json
// ══════════════════════════════════════════════════════════
(function () {
    const pad = n => String(n).padStart(2, '0');
    const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
    const ancienGetDay = Ordo1962.getDay;
    const ancienneCle = Ordo1962.getProperKey;

    // Mêmes champs qu'avant pour les pages ; hors calendrier généré, l'ancien calcul sert de repli
    Ordo1962.getDay = function (y, m, d) {
        const base = ancienGetDay(y, m, d);
        const c = (window.CALENDRIER_MESSE || {})[iso(y, m, d)];
        if (!c) return base;
        return Object.assign({}, base, {
            date: iso(y, m, d), fete: titreFrancais(c.titre_fr || c.titre), classe: c.classe, rang: c.rang,
            couleur: c.couleur, commemoration: c.comm || null, autres: [], source: 'divinum',
        });
    };
    Ordo1962.getWeek = function (y, m, d) {
        return Array.from({ length: 7 }, (_, i) => {
            const j = new Date(y, m - 1, d + i);
            return Ordo1962.getDay(j.getFullYear(), j.getMonth() + 1, j.getDate());
        });
    };
    Ordo1962.getProperKey = o =>
        o && o.date && (window.CALENDRIER_MESSE || {})[o.date] ? o.date : (ancienneCle ? ancienneCle(o) : null);

    const css = document.createElement('style');
    css.textContent = `
      .messe-piece { font-family: 'EB Garamond', Georgia, serif; font-size: 1.05rem; line-height: 1.7; color: var(--ink); }
      @media (prefers-color-scheme: dark) { .messe-piece { color: #fff; } }
      .messe-piece .do-rubr { color: var(--rubric); }
      .messe-piece .do-petit { color: var(--rubric); font-size: .82em; }
      .messe-piece .do-initiale { color: var(--rubric); font-weight: 700; }
      .messe-piece .do-titre { display: block; margin-bottom: 6px; color: var(--rubric); font-family: 'Cinzel', serif;
        font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; }
      .messe-piece .do-titre b, .messe-piece .do-titre i { font-weight: 600; font-style: normal; }
      .messe-piece .do-note { display: block; color: var(--ink-muted); font-size: .85em; font-style: italic; }
    `;
    document.head.appendChild(css);

    const LIBELLES = { Introitus: 'Introït', Oratio: 'Collecte', Lectio: 'Épître', Graduale: 'Graduel', Tractus: 'Trait',
        Sequentia: 'Séquence', Evangelium: 'Évangile', Offertorium: 'Offertoire', Secreta: 'Secrète', Prefatio: 'Préface',
        Communio: 'Communion', Gloria: 'Gloria', Credo: 'Credo', Postcommunio: 'Postcommunion', 'Oratio super populum': 'Oraison sur le peuple' };

    window.formeMesse = function (html, nomPartie) {
        return html
            .replace(/\s*\{[^{}]*\}/g, '')
            .replace(/<span class="do-(?:titre|rubr)"><b><i>(.)<\/i><\/b><\/span>/gu, '<span class="do-initiale">$1</span>')
            .replace(/<span class="do-titre"><b><i>([^<]+)<\/i><\/b><\/span>/g, (t, nom) =>
                `<span class="do-titre">${nomPartie(nom.trim())}</span>`)
            .replace(/^(<span class="do-titre">[^<]*<\/span>)\s*(?:<br>\s*)+/, '$1');
    };

    const omise = cellule => /^\s*<span class="do-titre">[^]*?<\/span>\s*(?:<br>\s*)*(?:<[^>]+>\s*)*omit\.?\s*(?:<[^>]+>\s*)*$/i.test(cellule);

    window.nomMesse = function (messes, i) {
        const noms = messes.map(m => titreFrancais(m.titre_fr || m.titre));
        const tous = new Set(noms).size === noms.length;
        if (/chrism/i.test(messes[i].titre)) return 'Messe chrismale';
        if (/C.na Domini/.test(messes[i].titre)) return 'Messe du soir';
        if (/in nocte/.test(messes[i].titre)) return 'Nuit';
        if (/in aurora/.test(messes[i].titre)) return 'Aurore';
        if (/In die Nativitatis/.test(messes[i].titre)) return 'Jour';
        if (/Quattuor Temporum/.test(messes[i].titre)) {
            const taille = m => JSON.stringify(m.lignes).length;
            return taille(messes[i]) >= Math.max(...messes.map(taille)) ? 'Forme longue' : 'Forme courte';
        }
        return tous ? noms[i] : `${i + 1}${i ? 'e' : 're'} Messe`;
    };

    let _messe = null, _active = 0;

    window.renderPropreAccPieces = function () {
        const c = document.getElementById('propre-acc-pieces');
        if (!_messe) {
            c.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-muted);font-style:italic;">Propre non disponible pour ce jour.</div>';
            return;
        }
        const m = _messe.messes[_active];
        const fr = (typeof _propreAccLang !== 'undefined' ? _propreAccLang : 'la') === 'fr';
        // Plusieurs lectures (Quatre-Temps) : leçons, puis l'Épître en dernier
        const lignes = m.lignes.filter(l => !omise(l[0]));
        const nbLectures = lignes.filter(l => />Lectio</.test(l[0])).length;
        let lecture = 0;
        c.innerHTML = lignes.map(l => {
            const nomPartie = n => {
                if (!fr) return n;
                if (n === 'Lectio') return ++lecture < nbLectures ? 'Leçon' : 'Épître';
                return LIBELLES[n] || n;
            };
            return `<div class="messe-piece">${formeMesse(fr ? l[1] : l[0], nomPartie)}</div>`;
        }).join('');
    };

    function afficherChoixMesse() {
        const sel = document.getElementById('propre-acc-multi');
        sel.innerHTML = '';
        if (!_messe || _messe.messes.length < 2) { sel.style.display = 'none'; return; }
        sel.style.display = 'flex';
        sel.innerHTML = '';
        _messe.messes.forEach((m, i) => {
            const b = document.createElement('button');
            const a = i === _active;
            b.textContent = nomMesse(_messe.messes, i);
            b.style.cssText = `padding:6px 12px;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:.62rem;letter-spacing:.06em;background:${a ? '#8b1a1a' : 'transparent'};color:${a ? '#fff' : '#c04040'};`;
            b.onclick = () => { _active = i; afficherChoixMesse(); majTitre(); renderPropreAccPieces(); document.getElementById('propre-acc-pieces').scrollTop = 0; };
            sel.appendChild(b);
        });
    }

    function majTitre() {
        const m = _messe.messes[_active];
        document.getElementById('propre-acc-fete').textContent = titreFrancais(m.titre_fr || m.titre);
    }

    const MOIS_MESSE = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

    window.ouvrirPropreAccueil = async function (date) {
        const [y, m, d] = date.split('-').map(Number);
        const o = Ordo1962.getDay(y, m, d);
        document.getElementById('propre-acc-date').textContent = `${d} ${MOIS_MESSE[m - 1]} ${y}`;
        document.getElementById('propre-acc-fete').textContent = (o && o.fete) || '';
        document.getElementById('propre-acc-multi').style.display = 'none';
        const box = document.getElementById('propre-acc-pieces');
        box.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted);">Chargement…</div>';
        document.getElementById('modal-propre-acc').style.display = 'flex';
        _messe = null;
        try {
            const rep = await fetch(`data/messe/${y}/${pad(m)}-${pad(d)}.json`);
            if (rep.ok) {
                _messe = await rep.json();
                // Jeudi saint : la Messe chrismale et la Messe du soir (la 3e entrée n'est pas de 1960)
                if (/chrism/i.test(_messe.messes[0].titre)) _messe.messes = _messe.messes.slice(0, 2);
                _active = _messe.principal || 0;
                afficherChoixMesse();
                majTitre();
            }
        } catch (e) {
            console.error(e);
            box.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-muted);font-style:italic;">Propre indisponible sans connexion pour ce jour.</div>';
            return;
        }
        renderPropreAccPieces();
    };
})();
