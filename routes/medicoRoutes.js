const express = require('express');
const { buscarMedicos } = require('../controllers/medicoController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/medicos
// Accesible solo por rol 'paciente'
router.get('/', verifyToken, checkRole(['paciente']), buscarMedicos);

module.exports = router;
