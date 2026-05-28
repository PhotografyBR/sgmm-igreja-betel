const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - listar todos (admin/pastoral)
router.get('/', authMiddleware, requireRole('admin', 'pastoral', 'secretaria'), (req, res) => {
  const db = readDB();
  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    createdAt: u.createdAt
  }));
  res.json(users);
});

// GET /api/users/voluntarios - listar só voluntários
router.get('/voluntarios', authMiddleware, requireRole('admin', 'secretaria'), (req, res) => {
  const db = readDB();
  const vols = db.users
    .filter(u => u.role === 'voluntario')
    .map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone }));
  res.json(vols);
});

// POST /api/users - criar usuário (admin)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nome, email, senha e perfil são obrigatórios' });
  }

  const validRoles = ['admin', 'pastoral', 'secretaria', 'voluntario'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }

  const db = readDB();
  const exists = db.users.find(u => u.email === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    phone: phone || '',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    phone: newUser.phone
  });
});

// PUT /api/users/:id - editar usuário (admin)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, email, role, phone, password } = req.body;
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);

  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (name) db.users[idx].name = name;
  if (email) db.users[idx].email = email.toLowerCase();
  if (role) db.users[idx].role = role;
  if (phone !== undefined) db.users[idx].phone = phone;
  if (password) db.users[idx].password = await bcrypt.hash(password, 10);

  writeDB(db);
  res.json({ message: 'Usuário atualizado' });
});

// DELETE /api/users/:id - remover usuário (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode remover sua própria conta' });
  }

  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  db.users.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Usuário removido' });
});

module.exports = router;
