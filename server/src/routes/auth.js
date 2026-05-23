const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { authLimiter, loginLimiter } = require('../middleware/rateLimitMiddleware');
const { handleValidation } = require('../middleware/validate');
const {
  register, login, me, googleAuth, forgotPassword, resetPassword,
} = require('../controllers/authController');

router.post('/register',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('display_name').optional().trim(),
  body('name').optional().trim(),
  handleValidation,
  register
);

router.post('/login',
  authLimiter,
  loginLimiter,
  body('email').isEmail().trim().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
  login
);

router.get('/me', auth, me);

router.post('/google',
  authLimiter,
  body('id_token').notEmpty().withMessage('id_token is required'),
  handleValidation,
  googleAuth
);

router.post('/forgot-password',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidation,
  forgotPassword
);

router.post('/reset-password',
  authLimiter,
  body('token').notEmpty().withMessage('token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidation,
  resetPassword
);

module.exports = router;
