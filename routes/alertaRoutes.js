const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Paciente crea alerta
router.post('/', checkRole(['paciente']), alertaController.crearAlerta);

// Admin / Médico listan alertas
router.get('/', checkRole(['admin', 'medico']), alertaController.listarAlertas);

// Admin / Médico actualizan estado de alerta
router.put('/:id', checkRole(['admin', 'medico']), alertaController.actualizarAlerta);

module.exports = router;
