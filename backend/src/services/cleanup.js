/**
 * Limpeza automatica do repositorio de midia.
 *
 * Remove do APP (banco de dados) os arquivos de midia com mais de 60 dias.
 * NAO apaga nada do Google Drive — os arquivos continuam la como backup.
 * Arquivos marcados como permanentes (permanent: true) nunca sao removidos.
 *
 * Configuravel por variavel de ambiente:
 *   MEDIA_RETENTION_DAYS  — dias de retencao (padrao: 60)
 */

const db = require('../config/database');

const RETENTION_DAYS = parseInt(process.env.MEDIA_RETENTION_DAYS, 10) || 60;
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
async function previewLimpeza() {
  const data = await lerDB();
  const limite = Date.now() - RETENTION_DAYS * DIA_MS;
  const media = data.media || [];
  const expirados = media.filter(m =>
    !m.permanent && new Date(m.createdAt).getTime() < limite
  );
  return {
    retentionDays: RETENTION_DAYS,
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

    const limite = Date.now() - RETENTION_DAYS * DIA_MS;
    const manter = [];
    const removidos = [];

    for (const m of media) {
      const vencido = new Date(m.createdAt).getTime() < limite;
      if (vencido && !m.permanent) removidos.push(m);
      else manter.push(m);
    }

    if (removidos.length === 0) {
      console.log(`[Limpeza] Nenhum arquivo com mais de ${RETENTION_DAYS} dias para remover.`);
      return 0;
    }

    data.media = manter;
    await gravarDB(data);

    console.log(`[Limpeza] ${removidos.length} arquivo(s) com mais de ${RETENTION_DAYS} dias removido(s) do app (Drive preservado).`);
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

  console.log(`[Limpeza] Agendador iniciado — verificacao diaria, retencao de ${RETENTION_DAYS} dias.`);
}

module.exports = { startCleanupScheduler, runCleanup, previewLimpeza, RETENTION_DAYS };
