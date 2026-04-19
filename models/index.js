const sequelize = require('../config/database');

// Importar modelos
const User = require('./User');
const MedicoDocumento = require('./MedicoDocumento');
const Disponibilidad = require('./Disponibilidad');
const Turno = require('./Turno');
const AuditLog = require('./AuditLog');

// Centralizar los modelos
const db = {
  sequelize,
  User,
  MedicoDocumento,
  Disponibilidad,
  Turno,
  AuditLog
};

// Aquí se configurarían las asociaciones en el futuro
// Ejemplo: User.hasMany(Citas)

// (Las asociaciones de User y Disponibilidad ya existen definidas dentro de models/Disponibilidad.js)
module.exports = db;
