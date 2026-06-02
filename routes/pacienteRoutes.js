const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { getHistorial } = require('../controllers/pacienteController');

// Rutas de paciente (requieren token y rol paciente)
router.use(verifyToken, checkRole(['paciente']));

router.get('/historial', getHistorial);

module.exports = router;
