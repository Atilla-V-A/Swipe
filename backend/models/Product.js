const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  // GÜVENLİK: Aynı URL'nin ikinci kez eklenmesini engeller
  productUrl: {
    type: String,
    required: true,
    unique: true 
  },
  imageUrl: {
    type: String,
    required: true
  },
  store: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  color: {
    type: String
  },
  sizes: [{
    type: String
  }],
  tags: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);