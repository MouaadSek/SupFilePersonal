const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validate');
const c = require('../controllers/folderController');

router.get('/', auth, c.listRoot);
router.get('/:id', auth, c.listFolder);
router.post('/',
  auth,
  body('name').trim().notEmpty().withMessage('name is required'),
  handleValidation,
  c.create
);
router.patch('/:id',
  auth,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  handleValidation,
  c.update
);
router.delete('/:id', auth, c.trash);
router.get('/:id/zip', auth, c.zip);
router.post('/:id/restore', auth, c.restore);
router.post('/:id/members', auth, c.addMember);
router.delete('/:id/members/:userId', auth, c.removeMember);

module.exports = router;
