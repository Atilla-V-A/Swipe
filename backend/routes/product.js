const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const passport = require('passport');

// GET: /api/products -> Tüm ürünleri listeler (Sadece giriş yapmış kullanıcılar görebilir)
router.get('/', passport.authenticate('jwt', { session: false }), productController.getAllProducts);

// POST: /api/products -> Yeni ürün ekler (Normalde bunu sadece admin yapmalı, şimdilik teste açık)
router.post('/', passport.authenticate('jwt', { session: false }), productController.createProduct);

module.exports = router;