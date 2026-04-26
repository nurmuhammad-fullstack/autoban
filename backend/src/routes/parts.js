const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/parts?model=ID.4&q=fara
router.get('/', async (req, res) => {
  try {
    const { model, q } = req.query;
    let query = `
      SELECT p.id, p.name, p.code, p.stock, p.price,
             m.name AS model, m.id AS model_id
      FROM parts p
      JOIN car_models m ON p.model_id = m.id
      WHERE TRUE
    `;
    const params = [];

    if (model) {
      params.push(model);
      query += ` AND UPPER(m.name) = UPPER($${params.length})`;
    }
    if (q) {
      params.push(`%${q}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.code ILIKE $${params.length} OR m.name ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.code, p.stock, p.price,
              m.name AS model, m.id AS model_id
       FROM parts p JOIN car_models m ON p.model_id = m.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parts
router.post('/', async (req, res) => {
  try {
    const { name, code, model, stock = 0, price = 0 } = req.body;
    if (!name || !model) return res.status(400).json({ error: 'name va model kerak' });

    const modelRes = await pool.query(
      'SELECT id FROM car_models WHERE UPPER(name) = UPPER($1)', [model]
    );
    if (!modelRes.rows.length) return res.status(400).json({ error: 'Model topilmadi' });
    const model_id = modelRes.rows[0].id;

    const autoCode = code || ('AZ-' + Date.now());
    const { rows } = await pool.query(
      `INSERT INTO parts (name, code, model_id, stock, price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, code, stock, price, model_id`,
      [name, autoCode, model_id, stock, price]
    );
    res.status(201).json({ ...rows[0], model });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu kod allaqachon bor' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/parts/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, code, model, stock, price } = req.body;
    const { rows: existing } = await pool.query('SELECT * FROM parts WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    let model_id = existing[0].model_id;
    if (model) {
      const modelRes = await pool.query(
        'SELECT id FROM car_models WHERE UPPER(name) = UPPER($1)', [model]
      );
      if (!modelRes.rows.length) return res.status(400).json({ error: 'Model topilmadi' });
      model_id = modelRes.rows[0].id;
    }

    const { rows } = await pool.query(
      `UPDATE parts
       SET name     = COALESCE($1, name),
           code     = COALESCE($2, code),
           model_id = $3,
           stock    = COALESCE($4, stock),
           price    = COALESCE($5, price)
       WHERE id = $6
       RETURNING id, name, code, stock, price, model_id`,
      [name, code, model_id, stock, price, req.params.id]
    );
    const modelName = model || (await pool.query('SELECT name FROM car_models WHERE id=$1', [model_id])).rows[0].name;
    res.json({ ...rows[0], model: modelName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/parts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM parts WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parts/:id/sell
router.post('/:id/sell', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT p.id, p.name, p.stock, p.price, m.name AS model
       FROM parts p JOIN car_models m ON p.model_id = m.id
       WHERE p.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const part = rows[0];
    if (part.stock <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Qoldiq yo\'q' }); }

    await client.query('UPDATE parts SET stock = stock - 1 WHERE id = $1', [part.id]);
    const { rows: sale } = await client.query(
      `INSERT INTO sales (part_id, part_name, model_name, price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [part.id, part.name, part.model, part.price]
    );

    await client.query('COMMIT');
    res.status(201).json(sale[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
