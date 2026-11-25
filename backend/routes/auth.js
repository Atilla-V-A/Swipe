const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// Açık Rotalar
router.post('/register', authController.register);
router.post('/login', passport.authenticate('local', { session: false }), authController.login);
router.post('/verify-email', authController.verifyEmail);

// --- YENİ EKLENEN ROTALAR (Şifre Sıfırlama) ---
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
// ---------------------------------------------

// Korumalı Rota: GET Profile & Stats
router.get('/profile', passport.authenticate('jwt', { session: false }), authController.getProfile);

// Korumalı Rota: Profil Tamamlama (Onboarding) - JWT korumalı
router.put('/update-profile', passport.authenticate('jwt', { session: false }), authController.updateProfile);

// Korumalı Rota: Kullanıcı Ayarları Güncelleme
router.put('/settings', passport.authenticate('jwt', { session: false }), authController.updateUserSettings);

// Korumalı Rota: Hesap Silme
router.delete('/delete-account', passport.authenticate('jwt', { session: false }), authController.deleteAccount);

module.exports = router;