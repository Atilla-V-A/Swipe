const Product = require('../models/Product');

const TYPE_VARIANTS = {
  'T-Shirt': ['t-shirt', 'tshirt', 'tişört', 'tee', 't shirt'],
  'Pants': ['pantolon', 'pants', 'jean', 'kot', 'denim'],
  'Skirt': ['etek', 'skirt'],
  'Dress': ['elbise', 'dress'],
  'Shirt': ['gömlek', 'shirt'],
  'Jacket': ['ceket', 'jacket', 'kaban', 'mont', 'trençkot']
};

const FIT_VARIANTS = {
  'Oversize': ['oversize', 'oversized', 'bol', 'geniş', 'rahat kesim'],
  'Regular': ['regular', 'standart', 'normal'],
  'Slim Fit': ['slim', 'dar'],
  'Skinny': ['skinny', 'ekstra dar']
};

// 1. Tüm Ürünleri Getir (Kullanıcının ekranına düşecek kartlar)
exports.getAllProducts = async (req, res) => {
  try {
    const { gender, type, fit } = req.query;
    let query = {};
    let andConditions = [];
    
    // Cinsiyet Filtresi (Tekil)
    if (gender && gender !== 'All' && gender !== '') {
      let genderQuery = gender;
      if (gender === 'Men') genderQuery = 'Erkek';
      if (gender === 'Women') genderQuery = 'Kadın';
      andConditions.push({ gender: { $regex: new RegExp(`^${genderQuery}$`, 'i') } });
    }

    // Ürün Tipi Filtresi (Çoklu Seçim)
    if (type && type !== 'All' && type !== '') {
      const types = type.split(',');
      let typeRegexes = [];
      types.forEach(t => {
        const variants = TYPE_VARIANTS[t] || [t];
        variants.forEach(v => typeRegexes.push(new RegExp(v, 'i')));
      });
      // Kategori, etiket veya başlıkta bu varyantlardan herhangi biri var mı diye bak
      andConditions.push({
        $or: [
          { category: { $in: typeRegexes } },
          { tags: { $in: typeRegexes } },
          { title: { $in: typeRegexes } }
        ]
      });
    }

    // Kesim (Fit) Filtresi (Çoklu Seçim)
    if (fit && fit !== 'All' && fit !== '') {
      const fits = fit.split(',');
      let fitRegexes = [];
      fits.forEach(f => {
        const variants = FIT_VARIANTS[f] || [f];
        variants.forEach(v => fitRegexes.push(new RegExp(v, 'i')));
      });
      // Etiket, başlık veya açıklamada arar
      andConditions.push({
        $or: [
          { tags: { $in: fitRegexes } },
          { title: { $in: fitRegexes } },
          { description: { $in: fitRegexes } }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const products = await Product.find(query);
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