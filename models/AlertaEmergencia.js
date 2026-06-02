const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AlertaEmergencia = sequelize.define('AlertaEmergencia', {
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
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  nivel: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    allowNull: false,
    defaultValue: 'media'
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'atendida', 'descartada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'alertas_emergencia'
});

module.exports = AlertaEmergencia;
