const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

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

// POST /api/tasks - criar tarefa (admin/pastoral)
router.post('/', authMiddleware, requireRole('admin', 'pastoral'), (req, res) => {
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

module.exports = router;
