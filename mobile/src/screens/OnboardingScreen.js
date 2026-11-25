import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { requestNotificationPermissions, scheduleDailyNotification } from '../utils/notifications';
import { useSettingsStore } from '../store/useSettingsStore';

const backgroundImage = require('../../assets/login_page.jpeg');

const OnboardingScreen = () => {
  const { userToken, API_URL, updateUserInfo } = useContext(AuthContext);
  const { language, toggleNotifications } = useSettingsStore();
  
  const [step, setStep] = useState(1);
  const [tempUser, setTempUser] = useState(null);
  
  const [gender, setGender] = useState(''); // 'male', 'female', 'other'
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  const handleDateChange = (text) => {
    // Keep only numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    
    // Auto-format to YYYY-MM-DD
    if (cleaned.length > 4 && cleaned.length <= 6) {
      formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    } else if (cleaned.length > 6) {
      formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4, 6) + '-' + cleaned.slice(6, 8);
    }
    
    setBirthDate(formatted);
  };

  const handleSave = async () => {
    if (!gender || !birthDate) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format (e.g. 1998-05-24).');
      return;
    }

    try {
      setLoading(true);
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      
      const response = await axios.put(`${API_URL}/auth/update-profile`, {
        gender,
        birthDate
      }, {
        headers: { Authorization: authHeader }
      });
      
      if (response.data && response.data.user) {
        setTempUser(response.data.user);
        setStep(2);
      }
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      const granted = await requestNotificationPermissions();
      if (granted) {
        useSettingsStore.getState().toggleNotifications(true);
        await scheduleDailyNotification(language);
      }
    } catch (error) {
      console.log('Error enabling notifications:', error);
    } finally {
      setLoading(false);
      if (tempUser) updateUserInfo(tempUser);
    }
  };

  const handleSkipNotifications = () => {
    if (tempUser) updateUserInfo(tempUser);
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Tell Us About Yourself</Text>
              <Text style={styles.subtitle}>We need a bit more info to find the best matches for you.</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]} 
                onPress={() => setGender('male')}>
                <Ionicons 
                  name="male" 
                  size={32} 
                  color={gender === 'male' ? '#fff' : '#ccc'} 
                />
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Male</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]} 
                onPress={() => setGender('female')}>
                <Ionicons 
                  name="female" 
                  size={32} 
                  color={gender === 'female' ? '#fff' : '#ccc'} 
                />
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Female</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.genderBtn, gender === 'other' && styles.genderBtnActive]} 
                onPress={() => setGender('other')}>
                <Ionicons 
                  name="male-female" 
                  size={32} 
                  color={gender === 'other' ? '#fff' : '#ccc'} 
                />
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Birth Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1998-05-24"
              placeholderTextColor="#999"
              value={birthDate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>CONTINUE</Text>
            )}
          </TouchableOpacity>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="notifications" size={64} color="#ff4b4b" style={{ marginBottom: 20 }} />
              <Text style={styles.title}>Stay Updated</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 40 }]}>
                Turn on notifications to know when new fashion drops are available. We only send one per day!
              </Text>

              <TouchableOpacity style={[styles.saveBtn, { width: '100%', marginBottom: 15 }]} onPress={handleEnableNotifications} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>ENABLE NOTIFICATIONS</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { width: '100%', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' }]} onPress={handleSkipNotifications} disabled={loading}>
                <Text style={[styles.saveBtnText, { color: '#ccc' }]}>SKIP FOR NOW</Text>
              </TouchableOpacity>
            </View>
          )}
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
    alignItems: 'center', // Centers children horizontally
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 32,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  genderBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  genderBtnActive: {
    backgroundColor: '#ff4b4b',
    borderColor: '#ff4b4b',
  },
  genderText: {
    color: '#ccc',
    fontWeight: '500',
    marginTop: 8,
    fontSize: 14,
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#ff4b4b',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default OnboardingScreen;
