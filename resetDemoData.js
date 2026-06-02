require('dotenv').config();
const {
  sequelize,
  User,
  MedicoDocumento,
  Disponibilidad,
  Turno,
  AuditLog,
  Especialidad,
  NotaClinica,
  Receta,
  Notificacion,
  Pago,
  ChatMensaje,
  AlertaEmergencia
} = require('./models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

async function runReset() {
  console.log('🔄 Iniciando la limpieza segura de la base de datos de telemedicina...');
  
  // Abrimos una transacción para garantizar que todo el proceso sea atómico
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Eliminar datos en tablas dependientes respetando integridad referencial
    console.log('🗑️ Eliminando alertas de emergencia (alertas_emergencia)...');
    await AlertaEmergencia.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando mensajes de chat (chat_mensajes)...');
    await ChatMensaje.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando pagos (pagos)...');
    await Pago.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando recetas médicas (recetas)...');
    await Receta.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando notas clínicas (notas_clinicas)...');
    await NotaClinica.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando turnos médicos (turnos)...');
    await Turno.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando documentos médicos de soporte (medico_documentos)...');
    await MedicoDocumento.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando disponibilidades de médicos (disponibilidades)...');
    await Disponibilidad.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando notificaciones del sistema (notificaciones)...');
    await Notificacion.destroy({ where: {}, transaction });

    console.log('🗑️ Eliminando registros de auditoría (audit_logs)...');
    await AuditLog.destroy({ where: {}, transaction });

    // 2. Eliminar todos los usuarios que NO sean admin de la tabla usuarios (User)
    console.log('🗑️ Eliminando usuarios que no tengan el rol "admin"...');
    await User.destroy({
      where: {
        rol: {
          [Op.ne]: 'admin'
        }
      },
      transaction
    });

    // 3. Comprobar si existe el administrador. Si no existe, crearlo
    const adminCount = await User.count({ where: { rol: 'admin' }, transaction });
    
    if (adminCount === 0) {
      console.log('🌱 No se encontró ningún administrador. Creando administrador por defecto...');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@telemedicina.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = await User.create({
        nombre: 'Admin Sistema',
        email: adminEmail,
        password: hashedPassword,
        rol: 'admin',
        estado: 'activo',
        ci: '00000000',
        telefono: '00000000'
      }, { transaction });
      
      console.log(`✅ Administrador inicial creado con éxito: ${adminEmail}`);
    } else {
      console.log(`⭐ Se encontraron ${adminCount} administrador(es) existente(s). Se han conservado intactos.`);
    }

    // 4. Asegurar que las especialidades predeterminadas del sistema estén activadas
    console.log('🌱 Asegurando que las especialidades iniciales estén creadas y activas...');
    const especialidadesIniciales = [
      { nombre: 'Medicina General' },
      { nombre: 'Pediatría' },
      { nombre: 'Cardiología' },
      { nombre: 'Ginecología' },
      { nombre: 'Traumatología' }
    ];

    for (const esp of especialidadesIniciales) {
      const [instance, created] = await Especialidad.findOrCreate({
        where: { nombre: esp.nombre },
        defaults: { estado: true },
        transaction
      });
      
      if (!created && !instance.estado) {
        instance.estado = true;
        await instance.save({ transaction });
        console.log(`❇️ Especialidad "${esp.nombre}" reactivada.`);
      }
    }

    // Confirmamos la transacción
    await transaction.commit();
    console.log('\n✅ LA BASE DE DATOS HA SIDO LIMPIADA Y PREPARADA CON ÉXITO PARA LAS PRUEBAS FINALES.');
    process.exit(0);

  } catch (error) {
    // Si algo falla, revertimos todos los cambios de la transacción
    await transaction.rollback();
    console.error('\n❌ ERROR CRÍTICO durante el proceso de limpieza y restauración:', error);
    process.exit(1);
  }
}

// Ejecutar limpieza
runReset();
