const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { search } = require('../controllers/dashboardController');

router.get('/', auth, search);

module.exports = router;
