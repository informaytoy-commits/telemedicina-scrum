const { Turno, Disponibilidad, User, AuditLog, Notificacion, NotaClinica, Receta, Pago } = require('../models');
const { Op } = require('sequelize');
const { cancelarTurnosVencidos } = require('../utils/autoCancel');

// Función auxiliar para obtener el nombre del día a partir de una fecha ISO string, adaptado a los ENUM
const obtenerDiaSemana = (fechaStr) => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  // Parseo manual para evadir problemas de zona horaria / UTC automáticos
  const [year, month, day] = fechaStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return dias[date.getDay()];
};

exports.reservarTurno = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    // Solo permitimos roles "paciente" (redundante con autorizador de rutas pero pedido en requerimiento)
    if (req.user.rol !== 'paciente') {
      return res.status(403).json({ error: 'Solo los usuarios con rol paciente pueden realizar reservas.' });
    }

    const { medicoId, fecha_reserva } = req.body;
    let { hora_inicio, hora_fin } = req.body;

    if (!medicoId || !fecha_reserva || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios: medicoId, fecha_reserva, hora_inicio, hora_fin.' });
    }

    // Normalizar a formato HH:mm:ss si vienen como HH:mm
    if (hora_inicio.length === 5) hora_inicio += ':00';
    if (hora_fin.length === 5) hora_fin += ':00';

    // Validar existencia del médico
    const medico = await User.findOne({ where: { id: medicoId, rol: 'medico', estado: 'activo' } });
    if (!medico) {
      return res.status(404).json({ error: 'El médico solicitado no existe o no se encuentra activo.' });
    }

    const dia_semana = obtenerDiaSemana(fecha_reserva);
    
    // Depuración requerida para timezone y guardado
    console.log(`\n[DEBUG-RESERVA] fecha_reserva recibida: ${fecha_reserva}`);
    console.log(`[DEBUG-RESERVA] Día local calculado: ${dia_semana}`);

    // Validar que coincida con una disponibilidad real del médico
    const disponibilidades = await Disponibilidad.findAll({
      where: {
        userId: medicoId,
        dia_semana: dia_semana,
        estado: 'Disponible'
      }
    });

    // Helper analítico para conversiones
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Validar que el horario de reserva caiga dentro de algún bloque disponible de manera aritmética
    const disponibilidad = disponibilidades.find(
      (d) => toMin(hora_inicio) >= toMin(d.hora_inicio) && toMin(hora_fin) <= toMin(d.hora_fin)
    );

    console.log(`[DEBUG-RESERVA] medicoId recibido: ${medicoId}`);
    console.log(`[DEBUG-RESERVA] userId usado en consulta: ${medicoId}`);
    console.log(`[DEBUG-RESERVA] Disponibilidades para el día obtenidas de DB: ${disponibilidades.length}`);
    console.log(`[DEBUG-RESERVA] Disponibilidad encontrada (rango válido):`, disponibilidad ? 'SÍ' : 'NO COINCIDE (nula)');

    if (!disponibilidad) {
      return res.status(400).json({ error: 'El horario solicitado no coincide con los horarios disponibles del médico para ese día.' });
    }

    // No permitir reservar horarios ocupados (Solapamiento real)
    const existente = await Turno.findOne({
      where: {
        medicoId,
        fecha_reserva,
        estado: ['Reservado', 'Confirmado'],
        [Op.and]: [
          { hora_inicio: { [Op.lt]: hora_fin } },
          { hora_fin: { [Op.gt]: hora_inicio } }
        ]
      }
    });

    if (existente) {
      return res.status(400).json({ error: `Este horario choca con otro turno reservado (ej: de ${existente.hora_inicio.slice(0,5)} a ${existente.hora_fin.slice(0,5)}).` });
    }

    // Crear la reserva
    const nuevoTurno = await Turno.create({
      medicoId,
      pacienteId,
      dia_semana,
      hora_inicio,
      hora_fin,
      estado: 'Reservado',
      fecha_reserva
    });

    // Crear pago simulado
    try {
      await Pago.create({
        turnoId: nuevoTurno.id,
        pacienteId: pacienteId,
        medicoId: medicoId,
        monto: 50.00,
        estado: 'pagado',
        metodo: 'simulado'
      });
    } catch(err) {
      console.error('Error al crear pago simulado:', err);
    }

    // Notificar al médico
    try {
      await Notificacion.create({
        userId: medicoId,
        mensaje: `Nuevo turno reservado por ${req.user.nombre || 'un paciente'} para el día ${fecha_reserva} de ${hora_inicio.slice(0,5)} a ${hora_fin.slice(0,5)}.`
      });
    } catch(err) {
      console.error('Error al crear notificación de reserva:', err);
    }

    res.status(201).json({
      mensaje: 'Turno reservado y pago simulado procesado exitosamente',
      turno: nuevoTurno
    });

  } catch (error) {
    console.error('Error al reservar turno:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la reserva.' });
  }
};

exports.listarMisTurnosPaciente = async (req, res) => {
  try {
    await cancelarTurnosVencidos();
    const pacienteId = req.user.id;
    const turnos = await Turno.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['id', 'nombre', 'email', 'foto', 'especialidad'] },
        { model: NotaClinica, as: 'notaClinica' },
        { model: Receta, as: 'receta' },
        { model: Pago, as: 'pago', required: false }
      ],
      order: [['fecha_reserva', 'ASC'], ['hora_inicio', 'ASC']]
    });

    res.status(200).json({
      turnos
    });
  } catch (error) {
    console.error('Error al listar mis turnos:', error);
    res.status(500).json({ error: 'Error del servidor al obtener el listado.' });
  }
};

exports.listarTurnosMedico = async (req, res) => {
  try {
    await cancelarTurnosVencidos();
    const medicoId = req.user.id;
    const turnos = await Turno.findAll({
      where: { medicoId },
      include: [
        { model: User, as: 'paciente', attributes: ['id', 'nombre', 'email', 'foto'] }
      ],
      order: [['fecha_reserva', 'ASC'], ['hora_inicio', 'ASC']]
    });

    res.status(200).json({
      turnos
    });
  } catch (error) {
    console.error('Error al listar turnos asignados:', error);
    res.status(500).json({ error: 'Error del servidor al obtener el listado.' });
  }
};

exports.listarTurnosPorMedico = async (req, res) => {
  try {
    await cancelarTurnosVencidos();
    const { medicoId } = req.params;
    const turnos = await Turno.findAll({
      where: { medicoId },
      include: [
        { model: User, as: 'paciente', attributes: ['id', 'nombre', 'email', 'foto'] },
        { model: Pago, as: 'pago', required: false },
        { model: NotaClinica, as: 'notaClinica', required: false }
      ],
      order: [['fecha_reserva', 'ASC'], ['hora_inicio', 'ASC']]
    });

    res.status(200).json({
      turnos
    });
  } catch (error) {
    console.error('Error al listar turnos por médico:', error);
    res.status(500).json({ error: 'Error del servidor al obtener el listado.' });
  }
};

exports.cancelarTurno = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;

    const turno = await Turno.findByPk(id);

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    // Validar privacidad: que le pertenezca al médico o al paciente que solicita cancelar
    if (turno.pacienteId !== usuarioId && turno.medicoId !== usuarioId) {
      return res.status(403).json({ error: 'No está autorizado para cancelar este turno.' });
    }

    if (turno.estado === 'Cancelado') {
      return res.status(400).json({ error: 'El turno ya se encuentra cancelado.' });
    }

    turno.estado = 'Cancelado';
    await turno.save();

    try {
      await AuditLog.create({
        userId: req.user.id,
        nombre: req.user.nombre || 'Usuario',
        email: req.user.email,
        rol: req.user.rol,
        accion: 'Canceló Turno',
        detalle: `Turno ID ${id} cancelado`
      });
    } catch(err) {
      console.error('Advertencia: Log de cancelación falló', err.message);
    }

    // Notificar a la otra parte
    try {
      const targetUserId = req.user.rol === 'paciente' ? turno.medicoId : turno.pacienteId;
      const mensaje = req.user.rol === 'paciente' 
          ? `El paciente ${req.user.nombre || 'Desconocido'} canceló su turno del día ${turno.fecha_reserva}.` 
          : `El médico ${req.user.nombre || 'Desconocido'} canceló su turno del día ${turno.fecha_reserva}.`;
          
      await Notificacion.create({
        userId: targetUserId,
        mensaje
      });
    } catch(err) {
      console.error('Error al crear notificación de cancelación:', err);
    }

    res.status(200).json({
      mensaje: 'Turno cancelado exitosamente',
      turno
    });

  } catch (error) {
    console.error('Error al cancelar turno:', error);
    res.status(500).json({ error: 'Error interno del servidor al cancelar.' });
  }
};

// 5. Marcar turno como atendido
exports.atenderTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.rol;

    const turno = await Turno.findByPk(id);

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    if (userRole === 'medico' && turno.medicoId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este turno.' });
    }

    if (turno.estado.toLowerCase() === 'cancelado') {
      return res.status(400).json({ error: 'No se puede atender un turno cancelado.' });
    }

    if (!['reservado', 'confirmado', 'activo'].includes(turno.estado.toLowerCase())) {
      return res.status(400).json({ error: 'El turno no está en un estado válido para ser atendido.' });
    }

    turno.estado = 'Atendido';
    turno.consulta_iniciada = true;
    if (!turno.fecha_inicio_consulta) {
      turno.fecha_inicio_consulta = new Date();
    }
    await turno.save();

    res.status(200).json({
      mensaje: 'Turno marcado como atendido',
      turno
    });

  } catch (error) {
    console.error('Error al atender turno:', error);
    res.status(500).json({ error: 'Error interno del servidor al atender.' });
  }
};

// 6. Confirmar llegada del paciente (Recepcionista)
exports.confirmarLlegada = async (req, res) => {
  try {
    const { id } = req.params;
    const turno = await Turno.findByPk(id);

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    if (turno.estado.toLowerCase() === 'cancelado') {
      return res.status(400).json({ error: 'No se puede confirmar la llegada de un turno cancelado.' });
    }

    turno.estado = 'Confirmado';
    await turno.save();

    // Crear log de auditoría
    try {
      await AuditLog.create({
        userId: req.user.id,
        nombre: req.user.nombre || 'Recepcionista',
        email: req.user.email,
        rol: req.user.rol,
        accion: 'Confirmó Llegada',
        detalle: `Turno ID ${id} marcado como Confirmado`
      });
    } catch(err) {
      console.error('Log auditoría falló:', err.message);
    }

    res.status(200).json({
      mensaje: 'Llegada del paciente confirmada correctamente.',
      turno
    });

  } catch (error) {
    console.error('Error al confirmar llegada:', error);
    res.status(500).json({ error: 'Error del servidor al confirmar la llegada del paciente.' });
  }
};

// 7. Reprogramar Turno (Recepcionista)
exports.reprogramarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_reserva, hora_inicio, hora_fin } = req.body;

    if (!fecha_reserva || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios: fecha_reserva, hora_inicio, hora_fin.' });
    }

    const turno = await Turno.findByPk(id);
    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    if (turno.estado.toLowerCase() === 'cancelado') {
      return res.status(400).json({ error: 'No se puede reprogramar un turno cancelado.' });
    }

    const dia_semana = obtenerDiaSemana(fecha_reserva);

    // Validar disponibilidad del médico para el nuevo día
    const disponibilidades = await Disponibilidad.findAll({
      where: {
        userId: turno.medicoId,
        dia_semana,
        estado: 'Disponible'
      }
    });

    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const disponibilidad = disponibilidades.find(
      (d) => toMin(hora_inicio) >= toMin(d.hora_inicio) && toMin(hora_fin) <= toMin(d.hora_fin)
    );

    if (!disponibilidad) {
      return res.status(400).json({ error: 'El nuevo horario solicitado no coincide con los horarios disponibles del médico para ese día.' });
    }

    // Validar solapamiento con otro turno del mismo médico (excluyendo el turno actual)
    const existente = await Turno.findOne({
      where: {
        medicoId: turno.medicoId,
        fecha_reserva,
        estado: ['Reservado', 'Confirmado'],
        id: { [Op.ne]: id },
        [Op.and]: [
          { hora_inicio: { [Op.lt]: hora_fin } },
          { hora_fin: { [Op.gt]: hora_inicio } }
        ]
      }
    });

    if (existente) {
      return res.status(400).json({ error: 'El nuevo horario choca con otro turno reservado para este médico.' });
    }

    turno.fecha_reserva = fecha_reserva;
    turno.dia_semana = dia_semana;
    turno.hora_inicio = hora_inicio;
    turno.hora_fin = hora_fin;
    // Si estaba asistido, mantener reservado para reprogramación limpia
    if (turno.estado.toLowerCase() === 'atendido') {
      turno.estado = 'Reservado';
    }
    await turno.save();

    // Crear log de auditoría
    try {
      await AuditLog.create({
        userId: req.user.id,
        nombre: req.user.nombre || 'Recepcionista',
        email: req.user.email,
        rol: req.user.rol,
        accion: 'Reprogramó Cita',
        detalle: `Turno ID ${id} reprogramado para ${fecha_reserva} a las ${hora_inicio}`
      });
    } catch(err) {
      console.error('Log reprogramar falló:', err.message);
    }

    // Notificaciones para paciente y médico en DB
    try {
      await Notificacion.create({
        userId: turno.pacienteId,
        mensaje: `Tu turno ha sido reprogramado por recepción para el día ${fecha_reserva} de ${hora_inicio.slice(0, 5)} a ${hora_fin.slice(0, 5)}.`
      });
      await Notificacion.create({
        userId: turno.medicoId,
        mensaje: `Un turno ha sido reprogramado por recepción para el día ${fecha_reserva} de ${hora_inicio.slice(0, 5)} a ${hora_fin.slice(0, 5)}.`
      });
    } catch(err) {
      console.error('Crear notificaciones falló:', err.message);
    }

    res.status(200).json({
      mensaje: 'Cita reprogramada exitosamente.',
      turno
    });

  } catch (error) {
    console.error('Error al reprogramar turno:', error);
    res.status(500).json({ error: 'Error interno al procesar la reprogramación.' });
  }
};

// 8. Solicitar Triaje (Paciente)
exports.solicitarTriaje = async (req, res) => {
  try {
    const { id } = req.params;
    const turno = await Turno.findByPk(id);

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    // Encontrar todas las recepcionistas activas para notificarles
    const recepcionistas = await User.findAll({
      where: {
        rol: 'recepcionista',
        estado: 'activo'
      }
    });

    for (const recep of recepcionistas) {
      await Notificacion.create({
        userId: recep.id,
        mensaje: `El paciente ${req.user.nombre} solicita triaje previo para su turno del día ${turno.fecha_reserva} (${turno.hora_inicio.slice(0,5)}).`
      });
    }

    res.status(200).json({
      mensaje: 'Solicitud de triaje enviada exitosamente a Recepción.'
    });

  } catch (error) {
    console.error('Error al solicitar triaje:', error);
    res.status(500).json({ error: 'Error del servidor al procesar la solicitud de triaje.' });
  }
};

exports.iniciarConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const medicoId = req.user.id;

    const turno = await Turno.findByPk(id);
    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    if (turno.medicoId !== medicoId) {
      return res.status(403).json({ error: 'No autorizado para iniciar la consulta de este turno.' });
    }

    if (!turno.consulta_iniciada) {
      turno.consulta_iniciada = true;
      turno.fecha_inicio_consulta = new Date();
      await turno.save();
    }

    res.status(200).json({
      mensaje: 'Consulta iniciada exitosamente',
      turno
    });
  } catch (error) {
    console.error('Error al iniciar consulta:', error);
    res.status(500).json({ error: 'Error del servidor al iniciar la consulta.' });
  }
};
