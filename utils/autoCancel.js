const { Turno, Pago } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene la fecha y hora actual en la zona horaria del sistema (o forzada a America/La_Paz si está en UTC).
 */
const getLocalNow = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/La_Paz',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const val = (type) => parts.find(p => p.type === type).value;
    return new Date(
      parseInt(val('year'), 10),
      parseInt(val('month'), 10) - 1,
      parseInt(val('day'), 10),
      parseInt(val('hour'), 10),
      parseInt(val('minute'), 10),
      parseInt(val('second'), 10)
    );
  } catch (e) {
    return new Date();
  }
};

/**
 * Revisa todos los turnos con estado 'Reservado' o 'Confirmado' que no han iniciado consulta.
 * Si su hora de finalización ya pasó, los cancela automáticamente y marca su pago como 'pendiente'.
 */
const cancelarTurnosVencidos = async () => {
  try {
    const turnos = await Turno.findAll({
      where: {
        estado: {
          [Op.in]: ['Reservado', 'Confirmado']
        },
        consulta_iniciada: false
      }
    });

    const now = getLocalNow();
    let canceladosCount = 0;

    for (const t of turnos) {
      // Combinar fecha_reserva y hora_fin
      const [hours, minutes, seconds] = t.hora_fin.split(':');
      const [year, month, day] = t.fecha_reserva.split('-');
      const fechaFin = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        seconds ? parseInt(seconds, 10) : 0
      );

      if (fechaFin < now) {
        // El horario del turno ya pasó y la consulta nunca fue iniciada por el médico.
        t.estado = 'Cancelado';
        t.auto_cancelado = true;
        await t.save();

        // Buscar el pago asociado y marcarlo como pendiente (no cobrado)
        const pago = await Pago.findOne({ where: { turnoId: t.id } });
        if (pago) {
          pago.estado = 'pendiente';
          await pago.save();
        }
        canceladosCount++;
      }
    }

    if (canceladosCount > 0) {
      console.log(`[AUTO-CANCEL] Se cancelaron automáticamente ${canceladosCount} turnos vencidos.`);
    }
  } catch (error) {
    console.error('❌ Error en el proceso de auto-cancelación de turnos vencidos:', error);
  }
};

module.exports = {
  cancelarTurnosVencidos,
  getLocalNow
};
