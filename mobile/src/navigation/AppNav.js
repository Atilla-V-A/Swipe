import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { AuthContext } from '../context/AuthContext';
import { useSettingsStore } from '../store/useSettingsStore';
import { scheduleDailyNotification } from '../utils/notifications';

import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs'; // Alt barımızın olduğu ana navigatör
import OnboardingScreen from '../screens/OnboardingScreen'; // Onboarding ekranımız

const Stack = createNativeStackNavigator();

const AppNav = () => {
  const { isLoading, userToken, userInfo } = useContext(AuthContext);
  const { language, notificationsEnabled } = useSettingsStore();

  React.useEffect(() => {
    if (notificationsEnabled) {
      scheduleDailyNotification(language);
    }

    // Bildirime tıklandığında ne olacağını (uygulamayı öne getirme) dinleyen listener
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped the notification:', response);
      // Gerekirse burada NavigationRouter ile spesifik bir ekrana (örneğin indirimler ekranı) yönlendirme yapılabilir.
    });

    return () => {
      responseListener.remove();
    };
  }, [language, notificationsEnabled]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Rengi uygulamanın temasına uygun hale getirdim */}
        <ActivityIndicator size="large" color="#ff4b4b" /> 
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken === null ? (
          // Token yoksa (Giriş yapılmamışsa)
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : userInfo && userInfo.isProfileComplete === false ? (
          // Giriş yapılmış ama profil eksikse
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // Token varsa (Giriş yapılmışsa) ve profil tamsa, alt barlı ana dünyamızı göster
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNav;