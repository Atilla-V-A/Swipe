const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  store: { type: String, required: true }, // 'Zara', 'H&M' vb.
  title: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  productUrl: { type: String, required: true }, // Satın alma linki
  category: { type: String }, // Algoritma için önemli
  tags: [String], // Algoritma için önemli
  createdAt: { type: Date, default: Date.now }
});

// Mağaza ve kategori bazlı aramaları hızlandırmak için index
ProductSchema.index({ store: 1, category: 1 });

module.exports = mongoose.model('Product', ProductSchema);