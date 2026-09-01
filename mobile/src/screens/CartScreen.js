import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useCartStore } from '../store/useCartStore';
import { AuthContext } from '../context/AuthContext';

const CartScreen = ({ navigation }) => {
  const { cartItems, removeFromCart, clearCart } = useCartStore();
  const { userToken, API_URL } = useContext(AuthContext);

  // Open Product Link in External Browser
  const openProductLink = async (url) => {
    if (!url) {
      Alert.alert("Info", "There is no purchase link available for this item.");
      return;
    }
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "This link cannot be opened on your device.");
      }
    } catch (error) {
      console.error("Error opening link:", error);
    }
  };

  // Remove Single Item
  const handleRemoveItem = async (productId) => {
    removeFromCart(productId);

    try {
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      await axios.post(`${API_URL}/basket/remove`, {
        productId: productId
      }, {
        headers: { Authorization: authHeader }
      });
    } catch (error) {
      console.error("Failed to remove item from backend:", error.response?.data || error.message);
    }
  };

  // Clear Entire Basket
  const handleClearBasket = () => {
    if (cartItems.length === 0) return;

    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            clearCart();

            try {
              const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
              await axios.post(`${API_URL}/basket/clear`, {}, {
                headers: { Authorization: authHeader }
              });
            } catch (error) {
              console.error("Failed to clear basket on backend:", error.response?.data || error.message);
            }
          }
        }
      ]
    );
  };

  // Empty State Component
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>Your cart is currently empty.</Text>
      <Text style={styles.emptySubText}>Items you liked will be listed here.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Cart ({cartItems.length})</Text>
        
        {/* Clear Cart Button */}
        {cartItems.length > 0 ? (
          <TouchableOpacity onPress={handleClearBasket} style={{ padding: 5 }}>
            <Ionicons name="trash-bin-outline" size={26} color="#ff4b4b" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} /> 
        )}
      </View>

      {/* Cart List */}
      <FlatList
        data={[...cartItems].reverse()} 
        keyExtractor={(item, index) => item?._id?.toString() || item?.product?._id?.toString() || index.toString()}
        contentContainerStyle={cartItems.length === 0 ? { flex: 1 } : styles.listContainer}
        ListEmptyComponent={renderEmptyComponent}
        renderItem={({ item }) => {
          
          const productData = item.product ? item.product : item;
          const productLink = productData.url || productData.productUrl || productData.link;

          return (
            <View style={styles.cartItem}>
              <Image 
                source={{ uri: productData.imageUrl }} 
                style={styles.itemImage} 
                resizeMode="cover" 
              />
              
              <View style={styles.itemDetails}>
                <View>
                  <Text style={styles.itemStore}>{productData.store || 'NO STORE INFO'}</Text>
                  <Text style={styles.itemTitle} numberOfLines={2}>{productData.title || 'No Product Title'}</Text>
                  
                  {productData.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {productData.description}
                    </Text>
                  ) : null}
                  
                  <Text style={styles.itemPrice}>{productData.price ? `${productData.price} ₺` : ''}</Text>
                </View>
                
                <View style={styles.actionRow}>
                  {/* Buy Button */}
                  <TouchableOpacity 
                    style={[styles.buyButton, !productLink && { backgroundColor: '#ccc' }]} 
                    onPress={() => openProductLink(productLink)}
                    disabled={!productLink}
                  >
                    <Text style={styles.buyButtonText}>Buy Now</Text>
                    <Ionicons name="open-outline" size={16} color="#fff" style={{ marginLeft: 5 }} />
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleRemoveItem(productData._id)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#ff4b4b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#555', marginTop: 15 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 5, textAlign: 'center' },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  itemImage: { width: 100, height: 130, borderRadius: 10 },
  itemDetails: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  itemStore: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 2 },
  itemDescription: { fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic' },
  itemPrice: { fontSize: 18, fontWeight: 'bold', color: '#ff4b4b', marginTop: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  // Premium Siyah butonu varsayılan yaptım, istersen rengini yine değiştirebilirsin
  buyButton: { flexDirection: 'row', backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignItems: 'center' },
  buyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  deleteButton: { padding: 5 }
});

export default CartScreen;