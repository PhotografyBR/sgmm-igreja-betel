const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { PERMISSIONS, ALL_KEYS } = require('../config/permissions');

const router = express.Router();

// GET /api/groups/catalog - catálogo de permissões disponíveis (para montar a tela)
router.get('/catalog', authMiddleware, (req, res) => {
  res.json({ permissions: PERMISSIONS });
});

// GET /api/groups - listar grupos
router.get('/', authMiddleware, requirePermission('groups.manage'), (req, res) => {
  const db = readDB();
  const groups = (db.groups || []).map(g => ({
    ...g,
    memberCount: db.users.filter(u => u.groupId === g.id).length,
  }));
  res.json(groups);
});

// POST /api/groups - criar grupo
router.post('/', authMiddleware, requirePermission('groups.manage'), (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Dê um nome ao grupo' });
  }

  const perms = Array.isArray(permissions) ? permissions.filter(k => ALL_KEYS.includes(k)) : [];

  const db = readDB();
  if (!db.groups) db.groups = [];

  const exists = db.groups.find(g => g.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Já existe um grupo com esse nome' });
  }

  const group = {
    id: uuidv4(),
    name: name.trim(),
    description: (description || '').trim(),
    permissions: perms,
    createdAt: new Date().toISOString(),
  };

  db.groups.push(group);
  writeDB(db);
  res.status(201).json(group);
});

// PUT /api/groups/:id - editar grupo
router.put('/:id', authMiddleware, requirePermission('groups.manage'), (req, res) => {
  const { name, description, permissions } = req.body;
  const db = readDB();
  if (!db.groups) db.groups = [];

  const idx = db.groups.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grupo não encontrado' });

  if (name && name.trim()) {
    const dup = db.groups.find(g => g.name.toLowerCase() === name.trim().toLowerCase() && g.id !== req.params.id);
    if (dup) return res.status(400).json({ error: 'Já existe um grupo com esse nome' });
    db.groups[idx].name = name.trim();
  }
  if (description !== undefined) db.groups[idx].description = description.trim();
  if (Array.isArray(permissions)) {
    db.groups[idx].permissions = permissions.filter(k => ALL_KEYS.includes(k));
  }

  writeDB(db);
  res.json(db.groups[idx]);
});

// DELETE /api/groups/:id - remover grupo (desvincula os usuários)
router.delete('/:id', authMiddleware, requirePermission('groups.manage'), (req, res) => {
  const db = readDB();
  if (!db.groups) db.groups = [];

  const idx = db.groups.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Grupo não encontrado' });

  // Desvincula usuários que estavam nesse grupo (voltam ao padrão do role)
  db.users.forEach(u => { if (u.groupId === req.params.id) u.groupId = null; });

  db.groups.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Grupo removido' });
});

module.exports = router;
