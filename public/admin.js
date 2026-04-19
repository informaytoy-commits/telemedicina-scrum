document.addEventListener('DOMContentLoaded', () => {
    const sesion = AppHelper.validarSesion('admin');
    if(!sesion) return; // Se redirecciona en la validación

    AppHelper.bindLogoutButton();

    // Actualizar saludo
    const userDisplay = document.getElementById('userNameDisplay');
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
        try {
            const usuarioObj = JSON.parse(usuarioStr);
            userDisplay.textContent = `Hola, ${usuarioObj.nombre}`;
        } catch (e) {
            console.error(e);
        }
    }

    // Nodos UI
    const medicosList = document.getElementById('medicosList');
    const logsTableBody = document.getElementById('logsTableBody');

    // Módulos estáticos de estadística
    const statUsuarios = document.getElementById('stat-usuarios');
    const statPacientes = document.getElementById('stat-pacientes');
    const statMedicosActivos = document.getElementById('stat-medicos-activos');
    const statPendientes = document.getElementById('stat-pendientes');
    const statDocumentos = document.getElementById('stat-documentos');

    const token = localStorage.getItem('token');

    // Inicialización
    cargarResumen();
    cargarMedicosPendientes();
    cargarLogs();

    // =============== FETCHER FUNCTIONS ===============

    async function cargarResumen() {
        try {
            const res = await fetch('/api/admin/resumen', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.resumen) {
                statUsuarios.textContent = data.resumen.totalUsuarios;
                statPacientes.textContent = data.resumen.totalPacientes;
                statMedicosActivos.textContent = data.resumen.medicosActivos;
                statPendientes.textContent = data.resumen.medicosPendientes;
                statDocumentos.textContent = data.resumen.documentosPendientes;
            }
        } catch (error) {
            console.error('Error cargando resumen:', error);
        }
    }

    async function cargarMedicosPendientes() {
        medicosList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                <span class="spinner" style="margin-bottom: 1rem;"></span>
                <div class="empty-title">Consultando base de datos...</div>
            </div>`;
        try {
            const res = await fetch('/api/admin/medicos-pendientes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.medicos) {
                if (data.medicos.length === 0) {
                    medicosList.innerHTML = `
                        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                            <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <div class="empty-title">¡Excelente!</div>
                            <p style="margin: 0; font-size: 0.9rem">No hay médicos pendientes de validación en este momento.</p>
                        </div>
                    `;
                } else {
                    renderizarMedicosPendientes(data.medicos);
                }
            } else {
                medicosList.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                        <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        <div class="empty-title">Error en el servidor</div>
                        <p style="margin: 0; font-size: 0.9rem">Error leyendo médicos. Contacte a soporte.</p>
                    </div>`;
            }
        } catch (error) {
            console.error('Error cargando pendientes:', error);
            medicosList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <div class="empty-title">Fallo de red</div>
                    <p style="margin: 0; font-size: 0.9rem">Fallo de conexión al consultar médicos.</p>
                </div>`;
        }
    }

    async function cargarLogs() {
        try {
            const res = await fetch('/api/admin/logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.logs) {
                logsTableBody.innerHTML = '';
                if(data.logs.length === 0) {
                    logsTableBody.innerHTML = `
                        <tr>
                            <td colspan="4">
                                <div class="empty-state" style="border: none; padding: 2rem;">
                                    <svg class="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    <div class="empty-title">Registro vacío</div>
                                    <p style="margin: 0; font-size: 0.9rem">No hay registros de sistema activos.</p>
                                </div>
                            </td>
                        </tr>`;
                }

                data.logs.forEach(log => {
                    const fechaTxt = new Date(log.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="color: var(--text-muted); font-size: 0.85rem">${fechaTxt}</td>
                        <td style="font-weight: 500">${log.accion}</td>
                        <td>${log.nombre || '-'} <span style="color: var(--primary); font-size: 0.75rem">(${log.rol || 'desconocido'})</span></td>
                        <td style="color: var(--text-muted); font-size: 0.9rem">${log.detalle || '-'}</td>
                    `;
                    logsTableBody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error('Error cargando logs:', error);
            logsTableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="empty-state" style="border: none; padding: 2rem;">
                            <svg class="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <div class="empty-title">Fallo de red</div>
                            <p style="margin: 0; font-size: 0.9rem">Fallo consultando auditoría.</p>
                        </div>
                    </td>
                </tr>`;
        }
    }

    // =============== RENDERERS ===============

    function renderizarMedicosPendientes(medicos) {
        medicosList.innerHTML = '';
        medicos.forEach(med => {
            
            // Archivo doc UI
            let docInfo = '<span style="color: var(--text-muted); font-size: 0.8rem">No subió documento.</span>';
            let archivoLink = null;
            if (med.documentos && med.documentos.length > 0) {
                const doc = med.documentos[0]; 
                archivoLink = `/uploads/${doc.archivo}`;
                docInfo = `<a href="${archivoLink}" target="_blank" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; display: inline-flex; width: 100%; justify-content: center">Abrir Constancia</a>`;
            }

            const card = document.createElement('div');
            card.className = 'medico-card';
            
            // Foto UI
            let initialString = med.nombre ? med.nombre.charAt(0).toUpperCase() : '?';
            let fallbackInner = `<div class="medico-avatar">${initialString}</div>`;
            
            let photoPath = med.foto ? (med.foto.startsWith('/') ? med.foto : `/uploads/${med.foto}`) : '';
            let fotoHTML = photoPath ? 
                `<div class="medico-avatar">
                   <img src="${photoPath}" alt="Foto" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">
                 </div>` : 
                 fallbackInner;

            card.innerHTML = `
                <div class="medico-header">
                    ${fotoHTML}
                    <div class="medico-info">
                        <h3>${med.nombre}</h3>
                        <p>${med.especialidad || 'Sin especialidad'}</p>
                    </div>
                </div>
                
                <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.5rem;">
                    <strong>Email:</strong> ${med.email}<br>
                    <strong>Matrícula:</strong> ${med.matricula_profesional || 'N/A'}<br>
                    <strong>CI:</strong> ${med.ci || 'N/A'}<br>
                    <strong>Tel:</strong> ${med.telefono || 'N/A'}
                </div>

                ${docInfo}

                <div class="admin-card-actions" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1.25rem; display: flex; gap: 0.75rem">
                    <button class="btn action-btn btn-success" data-id="${med.id}" data-action="aprobar" style="flex: 1; background-color: var(--success); color: white;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Aprobar
                    </button>
                    <button class="btn btn-secondary action-btn" data-id="${med.id}" data-action="rechazar" style="flex: 1; color: var(--error); border-color: rgba(222, 53, 11, 0.4);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Rechazar
                    </button>
                </div>
            `;
            medicosList.appendChild(card);
        });

        // Binds
        medicosList.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', manejarAccionMedico);
        });
    }

    // =============== ACTIONS ===============
    async function manejarAccionMedico(e) {
        const btn = e.currentTarget;
        const medicoId = btn.dataset.id;
        const action = btn.dataset.action; // 'aprobar' o 'rechazar'

        const confirmMessage = action === 'aprobar' ? 
            "¿Confirmas que la constancia y datos de este perfil son válidos y apruebas su inserción en la plataforma?" : 
            "¿Estás seguro que deseas rechazar rotunda y definitivamente a este usuario?";

        AppHelper.showConfirm('Confirmar Acción', confirmMessage, async () => {
            btn.disabled = true;
        btn.style.opacity = '0.5';

        try {
            const url = `/api/admin/${action}/${medicoId}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                if(window.AppHelper && AppHelper.showToast) {
                    AppHelper.showToast(`Médico ${action === 'aprobar' ? 'aprobado' : 'rechazado'} correctamente.`, action === 'aprobar' ? 'success' : 'warning');
                }

                // Refrescar paneles
                cargarMedicosPendientes();
                cargarResumen();
                cargarLogs();
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                AppHelper.showAlert('Error', data.error || 'No se pudo procesar la tarea');
            }
        } catch (error) {
            console.error('Error action:', error);
            AppHelper.showAlert('Fallo de Red', 'Fallo de conexión al enviar el mandato.');
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        }); // Fin showConfirm
    }
});
