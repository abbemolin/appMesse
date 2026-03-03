// ==========================================
// MODAL CUSTOM - remplace alert() et confirm()
// Utilisé dans toutes les pages de l'app
// ==========================================

// Injecte le HTML du modal dans le body au chargement
(function() {
    const html = `
    <style>
        .app-modal-overlay { display:none; position:fixed; inset:0; z-index:9900; background:rgba(15,23,42,0.55); align-items:flex-end; justify-content:center; padding:0 0 env(safe-area-inset-bottom); }
        .app-modal-overlay.visible { display:flex; animation: fadeIn 0.2s ease; }
        .app-modal-box { background:white; border-radius:20px 20px 0 0; padding:26px 20px 32px; width:100%; max-width:520px; animation:slideUp 0.25s ease-out; }
        .app-modal-icon { font-size:2.2rem; margin-bottom:10px; }
        .app-modal-title { font-size:1.1rem; font-weight:800; color:#0f172a; margin-bottom:8px; }
        .app-modal-msg { font-size:0.92rem; color:#475569; line-height:1.55; margin-bottom:22px; white-space:pre-wrap; }
        .app-modal-btn { display:block; width:100%; padding:15px; border:none; border-radius:12px; font-size:1rem; font-weight:700; cursor:pointer; margin-bottom:8px; transition:opacity 0.15s; }
        .app-modal-btn:active { opacity:0.85; }
        .app-modal-btn-primary { background:#4f46e5; color:white; }
        .app-modal-btn-danger  { background:#ef4444; color:white; }
        .app-modal-btn-success { background:#16a34a; color:white; }
        .app-modal-btn-ghost   { background:transparent; color:#94a3b8; }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @media (min-width:600px) {
            .app-modal-overlay { align-items:center; padding:20px; }
            .app-modal-box { border-radius:20px; max-height:90vh; overflow-y:auto; }
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
