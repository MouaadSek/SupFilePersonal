const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { query } = require('../db');
const zipService = require('../services/zipService');

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// POST /shares
async function create(req, res, next) {
  try {
    const { file_id, folder_id, expires_at, password } = req.body;
    if (!file_id && !folder_id) {
      return res.status(400).json({ error: 'file_id or folder_id is required' });
    }

    const token = generateToken();
    const password_hash = password ? await bcrypt.hash(password, 12) : null;

    const result = await query(
      `INSERT INTO shares (token, file_id, folder_id, owner_id, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [token, file_id || null, folder_id || null, req.user.id, password_hash, expires_at || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function loadPublicShare(token, password) {
  const result = await query('SELECT * FROM shares WHERE token = $1', [token]);
  const share = result.rows[0];
  if (!share) {
    const err = new Error('Link not found');
    err.status = 404;
    throw err;
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    const err = new Error('Link has expired');
    err.status = 410;
    throw err;
  }
  if (share.password_hash) {
    if (!password) {
      const err = new Error('Password required');
      err.status = 403;
      err.protected = true;
      throw err;
    }
    const match = await bcrypt.compare(password, share.password_hash);
    if (!match) {
      const err = new Error('Wrong password');
      err.status = 403;
      throw err;
    }
  }
  return share;
}

// GET /shares/:token  (public)
async function access(req, res, next) {
  try {
    const password = req.body?.password || req.query?.password;
    const share = await loadPublicShare(req.params.token, password);

    if (share.file_id) {
      const file = await query('SELECT id, name, mime_type, size FROM files WHERE id = $1', [share.file_id]);
      return res.json({ type: 'file', resource: file.rows[0], token: share.token });
    }
    const folder = await query('SELECT id, name FROM folders WHERE id = $1', [share.folder_id]);
    return res.json({ type: 'folder', resource: folder.rows[0], token: share.token });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.protected ? { protected: true } : {}),
      });
    }
    next(err);
  }
}

// DELETE /shares/:id
async function revoke(req, res, next) {
  try {
    await query('DELETE FROM shares WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    return res.json({ message: 'Share link revoked' });
  } catch (err) {
    next(err);
  }
}

// GET /shares  — list all links created by the user (with resolved resource name)
async function list(req, res, next) {
  try {
    const result = await query(
      `SELECT s.id, s.token, s.file_id, s.folder_id, s.expires_at,
              s.password_hash IS NOT NULL AS password_protected, s.created_at,
              f.name  AS file_name,
              fo.name AS folder_name
       FROM shares s
       LEFT JOIN files   f  ON f.id  = s.file_id
       LEFT JOIN folders fo ON fo.id = s.folder_id
       WHERE s.owner_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /shares/with-me  — folders shared with the current user by others
async function sharedWithMe(req, res, next) {
  try {
    const result = await query(
      `SELECT fo.id, fo.name, fo.owner_id, fm.permission, fm.created_at,
              u.display_name AS shared_by_name, u.email AS shared_by_email
       FROM folder_members fm
       JOIN folders fo ON fo.id = fm.folder_id
       JOIN users   u  ON u.id  = fo.owner_id
       WHERE fm.user_id = $1 AND fo.trashed = FALSE
       ORDER BY fm.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /shares/:token/download — public file download or folder ZIP
async function downloadPublic(req, res, next) {
  try {
    const password = req.body?.password || req.query?.password;
    const share = await loadPublicShare(req.params.token, password);

    if (share.file_id) {
      const file = await query(
        'SELECT * FROM files WHERE id = $1 AND trashed = FALSE',
        [share.file_id],
      );
      const row = file.rows[0];
      if (!row) return res.status(404).json({ error: 'File not found' });
      res.setHeader('Content-Disposition', `attachment; filename="${row.name}"`);
      res.setHeader('Content-Type', row.mime_type);
      return fs.createReadStream(row.storage_path).pipe(res);
    }

    if (share.folder_id) {
      return zipService.streamFolderZip(share.folder_id, share.owner_id, res);
    }

    return res.status(404).json({ error: 'Resource not found' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.protected ? { protected: true } : {}),
      });
    }
    next(err);
  }
}

// GET /shares/:token/preview — public preview (files only)
async function previewPublic(req, res, next) {
  try {
    const password = req.body?.password || req.query?.password;
    const share = await loadPublicShare(req.params.token, password);
    if (!share.file_id) return res.status(400).json({ error: 'Preview only available for files' });
    const result = await query(
      'SELECT * FROM files WHERE id = $1 AND trashed = FALSE',
      [share.file_id],
    );
    const file = result.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });

    const stat = fs.statSync(file.storage_path);
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': file.mime_type,
      });
      return fs.createReadStream(file.storage_path, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': file.mime_type });
    return fs.createReadStream(file.storage_path).pipe(res);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.protected ? { protected: true } : {}),
      });
    }
    next(err);
  }
}

module.exports = {
  create,
  access,
  revoke,
  list,
  sharedWithMe,
  downloadPublic,
  previewPublic,
};
