const { query } = require('../db');
const zipService = require('../services/zipService');

// GET /folders  — root level
async function listRoot(req, res, next) {
  try {
    const folders = await query(
      'SELECT * FROM folders WHERE owner_id = $1 AND parent_id IS NULL AND trashed = FALSE ORDER BY name',
      [req.user.id]
    );
    const files = await query(
      'SELECT * FROM files WHERE owner_id = $1 AND folder_id IS NULL AND trashed = FALSE ORDER BY name',
      [req.user.id]
    );
    return res.json({ folders: folders.rows, files: files.rows });
  } catch (err) {
    next(err);
  }
}

// GET /folders/:id
async function listFolder(req, res, next) {
  try {
    const folder = await query(
      `SELECT * FROM folders WHERE id = $1 AND trashed = FALSE
       AND (owner_id = $2 OR EXISTS (
         SELECT 1 FROM folder_members WHERE folder_id = $1 AND user_id = $2
       ))`,
      [req.params.id, req.user.id]
    );
    if (!folder.rows[0]) return res.status(404).json({ error: 'Folder not found' });

    const subFolders = await query(
      'SELECT * FROM folders WHERE parent_id = $1 AND trashed = FALSE ORDER BY name',
      [req.params.id]
    );
    const files = await query(
      'SELECT * FROM files WHERE folder_id = $1 AND trashed = FALSE ORDER BY name',
      [req.params.id]
    );
    return res.json({ folder: folder.rows[0], folders: subFolders.rows, files: files.rows });
  } catch (err) {
    next(err);
  }
}

// POST /folders
async function create(req, res, next) {
  try {
    const { name, parent_id } = req.body;

    const result = await query(
      'INSERT INTO folders (name, parent_id, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, parent_id || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /folders/:id
async function update(req, res, next) {
  try {
    const { name, parent_id } = req.body;
    const result = await query(
      `UPDATE folders SET name = COALESCE($1, name), parent_id = COALESCE($2, parent_id)
       WHERE id = $3 AND owner_id = $4 AND trashed = FALSE RETURNING *`,
      [name, parent_id, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Folder not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /folders/:id  (recursive soft-delete)
async function trash(req, res, next) {
  try {
    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1 AND owner_id = $2
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       UPDATE folders SET trashed = TRUE WHERE id IN (SELECT id FROM subtree)`,
      [req.params.id, req.user.id]
    );
    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       UPDATE files SET trashed = TRUE WHERE folder_id IN (SELECT id FROM subtree)`,
      [req.params.id]
    );
    return res.json({ message: 'Folder and contents moved to trash' });
  } catch (err) {
    next(err);
  }
}

// GET /folders/:id/zip
async function zip(req, res, next) {
  try {
    await zipService.streamFolderZip(req.params.id, req.user.id, res);
  } catch (err) {
    next(err);
  }
}

// POST /folders/:id/members
async function addMember(req, res, next) {
  try {
    const { user_id, permission = 'read' } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    await query(
      `INSERT INTO folder_members (folder_id, user_id, permission) VALUES ($1, $2, $3)
       ON CONFLICT (folder_id, user_id) DO UPDATE SET permission = EXCLUDED.permission`,
      [req.params.id, user_id, permission]
    );
    return res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
}

// DELETE /folders/:id/members/:userId
async function removeMember(req, res, next) {
  try {
    await query(
      'DELETE FROM folder_members WHERE folder_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    return res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

// POST /folders/:id/restore
async function restore(req, res, next) {
  try {
    const result = await query(
      'UPDATE folders SET trashed = FALSE WHERE id = $1 AND owner_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Folder not found in trash' });
    await query('UPDATE files SET trashed = FALSE WHERE folder_id = $1', [req.params.id]);
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listRoot, listFolder, create, update, trash, zip, addMember, removeMember, restore };
