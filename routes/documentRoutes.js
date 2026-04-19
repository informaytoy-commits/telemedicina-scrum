const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Función que envuelve a multer para retornar en formato JSON cualquier error que ocurra (e.g. peso o tipo de archivo)
const uploadFileMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('archivo_medico');

  uploadSingle(req, res, (err) => {
    if (err) {
      // Manejar el error local proviniendo desde el fileFilter o limits de Multer
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Rutas 
// POST /api/documentos/subir-documento (solo médico)
router.post('/subir-documento', verifyToken, checkRole(['medico']), uploadFileMiddleware, documentController.subirDocumento);

// GET /api/documentos (solo admin)
router.get('/', verifyToken, checkRole(['admin']), documentController.listarDocumentos);

// PUT /api/documentos/validar-documento/:id (solo admin)
router.put('/validar-documento/:id', verifyToken, checkRole(['admin']), documentController.validarDocumento);

module.exports = router;
