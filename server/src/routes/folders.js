const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/folderController');

router.get('/', auth, c.listRoot);
router.get('/:id', auth, c.listFolder);
router.post('/', auth, c.create);
router.patch('/:id', auth, c.update);
router.delete('/:id', auth, c.trash);
router.get('/:id/zip', auth, c.zip);
router.post('/:id/restore', auth, c.restore);
router.post('/:id/members', auth, c.addMember);
router.delete('/:id/members/:userId', auth, c.removeMember);

module.exports = router;
