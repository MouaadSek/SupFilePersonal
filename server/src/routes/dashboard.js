const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { quota, recent, breakdown } = require('../controllers/dashboardController');

router.get('/quota',     auth, quota);
router.get('/recent',    auth, recent);
router.get('/breakdown', auth, breakdown);

module.exports = router;
