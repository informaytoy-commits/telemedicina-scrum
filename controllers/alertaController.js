const { AlertaEmergencia, User, Notificacion } = require('../models');

// Paciente crea alerta
exports.crearAlerta = async (req, res) => {
  try {
    const { motivo, nivel } = req.body;
    const pacienteId = req.user.id;

    if (!motivo) return res.status(400).json({ error: 'El motivo es obligatorio' });

    const alerta = await AlertaEmergencia.create({
      pacienteId,
      motivo,
      nivel: nivel || 'media',
      estado: 'pendiente'
    });

    // Notificar a administradores y médicos
    const adminsYMedicos = await User.findAll({
      where: {
        rol: ['admin', 'medico'],
        estado: 'activo'
      }
    });

    const notificaciones = adminsYMedicos.map(usuario => ({
      userId: usuario.id,
      mensaje: `ALERTA DE EMERGENCIA (${alerta.nivel.toUpperCase()}): ${req.user.nombre} requiere atención urgente.`,
      leido: false
    }));

    await Notificacion.bulkCreate(notificaciones);

    res.status(201).json({ message: 'Alerta enviada correctamente', alerta });
  } catch (error) {
    console.error('Error al crear alerta:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la alerta.' });
  }
};

// Médicos o admins listan alertas
exports.listarAlertas = async (req, res) => {
  try {
    const alertas = await AlertaEmergencia.findAll({
      include: [{ model: User, as: 'paciente', attributes: ['id', 'nombre', 'email', 'telefono'] }],
      order: [
        // Ordenar por pendientes primero, luego fecha
        ['estado', 'ASC'], // 'atendida', 'descartada', 'pendiente'
        ['fecha', 'DESC']
      ]
    });
    // Reordenar manual si es necesario (pendiente -> baja/media/alta, fecha DESC)
    const sorted = alertas.sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      return new Date(b.fecha) - new Date(a.fecha);
    });

    res.status(200).json({ alertas: sorted });
  } catch (error) {
    console.error('Error al listar alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Actualizar estado (medico/admin)
exports.actualizarAlerta = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'atendida' o 'descartada'

    if (!['atendida', 'descartada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const alerta = await AlertaEmergencia.findByPk(id, {
      include: [{ model: User, as: 'paciente' }]
    });

    if (!alerta) return res.status(404).json({ error: 'Alerta no encontrada' });

    alerta.estado = estado;
    await alerta.save();

    // Notificar al paciente
    let msj = `Tu alerta de emergencia ha sido ${estado}.`;
    if (estado === 'atendida') msj = 'Un profesional médico ha atendido tu alerta de emergencia.';
    
    await Notificacion.create({
      userId: alerta.pacienteId,
      mensaje: msj,
      leido: false
    });

    res.status(200).json({ message: `Alerta marcada como ${estado}`, alerta });
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
