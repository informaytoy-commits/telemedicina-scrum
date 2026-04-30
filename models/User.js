const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ci: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  foto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  turno_trabajo: {
    type: DataTypes.ENUM('Mañana', 'Tarde', 'Completo'),
    allowNull: true
  },
  especialidad: {
    type: DataTypes.STRING,
    allowNull: true
  },
  matricula_profesional: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rol: {
    type: DataTypes.ENUM('admin', 'medico', 'paciente', 'recepcionista'),
    allowNull: false,
    defaultValue: 'paciente'
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo', 'pendiente'),
    allowNull: false,
    defaultValue: 'activo'
  }
}, {
  timestamps: true,
  tableName: 'usuarios'
});

module.exports = User;
