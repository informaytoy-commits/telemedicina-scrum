const { User, MedicoDocumento, AuditLog, Turno } = require('../models');
const bcrypt = require('bcrypt');

const getResumenAdmin = async (req, res) => {
  try {
    const totalUsuarios = await User.count();
    const totalPacientes = await User.count({ where: { rol: 'paciente' } });
    const totalMedicos = await User.count({ where: { rol: 'medico' } });
    const totalRecepcionistas = await User.count({ where: { rol: 'recepcionista' } });
    const medicosPendientes = await User.count({ where: { rol: 'medico', estado: 'pendiente' } });
    const medicosActivos = await User.count({ where: { rol: 'medico', estado: 'activo' } });
    const documentosPendientes = await MedicoDocumento.count({ where: { estado: 'Pendiente' } });
    let totalTurnos = 0;
    if (Turno) {
        totalTurnos = await Turno.count();
    }

    res.status(200).json({
      resumen: {
        totalUsuarios,
        totalPacientes,
        totalMedicos,
        totalRecepcionistas,
        medicosPendientes,
        medicosActivos,
        documentosPendientes,
        totalTurnos
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

const getUsuarios = async (req, res) => {
  try {
    const usuarios = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.status(200).json({ usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error del servidor al obtener usuarios.' });
  }
};

const crearRecepcionista = async (req, res) => {
  try {
    const { nombre, password, telefono, ci, direccion, turno_trabajo } = req.body;
    const email = req.body.email ? req.body.email.trim() : '';
    let foto = req.file ? req.file.filename : null;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'El email ya se encuentra registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: 'recepcionista',
      estado: 'activo',
      telefono,
      foto,
      ci: ci || 'N/A',
      direccion: direccion || null,
      turno_trabajo: turno_trabajo || null
    });

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Crear Recepcionista',
      detalle: `Admin creó recepcionista ID ${newUser.id} (${newUser.email})`
    });

    res.status(201).json({ message: 'Recepcionista creado exitosamente', usuario: { id: newUser.id, nombre, email } });
  } catch (error) {
    console.error('Error al crear recepcionista:', error);
    res.status(500).json({ error: 'Error del servidor al crear recepcionista.' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, estado, nombre, telefono, ci, direccion, turno_trabajo, especialidad, matricula_profesional } = req.body;
    let foto = req.file ? req.file.filename : null;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (rol) usuario.rol = rol;
    if (estado) usuario.estado = estado;
    if (nombre) usuario.nombre = nombre;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (ci !== undefined) usuario.ci = ci;
    if (direccion !== undefined) usuario.direccion = direccion;
    if (turno_trabajo !== undefined) usuario.turno_trabajo = turno_trabajo;
    if (especialidad !== undefined) usuario.especialidad = especialidad;
    if (matricula_profesional !== undefined) usuario.matricula_profesional = matricula_profesional;
    if (foto) usuario.foto = foto;

    await usuario.save();

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Actualizar Usuario',
      detalle: `Admin actualizó usuario ID ${id}. Rol: ${rol || usuario.rol}, Estado: ${estado || usuario.estado}`
    });

    res.status(200).json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar usuario.' });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const emailTemp = usuario.email;

    await usuario.destroy();

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Eliminar Usuario',
      detalle: `Admin eliminó al usuario ID ${id} (${emailTemp})`
    });

    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar usuario.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    usuario.password = hashedPassword;
    await usuario.save();

    await AuditLog.create({
      userId: req.user.id,
      nombre: req.user.nombre || 'Administrador',
      email: req.user.email,
      rol: 'admin',
      accion: 'Reset Password',
      detalle: `Admin reseteó la contraseña del usuario ID ${id} (${usuario.email})`
    });

    res.status(200).json({ message: 'Contraseña reseteada exitosamente' });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ error: 'Error del servidor al resetear la contraseña.' });
  }
};

const getTurnos = async (req, res) => {
  try {
    const turnos = await Turno.findAll({
      include: [
        { model: User, as: 'medico', attributes: ['nombre', 'especialidad'] },
        { model: User, as: 'paciente', attributes: ['nombre', 'email'] }
      ],
      order: [['fecha_reserva', 'DESC'], ['hora_inicio', 'DESC']]
    });
    res.status(200).json({ turnos });
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    res.status(500).json({ error: 'Error del servidor al obtener turnos.' });
  }
};

module.exports = {
  getResumenAdmin,
  getMedicosPendientes,
  aprobarMedico,
  rechazarMedico,
  getLogsSistema,
  getUsuarios,
  crearRecepcionista,
  actualizarUsuario,
  eliminarUsuario,
  getTurnos,
  resetPassword
};
