const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { getResumenAdmin, getMedicosPendientes, aprobarMedico, rechazarMedico, getLogsSistema } = require('../controllers/adminController');

// Todas las rutas en este archivo requerirán que el usuario sea 'admin'
router.use(verifyToken, checkRole(['admin']));

router.get('/resumen', getResumenAdmin);
router.get('/medicos-pendientes', getMedicosPendientes);
router.get('/logs', getLogsSistema);
router.put('/aprobar/:id', aprobarMedico);
router.put('/rechazar/:id', rechazarMedico);

module.exports = router;
