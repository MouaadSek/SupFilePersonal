const { query } = require('../db');

/** Owner or folder member with any permission. */
async function canReadFolder(folderId, userId) {
  const result = await query(
    `SELECT f.id FROM folders f
     LEFT JOIN folder_members fm ON fm.folder_id = f.id AND fm.user_id = $2
     WHERE f.id = $1 AND f.trashed = FALSE AND (f.owner_id = $2 OR fm.user_id IS NOT NULL)`,
    [folderId, userId],
  );
  return !!result.rows[0];
}

/** Owner or member with write permission. */
async function canWriteFolder(folderId, userId) {
  const result = await query(
    `SELECT f.id FROM folders f
     LEFT JOIN folder_members fm ON fm.folder_id = f.id AND fm.user_id = $2
     WHERE f.id = $1 AND f.trashed = FALSE
       AND (f.owner_id = $2 OR fm.permission = 'write')`,
    [folderId, userId],
  );
  return !!result.rows[0];
}

module.exports = { canReadFolder, canWriteFolder };
