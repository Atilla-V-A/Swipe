    const express = require('express');
    const router = express.Router();
    const swipeController = require('../controllers/swipeController');
    const passport = require('passport');

    // Kontrol et: swipeController.getNextProduct bir fonksiyon mu?
    router.get('/next-product', passport.authenticate('jwt', { session: false }), swipeController.getNextProduct);

    // swipeAction bir fonksiyon mu?
    router.post('/', passport.authenticate('jwt', { session: false }), swipeController.swipeAction);

    // Yeni eklediğimiz sepet / sepetten çıkarma rotaları:
    router.delete('/basket/:productId', passport.authenticate('jwt', { session: false }), swipeController.removeFromBasketAndUndoLike);
    router.delete('/basket', passport.authenticate('jwt', { session: false }), swipeController.clearBasket);

    module.exports = router;