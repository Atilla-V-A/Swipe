const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const User = require('../models/User1'); // Changed 'User' to 'user' to match the file name casing

// 1. Local Strategy (Giriş Yapmak İçin)
passport.use(new LocalStrategy(
  { usernameField: 'email' }, // Varsayılan 'username' yerine 'email' kullanıyoruz
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'Kullanıcı bulunamadı.' });
      }

      // bcrypt ile düz şifreyi, veritabanındaki hash ile karşılaştırıyoruz
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return done(null, false, { message: 'Hatalı şifre.' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// 2. JWT Strategy (Korumalı Rotalara Erişim İçin)
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Token'ı Authorization header'ından 'Bearer <token>' şeklinde alacak
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id).select('-passwordHash'); // Güvenlik için hash'i dışarıda bırakıyoruz
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

module.exports = passport;