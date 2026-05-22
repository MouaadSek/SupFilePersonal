const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { authLimiter, loginLimiter } = require('../middleware/rateLimitMiddleware');
const { register, login, me } = require('../controllers/authController');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, loginLimiter, login);
router.get('/me', auth, me);

module.exports = router;
