const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Passport modülünü projeye dahil et
const passport = require('passport'); 

// 2. Yazdığımız config/passport.js dosyasını çalıştır (stratejileri yükler)
require('./config/passport1'); 

const app = express();

// Gelen JSON verilerini (Postman body vb.) okuyabilmek için gerekli
app.use(express.json());

// 3. Passport'u Express uygulamasına bağla (Bunu route'lardan ÖNCE yazmalısın)
app.use(passport.initialize());

// 4. Yazdığımız auth rotalarını sisteme tanıt
// İstemci '/api/auth/register' veya '/api/auth/login' isteği attığında 'routes/auth.js' dosyasına yönlendirilecek
app.use('/api/auth', require('./routes/auth'));

// --- Mevcut Veritabanı Bağlantın (Örnek) ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/swipe-shop')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('MongoDB bağlantı hatası:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});