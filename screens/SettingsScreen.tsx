import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard';
type FireRate = 'steady' | 'fast' | 'rapid';

const difficultyOptions: { label: string; value: Difficulty }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Very Hard', value: 'veryHard' },
];

const fireRateOptions: { label: string; value: FireRate }[] = [
  { label: 'Steady', value: 'steady' },
  { label: 'Fast', value: 'fast' },
  { label: 'Rapid', value: 'rapid' },
];

const normalizeVolume = (value: string | null, fallback: number) => {
  const parsed = value === null ? fallback : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 1)) : fallback;
};

const volumeOptions = [
  { label: 'Off', value: 0 },
  { label: 'Low', value: 0.25 },
  { label: 'Med', value: 0.5 },
  { label: 'High', value: 0.75 },
  { label: 'Max', value: 1 },
];

function VolumeLevelControl({
  label,
  value,
  onChange,
  onSave,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onSave: (value: number) => void;
}) {
  const saveValue = (nextValue: number) => {
    onChange(nextValue);
    onSave(nextValue);
  };

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.volumeOptions}>
        {volumeOptions.map((option) => {
          const active = Math.abs(value - option.value) < 0.13;
          return (
            <Pressable
              key={option.label}
              style={[styles.volumeOption, active && styles.volumeOptionActive]}
              onPress={() => saveValue(option.value)}
            >
              <Text style={[styles.volumeOptionText, active && styles.volumeOptionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [fireRate, setFireRate] = useState<FireRate>('fast');
  const [showDamageFlash, setShowDamageFlash] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.95);
  const [soundVolume, setSoundVolume] = useState(0.9);

  useEffect(() => {
    const loadSettings = async () => {
      const [difficultyValue, fireRateValue, damageFlashValue, musicVolumeValue, soundVolumeValue] =
        await Promise.all([
          AsyncStorage.getItem('difficulty'),
          AsyncStorage.getItem('fireRate'),
          AsyncStorage.getItem('showDamageFlash'),
          AsyncStorage.getItem('musicVolume'),
          AsyncStorage.getItem('soundVolume'),
        ]);

      setDifficulty(
        difficultyValue === 'easy' || difficultyValue === 'hard' || difficultyValue === 'veryHard'
          ? difficultyValue
          : 'medium'
      );
      setFireRate(fireRateValue === 'steady' || fireRateValue === 'rapid' ? fireRateValue : 'fast');
      setShowDamageFlash(damageFlashValue === null || damageFlashValue === 'true');
      setMusicVolume(normalizeVolume(musicVolumeValue, 0.95));
      setSoundVolume(normalizeVolume(soundVolumeValue, 0.9));
    };

    const unsubscribe = navigation.addListener('focus', loadSettings);
    loadSettings();
    return unsubscribe;
  }, [navigation]);

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

  const saveMusicVolume = async (value: number) => {
    await AsyncStorage.setItem('musicVolume', value.toString());
  };

  const saveSoundVolume = async (value: number) => {
    await AsyncStorage.setItem('soundVolume', value.toString());
  };

  const resetProgress = () => {
    Alert.alert('Reset progress?', 'This clears your paused game and saved score.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['paused', 'savedScore', 'savedGameState']);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Premium control deck</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>
          <Text style={styles.optionHint}>Set to Off to turn audio off.</Text>
          <VolumeLevelControl
            label="Sound Effects"
            value={soundVolume}
            onChange={setSoundVolume}
            onSave={saveSoundVolume}
          />
          <VolumeLevelControl
            label="Background Music"
            value={musicVolume}
            onChange={setMusicVolume}
            onSave={saveMusicVolume}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gameplay</Text>
          <Text style={styles.groupLabel}>Default Difficulty</Text>
          <View style={styles.segment}>
            {difficultyOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.segmentButton, difficulty === option.value && styles.segmentButtonActive]}
                onPress={() => saveDifficulty(option.value)}
              >
                <Text style={[styles.segmentText, difficulty === option.value && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.groupLabel}>Fire Rate</Text>
          <View style={styles.segment}>
            {fireRateOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.segmentButton, fireRate === option.value && styles.segmentButtonActive]}
                onPress={() => saveFireRate(option.value)}
              >
                <Text style={[styles.segmentText, fireRate === option.value && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Damage Feedback</Text>
              <Text style={styles.optionHint}>Red flash when your plane gets hit</Text>
            </View>
            <Pressable
              style={[styles.toggleButton, showDamageFlash && styles.toggleButtonActive]}
              onPress={toggleDamageFlash}
            >
              <Text style={[styles.toggleText, showDamageFlash && styles.toggleTextActive]}>
                {showDamageFlash ? 'On' : 'Off'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game</Text>
          <Pressable style={styles.actionButton} onPress={resetProgress}>
            <Text style={styles.actionText}>Reset Saved Game</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.actionText}>Privacy Policy</Text>
          </Pressable>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoText}>Version 2.0.2</Text>
          <Text style={styles.infoText}>Developed by Arman</Text>
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
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 209, 102, 0.24)',
    backgroundColor: '#08101f',
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
    fontWeight: '800',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffd166',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
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
    backgroundColor: '#0c1424',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.28)',
    shadowColor: '#ffd166',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
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
  optionText: {
    flex: 1,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  optionHint: {
    marginTop: 3,
    color: '#9fb0ca',
    fontSize: 12,
  },
  sliderBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    color: '#ffd166',
    fontSize: 13,
    fontWeight: '900',
  },
  volumeOptions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
  },
  volumeOption: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  volumeOptionActive: {
    backgroundColor: '#ffd166',
    borderColor: '#ffd166',
  },
  volumeOptionText: {
    color: '#dbe7ff',
    fontSize: 12,
    fontWeight: '900',
  },
  volumeOptionTextActive: {
    color: '#15100a',
  },
  toggleButton: {
    minWidth: 64,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  toggleButtonActive: {
    backgroundColor: '#ffd166',
    borderColor: '#ffd166',
  },
  toggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  toggleTextActive: {
    color: '#15100a',
  },
  groupLabel: {
    color: '#dbe7ff',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
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
    paddingHorizontal: 2,
  },
  segmentButtonActive: {
    backgroundColor: '#ffd166',
  },
  segmentText: {
    color: '#c5d3e8',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#15100a',
  },
  actionButton: {
    minHeight: 50,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  infoPanel: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoText: {
    color: '#9fb0ca',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
});
