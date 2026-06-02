const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { getResumenAdmin, getMedicosPendientes, aprobarMedico, rechazarMedico, getLogsSistema, getUsuarios, crearRecepcionista, actualizarUsuario, eliminarUsuario, getTurnos, resetPassword, getReportes } = require('../controllers/adminController');

// Todas las rutas en este archivo requerirán que el usuario sea 'admin'
router.use(verifyToken, checkRole(['admin']));

router.get('/resumen', getResumenAdmin);
router.get('/medicos-pendientes', getMedicosPendientes);
router.get('/logs', getLogsSistema);
router.put('/aprobar/:id', aprobarMedico);
router.put('/rechazar/:id', rechazarMedico);
router.get('/reportes', getReportes);

// Gestión de usuarios
router.get('/usuarios', getUsuarios);
router.post('/usuarios/recepcionista', upload.single('foto'), crearRecepcionista);
router.put('/usuarios/:id', upload.single('foto'), actualizarUsuario);
router.put('/usuarios/:id/reset-password', resetPassword);
router.delete('/usuarios/:id', eliminarUsuario);

// Gestión de turnos
router.get('/turnos', getTurnos);

// Gestión de especialidades
const {
  getEspecialidades,
  crearEspecialidad,
  actualizarEspecialidad,
  toggleEstadoEspecialidad
} = require('../controllers/especialidadController');

router.get('/especialidades', getEspecialidades);
router.post('/especialidades', crearEspecialidad);
router.put('/especialidades/:id', actualizarEspecialidad);
router.delete('/especialidades/:id', toggleEstadoEspecialidad);

module.exports = router;
