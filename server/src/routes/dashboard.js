const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { quota, recent } = require('../controllers/dashboardController');

router.get('/quota', auth, quota);
router.get('/recent', auth, recent);

module.exports = router;
