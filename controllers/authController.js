const { User, MedicoDocumento, AuditLog } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { nombre, email, password, rol, ci, telefono, especialidad, matricula_profesional } = req.body;

    // Validación de campos obligatorios comunes
    if (!nombre || !email || !password || !ci || !telefono) {
      return res.status(400).json({ error: 'Nombre, email, contraseña, CI y teléfono son obligatorios.' });
    }

    // Seguridad estricta: Prohibir el admin vía frontend
    if (rol === 'admin') {
      return res.status(403).json({ error: 'Operación no permitida.' });
    }

    const finalRol = rol === 'medico' ? 'medico' : 'paciente';
    const finalEstado = finalRol === 'medico' ? 'pendiente' : 'activo';

    if (finalRol === 'medico') {
      if (!especialidad || !matricula_profesional) {
        return res.status(400).json({ error: 'La especialidad y matrícula son requisitos obligatorios para médicos.' });
      }
      if (!req.files || !req.files['documento']) {
        return res.status(400).json({ error: 'El documento de respaldo es obligatorio para registrar un médico.' });
      }
    }

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'El email ya se encuentra registrado.' });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let fotoPath = null;
    if (req.files && req.files['foto'] && req.files['foto'][0]) {
       fotoPath = req.files['foto'][0].filename;
    }

    // Crear el nuevo usuario
    const newUser = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: finalRol,
      estado: finalEstado,
      ci,
      telefono,
      foto: fotoPath,
      especialidad: finalRol === 'medico' ? especialidad : null,
      matricula_profesional: finalRol === 'medico' ? matricula_profesional : null
    });

    // Guardar su documento de currículo en tabla adjunta
    if (finalRol === 'medico' && req.files && req.files['documento']) {
       await MedicoDocumento.create({
          userId: newUser.id,
          archivo: req.files['documento'][0].filename,
          estado: 'Pendiente'
       });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        rol: newUser.rol,
        estado: newUser.estado
      }
    });

  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el registro.' });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email ? req.body.email.trim() : '';
    console.log(`[DEBUG LOGIN] Intento de login con correo: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }

    // Buscar si existe el usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`[DEBUG LOGIN] Usuario no encontrado para el correo: ${email}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`[DEBUG LOGIN] Usuario encontrado. Rol: ${user.rol}, Estado: ${user.estado}`);

    // Verificar si el usuario está activo
    if (user.estado !== 'activo') {
      console.log(`[DEBUG LOGIN] Bloqueo: el usuario no está activo. Estado actual: ${user.estado}`);
      if (user.rol === 'medico') {
        if (user.estado === 'pendiente') {
          return res.status(403).json({ error: 'Tu cuenta médica aún no ha sido validada por el administrador.' });
        } else if (user.estado === 'inactivo') {
          return res.status(403).json({ error: 'Tu cuenta ha sido rechazada o desactivada.' });
        }
      }
      return res.status(403).json({ error: 'Usuario inactivo, contacte al administrador.' });
    }

    // Verificar contraseña comparando hashes
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JSON Web Token
    const payload = { id: user.id, email: user.email, rol: user.rol };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secreto_temporal',
      { expiresIn: '24h' }
    );

    // Responder exitosamente primero frente a los bloqueos
    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      }
    });

    // Registrar log de auditoría protegido internamente
    try {
      await AuditLog.create({
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        accion: 'Login Exitoso',
        detalle: 'El usuario inició sesión en el sistema'
      });
    } catch (logError) {
      console.error('⚠️ Advertencia: Error interno al guardar AuditLog (Login no interrumpido):', logError.message);
    }

  } catch (error) {
    console.error('❌ Error Crítico en el flujo de login:', error);
    res.status(500).json({ error: 'Error interno del servidor en el login. ' + error.message });
  }
};

module.exports = { register, login };
