const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { handleValidation } = require('../middleware/validate');
const c = require('../controllers/shareController');

router.get('/',        auth, c.list);
router.get('/with-me', auth, c.sharedWithMe);
router.post('/',
  auth,
  body('file_id').optional({ nullable: true }).isUUID().withMessage('file_id must be a valid UUID'),
  body('folder_id').optional({ nullable: true }).isUUID().withMessage('folder_id must be a valid UUID'),
  body('file_id').custom((_val, { req }) => {
    if (!req.body.file_id && !req.body.folder_id) {
      throw new Error('file_id or folder_id is required');
    }
    return true;
  }),
  handleValidation,
  c.create
);
router.get('/:token/download', c.downloadShare);  // public — stream file
router.get('/:token',          c.access);          // public — no auth
router.delete('/:id',          auth, c.revoke);

module.exports = router;
