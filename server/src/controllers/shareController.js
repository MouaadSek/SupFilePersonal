const crypto = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { query } = require('../db');

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

// GET /shares/:token  (public)
async function access(req, res, next) {
  try {
    const result = await query('SELECT * FROM shares WHERE token = $1', [req.params.token]);
    const share = result.rows[0];
    if (!share) return res.status(404).json({ error: 'Link not found' });
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Link has expired' });
    }

    if (share.password_hash) {
      const password = req.body?.password || req.query.password;
      if (!password) return res.status(403).json({ error: 'Password required', protected: true });
      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) return res.status(403).json({ error: 'Wrong password' });
    }

    if (share.file_id) {
      const file = await query('SELECT id, name, mime_type, size FROM files WHERE id = $1', [share.file_id]);
      return res.json({ type: 'file', resource: file.rows[0] });
    }
    const folder = await query('SELECT id, name FROM folders WHERE id = $1', [share.folder_id]);
    return res.json({ type: 'folder', resource: folder.rows[0] });
  } catch (err) {
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

// GET /shares/:token/download  (public — streams the file)
async function downloadShare(req, res, next) {
  try {
    const result = await query('SELECT * FROM shares WHERE token = $1', [req.params.token]);
    const share = result.rows[0];
    if (!share) return res.status(404).json({ error: 'Link not found' });
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Link has expired' });
    }

    if (share.password_hash) {
      const password = req.query.password;
      if (!password) return res.status(403).json({ error: 'Password required', protected: true });
      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) return res.status(403).json({ error: 'Wrong password' });
    }

    if (!share.file_id) return res.status(400).json({ error: 'This share link is for a folder' });

    const fileResult = await query(
      'SELECT * FROM files WHERE id = $1 AND trashed = FALSE',
      [share.file_id]
    );
    const file = fileResult.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mime_type);
    fs.createReadStream(file.storage_path).pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, access, revoke, list, sharedWithMe, downloadShare };
