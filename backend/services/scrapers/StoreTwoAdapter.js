const { chromium } = require('playwright');
const cheerio = require('cheerio');
const Product = require('../../models/Product');

class StoreTwoAdapter {
  constructor() {
    this.storeName = 'H&M'; 
    // GÖREV: H&M Kadın Şort linkini buraya yapıştıracaksın!
    this.targetUrl = 'https://www2.hm.com/tr_tr/kadin/urune-gore-satin-al/sort.html?page=4'; 
    this.gender = 'Kadın';
  }

  // 1. KATEGORİ BULMA ALGORİTMASI
  extractCategory(title) {
    const t = title.toLowerCase();
    
    // Biker Tayt aslında şort kategorisinde sergilenir ama tayt/şort melezidir
    if (t.includes('biker') && t.includes('tayt')) return 'Biker Tayt';
    if (t.includes('etek') && t.includes('şort')) return 'Şort Etek'; // Etek kategorisinde de var ama buraya karışabilir
    
    return 'Şort'; // Varsayılan ana kategori
  }

  // 2. DETAY, TASARIM VE KUMAŞ BULMA ALGORİTMASI (Bermuda, Biker, Triko vb.)
  extractFeatures(title) {
    const t = title.toLowerCase();
    const features = [];
    
    // Bel Yüksekliği
    if (t.includes('yüksek bel') || t.includes('high waist')) features.push('Yüksek Bel');
    if (t.includes('düşük bel') || t.includes('low waist')) features.push('Düşük Bel');
    
    // Model ve Tarz
    if (t.includes('bermuda')) features.push('Bermuda');
    if (t.includes('biker') || t.includes('bisikletçi')) features.push('Biker');
    if (t.includes('kargo')) features.push('Kargo');
    if (t.includes('yırtık') || t.includes('eskitme')) features.push('Yırtık Detaylı');
    if (t.includes('beli lastikli') || t.includes('pull-on')) features.push('Beli Lastikli');
    
    // Kumaş Tipleri
    if (t.includes('kot') || t.includes('denim')) features.push('Denim');
    if (t.includes('kumaş') || t.includes('klasik')) features.push('Kumaş');
    if (t.includes('triko') || t.includes('örme')) features.push('Triko');
    if (t.includes('keten')) features.push('Keten');
    if (t.includes('deri') || t.includes('suni deri') || t.match(/\bpu\b/)) features.push('Deri');
    if (t.includes('paraşüt')) features.push('Paraşüt Kumaş');

    return features;
  }

  // 3. KALIP (FIT) BULMA ALGORİTMASI 
  extractFit(title) {
    const t = title.toLowerCase();
    
    if (t.includes('mom')) return 'Mom Fit';
    if (t.includes('oversize')) return 'Oversize';
    if (t.includes('baggy')) return 'Baggy';
    
    // H&M: Bol Kesim -> Bizim Sistem: Loose Fit
    if (t.includes('bol') || t.includes('loose')) return 'Loose Fit';
    
    // H&M: Dar Kesim / Vücudu Saran
    if (t.includes('dar') || t.includes('slim') || t.includes('vücudu saran') || t.includes('biker')) return 'Dar Kesim';
    
    if (t.includes('relaxed') || t.includes('rahat')) return 'Relaxed Fit';
    
    // H&M: Regular Kesim -> Bizim Sistem: Regular Fit
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
      
      console.log(`${this.storeName} ${this.gender} Şort sayfasına gidiliyor...`);
      await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded' });
      
      try {
        await page.waitForSelector('article', { timeout: 15000 });
        console.log('✅ Ürünler ekranda belirdi!');
      } catch (err) {
        console.log('❌ UYARI: 15 saniye bekledik ama ürünler gelmedi.');
      }

      console.log('⬇️ Sayfanın en SONUNA KADAR inilecek. Bu biraz sürebilir, arkanı yasla ve izle...');
      
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 400; 
          
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 150); 
        });
      });

      console.log('✅ Sayfanın DİBİNE ulaşıldı! Kaydırma tamamlandı, veriler toplanıyor...');
      await page.waitForTimeout(2000); 

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

    $('article').each((index, element) => {
      const rawTitle = $(element).find('h2').text().trim();
      
      const rawPriceText = $(element).find('span').text();
      let cleanPrice = NaN;
      
      if (rawPriceText && rawPriceText.includes('TL')) {
        const priceStr = rawPriceText.replace(/[^0-9,]/g, '').replace(',', '.');
        cleanPrice = parseFloat(priceStr);
      }

      let rawImageUrl = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
      let rawProductUrl = $(element).find('a').attr('href');

      if (rawProductUrl && rawProductUrl.includes('?')) {
        rawProductUrl = rawProductUrl.split('?')[0];
      }
      
      if (rawImageUrl && rawImageUrl.startsWith('//')) {
        rawImageUrl = 'https:' + rawImageUrl;
      }

      const isValidImage = rawImageUrl && !rawImageUrl.includes('transparent');

      if (rawTitle && cleanPrice && isValidImage && rawProductUrl) {
        
        // 🧠 KATEGORİ, KALIP VE MATERYAL ANALİZ MOTORLARI
        const detectedCategory = this.extractCategory(rawTitle);
        const detectedFit = this.extractFit(rawTitle);
        const detectedFeatures = this.extractFeatures(rawTitle);

        const safeStoreTag = 'h-and-m';

        // Etiketleri birleştiriyoruz
        let combinedTags = [
          detectedCategory.toLowerCase().replace(/ /g, '-'), 
          detectedFit.toLowerCase().replace(/ /g, '-'), 
          safeStoreTag
        ];

        // Ekstra özellikleri (bermuda, denim, yüksek bel vs.) taglere ekliyoruz
        if (detectedFeatures.length > 0) {
          detectedFeatures.forEach(feature => {
            combinedTags.push(feature.toLowerCase().replace(/ /g, '-'));
          });
        }

        normalizedProducts.push({
          title: rawTitle,
          description: `${this.storeName} markasından ${detectedFit} harika bir kadın ${detectedCategory.toLowerCase()}.`,
          price: cleanPrice,
          productUrl: rawProductUrl.startsWith('http') ? rawProductUrl : `https://www2.hm.com${rawProductUrl}`,
          imageUrl: rawImageUrl,
          store: this.storeName,
          gender: this.gender,
          category: detectedCategory, // "Şort", "Biker Tayt", vb.
          color: 'Belirtilmemiş',
          // Şortlarda genel bedenler veya inç/EU bedenleri olabilir
          sizes: ['32', '34', '36', '38', '40', 'S', 'M', 'L'], 
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
    console.log(`🎯 ${this.storeName} mağazasından ${savedCount} yeni ${this.gender} Şort ürünü veritabanına eklendi!`);
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

module.exports = StoreTwoAdapter;   