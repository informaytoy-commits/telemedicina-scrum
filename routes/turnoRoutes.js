const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Validaciones y middlewares requeridos
// 1. Reservar turno (Solo paciente)
router.post('/reservar', verifyToken, checkRole(['paciente']), turnoController.reservarTurno);

// 2. Listar turnos del paciente (Solo paciente)
router.get('/mis-turnos', verifyToken, checkRole(['paciente']), turnoController.listarMisTurnosPaciente);

// 3. Listar turnos del médico (Solo médico)
router.get('/medico', verifyToken, checkRole(['medico']), turnoController.listarTurnosMedico);

// 3.5 Listar turnos por médico (Recepcionista)
router.get('/medico/:medicoId', verifyToken, checkRole(['recepcionista']), turnoController.listarTurnosPorMedico);

// 4. Cancelar turno (Paciente o Médico)
router.put('/cancelar/:id', verifyToken, checkRole(['paciente', 'medico']), turnoController.cancelarTurno);

// 5. Marcar turno como atendido (Solo Médico)
router.put('/atender/:id', verifyToken, checkRole(['medico']), turnoController.atenderTurno);

// 5.5 Iniciar consulta médica (Solo Médico)
router.put('/iniciar-consulta/:id', verifyToken, checkRole(['medico']), turnoController.iniciarConsulta);

// 6. Confirmar llegada (Solo Recepcionista)
router.put('/confirmar-llegada/:id', verifyToken, checkRole(['recepcionista']), turnoController.confirmarLlegada);

// 7. Reprogramar turno (Solo Recepcionista)
router.put('/reprogramar/:id', verifyToken, checkRole(['recepcionista']), turnoController.reprogramarTurno);

// 8. Solicitar triaje (Solo Paciente)
router.post('/solicitar-triaje/:id', verifyToken, checkRole(['paciente']), turnoController.solicitarTriaje);

module.exports = router;
