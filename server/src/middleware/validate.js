const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array().map((e) => e.msg).join('; '),
      errors: errors.array(),
    });
  }
  next();
}

module.exports = { handleValidation };
