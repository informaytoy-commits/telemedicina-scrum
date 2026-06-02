document.addEventListener('DOMContentLoaded', () => {
    const sesion = AppHelper.validarSesion('recepcionista');
    if (!sesion) return;

    AppHelper.bindLogoutButton();
    const token = sesion.token;

    // Actualizar saludo y avatar
    const userDisplay = document.getElementById('userNameDisplay');
    const recepAvatarContainer = document.getElementById('recepAvatarContainer');
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
        try {
            const usuarioObj = JSON.parse(usuarioStr);
            if (userDisplay) userDisplay.textContent = usuarioObj.nombre;
            
            if (recepAvatarContainer) {
                const initial = usuarioObj.nombre ? usuarioObj.nombre.charAt(0).toUpperCase() : 'R';
                const photoPath = AppHelper.obtenerImagenUsuario(usuarioObj);
                
                if (photoPath) {
                    recepAvatarContainer.innerHTML = `<img src="${photoPath}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #bfdbfe; box-shadow: var(--shadow-sm);" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #bfdbfe;\\'>${initial}</div>';">`;
                } else {
                    recepAvatarContainer.innerHTML = `<div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #bfdbfe;">${initial}</div>`;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    const selectMedico = document.getElementById('selectMedico');
    const medicoPanel = document.getElementById('medicoPanel');

    // Nodos de disponibilidad
    const formDisp = document.getElementById('formDisponibilidad');
    const dispList = document.getElementById('disponibilidadList');
    const dispTable = document.getElementById('disponibilidadTable');
    const dispEmpty = document.getElementById('disponibilidadEmpty');
    const dispLoading = document.getElementById('disponibilidadLoading');

    // Nodos de turnos
    const turnosLoading = document.getElementById('turnosLoading');
    const turnosEmpty = document.getElementById('turnosEmpty');
    const turnosTableContainer = document.getElementById('turnosTableContainer');
    const turnosTableBody = document.getElementById('turnosTableBody');
    const filtroFecha = document.getElementById('filtroFecha');
    const filtroDiaSemana = document.getElementById('filtroDiaSemana');
    const countPacientes = document.getElementById('countPacientes');
    const countPacientesContainer = document.getElementById('countPacientesContainer');

    let currentMedicoId = null;
    let listaMedicos = [];
    let listaTurnosActuales = [];

    if (filtroFecha) {
        filtroFecha.addEventListener('change', () => {
            filtrarYRenderizarTurnos();
        });
    }

    // Cargar médicos activos
    async function cargarMedicos() {
        try {
            // Nota: Se asume que el backend permite /api/admin/usuarios o hacer un endpoint de /api/medicos.
            // Para simplificar, vamos a usar un endpoint que liste médicos si no lo tenemos, o pedirselo a /api/admin/usuarios no, admin/usuarios es solo admin.
            // Wait, el recepcionista no tiene acceso a /api/admin/usuarios.
            // Vamos a usar /api/medicos que lista medicos activos. En medicoRoutes.js dice:
            // router.get('/', verifyToken, checkRole(['paciente']), buscarMedicos);
            // El recepcionista necesita ver los medicos. Voy a hacer fetch a /api/medicos, pero necesito cambiar la ruta para aceptar recepcionista.
            
            // Si /api/medicos requiere paciente, se lo añadimos en routes/medicoRoutes.js
            const res = await fetch('/api/medicos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.medicos) {
                listaMedicos = data.medicos;
                selectMedico.innerHTML = '<option value="">Buscar y seleccionar médico...</option>';
                data.medicos.forEach(med => {
                    const option = document.createElement('option');
                    option.value = med.id;
                    option.textContent = `${med.nombre} - ${med.especialidad || 'No asignada'}`;
                    selectMedico.appendChild(option);
                });
            } else {
                AppHelper.showAlert('Error', data.error || 'No se pudieron cargar los médicos.');
            }
        } catch (error) {
            AppHelper.showAlert('Error de Red', 'No se pudieron cargar los médicos.');
        }
    }

    selectMedico.addEventListener('change', (e) => {
        const medicoId = e.target.value;
        if (medicoId) {
            currentMedicoId = medicoId;
            medicoPanel.style.display = 'block';
            
            const medicoSeleccionado = listaMedicos.find(m => m.id == medicoId);
            if(medicoSeleccionado) mostrarPerfilMedico(medicoSeleccionado);

            cargarDisponibilidades(medicoId);

            // Al seleccionar médico, se autocompleta con hoy local en formato YYYY-MM-DD
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localISO = (new Date(now - offset)).toISOString().slice(0, 10);
            if (filtroFecha) {
                filtroFecha.value = localISO;
            }

            cargarTurnos(medicoId);
        } else {
            currentMedicoId = null;
            medicoPanel.style.display = 'none';
        }
    });

    function mostrarPerfilMedico(med) {
        const profileDiv = document.getElementById('medicoProfile');
        const initial = med.nombre ? med.nombre.charAt(0).toUpperCase() : '?';
        const photoPath = AppHelper.obtenerImagenUsuario(med);
        
        let statusBadge = '';
        if(med.estado === 'activo') {
            statusBadge = `<span class="badge badge-activo" style="margin-top: 0.75rem; display: inline-flex; font-size: 0.75rem; padding: 0.4rem 0.9rem; border-radius: 999px; background-color: var(--success); color: white; font-weight: 600; letter-spacing: 0.03em;">ACTIVO</span>`;
        } else {
            statusBadge = `<span class="badge badge-inactivo" style="margin-top: 0.75rem; display: inline-flex; font-size: 0.75rem; padding: 0.4rem 0.9rem; border-radius: 999px; background-color: var(--error); color: white; font-weight: 600; letter-spacing: 0.03em;">INACTIVO</span>`;
        }

        let avatarHTML = '';
        if (photoPath) {
            avatarHTML = `<div style="position: relative; width: 110px; height: 110px; margin: 0 auto 1.25rem auto;">
                <img src="${photoPath}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid var(--surface); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08); display: block;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'width: 110px; height: 110px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-light) 0%, #dbeafe 100%); color: var(--primary); font-size: 3rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 4px solid var(--surface); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);\\'>${initial}</div>';">
            </div>`;
        } else {
            avatarHTML = `<div style="width: 110px; height: 110px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-light) 0%, #dbeafe 100%); color: var(--primary); font-size: 3rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; border: 4px solid var(--surface); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);">
                ${initial}
            </div>`;
        }

        profileDiv.innerHTML = `
            ${avatarHTML}
            <h3 style="font-size: 1.3rem; color: var(--text-main); font-weight: 700; margin-bottom: 0.35rem; letter-spacing: -0.01em;">${med.nombre}</h3>
            <p style="color: var(--primary); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.35rem;">${med.especialidad || 'Especialidad no asignada'}</p>
            ${med.email ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; word-break: break-all;">${med.email}</p>` : ''}
            ${statusBadge}
        `;
    }

    async function cargarDisponibilidades(medicoId) {
        dispLoading.classList.remove('hidden');
        dispEmpty.classList.add('hidden');
        document.getElementById('disponibilidadContainer').style.display = 'none';
        dispList.innerHTML = '';
        document.getElementById('countHorarios').textContent = '0';

        try {
            const res = await fetch(`/api/disponibilidad/medico/${medicoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            dispLoading.classList.add('hidden');
            
            if (res.ok && Array.isArray(data)) {
                document.getElementById('countHorarios').textContent = data.length;
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
                            <td>
                                <button class="btn btn-secondary btn-sm btn-delete-disp" data-id="${item.id}" style="color:var(--error); border-color: rgba(222, 53, 11, 0.3); padding: 0.3rem 0.6rem;">
                                    Eliminar
                                </button>
                            </td>
                        `;
                        dispList.appendChild(tr);
                    });
                    document.getElementById('disponibilidadContainer').style.display = 'block';
                    
                    document.querySelectorAll('.btn-delete-disp').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.target.dataset.id;
                            AppHelper.showConfirm('Confirmar Borrado', '¿Seguro que deseas eliminar este rango horario?', async () => {
                                try {
                                    const delRes = await fetch(`/api/disponibilidad/${id}`, {
                                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if(delRes.ok) { 
                                        AppHelper.showToast('Horario eliminado', 'success'); 
                                        cargarDisponibilidades(currentMedicoId); 
                                    } else { 
                                        const delData=await delRes.json(); 
                                        AppHelper.showAlert('Error', delData.error||'Error al borrar'); 
                                    }
                                } catch(err) { AppHelper.showAlert('Error', 'Fallo de red'); }
                            });
                        });
                    });
                }
            }
        } catch(error) {
            dispLoading.classList.add('hidden');
            console.error(error);
        }
    }

    formDisp.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentMedicoId) return;

        const dia = document.getElementById('dispDia').value;
        const inicio = document.getElementById('dispHoraInicio').value;
        const fin = document.getElementById('dispHoraFin').value;

        if (inicio >= fin) {
            AppHelper.showAlert('Error de Horario', 'La hora de inicio debe ser estrictamente anterior a la hora de fin.');
            return;
        }

        const btnSubmit = formDisp.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        try {
            const res = await fetch('/api/disponibilidad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ medicoId: currentMedicoId, dia_semana: dia, hora_inicio: inicio, hora_fin: fin })
            });
            const data = await res.json();
            
            if(res.ok) {
                AppHelper.showToast('Horario asignado exitosamente', 'success');
                formDisp.reset();
                cargarDisponibilidades(currentMedicoId);
            } else {
                AppHelper.showAlert('No se pudo guardar', data.error || 'Solapamiento o error de servidor.');
            }
        } catch(error) {
            AppHelper.showAlert('Fallo de Red', 'Imposible conectar con el servidor.');
        } finally {
            btnSubmit.disabled = false;
        }
    });

    function calcularDiaSemana(fechaStr) {
        if (!fechaStr) return '';
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = fechaStr.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return dias[date.getDay()];
    }

    function filtrarYRenderizarTurnos() {
        if (!filtroFecha) return;
        const fechaSeleccionada = filtroFecha.value;
        
        // 1. Mostrar día de la semana calculado automáticamente
        const diaCalculado = calcularDiaSemana(fechaSeleccionada);
        if (filtroDiaSemana) {
            filtroDiaSemana.value = diaCalculado || 'No calculado';
        }

        // 2. Filtrar turnos
        const turnosFiltrados = listaTurnosActuales.filter(t => t.fecha_reserva === fechaSeleccionada);

        // 3. Ordenar turnos por hora_inicio
        turnosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

        // 4. Mostrar cantidad de pacientes encontrados
        if (countPacientes) countPacientes.textContent = turnosFiltrados.length;
        if (countPacientesContainer) {
            countPacientesContainer.style.display = 'inline-block';
        }

        // 5. Renderizar en la tabla
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
            
            const pagoBadge = isCancelado 
                ? `<span class="badge" style="background-color: var(--text-muted); color: white;">N/A</span>`
                : `<span class="badge badge-pagado" style="font-size: 0.7rem; padding: 0.3rem 0.75rem; border-radius: 9999px; background-color: var(--success); color: white; font-weight: 600;">PAGADO</span>`;

            let badgeEstadoClase = `badge-${turno.estado.toLowerCase()}`;
            if (isAtendido) {
                badgeEstadoClase = 'badge-atendido';
            }

            let badgeSoporteHTML = '';
            let btnChatStyle = 'padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-md); background: #f1f5f9; border-color: #cbd5e1; color: var(--text-main);';
            
            if (turno.recepcionChatEstado === 'Pendiente') {
                badgeSoporteHTML = `<span class="badge badge-error" style="font-size: 0.65rem; padding: 0.2rem 0.5rem; font-weight: 700; border-radius: 4px; background-color: var(--error); color: white; animation: pulse 2s infinite; display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;">
                    <span style="width: 6px; height: 6px; background-color: white; border-radius: 50%; display: inline-block;"></span>
                    SOPORTE PENDIENTE
                </span>`;
                btnChatStyle = 'padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 700; border-radius: var(--radius-md); background: #fee2e2; border-color: #fca5a5; color: #b91c1c; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);';
            }

            // Acciones: Detalle, Triaje
            let accionesHTML = '';
            if (!isCancelado) {
                accionesHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.15rem; align-items: flex-start;">
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-sm btn-detalle" data-id="${turno.id}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-md);">Detalle</button>
                            ${turno.paciente ? `<button class="btn btn-secondary btn-sm btn-chat" data-id="${turno.id}" style="${btnChatStyle}">Chat Soporte</button>` : ''}
                        </div>
                        ${badgeSoporteHTML}
                    </div>
                `;
            } else {
                accionesHTML = `
                    <button class="btn btn-secondary btn-sm btn-detalle" data-id="${turno.id}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-md);">Detalle</button>
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
                    ${accionesHTML}
                </td>
            `;

            if (turnosTableBody) turnosTableBody.appendChild(tr);
        });

        // asociar los listeners para las acciones de la tabla
        document.querySelectorAll('.btn-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                abrirModalChat(e.target.dataset.id);
            });
        });

        document.querySelectorAll('.btn-detalle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const turnoId = e.target.dataset.id;
                const t = listaTurnosActuales.find(item => item.id == turnoId);
                if (t) {
                    const pac = t.paciente ? t.paciente.nombre : 'Desconocido';
                    const email = t.paciente ? t.paciente.email : 'N/A';
                    
                    const medicoSeleccionado = listaMedicos.find(m => m.id == currentMedicoId);
                    const medNombre = medicoSeleccionado ? medicoSeleccionado.nombre : 'Médico Desconocido';
                    const medEsp = medicoSeleccionado ? (medicoSeleccionado.especialidad || 'Medicina General') : 'N/A';

                    const pagoEstado = t.pago ? t.pago.estado.toUpperCase() : 'PENDIENTE';
                    const pagoMonto = t.pago ? `Bs. ${t.pago.monto}` : 'Bs. 0.00';
                    const pagoDetalle = `<span class="badge badge-${pagoEstado.toLowerCase() === 'pagado' ? 'confirmado' : 'pendiente'}" style="font-size:0.75rem; border-radius:9999px;">${pagoEstado} (${pagoMonto})</span>`;

                    const observaciones = t.notaClinica ? (t.notaClinica.observaciones || t.notaClinica.diagnostico || 'Ninguna registrada') : 'Ninguna registrada';

                    AppHelper.showAlert(
                        `Detalle de la Reserva #${t.id}`,
                        `<div style="display:flex; flex-direction:column; gap:0.6rem; text-align:left; font-family:'Inter', sans-serif;">
                            <p style="margin:0;"><strong>Paciente:</strong> ${pac} (${email})</p>
                            <p style="margin:0;"><strong>Médico:</strong> Dr/a. ${medNombre}</p>
                            <p style="margin:0;"><strong>Especialidad:</strong> ${medEsp}</p>
                            <p style="margin:0;"><strong>Fecha:</strong> ${t.fecha_reserva} (${t.dia_semana})</p>
                            <p style="margin:0;"><strong>Hora:</strong> ${t.hora_inicio.slice(0,5)} - ${t.hora_fin.slice(0,5)}</p>
                            <p style="margin:0; display:flex; align-items:center; gap:0.35rem;"><strong>Estado:</strong> <span class="badge badge-${t.estado.toLowerCase()}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem; text-transform: uppercase;">${t.estado}</span></p>
                            <p style="margin:0; display:flex; align-items:center; gap:0.35rem;"><strong>Pago:</strong> ${pagoDetalle}</p>
                            <p style="margin:0; border-top:1px solid var(--border); padding-top:0.5rem; line-height:1.4;"><strong>Observaciones:</strong> <span style="color:var(--text-muted);">${observaciones}</span></p>
                         </div>`
                    );
                }
            });
        });
    }

    async function cargarTurnos(medicoId) {
        turnosLoading.classList.remove('hidden');
        turnosEmpty.classList.add('hidden');
        if (turnosTableContainer) turnosTableContainer.style.display = 'none';
        if (countPacientesContainer) countPacientesContainer.style.display = 'none';
        listaTurnosActuales = [];

        try {
            const response = await fetch(`/api/turnos/medico/${medicoId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al obtener turnos');
            
            listaTurnosActuales = data.turnos || [];
            turnosLoading.classList.add('hidden');

            // Actualizar total histórico en sidebar
            const countTurnosNode = document.getElementById('countTurnos');
            if (countTurnosNode) {
                countTurnosNode.textContent = listaTurnosActuales.length;
            }

            // Inicializar la fecha si el input está vacío
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
    }

    // --- Lógica del Chat Triaje ---
    const modalChat = document.getElementById('modalChat');
    const btnCerrarChat = document.getElementById('btnCerrarChat');
    const formChat = document.getElementById('formChat');
    const chatInput = document.getElementById('chatInput');
    const chatTurnoId = document.getElementById('chatTurnoId');
    const chatTriageId = document.getElementById('chatTriageId');
    const chatMessages = document.getElementById('chatMessages');

    let triageChatInterval = null;

    const closeModalChat = () => {
        if (modalChat) modalChat.classList.add('hidden');
        if (chatInput) chatInput.value = '';
        if (chatTurnoId) chatTurnoId.value = '';
        if (chatTriageId) chatTriageId.value = '';
        if (triageChatInterval) {
            clearInterval(triageChatInterval);
            triageChatInterval = null;
        }
    };

    if (btnCerrarChat) btnCerrarChat.addEventListener('click', closeModalChat);

    const abrirModalChat = async (turnoId) => {
        if (chatTurnoId) chatTurnoId.value = turnoId;
        if (chatTriageId) chatTriageId.value = '';
        chatMessages.innerHTML = '<div class="text-center"><span class="spinner"></span></div>';
        modalChat.classList.remove('hidden');
        
        await cargarMensajesChat(turnoId);

        // Polling para mensajes cada 5 segundos
        if (triageChatInterval) clearInterval(triageChatInterval);
        triageChatInterval = setInterval(() => {
            cargarMensajesChat(turnoId, true);
        }, 5000);
    };

    const cargarMensajesChat = async (turnoId, isSilent = false) => {
        try {
            const res = await fetch(`/api/chat/${turnoId}?tipo=recepcion`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.mensajes.length === 0) {
                if (!isSilent) {
                    chatMessages.innerHTML = '<div class="text-center" style="color:var(--text-muted); margin-top:2rem; font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 0.5rem 1rem; border-radius: 1rem; align-self: center;">No hay mensajes previos en este chat.</div>';
                }
            } else {
                chatMessages.innerHTML = data.mensajes.map(m => {
                    const esMio = m.emisorId === sesion.usuario.id;
                    const nombre = esMio ? 'Tú' : (m.emisor.rol === 'recepcionista' ? 'Recepcionista' : m.emisor.nombre);
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
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: isSilent ? 'auto' : 'smooth' });
            }
        } catch(error) {
            if (!isSilent) {
                chatMessages.innerHTML = '<div class="text-center text-error">Error al cargar el chat</div>';
            }
        }
    };

    if (formChat) {
        formChat.addEventListener('submit', async (e) => {
            e.preventDefault();
            const turnoId = chatTurnoId ? chatTurnoId.value : '';
            const mensaje = chatInput.value.trim();
            if (!mensaje) return;

            const btnSubmit = formChat.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;

            try {
                if (turnoId) {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ turnoId, mensaje, tipo: 'recepcion' })
                    });
                    if (res.ok) {
                        chatInput.value = '';
                        await cargarMensajesChat(turnoId);
                        // Recargar el turno para actualizar el estado a "Atendida"
                        if (currentMedicoId) {
                            cargarTurnos(currentMedicoId);
                        }
                    }
                }
            } catch(error) {
                AppHelper.showToast('Error al enviar mensaje', 'error');
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    // --- Lógica de Notificaciones ---
    const btnNotificaciones = document.getElementById('btnNotificaciones');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');

    let notificacionesOpen = false;

    if (btnNotificaciones) {
        btnNotificaciones.addEventListener('click', () => {
            notificacionesOpen = !notificacionesOpen;
            if (notificacionesOpen) {
                if (notifDropdown) notifDropdown.classList.remove('hidden');
                cargarNotificaciones();
            } else {
                if (notifDropdown) notifDropdown.classList.add('hidden');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (btnNotificaciones && !btnNotificaciones.contains(e.target) && notifDropdown && !notifDropdown.contains(e.target)) {
            notificacionesOpen = false;
            notifDropdown.classList.add('hidden');
        }
    });

    const cargarNotificaciones = async () => {
        if (notificacionesOpen) {
            if (notifList && notifList.children.length === 0) {
                 notifList.innerHTML = '<div style="text-align:center; padding:1rem;"><span class="spinner"></span></div>';
            }
        }
        
        try {
            const res = await fetch('/api/notificaciones', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const notifs = data.notificaciones || [];
            const noLeidas = notifs.filter(n => !n.leido).length;
            
            if (notifBadge) {
                if (noLeidas > 0) {
                    notifBadge.textContent = noLeidas;
                    notifBadge.classList.remove('hidden');
                } else {
                    notifBadge.classList.add('hidden');
                }
            }

            if (!notificacionesOpen) return;

            if (notifs.length === 0) {
                if (notifList) notifList.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.9rem;">No tienes notificaciones.</div>';
                return;
            }

            if (notifList) {
                notifList.innerHTML = notifs.map(n => `
                    <div class="notif-item" style="padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s; background: ${n.leido ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}; border-left: 3px solid ${n.leido ? 'transparent' : 'var(--primary)'}; border-bottom: 1px solid var(--border);" data-id="${n.id}" data-leido="${n.leido}">
                        <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem; color: var(--text-main); font-weight: ${n.leido ? '400' : '600'}; line-height: 1.4;">${n.mensaje}</p>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                `).join('');
            }

            // Click para marcar como leída
            document.querySelectorAll('.notif-item').forEach(el => {
                el.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const isLeido = e.currentTarget.dataset.leido === 'true';
                    
                    if (!isLeido) {
                        await marcarNotificacionLeida(id);
                        cargarNotificaciones(); // recargar
                    }

                    notificacionesOpen = false;
                    if (notifDropdown) notifDropdown.classList.add('hidden');
                });
            });

        } catch(error) {
            console.error(error);
            if (notificacionesOpen && notifList) {
                notifList.innerHTML = '<div style="color:var(--error); padding:1rem;">Error al cargar notificaciones.</div>';
            }
        }
    };

    const marcarNotificacionLeida = async (id) => {
        try {
            await fetch(`/api/notificaciones/${id}/leida`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch(err) {
            console.error('Error marcar leida', err);
        }
    };

    // --- Evento Marcar como Atendido ---
    const btnMarcarAtendido = document.getElementById('btnMarcarAtendido');
    if (btnMarcarAtendido) {
        btnMarcarAtendido.addEventListener('click', async () => {
            const turnoId = chatTurnoId ? chatTurnoId.value : '';
            if (!turnoId) return;

            try {
                const res = await fetch(`/api/chat/atender/${turnoId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    AppHelper.showToast('Chat marcado como atendido con éxito', 'success');
                    closeModalChat();
                    if (currentMedicoId) {
                        cargarTurnos(currentMedicoId);
                    }
                } else {
                    AppHelper.showAlert('Error', data.error || 'No se pudo marcar como atendido.');
                }
            } catch (err) {
                AppHelper.showToast('Error de red al marcar como atendido', 'error');
            }
        });
    }

    cargarNotificaciones();
    setInterval(cargarNotificaciones, 30000);

    cargarMedicos();
});
