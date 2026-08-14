// DİKKAT: Eğer models klasöründeki dosyanın adı farklıysa burayı düzelt
const Basket = require('../models/Basket'); 

// 1. Kullanıcının Sepetini Getir (GET)
exports.getBasket = async (req, res) => {
  try {
    const userId = req.user._id;
    // Sepeti bul ve içindeki ürünlerin (Product) detaylarını da çek (populate)
    let basket = await Basket.findOne({ user: userId }).populate('products.product');
    
    // Eğer kullanıcının henüz bir sepeti yoksa boş döndür
    if (!basket) {
      return res.status(200).json({ products: [], totalPrice: 0 });
    }
    res.status(200).json(basket);
  } catch (error) {
    res.status(500).json({ message: 'Sepet getirilirken hata oluştu.', error: error.message });
  }
};

// 2. Sepete Ürün Ekle (POST)
exports.addToBasket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body; // Postman'den eklenecek ürün ve adet gelecek

    // Kullanıcının sepetini bul, yoksa yeni oluştur
    let basket = await Basket.findOne({ user: userId });
    if (!basket) {
      basket = new Basket({ user: userId, products: [], totalPrice: 0 });
    }

    // Ürün zaten sepette var mı kontrol et
    const existingProductIndex = basket.products.findIndex(p => p.product.toString() === productId);

    if (existingProductIndex > -1) {
      // Varsa sadece miktarını artır
      basket.products[existingProductIndex].quantity += (quantity || 1);
    } else {
      // Yoksa yeni ürün olarak sepete ekle
      basket.products.push({ product: productId, quantity: quantity || 1 });
    }

    await basket.save();
    res.status(200).json({ message: 'Ürün sepete eklendi.', basket });
  } catch (error) {
    res.status(500).json({ message: 'Ürün sepete eklenirken hata oluştu.', error: error.message });
  }
};

// 3. Sepetten Ürün Çıkar (POST veya DELETE)
exports.removeFromBasket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    const basket = await Basket.findOne({ user: userId });
    if (!basket) {
      return res.status(404).json({ message: 'Sepet bulunamadı.' });
    }

    // Ürünü sepetten filtreleyerek çıkar
    basket.products = basket.products.filter(p => p.product.toString() !== productId);

    await basket.save();
    res.status(200).json({ message: 'Ürün sepetten çıkarıldı.', basket });
  } catch (error) {
    res.status(500).json({ message: 'Ürün çıkarılırken hata oluştu.', error: error.message });
  }
};