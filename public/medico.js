document.addEventListener('DOMContentLoaded', () => {
    // Validar que el usuario sea medico y tenga token
    const sesion = AppHelper.validarSesion('medico');
    if (!sesion) return; // Ya redirigió si falla

    AppHelper.bindLogoutButton();
    const token = sesion.token;

    const turnosLoading = document.getElementById('turnosLoading');
    const turnosEmpty = document.getElementById('turnosEmpty');
    const turnosTableContainer = document.getElementById('turnosTableContainer');
    const turnosTableBody = document.getElementById('turnosTableBody');
    const filtroFecha = document.getElementById('filtroFecha');
    const filtroDiaSemana = document.getElementById('filtroDiaSemana');
    const countPacientes = document.getElementById('countPacientes');
    const countPacientesContainer = document.getElementById('countPacientesContainer');

    let listaTurnosActuales = [];

    if (filtroFecha) {
        filtroFecha.addEventListener('change', () => {
            filtrarYRenderizarTurnos();
        });
    }

    function calcularDiaSemana(fechaStr) {
        if (!fechaStr) return '';
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = fechaStr.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return dias[date.getDay()];
    }

    const filtrarYRenderizarTurnos = () => {
        if (!filtroFecha) return;
        const fechaSeleccionada = filtroFecha.value;

        // 1. Calcular y mostrar día de la semana
        const diaCalculado = calcularDiaSemana(fechaSeleccionada);
        if (filtroDiaSemana) {
            filtroDiaSemana.value = diaCalculado || 'No calculado';
        }

        // 2. Filtrar turnos
        const turnosFiltrados = listaTurnosActuales.filter(t => t.fecha_reserva === fechaSeleccionada);

        // 3. Ordenar por hora_inicio ASC
        turnosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

        // 4. Mostrar total de pacientes
        if (countPacientes) countPacientes.textContent = turnosFiltrados.length;
        if (countPacientesContainer) {
            countPacientesContainer.style.display = 'inline-block';
        }

        // 5. Renderizar tabla
        if (turnosTableBody) turnosTableBody.innerHTML = '';

        if (turnosFiltrados.length === 0) {
            turnosEmpty.classList.remove('hidden');
            if (turnosTableContainer) turnosTableContainer.style.display = 'none';
            return;
        }

        turnosEmpty.classList.add('hidden');
        if (turnosTableContainer) turnosTableContainer.style.display = 'block';

        turnosFiltrados.forEach(turno => {
            const pacienteName = turno.paciente ? turno.paciente.nombre : 'Paciente Desconocido';
            const initialString = pacienteName.charAt(0).toUpperCase();
            const photoPath = AppHelper.obtenerImagenUsuario(turno.paciente);
            const avatarPxHTML = photoPath
                ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">`
                : initialString;

            const isCancelado = turno.estado.toLowerCase() === 'cancelado';
            const isAtendido = turno.estado.toLowerCase() === 'atendido';

            // Pago
            const pagoBadge = isCancelado
                ? `<span class="badge" style="background-color: var(--text-muted); color: white;">N/A</span>`
                : (turno.pago && turno.pago.estado.toLowerCase() === 'pagado'
                    ? `<span class="badge badge-pagado" style="font-size: 0.7rem; padding: 0.3rem 0.75rem; border-radius: 9999px; background-color: var(--success); color: white; font-weight: 600;">PAGADO</span>`
                    : `<span class="badge" style="font-size: 0.7rem; padding: 0.3rem 0.75rem; border-radius: 9999px; background-color: var(--warning); color: white; font-weight: 600;">PENDIENTE</span>`);

            // Estado Badge
            let badgeEstadoClase = `badge-${turno.estado.toLowerCase()}`;
            if (isAtendido) {
                badgeEstadoClase = 'badge-atendido';
            }

            // Acciones médicas
            let accionesHTML = '';
            if (isCancelado) {
                // Cancelados: no mostrar botones médicos, solo estado CANCELADO (fila gris/tachada)
                accionesHTML = '';
            } else if (isAtendido) {
                // Atendidos: no mostrar Atender Paciente, pero mantener Ver Nota y Ver Receta si existen
                accionesHTML = `
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm btn-detalle-atendido" data-id="${turno.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ver Historial</button>
                    </div>
                `;
            } else {
                // Reservado / Activo: Triaje, Sala Virtual, Atender Paciente
                accionesHTML = `
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        ${turno.paciente ? `<button class="btn btn-secondary btn-sm btn-chat" data-id="${turno.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Triaje</button>` : ''}
                        ${(turno.paciente && turno.estado.toLowerCase() === 'reservado') ? `<button class="btn btn-primary btn-sm btn-sala" data-id="${turno.id}" data-paciente="${pacienteName}" data-fecha="${turno.fecha_reserva}" data-hora="${turno.hora_inicio.slice(0,5)}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Sala Virtual</button>` : ''}
                        ${turno.paciente ? `<button class="btn btn-primary btn-sm btn-atender" data-paciente-id="${turno.paciente.id}" data-paciente-nombre="${pacienteName}" data-turno-id="${turno.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Atender Paciente</button>` : ''}
                    </div>
                `;
            }

            const tr = document.createElement('tr');
            tr.className = `agenda-row ${isCancelado ? 'cancelado' : ''}`;
            tr.innerHTML = `
                <td class="col-hora ${isCancelado ? 'crossed-out' : ''}" style="font-weight: 600; color: var(--text-main);">
                    ${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}
                </td>
                <td>
                    <div class="col-paciente" style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="col-avatar" style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background-color: #fce7f3; color: #be185d; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; overflow: hidden; flex-shrink: 0; box-shadow: var(--shadow-sm); ${isCancelado ? 'filter: grayscale(1); opacity: 0.6;' : ''}">${avatarPxHTML}</div>
                        <span style="font-weight: 600; color: var(--text-main); ${isCancelado ? 'text-decoration: line-through;' : ''}">${pacienteName}</span>
                    </div>
                </td>
                <td class="col-email ${isCancelado ? 'crossed-out' : ''}" style="color: var(--text-muted); font-size: 0.85rem;">
                    ${turno.paciente ? turno.paciente.email : ''}
                </td>
                <td style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500;">
                    ${turno.fecha_reserva}
                </td>
                <td>
                    <span class="badge ${badgeEstadoClase}" style="font-size: 0.7rem; padding: 0.3rem 0.75rem; font-weight: 600; border-radius: 9999px;">${turno.estado.toUpperCase()}</span>
                </td>
                <td>
                    ${pagoBadge}
                </td>
                <td>
                    <div class="col-actions">
                        ${accionesHTML}
                    </div>
                </td>
            `;

            if (turnosTableBody) turnosTableBody.appendChild(tr);
        });

        // Event listener para btn-detalle-atendido
        document.querySelectorAll('.btn-detalle-atendido').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const turnoId = e.target.dataset.id;
                const t = listaTurnosActuales.find(item => item.id == turnoId);
                if (t && t.paciente) {
                    abrirPanelClinico(t.paciente.id, t.paciente.nombre, t.id);
                }
            });
        });
    };

    const cargarTurnosMedico = async () => {
        turnosLoading.classList.remove('hidden');
        turnosEmpty.classList.add('hidden');
        if (turnosTableContainer) turnosTableContainer.style.display = 'none';
        if (countPacientesContainer) countPacientesContainer.style.display = 'none';
        listaTurnosActuales = [];

        try {
            const response = await fetch('/api/turnos/medico', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sesion.token}`
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al obtener tus turnos asignados');

            listaTurnosActuales = data.turnos || [];
            turnosLoading.classList.add('hidden');

            // Autocompletar la fecha de hoy local en formato YYYY-MM-DD
            if (filtroFecha && !filtroFecha.value) {
                const now = new Date();
                const offset = now.getTimezoneOffset() * 60000;
                const localISO = (new Date(now - offset)).toISOString().slice(0, 10);
                filtroFecha.value = localISO;
            }

            filtrarYRenderizarTurnos();

        } catch (error) {
            turnosLoading.classList.add('hidden');
            AppHelper.showAlert('Error', error.message);
        }
    };

    // ============================================
    // MÓDULO TM-U01: DISPONIBILIDAD
    // ============================================
    const dispList = document.getElementById('disponibilidadList');
    const dispTable = document.getElementById('disponibilidadTable');
    const dispEmpty = document.getElementById('disponibilidadEmpty');
    const dispLoading = document.getElementById('disponibilidadLoading');

    const cargarDisponibilidades = async () => {
        dispLoading.classList.remove('hidden');
        dispEmpty.classList.add('hidden');
        dispTable.style.display = 'none';
        dispList.innerHTML = '';

        try {
            const res = await fetch('/api/disponibilidad/mis-horarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            dispLoading.classList.add('hidden');
            
            if (res.ok && Array.isArray(data)) {
                if (data.length === 0) {
                    dispEmpty.classList.remove('hidden');
                } else {
                    data.forEach(item => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${item.dia_semana}</strong></td>
                            <td style="color: var(--text-muted); font-weight: 500">${item.hora_inicio.slice(0, 5)}</td>
                            <td style="color: var(--text-muted); font-weight: 500">${item.hora_fin.slice(0, 5)}</td>
                            <td><span class="badge badge-${item.estado.toLowerCase()}">${item.estado}</span></td>
                        `;
                        dispList.appendChild(tr);
                    });
                    dispTable.style.display = 'table';
                }
            }
        } catch(error) {
            dispLoading.classList.add('hidden');
            console.error(error);
        }
    };

    cargarTurnosMedico();
    cargarDisponibilidades();

    // ============================================
    // MÓDULO TM-U05: ALERTAS DE EMERGENCIA
    // ============================================
    const alertasList = document.getElementById('alertasList');
    const alertasTable = document.getElementById('alertasTable');
    const alertasEmpty = document.getElementById('alertasEmpty');
    const alertasLoading = document.getElementById('alertasLoading');

    const cargarAlertas = async () => {
        alertasLoading.classList.remove('hidden');
        alertasEmpty.classList.add('hidden');
        alertasTable.style.display = 'none';
        alertasList.innerHTML = '';

        try {
            const res = await fetch('/api/alertas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            alertasLoading.classList.add('hidden');

            if (res.ok && data.alertas) {
                if (data.alertas.length === 0) {
                    alertasEmpty.classList.remove('hidden');
                } else {
                    data.alertas.forEach(alerta => {
                        const tr = document.createElement('tr');
                        const nivelColor = alerta.nivel === 'alta' ? 'var(--error)' : (alerta.nivel === 'media' ? 'var(--warning)' : '#10b981');
                        tr.innerHTML = `
                            <td>${new Date(alerta.fecha).toLocaleString()}</td>
                            <td>${alerta.paciente ? alerta.paciente.nombre : 'Desconocido'}</td>
                            <td><span class="badge" style="background-color: ${nivelColor}; color: white;">${alerta.nivel.toUpperCase()}</span></td>
                            <td style="max-width: 200px; white-space: normal;">${alerta.motivo}</td>
                            <td><span class="badge badge-${alerta.estado.toLowerCase()}">${alerta.estado.toUpperCase()}</span></td>
                            <td>
                                ${alerta.estado === 'pendiente' ? `
                                    <button class="btn btn-primary btn-sm btn-atender-alerta" data-id="${alerta.id}" style="padding: 0.25rem 0.5rem; margin-right: 0.5rem;">Atender</button>
                                    <button class="btn btn-secondary btn-sm btn-descartar-alerta" data-id="${alerta.id}" style="padding: 0.25rem 0.5rem; color: var(--error);">Descartar</button>
                                ` : ''}
                            </td>
                        `;
                        alertasList.appendChild(tr);
                    });
                    alertasTable.style.display = 'table';

                    // Handlers
                    document.querySelectorAll('.btn-atender-alerta').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            actualizarAlerta(e.target.dataset.id, 'atendida');
                        });
                    });
                    document.querySelectorAll('.btn-descartar-alerta').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            actualizarAlerta(e.target.dataset.id, 'descartada');
                        });
                    });
                }
            }
        } catch(error) {
            alertasLoading.classList.add('hidden');
            console.error('Error al cargar alertas', error);
        }
    };

    const actualizarAlerta = async (id, estado) => {
        try {
            const res = await fetch(`/api/alertas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado })
            });
            if (res.ok) {
                AppHelper.showToast(`Alerta ${estado}`, 'success');
                cargarAlertas();
            }
        } catch(error) {
            AppHelper.showAlert('Error', 'No se pudo actualizar la alerta');
        }
    };

    cargarAlertas();

    // ============================================
    // MÓDULO CLÍNICO (TM-U04 y TM-U03)
    // ============================================
    let currentPacienteId = null;
    let currentTurnoId = null;

    // Elementos del DOM
    const modalPanelClinico = document.getElementById('modalPanelClinico');
    const btnCerrarPanelClinico = document.getElementById('btnCerrarPanelClinico');
    const clinicoPacienteNombre = document.getElementById('clinicoPacienteNombre');
    const notasHistorial = document.getElementById('notasHistorial');
    const recetasHistorial = document.getElementById('recetasHistorial');

    const modalNota = document.getElementById('modalNota');
    const formNota = document.getElementById('formNota');
    const btnCerrarNota = document.getElementById('btnCerrarNota');
    const btnCancelarNota = document.getElementById('btnCancelarNota');

    const modalReceta = document.getElementById('modalReceta');
    const formReceta = document.getElementById('formReceta');
    const btnCerrarReceta = document.getElementById('btnCerrarReceta');
    const btnCancelarReceta = document.getElementById('btnCancelarReceta');

    // Delegación de eventos para el botón 'Atender Paciente', 'Sala Virtual', 'Triaje'
    if (turnosTableBody) {
        turnosTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-atender')) {
                const pacienteId = e.target.dataset.pacienteId;
                const pacienteNombre = e.target.dataset.pacienteNombre;
                const turnoId = e.target.dataset.turnoId;
                abrirPanelClinico(pacienteId, pacienteNombre, turnoId);
            } else if (e.target.classList.contains('btn-sala')) {
                const id = e.target.dataset.id;
                const paciente = e.target.dataset.paciente;
                const fecha = e.target.dataset.fecha;
                const hora = e.target.dataset.hora;
                
                document.getElementById('salaInfo').textContent = `Con ${paciente} | ${fecha} a las ${hora}`;
                document.getElementById('modalSalaVirtual').classList.remove('hidden');

                // Guardamos el turnoId en el botón de finalizar
                document.getElementById('btnFinalizarLlamada').dataset.id = id;
            } else if (e.target.classList.contains('btn-chat')) {
                const turnoId = e.target.dataset.id;
                abrirModalChat(turnoId);
            }
        });
    }

    const abrirPanelClinico = async (pacienteId, nombre, turnoId) => {
        currentPacienteId = pacienteId;
        currentTurnoId = turnoId;
        clinicoPacienteNombre.textContent = nombre;
        modalPanelClinico.classList.remove('hidden');
        await cargarHistorialClinico(pacienteId);
    };

    btnCerrarPanelClinico.addEventListener('click', () => {
        modalPanelClinico.classList.add('hidden');
        currentPacienteId = null;
        currentTurnoId = null;
    });

    const cargarHistorialClinico = async (pacienteId) => {
        notasHistorial.innerHTML = '<p>Cargando notas...</p>';
        recetasHistorial.innerHTML = '<p>Cargando recetas...</p>';

        try {
            // Cargar Notas
            const resNotas = await fetch(`/api/medicos/notas/${pacienteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataNotas = await resNotas.json();
            
            if (resNotas.ok && dataNotas.notas && dataNotas.notas.length > 0) {
                notasHistorial.innerHTML = dataNotas.notas.map(n => `
                    <div style="border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${new Date(n.fecha).toLocaleString()}</div>
                        <p style="margin: 0 0 0.25rem 0;"><strong>Diagnóstico:</strong> ${n.diagnostico}</p>
                        ${n.observaciones ? `<p style="margin: 0; font-size: 0.9rem;"><strong>Obs:</strong> ${n.observaciones}</p>` : ''}
                    </div>
                `).join('');
            } else {
                notasHistorial.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No hay notas registradas.</p>';
            }

            // Cargar Recetas
            const resRecetas = await fetch(`/api/medicos/recetas/${pacienteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataRecetas = await resRecetas.json();

            if (resRecetas.ok && dataRecetas.recetas && dataRecetas.recetas.length > 0) {
                recetasHistorial.innerHTML = dataRecetas.recetas.map(r => `
                    <div style="border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; background: rgba(59, 130, 246, 0.05);">
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${new Date(r.fecha).toLocaleString()}</div>
                        ${r.descripcion ? `<p style="margin: 0 0 0.25rem 0; font-size: 0.95rem;"><strong>Motivo:</strong> ${r.descripcion}</p>` : ''}
                        <p style="margin: 0; font-size: 0.9rem;"><strong>Medicamentos e Indicaciones:</strong><br>${r.medicamentos.replace(/\n/g, '<br>')}</p>
                    </div>
                `).join('');
            } else {
                recetasHistorial.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No hay recetas generadas.</p>';
            }

        } catch (error) {
            console.error('Error al cargar historial', error);
            notasHistorial.innerHTML = '<p style="color: var(--error);">Error al cargar notas.</p>';
            recetasHistorial.innerHTML = '<p style="color: var(--error);">Error al cargar recetas.</p>';
        }
    };

    // ----- Funciones Nota Clínica -----
    document.getElementById('btnAbrirNota').addEventListener('click', () => {
        formNota.reset();
        modalNota.classList.remove('hidden');
    });

    const cerrarModalNota = () => modalNota.classList.add('hidden');
    btnCerrarNota.addEventListener('click', cerrarModalNota);
    btnCancelarNota.addEventListener('click', cerrarModalNota);

    formNota.addEventListener('submit', async (e) => {
        e.preventDefault();
        const diagnostico = document.getElementById('notaDiagnostico').value;
        const observaciones = document.getElementById('notaObservaciones').value;

        const btnSubmit = formNota.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        try {
            const res = await fetch('/api/medicos/notas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ pacienteId: currentPacienteId, turnoId: currentTurnoId, diagnostico, observaciones })
            });
            const data = await res.json();
            
            if (res.ok) {
                AppHelper.showToast('Nota Clínica guardada', 'success');
                cerrarModalNota();
                cargarHistorialClinico(currentPacienteId);
            } else {
                AppHelper.showAlert('Error', data.error || 'Error al guardar nota');
            }
        } catch (error) {
            AppHelper.showAlert('Error', 'Fallo de red al guardar nota');
        } finally {
            btnSubmit.disabled = false;
        }
    });

    // ----- Funciones Receta -----
    document.getElementById('btnAbrirReceta').addEventListener('click', () => {
        formReceta.reset();
        modalReceta.classList.remove('hidden');
    });

    const cerrarModalReceta = () => modalReceta.classList.add('hidden');
    btnCerrarReceta.addEventListener('click', cerrarModalReceta);
    btnCancelarReceta.addEventListener('click', cerrarModalReceta);

    formReceta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const descripcion = document.getElementById('recetaDescripcion').value;
        const medicamentos = document.getElementById('recetaMedicamentos').value;

        const btnSubmit = formReceta.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        try {
            const res = await fetch('/api/medicos/recetas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ pacienteId: currentPacienteId, turnoId: currentTurnoId, descripcion, medicamentos })
            });
            const data = await res.json();
            
            if (res.ok) {
                AppHelper.showToast('Receta generada', 'success');
                cerrarModalReceta();
                cargarHistorialClinico(currentPacienteId);
            } else {
                AppHelper.showAlert('Error', data.error || 'Error al generar receta');
            }
        } catch (error) {
            AppHelper.showAlert('Error', 'Fallo de red al generar receta');
        } finally {
            btnSubmit.disabled = false;
        }
    });

    // --- Lógica de Notificaciones --- //
    const btnNotificaciones = document.getElementById('btnNotificaciones');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');

    let notificacionesOpen = false;
    btnNotificaciones.addEventListener('click', (e) => {
        e.stopPropagation();
        notificacionesOpen = !notificacionesOpen;
        if (notificacionesOpen) {
            notifDropdown.classList.remove('hidden');
            cargarNotificaciones();
        } else {
            notifDropdown.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!btnNotificaciones.contains(e.target) && !notifDropdown.contains(e.target)) {
            notificacionesOpen = false;
            notifDropdown.classList.add('hidden');
        }
    });

    const cargarNotificaciones = async () => {
        if (notificacionesOpen) {
            if (notifList.children.length === 0) {
                 notifList.innerHTML = '<div style="text-align:center; padding:1rem;"><span class="spinner"></span></div>';
            }
        }
        
        try {
            const res = await fetch('/api/notificaciones', {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const notifs = data.notificaciones || [];
            const noLeidas = notifs.filter(n => !n.leido).length;
            
            if (noLeidas > 0) {
                notifBadge.textContent = noLeidas;
                notifBadge.classList.remove('hidden');
            } else {
                notifBadge.classList.add('hidden');
            }

            if (!notificacionesOpen) return;

            if (notifs.length === 0) {
                notifList.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.9rem;">No tienes notificaciones.</div>';
                return;
            }

            notifList.innerHTML = notifs.map(n => `
                <div class="notif-item" style="padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s; background: ${n.leido ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}; border-left: 3px solid ${n.leido ? 'transparent' : 'var(--primary)'}; border-bottom: 1px solid var(--border);" data-id="${n.id}" data-leido="${n.leido}">
                    <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem; color: var(--text-main); font-weight: ${n.leido ? '400' : '600'}; line-height: 1.4;">${n.mensaje}</p>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
            `).join('');

            // Click para marcar como leída
            document.querySelectorAll('.notif-item').forEach(el => {
                el.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const isLeido = e.currentTarget.dataset.leido === 'true';
                    
                    if (!isLeido) {
                        await marcarNotificacionLeida(id);
                        cargarNotificaciones(); // recargar dropdown
                    }

                    // Cerrar dropdown
                    notificacionesOpen = false;
                    notifDropdown.classList.add('hidden');
                });
            });

        } catch(error) {
            console.error(error);
            if (notificacionesOpen) {
                notifList.innerHTML = '<div style="color:var(--error); padding:1rem;">Error al cargar notificaciones.</div>';
            }
        }
    };

    const marcarNotificacionLeida = async (id) => {
        try {
            await fetch(`/api/notificaciones/${id}/leida`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
        } catch(err) {
            console.error('Error marcar leida', err);
        }
    };

    // --- Sala Virtual y Chat Triaje (TM-U02, TM-C04) --- //
    const modalSalaVirtual = document.getElementById('modalSalaVirtual');
    const btnCerrarSala = document.getElementById('btnCerrarSala');
    const btnFinalizarLlamada = document.getElementById('btnFinalizarLlamada');
    
    const closeModalSala = () => {
        modalSalaVirtual.classList.add('hidden');
    };

    const finalizarLlamada = async () => {
        const turnoId = btnFinalizarLlamada.dataset.id;
        if (!turnoId) {
            closeModalSala();
            return;
        }
        try {
            const response = await fetch(`/api/turnos/atender/${turnoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                AppHelper.showToast('Consulta finalizada, turno marcado como Atendido.', 'success');
                cargarTurnosMedico();
            } else {
                AppHelper.showToast(data.error || 'Error al marcar turno como atendido.', 'error');
            }
        } catch (error) {
            console.error(error);
            AppHelper.showToast('Fallo de red al intentar finalizar la consulta.', 'error');
        }
        closeModalSala();
    };

    btnCerrarSala.addEventListener('click', finalizarLlamada);
    btnFinalizarLlamada.addEventListener('click', finalizarLlamada);

    const modalChat = document.getElementById('modalChat');
    const btnCerrarChat = document.getElementById('btnCerrarChat');
    const formChat = document.getElementById('formChat');
    const chatInput = document.getElementById('chatInput');
    const chatTurnoId = document.getElementById('chatTurnoId');
    const chatMessages = document.getElementById('chatMessages');

    const closeModalChat = () => {
        modalChat.classList.add('hidden');
        chatInput.value = '';
    };

    btnCerrarChat.addEventListener('click', closeModalChat);

    const abrirModalChat = async (turnoId) => {
        chatTurnoId.value = turnoId;
        chatMessages.innerHTML = '<div class="text-center"><span class="spinner"></span></div>';
        modalChat.classList.remove('hidden');
        
        await cargarMensajesChat(turnoId);
    };

    const cargarMensajesChat = async (turnoId) => {
        try {
            const res = await fetch(`/api/chat/${turnoId}`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.mensajes.length === 0) {
                chatMessages.innerHTML = '<div class="text-center" style="color:var(--text-muted); margin-top:2rem; font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 0.5rem 1rem; border-radius: 1rem; align-self: center;">No hay mensajes previos.</div>';
            } else {
                chatMessages.innerHTML = data.mensajes.map(m => {
                    const esMio = m.emisorId === sesion.usuario.id;
                    const nombre = esMio ? 'Tú' : m.emisor.nombre;
                    const timeString = new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const bubbleClass = esMio ? 'chat-message-mine' : 'chat-message-other';
                    return `
                        <div class="chat-message-bubble ${bubbleClass}">
                            ${!esMio ? `<span class="chat-message-name">${nombre}</span>` : ''}
                            <span class="chat-message-text">${m.mensaje}</span>
                            <span class="chat-message-time">${timeString}</span>
                        </div>
                    `;
                }).join('');
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
            }
        } catch(error) {
            chatMessages.innerHTML = '<div class="text-center text-error">Error al cargar el chat</div>';
        }
    };

    formChat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const turnoId = chatTurnoId.value;
        const mensaje = chatInput.value.trim();
        if (!mensaje) return;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                },
                body: JSON.stringify({ turnoId, mensaje })
            });
            if (res.ok) {
                chatInput.value = '';
                await cargarMensajesChat(turnoId);
            }
        } catch(error) {
            AppHelper.showToast('Error al enviar mensaje', 'error');
        }
    });

    cargarNotificaciones();
    setInterval(cargarNotificaciones, 30000);

});
