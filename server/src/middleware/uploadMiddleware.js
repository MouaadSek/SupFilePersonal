const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORAGE_PATH),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB per file max
});

module.exports = upload;
