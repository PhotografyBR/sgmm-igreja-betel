const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

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
      phone: user.phone
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
    phone: user.phone
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

module.exports = router;
