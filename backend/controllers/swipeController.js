const Product = require('../models/Product');
const User1 = require('../models/User1');
const SwipeHistory = require('../models/SwipeHist');
const UserStat = require('../models/UserStat');
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
      
      const isLiked = action === 'liked';
      if (product.tags) {
        product.tags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          const store = product.store ? product.store.toLowerCase() : '';
          const gender = product.gender ? product.gender.toLowerCase() : '';
          
          let point = 0;

          // Cinsiyet tag'lerine puan ekleme (zaten ana filtre)
          if (lowerTag === gender || ['erkek', 'kadın', 'men', 'women', 'unisex'].includes(lowerTag)) {
            point = 0; 
          } 
          // Markalara +1 / -1
          else if (lowerTag === store || lowerTag.includes(store) || store.includes(lowerTag)) {
            point = isLiked ? 1 : -1;
          } 
          // Diğer tüm stil/özellik tag'lerine +4 / -2 (Daha agresif öğrenme)
          else {
            point = isLiked ? 4 : -2;
          }

          if (point !== 0) {
            const currentScore = user.tagScores.get(tag) || 0;
            user.tagScores.set(tag, currentScore + point);
          }
        });
      }
      await user.save();
    }

    // B. SwipeHist'e logla
    const newSwipe = new SwipeHistory({ user: userId, product: productId, action: action });
    await newSwipe.save();

    // Log to UserStat for persistent weekly/monthly metrics
    // Record that a swipe happened
    await new UserStat({ user: userId, action: 'swipe' }).save();
    // If it was a 'liked' action, also record a like
    if (action === 'liked') {
      await new UserStat({ user: userId, action: 'like' }).save();
    }

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

// 4. Algoritmayı Sıfırla (Tag Scores + Seen Products)
exports.resetAlgorithm = async (req, res) => {
    try {
        const userId = req.user._id;
        
        await User1.findByIdAndUpdate(userId, {
            $set: { tagScores: {}, seenProducts: [] }
        });

        res.status(200).json({ message: "Algorithm reset successfully." });
    } catch (error) {
        console.error("Reset algorithm error:", error);
        res.status(500).json({ error: error.message });
    }
};