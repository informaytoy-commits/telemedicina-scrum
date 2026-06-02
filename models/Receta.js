const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Turno = require('./Turno');

const Receta = sequelize.define('Receta', {
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
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  medicamentos: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'recetas'
});

User.hasMany(Receta, { foreignKey: 'pacienteId', as: 'recetasPaciente' });
Receta.belongsTo(User, { foreignKey: 'pacienteId', as: 'paciente' });
User.hasMany(Receta, { foreignKey: 'medicoId', as: 'recetasMedico' });
Receta.belongsTo(User, { foreignKey: 'medicoId', as: 'medico' });

module.exports = Receta;
