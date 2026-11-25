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

const backgroundImage = require('../../assets/login_page.jpeg');

const LoginScreen = () => {
  // --- EKRAN MODLARI ---
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isOtpMode, setIsOtpMode] = useState(false); 
  const [isForgotMode, setIsForgotMode] = useState(false); // E-posta isteme ekranı
  const [isResetMode, setIsResetMode] = useState(false);   // Kod ve yeni şifre ekranı
  
  // --- VERİLER ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState(''); 
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login, API_URL } = useContext(AuthContext);

  // 1. KAYIT VE GİRİŞ (LOGIN/REGISTER)
  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Lütfen geçerli bir email adresi giriniz.');
      return;
    }

    if (isLoginMode) {
      try {
        await login(email, password);
      } catch (error) {
        const errorData = error.response?.data;
        if (errorData?.requiresVerification) {
          Alert.alert("Doğrulama Gerekiyor", "Lütfen email adresinize gönderilen 6 haneli kodu girin.");
          setIsOtpMode(true);
        } else {
          Alert.alert("Login Error", errorData?.message || "Invalid email or password.");
        }
      }
    } else {
      try {
        await axios.post(`${API_URL}/auth/register`, { name, email, password });
        Alert.alert("Code Sent!", "Please check your email for the 6-digit verification code.");
        setIsOtpMode(true); 
      } catch (error) {
        Alert.alert("Registration Error", error.response?.data?.message || "An error occurred.");
      }
    }
  };

  // 2. KAYIT DOĞRULAMA (OTP VERIFY)
  const handleVerifyOtp = async () => {
    try {
      await axios.post(`${API_URL}/auth/verify-email`, { email, code: otpCode });
      Alert.alert("Success!", "Email verified successfully. You can now log in.");
      setIsOtpMode(false);
      setIsLoginMode(true);
      setOtpCode('');
    } catch (error) {
      Alert.alert("Verification Error", error.response?.data?.message || "Invalid code.");
    }
  };

  // 3. ŞİFRE SIFIRLAMA KODU İSTE
  const handleSendResetCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Lütfen geçerli bir email adresi giriniz.');
      return;
    }
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      Alert.alert("Başarılı", "Şifre sıfırlama kodu e-postanıza gönderildi.");
      setIsForgotMode(false);
      setIsResetMode(true); // Kodu girmesi için ekrana yönlendir
    } catch (error) {
      Alert.alert("Hata", error.response?.data?.message || "Bir hata oluştu.");
    }
  };

  // 4. KOD İLE YENİ ŞİFREYİ KAYDET
  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      Alert.alert("Hata", "Lütfen kodu ve yeni şifrenizi girin.");
      return;
    }
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { 
        email, 
        code: resetCode, 
        newPassword 
      });
      Alert.alert("Başarılı", "Şifreniz başarıyla değiştirildi. Şimdi giriş yapabilirsiniz.");
      setResetCode('');
      setNewPassword('');
      setIsResetMode(false);
      setIsLoginMode(true);
    } catch (error) {
      Alert.alert("Hata", error.response?.data?.message || "Sıfırlama başarısız.");
    }
  };

  // İPTAL BUTONLARI İÇİN YARDIMCI FONKSİYON
  const cancelToLogin = () => {
    setIsOtpMode(false);
    setIsForgotMode(false);
    setIsResetMode(false);
    setIsLoginMode(true);
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          
          <Text style={styles.title}>
            {isOtpMode ? 'Verify Email' 
              : isForgotMode ? 'Forgot Password' 
              : isResetMode ? 'Reset Password' 
              : isLoginMode ? 'Sign In' : 'Sign Up'}
          </Text>
          <Text style={styles.subtitle}>
            {isOtpMode ? 'Enter the 6-digit code sent to your email.' 
              : isForgotMode ? 'Enter your email to receive a reset code.'
              : isResetMode ? 'Enter the 6-digit code and your new password.'
              : isLoginMode ? 'Continue exploring your collection.' 
              : 'Say hello to a new style.'}
          </Text>

          {/* OTP (KAYIT DOĞRULAMA) EKRANI */}
          {isOtpMode && (
            <>
              <TextInput style={styles.input} placeholder="6-Digit Code" placeholderTextColor="#ccc" value={otpCode} onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} />
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}><Text style={styles.buttonText}>VERIFY CODE</Text></TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={cancelToLogin}><Text style={styles.switchText}>Cancel</Text></TouchableOpacity>
            </>
          )}

          {/* ŞİFRE SIFIRLAMA: MAİL GİRİŞ EKRANI */}
          {isForgotMode && (
            <>
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <TouchableOpacity style={styles.button} onPress={handleSendResetCode}><Text style={styles.buttonText}>SEND CODE</Text></TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={cancelToLogin}><Text style={styles.switchText}>Cancel</Text></TouchableOpacity>
            </>
          )}

          {/* ŞİFRE SIFIRLAMA: KOD VE YENİ ŞİFRE EKRANI */}
          {isResetMode && (
            <>
              <TextInput style={styles.input} placeholder="6-Digit Code" placeholderTextColor="#ccc" value={resetCode} onChangeText={(text) => setResetCode(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} />
              <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#ccc" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <TouchableOpacity style={styles.button} onPress={handleResetPassword}><Text style={styles.buttonText}>RESET PASSWORD</Text></TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={cancelToLogin}><Text style={styles.switchText}>Cancel</Text></TouchableOpacity>
            </>
          )}

          {/* STANDART GİRİŞ VE KAYIT EKRANI */}
          {!isOtpMode && !isForgotMode && !isResetMode && (
            <>
              {!isLoginMode && (
                <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#ccc" value={name} onChangeText={setName} autoCorrect={false} />
              )}
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry />

              {isLoginMode && (
                <TouchableOpacity onPress={() => setIsForgotMode(true)} style={{ alignSelf: 'flex-end', marginBottom: 15 }}>
                  <Text style={{ color: '#ff4b4b', fontWeight: '600' }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>{isLoginMode ? 'SIGN IN' : 'SIGN UP'}</Text>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>{isLoginMode ? "Don't have an account? " : "Already have an account? "}</Text>
                <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
                  <Text style={styles.switchAction}>{isLoginMode ? 'Sign Up' : 'Sign In'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </BlurView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  blurContainer: { width: '100%', padding: 30, borderRadius: 20, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#eee', marginBottom: 30, textAlign: 'center' },
  input: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  button: { width: '100%', backgroundColor: '#ff4b4b', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  switchContainer: { flexDirection: 'row', marginTop: 20 },
  switchText: { color: '#ccc', fontSize: 14 },
  switchAction: { color: '#ff4b4b', fontSize: 14, fontWeight: 'bold' }
});

export default LoginScreen;