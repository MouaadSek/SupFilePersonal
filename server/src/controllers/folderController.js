const { query } = require('../db');
const zipService = require('../services/zipService');
const { canReadFolder, canWriteFolder } = require('../services/folderAccess');

const FOLDER_SELECT_WITH_COUNT = `
  f.*,
  (
    SELECT COUNT(*)::int FROM folders c
    WHERE c.parent_id = f.id AND c.trashed = FALSE
  ) + (
    SELECT COUNT(*)::int FROM files fl
    WHERE fl.folder_id = f.id AND fl.trashed = FALSE
  ) AS item_count`;

// GET /folders  — root level
async function listRoot(req, res, next) {
  try {
    const folders = await query(
      `SELECT ${FOLDER_SELECT_WITH_COUNT}
       FROM folders f
       WHERE f.owner_id = $1 AND f.parent_id IS NULL AND f.trashed = FALSE
       ORDER BY f.name`,
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
    if (!(await canReadFolder(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const folder = await query(
      'SELECT * FROM folders WHERE id = $1 AND trashed = FALSE',
      [req.params.id],
    );

    const subFolders = await query(
      `SELECT ${FOLDER_SELECT_WITH_COUNT}
       FROM folders f
       WHERE f.parent_id = $1 AND f.trashed = FALSE
       ORDER BY f.name`,
      [req.params.id],
    );
    const files = await query(
      'SELECT * FROM files WHERE folder_id = $1 AND trashed = FALSE ORDER BY name',
      [req.params.id],
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
    if (!name) return res.status(400).json({ error: 'name is required' });

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

// POST /folders/:id/restore
async function restore(req, res, next) {
  try {
    const folder = await query(
      'SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND trashed = TRUE',
      [req.params.id, req.user.id],
    );
    if (!folder.rows[0]) return res.status(404).json({ error: 'Folder not found in trash' });

    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       UPDATE folders SET trashed = FALSE WHERE id IN (SELECT id FROM subtree)`,
      [req.params.id],
    );
    await query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
       )
       UPDATE files SET trashed = FALSE WHERE folder_id IN (SELECT id FROM subtree)`,
      [req.params.id],
    );
    const result = await query('SELECT * FROM folders WHERE id = $1', [req.params.id]);
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /folders/:id/members
async function addMember(req, res, next) {
  try {
    const { user_id, email, permission = 'read' } = req.body;
    let targetUserId = user_id;

    if (!targetUserId && email) {
      const lookup = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (!lookup.rows[0]) {
        return res.status(404).json({ error: 'No user found with this email' });
      }
      targetUserId = lookup.rows[0].id;
    }

    if (!targetUserId) return res.status(400).json({ error: 'user_id or email is required' });

    const owned = await query(
      'SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND trashed = FALSE',
      [req.params.id, req.user.id],
    );
    if (!owned.rows[0]) return res.status(404).json({ error: 'Folder not found' });

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot share a folder with yourself' });
    }

    await query(
      `INSERT INTO folder_members (folder_id, user_id, permission) VALUES ($1, $2, $3)
       ON CONFLICT (folder_id, user_id) DO UPDATE SET permission = EXCLUDED.permission`,
      [req.params.id, targetUserId, permission],
    );
    return res.status(201).json({ message: 'Member added', user_id: targetUserId });
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

module.exports = {
  listRoot,
  listFolder,
  create,
  update,
  trash,
  restore,
  zip,
  addMember,
  removeMember,
};
