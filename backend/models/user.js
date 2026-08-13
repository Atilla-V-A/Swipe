const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  // Güncelleme: 'password' yerine 'passwordHash' kullanıldı
  passwordHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);