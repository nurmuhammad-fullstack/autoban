require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const partsRouter    = require('./routes/parts');
const modelsRouter   = require('./routes/models');
const salesRouter    = require('./routes/sales');
const dashboardRouter = require('./routes/dashboard');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/parts',     partsRouter);
app.use('/api/models',    modelsRouter);
app.use('/api/sales',     salesRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
}

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
