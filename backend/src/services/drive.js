const { google } = require('googleapis');
const { Readable } = require('stream');

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Em produção, use refresh token persistido
  // Para simplificar, suporte a Service Account também
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const serviceAuth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    return serviceAuth;
  }

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  return auth;
}

async function getDrive() {
  const auth = getAuthClient();
  return google.drive({ version: 'v3', auth });
}

// Parâmetros necessários para trabalhar com Drives Compartilhados.
// Sem isso, Service Accounts não conseguem gravar (não têm cota própria).
const SHARED_DRIVE_OPTS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true
};

async function listFolders(parentId = null) {
  const drive = await getDrive();
  const rootId = parentId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    ...SHARED_DRIVE_OPTS
  });

  return res.data.files || [];
}

async function getOrCreateFolder(name, parentId) {
  const drive = await getDrive();
  const rootId = parentId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Verificar se já existe
  const existing = await drive.files.list({
    q: `name = '${name}' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    ...SHARED_DRIVE_OPTS
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id;
  }

  // Criar nova pasta
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootId]
    },
    fields: 'id',
    supportsAllDrives: true
  });

  return folder.data.id;
}

async function uploadFile(file, folderId) {
  const drive = await getDrive();
  const parentId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const stream = new Readable();
  stream.push(file.buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [parentId]
    },
    media: {
      mimeType: file.mimetype,
      body: stream
    },
    fields: 'id, name, webViewLink, thumbnailLink, mimeType',
    supportsAllDrives: true
  });

  // Tornar o arquivo acessível para leitura (para thumbnail)
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true
    });
  } catch (e) {
    console.log('Permissão pública não configurada:', e.message);
  }

  return res.data;
}

async function deleteFile(fileId) {
  const drive = await getDrive();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

module.exports = { listFolders, getOrCreateFolder, uploadFile, deleteFile };
