const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const quotaService = require('../services/quotaService');
const { getReadableFile } = require('../services/fileAccess');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

// POST /files/upload
async function upload(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { folder_id } = req.body;
    const { originalname, mimetype, size, filename } = req.file;
    const storage_path = path.join(STORAGE_PATH, filename);

    await quotaService.checkAndIncrement(req.user.id, size);

    const result = await query(
      `INSERT INTO files (name, folder_id, owner_id, mime_type, size, storage_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [originalname, folder_id || null, req.user.id, mimetype, size, storage_path]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /files/:id — metadata for preview / accès rapide when not yet in the client index
async function getOne(req, res, next) {
  try {
    const result = await query(
      `SELECT id, name, mime_type, size, folder_id, owner_id, created_at, updated_at
       FROM files WHERE id = $1 AND owner_id = $2 AND trashed = FALSE`,
      [req.params.id, req.user.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /files/:id/download
async function download(req, res, next) {
  try {
    const file = await getReadableFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mime_type);
    fs.createReadStream(file.storage_path).pipe(res);
  } catch (err) {
    next(err);
  }
}

// GET /files/:id/preview  (Range requests supported)
async function preview(req, res, next) {
  try {
    const file = await getReadableFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const stat = fs.statSync(file.storage_path);
    const total = stat.size;
    const range = req.headers.range;

    const cacheable = file.mime_type.startsWith('image/');
    const cacheHeader = cacheable
      ? { 'Cache-Control': 'private, max-age=3600' }
      : {};

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': file.mime_type,
        ...cacheHeader,
      });
      fs.createReadStream(file.storage_path, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': file.mime_type,
        ...cacheHeader,
      });
      fs.createReadStream(file.storage_path).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

// PATCH /files/:id
async function update(req, res, next) {
  try {
    const { name, folder_id } = req.body;
    const result = await query(
      `UPDATE files SET name = COALESCE($1, name), folder_id = COALESCE($2, folder_id)
       WHERE id = $3 AND owner_id = $4 AND trashed = FALSE
       RETURNING *`,
      [name, folder_id, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /files/:id  (soft-delete → trashed)
async function trash(req, res, next) {
  try {
    const result = await query(
      'UPDATE files SET trashed = TRUE WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    return res.json({ message: 'File moved to trash' });
  } catch (err) {
    next(err);
  }
}

// POST /files/:id/restore
async function restore(req, res, next) {
  try {
    const result = await query(
      'UPDATE files SET trashed = FALSE WHERE id = $1 AND owner_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, getOne, download, preview, update, trash, restore };
