const { Op } = require('sequelize');
const { User, Disponibilidad, Turno } = require('../models');

const buscarMedicos = async (req, res) => {
  try {
    const { nombre, especialidad } = req.query;

    const whereClause = {
      rol: 'medico',
      estado: 'activo' // Opcional, pero asumiendo que solo se buscan médicos activos
    };

    if (nombre) {
      whereClause.nombre = {
        [Op.iLike]: `%${nombre}%` // Usando iLike para PostgreSQL y Op.like en general
      };
    }

    if (especialidad) {
       whereClause.especialidad = {
         [Op.iLike]: `%${especialidad}%`
       };
    }

    const medicos = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password', 'createdAt', 'updatedAt'] },
      include: [
         {
           model: Disponibilidad,
           as: 'disponibilidades',
        },
        {
           model: Turno,
           as: 'turnosMedico',
           where: {
             estado: ['Reservado', 'Confirmado']
           },
           required: false, // LEFT JOIN
           attributes: ['fecha_reserva', 'hora_inicio', 'hora_fin']
        }
      ]
    });

    return res.status(200).json({
      medicos
    });
  } catch (error) {
    console.error('Error en buscarMedicos:', error);
    return res.status(500).json({ error: 'Error interno al buscar médicos.' });
  }
};

module.exports = {
  buscarMedicos
};
