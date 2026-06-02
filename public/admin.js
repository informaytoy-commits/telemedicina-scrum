document.addEventListener('DOMContentLoaded', () => {
    const sesion = AppHelper.validarSesion('admin');
    if(!sesion) return;

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login.html';
        });
    }

    const userDisplay = document.getElementById('userNameDisplay');
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
        try {
            const usuarioObj = JSON.parse(usuarioStr);
            userDisplay.textContent = `Admin: ${usuarioObj.nombre}`;
        } catch (e) {
            console.error(e);
        }
    }

    const token = localStorage.getItem('token');
    
    // Nodos de Navegación Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modules = document.querySelectorAll('.admin-module');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none';
            });
            modules.forEach(m => m.classList.add('hidden'));

            btn.classList.add('active');
            btn.style.borderBottom = '4px solid var(--primary)';
            const targetId = btn.dataset.target;
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'module-turnos') {
                cargarTurnos();
            }
        });
    });

    // Módulos estáticos de estadística
    const statUsuarios = document.getElementById('stat-usuarios');
    const statPacientes = document.getElementById('stat-pacientes');
    const statMedicosActivos = document.getElementById('stat-medicos-activos');
    const statPendientes = document.getElementById('stat-pendientes');
    const statRecepcionistas = document.getElementById('stat-recepcionistas');
    const statTurnos = document.getElementById('stat-turnos');
    
    // Tablas
    const usuariosTableBody = document.getElementById('usuariosTableBody');
    const pacientesTableBody = document.getElementById('pacientesTableBody');
    const medicosTableBody = document.getElementById('medicosTableBody');
    const recepcionistasTableBody = document.getElementById('recepcionistasTableBody');
    const turnosTableBody = document.getElementById('turnosTableBody');
    const medicosList = document.getElementById('medicosList');
    const logsTableBody = document.getElementById('logsTableBody');

    // Estado global de usuarios
    let listaUsuariosCompleta = [];
    let listaRecepcionistasCompleta = [];
    let listaPacientesCompleta = [];
    let listaMedicosCompleta = [];

    // Modal Usuario (Genérico)
    const modalUsuario = document.getElementById('modalUsuario');
    const btnAbrirModalRecepcionista = document.getElementById('btnAbrirModalRecepcionista'); // Específico de tab
    const btnCerrarModalUsuario = document.getElementById('btnCerrarModalUsuario');
    const btnCancelarUsuario = document.getElementById('btnCancelarUsuario');
    const formCrearUsuario = document.getElementById('formCrearUsuario');
    
    // Preview foto modal
    const usrFotoInput = document.getElementById('usr_foto');
    const usrFotoPreview = document.getElementById('usr_foto_preview');
    const usrFotoPlaceholder = document.getElementById('usr_foto_placeholder');

    usrFotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                usrFotoPreview.src = e.target.result;
                usrFotoPreview.style.display = 'block';
                usrFotoPlaceholder.style.display = 'none';
            }
            reader.readAsDataURL(file);
        } else {
            usrFotoPreview.src = '';
            usrFotoPreview.style.display = 'none';
            usrFotoPlaceholder.style.display = 'flex';
        }
    });

    // Buscador recepcionistas
    const buscadorRecepcionistas = document.getElementById('buscadorRecepcionistas');
    buscadorRecepcionistas.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtrados = listaRecepcionistasCompleta.filter(r => 
            (r.nombre && r.nombre.toLowerCase().includes(query)) ||
            (r.email && r.email.toLowerCase().includes(query)) ||
            (r.ci && r.ci.toLowerCase().includes(query))
        );
        renderizarRecepcionistas(filtrados);
    });

    btnAbrirModalRecepcionista.addEventListener('click', () => {
        abrirFormularioUsuario('recepcionista');
    });

    const cerrarModalUsuario = () => {
        modalUsuario.classList.add('hidden');
        formCrearUsuario.reset();
        usrFotoPreview.src = '';
        usrFotoPreview.style.display = 'none';
        usrFotoPlaceholder.style.display = 'flex';
    };

    btnCerrarModalUsuario.addEventListener('click', cerrarModalUsuario);
    btnCancelarUsuario.addEventListener('click', cerrarModalUsuario);

    if (formCrearUsuario) {
        formCrearUsuario.addEventListener('submit', manejarGuardarUsuario);
    }

    // Modal Detalle Usuario
    const modalDetalleUsuario = document.getElementById('modalDetalleUsuario');
    const btnCerrarModalDetalle = document.getElementById('btnCerrarModalDetalle');
    const btnCerrarDetalleBtn = document.getElementById('btnCerrarDetalleBtn');

    const cerrarModalDetalle = () => {
        modalDetalleUsuario.classList.add('hidden');
    };

    btnCerrarModalDetalle.addEventListener('click', cerrarModalDetalle);
    btnCerrarDetalleBtn.addEventListener('click', cerrarModalDetalle);

    // Modal Reset Password
    const modalResetPassword = document.getElementById('modalResetPassword');
    const formResetPassword = document.getElementById('formResetPassword');
    const btnCerrarModalReset = document.getElementById('btnCerrarModalReset');
    const btnCancelarReset = document.getElementById('btnCancelarReset');

    const cerrarModalReset = () => {
        modalResetPassword.classList.add('hidden');
        formResetPassword.reset();
    };

    btnCerrarModalReset.addEventListener('click', cerrarModalReset);
    btnCancelarReset.addEventListener('click', cerrarModalReset);

    formResetPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('reset_usr_id').value;
        const pwd = document.getElementById('reset_password').value;
        const pwdConf = document.getElementById('reset_password_confirm').value;

        if (pwd.length < 6) {
            AppHelper.showAlert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (pwd !== pwdConf) {
            AppHelper.showAlert('Error', 'Las contraseñas no coinciden.');
            return;
        }

        const btn = formResetPassword.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const res = await fetch(`/api/admin/usuarios/${userId}/reset-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: pwd })
            });

            const data = await res.json();
            if (res.ok) {
                AppHelper.showToast('Contraseña reseteada con éxito', 'success');
                cerrarModalReset();
            } else {
                AppHelper.showAlert('Error', data.error || 'Error al resetear contraseña');
            }
        } catch (error) {
            AppHelper.showAlert('Error de Red', 'No se pudo conectar con el servidor.');
        } finally {
            btn.disabled = false;
        }
    });

    // Inicialización
    cargarResumen();
    cargarUsuarios();
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
                if(statUsuarios) statUsuarios.textContent = data.resumen.totalUsuarios;
                if(statPacientes) statPacientes.textContent = data.resumen.totalPacientes;
                if(statMedicosActivos) statMedicosActivos.textContent = data.resumen.medicosActivos;
                if(statPendientes) statPendientes.textContent = data.resumen.medicosPendientes;
                if(statRecepcionistas) statRecepcionistas.textContent = data.resumen.totalRecepcionistas;
                if(statTurnos) statTurnos.textContent = data.resumen.totalTurnos;
            }
        } catch (error) {
            console.error('Error cargando resumen:', error);
        }
    }

    async function cargarUsuarios() {
        try {
            const res = await fetch('/api/admin/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.usuarios) {
                listaUsuariosCompleta = data.usuarios;
                listaPacientesCompleta = data.usuarios.filter(u => u.rol === 'paciente');
                listaMedicosCompleta = data.usuarios.filter(u => u.rol === 'medico');
                listaRecepcionistasCompleta = data.usuarios.filter(u => u.rol === 'recepcionista');

                renderizarUsuariosTotales(listaUsuariosCompleta);
                renderizarPacientes(listaPacientesCompleta);
                renderizarMedicosDirectorio(listaMedicosCompleta);
                
                // Trigger filter if any
                buscadorRecepcionistas.dispatchEvent(new Event('input'));
            } else {
                usuariosTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--error);">No se pudo cargar la información</td></tr>`;
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            usuariosTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--error);">Error de red al cargar usuarios</td></tr>`;
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
                        <div class="empty-state" style="grid-column: 1 / -1; width: 100%; border: 1px dashed var(--border);">
                            <div class="empty-title">¡Excelente!</div>
                            <p style="margin: 0; font-size: 0.9rem">No hay médicos pendientes de validación en este momento.</p>
                        </div>
                    `;
                } else {
                    renderizarMedicosPendientes(data.medicos);
                }
            } else {
                medicosList.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: var(--error);">No se pudo cargar la información</div>`;
            }
        } catch (error) {
            console.error('Error cargando pendientes:', error);
            medicosList.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: var(--error);">Fallo de red</div>`;
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
                    logsTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="border: none;">Registro vacío</div></td></tr>`;
                    return;
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
            } else {
                logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--error);">No se pudo cargar la información</td></tr>`;
            }
        } catch (error) {
            console.error('Error cargando logs:', error);
            logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--error);">Error de red</td></tr>`;
        }
    }

    async function cargarTurnos() {
        turnosTableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="border: none;"><span class="spinner"></span></div></td></tr>`;
        try {
            const res = await fetch('/api/admin/turnos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.turnos) {
                turnosTableBody.innerHTML = '';
                if(data.turnos.length === 0) {
                    turnosTableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="border: none;">No hay turnos registrados en el sistema.</div></td></tr>`;
                    return;
                }
                data.turnos.forEach(turno => {
                    const tr = document.createElement('tr');
                    const medicoNombre = turno.medico ? turno.medico.nombre : 'Desconocido';
                    const pacienteNombre = turno.paciente ? turno.paciente.nombre : 'Desconocido';
                    let estadoBadge = `<span class="badge badge-${turno.estado.toLowerCase()}">${turno.estado}</span>`;

                    tr.innerHTML = `
                        <td>${turno.fecha_reserva}</td>
                        <td>${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}</td>
                        <td>${medicoNombre}</td>
                        <td>${pacienteNombre}</td>
                        <td>${estadoBadge}</td>
                    `;
                    turnosTableBody.appendChild(tr);
                });
            } else {
                turnosTableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--error);">No se pudo cargar la información</td></tr>`;
            }
        } catch (error) {
            console.error('Error cargando turnos:', error);
            turnosTableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--error);">Error de red</td></tr>`;
        }
    }

    // =============== RENDERERS LISTS ===============

    function generarAvatarUI(user) {
        let photoPath = AppHelper.obtenerImagenUsuario(user);
        let initialString = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';
        let fotoHTML = photoPath ? 
            `<img src="${photoPath}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width: 32px; height: 32px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold;\\'>${initialString}</div>';">` : 
            `<div style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold;">${initialString}</div>`;
        return fotoHTML;
    }

    function generarAvatarUIGrande(user) {
        let photoPath = AppHelper.obtenerImagenUsuario(user);
        let initialString = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';
        let fotoHTML = photoPath ? 
            `<img src="${photoPath}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width: 80px; height: 80px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold;\\'>${initialString}</div>';">` : 
            `<div style="width: 80px; height: 80px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold;">${initialString}</div>`;
        return fotoHTML;
    }

    function getAccionesHTML(user) {
        let deleteBtn = '';
        if (user.rol !== 'admin') {
            deleteBtn = `
            <button class="btn btn-secondary btn-sm eliminar-usuario-btn" data-id="${user.id}" style="padding: 0.25rem 0.5rem; color: #dc3545;" title="Eliminar Definitivo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            `;
        }

        return `
            <button class="btn btn-secondary btn-sm ver-usuario-btn" data-id="${user.id}" style="padding: 0.25rem 0.5rem;" title="Ver Detalles">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="btn btn-secondary btn-sm editar-usuario-btn" data-id="${user.id}" style="padding: 0.25rem 0.5rem;" title="Editar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-sm reset-pwd-btn" data-id="${user.id}" style="padding: 0.25rem 0.5rem;" title="Resetear Contraseña">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </button>
            <button class="btn btn-secondary btn-sm toggle-usuario-btn" data-id="${user.id}" style="padding: 0.25rem 0.5rem; color: var(--error);" title="${user.estado==='activo'?'Desactivar':'Activar'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
            </button>
            ${deleteBtn}
        `;
    }

    function renderizarUsuariosTotales(usuarios) {
        usuariosTableBody.innerHTML = '';
        usuarios.forEach(user => {
            let rolBadge = `<span class="badge" style="background-color: var(--primary-light); color: var(--primary)">${user.rol}</span>`;
            if (user.rol === 'admin') rolBadge = `<span class="badge" style="background-color: var(--error); color: white">Admin</span>`;
            if (user.rol === 'medico') rolBadge = `<span class="badge" style="background-color: var(--success); color: white">Médico</span>`;
            if (user.rol === 'recepcionista') rolBadge = `<span class="badge" style="background-color: var(--warning); color: #856404">Recepcionista</span>`;
            
            let estadoBadge = user.estado === 'activo' ? 
                `<span class="badge" style="background-color: var(--success); color: white">Activo</span>` :
                (user.estado === 'pendiente' ? `<span class="badge" style="background-color: var(--warning); color: #856404">Pendiente</span>` : `<span class="badge" style="background-color: var(--error); color: white">Inactivo</span>`);

            const currentUserId = JSON.parse(localStorage.getItem('usuario')).id;
            const isDisabled = user.id == currentUserId ? 'disabled' : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${generarAvatarUI(user)}</td>
                <td style="font-weight: 500">${user.nombre}</td>
                <td style="color: var(--text-muted);">${user.email}</td>
                <td>${rolBadge}</td>
                <td>${estadoBadge}</td>
                <td>
                    <select class="input-wrapper select-rol" data-id="${user.id}" style="width: auto; display: inline-block; padding: 0.2rem; font-size: 0.85rem;" ${isDisabled}>
                        <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="medico" ${user.rol === 'medico' ? 'selected' : ''}>Médico</option>
                        <option value="paciente" ${user.rol === 'paciente' ? 'selected' : ''}>Paciente</option>
                        <option value="recepcionista" ${user.rol === 'recepcionista' ? 'selected' : ''}>Recepcionista</option>
                    </select>
                </td>
            `;
            usuariosTableBody.appendChild(tr);
        });

        document.querySelectorAll('#usuariosTableBody .select-rol').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const nuevoRol = e.target.value;
                await actualizarUsuario(id, { rol: nuevoRol });
            });
        });
    }

    function renderizarPacientes(pacientes) {
        pacientesTableBody.innerHTML = '';
        if(pacientes.length === 0) {
            pacientesTableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="border: none;">No hay pacientes registrados.</div></td></tr>`;
            return;
        }
        pacientes.forEach(user => {
            let estadoBadge = user.estado === 'activo' ? 
                `<span class="badge" style="background-color: var(--success); color: white">Activo</span>` :
                `<span class="badge" style="background-color: var(--error); color: white">Inactivo</span>`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${generarAvatarUI(user)}</td>
                <td style="font-weight: 500">${user.nombre}</td>
                <td style="color: var(--text-muted);">${user.email}</td>
                <td>${user.telefono || '-'}</td>
                <td>${estadoBadge}</td>
                <td>${getAccionesHTML(user)}</td>
            `;
            pacientesTableBody.appendChild(tr);
        });
        vincularAccionesGenericas(pacientesTableBody);
    }

    function renderizarMedicosDirectorio(medicos) {
        medicosTableBody.innerHTML = '';
        if(medicos.length === 0) {
            medicosTableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="border: none;">No hay médicos registrados.</div></td></tr>`;
            return;
        }
        medicos.forEach(user => {
            let estadoBadge = user.estado === 'activo' ? 
                `<span class="badge" style="background-color: var(--success); color: white">Activo</span>` :
                (user.estado === 'pendiente' ? `<span class="badge" style="background-color: var(--warning); color: #856404">Pendiente</span>` : `<span class="badge" style="background-color: var(--error); color: white">Inactivo</span>`);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${generarAvatarUI(user)}</td>
                <td style="font-weight: 500">${user.nombre}</td>
                <td style="color: var(--text-muted);">${user.email}</td>
                <td>${user.especialidad || 'No asignada'}</td>
                <td>${estadoBadge}</td>
                <td>${getAccionesHTML(user)}</td>
            `;
            medicosTableBody.appendChild(tr);
        });
        vincularAccionesGenericas(medicosTableBody);
    }

    function renderizarRecepcionistas(recepcionistas) {
        recepcionistasTableBody.innerHTML = '';
        if(recepcionistas.length === 0) {
            recepcionistasTableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="border: none;">No se encontraron recepcionistas.</div></td></tr>`;
            return;
        }
        recepcionistas.forEach(user => {
            let estadoBadge = user.estado === 'activo' ? 
                `<span class="badge" style="background-color: var(--success); color: white">Activo</span>` :
                `<span class="badge" style="background-color: var(--error); color: white">Inactivo</span>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${generarAvatarUI(user)}</td>
                <td style="font-weight: 500">${user.nombre}</td>
                <td><div style="font-size: 0.85rem">${user.email}</div><div style="color: var(--text-muted); font-size: 0.8rem">${user.telefono || '-'}</div></td>
                <td style="color: var(--text-muted);">${user.ci || '-'}</td>
                <td>${estadoBadge}</td>
                <td>${getAccionesHTML(user)}</td>
            `;
            recepcionistasTableBody.appendChild(tr);
        });
        vincularAccionesGenericas(recepcionistasTableBody);
    }

    function vincularAccionesGenericas(container) {
        container.querySelectorAll('.ver-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const user = listaUsuariosCompleta.find(u => u.id == id);
                if(user) mostrarDetalleUsuario(user);
            });
        });

        container.querySelectorAll('.editar-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const user = listaUsuariosCompleta.find(u => u.id == id);
                if(user) abrirEdicionUsuario(user);
            });
        });
        
        container.querySelectorAll('.toggle-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const user = listaUsuariosCompleta.find(u => u.id == id);
                if(!user) return;

                const accionTxt = user.estado === 'activo' ? 'desactivar' : 'activar';
                AppHelper.showConfirm(`Confirmar ${accionTxt}`, `¿Estás seguro que deseas ${accionTxt} este perfil?`, async () => {
                    await actualizarUsuario(id, { estado: user.estado === 'activo' ? 'inactivo' : 'activo' });
                });
            });
        });

        container.querySelectorAll('.reset-pwd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                document.getElementById('reset_usr_id').value = id;
                modalResetPassword.classList.remove('hidden');
            });
        });

        container.querySelectorAll('.eliminar-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const user = listaUsuariosCompleta.find(u => u.id == id);
                if(!user) return;

                AppHelper.showConfirm(`Eliminar Definitivo`, `¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.`, async () => {
                    await eliminarUsuarioDefinitivo(id);
                });
            });
        });
    }

    function mostrarDetalleUsuario(user) {
        document.getElementById('det_foto_container').innerHTML = generarAvatarUIGrande(user);
        document.getElementById('det_nombre').textContent = user.nombre;
        
        let estadoBadge = user.estado === 'activo' ? 
            `<span class="badge" style="background-color: var(--success); color: white">Activo</span>` :
            (user.estado === 'pendiente' ? `<span class="badge" style="background-color: var(--warning); color: white">Pendiente</span>` : `<span class="badge" style="background-color: var(--error); color: white">Inactivo</span>`);
        document.getElementById('det_estado_container').innerHTML = estadoBadge;

        document.getElementById('det_rol').textContent = user.rol;
        document.getElementById('det_email').textContent = user.email || '-';
        document.getElementById('det_telefono').textContent = user.telefono || '-';
        document.getElementById('det_ci').textContent = user.ci || '-';
        document.getElementById('det_direccion').textContent = user.direccion || '-';
        
        if (user.rol === 'recepcionista') {
            document.getElementById('det_turno_group').style.display = 'block';
            document.getElementById('det_turno').textContent = user.turno_trabajo || '-';
            document.getElementById('det_medico_group').style.display = 'none';
        } else if (user.rol === 'medico') {
            document.getElementById('det_medico_group').style.display = 'block';
            document.getElementById('det_especialidad').textContent = user.especialidad || '-';
            document.getElementById('det_matricula').textContent = user.matricula_profesional || '-';
            document.getElementById('det_turno_group').style.display = 'none';
        } else {
            document.getElementById('det_medico_group').style.display = 'none';
            document.getElementById('det_turno_group').style.display = 'none';
        }

        if (user.createdAt) {
            document.getElementById('det_fecha').textContent = new Date(user.createdAt).toLocaleDateString();
        } else {
            document.getElementById('det_fecha').textContent = '-';
        }

        modalDetalleUsuario.classList.remove('hidden');
    }

    function abrirFormularioUsuario(rol) {
        document.getElementById('modalUsuarioTitle').textContent = 'Registrar ' + (rol.charAt(0).toUpperCase() + rol.slice(1));
        document.getElementById('usr_id').value = '';
        document.getElementById('usr_rol_oculto').value = rol;
        document.getElementById('pwd_row').style.display = 'flex';
        document.getElementById('usr_password').required = true;
        document.getElementById('usr_password_confirm').required = true;
        document.getElementById('status_group').style.display = 'none';
        
        if (rol === 'medico') {
            document.getElementById('medico_group').style.display = 'grid';
            document.getElementById('turno_group').style.display = 'none';
        } else if (rol === 'recepcionista') {
            document.getElementById('medico_group').style.display = 'none';
            document.getElementById('turno_group').style.display = 'block';
        } else {
            document.getElementById('medico_group').style.display = 'none';
            document.getElementById('turno_group').style.display = 'none';
        }
        
        usrFotoPreview.src = '';
        usrFotoPreview.style.display = 'none';
        usrFotoPlaceholder.style.display = 'flex';
        
        modalUsuario.classList.remove('hidden');
    }

    function abrirEdicionUsuario(user) {
        document.getElementById('modalUsuarioTitle').textContent = 'Editar ' + (user.rol.charAt(0).toUpperCase() + user.rol.slice(1));
        document.getElementById('usr_id').value = user.id;
        document.getElementById('usr_rol_oculto').value = user.rol;
        document.getElementById('usr_nombre').value = user.nombre;
        document.getElementById('usr_email').value = user.email;
        document.getElementById('usr_ci').value = user.ci && user.ci !== 'N/A' ? user.ci : '';
        document.getElementById('usr_telefono').value = user.telefono || '';
        document.getElementById('usr_direccion').value = user.direccion || '';
        document.getElementById('usr_turno').value = user.turno_trabajo || '';
        document.getElementById('usr_especialidad').value = user.especialidad || '';
        document.getElementById('usr_matricula').value = user.matricula_profesional || '';
        document.getElementById('usr_estado').value = user.estado || 'activo';
        
        // Esconder inputs de pwd
        document.getElementById('pwd_row').style.display = 'none';
        document.getElementById('usr_password').required = false;
        document.getElementById('usr_password_confirm').required = false;
        document.getElementById('status_group').style.display = 'block';

        if (user.rol === 'medico') {
            document.getElementById('medico_group').style.display = 'grid';
            document.getElementById('turno_group').style.display = 'none';
        } else if (user.rol === 'recepcionista') {
            document.getElementById('medico_group').style.display = 'none';
            document.getElementById('turno_group').style.display = 'block';
        } else {
            document.getElementById('medico_group').style.display = 'none';
            document.getElementById('turno_group').style.display = 'none';
        }

        const photoPath = AppHelper.obtenerImagenUsuario(user);
        if (photoPath) {
            usrFotoPreview.src = photoPath;
            usrFotoPreview.style.display = 'block';
            usrFotoPlaceholder.style.display = 'none';
        } else {
            usrFotoPreview.src = '';
            usrFotoPreview.style.display = 'none';
            usrFotoPlaceholder.style.display = 'flex';
        }

        modalUsuario.classList.remove('hidden');
    }

    function renderizarMedicosPendientes(medicos) {
        medicosList.innerHTML = '';
        medicos.forEach(med => {
            let docInfo = '<span style="color: var(--text-muted); font-size: 0.8rem">No subió documento.</span>';
            let archivoLink = null;
            if (med.documentos && med.documentos.length > 0) {
                const doc = med.documentos[0]; 
                archivoLink = `/uploads/${doc.archivo}`;
                docInfo = `<a href="${archivoLink}" target="_blank" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; display: inline-flex; width: 100%; justify-content: center">Abrir Constancia</a>`;
            }

            const card = document.createElement('div');
            card.className = 'medico-card';
            
            let initialString = med.nombre ? med.nombre.charAt(0).toUpperCase() : '?';
            let fallbackInner = `<div class="medico-avatar">${initialString}</div>`;
            
            let photoPath = AppHelper.obtenerImagenUsuario(med);
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
                        <p>${med.especialidad || 'No asignada'}</p>
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
                    <button class="btn action-btn btn-success" data-id="${med.id}" data-action="aprobar" style="flex: 1; background-color: var(--success); color: white;">Aprobar</button>
                    <button class="btn btn-secondary action-btn" data-id="${med.id}" data-action="rechazar" style="flex: 1; color: var(--error); border-color: rgba(222, 53, 11, 0.4);">Rechazar</button>
                </div>
            `;
            medicosList.appendChild(card);
        });

        medicosList.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', manejarAccionMedico);
        });
    }

    // =============== ACTIONS ===============

    async function actualizarUsuario(id, datos) {
        try {
            const res = await fetch(`/api/admin/usuarios/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (res.ok) {
                AppHelper.showToast('Usuario actualizado correctamente', 'success');
                cargarUsuarios();
                cargarResumen();
                cargarLogs();
            } else {
                AppHelper.showAlert('Error', data.error || 'No se pudo actualizar el usuario');
            }
        } catch (error) {
            AppHelper.showAlert('Fallo de Red', 'Error al actualizar usuario');
        }
    }

    async function eliminarUsuarioDefinitivo(id) {
        try {
            const res = await fetch(`/api/admin/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                AppHelper.showToast('Usuario eliminado exitosamente', 'success');
                cargarUsuarios();
                cargarResumen();
                cargarLogs();
            } else {
                AppHelper.showAlert('Error', data.error || 'No se pudo eliminar el usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            AppHelper.showAlert('Fallo de Red', 'Error de red al intentar eliminar el usuario');
        }
    }

    async function manejarGuardarUsuario(e) {
        e.preventDefault();
        
        const usrId = document.getElementById('usr_id').value;
        const rol = document.getElementById('usr_rol_oculto').value;
        const nombre = document.getElementById('usr_nombre').value;
        const email = document.getElementById('usr_email').value;
        const ci = document.getElementById('usr_ci').value;
        const telefono = document.getElementById('usr_telefono').value;
        const password = document.getElementById('usr_password').value;
        const passwordConfirm = document.getElementById('usr_password_confirm').value;
        const direccion = document.getElementById('usr_direccion').value;
        const turno = document.getElementById('usr_turno').value;
        const especialidad = document.getElementById('usr_especialidad').value;
        const matricula = document.getElementById('usr_matricula').value;
        const estado = document.getElementById('usr_estado').value;
        const fotoInput = document.getElementById('usr_foto');

        // Validation
        if (!usrId) {
            if (password.length < 6) {
                AppHelper.showAlert('Error', 'La contraseña debe tener al menos 6 caracteres.');
                return;
            }
            if (password !== passwordConfirm) {
                AppHelper.showAlert('Error', 'Las contraseñas no coinciden.');
                return;
            }
        }

        const btn = formCrearUsuario.querySelector('button[type="submit"]');
        btn.disabled = true;

        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('email', email);
        formData.append('ci', ci);
        formData.append('telefono', telefono);
        
        if (direccion) formData.append('direccion', direccion);
        if (rol === 'recepcionista' && turno) formData.append('turno_trabajo', turno);
        if (rol === 'medico') {
            if (especialidad) formData.append('especialidad', especialidad);
            if (matricula) formData.append('matricula_profesional', matricula);
        }
        if (estado && usrId) formData.append('estado', estado);
        if (fotoInput.files[0]) formData.append('foto', fotoInput.files[0]);

        if (!usrId) {
            formData.append('password', password);
        }

        const url = usrId ? `/api/admin/usuarios/${usrId}` : `/api/admin/usuarios/${rol}`;
        const method = usrId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                AppHelper.showToast(usrId ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente', 'success');
                cerrarModalUsuario();
                cargarUsuarios();
                cargarResumen();
                cargarLogs();
            } else {
                AppHelper.showAlert('Error', data.error || 'Error al guardar usuario');
            }
        } catch (error) {
            console.error(error);
            AppHelper.showAlert('Fallo de Red', 'Error al guardar usuario');
        } finally {
            btn.disabled = false;
        }
    }

    async function manejarAccionMedico(e) {
        const btn = e.currentTarget;
        const medicoId = btn.dataset.id;
        const action = btn.dataset.action; 

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
                    AppHelper.showToast(`Médico ${action === 'aprobar' ? 'aprobado' : 'rechazado'} correctamente.`, action === 'aprobar' ? 'success' : 'warning');
                    cargarMedicosPendientes();
                    cargarUsuarios();
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
        });
    }
    // =============== ESPECIALIDADES ===============
    const especialidadesTableBody = document.getElementById('especialidadesTableBody');
    const modalEspecialidad = document.getElementById('modalEspecialidad');
    const formEspecialidad = document.getElementById('formEspecialidad');
    const btnCerrarModalEspecialidad = document.getElementById('btnCerrarModalEspecialidad');
    const btnCancelarEspecialidad = document.getElementById('btnCancelarEspecialidad');
    const btnAbrirModalEspecialidad = document.getElementById('btnAbrirModalEspecialidad');
    const statEspecialidades = document.getElementById('stat-especialidades');
    
    let listaEspecialidades = [];

    const cerrarModalEspecialidad = () => {
        modalEspecialidad.classList.add('hidden');
        formEspecialidad.reset();
        document.getElementById('esp_id').value = '';
    };

    if (btnCerrarModalEspecialidad) btnCerrarModalEspecialidad.addEventListener('click', cerrarModalEspecialidad);
    if (btnCancelarEspecialidad) btnCancelarEspecialidad.addEventListener('click', cerrarModalEspecialidad);
    
    if (btnAbrirModalEspecialidad) {
        btnAbrirModalEspecialidad.addEventListener('click', () => {
            document.getElementById('modalEspecialidadTitle').textContent = 'Nueva Especialidad';
            document.getElementById('esp_id').value = '';
            modalEspecialidad.classList.remove('hidden');
        });
    }

    if (formEspecialidad) {
        formEspecialidad.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('esp_id').value;
            const nombre = document.getElementById('esp_nombre').value;
            const descripcion = document.getElementById('esp_descripcion').value;

            const payload = { nombre, descripcion };
            const url = id ? `/api/admin/especialidades/${id}` : '/api/admin/especialidades';
            const method = id ? 'PUT' : 'POST';
            
            const btn = formEspecialidad.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    AppHelper.showToast(id ? 'Especialidad actualizada' : 'Especialidad creada', 'success');
                    cerrarModalEspecialidad();
                    cargarEspecialidades();
                } else {
                    AppHelper.showAlert('Error', data.error || 'No se pudo guardar la especialidad');
                }
            } catch (error) {
                AppHelper.showAlert('Fallo de red', 'Error al guardar la especialidad');
            } finally {
                btn.disabled = false;
            }
        });
    }

    async function cargarEspecialidades() {
        if(!especialidadesTableBody) return;
        try {
            const res = await fetch('/api/admin/especialidades', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                listaEspecialidades = data;
                if(statEspecialidades) statEspecialidades.textContent = data.length;
                renderizarEspecialidades();
            }
        } catch (error) {
            console.error('Error cargando especialidades:', error);
            especialidadesTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--error);">Error de red</td></tr>`;
        }
    }

    function renderizarEspecialidades() {
        especialidadesTableBody.innerHTML = '';
        if (listaEspecialidades.length === 0) {
            especialidadesTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="border: none;">No hay especialidades registradas.</div></td></tr>`;
            return;
        }

        listaEspecialidades.forEach(esp => {
            const estadoBadge = esp.estado ? 
                `<span class="badge" style="background-color: var(--success); color: white">Activa</span>` :
                `<span class="badge" style="background-color: var(--error); color: white">Inactiva</span>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500">${esp.nombre}</td>
                <td style="color: var(--text-muted); font-size: 0.9rem">${esp.descripcion || '-'}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-secondary btn-sm editar-esp-btn" data-id="${esp.id}" style="padding: 0.25rem 0.5rem;" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn btn-secondary btn-sm toggle-esp-btn" data-id="${esp.id}" style="padding: 0.25rem 0.5rem; color: var(--error);" title="${esp.estado ? 'Desactivar' : 'Activar'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    </button>
                </td>
            `;
            especialidadesTableBody.appendChild(tr);
        });

        // Eventos
        document.querySelectorAll('.editar-esp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const esp = listaEspecialidades.find(x => x.id == e.currentTarget.dataset.id);
                if(esp) {
                    document.getElementById('modalEspecialidadTitle').textContent = 'Editar Especialidad';
                    document.getElementById('esp_id').value = esp.id;
                    document.getElementById('esp_nombre').value = esp.nombre;
                    document.getElementById('esp_descripcion').value = esp.descripcion || '';
                    modalEspecialidad.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('.toggle-esp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const esp = listaEspecialidades.find(x => x.id == id);
                if(esp) {
                    AppHelper.showConfirm('Confirmar Acción', `¿Deseas ${esp.estado ? 'desactivar' : 'activar'} esta especialidad?`, async () => {
                        try {
                            const res = await fetch(`/api/admin/especialidades/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if(res.ok) {
                                AppHelper.showToast('Estado cambiado correctamente', 'success');
                                cargarEspecialidades();
                            } else {
                                AppHelper.showAlert('Error', 'No se pudo cambiar el estado');
                            }
                        } catch(err) {
                            AppHelper.showAlert('Error de Red', 'Fallo de conexión');
                        }
                    });
                }
            });
        });
    }

    cargarEspecialidades(); // Iniciar carga

    // ============================================
    // MÓDULO REPORTES (TM-A04)
    // ============================================
    const formFiltroReportes = document.getElementById('formFiltroReportes');
    const filtroMedico = document.getElementById('filtroMedico');
    const filtroEspecialidad = document.getElementById('filtroEspecialidad');
    const reportesTableBody = document.getElementById('reportesTableBody');

    const cargarFiltrosReportes = async () => {
        try {
            // Especialidades ya cargadas en listaEspecialidades
            filtroEspecialidad.innerHTML = '<option value="">Todas las especialidades</option>';
            listaEspecialidades.forEach(esp => {
                const opt = document.createElement('option');
                opt.value = esp.id;
                opt.textContent = esp.nombre;
                filtroEspecialidad.appendChild(opt);
            });

            // Médicos ya cargados en listaUsuariosCompleta
            filtroMedico.innerHTML = '<option value="">Todos los médicos</option>';
            const medicos = listaUsuariosCompleta.filter(u => u.rol === 'medico');
            medicos.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nombre;
                filtroMedico.appendChild(opt);
            });
        } catch(error) {
            console.error(error);
        }
    };

    // Llamamos esto una vez que los usuarios y especialidades están cargados
    // Modificaremos la promesa inicial si fuera necesario, pero como cargamos asincrono, mejor invocarlo cuando se abre la tab.

    document.querySelector('.tab-btn[data-target="module-reportes"]').addEventListener('click', () => {
        cargarFiltrosReportes();
    });

    formFiltroReportes.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const desde = document.getElementById('filtroDesde').value;
        const hasta = document.getElementById('filtroHasta').value;
        const medicoId = document.getElementById('filtroMedico').value;
        const especialidadId = document.getElementById('filtroEspecialidad').value;

        const queryParams = new URLSearchParams();
        if (desde) queryParams.append('fecha_desde', desde);
        if (hasta) queryParams.append('fecha_hasta', hasta);
        if (medicoId) queryParams.append('medicoId', medicoId);
        if (especialidadId) queryParams.append('especialidadId', especialidadId);

        reportesTableBody.innerHTML = `<tr><td colspan="5"><div class="text-center" style="padding:2rem;"><span class="spinner"></span> Generando...</div></td></tr>`;

        try {
            const res = await fetch(`/api/admin/reportes?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Actualizar tarjetas
            document.getElementById('repTotalTurnos').textContent = data.totales.totalTurnos;
            document.getElementById('repTotalReservados').textContent = data.totales.totalReservados;
            document.getElementById('repTotalCancelados').textContent = data.totales.totalCancelados;
            document.getElementById('repTotalAtendidos').textContent = data.totales.totalAtendidos;
            document.getElementById('repTotalRecetas').textContent = data.totales.totalRecetas;
            document.getElementById('repTotalNotas').textContent = data.totales.totalNotas;
            document.getElementById('repTotalRecaudado').textContent = `Bs. ${data.totales.totalRecaudado.toFixed(2)}`;

            // Actualizar tabla
            if (data.turnos.length === 0) {
                reportesTableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding: 2rem;">No hay registros para estos filtros.</div></td></tr>`;
                return;
            }

            reportesTableBody.innerHTML = data.turnos.map(t => {
                const pacienteNombre = t.paciente ? t.paciente.nombre : 'Desconocido';
                const medicoNombre = t.medico ? t.medico.nombre : 'Desconocido';
                const estadoBadge = `<span class="badge badge-${t.estado.toLowerCase()}">${t.estado}</span>`;
                const pagoStatus = (t.pago && t.pago.estado === 'pagado') ? '<span class="badge badge-confirmado">PAGADO</span>' : '<span class="badge badge-pendiente">PENDIENTE</span>';
                
                return `
                    <tr>
                        <td>
                            <strong style="display:block;">${t.fecha_reserva}</strong>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${t.hora_inicio.slice(0,5)} - ${t.hora_fin.slice(0,5)}</span>
                        </td>
                        <td>${pacienteNombre}</td>
                        <td>${medicoNombre}</td>
                        <td>${estadoBadge}</td>
                        <td>${pagoStatus}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error(error);
            AppHelper.showAlert('Error', 'Fallo al generar el reporte');
            reportesTableBody.innerHTML = `<tr><td colspan="5"><div class="text-center text-error" style="padding:2rem;">Error al generar el reporte.</div></td></tr>`;
        }
    });

    // ============================================
    // MÓDULO TM-U05: ALERTAS DE EMERGENCIA
    // ============================================
    const alertasAdminTableBody = document.getElementById('alertasAdminTableBody');
    const statAlertas = document.getElementById('stat-alertas');

    const cargarAlertasAdmin = async () => {
        try {
            const res = await fetch('/api/alertas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const alertas = data.alertas || [];
            const pendientes = alertas.filter(a => a.estado === 'pendiente').length;
            
            if (statAlertas) statAlertas.textContent = pendientes;

            if (alertas.length === 0) {
                alertasAdminTableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding: 2rem;">No hay alertas registradas.</div></td></tr>`;
                return;
            }

            alertasAdminTableBody.innerHTML = alertas.map(alerta => {
                const nivelColor = alerta.nivel === 'alta' ? 'var(--error)' : (alerta.nivel === 'media' ? 'var(--warning)' : '#10b981');
                const pacienteNombre = alerta.paciente ? alerta.paciente.nombre : 'Desconocido';
                return `
                    <tr>
                        <td>${new Date(alerta.fecha).toLocaleString()}</td>
                        <td>${pacienteNombre}</td>
                        <td><span class="badge" style="background-color: ${nivelColor}; color: white;">${alerta.nivel.toUpperCase()}</span></td>
                        <td style="max-width: 250px; white-space: normal;">${alerta.motivo}</td>
                        <td><span class="badge badge-${alerta.estado.toLowerCase()}">${alerta.estado.toUpperCase()}</span></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al cargar alertas', error);
            alertasAdminTableBody.innerHTML = `<tr><td colspan="5"><div class="text-center text-error" style="padding: 2rem;">Error al cargar alertas.</div></td></tr>`;
        }
    };

    document.querySelector('.tab-btn[data-target="module-alertas"]').addEventListener('click', () => {
        cargarAlertasAdmin();
    });

    cargarAlertasAdmin();

});
