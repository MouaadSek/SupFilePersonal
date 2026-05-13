const { query } = require('../db');

/**
 * Checks if the user has enough quota and increments it atomically.
 * Throws an error with status 413 if quota would be exceeded.
 */
async function checkAndIncrement(userId, bytes) {
  const result = await query(
    `UPDATE users
     SET quota_used = quota_used + $1
     WHERE id = $2 AND quota_used + $1 <= quota_total
     RETURNING quota_used, quota_total`,
    [bytes, userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Storage quota exceeded');
    err.status = 413;
    throw err;
  }
  return result.rows[0];
}

/**
 * Decrements quota when a file is permanently deleted.
 */
async function decrement(userId, bytes) {
  await query(
    'UPDATE users SET quota_used = GREATEST(0, quota_used - $1) WHERE id = $2',
    [bytes, userId]
  );
}

module.exports = { checkAndIncrement, decrement };
