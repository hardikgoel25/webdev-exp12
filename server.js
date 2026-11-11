// Name     : Hardik Goel
// Roll No  : 03416403223
// Experiment 12 : Containerization and Production Deployment

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Secrets and connection details are injected through environment variables
// (.env file via Docker Compose locally, Render dashboard in production); nothing is hard-coded.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
});

app.use(express.json());
app.use(express.static('public'));

// Used by the Docker HEALTHCHECK and the Render health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', env: process.env.NODE_ENV });
    } catch (err) {
        res.status(503).json({ status: 'error', database: err.message });
    }
});

app.get('/api/notes', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM notes ORDER BY id DESC');
    res.json(rows);
});

app.post('/api/notes', async (req, res) => {
    if (!req.body.text) return res.status(400).json({ error: 'text is required' });
    const { rows } = await pool.query('INSERT INTO notes (text) VALUES ($1) RETURNING *', [req.body.text]);
    res.status(201).json(rows[0]);
});

async function init() {
    await pool.query(`CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY, text TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`);
    app.listen(PORT, () => console.log(`Notes app listening on port ${PORT}`));
}
init().catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
