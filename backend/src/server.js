require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const scheduleRoutes = require('./routes/schedules');
const taskRoutes = require('./routes/tasks');
const mediaRoutes = require('./routes/media');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const { startBackupScheduler } = require('./services/backup');
const { startCleanupScheduler } = require('./services/cleanup');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Servir front-end em produção
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = process.env.FRONTEND_BUILD_PATH ||
    path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendBuildPath, 'index.html');
    res.sendFile(indexPath);
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  // Se Postgres estiver configurado, carrega o cache antes de aceitar requisições
  if (process.env.DATABASE_URL) {
    try {
      const { readDBAsync } = require('./config/database');
      await readDBAsync();
      console.log('Cache do banco de dados carregado com sucesso.');
    } catch (err) {
      console.error('Aviso: erro ao carregar cache inicial:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`SGMM Backend rodando na porta ${PORT}`);
    startBackupScheduler();
    startCleanupScheduler();
  });
}

startServer();

module.exports = app;
