const Product = require('../models/Product');

// 1. Tüm Ürünleri Getir (Kullanıcının ekranına düşecek kartlar)
exports.getAllProducts = async (req, res) => {
  try {
    // İleride buraya "sadece kaydırılmamış ürünleri getir" algoritmasını ekleyeceğiz
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Ürünler getirilirken hata oluştu.', error: error.message });
  }
};

// 2. Yeni Ürün Ekle (Şimdilik Postman'den veri girmek için kullanacağız)
exports.createProduct = async (req, res) => {
  try {
    // req.body'den çekerken senin şemandaki isimleri (title, store vb.) kullanıyoruz
    const { title, description, price, category, productUrl, imageUrl, store, gender, color, sizes, tags } = req.body;

    const newProduct = new Product({
      title, description, price, category, productUrl, imageUrl, store, gender, color, sizes, tags
    });

    await newProduct.save();
    res.status(201).json({ message: 'Ürün başarıyla eklendi.', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Ürün eklenirken hata oluştu.', error: error.message });
  }
};