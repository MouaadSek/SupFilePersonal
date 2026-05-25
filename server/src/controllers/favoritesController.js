const { query } = require('../db');

// POST /files/:id/star  — toggle starred on a file
async function toggleFileStar(req, res, next) {
  try {
    const result = await query(
      `UPDATE files SET starred = NOT starred
       WHERE id = $1 AND owner_id = $2 AND trashed = FALSE
       RETURNING id, starred`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /folders/:id/star  — toggle starred on a folder
async function toggleFolderStar(req, res, next) {
  try {
    const result = await query(
      `UPDATE folders SET starred = NOT starred
       WHERE id = $1 AND owner_id = $2 AND trashed = FALSE
       RETURNING id, starred`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Folder not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /favorites  — list all starred files and folders for the current user
async function listFavorites(req, res, next) {
  try {
    const files = await query(
      `SELECT id, name, mime_type, size, updated_at, folder_id, starred
       FROM files
       WHERE owner_id = $1 AND starred = TRUE AND trashed = FALSE
       ORDER BY name`,
      [req.user.id]
    );
    const folders = await query(
      `SELECT id, name, parent_id, updated_at, starred,
              (
                (SELECT COUNT(*)::int FROM folders c WHERE c.parent_id = f.id AND c.trashed = FALSE) +
                (SELECT COUNT(*)::int FROM files fi WHERE fi.folder_id = f.id AND fi.trashed = FALSE)
              ) AS item_count
       FROM folders f
       WHERE owner_id = $1 AND starred = TRUE AND trashed = FALSE
       ORDER BY name`,
      [req.user.id]
    );
    return res.json({ files: files.rows, folders: folders.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { toggleFileStar, toggleFolderStar, listFavorites };
