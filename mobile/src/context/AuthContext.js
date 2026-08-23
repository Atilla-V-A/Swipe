import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Context'i oluşturuyoruz
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // ÖNEMLİ: React Native cihazında 'localhost' çalışmaz.
  // Buraya bilgisayarının yerel IPv4 adresini yazmalısın (Örn: http://192.168.1.50:3000/api)
  // iOS Simülatörü için localhost genellikle en sağlıklısıdır
const API_URL = 'http://localhost:3001/api';

  // Uygulama açıldığında SecureStore'da token var mı diye kontrol et
  const checkTokenOnStartup = async () => {
    try {
      setIsLoading(true);
      const storedToken = await SecureStore.getItemAsync('jwt_token');
      if (storedToken) {
        setUserToken(storedToken); // Token varsa state'i güncelle (otomatik giriş)
      }
    } catch (error) {
      console.log('Token okuma hatası:', error);
    } finally {
      setIsLoading(false); // Yükleme bitti
    }
  };

  useEffect(() => {
    checkTokenOnStartup();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      // Backend'in gönderdiği token'ı yakala (backend'deki anahtar ismine göre '.token' kısmını kontrol et)
      const token = response.data.token; 
      
      if (token) {
        setUserToken(token); // State'e kaydet (Uygulama anında ana ekrana geçer)
        await SecureStore.setItemAsync('jwt_token', token); // Cihaz hafızasına şifreleyerek kaydet
      }
    } catch (error) {
      console.error('Giriş başarısız:', error.response?.data || error.message);
      throw error; // UI tarafında hatayı ekrana basmak için fırlatıyoruz
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    await SecureStore.deleteItemAsync('jwt_token'); // Çıkış yapınca hafızadan sil
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};