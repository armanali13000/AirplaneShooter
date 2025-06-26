import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MenuScreen({ navigation }: any) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const checkPaused = async () => {
      const value = await AsyncStorage.getItem('paused');
      setPaused(value === 'true');
    };

    const unsubscribe = navigation.addListener('focus', checkPaused);
    return unsubscribe;
  }, [navigation]);

  const handleResume = async () => {
    await AsyncStorage.removeItem('paused');
    navigation.navigate('Game');
  };

  const handleRestart = async () => {
    await AsyncStorage.removeItem('paused');
    navigation.navigate('Game');
  };

  const handleExit = async () => {
    await AsyncStorage.removeItem('paused');
    BackHandler.exitApp();
  };

  return (
    <ImageBackground
      source={require('../assets/backgrounds/menu-bg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>🚀Air Shooter🚀</Text>

        {paused ? (
          <>
            <TouchableOpacity style={styles.button} onPress={handleResume}>
              <Text style={styles.buttonText}>▶️ Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleRestart}>
              <Text style={styles.buttonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Game')}
          >
            <Text style={styles.buttonText}>▶️ Play</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.buttonText}>⚙️ Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExit}>
          <Text style={styles.buttonText}>❌ Exit</Text>
        </TouchableOpacity>

        <Text style={styles.developer}>Developed by Arman</Text>
      </View>
    </ImageBackground>
  );
}

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
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 50,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 10,
    marginVertical: 10,
    width: '70%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
  },
  developer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    textAlign: 'center',
    color: '#ccc',
    fontSize: 14,
  },
});
