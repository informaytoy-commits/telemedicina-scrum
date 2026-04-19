const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Turno = sequelize.define('Turno', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  medicoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  pacienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  dia_semana: {
    type: DataTypes.ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'),
    allowNull: false
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('Reservado', 'Confirmado', 'Cancelado'),
    allowNull: false,
    defaultValue: 'Reservado'
  },
  fecha_reserva: {
    type: DataTypes.DATEONLY, // Usamos DATEONLY para la fecha específica del turno (e.g. '2023-11-20')
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'turnos'
});

// Definir relaciones
// Un médico tiene muchos turnos
User.hasMany(Turno, { foreignKey: 'medicoId', as: 'turnosMedico' });
Turno.belongsTo(User, { foreignKey: 'medicoId', as: 'medico' });

// Un paciente tiene muchos turnos
User.hasMany(Turno, { foreignKey: 'pacienteId', as: 'turnosPaciente' });
Turno.belongsTo(User, { foreignKey: 'pacienteId', as: 'paciente' });

module.exports = Turno;
