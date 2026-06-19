const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { resolvePermissions } = require('../config/permissions');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const db = readDB();
  const user = db.users.find(u => u.email === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'sgmm_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId || null,
      phone: user.phone,
      permissions: resolvePermissions(user, db.groups || [])
    }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    groupId: user.groupId || null,
    phone: user.phone,
    permissions: resolvePermissions(user, db.groups || [])
  });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(currentPassword, db.users[userIndex].password);
  if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });

  db.users[userIndex].password = await bcrypt.hash(newPassword, 10);
  writeDB(db);

  res.json({ message: 'Senha alterada com sucesso' });
});

// PUT /api/auth/update-profile - atualizar próprio perfil (nome, email, telefone)
router.put('/update-profile', authMiddleware, async (req, res) => {
  const { name, email, phone } = req.body;
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Verifica se o novo email já está em uso por outro usuário
  if (email && email.toLowerCase() !== db.users[userIndex].email) {
    const emailExists = db.users.find(u => u.email === email.toLowerCase() && u.id !== req.user.id);
    if (emailExists) return res.status(400).json({ error: 'Este email já está em uso' });
    db.users[userIndex].email = email.toLowerCase();
  }

  if (name) db.users[userIndex].name = name;
  if (phone !== undefined) db.users[userIndex].phone = phone;

  writeDB(db);

  res.json({
    id: db.users[userIndex].id,
    name: db.users[userIndex].name,
    email: db.users[userIndex].email,
    role: db.users[userIndex].role,
    phone: db.users[userIndex].phone
  });
});

module.exports = router;
