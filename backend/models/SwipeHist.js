const mongoose = require('mongoose');

const SwipeHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  action: { type: String, enum: ['liked', 'passed'], required: true },
}, { timestamps: true });

// Bir kullanıcı aynı ürünü iki kere kaydıramasın ve sorgular hızlansın diye "Compound Index"
SwipeHistorySchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('SwipeHistory', SwipeHistorySchema);