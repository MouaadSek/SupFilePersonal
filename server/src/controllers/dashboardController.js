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
      `SELECT id, name, mime_type, size, folder_id, created_at, updated_at
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
    let sql = `SELECT id, name, mime_type, size, folder_id, created_at, updated_at
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

// GET /dashboard/breakdown — storage by mime category
async function breakdown(req, res, next) {
  try {
    const result = await query(
      `SELECT
         CASE
           WHEN mime_type LIKE 'image/%' THEN 'images'
           WHEN mime_type LIKE 'video/%' THEN 'videos'
           WHEN mime_type LIKE 'audio/%' THEN 'audio'
           WHEN mime_type LIKE 'application/pdf%'
             OR mime_type LIKE 'text/%'
             OR mime_type LIKE '%document%'
             OR mime_type LIKE '%word%'
             OR mime_type LIKE '%sheet%'
             OR mime_type LIKE '%presentation%' THEN 'documents'
           ELSE 'other'
         END AS category,
         COALESCE(SUM(size), 0)::bigint AS size
       FROM files
       WHERE owner_id = $1 AND trashed = FALSE
       GROUP BY 1
       ORDER BY size DESC`,
      [req.user.id],
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

const RECENT_FILE_COLS = `id, name, mime_type, size, folder_id, created_at, updated_at`;

async function fetchRecentFiles(userId, limit = 5) {
  const result = await query(
    `SELECT ${RECENT_FILE_COLS}
     FROM files WHERE owner_id = $1 AND trashed = FALSE
     ORDER BY updated_at DESC LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

async function fetchRecentImages(userId, limit = 5) {
  const result = await query(
    `SELECT ${RECENT_FILE_COLS}
     FROM files WHERE owner_id = $1 AND trashed = FALSE
       AND mime_type LIKE 'image/%'
     ORDER BY updated_at DESC LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

// GET /dashboard/home — single round-trip for the home screen
async function home(req, res, next) {
  try {
    const userId = req.user.id;
    const [quotaRes, recentRows, recentImages, breakdownRes] = await Promise.all([
      query('SELECT quota_used, quota_total FROM users WHERE id = $1', [userId]),
      fetchRecentFiles(userId, 5),
      fetchRecentImages(userId, 5),
      query(
        `SELECT
           CASE
             WHEN mime_type LIKE 'image/%' THEN 'images'
             WHEN mime_type LIKE 'video/%' THEN 'videos'
             WHEN mime_type LIKE 'audio/%' THEN 'audio'
             WHEN mime_type LIKE 'application/pdf%'
               OR mime_type LIKE 'text/%'
               OR mime_type LIKE '%document%'
               OR mime_type LIKE '%word%'
               OR mime_type LIKE '%sheet%'
               OR mime_type LIKE '%presentation%' THEN 'documents'
             ELSE 'other'
           END AS category,
           COALESCE(SUM(size), 0)::bigint AS size
         FROM files
         WHERE owner_id = $1 AND trashed = FALSE
         GROUP BY 1
         ORDER BY size DESC`,
        [userId],
      ),
    ]);

    return res.json({
      quota: quotaRes.rows[0],
      recent: recentRows,
      recent_images: recentImages,
      breakdown: breakdownRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { quota, recent, search, breakdown, home };
