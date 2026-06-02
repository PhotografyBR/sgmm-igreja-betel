/**
 * Serviço de backup automático para o Google Drive
 * Salva um snapshot do banco de dados a cada 24h
 *
 * Para ativar, configure as variáveis de ambiente:
 *   GOOGLE_DRIVE_BACKUP_FOLDER_ID  — ID da pasta no Drive onde os backups serão salvos
 *   GOOGLE_SERVICE_ACCOUNT_KEY     — JSON da service account (em Base64 ou string JSON)
 *
 * Alternativamente, o backup também pode ser baixado manualmente via:
 *   GET /api/admin/backup  (somente admin)
 */

const { readDBAsync } = require('../config/database');

// Intervalo de backup: 24 horas
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runBackup() {
  if (!process.env.DATABASE_URL) {
    console.log('[Backup] Postgres não configurado, pulando backup.');
    return;
  }

  try {
    const db = await readDBAsync();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sgmm-backup-${timestamp}.json`;
    const content = JSON.stringify(db, null, 2);

    // Tenta salvar no Google Drive se configurado
    if (process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      await saveToGoogleDrive(filename, content);
    } else {
      // Salva localmente como fallback
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.join(__dirname, '../../data/backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const backupPath = path.join(backupDir, filename);
      fs.writeFileSync(backupPath, content);

      // Mantém só os últimos 7 backups locais
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('sgmm-backup-'))
        .sort();
      if (files.length > 7) {
        files.slice(0, files.length - 7).forEach(f =>
          fs.unlinkSync(path.join(backupDir, f))
        );
      }

      console.log(`[Backup] Salvo localmente: ${backupPath}`);
    }
  } catch (err) {
    console.error('[Backup] Erro ao executar backup:', err.message);
  }
}

async function saveToGoogleDrive(filename, content) {
  const { google } = require('googleapis');

  let credentials;
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    // Aceita tanto JSON direto quanto Base64
    credentials = JSON.parse(
      raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    );
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY inválida: ' + err.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });

  const { Readable } = require('stream');
  const stream = Readable.from([content]);

  await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: 'application/json',
      parents: [process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID]
    },
    media: {
      mimeType: 'application/json',
      body: stream
    }
  });

  // Remove backups com mais de 90 dias da pasta
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const old = await drive.files.list({
    q: `'${process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID}' in parents and name contains 'sgmm-backup-' and createdTime < '${ninetyDaysAgo}'`,
    fields: 'files(id, name)'
  });

  for (const file of (old.data.files || [])) {
    await drive.files.delete({ fileId: file.id });
    console.log(`[Backup] Removido backup antigo: ${file.name}`);
  }

  console.log(`[Backup] Salvo no Google Drive: ${filename}`);
}

function startBackupScheduler() {
  // Primeiro backup 1 minuto após inicialização
  setTimeout(() => {
    runBackup();
    // Depois a cada 24h
    setInterval(runBackup, BACKUP_INTERVAL_MS);
  }, 60 * 1000);

  console.log('[Backup] Agendador iniciado — backup a cada 24h.');
}

module.exports = { startBackupScheduler, runBackup };
