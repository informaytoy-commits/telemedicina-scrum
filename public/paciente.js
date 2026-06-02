document.addEventListener('DOMContentLoaded', () => {
    // Validar que el usuario sea paciente y tenga token
    const sesion = AppHelper.validarSesion('paciente');
    if (!sesion) return; // Si no hay sesión, AppHelper ya redirigió al login

    // Asignar el botón de logout
    AppHelper.bindLogoutButton();

    // Referencias del DOM
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const specialtySelect = document.getElementById('specialtySelect');
    const searchButton = document.getElementById('searchButton');

    // Contenedores de estados
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorText = document.getElementById('errorText');
    const emptyState = document.getElementById('emptyState');
    const medicosList = document.getElementById('medicosList');

    const buscarMedicos = async (nombreQuery = '', especialidadQuery = '') => {
        // Mostrar estado de carga
        hideAllStates();
        loadingState.classList.remove('hidden');
        searchButton.classList.add('loading');
        searchButton.disabled = true;

        try {
            // Construir URL con el parámetro de búsqueda si existe
            let url = `/api/medicos`;
            let params = new URLSearchParams();
            if (nombreQuery.trim() !== '') params.append('nombre', nombreQuery);
            if (especialidadQuery.trim() !== '') params.append('especialidad', especialidadQuery);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            // Efectuar solicitud
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                }
            });

            const data = await response.json();
            // console.log('Respuesta médicos:', data);

            if (!response.ok) {
                throw new Error(data.error || data.mensaje || data.message || 'Error al reservar turno');
            }

            const medicos = Array.isArray(data.medicos) ? data.medicos : [];

            // Datos obtenidos exitosamente
            hideAllStates();

            if (medicos.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                renderizarMedicos(medicos);
                medicosList.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Error fetching médicos:', error);
            hideAllStates();
            errorText.textContent = error.message.includes('Failed to fetch')
                ? 'Error de conexión con el servidor.'
                : error.message;
            errorState.classList.remove('hidden');
        } finally {
            searchButton.classList.remove('loading');
            searchButton.disabled = false;
        }
    };

    // Función para renderizar la lista de tarjetas
    const renderizarMedicos = (medicos) => {
        medicosList.innerHTML = ''; // Limpiar grilla

        medicos.forEach(medico => {
            // Manejar avatar con foto real o fallback initial
            const initialString = medico.nombre ? medico.nombre.charAt(0).toUpperCase() : 'M';
            const photoPath = AppHelper.obtenerImagenUsuario(medico);
            const avatarHTML = photoPath 
                ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">` 
                : initialString;
            
            // Especialidad
            const especialidadText = medico.especialidad || 'No asignada';

            // Mapear Disponibilidades
            let dispHTML = `<div style="margin: 0.75rem 0 1.25rem 0; font-size: 0.9rem; color: var(--text-muted)">`;
            let tieneDisponibilidad = false;
            let btnReservaClass = '';
            let btnReservaText = 'Reservar Turno';
            let medicosSlotsForModal = [];

            if (medico.disponibilidades && medico.disponibilidades.length > 0) {
                tieneDisponibilidad = true;
                const d = medico.disponibilidades[0];
                let extra = medico.disponibilidades.length > 1 ? ` <span style="font-size: 0.7rem; background: #e6effc; color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px;">+${medico.disponibilidades.length - 1}</span>` : '';
                dispHTML += `<div style="display: flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span style="font-weight: 600; color: var(--text-main);">${d.dia_semana}</span> ${d.hora_inicio.slice(0,5)} - ${d.hora_fin.slice(0,5)}${extra}</div>`;
                medicosSlotsForModal = medico.disponibilidades;
            } else {
                dispHTML += `<div style="display: flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Sin horario definido</div>`;
                btnReservaClass = 'btn-secondary';
                btnReservaText = 'No Disponible';
            }
            dispHTML += `</div>`;

            const card = document.createElement('div');
            card.className = 'medico-card';
            card.innerHTML = `
                <div class="medico-header">
                    <div class="medico-avatar">${avatarHTML}</div>
                    <div class="medico-info">
                        <h3>Dr/a. ${medico.nombre}</h3>
                        <p style="color: var(--primary); font-weight: 500">${especialidadText}</p>
                    </div>
                </div>
                ${dispHTML}
                <button class="btn btn-primary btn-reservar ${tieneDisponibilidad ? '' : 'btn-disabled'}" 
                    data-id="${medico.id}" data-name="${medico.nombre}" data-dispos='${JSON.stringify(medicosSlotsForModal)}' data-turnos='${JSON.stringify(medico.turnosMedico || [])}'
                    ${tieneDisponibilidad ? '' : 'disabled style="background: var(--bg-color); color: var(--text-muted); border: 1px solid var(--border)"'}>
                    ${btnReservaText}
                </button>
            `;
            medicosList.appendChild(card);
        });

        // Configurar el botón "Reservar" de cada tarjeta
        const botonesReservar = document.querySelectorAll('.btn-reservar:not([disabled])');
        botonesReservar.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const medicoId = e.target.getAttribute('data-id');
                const medicoNombre = e.target.getAttribute('data-name');
                const disposStr = e.target.getAttribute('data-dispos');
                const turnosStr = e.target.getAttribute('data-turnos');
                let dispos = [];
                let turnos = [];
                try { dispos = JSON.parse(disposStr); } catch(ex){}
                try { turnos = JSON.parse(turnosStr); } catch(ex){}
                openReservaModal(medicoId, medicoNombre, dispos, turnos);
            });
        });
    };

    // Helper para limpiar las vistas antes de un nuevo estado
    const hideAllStates = () => {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        medicosList.classList.add('hidden');
    };

    // Interceptar el submit del formulario de búsqueda
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = searchInput.value;
        const especialidadQuery = specialtySelect.value;
        buscarMedicos(searchQuery, especialidadQuery);
    });

    // Búsqueda en tiempo real (debounce opcional, pero aquí simple)
    let searchTimeout;
    const handleRealTimeSearch = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchQuery = searchInput.value;
            const especialidadQuery = specialtySelect.value;
            buscarMedicos(searchQuery, especialidadQuery);
        }, 300); // 300ms de retraso para evitar peticiones excesivas
    };

    searchInput.addEventListener('input', handleRealTimeSearch);
    specialtySelect.addEventListener('change', handleRealTimeSearch);

    // Función para cargar especialidades reales
    const cargarEspecialidades = async () => {
        try {
            const response = await fetch('/api/medicos/especialidades', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sesion.token}`
                }
            });
            const data = await response.json();
            
            if (response.ok && data.especialidades && data.especialidades.length > 0) {
                // Mantener "Todas las especialidades"
                let optionsHTML = '<option value="">Todas las especialidades</option>';
                data.especialidades.forEach(esp => {
                    optionsHTML += `<option value="${esp}">${esp}</option>`;
                });
                specialtySelect.innerHTML = optionsHTML;
            }
        } catch (error) {
            console.error('Error fetching especialidades:', error);
        }
    };

    // --- Lógica del Modal de Reservas --- //

    const reservaModal = document.getElementById('reservaModal');
    const modalMedicoName = document.getElementById('modalMedicoName');
    const reservaForm = document.getElementById('reservaForm');
    const reservaMedicoId = document.getElementById('reservaMedicoId');
    const fechaReserva = document.getElementById('fechaReserva');
    const horaInicio = document.getElementById('horaInicio');
    const horaFin = document.getElementById('horaFin');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelReservaBtn = document.getElementById('cancelReservaBtn');
    const submitReservaBtn = document.getElementById('submitReservaBtn');
    const reservaError = document.getElementById('reservaError');
    const reservaSuccess = document.getElementById('reservaSuccess');

    const modalDisponibilidadList = document.getElementById('modalDisponibilidadList');
    const horariosContainer = document.getElementById('horariosContainer');
    const horariosGroup = document.getElementById('horariosGroup');
    
    let currentMedicoDispos = []; 
    let currentMedicoTurnos = []; 

    // Función auxiliar para deducir Lunes..Domingo desde YYYY-MM-DD
    const obtenerDiaSemana = (fechaStr) => {
        if (!fechaStr) return null;
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = fechaStr.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return dias[date.getDay()];
    };

    // Función que devuelve bloques de 1 hora
    const generarBloquesDeUnaHora = (inicio, fin) => {
        const minToDate = (timeStr) => {
            const [h, m] = timeStr.split(':');
            let d = new Date(); d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            return d;
        };
        const bloques = [];
        let current = minToDate(inicio);
        const end = minToDate(fin);

        while (current < end) {
            let next = new Date(current.getTime() + 60 * 60000);
            if (next <= end) {
                const formatT = (date) => date.toTimeString().slice(0, 5);
                bloques.push({ start: formatT(current), end: formatT(next) });
            }
            current = next;
        }
        return bloques;
    };

    // Función para abrir modal
    const openReservaModal = (medicoId, medicoNombre, dispos, turnos) => {
        reservaForm.reset();
        reservaError.style.display = 'none';
        reservaSuccess.classList.add('hidden');
        submitReservaBtn.disabled = true; 
        horaInicio.value = '';
        horaFin.value = '';
        horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Selecciona una fecha para ver los horarios.</span>';

        // Restringir a fechas futuras en el calendario nativo
        const hoy = new Date().toISOString().split('T')[0];
        fechaReserva.setAttribute('min', hoy);

        reservaMedicoId.value = medicoId;
        modalMedicoName.textContent = `Reservar Turno - Dr/a. ${medicoNombre}`;

        currentMedicoDispos = dispos || [];
        currentMedicoTurnos = turnos || [];

        // Llenar la caja de disponibilidad en modal agrupando por día pero mostrando cada rango individual
        modalDisponibilidadList.innerHTML = '';
        if (dispos && dispos.length > 0) {
            const agrupadoPorDia = {};
            dispos.forEach(d => {
                if (!agrupadoPorDia[d.dia_semana]) agrupadoPorDia[d.dia_semana] = [];
                agrupadoPorDia[d.dia_semana].push(d);
            });

            for (const [dia, rangos] of Object.entries(agrupadoPorDia)) {
                const li = document.createElement('li');
                let html = `<strong>${dia}</strong>:<ul style="margin: 0.25rem 0 0.5rem 1rem; list-style-type: disc;">`;
                rangos.forEach(r => {
                    html += `<li>${r.hora_inicio.slice(0,5)} a ${r.hora_fin.slice(0,5)}</li>`;
                });
                html += `</ul>`;
                li.innerHTML = html;
                li.style.marginBottom = '0.25rem';
                li.style.listStyle = 'none';
                modalDisponibilidadList.appendChild(li);
            }
        }

        reservaModal.classList.remove('hidden');
    };

    // --- Validación Dinámica al Seleccionar Fecha ---
    fechaReserva.addEventListener('change', (e) => {
        reservaError.style.display = 'none';
        
        horariosContainer.innerHTML = '';
        
        const fechaElegida = e.target.value;
        horaInicio.value = '';
        horaFin.value = '';
        document.getElementById('pagoSection').style.display = 'none';

        if (!fechaElegida) {
            horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Selecciona una fecha para ver los horarios válidos.</span>';
            submitReservaBtn.disabled = true;
            return;
        }

        if (currentMedicoDispos.length === 0) {
            horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Sin disponibilidad configurada.</span>';
            reservaError.textContent = "Este médico aún no definió horarios de atención.";
            reservaError.style.display = 'block';
            submitReservaBtn.disabled = true;
            return;
        }

        const diaElegido = obtenerDiaSemana(fechaElegida);
        const disposDelDia = currentMedicoDispos.filter(d => d.dia_semana === diaElegido);

        if (disposDelDia.length === 0) {
            horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Este médico no atiende ese día.</span>';
            reservaError.textContent = `✅ Selecciona una fecha válida según la disponibilidad del médico. (No atiende los ${diaElegido}s)`;
            reservaError.style.display = 'block';
            submitReservaBtn.disabled = true;
        } else {
            reservaError.style.display = 'none';
            submitReservaBtn.disabled = true; 

            // Turnos ocupados para este dia (que no esten cancelados)
            const turnosOcupados = currentMedicoTurnos.filter(t => t.fecha_reserva === fechaElegida && t.estado !== 'Cancelado');

            let hasValidInicio = false;

            disposDelDia.forEach(dispo => {
                 const bloques = generarBloquesDeUnaHora(dispo.hora_inicio, dispo.hora_fin);
                 
                 const blockGroup = document.createElement('div');
                 blockGroup.style.marginBottom = '1rem';
                 
                 const blockTitle = document.createElement('div');
                 blockTitle.style.fontSize = '0.8rem';
                 blockTitle.style.fontWeight = '600';
                 blockTitle.style.color = 'var(--text-main)';
                 blockTitle.style.marginBottom = '0.5rem';
                 blockTitle.textContent = `Opciones para bloque ${dispo.hora_inicio.slice(0,5)} - ${dispo.hora_fin.slice(0,5)}:`;
                 
                 const btnContainerWrapper = document.createElement('div');
                 btnContainerWrapper.style.display = 'flex';
                 btnContainerWrapper.style.flexWrap = 'wrap';
                 btnContainerWrapper.style.gap = '0.5rem';

                 let validBtnsInThisBlock = false;

                 bloques.forEach(b => {
                     // Solapamiento: max(inicio1, inicio2) < min(fin1, fin2)
                     const chocando = turnosOcupados.some(t => {
                         const start = t.hora_inicio.slice(0,5);
                         const end = t.hora_fin.slice(0,5);
                         return (b.start < end && b.end > start);
                     });

                     if (!chocando) {
                         hasValidInicio = true;
                         validBtnsInThisBlock = true;
                         const btn = document.createElement('button');
                         btn.type = 'button';
                         btn.className = 'time-slot-btn';
                         btn.textContent = `${b.start} - ${b.end}`;
                         btn.dataset.start = b.start;
                         btn.dataset.end = b.end;
                         btn.dataset.blockStart = dispo.hora_inicio.slice(0,5);
                         btn.dataset.blockEnd = dispo.hora_fin.slice(0,5);
                         
                         btn.addEventListener('click', () => {
                             reservaError.style.display = 'none';

                             document.querySelectorAll('#horariosContainer .time-slot-btn').forEach(bEl => bEl.classList.remove('active'));
                             btn.classList.add('active');
                             horaInicio.value = btn.dataset.start;
                             horaFin.value = btn.dataset.end;
                             
                             reservaForm.dataset.blockStart = btn.dataset.blockStart;
                             reservaForm.dataset.blockEnd = btn.dataset.blockEnd;

                             submitReservaBtn.disabled = false;
                             document.getElementById('pagoSection').style.display = 'block';
                         });

                         btnContainerWrapper.appendChild(btn);
                     } else {
                         validBtnsInThisBlock = true;
                         const btn = document.createElement('button');
                         btn.type = 'button';
                         btn.className = 'time-slot-btn';
                         btn.textContent = `${b.start} - ${b.end} (Ocupado)`;
                         btn.disabled = true;
                         btn.style.opacity = '0.5';
                         btn.style.cursor = 'not-allowed';
                         btn.style.textDecoration = 'line-through';
                         btnContainerWrapper.appendChild(btn);
                     }
                 });
                 
                 if (validBtnsInThisBlock) {
                     blockGroup.appendChild(blockTitle);
                     blockGroup.appendChild(btnContainerWrapper);
                     horariosContainer.appendChild(blockGroup);
                 }
            });
            
            if (!hasValidInicio) {
                 horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No hay horarios libres para esta fecha.</span>';
            }
        }
    });

    // Funciones para cerrar modal
    const closeReservaModal = () => {
        reservaModal.classList.add('hidden');
        document.getElementById('pagoSection').style.display = 'none';
        reservaForm.reset();
        horariosContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Selecciona una fecha para ver los horarios.</span>';
        submitReservaBtn.disabled = true;
    };

    closeModalBtn.addEventListener('click', closeReservaModal);
    cancelReservaBtn.addEventListener('click', closeReservaModal);

    // Cerrar si hace clic fuera del modal
    reservaModal.addEventListener('click', (e) => {
        if (e.target === reservaModal) {
            closeReservaModal();
        }
    });

    // Manejar envío del formulario de reserva
    reservaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        reservaError.style.display = 'none';

        const reservaData = {
            medicoId: parseInt(reservaMedicoId.value),
            fecha_reserva: fechaReserva.value,
            hora_inicio: horaInicio.value,
            hora_fin: horaFin.value
        };

        // Frontend validation
        if (reservaData.hora_inicio >= reservaData.hora_fin) {
            reservaError.style.display = 'block';
            reservaError.textContent = 'La hora de inicio debe ser anterior a la hora de fin.';
            return;
        }

        // --- VALIDACION CRITICA FRONTEND (Evitar solapamientos transversales entre bloques distintos) ---
        // Verificar contra el bloque directamente recordado
        const bStart = reservaForm.dataset.blockStart;
        const bEnd = reservaForm.dataset.blockEnd;

        let encajaEnBloque = false;
        if (bStart && bEnd) {
            if (reservaData.hora_inicio >= bStart && reservaData.hora_fin <= bEnd) {
                encajaEnBloque = true;
            }
        }

        if (!encajaEnBloque) {
             reservaError.style.display = 'block';
             reservaError.textContent = 'El rango seleccionado no pertenece a un mismo bloque de disponibilidad válido del médico.';
             submitReservaBtn.disabled = true;
             return;
        }

        submitReservaBtn.classList.add('loading');
        submitReservaBtn.disabled = true;

        try {
            const payload = {
                ...reservaData,
                hora_inicio: reservaData.hora_inicio.length === 5 ? reservaData.hora_inicio + ':00' : reservaData.hora_inicio,
                hora_fin: reservaData.hora_fin.length === 5 ? reservaData.hora_fin + ':00' : reservaData.hora_fin
            };

            const response = await fetch('/api/turnos/reservar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            // console.log('Respuesta reserva:', data);

            if (!response.ok) {
                throw new Error(data.error || data.mensaje || data.message || 'Error al reservar turno');
            }

            // Éxito
            reservaSuccess.classList.remove('hidden');
            reservaSuccess.textContent = '¡Turno reservado y pago de Bs. 50.00 procesado exitosamente!';
            
            // Ocultar modal y mostrar toast temporal
            setTimeout(() => {
                closeReservaModal();
                AppHelper.showToast('¡Turno reservado y pago de Bs. 50.00 procesado exitosamente!', 'success');
                cargarMisTurnos();
            }, 1800);

        } catch (error) {
            // console.error('Reservation error:', error);
            reservaError.style.display = 'block';
            reservaError.textContent = error.message;
            submitReservaBtn.disabled = false;
        } finally {
            submitReservaBtn.classList.remove('loading');
        }
    });

    // --- Lógica de Mis Turnos --- //
    const misTurnosLoading = document.getElementById('misTurnosLoading');
    const misTurnosEmpty = document.getElementById('misTurnosEmpty');
    const misTurnosList = document.getElementById('misTurnosList');

    const cargarMisTurnos = async () => {
        misTurnosLoading.classList.remove('hidden');
        misTurnosEmpty.classList.add('hidden');
        misTurnosList.classList.add('hidden');
        misTurnosList.innerHTML = '';

        try {
            const response = await fetch('/api/turnos/mis-turnos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sesion.token}`
                }
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Error al obtener tus turnos');
            
            const turnos = data.turnos || [];
            misTurnosLoading.classList.add('hidden');
            
            if (turnos.length === 0) {
                misTurnosEmpty.classList.remove('hidden');
                return;
            }
            
            turnos.sort((a, b) => {
                const getPriority = t => ['reservado', 'activo', 'confirmado'].includes(t.estado.toLowerCase()) ? 0 : 1;
                const getEstadoPriority = (estado) => {
                    const e = estado.toLowerCase();
                    if (e === 'reservado' || e === 'confirmado' || e === 'activo') return 1;
                    if (e === 'atendido' || e === 'realizado') return 2;
                    if (e === 'cancelado') return 3;
                    return 2;
                };
                const pA = getEstadoPriority(a.estado);
                const pB = getEstadoPriority(b.estado);
                if (pA !== pB) return pA - pB;
                // Si tienen la misma prioridad, ordenar por fecha descendente (más reciente primero)
                return new Date(b.fecha_reserva + 'T' + b.hora_inicio) - new Date(a.fecha_reserva + 'T' + a.hora_inicio);
            });

            turnos.forEach(turno => {
                const medicoLocalName = turno.medico ? turno.medico.nombre : 'Médico Desconocido';
                const initialString = medicoLocalName.charAt(0).toUpperCase();
                const photoPath = AppHelper.obtenerImagenUsuario(turno.medico);
                const avatarLocalHTML = photoPath 
                    ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">` 
                    : initialString;
                
                const esCancelado = turno.estado.toLowerCase() === 'cancelado';
                const opacity = esCancelado ? '0.6' : '1';
                const textDecoration = esCancelado ? 'line-through' : 'none';

                const especialidad = (turno.medico && turno.medico.especialidad) ? turno.medico.especialidad : 'Especialidad no definida';

                const card = document.createElement('div');
                card.className = 'medico-card';
                card.id = `turno-card-${turno.id}`; // Para redirigir luego
                card.style.opacity = opacity;
                if (esCancelado) {
                    card.style.background = 'var(--bg-color)';
                }
                
                card.innerHTML = `
                    <div class="medico-header">
                        <div class="medico-avatar" style="${esCancelado ? 'filter: grayscale(1);' : ''}">${avatarLocalHTML}</div>
                        <div class="medico-info">
                            <h3 style="text-decoration: ${textDecoration}">Dr/a. ${medicoLocalName}</h3>
                            <p style="text-decoration: ${textDecoration}; font-size: 0.8rem; color: var(--primary); margin: 0;">${especialidad}</p>
                            <p style="text-decoration: ${textDecoration}; margin-top: 0.25rem;">${turno.fecha_reserva}</p>
                        </div>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem; margin-top: 0.5rem; text-decoration: ${textDecoration}">
                        Horario: <strong style="color: var(--text-main); font-weight: 600">${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}</strong>
                    </p>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <span class="badge badge-${turno.estado.toLowerCase()}" style="margin-right: auto;">${turno.estado.toUpperCase()}</span>
                        ${!esCancelado ? ((turno.pago && turno.pago.estado === 'pagado') ? `<span class="badge badge-confirmado" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">PAGADO</span>` : `<span class="badge badge-pendiente" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">PAGO PENDIENTE</span>`) : ''}
                        ${(!esCancelado && turno.estado.toLowerCase() === 'reservado') ? `<button class="btn btn-primary btn-sm btn-sala" data-id="${turno.id}" data-medico="${medicoLocalName}" data-fecha="${turno.fecha_reserva}" data-hora="${turno.hora_inicio.slice(0,5)}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Sala Virtual</button>` : ''}
                        ${(!esCancelado && ['reservado', 'activo'].includes(turno.estado.toLowerCase())) ? `<button class="btn btn-secondary btn-sm btn-chat" data-id="${turno.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Triaje</button>` : ''}
                        ${(!esCancelado && turno.notaClinica) ? `<button class="btn btn-secondary btn-sm btn-ver-nota" data-nota='${JSON.stringify(turno.notaClinica).replace(/'/g, "&apos;")}' style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ver Nota</button>` : ''}
                        ${(!esCancelado && turno.receta) ? `<button class="btn btn-secondary btn-sm btn-ver-receta" data-receta='${JSON.stringify(turno.receta).replace(/'/g, "&apos;")}' style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ver Receta</button>` : ''}
                        ${!esCancelado ? `
                        <button class="btn btn-secondary btn-cancelar" data-id="${turno.id}" style="padding: 0.25rem 0.5rem; color: var(--error); border-color: rgba(222, 53, 11, 0.4); font-size: 0.75rem;">
                            Cancelar
                        </button>` : ''}
                    </div>
                `;
                misTurnosList.appendChild(card);
            });
            
            misTurnosList.classList.remove('hidden');

            document.querySelectorAll('.btn-cancelar').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const turnoId = e.target.getAttribute('data-id');
                    AppHelper.showConfirm("Cancelar Turno", "¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.", () => {
                        cancelarTurno(turnoId, e.target);
                    });
                });
            });

            // Handlers for Nota and Receta modals
            const modalDetalleClinico = document.getElementById('modalDetalleClinico');
            const detalleClinicoTitle = document.getElementById('detalleClinicoTitle');
            const detalleClinicoContent = document.getElementById('detalleClinicoContent');
            const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
            const btnAceptarDetalle = document.getElementById('btnAceptarDetalle');

            const closeModal = () => modalDetalleClinico.classList.add('hidden');
            if (btnCerrarDetalle) btnCerrarDetalle.addEventListener('click', closeModal);
            if (btnAceptarDetalle) btnAceptarDetalle.addEventListener('click', closeModal);

            document.querySelectorAll('.btn-ver-nota').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const notaStr = e.target.getAttribute('data-nota');
                    if (notaStr) {
                        try {
                            const nota = JSON.parse(notaStr);
                            detalleClinicoTitle.textContent = 'Detalle de Nota Clínica';
                            detalleClinicoContent.innerHTML = `
                                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.25rem; font-weight: 600;">Fecha de Emisión</div>
                                        <div style="font-size: 0.95rem; color: #0f172a; font-weight: 500;">${new Date(nota.fecha).toLocaleString()}</div>
                                    </div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Diagnóstico</div>
                                        <div style="font-size: 0.95rem; color: #334155; line-height: 1.5;">${nota.diagnostico}</div>
                                    </div>
                                    ${nota.observaciones ? `
                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Observaciones</div>
                                            <div style="font-size: 0.95rem; color: #334155; line-height: 1.5;">${nota.observaciones}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                            modalDetalleClinico.classList.remove('hidden');
                        } catch(ex) {}
                    }
                });
            });

            document.querySelectorAll('.btn-ver-receta').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const recetaStr = e.target.getAttribute('data-receta');
                    if (recetaStr) {
                        try {
                            const receta = JSON.parse(recetaStr);
                            detalleClinicoTitle.textContent = 'Detalle de Receta Médica';
                            detalleClinicoContent.innerHTML = `
                                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.25rem; font-weight: 600;">Fecha de Emisión</div>
                                        <div style="font-size: 0.95rem; color: #0f172a; font-weight: 500;">${new Date(receta.fecha).toLocaleString()}</div>
                                    </div>
                                    ${receta.descripcion ? `
                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Motivo</div>
                                            <div style="font-size: 0.95rem; color: #334155; line-height: 1.5;">${receta.descripcion}</div>
                                        </div>
                                    ` : ''}
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Indicaciones / Medicamentos</div>
                                        <div style="font-size: 0.95rem; color: #334155; line-height: 1.5; white-space: pre-line;">${receta.medicamentos}</div>
                                    </div>
                                </div>
                            `;
                            modalDetalleClinico.classList.remove('hidden');
                        } catch(ex) {}
                    }
                });
            });

            // Handlers for Sala Virtual and Chat
            document.querySelectorAll('.btn-sala').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const medico = e.currentTarget.dataset.medico;
                    const fecha = e.currentTarget.dataset.fecha;
                    const hora = e.currentTarget.dataset.hora;
                    
                    document.getElementById('salaInfo').textContent = `Con Dr/a. ${medico} | ${fecha} a las ${hora}`;
                    document.getElementById('modalSalaVirtual').classList.remove('hidden');

                    // Almacenamos el ID en el botón de finalizar
                    document.getElementById('btnFinalizarLlamada').dataset.id = id;
                });
            });

            document.querySelectorAll('.btn-chat').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const turnoId = e.currentTarget.dataset.id;
                    abrirModalChat(turnoId);
                });
            });
        } catch (error) {
            misTurnosLoading.classList.add('hidden');
            AppHelper.showToast(error.message, 'error');
        }
    };

    const cancelarTurno = async (turnoId, btnElement) => {
        btnElement.disabled = true;
        btnElement.textContent = 'Cancelando...';
        try {
            const response = await fetch(`/api/turnos/cancelar/${turnoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cancelar turno');
            
            AppHelper.showToast('Turno cancelado correctamente', 'success');
            setTimeout(() => { cargarMisTurnos(); }, 500);
        } catch (error) {
            AppHelper.showToast(error.message, 'error');
            btnElement.disabled = false;
            btnElement.textContent = 'Cancelar Turno';
        }
    };

    // --- Lógica de Historial Clínico --- //
    const historialLoading = document.getElementById('historialLoading');
    const historialEmpty = document.getElementById('historialEmpty');
    const historialList = document.getElementById('historialList');

    const cargarHistorial = async () => {
        historialLoading.classList.remove('hidden');
        historialEmpty.classList.add('hidden');
        historialList.innerHTML = '';

        try {
            const response = await fetch('/api/paciente/historial', {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const data = await response.json();
            
            historialLoading.classList.add('hidden');
            if (!response.ok) throw new Error(data.error || 'Error al obtener historial');

            const items = [];
            
            // Unificar todos los items y ordenarlos por fecha descendente
            if (data.turnos) {
                data.turnos.forEach(t => items.push({ type: 'turno', date: new Date(t.fecha_reserva + 'T' + t.hora_inicio), data: t }));
            }
            if (data.notas) {
                data.notas.forEach(n => items.push({ type: 'nota', date: new Date(n.createdAt), data: n }));
            }
            if (data.recetas) {
                data.recetas.forEach(r => items.push({ type: 'receta', date: new Date(r.createdAt), data: r }));
            }

            if (items.length === 0) {
                historialEmpty.classList.remove('hidden');
                return;
            }

            // Ordenar por fecha (desc)
            items.sort((a, b) => b.date - a.date);

            items.forEach(item => {
                const el = document.createElement('div');
                el.style.border = '1px solid var(--border)';
                el.style.padding = '1rem';
                el.style.borderRadius = 'var(--radius-md)';
                el.style.background = 'white';

                const fechaStr = item.date.toLocaleString();

                if (item.type === 'turno') {
                    el.innerHTML = `
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${fechaStr} - <strong>Consulta Programada/Realizada</strong></div>
                        <p style="margin: 0;">Médico: Dr/a. ${item.data.medico ? item.data.medico.nombre : 'N/A'} <span style="font-size:0.8rem; color:var(--text-muted);">(${item.data.medico ? item.data.medico.especialidad : ''})</span></p>
                        <p style="margin: 0; font-size: 0.9rem; margin-top:0.25rem;">Estado: <span class="badge badge-${item.data.estado.toLowerCase()}">${item.data.estado}</span></p>
                    `;
                } else if (item.type === 'nota') {
                    el.innerHTML = `
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${fechaStr} - <strong>Nota Clínica</strong></div>
                        <p style="margin: 0;">Médico: Dr/a. ${item.data.medico ? item.data.medico.nombre : 'N/A'}</p>
                        <p style="margin: 0; font-size: 0.9rem; margin-top:0.25rem;"><strong>Diagnóstico:</strong> ${item.data.diagnostico}</p>
                        ${item.data.observaciones ? `<p style="margin: 0; font-size: 0.9rem;"><strong>Obs:</strong> ${item.data.observaciones}</p>` : ''}
                    `;
                } else if (item.type === 'receta') {
                    el.innerHTML = `
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${fechaStr} - <strong>Receta Médica</strong></div>
                        <p style="margin: 0;">Médico: Dr/a. ${item.data.medico ? item.data.medico.nombre : 'N/A'}</p>
                        ${item.data.descripcion ? `<p style="margin: 0; font-size: 0.9rem; margin-top:0.25rem;"><strong>Motivo:</strong> ${item.data.descripcion}</p>` : ''}
                        <div style="margin-top:0.5rem; padding:0.5rem; background:#f8fafc; border-radius:var(--radius-sm);">
                            <p style="margin: 0; font-size: 0.9rem;"><strong>Indicaciones:</strong><br>${item.data.medicamentos.replace(/\n/g, '<br>')}</p>
                        </div>
                    `;
                }
                historialList.appendChild(el);
            });
        } catch (error) {
            historialLoading.classList.add('hidden');
            console.error(error);
        }
    };

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

            // Click para marcar como leída e ir al historial
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
                    
                    // Hacer scroll suave hacia Mis Turnos
                    const turnosSection = document.getElementById('misTurnosList')?.parentElement;
                    if (turnosSection) {
                        turnosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        turnosSection.style.transition = 'background-color 0.5s';
                        turnosSection.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        setTimeout(() => {
                            turnosSection.style.backgroundColor = 'transparent';
                        }, 2000);
                    }
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

    btnCerrarSala.addEventListener('click', closeModalSala);
    
    // Al finalizar la llamada, opcionalmente el paciente podría no hacer nada, 
    // pero si hace clic, simplemente cerramos la sala. 
    // La acción real de cambiar el turno a 'Realizado' la hará el médico.
    btnFinalizarLlamada.addEventListener('click', closeModalSala);

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
                chatMessages.innerHTML = '<div class="text-center" style="color:var(--text-muted); margin-top:2rem; font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 0.5rem 1rem; border-radius: 1rem; align-self: center;">No hay mensajes. ¡Escribe el motivo de tu consulta!</div>';
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

    // --- Módulo Alerta de Emergencia (TM-U05) --- //
    const btnAlertaEmergencia = document.getElementById('btnAlertaEmergencia');
    const modalAlerta = document.getElementById('modalAlerta');
    const btnCerrarAlerta = document.getElementById('btnCerrarAlerta');
    const btnCancelarAlerta = document.getElementById('btnCancelarAlerta');
    const formAlerta = document.getElementById('formAlerta');
    const btnEnviarAlerta = document.getElementById('btnEnviarAlerta');

    const cerrarModalAlerta = () => {
        modalAlerta.classList.add('hidden');
        formAlerta.reset();
    };

    if (btnAlertaEmergencia) btnAlertaEmergencia.addEventListener('click', () => modalAlerta.classList.remove('hidden'));
    if (btnCerrarAlerta) btnCerrarAlerta.addEventListener('click', cerrarModalAlerta);
    if (btnCancelarAlerta) btnCancelarAlerta.addEventListener('click', cerrarModalAlerta);

    if (formAlerta) {
        formAlerta.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnEnviarAlerta.disabled = true;
            btnEnviarAlerta.textContent = 'Enviando...';

            const motivo = document.getElementById('alertaMotivo').value;
            const nivel = document.getElementById('alertaNivel').value;

            try {
                const response = await fetch('/api/alertas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sesion.token}`
                    },
                    body: JSON.stringify({ motivo, nivel })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                AppHelper.showToast('Alerta enviada a los profesionales.', 'success');
                cerrarModalAlerta();
            } catch (error) {
                AppHelper.showAlert('Error', error.message || 'No se pudo enviar la alerta');
            } finally {
                btnEnviarAlerta.disabled = false;
                btnEnviarAlerta.textContent = 'Enviar Alerta';
            }
        });
    }

    // --- Lógica del Widget Flotante de Recepción (Paciente) ---
    const btnFloatingReception = document.getElementById('btnFloatingReception');
    const receptionPanel = document.getElementById('receptionPanel');
    const btnMinimizeReception = document.getElementById('btnMinimizeReception');
    
    const receptionNoAppointmentView = document.getElementById('receptionNoAppointmentView');
    const receptionChatActiveView = document.getElementById('receptionChatActiveView');
    const receptionChatMessages = document.getElementById('receptionChatMessages');
    const frmReceptionChatSend = document.getElementById('frmReceptionChatSend');
    const hdnReceptionTurnoId = document.getElementById('hdnReceptionTurnoId');
    const txtReceptionChatMsg = document.getElementById('txtReceptionChatMsg');

    let isReceptionPanelOpen = false;
    let receptionChatInterval = null;

    if (btnFloatingReception) {
        btnFloatingReception.addEventListener('click', () => {
            isReceptionPanelOpen = !isReceptionPanelOpen;
            if (isReceptionPanelOpen) {
                receptionPanel.classList.remove('hidden');
                fetchActiveTurnoForSupport();
            } else {
                cerrarPanelReception();
            }
        });
    }

    if (btnMinimizeReception) {
        btnMinimizeReception.addEventListener('click', (e) => {
            e.stopPropagation();
            cerrarPanelReception();
        });
    }

    const cerrarPanelReception = () => {
        isReceptionPanelOpen = false;
        if (receptionPanel) receptionPanel.classList.add('hidden');
        detenerReceptionChatInterval();
    };

    const detenerReceptionChatInterval = () => {
        if (receptionChatInterval) {
            clearInterval(receptionChatInterval);
            receptionChatInterval = null;
        }
    };

    const fetchActiveTurnoForSupport = async () => {
        try {
            const res = await fetch('/api/turnos/mis-turnos', {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.turnos)) {
                // Encontrar el turno activo más próximo del paciente (Reservado, Confirmado)
                const activeTurno = data.turnos.find(t => ['reservado', 'confirmado', 'activo'].includes(t.estado.toLowerCase()));
                
                if (activeTurno) {
                    hdnReceptionTurnoId.value = activeTurno.id;
                    receptionNoAppointmentView.classList.add('hidden');
                    receptionChatActiveView.classList.remove('hidden');
                    cargarMensajesSoporteRecepcion(activeTurno.id);
                    
                    // Polling cada 5 segundos
                    detenerReceptionChatInterval();
                    receptionChatInterval = setInterval(() => {
                        cargarMensajesSoporteRecepcion(activeTurno.id, true);
                    }, 5000);
                } else {
                    hdnReceptionTurnoId.value = '';
                    receptionNoAppointmentView.classList.remove('hidden');
                    receptionChatActiveView.classList.add('hidden');
                    detenerReceptionChatInterval();
                }
            }
        } catch (err) {
            console.error('Error al detectar turno para soporte:', err);
        }
    };

    const cargarMensajesSoporteRecepcion = async (turnoId, isSilent = false) => {
        try {
            const res = await fetch(`/api/chat/${turnoId}?tipo=recepcion`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const mensajes = data.mensajes || [];
            
            const messagesHTML = mensajes.map(m => {
                const esMio = m.emisorId === sesion.usuario.id;
                const alignment = esMio 
                    ? 'align-self: flex-end; background: #3b82f6; color: white;' 
                    : 'align-self: flex-start; background: #e2e8f0; color: var(--text-main);';
                const senderName = esMio ? 'Tú' : 'Recepcionista';
                const timeStr = new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <div style="${alignment} max-width: 80%; padding: 0.6rem 0.85rem; border-radius: 12px; font-size: 0.825rem; display: flex; flex-direction: column; gap: 0.15rem; box-shadow: var(--shadow-sm); margin-bottom: 0.5rem;">
                        ${!esMio ? `<span style="font-size: 0.7rem; font-weight: 700; color: #475569; margin-bottom: 0.15rem;">${senderName}</span>` : ''}
                        <span style="line-height: 1.4; word-break: break-word;">${m.mensaje}</span>
                        <span style="font-size: 0.6rem; align-self: flex-end; opacity: 0.8; margin-top: 0.15rem;">${timeStr}</span>
                    </div>
                `;
            }).join('');

            if (receptionChatMessages) {
                receptionChatMessages.innerHTML = mensajes.length === 0 
                    ? '<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.8rem;">No hay mensajes. Envía una consulta para iniciar soporte.</div>'
                    : messagesHTML;
                receptionChatMessages.scrollTo({ top: receptionChatMessages.scrollHeight, behavior: isSilent ? 'auto' : 'smooth' });
            }

        } catch (err) {
            if (!isSilent && receptionChatMessages) {
                receptionChatMessages.innerHTML = '<div style="color:var(--error); text-align:center; padding:1rem;">Error al cargar chat de soporte.</div>';
            }
        }
    };

    if (frmReceptionChatSend) {
        frmReceptionChatSend.addEventListener('submit', async (e) => {
            e.preventDefault();
            const turnoId = hdnReceptionTurnoId.value;
            const mensaje = txtReceptionChatMsg.value.trim();
            if (!mensaje || !turnoId) return;

            const btnSubmit = frmReceptionChatSend.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sesion.token}`
                    },
                    body: JSON.stringify({ turnoId, mensaje, tipo: 'recepcion' })
                });

                if (res.ok) {
                    txtReceptionChatMsg.value = '';
                    await cargarMensajesSoporteRecepcion(turnoId);
                } else {
                    const data = await res.json();
                    AppHelper.showToast(data.error || 'Error al enviar mensaje', 'error');
                }
            } catch (err) {
                AppHelper.showToast('Fallo de red al enviar', 'error');
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    // Cargar la lista completa de médicos y turnos al entrar al portal
    cargarEspecialidades();
    buscarMedicos('', '');
    cargarMisTurnos();
    cargarHistorial();
    cargarNotificaciones();
    
    // Polling de notificaciones cada 30 segundos
    setInterval(cargarNotificaciones, 30000);
});
