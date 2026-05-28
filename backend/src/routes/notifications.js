const express = require('express');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - notificações do usuário logado
router.get('/', authMiddleware, (req, res) => {
  const db = readDB();
  const notifications = db.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50); // últimas 50

  res.json(notifications);
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, (req, res) => {
  const db = readDB();
  const count = db.notifications.filter(n => n.userId === req.user.id && !n.read).length;
  res.json({ count });
});

// PUT /api/notifications/:id/read - marcar como lida
router.put('/:id/read', authMiddleware, (req, res) => {
  const db = readDB();
  const idx = db.notifications.findIndex(n => n.id === req.params.id && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Notificação não encontrada' });

  db.notifications[idx].read = true;
  writeDB(db);
  res.json({ message: 'Marcada como lida' });
});

// PUT /api/notifications/read-all - marcar todas como lidas
router.put('/read-all', authMiddleware, (req, res) => {
  const db = readDB();
  db.notifications
    .filter(n => n.userId === req.user.id && !n.read)
    .forEach(n => { n.read = true; });

  writeDB(db);
  res.json({ message: 'Todas as notificações marcadas como lidas' });
});

module.exports = router;
