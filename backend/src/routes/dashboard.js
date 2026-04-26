const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const [totalRes, lowRes, revenueRes, txRes, recentRes, alertsRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM parts'),
      pool.query('SELECT COUNT(*)::int AS low FROM parts WHERE stock < 3'),
      pool.query(
        `SELECT COALESCE(SUM(price), 0)::float AS revenue
         FROM sales
         WHERE sold_at >= CURRENT_DATE`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS tx
         FROM sales
         WHERE sold_at >= CURRENT_DATE`
      ),
      pool.query(
        `SELECT id, part_name AS name, model_name AS model, price,
                TO_CHAR(sold_at AT TIME ZONE 'UTC', 'HH24:MI') AS time
         FROM sales
         ORDER BY sold_at DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT p.id, p.name, p.code, p.stock, m.name AS model
         FROM parts p JOIN car_models m ON p.model_id = m.id
         WHERE p.stock < 3
         ORDER BY p.stock ASC`
      ),
    ]);

    res.json({
      total:       totalRes.rows[0].total,
      low_stock:   lowRes.rows[0].low,
      revenue:     revenueRes.rows[0].revenue,
      tx_count:    txRes.rows[0].tx,
      recent_sales: recentRes.rows,
      alerts:      alertsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
