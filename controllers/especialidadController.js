const { Especialidad } = require('../models');

// GET /api/especialidades (público)
// GET /api/admin/especialidades (admin - puede ver inactivos si lo mandamos, o ambos usan el mismo y devolvemos todo)
exports.getEspecialidades = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const whereClause = {};
    if (soloActivos === 'true') {
      whereClause.estado = true;
    }

    const especialidades = await Especialidad.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']]
    });

    res.json(especialidades);
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    res.status(500).json({ error: 'Error del servidor al obtener especialidades' });
  }
};

// POST /api/admin/especialidades
exports.crearEspecialidad = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Verificar si existe
    const existe = await Especialidad.findOne({ where: { nombre } });
    if (existe) {
      return res.status(400).json({ error: 'Ya existe una especialidad con ese nombre' });
    }

    const nuevaEspecialidad = await Especialidad.create({
      nombre,
      descripcion,
      estado: true
    });

    res.status(201).json({ mensaje: 'Especialidad creada con éxito', especialidad: nuevaEspecialidad });
  } catch (error) {
    console.error('Error al crear especialidad:', error);
    res.status(500).json({ error: 'Error del servidor al crear especialidad' });
  }
};

// PUT /api/admin/especialidades/:id
exports.actualizarEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const especialidad = await Especialidad.findByPk(id);
    if (!especialidad) {
      return res.status(404).json({ error: 'Especialidad no encontrada' });
    }

    // Si cambia el nombre, verificar que no choque con otra
    if (nombre && nombre !== especialidad.nombre) {
      const existe = await Especialidad.findOne({ where: { nombre } });
      if (existe) {
        return res.status(400).json({ error: 'Ya existe otra especialidad con ese nombre' });
      }
    }

    await especialidad.update({ nombre, descripcion });

    res.json({ mensaje: 'Especialidad actualizada con éxito', especialidad });
  } catch (error) {
    console.error('Error al actualizar especialidad:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar especialidad' });
  }
};

// DELETE /api/admin/especialidades/:id (lógico)
exports.toggleEstadoEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    
    const especialidad = await Especialidad.findByPk(id);
    if (!especialidad) {
      return res.status(404).json({ error: 'Especialidad no encontrada' });
    }

    // Cambiar estado
    await especialidad.update({ estado: !especialidad.estado });

    res.json({ mensaje: `Especialidad ${especialidad.estado ? 'activada' : 'desactivada'} con éxito`, especialidad });
  } catch (error) {
    console.error('Error al cambiar estado de especialidad:', error);
    res.status(500).json({ error: 'Error del servidor al cambiar estado' });
  }
};
