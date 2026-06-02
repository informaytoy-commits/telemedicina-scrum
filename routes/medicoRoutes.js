const express = require('express');
const { buscarMedicos, obtenerEspecialidades } = require('../controllers/medicoController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/medicos/especialidades
// Accesible solo por rol 'paciente'
router.get('/especialidades', verifyToken, checkRole(['paciente']), obtenerEspecialidades);

// GET /api/medicos
// Accesible por rol 'paciente' y 'recepcionista'
router.get('/', verifyToken, checkRole(['paciente', 'recepcionista']), buscarMedicos);

// Modulo clinico
const { agregarNotaClinica, obtenerNotasPaciente, generarReceta, obtenerRecetasPaciente } = require('../controllers/medicoController');

// POST /api/medicos/notas
router.post('/notas', verifyToken, checkRole(['medico']), agregarNotaClinica);

// GET /api/medicos/notas/:pacienteId
router.get('/notas/:pacienteId', verifyToken, checkRole(['medico']), obtenerNotasPaciente);

// POST /api/medicos/recetas
router.post('/recetas', verifyToken, checkRole(['medico']), generarReceta);

// GET /api/medicos/recetas/:pacienteId
router.get('/recetas/:pacienteId', verifyToken, checkRole(['medico']), obtenerRecetasPaciente);

module.exports = router;
