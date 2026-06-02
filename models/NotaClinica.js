const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Turno = require('./Turno');

const NotaClinica = sequelize.define('NotaClinica', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pacienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  medicoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  turnoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Turno, key: 'id' }
  },
  diagnostico: {
    type: DataTypes.STRING,
    allowNull: false
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'notas_clinicas'
});

User.hasMany(NotaClinica, { foreignKey: 'pacienteId', as: 'notasPaciente' });
NotaClinica.belongsTo(User, { foreignKey: 'pacienteId', as: 'paciente' });
User.hasMany(NotaClinica, { foreignKey: 'medicoId', as: 'notasMedico' });
NotaClinica.belongsTo(User, { foreignKey: 'medicoId', as: 'medico' });

module.exports = NotaClinica;
