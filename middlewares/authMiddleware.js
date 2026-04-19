const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // El header usualmente es: "Bearer M1T0k3N"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token autenticado.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'secreto_temporal';
    const decoded = jwt.verify(token, secret);
    
    // Guardar los datos del usuario en la request (req.user) para ser usado en el controlador después
    req.user = decoded;
    next(); // Continuar a la ruta protegida
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o ha expirado.' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    // Se asume que en req.user viene el payload del JWT con el rol
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ error: 'Permisos insuficientes o token sin rol válido.' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}` });
    }
    
    next();
  };
};

module.exports = { verifyToken, checkRole };
