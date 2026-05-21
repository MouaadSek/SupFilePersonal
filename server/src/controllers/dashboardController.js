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

// GET /dashboard/breakdown
async function breakdown(req, res, next) {
  try {
    const result = await query(
      `SELECT
         CASE
           WHEN mime_type LIKE 'image/%'                               THEN 'Images'
           WHEN mime_type LIKE 'video/%'                               THEN 'Videos'
           WHEN mime_type LIKE 'audio/%'                               THEN 'Audio'
           WHEN mime_type LIKE 'application/pdf'
             OR mime_type LIKE 'text/%'                                THEN 'Documents'
           ELSE 'Other'
         END AS category,
         COUNT(*)::int  AS count,
         SUM(size)::bigint AS total_size
       FROM files
       WHERE owner_id = $1 AND trashed = FALSE
       GROUP BY category
       ORDER BY total_size DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { quota, recent, search, breakdown };
