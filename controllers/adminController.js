const { User, MedicoDocumento, AuditLog } = require('../models');

const getResumenAdmin = async (req, res) => {
  try {
    const totalUsuarios = await User.count();
    const totalPacientes = await User.count({ where: { rol: 'paciente' } });
    const totalMedicos = await User.count({ where: { rol: 'medico' } });
    const medicosPendientes = await User.count({ where: { rol: 'medico', estado: 'pendiente' } });
    const medicosActivos = await User.count({ where: { rol: 'medico', estado: 'activo' } });
    const documentosPendientes = await MedicoDocumento.count({ where: { estado: 'Pendiente' } });

    res.status(200).json({
      resumen: {
        totalUsuarios,
        totalPacientes,
        totalMedicos,
        medicosPendientes,
        medicosActivos,
        documentosPendientes
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las métricas' });
  }
};

const getMedicosPendientes = async (req, res) => {
  try {
    const medicos = await User.findAll({
      where: { rol: 'medico', estado: 'pendiente' },
      attributes: ['id', 'nombre', 'email', 'telefono', 'ci', 'especialidad', 'matricula_profesional', 'foto'],
      include: [{
        model: MedicoDocumento,
        as: 'documentos',
        attributes: ['id', 'archivo', 'estado']
      }]
    });
    res.status(200).json({ medicos });
  } catch (error) {
    console.error('Error al obtener medicos pendientes:', error);
    res.status(500).json({ error: 'Error interno al consultar médicos pendientes.' });
  }
};

const aprobarMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const medico = await User.findByPk(id);

    if (!medico || medico.rol !== 'medico') {
      return res.status(404).json({ error: 'Médico no encontrado.' });
    }

    medico.estado = 'activo';
    await medico.save();

    await MedicoDocumento.update(
      { estado: 'Verificado' },
      { where: { userId: id } }
    );

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Aprobación Médico',
      detalle: `Aprobó al médico ID ${id} (${medico.email})`
    });

    res.status(200).json({ message: 'Médico aprobado exitosamente.' });
  } catch (error) {
    console.error('Error aprobando médico:', error);
    res.status(500).json({ error: 'Error del servidor al aprobar al médico.' });
  }
};

const rechazarMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const medico = await User.findByPk(id);

    if (!medico || medico.rol !== 'medico') {
      return res.status(404).json({ error: 'Médico no encontrado.' });
    }

    medico.estado = 'inactivo';
    await medico.save();

    await MedicoDocumento.update(
      { estado: 'Rechazado' },
      { where: { userId: id } }
    );

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Rechazo Médico',
      detalle: `Rechazó al médico ID ${id} (${medico.email})`
    });

    res.status(200).json({ message: 'Médico rechazado en el sistema.' });
  } catch (error) {
    console.error('Error rechazando médico:', error);
    res.status(500).json({ error: 'Error del servidor al rechazar al médico.' });
  }
};

const getLogsSistema = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: 'Error interno consultando la auditoría.' });
  }
};

module.exports = {
  getResumenAdmin,
  getMedicosPendientes,
  aprobarMedico,
  rechazarMedico,
  getLogsSistema
};
