const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const c = require('../controllers/fileController');

router.post('/upload', auth, upload.single('file'), c.upload);
router.get('/trash', auth, c.listTrash);            // must be before /:id
router.delete('/trash/empty', auth, c.emptyTrash);  // must be before /:id
router.get('/:id/download', auth, c.download);
router.get('/:id/preview', auth, c.preview);
router.patch('/:id', auth, c.update);
router.delete('/:id', auth, c.trash);
router.delete('/:id/permanent', auth, c.permanentDelete);
router.post('/:id/restore', auth, c.restore);

module.exports = router;
