import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// Ekranlarımız (Birazdan oluşturacağız)
import LoginScreen from '../screens/LoginScreen';
import SwipeScreen from '../screens/SwipeScreen';

const Stack = createNativeStackNavigator();

const AppNav = () => {
  const { isLoading, userToken } = useContext(AuthContext);

  // Uygulama ilk açıldığında token okunurken gösterilecek yükleme ekranı
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken === null ? (
          // Token yoksa (Giriş yapılmamışsa)
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Token varsa (Giriş yapılmışsa)
          <Stack.Screen name="Swipe" component={SwipeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNav;