const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Importamos el modelo User para la relación

const MedicoDocumento = sequelize.define('MedicoDocumento', {
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
  archivo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Verificado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Pendiente'
  },
  fecha_subida: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'medico_documentos'
});

// Validamos la relación dentro del mismo modelo (opcional, pero es buena práctica en Sequelize)
User.hasMany(MedicoDocumento, { foreignKey: 'userId', as: 'documentos' });
MedicoDocumento.belongsTo(User, { foreignKey: 'userId', as: 'medico' });

module.exports = MedicoDocumento;
