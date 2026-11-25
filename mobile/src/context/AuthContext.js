import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';
import { useCartStore } from '../store/useCartStore'; // 1. ZUSTAND IMPORT EDİLDİ
import { useSettingsStore } from '../store/useSettingsStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  const API_URL = `http://${localhost}:3001/api`;

  // --- YENİ EKLENDİ: Backend'den sepeti çekip Zustand'a yükleyen yardımcı fonksiyon ---
  // --- GÜNCELLENMİŞ SEPET ÇEKME FONKSİYONU ---
  const fetchUserBasket = async (token) => {
    try {
      const authHeader = token.startsWith('Bearer') ? token : `Bearer ${token}`;
      const response = await axios.get(`${API_URL}/basket`, {
        headers: { Authorization: authHeader }
      });
      
      console.log("Backendden Gelen Ham Sepet:", JSON.stringify(response.data, null, 2));
      
      let basketData = [];
      
      // Backend veriyi direkt dizi olarak dönüyorsa
      if (Array.isArray(response.data)) {
        basketData = response.data;
      } 
      // Backend veriyi obje içinde 'items' dizisi olarak dönüyorsa
      else if (response.data && Array.isArray(response.data.items)) {
        // Eğer ürünler { product: { _id: ... } } formatında sarılıysa onları dışarı çıkarıyoruz
        basketData = response.data.items.map(item => item.product ? item.product : item);
      } else if (response.data && Array.isArray(response.data.products)) {
        basketData = response.data.products;
      }

      console.log("Zustand'a Yüklenen Temiz Sepet:", basketData.length, "ürün");
      
      // Zustand'a temizlenmiş diziyi gönderiyoruz
      useCartStore.getState().setCartItems(basketData);
      
    } catch (error) {
      console.error('Kullanıcı sepeti çekilemedi:', error.response?.data || error.message);
      if (error.response && error.response.status === 401) {
        throw new Error('Unauthorized');
      }
    }
  };
  // -----------------------------------------------------------------------------------

  // Uygulama açıldığında SecureStore'da token var mı diye kontrol et
  const checkTokenOnStartup = async () => {
    try {
      setIsLoading(true);
      const storedToken = await SecureStore.getItemAsync('jwt_token');
      const storedUserInfo = await SecureStore.getItemAsync('user_info');
      
      if (storedToken) {
        setUserToken(storedToken); 
        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo));
        }
        
        // 2. OTOMATİK GİRİŞ YAPILDIĞINDA SEPETİ DE ÇEK
        await fetchUserBasket(storedToken);
      }
    } catch (error) {
      console.log('Token okuma/doğrulama hatası:', error.message);
      if (error.message === 'Unauthorized') {
        // Eski/geçersiz token varsa temizle
        await SecureStore.deleteItemAsync('jwt_token');
        await SecureStore.deleteItemAsync('user_info');
        setUserToken(null);
        setUserInfo(null);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    checkTokenOnStartup();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      const token = response.data.token; 
      const user = response.data.user;
      
      if (token) {
        setUserToken(token); 
        setUserInfo(user);
        await SecureStore.setItemAsync('jwt_token', token); 
        await SecureStore.setItemAsync('user_info', JSON.stringify(user));
        
        // 3. KULLANICI E-POSTA/ŞİFRE İLE GİRDİĞİNDE SEPETİ ÇEK
        await fetchUserBasket(token);
      }
    } catch (error) {
      console.error('Giriş başarısız:', error.response?.data || error.message);
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    setUserInfo(null);
    await SecureStore.deleteItemAsync('jwt_token'); 
    await SecureStore.deleteItemAsync('user_info');
    
    // 4. ÇIKIŞ YAPILDIĞINDA ZUSTAND SEPETİNİ SIFIRLA
    useCartStore.getState().clearCart();
    
    // 5. ÇIKIŞ YAPILDIĞINDA AYARLARI SIFIRLA (Light Mode ve English'e döner)
    useSettingsStore.getState().resetSettings();
    
    setIsLoading(false);
  };

  const updateUserInfo = async (newUserInfo) => {
    setUserInfo(newUserInfo);
    await SecureStore.setItemAsync('user_info', JSON.stringify(newUserInfo));
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken, userInfo, updateUserInfo, isLoading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};