const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidadController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Validar que el usuario esté autenticado
router.use(verifyToken);

// Rutas para el médico
router.get('/mis-horarios', checkRole(['medico']), disponibilidadController.listarMisDisponibilidades);

// Rutas para la recepcionista
router.get('/medico/:medicoId', checkRole(['recepcionista', 'paciente']), disponibilidadController.listarDisponibilidadPorMedico);
router.post('/', checkRole(['recepcionista']), disponibilidadController.crearDisponibilidad);
router.put('/:id', checkRole(['recepcionista']), disponibilidadController.editarDisponibilidad);
router.delete('/:id', checkRole(['recepcionista']), disponibilidadController.eliminarDisponibilidad);

module.exports = router;
