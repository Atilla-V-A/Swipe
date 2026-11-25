import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from '../i18n';
import { requestNotificationPermissions, scheduleDailyNotification, cancelNotifications } from '../utils/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation }) {
  const { userToken, logout, API_URL, userInfo, updateUserInfo } = useContext(AuthContext);
  const { darkMode, language, notificationsEnabled, toggleNotifications } = useSettingsStore();
  const t = translations[language] || translations['English'];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Accordion state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Saved values for greeting (won't change while typing)
  const [savedName, setSavedName] = useState('');
  const [savedEmail, setSavedEmail] = useState('');

  const [stats, setStats] = useState({
    weekly: { swipes: 0, likes: 0 },
    monthly: { swipes: 0, likes: 0 }
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    birthDate: '',
    gender: ''
  });

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      // Sadece ilk açılışta veya veriler henüz yokken yükleniyor göster
      if (!formData.email) {
        setLoading(true);
      }
      
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: authHeader }
      });

      const { user, stats } = response.data;

      setStats(stats || {
        weekly: { swipes: 0, likes: 0 },
        monthly: { swipes: 0, likes: 0 }
      });
      
      setSavedName(user.name || '');
      setSavedEmail(user.email || '');

      setFormData({
        name: user.name || '',
        email: user.email || '',
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        gender: user.gender || ''
      });

    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Hata mesajını çok sık göstermemek için sessizce yoksayabiliriz veya sadece ilk yüklemedeyse gösterebiliriz
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
      const response = await axios.put(`${API_URL}/auth/settings`, formData, {
        headers: { Authorization: authHeader }
      });

      // Update saved name and email so greeting updates
      if (response.data && response.data.user) {
        updateUserInfo(response.data.user);
        setSavedName(formData.name);
        setSavedEmail(formData.email);
        Alert.alert('Success', 'Profile updated successfully.');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Turn off
      await cancelNotifications();
      toggleNotifications(false);
    } else {
      // Turn on
      const granted = await requestNotificationPermissions();
      if (granted) {
        toggleNotifications(true);
        await scheduleDailyNotification(language);
      } else {
        Alert.alert('Eksik İzin', 'Cihaz ayarlarından bildirimlere izin vermeniz gerekiyor.');
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all your data, liked items, and activity history. This action is irreversible and cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const authHeader = userToken.startsWith('Bearer') ? userToken : `Bearer ${userToken}`;
              await axios.delete(`${API_URL}/auth/delete-account`, {
                headers: { Authorization: authHeader }
              });
              await logout();
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('Error', 'Failed to delete account.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => logout() }
      ]
    );
  };

  const getGreetingName = () => {
    if (savedName) return savedName;
    if (savedEmail) return savedEmail.split('@')[0];
    return 'User';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4b4b" />
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && styles.containerDark, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.greetingText, darkMode && styles.greetingTextDark]}>{t.hi}, {savedName || t.user}</Text>
        <Text style={[styles.subtitleText, darkMode && styles.subtitleTextDark]}>{savedEmail}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ACTIVITY SUMMARY SECTION */}
        <View style={[styles.section, darkMode && styles.sectionDark]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setIsActivityOpen(!isActivityOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>{t.activitySummary}</Text>
            <Ionicons name={isActivityOpen ? "chevron-up" : "chevron-down"} size={20} color={darkMode ? "#fff" : "#555"} />
          </TouchableOpacity>

          {isActivityOpen && (
            <View style={styles.statsContainer}>
              <View style={[styles.statBox, darkMode && styles.statBoxDark]}>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>{t.thisWeek}</Text>
                <View style={styles.statRow}>
                  <Ionicons name="swap-horizontal" size={16} color="#ff4b4b" />
                  <Text style={[styles.statValue, darkMode && styles.statValueDark]}>{stats.weekly.swipes} {t.swipes}</Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="heart" size={16} color="#4cd137" />
                  <Text style={[styles.statValue, darkMode && styles.statValueDark]}>{stats.weekly.likes} {t.likes}</Text>
                </View>
              </View>
              <View style={[styles.statBox, darkMode && styles.statBoxDark]}>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>{t.thisMonth}</Text>
                <View style={styles.statRow}>
                  <Ionicons name="swap-horizontal" size={16} color="#ff4b4b" />
                  <Text style={[styles.statValue, darkMode && styles.statValueDark]}>{stats.monthly.swipes} {t.swipes}</Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="heart" size={16} color="#4cd137" />
                  <Text style={[styles.statValue, darkMode && styles.statValueDark]}>{stats.monthly.likes} {t.likes}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* SETTINGS SECTION */}
        <View style={[styles.section, darkMode && styles.sectionDark]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setIsSettingsOpen(!isSettingsOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>{t.accountSettings}</Text>
            <Ionicons name={isSettingsOpen ? "chevron-up" : "chevron-down"} size={20} color={darkMode ? "#fff" : "#555"} />
          </TouchableOpacity>

          {isSettingsOpen && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, darkMode && styles.labelDark]}>{t.fullName}</Text>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  placeholder="Enter your name"
                  placeholderTextColor={darkMode ? '#777' : '#999'}
                  value={formData.name}
                  onChangeText={(val) => setFormData({ ...formData, name: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, darkMode && styles.labelDark]}>{t.emailAddress}</Text>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark, { opacity: 0.6 }]}
                  placeholder="Enter email"
                  placeholderTextColor={darkMode ? '#777' : '#999'}
                  value={formData.email}
                  editable={false} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, darkMode && styles.labelDark]}>{t.birthDate}</Text>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={darkMode ? '#777' : '#999'}
                  value={formData.birthDate}
                  onChangeText={(val) => setFormData({ ...formData, birthDate: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, darkMode && styles.labelDark]}>{t.genderLabel}</Text>
                <View style={styles.genderContainer}>
                  {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        darkMode && styles.genderButtonDark,
                        formData.gender === g && styles.genderButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, gender: g })}
                    >
                      <Text style={[
                        styles.genderText,
                        darkMode && styles.genderTextDark,
                        formData.gender === g && styles.genderTextActive
                      ]}>{t[g]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingsRow}>
                <Text style={[styles.settingsLabel, darkMode && styles.settingsLabelDark]}>{t.notifications}</Text>
                <TouchableOpacity 
                  style={[styles.toggleBtn, notificationsEnabled && styles.toggleBtnActive]}
                  onPress={handleToggleNotifications}
                >
                  <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t.saveChanges}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator color="#ff4b4b" size="small" />
                ) : (
                  <Text style={styles.deleteText}>{t.deleteAccount}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* LOGOUT BUTTON */}
        <View style={styles.footerSection}>
          <TouchableOpacity style={[styles.logoutButton, darkMode && styles.logoutButtonDark]} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#ff4b4b" />
            <Text style={[styles.logoutText, darkMode && styles.logoutTextDark]}>{t.logout}</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer for bottom tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 24, paddingBottom: 10 },
  greetingText: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitleText: { fontSize: 14, color: '#777', marginTop: 4 },

  section: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#eee'
  },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  statValue: { fontSize: 13, color: '#333', marginLeft: 6 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333'
  },

  genderContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  },
  genderButtonActive: { backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' },
  genderText: { fontSize: 13, color: '#555', fontWeight: '500' },
  genderTextActive: { color: '#fff', fontWeight: 'bold' },

  saveButton: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },

  deleteButton: { padding: 10, alignItems: 'center' },
  deleteText: { fontSize: 14, fontWeight: 'bold', color: '#ff4b4b' },

  footerSection: {
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 40,
    alignItems: 'center'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#555', marginLeft: 8 },

  // Dark Mode Styles
  containerDark: { backgroundColor: '#121212' },
  greetingTextDark: { color: '#fff' },
  subtitleTextDark: { color: '#aaa' },
  sectionDark: { backgroundColor: '#1e1e1e' },
  sectionTitleDark: { color: '#fff' },
  statBoxDark: { backgroundColor: '#2a2a2a', borderColor: '#444' },
  statLabelDark: { color: '#ddd' },
  statValueDark: { color: '#fff' },
  labelDark: { color: '#ddd' },
  inputDark: { backgroundColor: '#2a2a2a', borderColor: '#444', color: '#fff' },
  genderButtonDark: { borderColor: '#444' },
  genderTextDark: { color: '#ddd' },
  logoutButtonDark: { backgroundColor: '#1e1e1e' },
  logoutTextDark: { color: '#fff' },

  // Toggle Styles (borrowed from SwipeScreen)
  settingsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  settingsLabel: { fontSize: 16, fontWeight: '600', color: '#555' },
  settingsLabelDark: { color: '#ddd' },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#ddd', padding: 2, justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: '#ff4b4b' },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleCircleActive: { transform: [{ translateX: 22 }] },

});
