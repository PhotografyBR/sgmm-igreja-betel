const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requirePermission('users.view', 'users.manage'), (req, res) => {
  const db = readDB();
  const users = db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, groupId: u.groupId || null, phone: u.phone, createdAt: u.createdAt }));
  res.json(users);
});

router.get('/voluntarios', authMiddleware, requirePermission('users.view', 'users.manage', 'schedules.manage'), (req, res) => {
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

router.post('/', authMiddleware, requirePermission('users.manage'), async (req, res) => {
  const { name, email, password, role, phone, groupId } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Nome, email, senha e perfil sao obrigatorios' });
  const validRoles = ['admin', 'pastoral', 'secretaria', 'voluntario', 'editor'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Perfil invalido' });
  // So o admin pode criar outra conta admin
  if (role === 'admin' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Apenas o admin pode criar contas admin' });
  const db = readDB();
  if (db.users.find(u => u.email === email.toLowerCase())) return res.status(400).json({ error: 'Email ja cadastrado' });
  const hashedPassword = await bcrypt.hash(password, 10);
  let finalGroupId = null;
  if (groupId) {
    const grp = (db.groups || []).find(g => g.id === groupId);
    if (!grp) return res.status(400).json({ error: 'Grupo invalido' });
    finalGroupId = groupId;
  }
  const newUser = { id: uuidv4(), name, email: email.toLowerCase(), password: hashedPassword, role, groupId: finalGroupId, phone: phone || '', createdAt: new Date().toISOString() };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, groupId: newUser.groupId, phone: newUser.phone });
});

router.put('/:id', authMiddleware, requirePermission('users.manage'), async (req, res) => {
  const { name, email, role, phone, password, groupId } = req.body;
  const validRoles = ['admin', 'pastoral', 'secretaria', 'voluntario', 'editor'];
  if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Perfil invalido' });
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario nao encontrado' });
  // Contas admin (e promocao a admin) so podem ser mexidas por outro admin
  if ((db.users[idx].role === 'admin' || role === 'admin') && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Apenas o admin pode alterar contas admin' });
  if (name) db.users[idx].name = name;
  if (email) db.users[idx].email = email.toLowerCase();
  if (role) db.users[idx].role = role;
  if (phone !== undefined) db.users[idx].phone = phone;
  if (password) db.users[idx].password = await bcrypt.hash(password, 10);
  if (groupId !== undefined) {
    if (!groupId) { db.users[idx].groupId = null; }
    else {
      const grp = (db.groups || []).find(g => g.id === groupId);
      if (!grp) return res.status(400).json({ error: 'Grupo invalido' });
      db.users[idx].groupId = groupId;
    }
  }
  writeDB(db);
  res.json({ message: 'Usuario atualizado' });
});

router.delete('/:id', authMiddleware, requirePermission('users.manage'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Voce nao pode remover sua propria conta' });
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (db.users[idx].role === 'admin' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Apenas o admin pode remover contas admin' });
  db.users.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Usuario removido' });
});

module.exports = router;
