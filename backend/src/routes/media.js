const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const driveService = require('../services/drive');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm|raw|cr2|arw|pdf|doc|docx/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato nao suportado'));
  }
});

const FULL_ACCESS_ROLES = ['admin', 'pastoral', 'editor'];

router.get('/', authMiddleware, (req, res) => {
  const db = readDB();
  let media = db.media || [];

  // Voluntario e secretaria so veem arquivos de escalas em que estiveram
  if (!FULL_ACCESS_ROLES.includes(req.user.role)) {
    const escalasDoUsuario = (db.schedules || [])
      .filter(s => s.assignments?.some(a => a.userId === req.user.id))
      .map(s => s.id);
    media = media.filter(m => !m.scheduleId || escalasDoUsuario.includes(m.scheduleId));
  }

  const { scheduleId } = req.query;
  if (scheduleId) media = media.filter(m => m.scheduleId === scheduleId);
  res.json(media);
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const { scheduleId, description } = req.body;
  const db = readDB();

  // Voluntario/secretaria so podem fazer upload em escalas que participaram
  if (!FULL_ACCESS_ROLES.includes(req.user.role) && scheduleId) {
    const schedule = db.schedules?.find(s => s.id === scheduleId);
    const estaEscalado = schedule?.assignments?.some(a => a.userId === req.user.id);
    if (!estaEscalado) return res.status(403).json({ error: 'Voce nao estava escalado neste evento' });
  }

  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  let folderName = 'Geral';

  if (scheduleId) {
    const schedule = db.schedules?.find(s => s.id === scheduleId);
    if (schedule) {
      const data = new Date(schedule.date + 'T12:00:00').toLocaleDateString('pt-BR');
      folderName = data + ' - ' + schedule.title;
      try { folderId = await driveService.getOrCreateFolder(folderName, folderId); }
      catch (e) { console.error('Erro ao criar pasta:', e.message); }
    }
  }

  try {
    const driveFile = await driveService.uploadFile(req.file, folderId);
    const isImage = /jpeg|jpg|png|gif|raw|cr2|arw/i.test(req.file.originalname);
    const isVideo = /mp4|mov|avi|mkv|webm/i.test(req.file.originalname);

    const mediaRecord = {
      id: uuidv4(), name: req.file.originalname,
      driveFileId: driveFile.id, driveUrl: driveFile.webViewLink,
      thumbnailUrl: driveFile.thumbnailLink || null,
      mimeType: req.file.mimetype,
      type: isImage ? 'foto' : isVideo ? 'video' : 'documento',
      size: req.file.size, scheduleId: scheduleId || null,
      folderName, description: description || '',
      uploadedBy: req.user.id, uploaderName: req.user.name,
      createdAt: new Date().toISOString()
    };

    if (!db.media) db.media = [];
    db.media.push(mediaRecord);

    const admins = (db.users || []).filter(u => ['admin', 'pastoral'].includes(u.role));
    admins.forEach(admin => {
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id: uuidv4(), userId: admin.id, type: 'media_upload',
        title: 'Novo arquivo enviado',
        message: req.user.name + ' enviou "' + req.file.originalname + '" para ' + folderName,
        relatedId: mediaRecord.id, read: false, createdAt: new Date().toISOString()
      });
    });

    writeDB(db);
    res.status(201).json(mediaRecord);
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao fazer upload para o Google Drive', details: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin', 'pastoral', 'editor'), async (req, res) => {
  const db = readDB();
  if (!db.media) db.media = [];
  const idx = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Arquivo nao encontrado' });
  try { await driveService.deleteFile(db.media[idx].driveFileId); }
  catch (e) { console.error('Erro ao remover do Drive:', e.message); }
  db.media.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Arquivo removido' });
});

module.exports = router;
