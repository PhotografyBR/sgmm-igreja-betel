const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const driveService = require('../services/drive');

const router = express.Router();

// Multer - armazenamento em memória antes de enviar ao Drive
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm|raw|cr2|arw/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado'));
    }
  }
});

// GET /api/media - listar arquivos
router.get('/', authMiddleware, (req, res) => {
  const db = readDB();
  let media = db.media;

  // Voluntários não veem os arquivos brutos (apenas confirmação de upload)
  if (req.user.role === 'voluntario') {
    media = media.filter(m => m.uploadedBy === req.user.id);
  }

  const { scheduleId, type } = req.query;
  if (scheduleId) media = media.filter(m => m.scheduleId === scheduleId);
  if (type) media = media.filter(m => m.type === type);

  res.json(media);
});

// GET /api/media/folders - listar pastas no Drive
router.get('/folders', authMiddleware, requireRole('admin', 'pastoral'), async (req, res) => {
  try {
    const folders = await driveService.listFolders();
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao acessar Google Drive', details: err.message });
  }
});

// POST /api/media/upload - enviar arquivo para o Drive
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const { scheduleId, description } = req.body;

  const db = readDB();

  // Descobrir/criar pasta do culto no Drive
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  let folderName = 'Geral';

  if (scheduleId) {
    const schedule = db.schedules.find(s => s.id === scheduleId);
    if (schedule) {
      folderName = `${new Date(schedule.date).toLocaleDateString('pt-BR')} - ${schedule.title}`;
      try {
        folderId = await driveService.getOrCreateFolder(folderName, folderId);
      } catch (e) {
        console.error('Erro ao criar pasta no Drive:', e.message);
      }
    }
  }

  try {
    const driveFile = await driveService.uploadFile(req.file, folderId);

    const isImage = /jpeg|jpg|png|gif|raw|cr2|arw/i.test(req.file.originalname);
    const mediaRecord = {
      id: uuidv4(),
      name: req.file.originalname,
      driveFileId: driveFile.id,
      driveUrl: driveFile.webViewLink,
      thumbnailUrl: driveFile.thumbnailLink || null,
      mimeType: req.file.mimetype,
      type: isImage ? 'foto' : 'video',
      size: req.file.size,
      scheduleId: scheduleId || null,
      folderName,
      description: description || '',
      uploadedBy: req.user.id,
      uploaderName: req.user.name,
      createdAt: new Date().toISOString()
    };

    db.media.push(mediaRecord);

    // Notificar admin sobre novo upload
    const admins = db.users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
      db.notifications.push({
        id: uuidv4(),
        userId: admin.id,
        type: 'media_upload',
        title: 'Novo material enviado',
        message: `${req.user.name} enviou "${req.file.originalname}" para ${folderName}`,
        relatedId: mediaRecord.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    });

    writeDB(db);
    res.status(201).json(mediaRecord);

  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao fazer upload para o Google Drive', details: err.message });
  }
});

// DELETE /api/media/:id (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const db = readDB();
  const idx = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Arquivo não encontrado' });

  try {
    await driveService.deleteFile(db.media[idx].driveFileId);
  } catch (e) {
    console.error('Arquivo pode já ter sido removido do Drive:', e.message);
  }

  db.media.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Arquivo removido' });
});

module.exports = router;
