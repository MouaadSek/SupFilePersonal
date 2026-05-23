const fs = require('fs');
const path = require('path');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * Delete a file from the filesystem.
 */
function deleteFile(storagePath) {
  const abs = path.isAbsolute(storagePath) ? storagePath : path.join(STORAGE_PATH, storagePath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

/**
 * Resolve a storage path to absolute.
 */
function resolve(storagePath) {
  return path.isAbsolute(storagePath) ? storagePath : path.join(STORAGE_PATH, storagePath);
}

module.exports = { deleteFile, resolve, STORAGE_PATH };
