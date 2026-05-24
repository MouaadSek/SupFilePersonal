const { query } = require('../db');
const zipService = require('../services/zipService');
const { sendShareInviteEmail } = require('../services/emailService');

// GET /folders  — root level
//
// Returns the user's owned root folders PLUS folders shared with them via
// folder_members (those are surfaced at the root regardless of where they
// physically sit in the owner's tree, since the recipient has no parent
// context to navigate into). Mobile/web use the `shared` flag to disable
// owner-only actions (rename / delete / move) on member-only entries.
async function listRoot(req, res, next) {
  try {
    const folders = await query(
      `SELECT f.*,
        (
          (SELECT COUNT(*)::int FROM folders c WHERE c.parent_id = f.id AND c.trashed = FALSE) +
          (SELECT COUNT(*)::int FROM files fi WHERE fi.folder_id = f.id AND fi.trashed = FALSE)
        ) AS item_count,
        FALSE AS shared,
        NULL::text AS permission
       FROM folders f
       WHERE f.owner_id = $1 AND f.parent_id IS NULL AND f.trashed = FALSE
       UNION ALL
       SELECT f.*,
        (
          (SELECT COUNT(*)::int FROM folders c WHERE c.parent_id = f.id AND c.trashed = FALSE) +
          (SELECT COUNT(*)::int FROM files fi WHERE fi.folder_id = f.id AND fi.trashed = FALSE)
        ) AS item_count,
        TRUE AS shared,
        fm.permission
       FROM folders f
       JOIN folder_members fm ON fm.folder_id = f.id
       WHERE fm.user_id = $1 AND f.trashed = FALSE AND f.owner_id <> $1
       ORDER BY name`,
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
    // Look up the folder + the caller's relationship to it (owner vs member).
    const folder = await query(
      `SELECT f.*,
              fm.permission AS member_permission
       FROM folders f
       LEFT JOIN folder_members fm
         ON fm.folder_id = f.id AND fm.user_id = $2
       WHERE f.id = $1 AND f.trashed = FALSE
         AND (f.owner_id = $2 OR fm.user_id IS NOT NULL)`,
      [req.params.id, req.user.id]
    );
    const folderRow = folder.rows[0];
    if (!folderRow) return res.status(404).json({ error: 'Folder not found' });

    // If the caller isn't the owner they got here via folder_members, so every
    // descendant is also "shared" (non-owned) for them — the mobile/web action
    // menu uses this to hide owner-only actions.
    const isShared = folderRow.owner_id !== req.user.id;
    const effectivePermission = isShared ? folderRow.member_permission || 'read' : null;

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

    // Stamp the shared/permission flags on every child so the client doesn't
    // have to walk the breadcrumb to find out.
    const stampShared = (row) =>
      isShared ? { ...row, shared: true, permission: effectivePermission } : row;

    // Drop the member_permission helper column from the response — clients
    // should use `shared` + `permission` consistently.
    const { member_permission, ...cleanFolder } = folderRow;
    return res.json({
      folder: isShared
        ? { ...cleanFolder, shared: true, permission: effectivePermission }
        : cleanFolder,
      folders: subFolders.rows.map(stampShared),
      files: files.rows.map(stampShared),
    });
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
