const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const upload = require('../middlewares/uploadMiddleware');

// Definición de las rutas públicas de autenticación
router.post('/register', upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'documento', maxCount: 1 }]), register);
router.post('/login', login);

module.exports = router;
