require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const scheduleRoutes = require('./routes/schedules');
const taskRoutes = require('./routes/tasks');
const mediaRoutes = require('./routes/media');
const notificationRoutes = require('./routes/notifications');

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
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);

// Servir front-end em produção
if (process.env.NODE_ENV === 'production') {
  // Tenta o path do Docker (raiz do container) ou o path local de desenvolvimento
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

app.listen(PORT, () => {
  console.log(`SGMM Backend rodando na porta ${PORT}`);
});

module.exports = app;
