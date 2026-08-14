const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User1');

// Kayıt Olma (Register)
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kullanıcı zaten var mı kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
    }

    // Şifreyi hash'leme (Salt rounds: 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Yeni kullanıcıyı kaydetme
    const newUser = new User({ email, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
};

// Giriş Yapma (Login)
exports.login = (req, res) => {
  // req.user, Passport'un Local Strategy'si başarılı olursa otomatik olarak dolar
  const payload = {
    id: req.user._id,
    email: req.user.email
  };

  // JWT Üretimi (Örn: 1 gün geçerli)
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(200).json({
    message: 'Giriş başarılı',
    token: `Bearer ${token}`
  });
};