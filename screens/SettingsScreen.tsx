import React, { useEffect, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
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

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(1);

  const updateFromX = (x: number) => {
    const nextValue = Math.max(0, Math.min(x / trackWidth, 1));
    onChange(Number(nextValue.toFixed(2)));
  };

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderHint}>Low</Text>
        <Text style={styles.sliderHint}>High</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.sliderTrack}
        onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => updateFromX(event.nativeEvent.locationX)}
      >
        <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value * 100}%` }]} />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [fireRate, setFireRate] = useState<FireRate>('fast');
  const [showDamageFlash, setShowDamageFlash] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.95);
  const [soundVolume, setSoundVolume] = useState(0.9);

  useEffect(() => {
    const loadSettings = async () => {
      const [
        soundValue,
        musicValue,
        difficultyValue,
        fireRateValue,
        damageFlashValue,
        musicVolumeValue,
        soundVolumeValue,
      ] = await Promise.all([
        AsyncStorage.getItem('soundEnabled'),
        AsyncStorage.getItem('musicEnabled'),
        AsyncStorage.getItem('difficulty'),
        AsyncStorage.getItem('fireRate'),
        AsyncStorage.getItem('showDamageFlash'),
        AsyncStorage.getItem('musicVolume'),
        AsyncStorage.getItem('soundVolume'),
      ]);

      setSoundEnabled(soundValue === null || soundValue === 'true');
      setMusicEnabled(musicValue === null || musicValue === 'true');
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

  const saveMusicVolume = async (value: number) => {
    setMusicVolume(value);
    await AsyncStorage.setItem('musicVolume', value.toString());
  };

  const saveSoundVolume = async (value: number) => {
    setSoundVolume(value);
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>Premium control deck</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>
          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>🔊 Sound Effects</Text>
              <Text style={styles.optionHint}>Shots, explosions, pickups</Text>
            </View>
            <Switch value={soundEnabled} onValueChange={toggleSound} thumbColor={soundEnabled ? '#ffd166' : '#8892a6'} />
          </View>
          <VolumeSlider label="Sound Effect Volume" value={soundVolume} onChange={saveSoundVolume} />

          <View style={styles.optionRow}>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>🎵 Background Music</Text>
              <Text style={styles.optionHint}>Game music volume and on/off</Text>
            </View>
            <Switch value={musicEnabled} onValueChange={toggleMusic} thumbColor={musicEnabled ? '#ffd166' : '#8892a6'} />
          </View>
          <VolumeSlider label="Background Music Volume" value={musicVolume} onChange={saveMusicVolume} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gameplay</Text>
          <Text style={styles.groupLabel}>Default Difficulty</Text>
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
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>💥 Damage Feedback</Text>
              <Text style={styles.optionHint}>Red flash when your plane gets hit</Text>
            </View>
            <Switch value={showDamageFlash} onValueChange={toggleDamageFlash} thumbColor={showDamageFlash ? '#ffd166' : '#8892a6'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game</Text>
          <TouchableOpacity style={styles.actionButton} onPress={resetProgress}>
            <Text style={styles.actionText}>🔄 Reset Saved Game</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.actionText}>🔒 Privacy Policy</Text>
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
    marginTop: 14,
    paddingTop: 12,
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
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderHint: {
    color: '#9fb0ca',
    fontSize: 11,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#ffd166',
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#ffd166',
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
});
