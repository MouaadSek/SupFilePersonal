const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/shareController');

router.get('/', auth, c.list);
router.get('/with-me', auth, c.sharedWithMe);
router.post('/', auth, c.create);
router.get('/:token/download', c.downloadPublic);
router.get('/:token/preview', c.previewPublic);
router.get('/:token', c.access);
router.delete('/:id', auth, c.revoke);

module.exports = router;
