require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product'); // Kendi yoluna göre ayarla

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🗑️  Veritabanına bağlanıldı, temizlik başlıyor...');
    
    // Bütün ürünleri siler
    await Product.deleteMany({});
    
    console.log('✨ TEMİZLİK BAŞARILI! Veritabanındaki tüm ürünler sıfırlandı.');
    process.exit(0);
  })
  .catch(err => {
    console.error("Hata:", err);
    process.exit(1);
  });