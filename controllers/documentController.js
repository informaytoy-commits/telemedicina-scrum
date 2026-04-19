const { MedicoDocumento, User } = require('../models');

// Función subida de documento (solo médicos)
const subirDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe subir un archivo válido (PDF o Imagen, max 5MB).' });
    }

    // req.user viene del middleware verifyToken
    const userId = req.user.id;
    
    const newDocument = await MedicoDocumento.create({
      userId: userId,
      archivo: req.file.path,
      estado: 'Pendiente'
    });

    res.status(201).json({ 
      message: 'Documento subido con éxito.', 
      documento: newDocument 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir el documento.', detalle: error.message });
  }
};

// Función listar documentos (solo admin)
const listarDocumentos = async (req, res) => {
  try {
    const documentos = await MedicoDocumento.findAll({
      include: [{ 
        model: User, 
        as: 'medico', // Usamos el alias que declaramos en la relación
        attributes: ['id', 'nombre', 'email'] 
      }]
    });
    res.json(documentos);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar los documentos.', detalle: error.message });
  }
};

// Función validar documento (solo admin)
const validarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Verificado', 'Rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado de validación inválido. Opciones válidas: Verificado, Rechazado.' });
    }

    const documento = await MedicoDocumento.findByPk(id);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    documento.estado = estado;
    await documento.save();

    res.json({ message: `Documento marcado como ${estado}.`, documento });
  } catch (error) {
    res.status(500).json({ error: 'Error al validar el documento.', detalle: error.message });
  }
};

module.exports = {
  subirDocumento,
  listarDocumentos,
  validarDocumento
};
