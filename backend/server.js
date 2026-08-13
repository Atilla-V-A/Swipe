require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Veritabanı Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('DB Bağlantı Hatası:', err));

app.get('/', (req, res) => {
  res.send('Swipe & Sepet API Çalışıyor');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktif.`));    