const mongoose = require('mongoose');

const User1Schema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationCode: { 
    type: String 
  },
  verificationCodeExpires: { 
    type: Date 
  },
  

  // --- YENİ: Şifre Sıfırlama Alanları ---
  resetPasswordCode: { type: String },
  resetPasswordCodeExpires: { type: Date },
  // --- Onboarding için eklenen alanlar ---
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: null
  },
  birthDate: {
    type: Date,
    default: null
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },

  // Tinder mantığı için eklenen alanlar:
  seenProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  tagScores: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

// Modeli projedeki dosya adına uygun olarak 'User1' ismiyle dışarı aktarıyoruz
module.exports = mongoose.model('User1', User1Schema);