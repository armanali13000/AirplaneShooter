import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type Star = { id: number; x: number; y: number; size: number; opacity: number };

const createStars = (count: number): Star[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.7,
  }));

export default function MenuScreen({ navigation }: any) {
  const [paused, setPaused] = useState(false);
  const [choosingDifficulty, setChoosingDifficulty] = useState(false);
  const [stars, setStars] = useState<Star[]>(() => createStars(28));
  const drift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const glowOpacity = useMemo(
    () =>
      glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.42],
      }),
    [glow]
  );

  useEffect(() => {
    const checkPaused = async () => {
      const value = await AsyncStorage.getItem('paused');
      setPaused(value === 'true');
      setStars(createStars(28));
    };

    const unsubscribe = navigation.addListener('focus', checkPaused);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    driftLoop.start();
    glowLoop.start();

    return () => {
      driftLoop.stop();
      glowLoop.stop();
    };
  }, [drift, glow]);

  const handleResume = async () => {
    navigation.navigate('Game');
  };

  const handleRestart = async () => {
    await AsyncStorage.multiRemove(['paused', 'savedScore', 'savedGameState']);
    setChoosingDifficulty(true);
  };

  const handlePlay = async (difficulty: 'easy' | 'medium' | 'hard' | 'veryHard') => {
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
      <Animated.View
        pointerEvents="none"
        style={[
          styles.liveLayer,
          {
            opacity: glowOpacity,
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 36],
                }),
              },
            ],
          },
        ]}
      >
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
      </Animated.View>

      <View style={styles.scrim} />
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.title}>🚀 Air Shooter 🚀</Text>
          <Text style={styles.subtitle}>Fast sky combat</Text>
        </View>

        <View style={styles.menuPanel}>
          {choosingDifficulty ? (
            <>
              <Text style={styles.chooseTitle}>Select Level</Text>
              <TouchableOpacity style={styles.button} onPress={() => handlePlay('easy')}>
                <Text style={styles.buttonText}>🟢 Easy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => handlePlay('medium')}>
                <Text style={styles.buttonText}>🔵 Medium</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => handlePlay('hard')}>
                <Text style={styles.buttonText}>🟠 Hard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => handlePlay('veryHard')}>
                <Text style={styles.buttonText}>🔴 Very Hard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitButton} onPress={() => setChoosingDifficulty(false)}>
                <Text style={styles.exitText}>⬅️ Back</Text>
              </TouchableOpacity>
            </>
          ) : paused ? (
            <>
              <TouchableOpacity style={styles.button} onPress={handleResume}>
                <Text style={styles.buttonText}>▶️ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleRestart}>
                <Text style={styles.buttonText}>🔄 Restart</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.button} onPress={() => setChoosingDifficulty(true)}>
              <Text style={styles.buttonText}>▶️ Play</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.buttonText}>⚙️ Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
            <Text style={styles.exitText}>❌ Exit</Text>
          </TouchableOpacity>
        </View>

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
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 34,
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
    color: '#d3ecff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  menuPanel: {
    width: '74%',
    maxWidth: 330,
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
    backgroundColor: 'rgba(5, 10, 20, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
  },
  exitButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(80, 15, 22, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    marginTop: 8,
  },
  exitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  developer: {
    position: 'absolute',
    bottom: 14,
    width: '100%',
    textAlign: 'center',
    color: '#d8d8d8',
    fontSize: 14,
  },
});
