import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useCartStore } from '../store/useCartStore';
import { AuthContext } from '../context/AuthContext';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../i18n';
import * as WebBrowser from 'expo-web-browser';

const CartScreen = ({ navigation }) => {
  const { cartItems, trashItems, moveToTrash, restoreFromTrash, clearTrash, clearCart } = useCartStore();
  const { userToken, API_URL } = useContext(AuthContext);
  const { darkMode, language } = useSettingsStore();
  const t = translations[language] || translations['English'];
  
  const [isTrashModalVisible, setTrashModalVisible] = useState(false);

  const getAuthHeader = () => {
    if (!userToken) return '';
    return typeof userToken === 'string' && userToken.startsWith('Bearer') 
      ? userToken 
      : `Bearer ${userToken}`;
  };

  const openProductLink = async (url, productData) => {
    if (!url) {
      Alert.alert("Info", "There is no purchase link available for this item.");
      return;
    }
    try {
      let finalUrl = url;
      
      // H&M Akamai bot koruması direkt linkleri blokluyor.
      // Çözüm: Ürünü Google'da aratıp kullanıcının organik tıklamasını sağlamak.
      const isHM = url.toLowerCase().includes('hm.com') || 
                   (productData?.store && productData.store.toLowerCase().replace(/[&\s]/g, '').includes('hm'));
      
      if (isHM) {
        const searchQuery = `${productData?.title || ''} H&M site:hm.com`;
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      }

      if (WebBrowser && WebBrowser.openBrowserAsync) {
        await WebBrowser.openBrowserAsync(finalUrl, {
          presentationStyle: 'formSheet',
          toolbarColor: '#111111',
          controlsColor: '#ffffff',
        });
      }
    } catch (error) {
      console.error("Browser error:", error);
    }
  };

  const handleRemoveItem = async (item) => {
    const productData = item.product ? item.product : item;
    if (typeof moveToTrash === 'function') moveToTrash(item);

    try {
      const authHeader = getAuthHeader();
      if (authHeader) {
        await axios.post(`${API_URL}/basket/remove`, { productId: productData._id }, {
          headers: { Authorization: authHeader }
        });
      }
    } catch (error) {
      console.error("Backendden silinemedi:", error);
    }
  };

  const handleRestoreItem = async (item) => {
    const productData = item.product ? item.product : item;
    if (typeof restoreFromTrash === 'function') restoreFromTrash(productData._id);

    try {
      const authHeader = getAuthHeader();
      if (authHeader) {
        await axios.post(`${API_URL}/basket/add`, { productId: productData._id }, {
          headers: { Authorization: authHeader }
        });
      }
    } catch (error) {
      console.error("Backend'e geri eklenemedi:", error);
    }
  };

  const handleClearBasket = () => {
    if (cartItems.length === 0) return;
    Alert.alert("Clear Cart", "Are you sure you want to remove all items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive",
        onPress: async () => {
          if (typeof clearCart === 'function') clearCart();
          try {
            const authHeader = getAuthHeader();
            if (authHeader) {
              await axios.post(`${API_URL}/basket/clear`, {}, { 
                headers: { Authorization: authHeader } 
              });
            }
          } catch (error) {}
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && styles.safeAreaDark]}>
      
      {/* HEADER: Kusursuz Ortalama için 3 parçaya bölündü */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={darkMode ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>{t.myCart} ({cartItems.length})</Text>
        </View>
        
        <View style={styles.headerRight}>
          {cartItems.length > 0 && (
            <TouchableOpacity onPress={handleClearBasket} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>{t.clearAll}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* İÇERİK BÖLÜMÜ: Empty State Bug'ını çözmek için koşullu render yapıldı */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={darkMode ? "#555" : "#ccc"} />
          <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>{t.emptyCart}</Text>
        </View>
      ) : (
        <FlatList
          data={[...cartItems].reverse()} 
          keyExtractor={(item, index) => item?.product?._id || index.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const productData = item.product ? item.product : item;
            const productLink = productData.url || productData.productUrl || productData.link;

            const displayTags = Array.isArray(productData.tags) 
              ? productData.tags.filter(tag => tag).join(' • ') 
              : '';

            return (
              <View style={[styles.cartItem, darkMode && styles.cartItemDark]}>
                <Image source={{ uri: productData.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                <View style={styles.itemDetails}>
                  <View>
                    <Text style={[styles.itemStore, darkMode && styles.itemStoreDark]}>{productData.store}</Text>
                    <Text style={[styles.itemTitle, darkMode && styles.itemTitleDark]} numberOfLines={2}>{productData.title}</Text>
                    <Text style={styles.itemPrice}>{productData.price ? `${Math.floor(productData.price)} ₺` : ''}</Text>
                    {displayTags ? <Text style={styles.itemTags} numberOfLines={1}>{displayTags}</Text> : null}
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.buyButton, !productLink && { backgroundColor: '#ccc' }]} onPress={() => openProductLink(productLink, productData)} disabled={!productLink}>
                      <Text style={styles.buyButtonText}>{t.buyNow}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveItem(item)}>
                      <Ionicons name="trash-outline" size={22} color="#ff4b4b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* YÜZEN ÇÖP KUTUSU BALONCUĞU */}
      {trashItems && trashItems.length > 0 && (
        <TouchableOpacity style={styles.floatingTrashButton} onPress={() => setTrashModalVisible(true)}>
          <Ionicons name="trash-bin" size={28} color="#fff" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{trashItems.length}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ÇÖP KUTUSU MODALI */}
      <Modal visible={isTrashModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>{t.recentlyDeleted}</Text>
              <TouchableOpacity onPress={() => setTrashModalVisible(false)}>
                <Ionicons name="close" size={28} color={darkMode ? "#fff" : "#333"} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubText}>{t.deleteWarning}</Text>

            <FlatList
              data={trashItems}
              keyExtractor={(item, index) => item?.product?._id || index.toString()}
              renderItem={({ item }) => {
                const productData = item.product ? item.product : item;
                return (
                  <View style={[styles.trashItem, darkMode && styles.trashItemDark]}>
                    <Image source={{ uri: productData.imageUrl }} style={styles.trashItemImage} />
                    <Text style={[styles.trashItemTitle, darkMode && styles.trashItemTitleDark]} numberOfLines={2}>{productData.title}</Text>
                    <TouchableOpacity style={styles.restoreButton} onPress={() => handleRestoreItem(item)}>
                      <Text style={styles.restoreButtonText}>{t.undo}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            <TouchableOpacity style={[styles.clearTrashButton, darkMode && styles.clearTrashButtonDark]} onPress={() => { if (typeof clearTrash === 'function') clearTrash(); setTrashModalVisible(false); }}>
              <Text style={styles.clearTrashText}>{t.emptyTrash}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  
  /* HEADER STİLLERİ (Güncellendi) */
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  headerLeft: { width: 80, alignItems: 'flex-start' }, // Sol kanat genişliği sabitlendi
  headerCenter: { flex: 1, alignItems: 'center' },     // Ortası kalan boşluğu doldurur
  headerRight: { width: 80, alignItems: 'flex-end', justifyContent: 'center' }, // Sağ kanat genişliği sabitlendi
  backButton: { padding: 5, marginLeft: -5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  clearButton: { paddingVertical: 5 },
  clearButtonText: { color: '#ff4b4b', fontWeight: 'bold', fontSize: 16 },

  /* LİSTE VE EMPTY STATE STİLLERİ */
  listContainer: { padding: 15, paddingBottom: 100 }, // Yüzen butonun altını kapatmasın diye boşluk eklendi
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#555', marginTop: 15 },
  
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  itemImage: { width: 100, height: 130, borderRadius: 10 },
  itemDetails: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  itemStore: { fontSize: 16, fontWeight: '900', color: '#111', textTransform: 'uppercase', marginBottom: 2 },
  itemTitle: { fontSize: 14, fontWeight: '500', color: '#666' },
  itemPrice: { fontSize: 18, fontWeight: 'bold', color: '#ff4b4b', marginTop: 4 },
  itemTags: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  buyButton: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  buyButtonText: { color: '#fff', fontWeight: 'bold' },
  deleteButton: { padding: 5 },
  
  floatingTrashButton: {
    position: 'absolute', bottom: 30, left: 20, backgroundColor: '#ff4b4b', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#ff4b4b', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  badge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: '#111', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: '50%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubText: { color: '#888', marginBottom: 20, fontSize: 13 },
  trashItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 10 },
  trashItemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  trashItemTitle: { flex: 1, fontSize: 14, fontWeight: '500' },
  restoreButton: { backgroundColor: '#28a745', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  restoreButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  clearTrashButton: { marginTop: 20, alignItems: 'center', padding: 15, borderRadius: 10, backgroundColor: '#ffeeee' },
  clearTrashText: { color: '#ff4b4b', fontWeight: 'bold', fontSize: 16 },

  // Dark Mode Styles
  safeAreaDark: { backgroundColor: '#121212' },
  headerDark: { backgroundColor: '#121212', borderColor: '#333' },
  headerTitleDark: { color: '#fff' },
  cartItemDark: { backgroundColor: '#1e1e1e' },
  itemStoreDark: { color: '#fff' },
  itemTitleDark: { color: '#ccc' },
  emptyTextDark: { color: '#ccc' },
  modalContentDark: { backgroundColor: '#1e1e1e' },
  modalTitleDark: { color: '#fff' },
  trashItemDark: { backgroundColor: '#333' },
  trashItemTitleDark: { color: '#ddd' },
  clearTrashButtonDark: { backgroundColor: '#331111' }
});

export default CartScreen;