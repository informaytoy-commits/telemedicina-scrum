document.addEventListener('DOMContentLoaded', () => {
    // Validar que el usuario sea paciente y tenga token
    const sesion = AppHelper.validarSesion('paciente');
    if (!sesion) return; // Si no hay sesión, AppHelper ya redirigió al login

    // Asignar el botón de logout
    AppHelper.bindLogoutButton();

    // Referencias del DOM
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    // Contenedores de estados
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorText = document.getElementById('errorText');
    const emptyState = document.getElementById('emptyState');
    const medicosList = document.getElementById('medicosList');

    const buscarMedicos = async (nombreQuery = '') => {
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
            const photoPath = medico.foto ? (medico.foto.startsWith('/') ? medico.foto : `/uploads/${medico.foto}`) : '';
            const avatarHTML = photoPath 
                ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">` 
                : initialString;
            
            // Especialidad
            const especialidadText = medico.especialidad || 'Especialidad General';

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
        buscarMedicos(searchQuery);
    });

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
    const inicioContainer = document.getElementById('inicioContainer');
    const finContainer = document.getElementById('finContainer');
    const finGroup = document.getElementById('finGroup');
    
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

    // Función que devuelve bloques de 30 mins
    const generarBloquesHorarios = (inicio, fin) => {
        const minToDate = (timeStr) => {
            const [h, m] = timeStr.split(':');
            let d = new Date(); d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            return d;
        };
        const bloques = [];
        let current = minToDate(inicio);
        const end = minToDate(fin);

        while (current < end) {
            let next = new Date(current.getTime() + 30 * 60000);
            if (next > end) next = end;
            const formatT = (date) => date.toTimeString().slice(0, 5);
            bloques.push({ start: formatT(current), end: formatT(next) });
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
        inicioContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Selecciona una fecha para ver los horarios.</span>';
        finContainer.innerHTML = '';
        finGroup.style.display = 'none';

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
        
        inicioContainer.innerHTML = '';
        finContainer.innerHTML = '';
        finGroup.style.display = 'none';
        
        const fechaElegida = e.target.value;
        horaInicio.value = '';
        horaFin.value = '';

        if (!fechaElegida) {
            inicioContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Selecciona una fecha para ver los horarios válidos.</span>';
            submitReservaBtn.disabled = true;
            return;
        }

        if (currentMedicoDispos.length === 0) {
            inicioContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Sin disponibilidad configurada.</span>';
            reservaError.textContent = "Este médico aún no definió horarios de atención.";
            reservaError.style.display = 'block';
            submitReservaBtn.disabled = true;
            return;
        }

        const diaElegido = obtenerDiaSemana(fechaElegida);
        const disposDelDia = currentMedicoDispos.filter(d => d.dia_semana === diaElegido);

        if (disposDelDia.length === 0) {
            inicioContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Este médico no atiende ese día.</span>';
            reservaError.textContent = `✅ Selecciona una fecha válida según la disponibilidad del médico. (No atiende los ${diaElegido}s)`;
            reservaError.style.display = 'block';
            submitReservaBtn.disabled = true;
        } else {
            reservaError.style.display = 'none';
            submitReservaBtn.disabled = true; 

            // Turnos ocupados para este dia
            const turnosOcupados = currentMedicoTurnos.filter(t => t.fecha_reserva === fechaElegida);

            let hasValidInicio = false;

            disposDelDia.forEach(dispo => {
                 const bloques = generarBloquesHorarios(dispo.hora_inicio, dispo.hora_fin);
                 
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
                     // Check collision for the start time
                     // Es inválido si la hora de inicio solicitada cae estrictamente dentro de un turno ocupado (inicio <= bloqueStart < fin)
                     const chocando = turnosOcupados.some(t => {
                         const start = t.hora_inicio.slice(0,5);
                         const end = t.hora_fin.slice(0,5);
                         return (b.start >= start && b.start < end);
                     });

                     if (!chocando) {
                         hasValidInicio = true;
                         validBtnsInThisBlock = true;
                         const btn = document.createElement('button');
                         btn.type = 'button';
                         btn.className = 'time-slot-btn';
                         btn.textContent = b.start;
                         btn.dataset.start = b.start;
                         btn.dataset.blockStart = dispo.hora_inicio.slice(0,5);
                         btn.dataset.blockEnd = dispo.hora_fin.slice(0,5);
                         
                         btn.addEventListener('click', () => {
                             // Limpiar cualquier mensaje de error apenas la selección vuelva a ser válida (cambio de inicio)
                             reservaError.style.display = 'none';

                             document.querySelectorAll('#inicioContainer .time-slot-btn').forEach(bEl => bEl.classList.remove('active'));
                             btn.classList.add('active');
                             horaInicio.value = btn.dataset.start;
                             horaFin.value = '';
                             
                             // Guardar los límites del bloque estructurado internamente en campos ocultos o dataset si fuera necesario
                             reservaForm.dataset.blockStart = btn.dataset.blockStart;
                             reservaForm.dataset.blockEnd = btn.dataset.blockEnd;

                             submitReservaBtn.disabled = true;
                             
                             // Dibujar fin container confinado estrictamente a ESTE bloque dispo específico
                             renderizarOpcionesFin(btn.dataset.start, dispo.hora_fin, turnosOcupados, bloques);
                         });

                         btnContainerWrapper.appendChild(btn);
                     }
                 });
                 
                 if (validBtnsInThisBlock) {
                     blockGroup.appendChild(blockTitle);
                     blockGroup.appendChild(btnContainerWrapper);
                     inicioContainer.appendChild(blockGroup);
                 }
            });
            
            if (!hasValidInicio) {
                 inicioContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No hay horarios libres para esta fecha.</span>';
            }
        }
    });

    const renderizarOpcionesFin = (startSeleccionado, maxFinDispo, turnosOcupados, masterBloques) => {
        finContainer.innerHTML = '';
        finGroup.style.display = 'block';
        
        let maxPosible = maxFinDispo.slice(0,5);
        // Look for the absolute nearest upcoming turn to cut the max possible duration
        // Encuentra el primer comienzo ocupado que caiga DESPUES del start seleccionado.
        const turnosFuturos = turnosOcupados.filter(t => t.hora_inicio.slice(0,5) > startSeleccionado).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));
        if(turnosFuturos.length > 0) {
            maxPosible = turnosFuturos[0].hora_inicio.slice(0,5);
        }

        let hasValidFin = false;
        
        // El fin debe ser estrictamente mayor a startSeleccionado y menor o igual al maxPosible
        masterBloques.forEach(b => {
            if (b.end > startSeleccionado && b.end <= maxPosible) {
                hasValidFin = true;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'time-slot-btn';
                btn.textContent = b.end;
                
                btn.addEventListener('click', () => {
                    // Limpiar errores residuales
                    reservaError.style.display = 'none';

                    document.querySelectorAll('#finContainer .time-slot-btn').forEach(bEl => bEl.classList.remove('active'));
                    btn.classList.add('active');
                    horaFin.value = b.end;
                    submitReservaBtn.disabled = false;
                });
                
                finContainer.appendChild(btn);
            }
        });

        if (!hasValidFin) {
            finContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--error);">Rango inexplorable.</span>';
        }
    };

    // Funciones para cerrar modal
    const closeReservaModal = () => {
        reservaModal.classList.add('hidden');
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
            reservaSuccess.textContent = data.mensaje || data.message || '¡Turno reservado exitosamente!';
            
            // Ocultar modal y mostrar toast temporal
            setTimeout(() => {
                closeReservaModal();
                AppHelper.showToast('¡Reserva confirmada con éxito!', 'success');
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
            
            turnos.forEach(turno => {
                const medicoLocalName = turno.medico ? turno.medico.nombre : 'Desconocido';
                const initialString = medicoLocalName.charAt(0).toUpperCase();
                const photoPath = (turno.medico && turno.medico.foto) ? (turno.medico.foto.startsWith('/') ? turno.medico.foto : `/uploads/${turno.medico.foto}`) : '';
                const avatarLocalHTML = photoPath 
                    ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">` 
                    : initialString;
                
                const estadoClase = `status-${turno.estado.toLowerCase()}`;
                const esCancelado = turno.estado === 'Cancelado';

                const card = document.createElement('div');
                card.className = 'medico-card';
                card.innerHTML = `
                    <div class="medico-header">
                        <div class="medico-avatar">${avatarLocalHTML}</div>
                        <div class="medico-info">
                            <h3>Dr/a. ${medicoLocalName}</h3>
                            <p>${turno.fecha_reserva}</p>
                        </div>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem; margin-top: 0.5rem">
                        Horario: <strong style="color: var(--text-main); font-weight: 600">${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}</strong>
                    </p>
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <span class="badge badge-${turno.estado.toLowerCase()}">${turno.estado}</span>
                        ${!esCancelado ? `
                        <button class="btn btn-secondary btn-cancelar" data-id="${turno.id}" style="padding: 0.35rem 0.75rem; color: var(--error); border-color: rgba(222, 53, 11, 0.4); font-size: 0.8rem; height: max-content;">
                            Cancelar Turno
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

    // Cargar la lista completa de médicos y turnos al entrar al portal
    buscarMedicos('');
    cargarMisTurnos();
});
