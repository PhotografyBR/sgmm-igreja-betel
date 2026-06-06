const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin', 'pastoral', 'secretaria'), (req, res) => {
  const db = readDB();
  const users = db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt }));
  res.json(users);
});

router.get('/voluntarios', authMiddleware, requireRole('admin', 'secretaria'), (req, res) => {
  const db = readDB();
  const lista = db.users
    .filter(u => ['voluntario', 'admin', 'pastoral', 'secretaria', 'editor'].includes(u.role))
    .map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(lista);
});

router.get('/equipe', authMiddleware, (req, res) => {
  const db = readDB();
  const lista = db.users
    .filter(u => ['voluntario', 'admin', 'pastoral', 'secretaria', 'editor'].includes(u.role))
    .map(u => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(lista);
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Nome, email, senha e perfil sao obrigatorios' });
  const validRoles = ['admin', 'pastoral', 'secretaria', 'voluntario', 'editor'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Perfil invalido' });
  const db = readDB();
  if (db.users.find(u => u.email === email.toLowerCase())) return res.status(400).json({ error: 'Email ja cadastrado' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: uuidv4(), name, email: email.toLowerCase(), password: hashedPassword, role, phone: phone || '', createdAt: new Date().toISOString() };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone });
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, email, role, phone, password } = req.body;
  const validRoles = ['admin', 'pastoral', 'secretaria', 'voluntario', 'editor'];
  if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Perfil invalido' });
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (name) db.users[idx].name = name;
  if (email) db.users[idx].email = email.toLowerCase();
  if (role) db.users[idx].role = role;
  if (phone !== undefined) db.users[idx].phone = phone;
  if (password) db.users[idx].password = await bcrypt.hash(password, 10);
  writeDB(db);
  res.json({ message: 'Usuario atualizado' });
});

router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Voce nao pode remover sua propria conta' });
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario nao encontrado' });
  db.users.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Usuario removido' });
});

module.exports = router;
