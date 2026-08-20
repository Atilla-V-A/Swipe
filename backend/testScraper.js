require('dotenv').config();
const mongoose = require('mongoose');
const StoreOneAdapter = require('./services/scrapers/StoreOneAdapter');

// Veritabanına bağlan
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/swipe-shop')
  .then(async () => {
    console.log('MongoDB bağlantısı başarılı. Scraper testi başlıyor...');
    
    // Adapter'ı çağır ve çalıştır
    const scraper = new StoreOneAdapter();
    await scraper.run();

    console.log('Test bitti, çıkış yapılıyor...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Hata:', err);
    process.exit(1);
  });