const { ChatMensaje, Turno, User } = require('../models');

exports.enviarMensaje = async (req, res) => {
  try {
    const { turnoId, mensaje, tipo } = req.body;
    const emisorId = req.user.id;
    const chatTipo = tipo || 'medico'; // 'medico' o 'recepcion'

    // Verificar el turno
    const turno = await Turno.findByPk(turnoId);
    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // Determinar quién es el receptor
    let receptorId;
    if (chatTipo === 'recepcion') {
      if (req.user.rol === 'paciente') {
        // Enviar a recepción (buscamos un recepcionista activo o dejamos 0)
        const receptionist = await User.findOne({ where: { rol: 'recepcionista', estado: 'activo' } });
        receptorId = receptionist ? receptionist.id : 0;

        // Cambiar el estado del chat de recepción en el Turno a Pendiente
        turno.recepcionChatEstado = 'Pendiente';
        await turno.save();
      } else if (req.user.rol === 'recepcionista') {
        receptorId = turno.pacienteId;

        // Cambiar el estado del chat de recepción en el Turno a Atendida
        turno.recepcionChatEstado = 'Atendida';
        await turno.save();
      } else {
        return res.status(403).json({ error: 'Rol no autorizado para chat de recepción.' });
      }
    } else {
      // Triaje Médico (Paciente ↔ Médico)
      if (req.user.rol === 'paciente') {
        receptorId = turno.medicoId;
      } else if (req.user.rol === 'medico') {
        receptorId = turno.pacienteId;
      } else {
        return res.status(403).json({ error: 'Rol no autorizado para triaje médico.' });
      }
    }

    const nuevoMensaje = await ChatMensaje.create({
      turnoId,
      emisorId,
      receptorId,
      mensaje,
      tipo: chatTipo
    });

    res.status(201).json({ message: 'Mensaje enviado', mensaje: nuevoMensaje });
  } catch (error) {
    console.error('Error al enviar mensaje de chat:', error);
    res.status(500).json({ error: 'Error del servidor al enviar mensaje.' });
  }
};

exports.obtenerMensajesPorTurno = async (req, res) => {
  try {
    const { turnoId } = req.params;
    const chatTipo = req.query.tipo || 'medico'; // 'medico' o 'recepcion'

    const mensajes = await ChatMensaje.findAll({
      where: { turnoId, tipo: chatTipo },
      include: [
        { model: User, as: 'emisor', attributes: ['id', 'nombre', 'rol'] }
      ],
      order: [['fecha', 'ASC']]
    });

    res.status(200).json({ mensajes });
  } catch (error) {
    console.error('Error al obtener mensajes de chat:', error);
    res.status(500).json({ error: 'Error del servidor al obtener mensajes.' });
  }
};

// Marcar chat de recepción como atendido (Recepcionista)
exports.marcarChatAtendido = async (req, res) => {
  try {
    const { turnoId } = req.params;
    const turno = await Turno.findByPk(turnoId);
    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    turno.recepcionChatEstado = 'Atendida';
    await turno.save();

    res.status(200).json({ message: 'Conversación de soporte marcada como atendida.', turno });
  } catch (error) {
    console.error('Error al marcar chat como atendido:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar estado.' });
  }
};
