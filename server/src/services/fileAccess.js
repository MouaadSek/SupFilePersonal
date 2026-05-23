const { query } = require('../db');

async function canReadFile(fileId, userId) {
  const result = await query(
    `SELECT f.id FROM files f
     LEFT JOIN folders fo ON fo.id = f.folder_id
     LEFT JOIN folder_members fm ON fm.folder_id = fo.id AND fm.user_id = $2
     WHERE f.id = $1 AND f.trashed = FALSE
       AND (f.owner_id = $2 OR fm.user_id IS NOT NULL)`,
    [fileId, userId],
  );
  return !!result.rows[0];
}

async function getReadableFile(fileId, userId) {
  const result = await query(
    `SELECT f.* FROM files f
     LEFT JOIN folders fo ON fo.id = f.folder_id
     LEFT JOIN folder_members fm ON fm.folder_id = fo.id AND fm.user_id = $2
     WHERE f.id = $1 AND f.trashed = FALSE
       AND (f.owner_id = $2 OR fm.user_id IS NOT NULL)`,
    [fileId, userId],
  );
  return result.rows[0] || null;
}

module.exports = { canReadFile, getReadableFile };
