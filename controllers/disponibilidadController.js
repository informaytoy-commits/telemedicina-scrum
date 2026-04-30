const { Disponibilidad, User, AuditLog } = require('../models');
const { Op } = require('sequelize');

// Helper para validar si los horarios se solapan
const verificarSolapamiento = async (userId, dia_semana, hora_inicio, hora_fin, excludeId = null) => {
  const whereClause = {
    userId,
    dia_semana,
    [Op.and]: [
      { hora_inicio: { [Op.lt]: hora_fin } },
      { hora_fin: { [Op.gt]: hora_inicio } }
    ]
  };

  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }

  const overlap = await Disponibilidad.findOne({ where: whereClause });
  return overlap;
};

// Crear nueva disponibilidad
const crearDisponibilidad = async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, estado, medicoId } = req.body;
    
    // Solo recepcionista puede crear, así que el medicoId viene en el body
    const userId = medicoId; 

    if (!userId || !dia_semana || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (medicoId, dia_semana, hora_inicio, hora_fin).' });
    }

    const medico = await User.findOne({ where: { id: userId, rol: 'medico', estado: 'activo' } });
    if (!medico) {
      return res.status(400).json({ error: 'Médico no válido o inactivo.' });
    }

    if (hora_inicio >= hora_fin) {
      return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' });
    }

    const solapamiento = await verificarSolapamiento(userId, dia_semana, hora_inicio, hora_fin);
    if (solapamiento) {
      return res.status(400).json({ error: 'El médico ya tiene un horario que se solapa con este intervalo.' });
    }

    const nuevaDisp = await Disponibilidad.create({
      userId,
      dia_semana,
      hora_inicio,
      hora_fin,
      estado: estado || 'Disponible'
    });

    if (AuditLog) {
       await AuditLog.create({
          userId: req.user.id,
          nombre: req.user.nombre || 'Recepcionista',
          email: req.user.email,
          rol: req.user.rol,
          accion: 'Crear Disponibilidad',
          detalle: `Asignó disponibilidad al médico ID ${userId} el día ${dia_semana}`
       });
    }

    res.status(201).json({ message: 'Disponibilidad creada correctamente.', disponibilidad: nuevaDisp });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la disponibilidad.', detalle: error.message });
  }
};

// Listar los horarios únicamente del médico que hace la petición
const listarMisDisponibilidades = async (req, res) => {
  try {
    const userId = req.user.id;
    const disponibilidades = await Disponibilidad.findAll({
      where: { userId },
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']]
    });

    res.json(disponibilidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar las disponibilidades.', detalle: error.message });
  }
};

const listarDisponibilidadPorMedico = async (req, res) => {
  try {
    const { medicoId } = req.params;
    const disponibilidades = await Disponibilidad.findAll({
      where: { userId: medicoId },
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']]
    });

    res.json(disponibilidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar las disponibilidades.', detalle: error.message });
  }
};

// Editar disponibilidad existente
const editarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, estado } = req.body;
    
    // Solo recepcionista edita

    const disponibilidad = await Disponibilidad.findByPk(id);
    
    if (!disponibilidad) {
      return res.status(404).json({ error: 'Disponibilidad no encontrada.' });
    }
    
    const userId = disponibilidad.userId;

    // Permite actualizaciones parciales
    const n_dia = dia_semana || disponibilidad.dia_semana;
    const n_inicio = hora_inicio || disponibilidad.hora_inicio;
    const n_fin = hora_fin || disponibilidad.hora_fin;

    if (n_inicio >= n_fin) {
      return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' });
    }

    // Verificar que no pise sus propios horarios ya registrados, excluyendo este mismo ID
    const solapamiento = await verificarSolapamiento(userId, n_dia, n_inicio, n_fin, id);
    if (solapamiento) {
      return res.status(400).json({ error: 'La actualización provoca que el horario se solape con otro existente.' });
    }

    disponibilidad.dia_semana = n_dia;
    disponibilidad.hora_inicio = n_inicio;
    disponibilidad.hora_fin = n_fin;
    if (estado) disponibilidad.estado = estado;

    await disponibilidad.save();

    res.json({ message: 'Disponibilidad actualizada exitosamente.', disponibilidad });
  } catch (error) {
    res.status(500).json({ error: 'Error al editar la disponibilidad.', detalle: error.message });
  }
};

// Eliminar disponibilidad preexistente
const eliminarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;

    const disponibilidad = await Disponibilidad.findByPk(id);
    
    if (!disponibilidad) {
      return res.status(404).json({ error: 'Disponibilidad no encontrada.' });
    }

    await disponibilidad.destroy();

    if (AuditLog) {
       await AuditLog.create({
          userId: req.user.id,
          nombre: req.user.nombre || 'Recepcionista',
          email: req.user.email,
          rol: req.user.rol,
          accion: 'Eliminar Disponibilidad',
          detalle: `Eliminó disponibilidad ID ${id} del médico ID ${disponibilidad.userId}`
       });
    }

    res.json({ message: 'Disponibilidad eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la disponibilidad.', detalle: error.message });
  }
};

module.exports = {
  crearDisponibilidad,
  listarMisDisponibilidades,
  listarDisponibilidadPorMedico,
  editarDisponibilidad,
  eliminarDisponibilidad
};
