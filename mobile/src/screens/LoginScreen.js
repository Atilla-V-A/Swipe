import React, { useState, useContext } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Alert, 
  ImageBackground, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import axios from 'axios';

// Eklediğin görseli projeden çağırıyoruz
const backgroundImage = require('../../assets/login_page.jpeg');

const LoginScreen = () => {
  const [isLoginMode, setIsLoginMode] = useState(true); // Giriş mi, Kayıt mı modu
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Kayıt için isim
  const { login, API_URL } = useContext(AuthContext);

  const handleSubmit = async () => {
    if (isLoginMode) {
      // GİRİŞ YAP İŞLEMİ
      try {
        await login(email, password);
      } catch (error) {
        Alert.alert("Giriş Hatası", "E-posta veya şifre yanlış.");
      }
    } else {
      // KAYIT OL İŞLEMİ (Backend'deki register rotana göre ayarla)
      try {
        await axios.post(`${API_URL}/auth/register`, { name, email, password });
        Alert.alert("Başarılı!", "Kayıt oldunuz. Şimdi giriş yapabilirsiniz.");
        setIsLoginMode(true); // Kayıt başarılıysa Giriş formuna geri at
      } catch (error) {
        Alert.alert("Kayıt Hatası", error.response?.data?.message || "Bir hata oluştu.");
      }
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        {/* Blurlu Arka Plan Kutusu (Glassmorphism) */}
        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          
          <Text style={styles.title}>{isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Koleksiyonunu keşfetmeye devam et.' : 'Yeni bir tarza merhaba de.'}
          </Text>

          {/* Sadece Kayıt modundayken İsim alanı gösterilir */}
          {!isLoginMode && (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#ccc"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>{isLoginMode ? 'GİRİŞ YAP' : 'KAYIT OL'}</Text>
          </TouchableOpacity>

          {/* Formlar Arası Geçiş Butonu */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLoginMode ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
            </Text>
            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
              <Text style={styles.switchAction}>
                {isLoginMode ? 'Kayıt Ol' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>

        </BlurView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blurContainer: {
    width: '100%',
    padding: 30,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    width: '100%',
    backgroundColor: '#ff4b4b', // Tinder/Swipe tarzı tatlı bir kırmızı
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  switchText: {
    color: '#ccc',
    fontSize: 14,
  },
  switchAction: {
    color: '#ff4b4b',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default LoginScreen;