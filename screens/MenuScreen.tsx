import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type Star = { id: number; x: number; y: number; size: number; opacity: number };
type Level = 'easy' | 'medium' | 'hard' | 'veryHard';

const createStars = (count: number): Star[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 3,
    opacity: 0.28 + Math.random() * 0.45,
  }));

const levels: { id: Level; roman: string; title: string; hint: string }[] = [
  { id: 'easy', roman: 'I', title: 'Easy', hint: 'Relaxed flight' },
  { id: 'medium', roman: 'II', title: 'Medium', hint: 'Balanced combat' },
  { id: 'hard', roman: 'III', title: 'Hard', hint: 'Fast enemies' },
  { id: 'veryHard', roman: 'IV', title: 'Very Hard', hint: 'Elite challenge' },
];

export default function MenuScreen({ navigation }: any) {
  const [paused, setPaused] = useState(false);
  const [choosingDifficulty, setChoosingDifficulty] = useState(false);
  const [stars, setStars] = useState<Star[]>(() => createStars(28));

  useEffect(() => {
    const checkPaused = async () => {
      const value = await AsyncStorage.getItem('paused');
      setPaused(value === 'true');
      setStars(createStars(28));
    };

    const unsubscribe = navigation.addListener('focus', checkPaused);
    return unsubscribe;
  }, [navigation]);

  const handleResume = async () => {
    navigation.navigate('Game');
  };

  const handleRestart = async () => {
    await AsyncStorage.multiRemove(['paused', 'savedScore', 'savedGameState']);
    setChoosingDifficulty(true);
  };

  const handlePlay = async (difficulty: Level) => {
    await AsyncStorage.multiSet([
      ['selectedDifficulty', difficulty],
      ['difficulty', difficulty],
    ]);
    await AsyncStorage.multiRemove(['paused', 'savedScore', 'savedGameState']);
    setChoosingDifficulty(false);
    navigation.navigate('Game', { newGame: Date.now() });
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
      <View pointerEvents="none" style={styles.liveLayer}>
        {stars.map((star) => (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.scrim} />
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.title}>🚀 Air Shooter 🚀</Text>
          <Text style={styles.subtitle}>Rocket air combat</Text>
        </View>

        <View style={styles.menuPanel}>
          {choosingDifficulty ? (
            <>
              <Text style={styles.chooseTitle}>Select Level</Text>
              {levels.map((level) => (
                <Pressable key={level.id} style={styles.levelButton} onPress={() => handlePlay(level.id)}>
                  <Text style={styles.levelIcon}>{level.roman}</Text>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelTitle}>{level.title}</Text>
                    <Text style={styles.levelHint}>{level.hint}</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable style={styles.secondaryButton} onPress={() => setChoosingDifficulty(false)}>
                <Text style={styles.secondaryText}>⬅️ Back</Text>
              </Pressable>
            </>
          ) : paused ? (
            <>
              <Pressable style={styles.button} onPress={handleResume}>
                <Text style={styles.buttonText}>▶️ Resume</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={handleRestart}>
                <Text style={styles.buttonText}>🔄 Restart</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.button} onPress={() => setChoosingDifficulty(true)}>
              <Text style={styles.buttonText}>▶️ Play</Text>
            </Pressable>
          )}

          <Pressable style={styles.button} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.buttonText}>⚙️ Settings</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleExit}>
            <Text style={styles.secondaryText}>❌ Exit</Text>
          </Pressable>
        </View>
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
  liveLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitle: {
    marginTop: 6,
    color: '#ffd166',
    fontSize: 15,
    fontWeight: '900',
  },
  menuPanel: {
    width: '78%',
    maxWidth: 350,
  },
  chooseTitle: {
    color: '#ffd166',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 16, 31, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.32)',
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '900',
  },
  levelButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 16, 31, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.32)',
    borderRadius: 8,
    marginVertical: 6,
    paddingHorizontal: 14,
  },
  levelIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#15100a',
    backgroundColor: '#ffd166',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 12,
  },
  levelCopy: {
    flex: 1,
  },
  levelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  levelHint: {
    color: '#9fb0ca',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  secondaryButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    marginTop: 8,
  },
  secondaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
