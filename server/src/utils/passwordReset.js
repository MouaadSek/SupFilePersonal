const crypto = require('crypto');

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** @returns {number} expiry duration in milliseconds */
function parseResetExpiresMs() {
  const raw = (process.env.PASSWORD_RESET_EXPIRES_IN || '1h').trim().toLowerCase();
  const withUnit = /^(\d+)\s*(h|m|d|s)$/.exec(raw);
  if (withUnit) {
    const n = parseInt(withUnit[1], 10);
    const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * mult[withUnit[2]];
  }
  if (/^\d+$/.test(raw)) return parseInt(raw, 10) * 1000;
  return 3_600_000;
}

function getClientOrigin() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
}

function formatExpiresLabel(ms) {
  const hours = Math.round(ms / 3_600_000);
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24} day(s)`;
  if (hours >= 1) return `${hours} hour(s)`;
  const mins = Math.round(ms / 60_000);
  return `${mins} minute(s)`;
}

module.exports = {
  hashResetToken,
  parseResetExpiresMs,
  getClientOrigin,
  formatExpiresLabel,
};
