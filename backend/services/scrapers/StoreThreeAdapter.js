const { chromium } = require('playwright');
const cheerio = require('cheerio');
const Product = require('../../models/Product');

class StoreThreeAdapter {
  constructor() {
    this.storeName = 'Bershka'; 
    // GÖREV: Bershka KADIN Kazak, Hırka, Sweatshirt linkini buraya yapıştıracaksın!
    this.targetUrl = 'https://www.bershka.com/tr/kadin/giyim/sweatshirt-ve-kapusonlu-n3873.html'; 
    this.gender = 'Kadın';
  }

  // 1. KATEGORİ BULMA ALGORİTMASI 
  extractCategory(title) {
    const t = title.toLowerCase();
    
    if (t.includes('hoodie') || t.includes('kapüşonlu') || t.includes('kapşonlu')) return 'Hoodie';
    if (t.includes('sweatshirt')) return 'Sweatshirt';
    if (t.includes('hırka')) return 'Hırka';
    if (t.includes('süveter')) return 'Süveter'; // Kadın modasında gömlek üstü çok popüler
    if (t.includes('kazak')) return 'Kazak';
    if (t.includes('triko') || t.includes('örme')) return 'Triko';
    
    return 'Sweatshirt'; // Varsayılan olarak
  }

  // 2. DETAY, YAKA VE KUMAŞ BULMA ALGORİTMASI
  extractFeatures(title) {
    const t = title.toLowerCase();
    const features = [];
    
    // Yaka Tipleri
    if (t.includes('bisiklet yaka') || t.includes('yuvarlak yaka')) features.push('Bisiklet Yaka');
    if (t.includes('balıkçı') || t.includes('boğazlı')) features.push('Balıkçı Yaka');
    if (t.includes('v yaka')) features.push('V Yaka');
    if (t.includes('polo yaka')) features.push('Polo Yaka');
    if (t.includes('fermuarlı yaka') || t.includes('yarım fermuar')) features.push('Yarım Fermuarlı');
    
    // Kumaş ve Tasarım Özellikleri
    if (t.includes('fermuarlı') && !t.includes('fermuarlı yaka')) features.push('Fermuarlı'); // Tam boy fermuarlı hırka/sweat
    if (t.includes('şardonlu')) features.push('Şardonlu'); // İçi tüylü, sıcak tutan
    if (t.includes('baskılı')) features.push('Baskılı');
    if (t.includes('çizgili')) features.push('Çizgili');
    if (t.includes('saç örgü') || t.includes('örgü')) features.push('Örgü Detaylı');
    if (t.includes('düğmeli')) features.push('Düğmeli');
    if (t.includes('yırtık') || t.includes('eskitme')) features.push('Eskitme Detaylı');
    if (t.includes('açık omuz') || t.includes('omzu açık')) features.push('Omzu Açık');

    return features;
  }

  // 3. KALIP (FIT) BULMA ALGORİTMASI
  extractFit(title) {
    const t = title.toLowerCase();
    
    // Kadın kışlık giyiminde kalıp belirleyiciler
    if (t.includes('crop') || t.includes('kısa')) return 'Crop'; 
    if (t.includes('oversize')) return 'Oversize';
    if (t.includes('boxy')) return 'Boxy Fit';
    if (t.includes('dar') || t.includes('vücudu saran') || t.includes('slim')) return 'Dar Kesim';
    if (t.includes('dökümlü') || t.includes('loose')) return 'Dökümlü';
    
    return 'Regular Fit'; 
  }

  async fetchRawHtml() {
    try {
      console.log(`${this.storeName} Sanal tarayıcısı başlatılıyor...`);
      const browser = await chromium.launch({ headless: false }); 
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      console.log(`${this.storeName} ${this.gender} Kazak & Sweatshirt sayfasına gidiliyor...`);
      await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });
      
      try {
        await page.waitForSelector('li.grid-item', { timeout: 15000 });
        console.log('✅ Ürünler ekranda belirdi!');
      } catch (err) {
        console.log('❌ UYARI: 15 saniye bekledik ama ürünler gelmedi.');
      }

      console.log('⏳ 40 Saniyelik kaydırma maratonu başlıyor (Yavaşlatılmış mod)...');
      
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300; 
          const startTime = new Date().getTime();
          const maxScrollTime = 40000; 

          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            const currentTime = new Date().getTime();
            if ((currentTime - startTime) >= maxScrollTime || totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 400); 
        });
      });

      console.log('✅ 40 Saniye doldu! Kaydırma tamamlandı...');
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

    $('li.grid-item').each((index, element) => {
      const rawTitle = $(element).find('.product-text p').text().trim();
      
      const rawPriceText = $(element).find('.current-price-elem-cxc').text();
      let cleanPrice = NaN;
      if (rawPriceText && rawPriceText.includes('TL')) {
        const priceStr = rawPriceText.replace(/[^0-9,]/g, '').replace(',', '.');
        cleanPrice = parseFloat(priceStr);
      }

      let rawImageUrl = $(element).find('img.image-item').attr('data-original') || $(element).find('img.image-item').attr('src');
      let rawProductUrl = $(element).find('a.grid-card-link').attr('href');

      if (rawProductUrl && rawProductUrl.includes('?')) {
        rawProductUrl = rawProductUrl.split('?')[0];
      }
      
      const isValidImage = rawImageUrl && !rawImageUrl.includes('data:image/gif'); 

      if (rawTitle && cleanPrice && isValidImage && rawProductUrl) {
        
        // 🧠 KATEGORİ, KALIP VE MATERYAL ANALİZ MOTORLARI
        const detectedCategory = this.extractCategory(rawTitle);
        const detectedFit = this.extractFit(rawTitle);
        const detectedFeatures = this.extractFeatures(rawTitle);

        // Etiketleri birleştiriyoruz
        let combinedTags = [
          detectedCategory.toLowerCase().replace(/ /g, '-'), 
          detectedFit.toLowerCase().replace(/ /g, '-'), 
          this.storeName.toLowerCase()
        ];

        // Ekstra özellikleri (şardonlu, fermuarlı, v-yaka vs.) taglere ekliyoruz
        if (detectedFeatures.length > 0) {
          detectedFeatures.forEach(feature => {
            combinedTags.push(feature.toLowerCase().replace(/ /g, '-'));
          });
        }

        normalizedProducts.push({
          title: rawTitle,
          description: `${this.storeName} markasından ${detectedFit} harika bir ${detectedCategory.toLowerCase()}.`,
          price: cleanPrice,
          productUrl: rawProductUrl.startsWith('http') ? rawProductUrl : `https://www.bershka.com${rawProductUrl}`,
          imageUrl: rawImageUrl,
          store: this.storeName,
          gender: this.gender, 
          category: detectedCategory, // "Hoodie", "Hırka", "Kazak", vb.
          color: 'Belirtilmemiş',
          sizes: ['XS', 'S', 'M', 'L'], 
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
    console.log(`🎯 ${this.storeName} mağazasından ${savedCount} yeni ${this.gender} Kazak/Sweatshirt ürünü veritabanına eklendi!`);
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

module.exports = StoreThreeAdapter;