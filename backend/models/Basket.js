const mongoose = require('mongoose');

const BasketSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true // Aynı kullanıcıya ikinci bir sepet açılmasını veritabanı seviyesinde engeller
  },
  products: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Basket', BasketSchema);