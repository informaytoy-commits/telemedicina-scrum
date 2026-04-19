const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Relación con el médico

const Disponibilidad = sequelize.define('Disponibilidad', {
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
  dia_semana: {
    type: DataTypes.ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'),
    allowNull: false
  },
  hora_inicio: {
    type: DataTypes.TIME, // Almacena formato HH:mm:ss
    allowNull: false
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('Disponible', 'No disponible'),
    allowNull: false,
    defaultValue: 'Disponible'
  }
}, {
  timestamps: true,
  tableName: 'disponibilidades'
});

// Definir las relaciones entre User y Disponibilidad
User.hasMany(Disponibilidad, { foreignKey: 'userId', as: 'disponibilidades' });
Disponibilidad.belongsTo(User, { foreignKey: 'userId', as: 'medico' });

module.exports = Disponibilidad;
