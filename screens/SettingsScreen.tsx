import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Difficulty = 'easy' | 'normal' | 'hard';
type FireRate = 'steady' | 'fast' | 'rapid';

const difficultyOptions: { label: string; value: Difficulty }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Normal', value: 'normal' },
  { label: 'Hard', value: 'hard' },
];

const fireRateOptions: { label: string; value: FireRate }[] = [
  { label: 'Steady', value: 'steady' },
  { label: 'Fast', value: 'fast' },
  { label: 'Rapid', value: 'rapid' },
];

export default function SettingsScreen({ navigation }: any) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [fireRate, setFireRate] = useState<FireRate>('fast');
  const [showDamageFlash, setShowDamageFlash] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const [soundValue, musicValue, difficultyValue, fireRateValue, damageFlashValue] = await Promise.all([
        AsyncStorage.getItem('soundEnabled'),
        AsyncStorage.getItem('musicEnabled'),
        AsyncStorage.getItem('difficulty'),
        AsyncStorage.getItem('fireRate'),
        AsyncStorage.getItem('showDamageFlash'),
      ]);

      setSoundEnabled(soundValue === null || soundValue === 'true');
      setMusicEnabled(musicValue === null || musicValue === 'true');
      setDifficulty(difficultyValue === 'easy' || difficultyValue === 'hard' ? difficultyValue : 'normal');
      setFireRate(fireRateValue === 'steady' || fireRateValue === 'rapid' ? fireRateValue : 'fast');
      setShowDamageFlash(damageFlashValue === null || damageFlashValue === 'true');
    };

    const unsubscribe = navigation.addListener('focus', loadSettings);
    loadSettings();
    return unsubscribe;
  }, [navigation]);

  const toggleSound = async () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    await AsyncStorage.setItem('soundEnabled', newValue.toString());
  };

  const toggleMusic = async () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    await AsyncStorage.setItem('musicEnabled', newValue.toString());
  };

  const toggleDamageFlash = async () => {
    const newValue = !showDamageFlash;
    setShowDamageFlash(newValue);
    await AsyncStorage.setItem('showDamageFlash', newValue.toString());
  };

  const saveDifficulty = async (value: Difficulty) => {
    setDifficulty(value);
    await AsyncStorage.setItem('difficulty', value);
  };

  const saveFireRate = async (value: FireRate) => {
    setFireRate(value);
    await AsyncStorage.setItem('fireRate', value);
  };

  const resetProgress = () => {
    Alert.alert('Reset progress?', 'This clears your paused game and saved score.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['paused', 'savedScore']);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>
          <View style={styles.optionRow}>
            <View>
              <Text style={styles.optionLabel}>Sound Effects</Text>
              <Text style={styles.optionHint}>Shots, explosions, pickups</Text>
            </View>
            <Switch value={soundEnabled} onValueChange={toggleSound} />
          </View>
          <View style={styles.optionRow}>
            <View>
              <Text style={styles.optionLabel}>Background Music</Text>
              <Text style={styles.optionHint}>Stops immediately when off</Text>
            </View>
            <Switch value={musicEnabled} onValueChange={toggleMusic} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gameplay</Text>
          <Text style={styles.groupLabel}>Difficulty</Text>
          <View style={styles.segment}>
            {difficultyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.segmentButton, difficulty === option.value && styles.segmentButtonActive]}
                onPress={() => saveDifficulty(option.value)}
              >
                <Text style={[styles.segmentText, difficulty === option.value && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupLabel}>Fire Rate</Text>
          <View style={styles.segment}>
            {fireRateOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.segmentButton, fireRate === option.value && styles.segmentButtonActive]}
                onPress={() => saveFireRate(option.value)}
              >
                <Text style={[styles.segmentText, fireRate === option.value && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.optionRow}>
            <View>
              <Text style={styles.optionLabel}>Damage Feedback</Text>
              <Text style={styles.optionHint}>Keeps hit effects enabled</Text>
            </View>
            <Switch value={showDamageFlash} onValueChange={toggleDamageFlash} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game</Text>
          <TouchableOpacity style={styles.actionButton} onPress={resetProgress}>
            <Text style={styles.actionText}>Reset Saved Game</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.actionText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  header: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top: 42,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 2,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 18,
    paddingBottom: 36,
  },
  section: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sectionTitle: {
    color: '#7fd4ff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    marginTop: 12,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  optionHint: {
    marginTop: 3,
    color: '#a8b2c4',
    fontSize: 12,
  },
  groupLabel: {
    color: '#dbe7ff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#1fb6ff',
  },
  segmentText: {
    color: '#c5d3e8',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#001522',
  },
  actionButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
