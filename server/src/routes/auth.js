const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { register, login, me, googleAuth, forgotPassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.get('/me', auth, me);

module.exports = router;
