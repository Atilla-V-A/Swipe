const Product = require('../models/Product');
const User1 = require('../models/User1');
const SwipeHistory = require('../models/SwipeHist');
const TagScoringStrategy = require('../strategies/TagScoringStrategy');

const scoringStrategy = new TagScoringStrategy();

// 1. Sıradaki Ürünü Getir
// 1. Sıradaki Ürünü Getir (Keşif %20 + Eşleşme %80)
exports.getNextProduct = async (req, res) => {
  try {
    const userId = req.user._id; 
    const user = await User1.findById(userId);

    const unseenProducts = await Product.find({
      _id: { $nin: user.seenProducts }
    }).limit(100);

    if (unseenProducts.length === 0) {
      return res.status(404).json({ message: "Gösterilecek yeni ürün kalmadı!" });
    }

    // --- KEŞİF (EXPLORATION) ALGORİTMASI ---
    const EXPLORATION_RATE = 0.20; // %20 ihtimalle tamamen farklı bir ürün çıkacak
    const isExploration = Math.random() < EXPLORATION_RATE;

    let bestProduct;
    let maxScore = -Infinity;

    if (isExploration) {
      // KEŞİF MODU: 100 ürün havuzundan tamamen rastgele bir ürün seç
      const randomIndex = Math.floor(Math.random() * unseenProducts.length);
      bestProduct = unseenProducts[randomIndex];
      
      // Yine de frontend'e bilgi vermek için bu rastgele ürünün güncel skorunu hesaplıyoruz
      maxScore = scoringStrategy.calculateScore(bestProduct, user);
      
    } else {
      // EŞLEŞME MODU: En yüksek puanlı ürünü bul (Eski mantık)
      unseenProducts.forEach(product => {
        const currentScore = scoringStrategy.calculateScore(product, user);
        if (currentScore > maxScore) {
          maxScore = currentScore;
          bestProduct = product;
        }
      });
    }

    res.status(200).json({ 
      product: bestProduct, 
      matchScore: maxScore,
      isExploration: isExploration // Frontend'e bunun bir "Keşif" ürünü olduğunu bildirebilirsin
    });

  } catch (error) {
    console.error("getNextProduct Hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
};
// 2. Swipe Aksiyonu: Liked (Sepete ekle/puanla) veya Disliked (Puan kır)
exports.swipeAction = async (req, res) => {
  try {
    const { productId, action } = req.body; // action: 'liked' veya 'disliked'
    const userId = req.user._id;

    const user = await User1.findById(userId);
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    // A. Algoritmayı Güncelle
    if (!user.seenProducts.includes(productId)) {
      user.seenProducts.push(productId);
      
      // Liked (+1), Disliked (-1)
      const point = action === 'liked' ? 1 : -1;
      if (product.tags) {
        product.tags.forEach(tag => {
          const currentScore = user.tagScores.get(tag) || 0;
          user.tagScores.set(tag, currentScore + point);
        });
      }
      await user.save();
    }

    // B. SwipeHist'e logla
    const newSwipe = new SwipeHistory({ user: userId, product: productId, action: action });
    await newSwipe.save();

    // C. Eğer 'liked' ise Basket'e de ekleyebilirsin (Otomatik Sepet Entegrasyonu)
    // Eğer sepet controller'ında ayrı bir "add" metodun varsa buraya çağırabilirsin.
    
    res.status(201).json({ message: `Ürün ${action} edildi ve sistem güncellendi.` });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Sepet İşlemleri (Sepetten Kaldırma / Temizleme)
// Bu metodları basketController'dan da çağırabilirsin ama swipe ile entegre olmalı
exports.removeFromBasketAndUndoLike = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;
        
        // 1. SwipeHist'ten sil
        await SwipeHistory.findOneAndDelete({ user: userId, product: productId, action: 'liked' });
        
        // 2. User seenProducts'tan çıkar (Böylece tekrar önüne düşebilir)
        await User1.findByIdAndUpdate(userId, { $pull: { seenProducts: productId } });
        
        // 3. (Opsiyonel) Eğer Basket modelin varsa:
        // await Basket.findOneAndUpdate({ user: userId }, { $pull: { products: productId } });

        res.status(200).json({ message: "Ürün sepetten kaldırıldı ve beğeniden vazgeçildi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.clearBasket = async (req, res) => {
    try {
        const userId = req.user._id;
        // Tüm sepeti temizle
        // await Basket.findOneAndUpdate({ user: userId }, { $set: { products: [] } });
        res.status(200).json({ message: "Sepetiniz başarıyla temizlendi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};