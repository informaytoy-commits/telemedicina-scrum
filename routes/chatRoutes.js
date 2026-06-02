const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/', chatController.enviarMensaje);
router.get('/:turnoId', chatController.obtenerMensajesPorTurno);
router.put('/atender/:turnoId', chatController.marcarChatAtendido);

module.exports = router;
