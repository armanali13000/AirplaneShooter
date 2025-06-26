import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingScreen({ navigation }: any) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      const soundValue = await AsyncStorage.getItem('soundEnabled');
      const musicValue = await AsyncStorage.getItem('musicEnabled');

      setSoundEnabled(soundValue === null || soundValue === 'true');
      setMusicEnabled(musicValue === null || musicValue === 'true');
    };
    loadSettings();
  }, []);

  // Toggle sound FX setting
  const toggleSound = async () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    await AsyncStorage.setItem('soundEnabled', newValue.toString());
  };

  // Toggle background music setting
  const toggleMusic = async () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    await AsyncStorage.setItem('musicEnabled', newValue.toString());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Settings</Text>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>🔊 Sound Effects</Text>
        <Switch value={soundEnabled} onValueChange={toggleSound} />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>🎵 Background Music</Text>
        <Switch value={musicEnabled} onValueChange={toggleMusic} />
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>⬅️ Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 50,
    marginBottom: 40,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    alignItems: 'center',
    marginBottom: 30,
  },
  optionLabel: {
    fontSize: 20,
    color: '#fff',
  },
  backButton: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fff',
  },
});
