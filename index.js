require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar base de datos y modelos centralizados (esto incluye la conexión a sequelize)
const db = require('./models');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const disponibilidadRoutes = require('./routes/disponibilidadRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const medicoRoutes = require('./routes/medicoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/documentos', documentRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/admin', adminRoutes);
// Archivos estáticos accesibles (opcional para consumo de los médicos y admin)
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// Main Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Database Connection and Server Start
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión a la base de datos PostgreSQL exitosa.');
    // Sincronizar base de datos
    // Nota: force: false asegura que NO se borren los datos ni las tablas existentes
    return db.sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('✅ Tablas de la base de datos sincronizadas manualmente (Sequelize Sync).');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de telemedicina corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error al intentar conectar a PostgreSQL o sincronizar tablas:', error);
  });
