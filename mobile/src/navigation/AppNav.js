import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs'; // Alt barımızın olduğu ana navigatör

const Stack = createNativeStackNavigator();

const AppNav = () => {
  const { isLoading, userToken } = useContext(AuthContext);

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
        ) : (
          // Token varsa (Giriş yapılmışsa), alt barlı ana dünyamızı göster
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNav;