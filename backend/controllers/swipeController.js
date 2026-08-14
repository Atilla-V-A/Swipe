const SwipeHistory = require('../models/SwipeHist');

// Kullanıcının kaydırma hareketini (Sağ/Sol) kaydet
exports.recordSwipe = async (req, res) => {
  try {
    // Frontend'den hangi ürünün kaydırıldığını ve ne yöne (liked/disliked) kaydırıldığını alıyoruz
    const { productId, action } = req.body;
    
    // JWT sayesinde işlemi yapanın kim olduğunu (req.user._id) kesin olarak biliyoruz
    const userId = req.user._id;

    // Yeni bir kaydırma geçmişi belgesi oluştur
    const newSwipe = new SwipeHistory({
      user: userId,
      product: productId,
      action: action
    });

    await newSwipe.save();

    res.status(201).json({ 
      message: 'Kaydırma hareketi başarıyla kaydedildi.', 
      swipe: newSwipe 
    });

  } catch (error) {
    // Eğer aynı ürünü ikinci kez kaydırmaya çalışırsa (Dün yazdığın compound index sayesinde) buraya düşer
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bu ürün zaten kaydırılmış.' });
    }
    res.status(500).json({ message: 'Kaydırma kaydedilirken hata oluştu.', error: error.message });
  }
};