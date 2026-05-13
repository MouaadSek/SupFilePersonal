const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/shareController');

router.get('/',           auth, c.list);          // list my links
router.get('/with-me',    auth, c.sharedWithMe);  // folders shared with me
router.post('/',          auth, c.create);
router.get('/:token',     c.access);              // public — no auth
router.delete('/:id',     auth, c.revoke);

module.exports = router;
