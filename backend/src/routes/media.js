const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const driveService = require('../services/drive');
const { appendLog } = require('../services/activityLog');

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

function tipoDoArquivo(nome) {
  if (/jpeg|jpg|png|gif|raw|cr2|arw/i.test(nome)) return 'foto';
  if (/mp4|mov|avi|mkv|webm/i.test(nome)) return 'video';
  return 'documento';
}

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

// Faz upload de um arquivo para o Drive e devolve o registro de midia (sem salvar no db)
async function processarArquivo(file, { scheduleId, description, folderId, folderName, user }) {
  const driveFile = await driveService.uploadFile(file, folderId);
  return {
    id: uuidv4(),
    name: file.originalname,
    driveFileId: driveFile.id,
    driveUrl: driveFile.webViewLink,
    thumbnailUrl: driveFile.thumbnailLink || null,
    mimeType: file.mimetype,
    type: tipoDoArquivo(file.originalname),
    size: file.size,
    scheduleId: scheduleId || null,
    folderName,
    description: description || '',
    permanent: false,
    uploadedBy: user.id,
    uploaderName: user.name,
    createdAt: new Date().toISOString()
  };
}

// POST /api/media/upload — aceita 1 ou varios arquivos (campo "files"; "file" mantido por compatibilidade)
router.post('/upload', authMiddleware, requirePermission('media.upload'), upload.array('files', 30), async (req, res) => {
  // Compatibilidade: se vier no campo "file" (singular), o multer.any nao pega,
  // entao aceitamos tanto req.files quanto req.file.
  let arquivos = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);
  if (!arquivos.length) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const { scheduleId, description } = req.body;
  const db = readDB();

  // Voluntario/secretaria: upload restrito
  //  - obrigatorio escolher um culto (sem acesso a pasta Geral)
  //  - precisa estar escalado no culto
  //  - so ate 7 dias apos a data do culto
  if (!FULL_ACCESS_ROLES.includes(req.user.role)) {
    if (!scheduleId) {
      return res.status(403).json({ error: 'Selecione o culto relacionado — somente a lideranca envia arquivos gerais' });
    }
    const schedule = db.schedules?.find(s => s.id === scheduleId);
    if (!schedule) return res.status(404).json({ error: 'Culto nao encontrado' });
    const estaEscalado = schedule.assignments?.some(a => a.userId === req.user.id);
    if (!estaEscalado) return res.status(403).json({ error: 'Voce nao estava escalado neste evento' });

    const dataCulto = new Date(schedule.date + 'T12:00:00');
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    const diffDias = Math.round((hoje - dataCulto) / (24 * 60 * 60 * 1000));
    if (diffDias < 0 || diffDias > 7) {
      return res.status(403).json({ error: 'O envio de arquivos so e permitido do dia do culto ate 7 dias depois' });
    }
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

  if (!db.media) db.media = [];
  const enviados = [];
  const falhas = [];

  for (const file of arquivos) {
    try {
      const registro = await processarArquivo(file, { scheduleId, description, folderId, folderName, user: req.user });
      db.media.push(registro);
      enviados.push(registro);
    } catch (err) {
      console.error('Erro no upload de', file.originalname, err.message);
      falhas.push({ name: file.originalname, error: err.message });
    }
  }

  if (enviados.length === 0) {
    return res.status(500).json({ error: 'Erro ao enviar arquivos para o Google Drive', falhas });
  }

  // Notifica admins/pastoral
  const admins = (db.users || []).filter(u => ['admin', 'pastoral'].includes(u.role));
  admins.forEach(admin => {
    if (!db.notifications) db.notifications = [];
    const resumo = enviados.length === 1 ? `"${enviados[0].name}"` : `${enviados.length} arquivos`;
    db.notifications.push({
      id: uuidv4(), userId: admin.id, type: 'media_upload',
      title: 'Novos arquivos enviados',
      message: req.user.name + ' enviou ' + resumo + ' para ' + folderName,
      relatedId: enviados[0].id, read: false, createdAt: new Date().toISOString()
    });
  });

  appendLog(db, req.user, 'upload', `${enviados.length} arquivo(s) em "${folderName}"`);
  writeDB(db);
  res.status(201).json({ enviados, falhas, total: enviados.length });
});

// PATCH /api/media/:id/permanent — marca/desmarca arquivo como permanente (nao some na limpeza)
router.patch('/:id/permanent', authMiddleware, requirePermission('media.upload'), (req, res) => {
  const db = readDB();
  if (!db.media) db.media = [];
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Arquivo nao encontrado' });

  item.permanent = typeof req.body.permanent === 'boolean' ? req.body.permanent : !item.permanent;
  writeDB(db);
  res.json({ id: item.id, permanent: item.permanent });
});

router.delete('/:id', authMiddleware, requirePermission('media.upload'), async (req, res) => {
  const db = readDB();
  if (!db.media) db.media = [];
  const idx = db.media.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Arquivo nao encontrado' });
  try { await driveService.deleteFile(db.media[idx].driveFileId); }
  catch (e) { console.error('Erro ao remover do Drive:', e.message); }
  const nomeRemovido = db.media[idx].name;
  db.media.splice(idx, 1);
  appendLog(db, req.user, 'midia_removida', nomeRemovido);
  writeDB(db);
  res.json({ message: 'Arquivo removido' });
});

module.exports = router;

