const express = require('express');
const router = express.Router();
const { getEspecialidades } = require('../controllers/especialidadController');

// GET /api/especialidades (público)
router.get('/', getEspecialidades);

module.exports = router;
