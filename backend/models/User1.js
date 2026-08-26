const mongoose = require('mongoose');

const User1Schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  
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