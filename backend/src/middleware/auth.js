const jwt = require('jsonwebtoken');
const { readDB } = require('../config/database');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sgmm_secret_key');
    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado para seu perfil' });
    }
    next();
  };
}

// Roles: admin, pastoral, secretaria, voluntario
const ROLES = {
  ADMIN: 'admin',
  PASTORAL: 'pastoral',
  SECRETARIA: 'secretaria',
  VOLUNTARIO: 'voluntario'
};

module.exports = { authMiddleware, requireRole, ROLES };
