const { Notificacion } = require('../models');

const getNotificaciones = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificaciones = await Notificacion.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.status(200).json({ notificaciones });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error del servidor al obtener notificaciones.' });
  }
};

const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notificacion = await Notificacion.findOne({ where: { id, userId } });
    
    if (!notificacion) {
      return res.status(404).json({ error: 'Notificación no encontrada.' });
    }

    notificacion.leido = true;
    await notificacion.save();

    res.status(200).json({ message: 'Notificación marcada como leída.', notificacion });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar notificación.' });
  }
};

const crearNotificacion = async (req, res) => {
  try {
    const { userId, mensaje } = req.body;
    
    if (!userId || !mensaje) {
      return res.status(400).json({ error: 'UserId y mensaje son requeridos.' });
    }

    const nuevaNotificacion = await Notificacion.create({
      userId,
      mensaje,
      leido: false
    });

    res.status(201).json({ message: 'Notificación creada exitosamente.', notificacion: nuevaNotificacion });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error del servidor al crear notificación.' });
  }
};

module.exports = {
  getNotificaciones,
  marcarLeida,
  crearNotificacion
};
