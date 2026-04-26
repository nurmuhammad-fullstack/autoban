const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/sales?limit=50
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const { rows } = await pool.query(
      `SELECT id, part_id, part_name, model_name, price,
              TO_CHAR(sold_at AT TIME ZONE 'UTC', 'HH24:MI') AS time,
              sold_at
       FROM sales
       ORDER BY sold_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
