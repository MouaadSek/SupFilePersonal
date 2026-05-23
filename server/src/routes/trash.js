const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/trashController');

router.get('/', auth, c.list);
router.delete('/', auth, c.empty);
router.delete('/files/:id', auth, c.purgeFile);
router.delete('/folders/:id', auth, c.purgeFolder);

module.exports = router;
