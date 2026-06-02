const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Notificacion = sequelize.define('Notificacion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  mensaje: {
    type: DataTypes.STRING,
    allowNull: false
  },
  leido: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true,
  tableName: 'notificaciones'
});

User.hasMany(Notificacion, { foreignKey: 'userId', as: 'notificaciones' });
Notificacion.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });

module.exports = Notificacion;
