const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const ALGO = 'aes-256-cbc';
const IV_LEN = 16;

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

function isEnabled() {
  return getKey() !== null;
}

function logStartupWarning() {
  if (!isEnabled()) {
    console.warn('⚠️  ENCRYPTION_KEY not set — files are stored unencrypted.');
  }
}

/** Encrypt file in place: prepends IV, replaces original. */
async function encryptFile(filePath) {
  const key = getKey();
  if (!key) return;
  const iv = crypto.randomBytes(IV_LEN);
  const tmp = `${filePath}.enc`;
  const out = fs.createWriteStream(tmp);
  out.write(iv);
  await pipeline(
    fs.createReadStream(filePath),
    crypto.createCipheriv(ALGO, key, iv),
    out,
  );
  fs.renameSync(tmp, filePath);
}

function createDecryptStream(filePath) {
  const key = getKey();
  if (!key) throw new Error('Encryption not configured');
  const fd = fs.openSync(filePath, 'r');
  const ivBuf = Buffer.alloc(IV_LEN);
  fs.readSync(fd, ivBuf, 0, IV_LEN, 0);
  fs.closeSync(fd);
  return fs
    .createReadStream(filePath, { start: IV_LEN })
    .pipe(crypto.createDecipheriv(ALGO, key, ivBuf));
}

module.exports = {
  isEnabled,
  logStartupWarning,
  encryptFile,
  createDecryptStream,
};
