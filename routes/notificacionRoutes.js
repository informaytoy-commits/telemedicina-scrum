const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { getNotificaciones, marcarLeida, crearNotificacion } = require('../controllers/notificacionController');

// Todas las rutas requieren token
router.use(verifyToken);

router.get('/', getNotificaciones);
router.post('/', crearNotificacion); // Para uso interno o tests
router.put('/:id/leida', marcarLeida);

module.exports = router;
