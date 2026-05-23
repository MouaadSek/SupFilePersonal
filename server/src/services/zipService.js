const archiver = require('archiver');
const path = require('path');
const { query } = require('../db');
const encryptionService = require('./encryptionService');

/**
 * Recursively collects all non-trashed files under a folder.
 */
async function collectFiles(folderId, prefix = '') {
  const files = await query(
    'SELECT name, storage_path, encrypted FROM files WHERE folder_id = $1 AND trashed = FALSE',
    [folderId]
  );
  const subFolders = await query(
    'SELECT id, name FROM folders WHERE parent_id = $1 AND trashed = FALSE',
    [folderId]
  );

  let entries = files.rows.map((f) => ({ ...f, zipPath: path.join(prefix, f.name) }));
  for (const sub of subFolders.rows) {
    const subEntries = await collectFiles(sub.id, path.join(prefix, sub.name));
    entries = entries.concat(subEntries);
  }
  return entries;
}

/**
 * Streams a folder (and all its contents) as a ZIP to the response.
 * Encrypted files are decrypted on-the-fly before being added to the archive.
 */
async function streamFolderZip(folderId, userId, res) {
  const folder = await query(
    'SELECT * FROM folders WHERE id = $1 AND owner_id = $2 AND trashed = FALSE',
    [folderId, userId]
  );
  if (!folder.rows[0]) {
    const err = new Error('Folder not found');
    err.status = 404;
    throw err;
  }

  const entries = await collectFiles(folderId);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${folder.rows[0].name}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  for (const entry of entries) {
    if (entry.encrypted) {
      archive.append(encryptionService.createDecryptStream(entry.storage_path), { name: entry.zipPath });
    } else {
      archive.file(entry.storage_path, { name: entry.zipPath });
    }
  }

  await archive.finalize();
}

module.exports = { streamFolderZip };
