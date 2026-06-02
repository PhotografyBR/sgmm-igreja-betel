const fs = require('fs');
const path = require('path');

// ─── Dados padrão (usuário admin inicial) ───────────────────────────────────
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

// ─── Modo Postgres (Railway produção) ────────────────────────────────────────
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Cria a tabela na primeira execução
  async function initDB() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sgmm_data (
        id   TEXT PRIMARY KEY DEFAULT 'main',
        data JSONB NOT NULL
      )
    `);

    const res = await pool.query("SELECT id FROM sgmm_data WHERE id = 'main'");
    if (res.rowCount === 0) {
      await pool.query(
        "INSERT INTO sgmm_data (id, data) VALUES ('main', $1)",
        [JSON.stringify(defaultDB)]
      );
      console.log('Banco Postgres inicializado com dados padrão.');
    }
  }

  // Executa init assim que o módulo é carregado
  initDB().catch(err => {
    console.error('Erro ao inicializar Postgres:', err.message);
    process.exit(1);
  });

  function readDB() {
    // Versão síncrona simulada via cache em memória
    // O cache é atualizado a cada writeDB
    return global.__dbCache || defaultDB;
  }

  async function readDBAsync() {
    const res = await pool.query("SELECT data FROM sgmm_data WHERE id = 'main'");
    const data = res.rows[0].data;
    global.__dbCache = data;
    return data;
  }

  async function writeDBAsync(data) {
    global.__dbCache = data;
    await pool.query(
      "UPDATE sgmm_data SET data = $1 WHERE id = 'main'",
      [JSON.stringify(data)]
    );
  }

  function writeDB(data) {
    global.__dbCache = data;
    pool.query(
      "UPDATE sgmm_data SET data = $1 WHERE id = 'main'",
      [JSON.stringify(data)]
    ).catch(err => console.error('Erro ao salvar no Postgres:', err.message));
  }

  // Carrega o cache logo na inicialização
  readDBAsync().catch(() => {});

  module.exports = { readDB, writeDB, readDBAsync, writeDBAsync, pool };

// ─── Modo arquivo JSON (desenvolvimento local) ───────────────────────────────
} else {
  const DB_PATH = path.join(__dirname, '../../data');
  const DB_FILE = path.join(DB_PATH, 'db.json');

  function ensureDB() {
    if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    }
  }

  function readDB() {
    ensureDB();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }

  function writeDB(data) {
    ensureDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  module.exports = { readDB, writeDB };
}
