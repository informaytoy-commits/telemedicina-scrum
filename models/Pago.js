const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Turno = require('./Turno');
const User = require('./User');

const Pago = sequelize.define('Pago', {
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
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 50.00
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'pagado', 'fallido'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  metodo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'simulado'
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'pagos'
});

module.exports = Pago;
