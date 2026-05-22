const crypto = require('crypto');
const fs = require('fs');

let _key = undefined; // undefined = not yet loaded, null = disabled

function getKey() {
  if (_key !== undefined) return _key;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    _key = null;
    return null;
  }

  if (raw.length !== 64) {
    console.error('[SECURITY] ENCRYPTION_KEY must be 64 hex chars (32 bytes) — encryption disabled');
    _key = null;
    return null;
  }

  _key = Buffer.from(raw, 'hex');
  return _key;
}

function isEnabled() {
  return getKey() !== null;
}

function logStartupWarning() {
  if (!isEnabled()) {
    console.warn('[SECURITY] ENCRYPTION_KEY not set — files stored unencrypted');
  }
}

/**
 * Encrypts filePath in-place using AES-256-CBC.
 * Layout on disk: [16-byte IV][ciphertext]
 * Uses a .enc temp file so the original is only removed after a successful write.
 */
async function encryptFile(filePath) {
  const key = getKey();
  if (!key) return;

  const iv = crypto.randomBytes(16);
  const tmpPath = filePath + '.enc';

  try {
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(tmpPath);
      const input = fs.createReadStream(filePath);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      output.on('error', reject);
      input.on('error', (err) => { output.destroy(); reject(err); });
      cipher.on('error', (err) => { output.destroy(); reject(err); });
      output.on('finish', resolve);

      // Write IV first (synchronously enqueued before cipher data flows)
      output.write(iv);
      input.pipe(cipher).pipe(output);
    });

    fs.unlinkSync(filePath);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}

/**
 * Returns a readable stream of decrypted content.
 * Reads the 16-byte IV from the file header synchronously (minimal overhead),
 * then streams the rest through the decipher transform.
 */
function createDecryptStream(storagePath) {
  const key = getKey();

  const fd = fs.openSync(storagePath, 'r');
  const iv = Buffer.alloc(16);
  fs.readSync(fd, iv, 0, 16, 0);
  fs.closeSync(fd);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return fs.createReadStream(storagePath, { start: 16 }).pipe(decipher);
}

module.exports = { isEnabled, logStartupWarning, encryptFile, createDecryptStream };
