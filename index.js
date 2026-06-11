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
const especialidadRoutes = require('./routes/especialidadRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const alertaRoutes = require('./routes/alertaRoutes');
const { cancelarTurnosVencidos } = require('./utils/autoCancel');
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
app.use('/api/especialidades', especialidadRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/alertas', alertaRoutes);
// Archivos estáticos accesibles (opcional para consumo de los médicos y admin)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
  .then(async () => {
    console.log('✅ Tablas de la base de datos sincronizadas manualmente (Sequelize Sync).');
    
    // Seed de Especialidades Iniciales
    const especialidadesIniciales = [
      { nombre: 'Medicina General' },
      { nombre: 'Pediatría' },
      { nombre: 'Cardiología' },
      { nombre: 'Ginecología' },
      { nombre: 'Traumatología' }
    ];

    for (const esp of especialidadesIniciales) {
      await db.Especialidad.findOrCreate({
        where: { nombre: esp.nombre },
        defaults: { estado: true }
      });
    }
    console.log('✅ Especialidades iniciales verificadas.');

    // Seed automático del Administrador Principal si no existe
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@telemedicina.com';
    const adminExists = await db.User.findOne({ where: { email: adminEmail } });
    if (!adminExists) {
      console.log(`🌱 No se encontró el usuario admin (${adminEmail}) en la base de datos. Creándolo automáticamente...`);
      const bcrypt = require('bcrypt');
      const adminPassword = process.env.ADMIN_PASSWORD || '123456';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await db.User.create({
        nombre: 'Admin Sistema',
        email: adminEmail,
        password: hashedPassword,
        rol: 'admin',
        estado: 'activo',
        ci: '00000000',
        telefono: '00000000'
      });
      console.log(`✅ Administrador principal creado exitosamente (${adminEmail}).`);
    } else {
      console.log(`✅ Administrador principal existente verificado (${adminEmail}).`);
    }

    app.listen(PORT, async () => {
      console.log(`🚀 Servidor de telemedicina corriendo en el puerto ${PORT}`);
      // Ejecutar auto-cancelación al iniciar
      await cancelarTurnosVencidos();
      // Configurar intervalo para ejecutarse cada 1 minuto
      setInterval(async () => {
        await cancelarTurnosVencidos();
      }, 60000);
    });
  })
  .catch((error) => {
    console.error('❌ Error al intentar conectar a PostgreSQL o sincronizar tablas:', error);
  });
