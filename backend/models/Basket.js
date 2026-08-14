const mongoose = require('mongoose');

const BasketSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true // Aynı kullanıcıya ikinci bir sepet açılmasını veritabanı seviyesinde engeller
  },
  // GÜNCELLENEN KISIM: Artık sadece ID değil, miktar da tutuyoruz
  products: [{ 
    product: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  // Opsiyonel: Controller'da sıfırladığımız totalPrice alanı için (ileride hesaplamalarda işine yarar)
  totalPrice: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Basket', BasketSchema);