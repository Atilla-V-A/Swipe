import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNav from './src/navigation/AppNav';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['InteractionManager has been deprecated']);
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}