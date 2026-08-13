const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  store: { type: String, required: true }, 
  title: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  productUrl: { type: String, required: true }, 
  
  gender: { 
    type: String, 
    enum: ['Erkek', 'Kadın', 'Kız Çocuk', 'Erkek Çocuk'], 
    required: true 
  },
  // Güncelleme: Tekil String yerine String Array kullanılıyor
  sizes: [String], // Örn: ['S', 'M', 'L']
  color: { type: String }, 
  
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  tags: [String], 
}, { timestamps: true });

// Arama ve filtreleme performansı için güncellenmiş indeks (sizes dahil edildi)
ProductSchema.index({ gender: 1, category: 1, sizes: 1, color: 1 });

module.exports = mongoose.model('Product', ProductSchema);