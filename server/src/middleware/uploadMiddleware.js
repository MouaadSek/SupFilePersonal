const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll',
  '.com', '.scr', '.vbs', '.jar',
]);

const BLOCKED_MIMES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'application/java-archive',
  'application/x-msdos-program',
]);

function sanitizeFilename(name) {
  return name
    .replace(/\0/g, '')      // null bytes
    .replace(/[/\\]/g, '')   // path separators
    .replace(/\.\./g, '');   // traversal sequences
}

function fileFilter(_req, file, cb) {
  const safe = sanitizeFilename(file.originalname);
  const ext = path.extname(safe).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext) || BLOCKED_MIMES.has(file.mimetype)) {
    const err = new Error('File type not allowed');
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORAGE_PATH),
  filename: (_req, file, cb) => {
    const safe = sanitizeFilename(file.originalname);
    const ext = path.extname(safe).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB per file max
});

module.exports = upload;
