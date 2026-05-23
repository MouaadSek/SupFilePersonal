const { query } = require('../db');
const quotaService = require('../services/quotaService');
const storageService = require('../services/storageService');

// GET /trash
async function list(req, res, next) {
  try {
    const folders = await query(
      `SELECT * FROM folders WHERE owner_id = $1 AND trashed = TRUE ORDER BY updated_at DESC`,
      [req.user.id],
    );
    const files = await query(
      `SELECT * FROM files WHERE owner_id = $1 AND trashed = TRUE ORDER BY updated_at DESC`,
      [req.user.id],
    );
    return res.json({ folders: folders.rows, files: files.rows });
  } catch (err) {
    next(err);
  }
}

// DELETE /trash — permanently delete all trashed items
async function empty(req, res, next) {
  try {
    const files = await query(
      'SELECT id, storage_path, size FROM files WHERE owner_id = $1 AND trashed = TRUE',
      [req.user.id],
    );
    for (const file of files.rows) {
      storageService.deleteFile(file.storage_path);
      await quotaService.decrement(req.user.id, file.size || 0);
    }
    await query('DELETE FROM files WHERE owner_id = $1 AND trashed = TRUE', [req.user.id]);
    await query('DELETE FROM folders WHERE owner_id = $1 AND trashed = TRUE', [req.user.id]);
    return res.json({ message: 'Trash emptied' });
  } catch (err) {
    next(err);
  }
}

// DELETE /trash/files/:id
async function purgeFile(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM files WHERE id = $1 AND owner_id = $2 AND trashed = TRUE',
      [req.params.id, req.user.id],
    );
    const file = result.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found in trash' });

    storageService.deleteFile(file.storage_path);
    await quotaService.decrement(req.user.id, file.size || 0);
    await query('DELETE FROM files WHERE id = $1', [file.id]);
    return res.json({ message: 'File permanently deleted' });
  } catch (err) {
    next(err);
  }
}

// DELETE /trash/folders/:id
async function purgeFolder(req, res, next) {
  try {
    const root = await query(
      'SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND trashed = TRUE',
      [req.params.id, req.user.id],
    );
    if (!root.rows[0]) return res.status(404).json({ error: 'Folder not found in trash' });

    const files = await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       SELECT id, storage_path, size FROM files
       WHERE folder_id IN (SELECT id FROM subtree) AND owner_id = $2`,
      [req.params.id, req.user.id],
    );

    for (const file of files.rows) {
      storageService.deleteFile(file.storage_path);
      await quotaService.decrement(req.user.id, file.size || 0);
    }

    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       DELETE FROM files WHERE folder_id IN (SELECT id FROM subtree) AND owner_id = $2`,
      [req.params.id, req.user.id],
    );

    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       DELETE FROM folders WHERE id IN (SELECT id FROM subtree) AND owner_id = $2`,
      [req.params.id, req.user.id],
    );

    return res.json({ message: 'Folder permanently deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, empty, purgeFile, purgeFolder };
