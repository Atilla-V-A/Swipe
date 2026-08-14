const express = require('express');
const router = express.Router();
const passport = require('passport'); // Yapılandırdığımız passport modülü
const authController = require('../controllers/authController');

// Açık Rotalar
router.post('/register', authController.register);

// Giriş rotası - Local strateji middleware'i araya girip şifreyi kontrol eder
router.post('/login', passport.authenticate('local', { session: false }), authController.login);

// Korumalı Rota Örneği (Test için)
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res) => {
  // Sadece geçerli bir JWT gönderenler buraya ulaşabilir
  res.json({
    message: 'Korumalı alana hoş geldin!',
    user: req.user // JWT stratejisinden dönen kullanıcı bilgisi
  });
});

module.exports = router;