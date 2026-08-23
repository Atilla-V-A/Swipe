import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const SwipeScreen = () => {
  const { logout } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoş Geldin!</Text>
      <Text style={styles.subtitle}>Burası Tinder ürün akışı olacak.</Text>
      
      {/* Çıkış Yap butonu, SecureStore'dan token'ı silip Login'e geri atacak */}
      <Button title="Çıkış Yap" onPress={logout} color="red" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 30, color: '#666' }
});

export default SwipeScreen; 