const express = require('express');
const router = express.Router();
const basketController = require('../controllers/basketController');
const passport = require('passport');

// Tüm rotalar JWT ile korunuyor
router.get('/', passport.authenticate('jwt', { session: false }), basketController.getBasket);
router.post('/add', passport.authenticate('jwt', { session: false }), basketController.addToBasket);
router.post('/remove', passport.authenticate('jwt', { session: false }), basketController.removeFromBasket);

module.exports = router;