const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/models
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.name,
              COUNT(p.id)::int AS parts_count
       FROM car_models m
       LEFT JOIN parts p ON p.model_id = m.id
       GROUP BY m.id
       ORDER BY m.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/models
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name kerak' });
    const { rows } = await pool.query(
      'INSERT INTO car_models (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bunday model allaqachon bor' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/models/:id
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name kerak' });

    const { rows } = await pool.query(
      'UPDATE car_models SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bunday model allaqachon bor' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/models/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM parts WHERE model_id = $1',
      [req.params.id]
    );
    if (rows[0].cnt > 0) {
      return res.status(400).json({ error: `O\'chirib bo\'lmaydi: ${rows[0].cnt} ta ehtiyot qism bor` });
    }
    const { rowCount } = await pool.query('DELETE FROM car_models WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
