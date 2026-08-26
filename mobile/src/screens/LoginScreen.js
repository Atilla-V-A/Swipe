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
  Platform,
  Image
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import axios from 'axios';

// Assets
const backgroundImage = require('../../assets/login_page.jpeg');


const LoginScreen = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login, API_URL } = useContext(AuthContext);

  const handleSubmit = async () => {
    if (isLoginMode) {
      // LOGIN 
      try {
        await login(email, password);
      } catch (error) {
        Alert.alert("Login Error", "Invalid email or password.");
      }
    } else {
      // REGISTER
      try {
        await axios.post(`${API_URL}/auth/register`, { name, email, password });
        Alert.alert("Success!", "Registered successfully. You can now log in.");
        setIsLoginMode(true);
      } catch (error) {
        Alert.alert("Registration Error", error.response?.data?.message || "An error occurred.");
      }
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        
       
        

        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          
          <Text style={styles.title}>{isLoginMode ? 'Sign In' : 'Sign Up'}</Text>
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Continue exploring your collection.' : 'Say hello to a new style.'}
          </Text>

          {/* Name input - Only for Registration */}
          {!isLoginMode && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#ccc"
              value={name}
              onChangeText={setName}
              autoCorrect={false} 
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false} 
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>{isLoginMode ? 'SIGN IN' : 'SIGN UP'}</Text>
          </TouchableOpacity>

          {/* Mode Switcher */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
              <Text style={styles.switchAction}>
                {isLoginMode ? 'Sign Up' : 'Sign In'}
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
    backgroundColor: '#ff4b4b',
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