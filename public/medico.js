document.addEventListener('DOMContentLoaded', () => {
    // Validar que el usuario sea medico y tenga token
    const sesion = AppHelper.validarSesion('medico');
    if (!sesion) return; // Ya redirigió si falla

    AppHelper.bindLogoutButton();
    const token = sesion.token;

    const turnosLoading = document.getElementById('turnosLoading');
    const turnosEmpty = document.getElementById('turnosEmpty');
    const turnosList = document.getElementById('turnosList');

    const cargarTurnosMedico = async () => {
        turnosLoading.classList.remove('hidden');
        turnosEmpty.classList.add('hidden');
        turnosList.classList.add('hidden');
        turnosList.innerHTML = '';

        try {
            const response = await fetch('/api/turnos/medico', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sesion.token}`
                }
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al obtener tus turnos asignados');
            
            const turnos = data.turnos || [];
            turnosLoading.classList.add('hidden');
            
            if (turnos.length === 0) {
                turnosEmpty.classList.remove('hidden');
                return;
            }
            
            turnos.forEach(turno => {
                const pacienteName = turno.paciente ? turno.paciente.nombre : 'Paciente Desconocido';
                const initialString = pacienteName.charAt(0).toUpperCase();
                const photoPath = (turno.paciente && turno.paciente.foto) ? (turno.paciente.foto.startsWith('/') ? turno.paciente.foto : `/uploads/${turno.paciente.foto}`) : '';
                const avatarPxHTML = photoPath
                    ? `<img src="${photoPath}" alt="" onerror="this.onerror=null; this.parentElement.innerHTML='${initialString}';">`
                    : initialString;
                
                // Color adaptado al estado
                const estadoClase = `status-${turno.estado.toLowerCase()}`;
                
                const card = document.createElement('div');
                card.className = 'medico-card';
                card.innerHTML = `
                    <div class="medico-header">
                        <div class="medico-avatar" style="background-color: #fce7f3; color: #be185d;">${avatarPxHTML}</div>
                        <div class="medico-info">
                            <h3>${pacienteName}</h3>
                            <p>${turno.paciente ? turno.paciente.email : ''}</p>
                        </div>
                    </div>
                    <div style="margin: 0.5rem 0 1rem 0;">
                        <p style="font-size: 0.875rem; color: var(--text-main); margin-bottom: 0.5rem;">
                            Fecha: <strong>${turno.fecha_reserva}</strong>
                        </p>
                        <p style="font-size: 0.875rem; color: var(--text-muted);">
                            Horario: <strong style="color: var(--text-main); font-weight: 600">${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}</strong>
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <span class="badge badge-${turno.estado.toLowerCase()}">${turno.estado}</span>
                    </div>
                `;
                turnosList.appendChild(card);
            });
            
            turnosList.classList.remove('hidden');
            
        } catch (error) {
            turnosLoading.classList.add('hidden');
            AppHelper.showAlert('Error', error.message);
        }
    };

    // ============================================
    // MÓDULO TM-U01: DISPONIBILIDAD
    // ============================================
    const formDisp = document.getElementById('formDisponibilidad');
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
                            <td>
                                <button class="btn btn-secondary btn-sm btn-delete-disp" data-id="${item.id}" style="color:var(--error); border-color: rgba(222, 53, 11, 0.3); padding: 0.3rem 0.6rem;">
                                    <svg pointer-events="none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        `;
                        dispList.appendChild(tr);
                    });
                    dispTable.style.display = 'table';
                    
                    document.querySelectorAll('.btn-delete-disp').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.target.dataset.id;
                            AppHelper.showConfirm('Confirmar Borrado', '¿Seguro que deseas eliminar este rango horario?', async () => {
                                try {
                                    const delRes = await fetch(`/api/disponibilidad/${id}`, {
                                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if(delRes.ok) { AppHelper.showToast('Horario eliminado'); cargarDisponibilidades(); }
                                    else { const delData=await delRes.json(); AppHelper.showAlert('Error', delData.error||'Error al borrar'); }
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
    };

    formDisp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dia = document.getElementById('dispDia').value;
        const inicio = document.getElementById('dispHoraInicio').value;
        const fin = document.getElementById('dispHoraFin').value;

        if (inicio >= fin) {
            AppHelper.showAlert('Error de Horario', 'La hora de inicio debe ser estrictamente anterior a la hora de fin.');
            return;
        }

        try {
            const res = await fetch('/api/disponibilidad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin })
            });
            const data = await res.json();
            
            if(res.ok) {
                AppHelper.showToast('Horario asignado exitosamente');
                formDisp.reset();
                cargarDisponibilidades();
            } else {
                AppHelper.showAlert('No se pudo guardar', data.error || 'Solapamiento o error de servidor.');
            }
        } catch(error) {
            AppHelper.showAlert('Fallo de Red', 'Imposible conectar con el servidor.');
        }
    });

    cargarTurnosMedico();
    cargarDisponibilidades();
});
