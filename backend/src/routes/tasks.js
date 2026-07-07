const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const driveService = require('../services/drive');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Quem pode mexer nos anexos de uma tarefa
function podeAnexar(task, user) {
  return ['admin', 'pastoral'].includes(user.role)
    || task.assignedTo === user.id
    || task.createdBy === user.id;
}

const VALID_STATUS = ['pendente', 'em_andamento', 'aguardando_revisao', 'concluido'];
const VALID_PRIORITY = ['baixa', 'media', 'alta', 'urgente'];

// GET /api/tasks
router.get('/', authMiddleware, (req, res) => {
  const db = readDB();
  let tasks = db.tasks;

  // Voluntários só veem tarefas atribuídas a eles
  if (req.user.role === 'voluntario') {
    tasks = tasks.filter(t => t.assignedTo === req.user.id || t.createdBy === req.user.id);
  }

  // Filtros opcionais
  const { status, priority, assignedTo } = req.query;
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === assignedTo);

  // Enriquecer com nome do responsável
  const enriched = tasks.map(t => {
    const assignee = db.users.find(u => u.id === t.assignedTo);
    const creator = db.users.find(u => u.id === t.createdBy);
    return {
      ...t,
      assigneeName: assignee ? assignee.name : null,
      creatorName: creator ? creator.name : null
    };
  });

  res.json(enriched);
});

// GET /api/tasks/:id
router.get('/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

  if (req.user.role === 'voluntario' && task.assignedTo !== req.user.id && task.createdBy !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  res.json(task);
});

// POST /api/tasks - criar tarefa (quem tem permissão tasks.manage)
router.post('/', authMiddleware, requirePermission('tasks.manage'), (req, res) => {
  const { title, description, assignedTo, dueDate, priority, relatedScheduleId } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({ error: 'Título e responsável são obrigatórios' });
  }

  const db = readDB();

  const assignee = db.users.find(u => u.id === assignedTo);
  if (!assignee) return res.status(400).json({ error: 'Usuário responsável não encontrado' });

  const newTask = {
    id: uuidv4(),
    title,
    description: description || '',
    assignedTo,
    createdBy: req.user.id,
    status: 'pendente',
    priority: VALID_PRIORITY.includes(priority) ? priority : 'media',
    dueDate: dueDate || null,
    relatedScheduleId: relatedScheduleId || null,
    comments: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.tasks.push(newTask);

  // Notificar o responsável
  db.notifications.push({
    id: uuidv4(),
    userId: assignedTo,
    type: 'task',
    title: 'Nova Tarefa',
    message: `Você recebeu a tarefa: "${title}"${dueDate ? ` - Prazo: ${new Date(dueDate).toLocaleDateString('pt-BR')}` : ''}`,
    relatedId: newTask.id,
    read: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json(newTask);
});

// PUT /api/tasks/:id - editar tarefa
router.put('/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const task = db.tasks[idx];

  // Voluntários só podem atualizar o status de tarefas deles
  if (req.user.role === 'voluntario') {
    if (task.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const { status } = req.body;
    if (status && VALID_STATUS.includes(status)) {
      db.tasks[idx].status = status;

      // Notificar o criador quando mudar para aguardando revisão
      if (status === 'aguardando_revisao') {
        db.notifications.push({
          id: uuidv4(),
          userId: task.createdBy,
          type: 'task_review',
          title: 'Tarefa aguardando revisão',
          message: `"${task.title}" foi enviada para revisão por ${req.user.name}`,
          relatedId: task.id,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  } else {
    const { title, description, assignedTo, dueDate, priority, status } = req.body;
    if (title) db.tasks[idx].title = title;
    if (description !== undefined) db.tasks[idx].description = description;
    if (assignedTo) db.tasks[idx].assignedTo = assignedTo;
    if (dueDate !== undefined) db.tasks[idx].dueDate = dueDate;
    if (priority && VALID_PRIORITY.includes(priority)) db.tasks[idx].priority = priority;
    if (status && VALID_STATUS.includes(status)) db.tasks[idx].status = status;
  }

  db.tasks[idx].updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(db.tasks[idx]);
});

// POST /api/tasks/:id/comment - adicionar comentário
router.post('/:id/comment', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comentário não pode ser vazio' });

  const db = readDB();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const comment = {
    id: uuidv4(),
    userId: req.user.id,
    userName: req.user.name,
    text,
    createdAt: new Date().toISOString()
  };

  db.tasks[idx].comments.push(comment);
  db.tasks[idx].updatedAt = new Date().toISOString();
  writeDB(db);

  res.status(201).json(comment);
});

// DELETE /api/tasks/:id (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

  db.tasks.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Tarefa removida' });
});

// POST /api/tasks/:id/attachments/link — vincula um arquivo ja existente no repositorio
router.post('/:id/attachments/link', authMiddleware, (req, res) => {
  const { mediaId } = req.body;
  if (!mediaId) return res.status(400).json({ error: 'mediaId e obrigatorio' });

  const db = readDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' });
  if (!podeAnexar(task, req.user)) return res.status(403).json({ error: 'Acesso negado' });

  const arquivo = (db.media || []).find(m => m.id === mediaId);
  if (!arquivo) return res.status(404).json({ error: 'Arquivo nao encontrado no repositorio' });

  if (!task.attachments) task.attachments = [];
  if (task.attachments.some(a => a.mediaId === mediaId)) {
    return res.status(409).json({ error: 'Este arquivo ja esta anexado' });
  }

  const anexo = {
    id: uuidv4(),
    origem: 'repositorio',
    mediaId: arquivo.id,
    name: arquivo.name,
    driveUrl: arquivo.driveUrl,
    thumbnailUrl: arquivo.thumbnailUrl || null,
    mimeType: arquivo.mimeType,
    type: arquivo.type,
    addedBy: req.user.name,
    createdAt: new Date().toISOString()
  };
  task.attachments.push(anexo);
  task.updatedAt = new Date().toISOString();
  writeDB(db);
  res.status(201).json(anexo);
});

// POST /api/tasks/:id/attachments/upload — envia um arquivo novo direto para a tarefa
router.post('/:id/attachments/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const db = readDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' });
  if (!podeAnexar(task, req.user)) return res.status(403).json({ error: 'Acesso negado' });

  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  try { folderId = await driveService.getOrCreateFolder('Tarefas', folderId); }
  catch (e) { console.error('Erro ao criar pasta Tarefas:', e.message); }

  try {
    const driveFile = await driveService.uploadFile(req.file, folderId);
    if (!task.attachments) task.attachments = [];
    const anexo = {
      id: uuidv4(),
      origem: 'upload',
      driveFileId: driveFile.id,
      name: req.file.originalname,
      driveUrl: driveFile.webViewLink,
      thumbnailUrl: driveFile.thumbnailLink || null,
      mimeType: req.file.mimetype,
      type: /jpeg|jpg|png|gif/i.test(req.file.originalname) ? 'foto'
          : /mp4|mov|avi|mkv|webm/i.test(req.file.originalname) ? 'video' : 'documento',
      size: req.file.size,
      addedBy: req.user.name,
      createdAt: new Date().toISOString()
    };
    task.attachments.push(anexo);
    task.updatedAt = new Date().toISOString();
    writeDB(db);
    res.status(201).json(anexo);
  } catch (err) {
    console.error('Erro no upload do anexo:', err);
    res.status(500).json({ error: 'Erro ao enviar para o Google Drive', details: err.message });
  }
});

// DELETE /api/tasks/:id/attachments/:attId — remove o vinculo do anexo (Drive preservado)
router.delete('/:id/attachments/:attId', authMiddleware, (req, res) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' });
  if (!podeAnexar(task, req.user)) return res.status(403).json({ error: 'Acesso negado' });

  if (!task.attachments) task.attachments = [];
  const antes = task.attachments.length;
  task.attachments = task.attachments.filter(a => a.id !== req.params.attId);
  if (task.attachments.length === antes) return res.status(404).json({ error: 'Anexo nao encontrado' });

  task.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ message: 'Anexo removido' });
});

module.exports = router;
