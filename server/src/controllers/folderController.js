const { query } = require('../db');
const zipService = require('../services/zipService');
const { sendShareInviteEmail } = require('../services/emailService');

// GET /folders  — root level
async function listRoot(req, res, next) {
  try {
    const folders = await query(
      `SELECT f.*,
        (
          (SELECT COUNT(*)::int FROM folders c WHERE c.parent_id = f.id AND c.trashed = FALSE) +
          (SELECT COUNT(*)::int FROM files fi WHERE fi.folder_id = f.id AND fi.trashed = FALSE)
        ) AS item_count
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
    const folder = await query(
      `SELECT * FROM folders WHERE id = $1 AND trashed = FALSE
       AND (owner_id = $2 OR EXISTS (
         SELECT 1 FROM folder_members WHERE folder_id = $1 AND user_id = $2
       ))`,
      [req.params.id, req.user.id]
    );
    if (!folder.rows[0]) return res.status(404).json({ error: 'Folder not found' });

    const subFolders = await query(
      `SELECT f.*,
        (
          (SELECT COUNT(*)::int FROM folders c WHERE c.parent_id = f.id AND c.trashed = FALSE) +
          (SELECT COUNT(*)::int FROM files fi WHERE fi.folder_id = f.id AND fi.trashed = FALSE)
        ) AS item_count
       FROM folders f
       WHERE f.parent_id = $1 AND f.trashed = FALSE
       ORDER BY f.name`,
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

    const folderResult = await query(
      `SELECT f.owner_id, f.name AS folder_name,
              u.display_name AS owner_name, u.email AS owner_email
       FROM folders f
       JOIN users u ON u.id = f.owner_id
       WHERE f.id = $1 AND f.trashed = FALSE`,
      [req.params.id]
    );
    const folder = folderResult.rows[0];
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the folder owner can manage sharing' });
    }
    if (user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot share a folder with yourself' });
    }

    const memberResult = await query(
      'SELECT email, display_name FROM users WHERE id = $1',
      [user_id]
    );
    const member = memberResult.rows[0];
    if (!member) return res.status(404).json({ error: 'User not found' });

    await query(
      `INSERT INTO folder_members (folder_id, user_id, permission) VALUES ($1, $2, $3)
       ON CONFLICT (folder_id, user_id) DO UPDATE SET permission = EXCLUDED.permission`,
      [req.params.id, user_id, permission]
    );

    const ownerName = folder.owner_name?.trim() || folder.owner_email || 'Someone';
    try {
      await sendShareInviteEmail({
        to: member.email,
        folderName: folder.folder_name,
        ownerName,
        permission,
        folderId: req.params.id,
      });
    } catch (emailErr) {
      console.error('[share] invite email failed:', emailErr.message);
    }

    return res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
}

// DELETE /folders/:id/members/:userId
async function removeMember(req, res, next) {
  try {
    const folderResult = await query(
      'SELECT owner_id FROM folders WHERE id = $1',
      [req.params.id]
    );
    if (!folderResult.rows[0]) return res.status(404).json({ error: 'Folder not found' });
    // A user may always remove themselves; only the owner can remove others
    if (req.params.userId !== req.user.id && folderResult.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the folder owner can manage sharing' });
    }

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
