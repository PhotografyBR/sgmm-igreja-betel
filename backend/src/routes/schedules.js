const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { notificarEscalado, notificarLider } = require('../services/whatsapp');
const { appendLog } = require('../services/activityLog');

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

// POST /api/schedules - criar escala (quem tem schedules.manage)
router.post('/', authMiddleware, requirePermission('schedules.manage'), (req, res) => {
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
    type,
    notes: notes || '',
    assignments: (assignments || []).map(a => ({
      userId: a.userId,
      function: a.function,
      status: 'pending',
      confirmToken: uuidv4()
    })),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.schedules.push(newSchedule);

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

    const voluntario = db.users.find(u => u.id === a.userId);
    if (voluntario?.phone) {
      const urlSistema = process.env.FRONTEND_URL || 'https://sgmm-igreja-betel.onrender.com';
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

  appendLog(db, req.user, 'escala_criada', `${newSchedule.title} (${newSchedule.date})`);
  writeDB(db);
  res.status(201).json(newSchedule);
});

// PUT /api/schedules/:id - editar escala (quem tem schedules.manage)
router.put('/:id', authMiddleware, requirePermission('schedules.manage'), (req, res) => {
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
    const existing = db.schedules[idx].assignments || [];
    db.schedules[idx].assignments = assignments.map(a => {
      const prev = existing.find(e => e.userId === a.userId);
      return {
        userId: a.userId,
        function: a.function,
        status: a.status || prev?.status || 'pending',
        confirmToken: prev?.confirmToken || uuidv4()
      };
    });
  }
  db.schedules[idx].updatedAt = new Date().toISOString();

  appendLog(db, req.user, 'escala_editada', `${db.schedules[idx].title} (${db.schedules[idx].date})`);
  writeDB(db);
  res.json(db.schedules[idx]);
});

// DELETE /api/schedules/:id - remover escala (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  const escalaRemovida = `${db.schedules[idx].title} (${db.schedules[idx].date})`;
  db.schedules.splice(idx, 1);
  appendLog(db, req.user, 'escala_excluida', escalaRemovida);
  writeDB(db);
  res.json({ message: 'Escala removida' });
});

// POST /api/schedules/:id/confirm - voluntário confirma/declina presença
router.post('/:id/confirm', authMiddleware, (req, res) => {
  const { status } = req.body;
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

// GET /api/schedules/confirmar/:token — página pública de confirmação (sem login)
router.get('/confirmar/:token', (req, res) => {
  const db = readDB();
  const schedule = db.schedules.find(s =>
    s.assignments?.some(a => a.confirmToken === req.params.token)
  );

  if (!schedule) {
    return res.status(404).send(`
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Link inválido</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f3f4f6;}
      .card{background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.1);}
      h2{color:#ef4444;} p{color:#6b7280;}</style></head>
      <body><div class="card"><h2>❌ Link inválido</h2><p>Este link de confirmação não existe ou já expirou.</p></div></body></html>
    `);
  }

  const assignment = schedule.assignments.find(a => a.confirmToken === req.params.token);
  const volunteer = db.users.find(u => u.id === assignment.userId);
  const dataFormatada = new Date(schedule.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const statusAtual = assignment.status;
  const jaRespondeu = statusAtual !== 'pending';

  res.send(`
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmar Presença - Ministério de Mídias</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#4c1d95,#7c3aed);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
      .card{background:white;border-radius:20px;padding:32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
      .logo{text-align:center;margin-bottom:20px;}
      .logo-icon{font-size:40px;}
      .logo-text{font-size:16px;font-weight:700;color:#7c3aed;margin-top:4px;}
      h1{font-size:20px;font-weight:700;color:#1e1b4b;margin-bottom:6px;text-align:center;}
      .subtitle{font-size:13px;color:#9ca3af;text-align:center;margin-bottom:24px;}
      .info-box{background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;}
      .info-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
      .info-row:last-child{margin-bottom:0;}
      .info-icon{font-size:18px;flex-shrink:0;}
      .info-label{font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
      .info-value{font-size:14px;color:#1f2937;font-weight:600;margin-top:1px;}
      .buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;}
      .btn{padding:14px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;}
      .btn-confirm{background:#10b981;color:white;}
      .btn-decline{background:#ef4444;color:white;}
      .btn:disabled{opacity:.5;cursor:not-allowed;}
      .status-badge{text-align:center;padding:12px;border-radius:12px;font-weight:700;font-size:15px;margin-top:8px;}
      .status-confirmed{background:#d1fae5;color:#059669;}
      .status-declined{background:#fee2e2;color:#ef4444;}
      .footer{text-align:center;margin-top:20px;font-size:11px;color:#d1d5db;}
    </style></head>
    <body>
    <div class="card">
      <div class="logo"><div class="logo-icon">🎬</div><div class="logo-text">Ministério de Mídias — Igreja Betel</div></div>
      <h1>Confirmação de Presença</h1>
      <p class="subtitle">Olá, <strong>${volunteer?.name || 'Voluntário'}</strong>! Você foi escalado(a) para:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-icon">📅</span><div><div class="info-label">Evento</div><div class="info-value">${schedule.title}</div></div></div>
        <div class="info-row"><span class="info-icon">🗓</span><div><div class="info-label">Data</div><div class="info-value">${dataFormatada}${schedule.time ? ' às ' + schedule.time : ''}</div></div></div>
        ${assignment.function ? `<div class="info-row"><span class="info-icon">📌</span><div><div class="info-label">Função</div><div class="info-value">${assignment.function}</div></div></div>` : ''}
      </div>
      ${jaRespondeu ? `
        <div class="status-badge ${statusAtual === 'confirmed' ? 'status-confirmed' : 'status-declined'}">
          ${statusAtual === 'confirmed' ? '✅ Presença confirmada!' : '❌ Presença recusada'}
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:12px;">Você já respondeu esta escala.</p>
      ` : `
        <div class="buttons">
          <button class="btn btn-confirm" onclick="responder('confirmed')">✅ Confirmar</button>
          <button class="btn btn-decline" onclick="responder('declined')">❌ Recusar</button>
        </div>
      `}
      <div class="footer">Sistema de Gestão do Ministério de Mídias</div>
    </div>
    <script>
      async function responder(status) {
        document.querySelectorAll('.btn').forEach(b => b.disabled = true);
        try {
          const res = await fetch('/api/schedules/confirmar/${req.params.token}', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ status })
          });
          const data = await res.json();
          if (res.ok) {
            const box = document.querySelector('.buttons');
            box.outerHTML = '<div class="status-badge ' + (status==='confirmed'?'status-confirmed':'status-declined') + '">' + (status==='confirmed'?'✅ Presença confirmada!':'❌ Presença recusada') + '</div>';
          } else { alert(data.error || 'Erro.'); document.querySelectorAll('.btn').forEach(b => b.disabled = false); }
        } catch(e) { alert('Erro de conexão.'); document.querySelectorAll('.btn').forEach(b => b.disabled = false); }
      }
    </script></body></html>
  `);
});

// POST /api/schedules/confirmar/:token — processa a confirmação pública
router.post('/confirmar/:token', (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const db = readDB();
  const schedIdx = db.schedules.findIndex(s =>
    s.assignments?.some(a => a.confirmToken === req.params.token)
  );
  if (schedIdx === -1) return res.status(404).json({ error: 'Link inválido ou expirado' });

  const assignIdx = db.schedules[schedIdx].assignments.findIndex(a => a.confirmToken === req.params.token);
  db.schedules[schedIdx].assignments[assignIdx].status = status;
  db.schedules[schedIdx].updatedAt = new Date().toISOString();

  const schedule = db.schedules[schedIdx];
  const assignment = schedule.assignments[assignIdx];
  const voluntario = db.users.find(u => u.id === assignment.userId);
  const confirmText = status === 'confirmed' ? 'confirmou' : 'recusou';

  db.notifications.push({
    id: uuidv4(),
    userId: schedule.createdBy,
    type: 'confirmation',
    title: 'Confirmação de Escala',
    message: `${voluntario?.name || 'Voluntário'} ${confirmText} presença em "${schedule.title}" (via link)`,
    relatedId: schedule.id,
    read: false,
    createdAt: new Date().toISOString()
  });

  const lider = db.users.find(u => u.id === schedule.createdBy);
  if (lider?.phone) {
    notificarLider({
      phoneL: lider.phone,
      nomeVoluntario: voluntario?.name || 'Voluntário',
      tituloEscala: schedule.title,
      status
    }).catch(() => {});
  }

  writeDB(db);
  res.json({ message: `Presença ${status === 'confirmed' ? 'confirmada' : 'recusada'} com sucesso` });
});

module.exports = router;
