const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/favoritesController');

router.get('/',             auth, c.listFavorites);
router.post('/files/:id',   auth, c.toggleFileStar);
router.post('/folders/:id', auth, c.toggleFolderStar);

module.exports = router;
