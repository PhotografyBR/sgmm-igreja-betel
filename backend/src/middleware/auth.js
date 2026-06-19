const jwt = require('jsonwebtoken');
const { readDB } = require('../config/database');
const { resolvePermissions } = require('../config/permissions');

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

    const permissions = resolvePermissions(user, db.groups || []);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      groupId: user.groupId || null,
      permissions,
    };
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

// Checagem por permissao granular. O admin (master) sempre passa.
function requirePermission(...keys) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const perms = req.user.permissions || [];
    const ok = keys.some(k => perms.includes(k));
    if (!ok) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação' });
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

module.exports = { authMiddleware, requireRole, requirePermission, ROLES };
