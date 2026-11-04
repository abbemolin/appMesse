// ==========================================
// MODAL CUSTOM - remplace alert() et confirm()
// Utilisé dans toutes les pages de l'app
// ==========================================

// Injecte le HTML du modal dans le body au chargement
(function() {
    const html = `
    <style>
        .app-modal-overlay { display:none; position:fixed; inset:0; z-index:9900; background:rgba(10,7,3,.6); align-items:flex-end; justify-content:center; }
        .app-modal-overlay.visible { display:flex; animation: appModalFade .18s ease; }
        .app-modal-box {
            background:var(--vellum-light,#faf7ef); color:var(--ink,#1a1108);
            border-top:3px solid var(--gold,#b8962a); border-radius:6px 6px 0 0;
            padding:24px 20px calc(24px + env(safe-area-inset-bottom,0px)); width:100%; max-width:480px; text-align:center;
            box-shadow:0 -8px 32px rgba(0,0,0,.3); animation: appModalUp .22s ease;
        }
        .app-modal-icon { font-size:1.7rem; margin-bottom:8px; }
        .app-modal-title { font-family:'Cinzel',serif; font-size:.82rem; font-weight:700; letter-spacing:.08em; color:var(--ink,#1a1108); margin-bottom:8px; }
        .app-modal-msg { font-family:'EB Garamond',serif; font-size:1.02rem; color:var(--ink-soft,#3a2d1a); line-height:1.5; margin-bottom:20px; white-space:pre-line; }
        .app-modal-btn { display:block; width:100%; min-height:44px; padding:12px; border:none; border-radius:3px; font-family:'Cinzel',serif; font-size:.68rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; margin-bottom:8px; }
        .app-modal-btn:active { opacity:.85; }
        .app-modal-btn-primary { background:#1a1108; color:#e8cf80; }
        .app-modal-btn-danger  { background:#8b1a1a; color:#fff; }
        .app-modal-btn-success { background:#2a5e3a; color:#fff; }
        .app-modal-btn-ghost   { background:transparent; color:var(--ink-muted,#7a6f5a); margin-bottom:0; }
        @keyframes appModalUp { from { transform:translateY(24px); opacity:.4; } to { transform:none; opacity:1; } }
        @keyframes appModalFade { from { opacity:0; } to { opacity:1; } }
        @media (prefers-color-scheme: dark) { .app-modal-btn-primary { background:#c9a840; color:#1a1108; } }
        @media (min-width:600px) {
            .app-modal-overlay { align-items:center; padding:20px; }
            .app-modal-box { border-radius:6px; max-height:90vh; overflow-y:auto; }
        }
    </style>
    <div id="app-modal-overlay" class="app-modal-overlay">
        <div class="app-modal-box">
            <div id="app-modal-icon" class="app-modal-icon"></div>
            <div id="app-modal-title" class="app-modal-title"></div>
            <div id="app-modal-msg" class="app-modal-msg"></div>
            <button id="app-modal-btn1" class="app-modal-btn app-modal-btn-primary"></button>
            <button id="app-modal-btn2" class="app-modal-btn app-modal-btn-ghost" style="display:none"></button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('app-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) AppModal.close();
    });
})();

const AppModal = {
    _resolve: null,

    // Simple message (remplace alert)
    alert(icon, title, msg, btnLabel = 'OK', btnClass = 'app-modal-btn-primary') {
        return new Promise(resolve => {
            this._resolve = resolve;
            this._show(icon, title, msg);
            const btn1 = document.getElementById('app-modal-btn1');
            btn1.textContent = btnLabel;
            btn1.className = 'app-modal-btn ' + btnClass;
            btn1.onclick = () => { this.close(); resolve(true); };
            document.getElementById('app-modal-btn2').style.display = 'none';
        });
    },

    // Confirmation (remplace confirm) — retourne true/false
    confirm(icon, title, msg, btnConfirm = 'Confirmer', btnClass = 'app-modal-btn-danger') {
        return new Promise(resolve => {
            this._resolve = resolve;
            this._show(icon, title, msg);
            const btn1 = document.getElementById('app-modal-btn1');
            btn1.textContent = btnConfirm;
            btn1.className = 'app-modal-btn ' + btnClass;
            btn1.onclick = () => { this.close(); resolve(true); };
            const btn2 = document.getElementById('app-modal-btn2');
            btn2.textContent = 'Annuler';
            btn2.style.display = 'block';
            btn2.onclick = () => { this.close(); resolve(false); };
        });
    },

    _show(icon, title, msg) {
        document.getElementById('app-modal-icon').textContent = icon;
        document.getElementById('app-modal-title').textContent = title;
        document.getElementById('app-modal-msg').textContent = msg;
        document.getElementById('app-modal-overlay').classList.add('visible');
    },

    close() {
        document.getElementById('app-modal-overlay').classList.remove('visible');
    }
};
