const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Turno = require('./Turno');
const User = require('./User');

const ChatMensaje = sequelize.define('ChatMensaje', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  turnoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Turno, key: 'id' }
  },
  emisorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  receptorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('medico', 'recepcion'),
    allowNull: false,
    defaultValue: 'medico'
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'chat_mensajes'
});

module.exports = ChatMensaje;
