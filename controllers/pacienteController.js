const { Turno, NotaClinica, Receta, User } = require('../models');

const getHistorial = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    
    // Obtener turnos
    const turnos = await Turno.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['id', 'nombre', 'especialidad', 'foto'] }
      ],
      order: [['fecha_reserva', 'DESC'], ['hora_inicio', 'DESC']]
    });

    // Obtener notas clínicas
    const notas = await NotaClinica.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['id', 'nombre', 'especialidad'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Obtener recetas
    const recetas = await Receta.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['id', 'nombre', 'especialidad'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      turnos,
      notas,
      recetas
    });
  } catch (error) {
    console.error('Error al obtener historial del paciente:', error);
    res.status(500).json({ error: 'Error del servidor al obtener el historial.' });
  }
};

module.exports = {
  getHistorial
};
