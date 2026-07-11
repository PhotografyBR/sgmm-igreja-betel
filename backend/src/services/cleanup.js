/**
 * Limpeza automatica do repositorio de midia.
 *
 * Remove do APP (banco de dados):
 *   - arquivos vinculados a um culto: 7 dias apos a DATA DO CULTO
 *   - demais arquivos (geral / sem culto): apos 60 dias do upload
 * NAO apaga nada do Google Drive — os arquivos continuam la como backup.
 * Arquivos marcados como permanentes (permanent: true) nunca sao removidos.
 *
 * Configuravel por variavel de ambiente:
 *   MEDIA_RETENTION_DAYS   — dias de retencao geral (padrao: 60)
 *   MEDIA_POST_EVENT_DAYS  — dias apos o culto (padrao: 7)
 */

const db = require('../config/database');

const RETENTION_DAYS = parseInt(process.env.MEDIA_RETENTION_DAYS, 10) || 60;
const POST_EVENT_DAYS = parseInt(process.env.MEDIA_POST_EVENT_DAYS, 10) || 7;
const DIA_MS = 24 * 60 * 60 * 1000;
// Roda a verificacao uma vez por dia
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function lerDB() {
  return db.readDBAsync ? await db.readDBAsync() : db.readDB();
}

async function gravarDB(data) {
  if (db.writeDBAsync) return db.writeDBAsync(data);
  return db.writeDB(data);
}

/**
 * Identifica os arquivos que seriam removidos, sem apagar nada.
 * Util para mostrar uma previa antes da limpeza.
 */
/**
 * Verifica se um arquivo vinculado a culto ja passou da janela pos-evento.
 */
function expirouPosCulto(m, schedulesPorId, agora) {
  if (!m.scheduleId) return false;
  const s = schedulesPorId[m.scheduleId];
  if (!s || !s.date) return false;
  const limite = new Date(s.date + 'T12:00:00').getTime() + POST_EVENT_DAYS * DIA_MS;
  return agora > limite;
}

function mapaDeCultos(data) {
  const mapa = {};
  for (const s of (data.schedules || [])) mapa[s.id] = s;
  return mapa;
}

async function previewLimpeza() {
  const data = await lerDB();
  const agora = Date.now();
  const limite = agora - RETENTION_DAYS * DIA_MS;
  const cultos = mapaDeCultos(data);
  const media = data.media || [];
  const expirados = media.filter(m =>
    !m.permanent && (
      new Date(m.createdAt).getTime() < limite ||
      expirouPosCulto(m, cultos, agora)
    )
  );
  return {
    retentionDays: RETENTION_DAYS,
    postEventDays: POST_EVENT_DAYS,
    totalArquivos: media.length,
    permanentes: media.filter(m => m.permanent).length,
    aRemover: expirados.length,
    arquivos: expirados.map(m => ({ id: m.id, name: m.name, createdAt: m.createdAt }))
  };
}

/**
 * Executa a limpeza: remove do banco os arquivos vencidos e nao permanentes.
 * Retorna quantos foram removidos.
 */
async function runCleanup() {
  try {
    const data = await lerDB();
    const media = data.media || [];
    if (media.length === 0) return 0;

    const agora = Date.now();
    const limite = agora - RETENTION_DAYS * DIA_MS;
    const cultos = mapaDeCultos(data);
    const manter = [];
    const removidos = [];

    for (const m of media) {
      const vencido =
        new Date(m.createdAt).getTime() < limite ||
        expirouPosCulto(m, cultos, agora);
      if (vencido && !m.permanent) removidos.push(m);
      else manter.push(m);
    }

    if (removidos.length === 0) {
      console.log(`[Limpeza] Nenhum arquivo expirado para remover (geral: ${RETENTION_DAYS} dias, pos-culto: ${POST_EVENT_DAYS} dias).`);
      return 0;
    }

    data.media = manter;
    await gravarDB(data);

    console.log(`[Limpeza] ${removidos.length} arquivo(s) expirado(s) removido(s) do app (Drive preservado).`);
    return removidos.length;
  } catch (err) {
    console.error('[Limpeza] Erro ao executar limpeza:', err.message);
    return 0;
  }
}

function startCleanupScheduler() {
  // Primeira limpeza 2 minutos apos a inicializacao, depois a cada 24h
  setTimeout(() => {
    runCleanup();
    setInterval(runCleanup, CHECK_INTERVAL_MS);
  }, 2 * 60 * 1000);

  console.log(`[Limpeza] Agendador iniciado — verificacao diaria, retencao geral de ${RETENTION_DAYS} dias e ${POST_EVENT_DAYS} dias apos cada culto.`);
}

module.exports = { startCleanupScheduler, runCleanup, previewLimpeza, RETENTION_DAYS, POST_EVENT_DAYS };

