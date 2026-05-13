const { query } = require('../db');

// GET /dashboard/quota
async function quota(req, res, next) {
  try {
    const result = await query(
      'SELECT quota_used, quota_total FROM users WHERE id = $1',
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /dashboard/recent
async function recent(req, res, next) {
  try {
    const result = await query(
      `SELECT id, name, mime_type, size, folder_id, updated_at
       FROM files WHERE owner_id = $1 AND trashed = FALSE
       ORDER BY updated_at DESC LIMIT 5`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /search?q=&type=&date=
async function search(req, res, next) {
  try {
    const { q, type, date } = req.query;
    const params = [req.user.id];
    let sql = `SELECT id, name, mime_type, size, folder_id, updated_at
               FROM files WHERE owner_id = $1 AND trashed = FALSE`;

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND name ILIKE $${params.length}`;
    }
    if (type) {
      params.push(`${type}%`);
      sql += ` AND mime_type ILIKE $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND updated_at::date >= $${params.length}::date`;
    }

    sql += ' ORDER BY updated_at DESC LIMIT 50';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { quota, recent, search };
