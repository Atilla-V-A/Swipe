const { chromium } = require('playwright');
const cheerio = require('cheerio');
const Product = require('../../models/Product');

class StoreOneAdapter {
  constructor() {
    this.storeName = 'Zara'; 
    // GÖREV: Zara KADIN PANTOLON VEYA JEAN linkini buraya yapıştır!
    // (İstersen önce pantolon linkiyle çalıştır, sonra jean linkiyle bir daha çalıştır)
    this.targetUrl = 'https://www.zara.com/tr/tr/woman-best-sellers-jeans-l6130.html?v1=2491844'; 
    this.gender = 'Kadın';
  }

  // 1. KATEGORİ BULMA ALGORİTMASI 
  extractCategory(title) {
    const t = title.toLowerCase();
    
    if (t.includes('jean') || t.includes('kot')) return 'Jean';
    if (t.includes('tayt') || t.includes('leggings')) return 'Tayt';
    if (t.includes('eşofman') || t.includes('jogger')) return 'Eşofman';
    if (t.includes('şort')) return 'Şort'; // Araya karışanlar için güvenlik
    
    return 'Pantolon'; // Varsayılan genel kategori
  }

  // 2. DETAY VE KUMAŞ BULMA ALGORİTMASI (Deri, Kargo, Yırtık, Yüksek Bel)
  extractFeatures(title) {
    const t = title.toLowerCase();
    const features = [];
    
    // Bel Yüksekliği (En kritik özellik)
    if (t.includes('yüksek bel') || t.includes('high-rise') || t.includes('high waist')) features.push('Yüksek Bel');
    if (t.includes('düşük bel') || t.includes('low-rise') || t.includes('low waist')) features.push('Düşük Bel');
    if (t.includes('orta bel') || t.includes('mid-rise')) features.push('Normal Bel');
    
    // Tasarım
    if (t.includes('kargo') || t.includes('cargo')) features.push('Kargo');
    if (t.includes('pileli') || t.includes('pilili') || t.includes('pleated')) features.push('Pileli');
    if (t.includes('yırtık') || t.includes('eskitme') || t.includes('ripped')) features.push('Yırtık Detaylı');
    if (t.includes('yırtmaçlı') || t.includes('slit')) features.push('Yırtmaçlı');
    
    // Kumaş Özellikleri
    if (t.includes('deri') || t.includes('suni deri') || t.includes('faux leather')) features.push('Deri');
    if (t.includes('keten') || t.includes('linen')) features.push('Keten');
    if (t.includes('paraşüt') || t.includes('parachute')) features.push('Paraşüt Kumaş');
    if (t.includes('kadife') || t.includes('velvet') || t.includes('corduroy')) features.push('Kadife / Fitilli');

    return features;
  }

  // 3. KALIP (FIT) BULMA ALGORİTMASI (Zara'nın meşhur jean ve pantolon kalıpları)
  extractFit(title) {
    const t = title.toLowerCase();
    
    // En popüler Kadın alt giyim kalıpları
    if (t.includes('mom')) return 'Mom Fit';
    if (t.includes('flare') || t.includes('ispanyol') || t.includes('flared')) return 'Flared (İspanyol)';
    if (t.includes('bootcut')) return 'Bootcut';
    if (t.includes('wide leg') || t.includes('bol paça')) return 'Wide Leg';
    if (t.includes('baggy')) return 'Baggy';
    if (t.includes('culotte')) return 'Culotte';
    if (t.includes('balloon') || t.includes('balon')) return 'Balloon Fit';
    
    // Dar ve Düz Kesimler
    if (t.includes('skinny')) return 'Skinny Fit';
    if (t.includes('slim') || t.includes('dar')) return 'Slim Fit';
    if (t.includes('straight') || t.includes('düz')) return 'Straight Fit';
    
    if (t.includes('loose') || t.includes('dökümlü')) return 'Loose Fit';
    
    return 'Regular Fit'; 
  }

  async fetchRawHtml() {
    try {
      console.log(`${this.storeName} Sanal tarayıcısı başlatılıyor...`);
      const browser = await chromium.launch({ headless: false }); 
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      console.log(`${this.storeName} sayfasına gidiliyor...`);
      await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });
      
      try {
        await page.waitForSelector('.product-grid-product', { timeout: 15000 });
        console.log('✅ Ürünler ekranda belirdi!');
      } catch (err) {
        console.log('❌ UYARI: 15 saniye bekledik ama ürünler gelmedi.');
      }

      console.log('⏳ 20 Saniyelik kaydırma maratonu başlıyor... Arkanı yasla ve izle!');
      
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 400; 
          
          const startTime = new Date().getTime();
          const maxScrollTime = 5000; 

          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            const currentTime = new Date().getTime();
            if ((currentTime - startTime) >= maxScrollTime || totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 150); 
        });
      });

      console.log('✅ Kaydırma durduruldu, veriler toplanıyor...');
      await page.waitForTimeout(3000); 

      const html = await page.content();
      await browser.close(); 
      return html;
    } catch (error) {
      console.error(`${this.storeName} verisi çekilirken hata:`, error.message);
      return null;
    }
  }

  normalizeData(html) {
    const $ = cheerio.load(html);
    const normalizedProducts = [];

    $('.product-grid-product').each((index, element) => {
      const rawTitle = $(element).find('.product-grid-product-info__name h3').text().trim() || $(element).find('.product-link').text().trim();
      
      const priceValue = $(element).find('.price-formatted__price-amount data').attr('value');
      const cleanPrice = parseFloat(priceValue);
      
      let rawImageUrl = $(element).find('img.media-image__image').attr('src');
      let rawProductUrl = $(element).find('a.product-grid-product__link').attr('href');

      if (rawProductUrl && rawProductUrl.includes('?')) {
        rawProductUrl = rawProductUrl.split('?')[0];
      }

      // 🛡️ KATI GÖRSEL FİLTRESİ
      const isValidImage = rawImageUrl && 
                           !rawImageUrl.includes('transparent') && 
                           !rawImageUrl.startsWith('data:image') &&
                           rawImageUrl.includes('http');

      if (rawTitle && cleanPrice && isValidImage && rawProductUrl) {
        
        // 🧠 KATEGORİ, KALIP VE MATERYAL ANALİZ MOTORLARI
        const detectedCategory = this.extractCategory(rawTitle);
        const detectedFit = this.extractFit(rawTitle);
        const detectedFeatures = this.extractFeatures(rawTitle);

        let combinedTags = [
          detectedCategory.toLowerCase().replace(/ /g, '-'), 
          detectedFit.toLowerCase().replace(/ /g, '-'), 
          this.storeName.toLowerCase() 
        ];

        if (detectedCategory === 'Jean' && !combinedTags.includes('denim')) {
            combinedTags.push('denim');
        }

        if (detectedFeatures.length > 0) {
          detectedFeatures.forEach(feature => {
            combinedTags.push(feature.toLowerCase().replace(/ /g, '-'));
          });
        }

        normalizedProducts.push({
          title: rawTitle,
          description: `${this.storeName} koleksiyonundan ${detectedFit} harika bir kadın ${detectedCategory.toLowerCase()}.`,
          price: cleanPrice,
          productUrl: rawProductUrl.startsWith('http') ? rawProductUrl : `https://www.zara.com${rawProductUrl}`,
          imageUrl: rawImageUrl,
          store: this.storeName,
          gender: this.gender,
          category: detectedCategory, 
          color: 'Belirtilmemiş',
          // Zara kadın pantolon/jean bedenleri genelde EU cinsindendir
          sizes: ['32', '34', '36', '38', '40', '42', '44'], 
          tags: combinedTags
        });
      }
    });

    return normalizedProducts;
  }

  async saveToDatabase(products) {
    let savedCount = 0;
    for (const prodData of products) {
      try {
        const exists = await Product.findOne({ productUrl: prodData.productUrl });
        if (!exists) {
          const newProduct = new Product(prodData);
          await newProduct.save();
          savedCount++;
        }
      } catch (error) {
        if (error.code !== 11000) {
          console.error(`Ürün kaydedilemedi (${prodData.title}):`, error.message);
        }
      }
    }
    console.log(`🎯 ${this.storeName} mağazasından ${savedCount} yeni ${this.gender} Pantolon/Jean ürünü veritabanına eklendi!`);
  }

  async run() {
    console.log(`${this.storeName} scraper başlatılıyor...`);
    const html = await this.fetchRawHtml();
    
    if (html) {
      const products = this.normalizeData(html);
      console.log(`${products.length} adet ürün HTML'den ayıklandı. Veritabanına yazılıyor...`);
      await this.saveToDatabase(products);
    } else {
      console.log("HTML verisi alınamadığı için işlem durduruldu.");
    }
  }
}

module.exports = StoreOneAdapter;