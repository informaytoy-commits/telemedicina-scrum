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

// 4. Cancelar turno (Paciente o Médico)
router.put('/cancelar/:id', verifyToken, checkRole(['paciente', 'medico']), turnoController.cancelarTurno);

module.exports = router;
