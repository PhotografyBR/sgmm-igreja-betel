const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { runBackup } = require('../services/backup');
const { readDBAsync } = require('../config/database');

const router = express.Router();

// GET /api/admin/backup — faz download do banco em JSON (somente admin)
router.get('/backup', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const db = await readDBAsync();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sgmm-backup-${timestamp}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar backup: ' + err.message });
  }
});

// POST /api/admin/backup — força um backup manual para o Drive (somente admin)
router.post('/backup', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    await runBackup();
    res.json({ message: 'Backup executado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao executar backup: ' + err.message });
  }
});

module.exports = router;
