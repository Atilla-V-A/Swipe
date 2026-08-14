const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const passport = require('passport');

// POST: /api/swipes -> Kaydırma hareketini kaydeder (Sadece giriş yapmış kullanıcılar)
router.post('/', passport.authenticate('jwt', { session: false }), swipeController.recordSwipe);

module.exports = router;