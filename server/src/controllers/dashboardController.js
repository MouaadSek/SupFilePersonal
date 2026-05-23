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

    const fileParams = [req.user.id];
    let fileSql = `SELECT id, name, mime_type, size, folder_id, updated_at
                   FROM files WHERE owner_id = $1 AND trashed = FALSE`;
    if (q) {
      fileParams.push(`%${q}%`);
      fileSql += ` AND name ILIKE $${fileParams.length}`;
    }
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      const typeConds = types.map(t => {
        fileParams.push(`${t}%`);
        return `mime_type ILIKE $${fileParams.length}`;
      });
      fileSql += ` AND (${typeConds.join(' OR ')})`;
    }
    if (date) {
      fileParams.push(date);
      fileSql += ` AND updated_at::date >= $${fileParams.length}::date`;
    }
    fileSql += ' ORDER BY updated_at DESC LIMIT 50';

    const folderParams = [req.user.id];
    let folderSql = `SELECT id, name, parent_id, updated_at
                     FROM folders WHERE owner_id = $1 AND trashed = FALSE`;
    if (q) {
      folderParams.push(`%${q}%`);
      folderSql += ` AND name ILIKE $${folderParams.length}`;
    }
    if (date) {
      folderParams.push(date);
      folderSql += ` AND updated_at::date >= $${folderParams.length}::date`;
    }
    folderSql += ' ORDER BY updated_at DESC LIMIT 20';

    const [fileResult, folderResult] = await Promise.all([
      query(fileSql, fileParams),
      query(folderSql, folderParams),
    ]);
    return res.json({ files: fileResult.rows, folders: folderResult.rows });
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

// GET /dashboard/home — combined payload for mobile/web home screens
async function home(req, res, next) {
  try {
    const userId = req.user.id;
    const [quotaResult, recentResult, breakdownResult] = await Promise.all([
      query('SELECT quota_used, quota_total FROM users WHERE id = $1', [userId]),
      query(
        `SELECT id, name, mime_type, size, folder_id, updated_at
         FROM files WHERE owner_id = $1 AND trashed = FALSE
         ORDER BY updated_at DESC LIMIT 12`,
        [userId],
      ),
      query(
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
        [userId],
      ),
    ]);
    const recent = recentResult.rows;
    const recent_images = recent.filter((f) => f.mime_type?.startsWith('image/'));
    return res.json({
      quota: quotaResult.rows[0],
      recent,
      recent_images,
      breakdown: breakdownResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { quota, recent, search, breakdown, home };
