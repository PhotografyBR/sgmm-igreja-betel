const express = require('express');
const { readDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/logs — somente o admin master.
// Query params: days (padrao 30), userId, limit (padrao 500, max 1000)
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
  const db = readDB();
  let logs = db.activityLog || [];

  const dias = parseInt(req.query.days, 10) || 30;
  const corte = Date.now() - dias * 24 * 60 * 60 * 1000;
  logs = logs.filter(l => new Date(l.at).getTime() >= corte);

  if (req.query.userId) {
    logs = logs.filter(l => l.userId === req.query.userId);
  }

  // Mais recentes primeiro
  logs = [...logs].reverse();

  // Resumo por usuario: total de acoes e ultimo acesso no periodo
  const resumo = {};
  for (const l of logs) {
    if (!resumo[l.userId]) {
      resumo[l.userId] = { userId: l.userId, userName: l.userName, role: l.role, acoes: 0, ultimoAcesso: l.at };
    }
    resumo[l.userId].acoes += 1;
    if (l.at > resumo[l.userId].ultimoAcesso) resumo[l.userId].ultimoAcesso = l.at;
  }

  const max = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
  res.json({
    dias,
    total: logs.length,
    usuarios: Object.values(resumo).sort((a, b) => (a.ultimoAcesso < b.ultimoAcesso ? 1 : -1)),
    logs: logs.slice(0, max)
  });
});

module.exports = router;
