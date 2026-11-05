// ══════════════════════════════════════════════════════════
// MESSE — calendrier et propre issus de Divinum Officium (rubriques 1960)
// data/messe/calendrier.js et data/messe/AAAA/MM-JJ.json
// ══════════════════════════════════════════════════════════
(function () {
    const pad = n => String(n).padStart(2, '0');
    const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
    const ancienGetDay = Ordo1962.getDay;

    // Propre de la communauté (SMMD), à côté du calendrier romain
    const SMMD = {
        '12-01': { fete: 'S. Charles de Foucauld', classe: '3e classe', rang: 3 },
        '02-15': { fete: 'B. Michel Sopocko', classe: '3e classe', rang: 3 },
        '10-05': { fete: 'Ste Faustine', classe: '1re classe', rang: 1 },
        '10-22': { fete: 'S. Jean-Paul II', classe: '3e classe', rang: 3 },
        '11-16': { fete: 'Notre-Dame de la Miséricorde', classe: '3e classe', rang: 3 },
    };

    // 1re classe : remplace tout sauf une 1re classe. 3e classe : cède aux 1re et 2e classes et aux féries de Carême.
    function smmdRemplace(f, c) {
        if (!f) return false;
        if (!c) return true;
        if (f.rang === 1) return c.rang !== 1;
        if (c.rang < 3) return false;
        return !/^Feria.*(Quadragesim|Passion|Cinerum)/.test(c.titre || '');
    }
    window.Smmd = { fete: (m, d) => SMMD[`${pad(m)}-${pad(d)}`] || null, remplace: smmdRemplace };
    const ancienneCle = Ordo1962.getProperKey;

    // Mêmes champs qu'avant pour les pages ; hors calendrier généré, l'ancien calcul sert de repli
    Ordo1962.getDay = function (y, m, d) {
        const base = ancienGetDay(y, m, d);
        const c = (window.CALENDRIER_MESSE || {})[iso(y, m, d)];
        const f = Smmd.fete(m, d);
        const r = c ? Object.assign({}, base, {
            date: iso(y, m, d), fete: titreFrancais(c.titre_fr || c.titre), classe: c.classe, rang: c.rang,
            couleur: c.couleur, commemoration: c.comm || null, autres: [], source: 'divinum',
        }) : base;
        if (f && smmdRemplace(f, c)) {
            return Object.assign({}, r, { date: iso(y, m, d), fete: f.fete, classe: f.classe, rang: f.rang,
                couleur: 'Blanc', commemoration: null, autres: [], source: 'smmd', romain: r.fete });
        }
        return r;
    };
    Ordo1962.getWeek = function (y, m, d) {
        return Array.from({ length: 7 }, (_, i) => {
            const j = new Date(y, m - 1, d + i);
            return Ordo1962.getDay(j.getFullYear(), j.getMonth() + 1, j.getDate());
        });
    };
    Ordo1962.getProperKey = o =>
        o && o.date && ((window.CALENDRIER_MESSE || {})[o.date] || o.source === 'smmd') ? o.date : (ancienneCle ? ancienneCle(o) : null);

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
        if (messes[i].smmd) return 'Communauté';
        if (messes.some(m => m.smmd) && messes.filter(m => !m.smmd).length === 1) return 'Calendrier romain';
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
        document.getElementById('propre-acc-multi').innerHTML = '';
        const box = document.getElementById('propre-acc-pieces');
        box.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted);">Chargement…</div>';
        document.getElementById('modal-propre-acc').style.display = 'flex';
        _messe = null;
        let hs = false;
        try {
            const rep = await fetch(`data/messe/${y}/${pad(m)}-${pad(d)}.json`);
            if (rep.ok) {
                _messe = await rep.json();
                _active = _messe.principal || 0;
                // Jeudi saint : la Messe chrismale et la Messe du soir (la 3e entrée n'est pas de 1960)
                if (/chrism/i.test(_messe.messes[0].titre)) _messe.messes = _messe.messes.slice(0, 2);
            }
        } catch (e) { console.error(e); hs = true; }
        const f = Smmd.fete(m, d);
        if (f) {
            try {
                const rep = await fetch('data/messe/smmd.json');
                const toutes = rep.ok ? await rep.json() : null;
                const pm = toutes && toutes[`${pad(m)}-${pad(d)}`];
                if (pm) {
                    const c = (window.CALENDRIER_MESSE || {})[date];
                    const lignes = pm.lignes.slice();
                    // Depuis la Septuagésime : le Trait remplace le Graduel et l'Alléluia
                    if (pm.trait && c && /gesim|Quadragesim/i.test(c.titre || '')) {
                        const i = lignes.findIndex(l => />Graduale</.test(l[0]));
                        if (i >= 0) lignes[i] = pm.trait;
                    }
                    const propre = { titre: pm.titre, titre_fr: pm.titre_fr, lignes, smmd: true };
                    _messe = _messe || { messes: [], principal: 0 };
                    _messe.messes.unshift(propre);
                    _active = smmdRemplace(f, c) ? 0 : (_messe.principal || 0) + 1;
                }
            } catch (e) { console.error(e); hs = hs && !_messe; }
        }
        if (_messe) { afficherChoixMesse(); majTitre(); }
        else if (hs) {
            box.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink-muted);font-style:italic;">Propre indisponible sans connexion pour ce jour.</div>';
            return;
        }
        renderPropreAccPieces();
    };
})();
