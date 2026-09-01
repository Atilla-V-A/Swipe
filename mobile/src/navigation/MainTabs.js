import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/useCartStore';
import { AuthContext } from '../context/AuthContext';

import SwipeScreen from '../screens/SwipeScreen';
import CartScreen from '../screens/CartScreen';

const Tab = createBottomTabNavigator();

// Mevcut Alt Bar Tasarımımız (Artık tüm sayfalardan bağımsız çalışacak)
const CustomTabBar = ({ state, navigation }) => {
  const { cartItems } = useCartStore();
  const { logout } = useContext(AuthContext);

  // Aktif ekranın adını buluyoruz (İkonları kırmızı yapmak için)
  const currentRoute = state.routes[state.index].name;

  const handleRefresh = () => {
    // Kullanıcı hangi ekranda olursa olsun, Swipe ekranına gönder ve 'doRefresh' sinyali yolla
    navigation.navigate('Swipe', { doRefresh: Date.now() });
  };

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.bottomTab} onPress={handleRefresh}>
        <Ionicons name="refresh" size={28} color="#777" />
        <Text style={styles.bottomTabText}>Refresh</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => navigation.navigate('Swipe')}>
        <Ionicons name="home" size={28} color={currentRoute === 'Swipe' ? '#ff4b4b' : '#777'} />
        <Text style={[styles.bottomTabText, { color: currentRoute === 'Swipe' ? '#ff4b4b' : '#777' }]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => navigation.navigate('Cart')}>
        <View>
          <Ionicons name="cart-outline" size={28} color={currentRoute === 'Cart' ? '#ff4b4b' : '#777'} />
          {cartItems.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{cartItems.length}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.bottomTabText, { color: currentRoute === 'Cart' ? '#ff4b4b' : '#777' }]}>Cart</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={logout}>
        <Ionicons name="person-outline" size={28} color="#777" />
        <Text style={styles.bottomTabText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', paddingVertical: 15, paddingBottom: 25, zIndex: 100, elevation: 10 },
  bottomTab: { alignItems: 'center', justifyContent: 'center' },
  bottomTabText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  badgeContainer: { position: 'absolute', top: -5, right: -8, backgroundColor: '#ff4b4b', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});