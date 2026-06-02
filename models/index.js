const sequelize = require('../config/database');

// Importar modelos
const User = require('./User');
const MedicoDocumento = require('./MedicoDocumento');
const Disponibilidad = require('./Disponibilidad');
const Turno = require('./Turno');
const AuditLog = require('./AuditLog');
const Especialidad = require('./Especialidad');
const NotaClinica = require('./NotaClinica');
const Receta = require('./Receta');
const Notificacion = require('./Notificacion');
const Pago = require('./Pago');
const ChatMensaje = require('./ChatMensaje');
const AlertaEmergencia = require('./AlertaEmergencia');

// Definir relaciones
User.belongsTo(Especialidad, { foreignKey: 'especialidadId', as: 'especialidadRel' });
Especialidad.hasMany(User, { foreignKey: 'especialidadId' });

Turno.hasOne(NotaClinica, { foreignKey: 'turnoId', as: 'notaClinica' });
NotaClinica.belongsTo(Turno, { foreignKey: 'turnoId', as: 'turno' });

Turno.hasOne(Receta, { foreignKey: 'turnoId', as: 'receta' });
Receta.belongsTo(Turno, { foreignKey: 'turnoId', as: 'turno' });

Turno.hasOne(Pago, { foreignKey: 'turnoId', as: 'pago' });
Pago.belongsTo(Turno, { foreignKey: 'turnoId', as: 'turno' });

Turno.hasMany(ChatMensaje, { foreignKey: 'turnoId', as: 'mensajesTriaje' });
ChatMensaje.belongsTo(Turno, { foreignKey: 'turnoId', as: 'turno' });

User.hasMany(ChatMensaje, { foreignKey: 'emisorId', as: 'mensajesEnviados' });
ChatMensaje.belongsTo(User, { foreignKey: 'emisorId', as: 'emisor' });

User.hasMany(ChatMensaje, { foreignKey: 'receptorId', as: 'mensajesRecibidos' });
ChatMensaje.belongsTo(User, { foreignKey: 'receptorId', as: 'receptor' });

User.hasMany(Pago, { foreignKey: 'pacienteId', as: 'pagosPaciente' });
Pago.belongsTo(User, { foreignKey: 'pacienteId', as: 'paciente' });

User.hasMany(Pago, { foreignKey: 'medicoId', as: 'pagosMedico' });
Pago.belongsTo(User, { foreignKey: 'medicoId', as: 'medico' });

User.hasMany(AlertaEmergencia, { foreignKey: 'pacienteId', as: 'alertasPaciente' });
AlertaEmergencia.belongsTo(User, { foreignKey: 'pacienteId', as: 'paciente' });

// Centralizar los modelos
const db = {
  sequelize,
  User,
  MedicoDocumento,
  Disponibilidad,
  Turno,
  AuditLog,
  Especialidad,
  NotaClinica,
  Receta,
  Notificacion,
  Pago,
  ChatMensaje,
  AlertaEmergencia
};

module.exports = db;
