const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User1'); 
const UserStat = require('../models/UserStat');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, text }) => {
  if (process.env.EMAIL_WEBHOOK_URL) {
    const response = await axios.post(
      process.env.EMAIL_WEBHOOK_URL,
      {
        to,
        subject,
        text,
        secret: process.env.EMAIL_WEBHOOK_SECRET || ''
      },
      { timeout: 15000 }
    );
    if (!response.data || response.data.ok !== true) {
      throw new Error(response.data?.error || 'Email webhook failed');
    }
    return;
  }

  await transporter.sendMail({
    from: `"Drip App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
};

// 1. KAYIT OLMA (REGISTER)
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body; 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Lütfen geçerli bir email adresi giriniz.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Bu email zaten kullanılıyor.' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await sendEmail({
      to: email,
      subject: 'Drip - Hesabınızı Doğrulayın',
      text: `Drip uygulamasına hoş geldiniz! Doğrulama kodunuz: ${otpCode}. Bu kod 15 dakika geçerlidir.`
    });

    let userToSave;
    if (existingUser) {
      existingUser.name = name;
      existingUser.passwordHash = hashedPassword;
      existingUser.verificationCode = otpCode;
      existingUser.verificationCodeExpires = otpExpires;
      userToSave = existingUser;
    } else {
      userToSave = new User({
        name,
        email,
        passwordHash: hashedPassword,
        isVerified: false,
        verificationCode: otpCode,
        verificationCodeExpires: otpExpires
      });
    }

    await userToSave.save();

    res.status(201).json({ 
      message: 'Kayıt başarılı. Lütfen email adresinize gönderilen kodu girin.',
      userId: userToSave._id,
      email: userToSave.email
    });

  } catch (error) {
    console.error("🔥 KAYIT HATASI DETAYI:", error);
    res.status(500).json({ message: 'Kayıt olurken hata oluştu.', error: error.message });
  }
};


// 2. EMAİL DOĞRULAMA (OTP KONTROLÜ)
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    if (user.isVerified) return res.status(400).json({ message: 'Bu hesap zaten doğrulanmış.' });
    if (user.verificationCode !== code) return res.status(400).json({ message: 'Geçersiz doğrulama kodu.' });
    if (user.verificationCodeExpires < Date.now()) return res.status(400).json({ message: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.' });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    
    await user.save();

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ 
      message: 'Email başarıyla doğrulandı.',
      token: `Bearer ${token}`,
      user: {
        _id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete, 
        gender: user.gender,                       
        birthDate: user.birthDate 
      }
    });

  } catch (error) {
    console.error("🔥 DOĞRULAMA HATASI DETAYI:", error);
    res.status(500).json({ message: 'Doğrulama işlemi sırasında hata oluştu.', error: error.message });
  }
};


// 3. GİRİŞ YAPMA (LOGIN)
exports.login = (req, res) => {
  const payload = {
    id: req.user._id,
    email: req.user.email,
    isVerified: req.user.isVerified,
    isProfileComplete: req.user.isProfileComplete, 
    gender: req.user.gender,                       
    birthDate: req.user.birthDate                  
  };

  if (!req.user.isVerified) {
    return res.status(403).json({ 
      message: 'Lütfen giriş yapmadan önce email adresinizi doğrulayın.',
      requiresVerification: true,
      email: req.user.email
    });
  }

  const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.status(200).json({
    message: 'Giriş başarılı',
    token: `Bearer ${token}`,
    user: payload
  });
};

// 4. PROFİL TAMAMLAMA (ONBOARDING)
exports.updateProfile = async (req, res) => {
  try {
    const { gender, birthDate } = req.body;

    if (!gender || !birthDate) return res.status(400).json({ message: 'Cinsiyet ve doğum tarihi zorunludur.' });
    if (!['male', 'female', 'other'].includes(gender)) return res.status(400).json({ message: 'Geçersiz cinsiyet değeri.' });

    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'Geçersiz doğum tarihi formatı.' });

    const today = new Date();
    let age = today.getFullYear() - parsedDate.getFullYear();
    const m = today.getMonth() - parsedDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < parsedDate.getDate())) age--;

    if (age < 0) return res.status(400).json({ message: 'Doğum tarihi gelecekte olamaz.' });
    if (age > 120) return res.status(400).json({ message: 'Lütfen geçerli bir doğum tarihi giriniz.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    user.gender = gender;
    user.birthDate = parsedDate;
    user.isProfileComplete = true;

    await user.save();

    res.status(200).json({
      message: 'Profil başarıyla güncellendi.',
      user: {
        id: user._id,
        email: user.email,
        gender: user.gender,
        birthDate: user.birthDate,
        isProfileComplete: user.isProfileComplete
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Profil güncellenirken hata oluştu.', error: error.message });
  }
};

// 5. GET PROFILE (WITH STATS)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-passwordHash -verificationCode -resetPasswordCode');

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7; 
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [weeklySwipes, weeklyLikes, monthlySwipes, monthlyLikes] = await Promise.all([
      UserStat.countDocuments({ user: userId, action: 'swipe', createdAt: { $gte: startOfWeek } }),
      UserStat.countDocuments({ user: userId, action: 'like', createdAt: { $gte: startOfWeek } }),
      UserStat.countDocuments({ user: userId, action: 'swipe', createdAt: { $gte: startOfMonth } }),
      UserStat.countDocuments({ user: userId, action: 'like', createdAt: { $gte: startOfMonth } }),
    ]);

    res.status(200).json({
      user,
      stats: {
        weekly: { swipes: weeklySwipes, likes: weeklyLikes },
        monthly: { swipes: monthlySwipes, likes: monthlyLikes }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Profil getirilirken hata oluştu.', error: error.message });
  }
};

// 6. UPDATE USER SETTINGS
exports.updateUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, gender, birthDate } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'Bu email zaten kullanılıyor.' });
      user.email = email;
    }

    if (name !== undefined) user.name = name;
    if (gender !== undefined) user.gender = gender;
    
    if (birthDate) {
      const parsedDate = new Date(birthDate);
      if (!isNaN(parsedDate.getTime())) user.birthDate = parsedDate;
    }

    await user.save();

    res.status(200).json({
      message: 'Ayarlar başarıyla güncellendi.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        birthDate: user.birthDate,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ayarlar güncellenirken hata oluştu.', error: error.message });
  }
};

// 7. DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const UserStat = require('../models/UserStat');
    const Basket = require('../models/Basket');
    
    await UserStat.deleteMany({ user: userId });
    await Basket.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account.', error: error.message });
  }
};

// --- YENİ EKLENENLER: ŞİFRE SIFIRLAMA ---

// 8. ŞİFRE SIFIRLAMA KODU GÖNDER (Forgot Password)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Bu e-posta adresine ait kullanıcı bulunamadı." });
    }

    // 6 haneli kod oluştur
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = Date.now() + 15 * 60 * 1000; // 15 dakika
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Drip - Şifre Sıfırlama Kodu',
      text: `Şifrenizi sıfırlamak için onay kodunuz: ${resetCode}\n\nBu kod 15 dakika geçerlidir.`
    });
    res.status(200).json({ message: "Şifre sıfırlama kodu e-posta adresinize gönderildi." });

  } catch (error) {
    console.error("🔥 ŞİFRE SIFIRLAMA MAİL HATASI:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
};

// 9. KOD İLE YENİ ŞİFRE BELİRLE (Reset Password)
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: "Geçersiz sıfırlama kodu." });
    }
    if (user.resetPasswordCodeExpires < Date.now()) {
      return res.status(400).json({ message: "Sıfırlama kodunun süresi dolmuş. Lütfen yeni kod isteyin." });
    }

    // Yeni şifreyi Hashle ve kaydet
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Güvenlik için kodları temizle
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz." });
  } catch (error) {
    console.error("🔥 ŞİFRE YENİLEME HATASI:", error);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
};