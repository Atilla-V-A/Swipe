import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';  
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';

const logoImage = require('../../assets/drip_logo.png');

const SwipeScreen = () => {
  const { logout, API_URL, userToken } = useContext(AuthContext);
  const { cartItems, addToCart } = useCartStore();
  
  const [cards, setCards] = useState([]);
  const [swiperKey, setSwiperKey] = useState(0);
  const [loading, setLoading] = useState(true);

  // Deste karıştırma fonksiyonu
  const shuffleArray = (array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Ürünleri backend'den çekme
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;

      const response = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: authHeader }
      });
      
      const randomizedProducts = shuffleArray(response.data);
      setCards(randomizedProducts);
    } catch (error) {
      console.error("Ürünleri çekerken hata:", error);
      Alert.alert("Hata", "Ürünler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Yenileme Butonu İşlemi
  const handleRestart = () => {
    Alert.alert(
      "Reset Algorithm",
      "Do you want to shuffle the items and refresh the deck?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            setCards(shuffleArray(cards));
            setSwiperKey(prev => prev + 1); 
          }
        }
      ]
    );
  };

  // Metin Normalizasyonu (Gereksiz tag tekrarlarını önlemek için)
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, ''); 
  };

  // Fotoğraf Kalitesini Artırma (Özellikle Zara için)
  const getHighResImageUrl = (url) => {
    if (!url) return '';
    return url.replace(/&w=\d+/, '&w=1024'); 
  };

  // --- BACKEND İLETİŞİMİ: KAYDIRMA İŞLEMLERİ ---

  // Sola Kaydırma (NOPE -> PASSED)
  const handleSwipedLeft = async (cardIndex) => {
    const swipedCard = cards[cardIndex];
    if (!swipedCard) return;

    console.log('Geçildi (Passed):', swipedCard.title);

    try {
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      await axios.post(`${API_URL}/swipes`, {
        productId: swipedCard._id,
        action: 'passed'
      }, {
        headers: { Authorization: authHeader }
      });
    } catch (error) {
      const errorMsg = JSON.stringify(error.response?.data || "");
      if (errorMsg.includes("E11000") || errorMsg.includes("duplicate key")) {
        console.log("Bilgi: Bu ürün zaten daha önce sola kaydırılmış (passed), veritabanı yoksaydı.");
      } else {
        console.log("Backend asıl hata:", error.response?.data);
        console.error("Swipe kaydı gönderilemedi:", error.message);
      }
    }
  };

  // Sağa Kaydırma (LIKE -> LIKED & BASKET/ADD)
  const handleSwipedRight = async (cardIndex) => {
    const likedProduct = cards[cardIndex];
    if (!likedProduct) return;

    addToCart(likedProduct);
    console.log('Beğenildi (Liked):', likedProduct.title);

    try {
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      
      // Swipe koleksiyonuna 'liked' olarak kaydet
      await axios.post(`${API_URL}/swipes`, {
        productId: likedProduct._id,
        action: 'liked' 
      }, {
        headers: { Authorization: authHeader }
      });

      // Sepete Ekleme
      await axios.post(`${API_URL}/basket/add`, {
        productId: likedProduct._id
      }, {
        headers: { Authorization: authHeader }
      });

    } catch (error) {
      const errorMsg = JSON.stringify(error.response?.data || "");
      if (errorMsg.includes("E11000") || errorMsg.includes("duplicate key")) {
        console.log("Bilgi: Bu ürün zaten daha önce sağa kaydırılmış (liked), veritabanı yoksaydı.");
      } else {
        console.log("Backend asıl hata:", error.response?.data);
        console.error("Sepet/Like kaydı gönderilemedi:", error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* TOP NAVBAR */}
      <View style={styles.navbar}>
        <Image source={logoImage} style={styles.navLogo} />
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* SWIPER DECK AREA */}
      <View style={styles.swiperContainer} pointerEvents="box-none">
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff4b4b" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <Swiper
            key={swiperKey}
            cards={cards}
            renderCard={(card) => {
              if (!card) return null; 
              
              const normalizedStore = normalizeText(card.store);
              const filteredTags = card.tags?.filter(tag => {
                if (!tag) return false;
                const normalizedTag = normalizeText(tag);
                return !normalizedTag.includes(normalizedStore) && !normalizedStore.includes(normalizedTag);
              });
              
              const displayTags = filteredTags?.join(' • ');

              return (
                <View style={styles.card}>
                  <Image 
                    source={{ uri: getHighResImageUrl(card.imageUrl) }} 
                    style={styles.cardImage} 
                    resizeMode="cover" 
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardStore}>{card.store}</Text>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardPrice}>{card.price} ₺</Text>
                    {displayTags ? <Text style={styles.cardTags}>{displayTags}</Text> : null}
                  </View>
                </View>
              );
            }}
            renderNoMoreCards={() => (
              <View style={styles.noMoreCardsContainer}>
                <Ionicons name="sad-outline" size={60} color="#ccc" />
                <Text style={styles.noMoreCardsText}>No more items to show.</Text>
                <TouchableOpacity style={styles.refreshBtnInline} onPress={handleRestart}>
                  <Text style={styles.refreshBtnInlineText}>Refresh Deck</Text>
                </TouchableOpacity>
              </View>
            )}
            disableTopSwipe={true}
            disableBottomSwipe={true}
            overlayLabels={{
              left: {
                element: <Ionicons name="close-circle" size={100} color="#ff4b4b" />,
                title: 'NOPE',
                style: { wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 120, paddingRight: 30, elevation: 10 } }
              },
              right: {
                element: <Ionicons name="cart" size={100} color="#4cd137" />,
                title: 'LIKE',
                style: { wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 120, paddingLeft: 30, elevation: 10 } }
              }
            }}
            onSwipedLeft={handleSwipedLeft}
            onSwipedRight={handleSwipedRight}
            onSwipedAll={() => console.log('All cards swiped!')}
            cardIndex={0}
            backgroundColor={'transparent'}
            stackSize={3}
            animateCardOpacity
          />
        )}
      </View>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomTab} onPress={handleRestart}>
          <Ionicons name="refresh" size={28} color="#777" />
          <Text style={styles.bottomTabText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomTab}>
          <Ionicons name="home" size={28} color="#ff4b4b" />
          <Text style={[styles.bottomTabText, { color: '#ff4b4b' }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bottomTab}>
          <View>
            <Ionicons name="cart-outline" size={28} color="#777" />
            {cartItems.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{cartItems.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.bottomTabText}>Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bottomTab} onPress={logout}>
          <Ionicons name="person-outline" size={28} color="#777" />
          <Text style={styles.bottomTabText}>Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 1, backgroundColor: '#f8f9fa', zIndex: 100, elevation: 10 },
  navLogo: { width: 160, height: 70, resizeMode: 'contain', marginLeft: -10 },
  iconButton: { padding: 5 },
  swiperContainer: { flex: 1, marginTop: -40, zIndex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#777' },
  card: { height: '75%', borderRadius: 20, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, overflow: 'hidden' },
  cardImage: { width: '100%', height: '73%' },
  cardInfo: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 10 },
  cardStore: { fontSize: 24, fontWeight: '900', color: '#111', textTransform: 'uppercase', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#666', marginBottom: 6 },
  cardPrice: { fontSize: 20, color: '#ff4b4b', fontWeight: 'bold', marginBottom: 4 },
  cardTags: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  noMoreCardsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  noMoreCardsText: { fontSize: 18, color: '#777', marginTop: 15, marginBottom: 20 },
  refreshBtnInline: { backgroundColor: '#ff4b4b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  refreshBtnInlineText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', paddingVertical: 15, paddingBottom: 25, zIndex: 100, elevation: 10 },
  bottomTab: { alignItems: 'center', justifyContent: 'center' },
  bottomTabText: { fontSize: 12, color: '#777', marginTop: 4 },
  badgeContainer: { position: 'absolute', top: -5, right: -8, backgroundColor: '#ff4b4b', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});

export default SwipeScreen;