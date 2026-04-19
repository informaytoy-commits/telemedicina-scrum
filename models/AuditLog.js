const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); 

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  accion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  detalle: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'audit_logs'
});

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'logs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });

module.exports = AuditLog;
