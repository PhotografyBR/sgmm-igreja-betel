const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { notificarEscalado, notificarLider } = require('../services/whatsapp');

const router = express.Router();

// GET /api/schedules - listar escalas
router.get('/', authMiddleware, (req, res) => {
  const db = readDB();
  let schedules = db.schedules;

  // Voluntários só veem as próprias escalas
  if (req.user.role === 'voluntario') {
    schedules = schedules.filter(s =>
      s.assignments.some(a => a.userId === req.user.id)
    );
  }

  // Filtro por mês/ano (query params)
  const { month, year } = req.query;
  if (month && year) {
    schedules = schedules.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() + 1 === parseInt(month) && date.getFullYear() === parseInt(year);
    });
  }

  res.json(schedules);
});

// GET /api/schedules/:id
router.get('/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const schedule = db.schedules.find(s => s.id === req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Escala não encontrada' });
  res.json(schedule);
});

// POST /api/schedules - criar escala (admin/secretaria)
router.post('/', authMiddleware, requireRole('admin', 'secretaria'), (req, res) => {
  const { title, date, time, type, assignments, notes } = req.body;

  if (!title || !date || !type) {
    return res.status(400).json({ error: 'Título, data e tipo são obrigatórios' });
  }

  const db = readDB();

  const newSchedule = {
    id: uuidv4(),
    title,
    date,
    time: time || '',
    type, // culto, reunião, evento
    notes: notes || '',
    assignments: (assignments || []).map(a => ({
      userId: a.userId,
      function: a.function,
      status: 'pending',
      confirmToken: uuidv4() // token único para confirmação por link
    })),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.schedules.push(newSchedule);

  // Criar notificações internas e enviar WhatsApp para os escalados
  newSchedule.assignments.forEach(a => {
    db.notifications.push({
      id: uuidv4(),
      userId: a.userId,
      type: 'schedule',
      title: 'Nova Escala',
      message: `Você foi escalado para "${newSchedule.title}" em ${new Date(newSchedule.date).toLocaleDateString('pt-BR')}`,
      relatedId: newSchedule.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Envia WhatsApp (assíncrono, sem bloquear a resposta)
    const voluntario = db.users.find(u => u.id === a.userId);
    if (voluntario?.phone) {
      const urlSistema = process.env.FRONTEND_URL || 'https://sgmm-igreja-betel-production.up.railway.app';
      notificarEscalado({
        nome: voluntario.name,
        phone: voluntario.phone,
        titulo: newSchedule.title,
        data: newSchedule.date,
        hora: newSchedule.time,
        funcao: a.function,
        urlSistema,
        confirmToken: a.confirmToken
      }).catch(err => console.error('[WhatsApp] Erro ao notificar escalado:', err.message));
    }
  });

  writeDB(db);
  res.status(201).json(newSchedule);
});

// PUT /api/schedules/:id - editar escala (admin/secretaria)
router.put('/:id', authMiddleware, requireRole('admin', 'secretaria'), (req, res) => {
  const db = readDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  const { title, date, time, type, assignments, notes } = req.body;

  if (title) db.schedules[idx].title = title;
  if (date) db.schedules[idx].date = date;
  if (time !== undefined) db.schedules[idx].time = time;
  if (type) db.schedules[idx].type = type;
  if (notes !== undefined) db.schedules[idx].notes = notes;
  if (assignments) {
    db.schedules[idx].assignments = assignments.map(a => ({
      userId: a.userId,
      function: a.function,
      status: a.status || 'pending'
    }));
  }
  db.schedules[idx].updatedAt = new Date().toISOString();

  writeDB(db);
  res.json(db.schedules[idx]);
});

// DELETE /api/schedules/:id - remover escala (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  db.schedules.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Escala removida' });
});

// POST /api/schedules/:id/confirm - voluntário confirma/declina presença
router.post('/:id/confirm', authMiddleware, (req, res) => {
  const { status } = req.body; // confirmed ou declined
  if (!['confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Use confirmed ou declined' });
  }

  const db = readDB();
  const schedIdx = db.schedules.findIndex(s => s.id === req.params.id);
  if (schedIdx === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  const assignIdx = db.schedules[schedIdx].assignments.findIndex(a => a.userId === req.user.id);
  if (assignIdx === -1) return res.status(403).json({ error: 'Você não está nessa escala' });

  db.schedules[schedIdx].assignments[assignIdx].status = status;
  db.schedules[schedIdx].updatedAt = new Date().toISOString();

  // Notificar o líder (notificação interna + WhatsApp)
  const schedule = db.schedules[schedIdx];
  const confirmText = status === 'confirmed' ? 'confirmou' : 'recusou';
  db.notifications.push({
    id: uuidv4(),
    userId: schedule.createdBy,
    type: 'confirmation',
    title: 'Confirmação de Escala',
    message: `${req.user.name} ${confirmText} presença em "${schedule.title}"`,
    relatedId: schedule.id,
    read: false,
    createdAt: new Date().toISOString()
  });

  // Envia WhatsApp para o líder que criou a escala
  const lider = db.users.find(u => u.id === schedule.createdBy);
  if (lider?.phone) {
    notificarLider({
      phoneL: lider.phone,
      nomeVoluntario: req.user.name,
      tituloEscala: schedule.title,
      status
    }).catch(err => console.error('[WhatsApp] Erro ao notificar líder:', err.message));
  }

  writeDB(db);
  res.json({ message: `Presença ${status === 'confirmed' ? 'confirmada' : 'recusada'} com sucesso` });
});

//