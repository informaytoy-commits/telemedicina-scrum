// Funciones compartidas para toda la aplicación
const AppHelper = {
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('rol');
        window.location.href = '/';
    },

    validarSesion: (rolRequerido) => {
        const token = localStorage.getItem('token');
        const rol = localStorage.getItem('rol');

        if (!token) {
            window.location.href = '/';
            return null;
        }

        if (rolRequerido && rol !== rolRequerido) {
            AppHelper.showAlert('No Autorizado', 'No posees los permisos necesarios para visualizar este panel. Serás redirigido.');
            setTimeout(() => { window.location.href = '/'; }, 2000);
            return null;
        }

        return { token, rol, usuario: JSON.parse(localStorage.getItem('usuario')) };
    },
    
    bindLogoutButton: () => {
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', AppHelper.logout);
        }
    },
    
    showToast: (message, type = 'success') => {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === 'error') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else if (type === 'warning') {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else {
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Reflow for animation
        void toast.offsetWidth;

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.95)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    showAlert: (title, message) => {
        AppHelper._renderModal(title, message, false);
    },

    showConfirm: (title, message, onConfirm) => {
        AppHelper._renderModal(title, message, true, onConfirm);
    },

    _renderModal: (title, message, isConfirm, onConfirmCallback) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';

        const modal = document.createElement('div');
        modal.className = 'app-modal';
        modal.style.backgroundColor = 'var(--surface)';
        modal.style.padding = '2rem';
        modal.style.borderRadius = 'var(--radius-lg)';
        modal.style.boxShadow = 'var(--shadow-lg)';
        modal.style.maxWidth = '400px';
        modal.style.width = '90%';
        modal.style.transform = 'scale(0.95)';
        modal.style.transition = 'transform 0.2s';

        modal.innerHTML = `
            <h3 style="margin-top:0; font-size: 1.25rem; color: var(--text-main)">${title}</h3>
            <p style="color: var(--text-muted); line-height: 1.5; font-size: 0.95rem; margin-bottom: 2rem;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                ${isConfirm ? `<button id="modalBtnCancel" class="btn btn-secondary">Cancelar</button>` : ''}
                <button id="modalBtnOk" class="btn btn-primary">Aceptar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';

        const closeModal = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            setTimeout(() => overlay.remove(), 200);
        };

        modal.querySelector('#modalBtnOk').addEventListener('click', () => {
            closeModal();
            if (isConfirm && onConfirmCallback) onConfirmCallback();
        });

        if (isConfirm) {
            modal.querySelector('#modalBtnCancel').addEventListener('click', closeModal);
        }
    }
};
