/**
 * Log de atividades da plataforma.
 *
 * Registra quem entrou e as acoes principais (uploads, escalas, tarefas).
 * Consultavel apenas pelo admin master via GET /api/logs.
 *
 * Retencao: mantem os ultimos MAX_LOGS eventos (os mais antigos sao descartados).
 */

const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../config/database');

const MAX_LOGS = parseInt(process.env.ACTIVITY_LOG_MAX, 10) || 3000;

/**
 * Adiciona um evento ao objeto db ja carregado (sem gravar).
 * Use dentro de rotas que ja fazem writeDB(db) no final.
 */
function appendLog(db, user, action, details = '') {
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.push({
    id: uuidv4(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    details,
    at: new Date().toISOString()
  });
  if (db.activityLog.length > MAX_LOGS) {
    db.activityLog = db.activityLog.slice(-MAX_LOGS);
  }
}

/**
 * Registra um evento de forma independente (le e grava o banco).
 * Use quando a rota nao faz writeDB por conta propria (ex: login).
 */
function logActivity(user, action, details = '') {
  try {
    const db = readDB();
    appendLog(db, user, action, details);
    writeDB(db);
  } catch (err) {
    console.error('[Log] Erro ao registrar atividade:', err.message);
  }
}

module.exports = { appendLog, logActivity, MAX_LOGS };
