import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';  
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../i18n';

import { Image } from 'expo-image';

const logoImage = require('../../assets/drip_logo.png');

const GENDER_KEYS = ['all', 'men', 'women'];
const TYPE_KEYS = ['all', 'tshirt', 'pants', 'skirt', 'dress', 'shirt', 'jacket'];
const FIT_KEYS = ['all', 'oversize', 'regular', 'slimFit', 'skinny'];

const SwipeScreen = ({ navigation, route }) => {
  const { API_URL, userToken, userInfo } = useContext(AuthContext); 
  const { addToCart } = useCartStore();
  const { darkMode, toggleDarkMode, language, setLanguage } = useSettingsStore();
  const t = translations[language] || translations['English'];
  
  const [cards, setCards] = useState([]);
  const [swiperKey, setSwiperKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const getInitialGenderFilter = (userGender) => {
    if (userGender === 'male') return t.men;
    if (userGender === 'female') return t.women;
    return t.all;
  };

  const initialGender = getInitialGenderFilter(userInfo?.gender);

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({ gender: initialGender, type: [], fit: [] });
  const [tempFilters, setTempFilters] = useState({ gender: initialGender, type: [], fit: [] });

  // Settings Modal States
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Update filter if user changes their gender in profile
  useEffect(() => {
    const newGender = getInitialGenderFilter(userInfo?.gender);
    setFilters(prev => ({ ...prev, gender: newGender }));
    setTempFilters(prev => ({ ...prev, gender: newGender }));
  }, [userInfo?.gender]);

  const shuffleArray = (array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getHighResImageUrl = (url) => {
    if (!url) return '';
    return url.replace(/&w=\d+/, '&w=1024'); 
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;

      const params = {};
      if (filters.gender !== t.all) {
        // Map back to english for backend
        if (filters.gender === t.men) params.gender = 'Men';
        else if (filters.gender === t.women) params.gender = 'Women';
        else params.gender = filters.gender;
      }
      
      if (filters.type.length > 0) {
        // Map back to english keys for backend
        const mappedTypes = filters.type.map(val => TYPE_KEYS.find(k => t[k] === val) || val);
        params.type = mappedTypes.map(key => {
          if (key === 'tshirt') return 'T-Shirt';
          if (key === 'pants') return 'Pants';
          if (key === 'skirt') return 'Skirt';
          if (key === 'dress') return 'Dress';
          if (key === 'shirt') return 'Shirt';
          if (key === 'jacket') return 'Jacket';
          return key;
        }).join(',');
      }
      
      if (filters.fit.length > 0) {
        const mappedFits = filters.fit.map(val => FIT_KEYS.find(k => t[k] === val) || val);
        params.fit = mappedFits.map(key => {
          if (key === 'oversize') return 'Oversize';
          if (key === 'regular') return 'Regular';
          if (key === 'slimFit') return 'Slim Fit';
          if (key === 'skinny') return 'Skinny';
          return key;
        }).join(',');
      }

      const response = await axios.get(`${API_URL}/products`, {
        params: params,
        headers: { Authorization: authHeader },
        timeout: 10000, 
      });
      
      const randomizedProducts = shuffleArray(response.data);
      setCards(randomizedProducts);
      setCurrentIndex(0);
      setSwiperKey(prev => prev + 1);

      const imagesToPrefetch = randomizedProducts
        .slice(0, 5)
        .map(product => getHighResImageUrl(product.imageUrl));
      Image.prefetch(imagesToPrefetch);

    } catch (error) {
      console.error("Error fetching products:", error.message);
      if (!error.response) {
        Alert.alert(
          "Connection Error", 
          "Please check your internet connection and try again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Retry", onPress: () => fetchProducts() } 
          ]
        );
      } else {
        Alert.alert("Server Error", "Could not load products. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    fetchProducts();
  }, [filtersKey]);

  const handleRestart = () => {
    Alert.alert(
      "Reset Algorithm",
      "Do you want to reset your tag scores and refresh the deck?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setLoading(true);
              const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
              await axios.post(`${API_URL}/swipes/reset`, {}, {
                headers: { Authorization: authHeader }
              });
              await fetchProducts(); // Fetch fresh products after reset
            } catch (error) {
              console.error("Error resetting algorithm:", error);
              Alert.alert("Error", "Could not reset the algorithm.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (route?.params?.doRefresh) {
      handleRestart(); 
      navigation.setParams({ doRefresh: undefined }); 
    }
  }, [route?.params?.doRefresh]);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, ''); 
  };

  const handleSwipedLeft = async (cardIndex) => {
    setCurrentIndex(cardIndex + 1);
    const swipedCard = cards[cardIndex];
    if (!swipedCard) return;

    if (cards[cardIndex + 3]) {
      Image.prefetch(getHighResImageUrl(cards[cardIndex + 3].imageUrl));
    }

    try {
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      await axios.post(`${API_URL}/swipes`, { productId: swipedCard._id, action: 'passed' }, { headers: { Authorization: authHeader } });
    } catch (error) {
      // sessizce yut
    }
  };

  const handleSwipedRight = async (cardIndex) => {
    setCurrentIndex(cardIndex + 1);
    const likedProduct = cards[cardIndex];
    if (!likedProduct) return;

    addToCart(likedProduct);

    if (cards[cardIndex + 3]) {
      Image.prefetch(getHighResImageUrl(cards[cardIndex + 3].imageUrl));
    }

    try {
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      await axios.post(`${API_URL}/swipes`, { productId: likedProduct._id, action: 'liked' }, { headers: { Authorization: authHeader } });
      await axios.post(`${API_URL}/basket/add`, { productId: likedProduct._id }, { headers: { Authorization: authHeader } });
    } catch (error) {
       // sessizce yut
    }
  };

  const renderSingleFilterChips = (options, selectedValue, onSelect) => {
    return (
      <View style={styles.chipContainer}>
        {options.map(opt => {
          const isActive = selectedValue === opt;
          return (
            <TouchableOpacity 
              key={opt} 
              style={[styles.chip, darkMode && styles.chipDark, isActive && styles.chipActive]} 
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.chipText, darkMode && styles.chipTextDark, isActive && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMultiFilterChips = (options, selectedValues, onToggle) => {
    return (
      <View style={styles.chipContainer}>
        <TouchableOpacity 
          style={[styles.chip, selectedValues.length === 0 && styles.chipActive]} 
          onPress={() => onToggle(t.all)}
        >
          <Text style={[styles.chipText, darkMode && styles.chipTextDark, selectedValues.length === 0 && styles.chipTextActive]}>{t.all}</Text>
        </TouchableOpacity>

        {options.filter(opt => opt !== t.all).map(opt => {
          const isActive = selectedValues.includes(opt);
          return (
            <TouchableOpacity 
              key={opt} 
              style={[styles.chip, darkMode && styles.chipDark, isActive && styles.chipActive]} 
              onPress={() => onToggle(opt)}
            >
              <Text style={[styles.chipText, darkMode && styles.chipTextDark, isActive && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const toggleMultiFilter = (field, val) => {
    setTempFilters(prev => {
      const current = prev[field]; 
      if (val === t.all) {
        return { ...prev, [field]: [] };
      }
      
      let newValues;
      if (current.includes(val)) {
        newValues = current.filter(item => item !== val);
      } else {
        newValues = [...current, val];
      }
      return { ...prev, [field]: newValues };
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.safeAreaDark]}>
      <View style={[styles.navbar, darkMode && styles.navbarDark]}>
        <Image 
          source={logoImage} 
          style={styles.navLogo} 
          contentFit="contain" 
          tintColor={darkMode ? '#ffffff' : undefined} 
        />
        <View style={styles.navRightIcons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              setTempFilters(filters);
              setFilterModalVisible(true);
            }}
          >
            <Ionicons name="options-outline" size={30} color={darkMode ? '#fff' : '#333'} />
            {(filters.gender !== t.all || filters.type.length > 0 || filters.fit.length > 0) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={28} color={darkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.swiperContainer} pointerEvents="box-none">
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff4b4b" />
            <Text style={styles.loadingText}>{t.loadingProducts}</Text>
          </View>
        ) : (
          <Swiper
            key={`${swiperKey}-${darkMode}`}
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
                <View style={[styles.card, darkMode && styles.cardDark]}>
                  <Image 
                    source={{ uri: getHighResImageUrl(card.imageUrl) }} 
                    style={styles.cardImage} 
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardStore, darkMode && styles.cardStoreDark]}>{card.store}</Text>
                    <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>{card.title}</Text>
                    <Text style={styles.cardPrice}>{Math.floor(card.price)} ₺</Text>
                    {displayTags ? <Text style={styles.cardTags}>{displayTags}</Text> : null}
                  </View>
                </View>
              );
            }}
            renderNoMoreCards={() => (
              <View style={styles.noMoreCardsContainer}>
                <Ionicons name="sad-outline" size={60} color={darkMode ? '#555' : '#ccc'} />
                <Text style={[styles.noMoreCardsText, darkMode && styles.noMoreCardsTextDark]}>{t.noMoreProducts}</Text>
                <TouchableOpacity style={styles.refreshBtnInline} onPress={() => fetchProducts()}>
                  <Text style={styles.refreshBtnInlineText}>{t.refresh}</Text>
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
            cardIndex={currentIndex}
            backgroundColor={'transparent'}
            stackSize={3}
            animateCardOpacity
          />
        )}
      </View>

      {/* FILTER MODAL */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>{t.filters}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color={darkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalInfoText, darkMode && styles.modalInfoTextDark]}>{t.filterInfo}</Text>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.filterSectionTitle, darkMode && styles.filterSectionTitleDark]}>{t.gender}</Text>
              {renderSingleFilterChips(GENDER_KEYS.map(k => t[k]), tempFilters.gender, (val) => setTempFilters({...tempFilters, gender: val}))}

              <Text style={[styles.filterSectionTitle, darkMode && styles.filterSectionTitleDark]}>{t.productType}</Text>
              {renderMultiFilterChips(TYPE_KEYS.map(k => t[k]), tempFilters.type, (val) => toggleMultiFilter('type', val))}

              <Text style={[styles.filterSectionTitle, darkMode && styles.filterSectionTitleDark]}>{t.fit}</Text>
              {renderMultiFilterChips(FIT_KEYS.map(k => t[k]), tempFilters.fit, (val) => toggleMultiFilter('fit', val))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalClearBtn, darkMode && styles.modalClearBtnDark]} 
                onPress={() => setTempFilters({ gender: t.all, type: [], fit: [] })}
              >
                <Text style={[styles.modalClearText, darkMode && styles.modalClearTextDark]}>{t.clear}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalApplyBtn} 
                onPress={() => {
                  setFilters(tempFilters);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalApplyText}>{t.apply}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.settingsModalOverlay} 
          activeOpacity={1} 
          onPress={() => setSettingsModalVisible(false)}
        >
          <TouchableOpacity style={[styles.settingsModalContent, darkMode && styles.settingsModalContentDark]} activeOpacity={1}>
            <Image 
              source={logoImage} 
              style={styles.settingsLogo} 
              contentFit="contain" 
              tintColor={darkMode ? '#ffffff' : null} 
            />
            
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, darkMode && styles.settingsLabelDark]}>{t.darkMode}</Text>
              <TouchableOpacity 
                style={[styles.toggleBtn, darkMode && styles.toggleBtnActive]}
                onPress={toggleDarkMode}
              >
                <View style={[styles.toggleCircle, darkMode && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, darkMode && styles.settingsLabelDark]}>{t.languageSettings}</Text>
              <TouchableOpacity 
                style={[styles.langBtn, darkMode && styles.langBtnDark]}
                onPress={() => setLanguage(language === 'English' ? 'Türkçe' : 'English')}
              >
                <Text style={[styles.langBtnText, darkMode && styles.langBtnTextDark]}>{language}</Text>
              </TouchableOpacity>
            </View>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 1, backgroundColor: '#f8f9fa', zIndex: 100, elevation: 10 },
  navLogo: { width: 160, height: 70, marginLeft: -10 },
  navRightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 5, marginLeft: 10 },
  filterBadge: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4b4b', borderWidth: 1, borderColor: '#fff' },
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

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  modalInfoText: { fontSize: 13, color: '#888', fontStyle: 'italic', marginBottom: 20 },
  modalScroll: { marginBottom: 20 },
  filterSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 10, marginBottom: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f8f9fa', marginRight: 10, marginBottom: 10 },
  chipActive: { backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' },
  chipText: { fontSize: 14, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  modalClearBtn: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 12, backgroundColor: '#f0f0f0' },
  modalClearText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  modalApplyBtn: { flex: 2, padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#333' },
  modalApplyText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  // Settings Modal Styles
  settingsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  settingsModalContent: { width: 280, backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  settingsLogo: { width: 120, height: 50, marginBottom: 25 },
  settingsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#ddd', padding: 2, justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: '#ff4b4b' },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleCircleActive: { transform: [{ translateX: 22 }] },
  langBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  langBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },

  // Dark Mode Styles
  safeAreaDark: { backgroundColor: '#121212' },
  navbarDark: { backgroundColor: '#121212' },
  cardDark: { backgroundColor: '#1e1e1e', borderColor: '#333' },
  cardStoreDark: { color: '#fff' },
  cardTitleDark: { color: '#ccc' },
  modalContentDark: { backgroundColor: '#1e1e1e' },
  modalTitleDark: { color: '#fff' },
  modalInfoTextDark: { color: '#aaa' },
  filterSectionTitleDark: { color: '#ddd' },
  chipDark: { backgroundColor: '#333', borderColor: '#555' },
  chipTextDark: { color: '#ddd' },
  modalClearBtnDark: { backgroundColor: '#333' },
  modalClearTextDark: { color: '#fff' },
  settingsModalContentDark: { backgroundColor: '#1e1e1e' },
  settingsLabelDark: { color: '#fff' },
  langBtnDark: { backgroundColor: '#333' },
  langBtnTextDark: { color: '#fff' },
  noMoreCardsTextDark: { color: '#ccc' }
});

export default SwipeScreen;