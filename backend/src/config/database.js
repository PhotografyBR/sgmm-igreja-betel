// Banco de dados em memória (JSON) para simplicidade de deploy
// Em produção, substituir por PostgreSQL ou MongoDB

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data');
const DB_FILE = path.join(DB_PATH, 'db.json');

const defaultDB = {
  users: [
    {
      id: '1',
      name: 'Líder de Mídias',
      email: 'lider@igrejabetel.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      role: 'admin',
      phone: '',
      createdAt: new Date().toISOString()
    }
  ],
  schedules: [],
  tasks: [],
  media: [],
  notifications: []
};

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDB(data) {
  ensureDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
