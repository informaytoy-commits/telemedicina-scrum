const { Turno, Disponibilidad, User, AuditLog } = require('../models');
const { Op } = require('sequelize');

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

    res.status(201).json({
      mensaje: 'Turno reservado exitosamente',
      turno: nuevoTurno
    });

  } catch (error) {
    console.error('Error al reservar turno:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la reserva.' });
  }
};

exports.listarMisTurnosPaciente = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    const turnos = await Turno.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['id', 'nombre', 'email', 'foto'] }
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

    res.status(200).json({
      mensaje: 'Turno cancelado exitosamente',
      turno
    });

  } catch (error) {
    console.error('Error al cancelar turno:', error);
    res.status(500).json({ error: 'Error interno del servidor al cancelar.' });
  }
};
