const { Op } = require('sequelize');
const { User, Disponibilidad, Turno, sequelize, Especialidad, NotaClinica, Receta, Notificacion } = require('../models');

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

    const especialidadWhere = {};
    if (especialidad) {
       especialidadWhere.nombre = {
         [Op.iLike]: `%${especialidad}%`
       };
    }

    const medicosRaw = await User.findAll({
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
        },
        {
           model: Especialidad,
           as: 'especialidadRel',
           where: Object.keys(especialidadWhere).length > 0 ? especialidadWhere : undefined,
           required: Object.keys(especialidadWhere).length > 0
        }
      ]
    });

    // Map to keep backwards compatibility with frontend that uses medico.especialidad
    const medicos = medicosRaw.map(m => {
      const plain = m.toJSON();
      plain.especialidad = plain.especialidadRel ? plain.especialidadRel.nombre : 'No asignada';
      return plain;
    });

    return res.status(200).json({
      medicos
    });
  } catch (error) {
    console.error('Error en buscarMedicos:', error);
    return res.status(500).json({ error: 'Error interno al buscar médicos.' });
  }
};

const obtenerEspecialidades = async (req, res) => {
  try {
    const especialidades = await Especialidad.findAll({
      where: { estado: true },
      order: [['nombre', 'ASC']]
    });

    const lista = especialidades.map(e => e.nombre);

    return res.status(200).json({
      especialidades: lista
    });
  } catch (error) {
    console.error('Error en obtenerEspecialidades:', error);
    return res.status(500).json({ error: 'Error interno al obtener especialidades.' });
  }
};

// ... [The rest of the file stays mostly the same but I'll replace the whole export section]

const agregarNotaClinica = async (req, res) => {
  try {
    const medicoId = req.user.id;
    const { pacienteId, turnoId, diagnostico, observaciones } = req.body;
    
    if (!pacienteId || !diagnostico) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const nota = await NotaClinica.create({
      medicoId,
      pacienteId,
      turnoId: turnoId || null,
      diagnostico,
      observaciones
    });

    try {
      await Notificacion.create({
        userId: pacienteId,
        mensaje: "Tu médico ha actualizado tu historial clínico."
      });
    } catch(err) {
      console.error('Error notificacion nota', err);
    }

    return res.status(201).json({ message: 'Nota clínica creada', nota });
  } catch (error) {
    console.error('Error al agregar nota:', error);
    return res.status(500).json({ error: 'Error al agregar nota clínica' });
  }
};

const obtenerNotasPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const notas = await NotaClinica.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['nombre', 'especialidad'] }
      ],
      order: [['fecha', 'DESC']]
    });

    return res.status(200).json({ notas });
  } catch (error) {
    console.error('Error obtener notas:', error);
    return res.status(500).json({ error: 'Error al obtener notas' });
  }
};

const generarReceta = async (req, res) => {
  try {
    const medicoId = req.user.id;
    const { pacienteId, turnoId, descripcion, medicamentos } = req.body;

    if (!pacienteId || !medicamentos) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const receta = await Receta.create({
      medicoId,
      pacienteId,
      turnoId: turnoId || null,
      descripcion,
      medicamentos
    });

    try {
      await Notificacion.create({
        userId: pacienteId,
        mensaje: "Tu médico ha generado una nueva receta médica. Puedes verla en Mi Historial Clínico."
      });
    } catch(err) {
      console.error('Error notificacion receta', err);
    }

    return res.status(201).json({ message: 'Receta generada', receta });
  } catch (error) {
    console.error('Error al generar receta:', error);
    return res.status(500).json({ error: 'Error al generar receta' });
  }
};

const obtenerRecetasPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const recetas = await Receta.findAll({
      where: { pacienteId },
      include: [
        { model: User, as: 'medico', attributes: ['nombre', 'especialidad'] }
      ],
      order: [['fecha', 'DESC']]
    });

    return res.status(200).json({ recetas });
  } catch (error) {
    console.error('Error obtener recetas:', error);
    return res.status(500).json({ error: 'Error al obtener recetas' });
  }
};

module.exports = {
  buscarMedicos,
  obtenerEspecialidades,
  agregarNotaClinica,
  obtenerNotasPaciente,
  generarReceta,
  obtenerRecetasPaciente
};
