const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidadController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Validar que en todas estas rutas solo los médicos interactúen
router.use(verifyToken, checkRole(['medico']));

// Rutas apuntando a /api/disponibilidad...
router.post('/', disponibilidadController.crearDisponibilidad);
router.get('/mis-horarios', disponibilidadController.listarMisDisponibilidades);
router.put('/:id', disponibilidadController.editarDisponibilidad);
router.delete('/:id', disponibilidadController.eliminarDisponibilidad);

module.exports = router;
