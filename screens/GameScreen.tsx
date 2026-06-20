import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  Text,
  Alert,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width, height } = Dimensions.get('window');
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 60;
const BULLET_WIDTH = 6;
const BULLET_HEIGHT = 20;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;

type Bullet = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number };
type EnemyBullet = { id: number; x: number; y: number };
type Explosion = { id: number; x: number; y: number };

// 🔁 Unique ID Generator
let globalId = 0;
const uniqueId = () => globalId++;

export default function GameScreen({ navigation }: any) {
  const [playerX, setPlayerX] = useState(width / 2 - PLAYER_WIDTH / 2);
  const [playerY, setPlayerY] = useState(height - PLAYER_HEIGHT - 50);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [shieldActive, setShieldActive] = useState(false);
  const [doubleShotActive, setDoubleShotActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [powerUps, setPowerUps] = useState<
    { id: number; x: number; y: number; type: 'shield' | 'double' }[]
  >([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const isTouching = useRef(false);
  const playerXRef = useRef(playerX);
  const playerYRef = useRef(playerY);

  const shootSound = useRef<Audio.Sound | null>(null);
  const explosionSound = useRef<Audio.Sound | null>(null);
  const backgroundMusic = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSounds = async () => {
    try {
      const savedSound = await AsyncStorage.getItem('soundEnabled');
      const savedMusic = await AsyncStorage.getItem('musicEnabled');

      const isSoundOn = savedSound === null || savedSound === 'true';
      const isMusicOn = savedMusic === null || savedMusic === 'true';

      setSoundEnabled(isSoundOn);
      setMusicEnabled(isMusicOn);

      shootSound.current = new Audio.Sound();
      explosionSound.current = new Audio.Sound();
      backgroundMusic.current = new Audio.Sound();

      await shootSound.current.loadAsync(require('../assets/sounds/shoot.wav'));
      await explosionSound.current.loadAsync(require('../assets/sounds/explosion.wav'));
      await backgroundMusic.current.loadAsync(require('../assets/sounds/background.mp3'));

      await backgroundMusic.current.setIsLoopingAsync(true);
      setSoundLoaded(true);

      if (isMusicOn) {
        await backgroundMusic.current?.playAsync();
      }
    } catch (e) {
      console.warn('Sound loading error:', e);
    }
  };

    loadSounds();

    return () => {
      shootSound.current?.unloadAsync();
      explosionSound.current?.unloadAsync();
      backgroundMusic.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    const checkPaused = async () => {
      const isPaused = await AsyncStorage.getItem('paused');
      const savedScore = await AsyncStorage.getItem('savedScore');

      if (isPaused === 'true') {
      if (savedScore !== null) {
        setScore(parseInt(savedScore));
      }
      setPaused(false); // Resume game
    } else {
      setScore(0);
      setPaused(false); // Start new game
    }
    };

    const unsubscribe = navigation.addListener('focus', checkPaused);
    checkPaused();
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      await AsyncStorage.setItem('paused', 'true');
      await AsyncStorage.setItem('savedScore', score?.toString() ?? '0');
    });

    return unsubscribe;
  }, [navigation, score]);

  useEffect(() => {
    playerXRef.current = playerX;
    playerYRef.current = playerY;
  }, [playerX, playerY]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExplosions((prev) => prev.slice(1));
    }, 700);
    return () => clearInterval(interval);
  }, []);

  const resetGame = async () => {
    await AsyncStorage.removeItem('paused');
    await AsyncStorage.removeItem('savedScore');
    setPlayerX(width / 2 - PLAYER_WIDTH / 2);
    setPlayerY(height - PLAYER_HEIGHT - 50);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isTouching.current && !gameOver && !paused) {
        const centerX = playerXRef.current + PLAYER_WIDTH / 2;
        const newBullets = doubleShotActive
          ? [
              { id: uniqueId(), x: centerX - 10, y: playerYRef.current },
              { id: uniqueId(), x: centerX + 10 - BULLET_WIDTH, y: playerYRef.current },
            ]
          : [{ id: uniqueId(), x: centerX - BULLET_WIDTH / 2, y: playerYRef.current }];

        setBullets((prev) => [...prev, ...newBullets]);

        if (soundEnabled && soundLoaded) {
          shootSound.current?.replayAsync().catch(console.warn);
        }
      }
    }, 300);
    return () => clearInterval(interval);
  }, [gameOver, doubleShotActive, soundEnabled, soundLoaded, paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        setBullets((prev) =>
          prev.map((b) => ({ ...b, y: b.y - 10 })).filter((b) => b.y > 0)
        );
      }
    }, 16);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver && !paused) {
        const randomX = Math.random() * (width - ENEMY_WIDTH);
        setEnemies((prev) => [...prev, { id: uniqueId(), x: randomX, y: 0 }]);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [gameOver, paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver && !paused) {
        setEnemies((prevEnemies) => {
          const bulletsToAdd: EnemyBullet[] = prevEnemies.map((enemy) => ({
            id: uniqueId(),
            x: enemy.x + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2,
            y: enemy.y + ENEMY_HEIGHT,
          }));
          setEnemyBullets((prev) => [...prev, ...bulletsToAdd]);
          return prevEnemies;
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [gameOver, paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        setEnemyBullets((prev) =>
          prev.map((b) => ({ ...b, y: b.y + 8 })).filter((b) => b.y < height)
        );
      }
    }, 16);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver && !paused && Math.random() < 0.4) {
        const type: 'shield' | 'double' = Math.random() < 0.5 ? 'shield' : 'double';
        const x = Math.random() * (width - 40);
        setPowerUps((prev) => [...prev, { id: uniqueId(), x, y: 0, type }]);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [gameOver, paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        setPowerUps((prev) =>
          prev
            .map((p) => ({ ...p, y: p.y + 3 }))
            .filter((p) => {
              const pickedUp =
                p.x < playerXRef.current + PLAYER_WIDTH &&
                p.x + 40 > playerXRef.current &&
                p.y < playerYRef.current + PLAYER_HEIGHT &&
                p.y + 40 > playerYRef.current;

              if (pickedUp) {
                if (p.type === 'shield') {
                  setShieldActive(true);
                  setTimeout(() => setShieldActive(false), 10000);
                } else {
                  setDoubleShotActive(true);
                  setTimeout(() => setDoubleShotActive(false), 10000);
                }
              }

              return !pickedUp && p.y < height;
            })
        );
      }
    }, 50);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return;

      setEnemies((prevEnemies) => {
        let updatedEnemies: Enemy[] = [];
        let updatedBullets = [...bullets];
        let playerHit = false;

        for (let enemy of prevEnemies) {
          const newY = enemy.y + 5;

          const hitBullet = updatedBullets.find(
            (b) =>
              b.x < enemy.x + ENEMY_WIDTH &&
              b.x + BULLET_WIDTH > enemy.x &&
              b.y < newY + ENEMY_HEIGHT &&
              b.y + BULLET_HEIGHT > newY
          );

          if (hitBullet) {
            updatedBullets = updatedBullets.filter((b) => b.id !== hitBullet.id);
            setScore((s) => (s ?? 0) + 10);
            setExplosions((prev) => [...prev, { id: uniqueId(), x: enemy.x, y: newY }]);
            if (soundEnabled && soundLoaded) {
              explosionSound.current?.replayAsync().catch(console.warn);
            }
            continue;
          }

          const hitPlayer =
            playerXRef.current < enemy.x + ENEMY_WIDTH &&
            playerXRef.current + PLAYER_WIDTH > enemy.x &&
            playerYRef.current < newY + ENEMY_HEIGHT &&
            playerYRef.current + PLAYER_HEIGHT > newY;

          if (hitPlayer) {
            if (shieldActive) continue;
            else {
              playerHit = true;
              break;
            }
          }

          if (newY < height) updatedEnemies.push({ ...enemy, y: newY });
        }

        for (let bullet of enemyBullets) {
          const hitPlayer =
            bullet.x < playerXRef.current + PLAYER_WIDTH &&
            bullet.x + BULLET_WIDTH > playerXRef.current &&
            bullet.y < playerYRef.current + PLAYER_HEIGHT &&
            bullet.y + BULLET_HEIGHT > playerYRef.current;

          if (hitPlayer) {
            if (shieldActive) continue;
            else {
              setGameOver(true);
              isTouching.current = false;
              if (soundEnabled && soundLoaded) {
                explosionSound.current?.replayAsync().catch(console.warn);
              }
              Alert.alert('💀 Game Over', `Score: ${score}`, [
                { text: 'Restart', onPress: resetGame },
              ]);
              return [];
            }
          }
        }

        setBullets(updatedBullets);

        if (playerHit) {
          setGameOver(true);
          isTouching.current = false;
          if (soundEnabled && soundLoaded) {
            explosionSound.current?.replayAsync().catch(console.warn);
          }
          Alert.alert('💀 Game Over', `Score: ${score}`, [
            { text: 'Restart', onPress: resetGame },
          ]);
          return [];
        }

        return updatedEnemies;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [bullets, enemyBullets, gameOver, soundEnabled, soundLoaded, paused]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        isTouching.current = true;
        movePlayer(gestureState.moveX, gestureState.moveY);
      },
      onPanResponderMove: (_, gestureState) => {
        movePlayer(gestureState.moveX, gestureState.moveY);
      },
      onPanResponderRelease: () => {
        isTouching.current = false;
      },
    })
  ).current;

  const movePlayer = (x: number, y: number) => {
    const clampedX = Math.max(0, Math.min(x - PLAYER_WIDTH / 2, width - PLAYER_WIDTH));
    const clampedY = Math.max(0, Math.min(y - PLAYER_HEIGHT / 2, height - PLAYER_HEIGHT));
    setPlayerX(clampedX);
    setPlayerY(clampedY);
  };

  if (score === null) return null;

  return (


    <View style={styles.container} {...panResponder.panHandlers}>

      <View style={styles.gameArea}>
        <TouchableOpacity
          style={styles.pauseBtn}
          onPress={async () => {
            setPaused(true);
            isTouching.current = false;
            await AsyncStorage.setItem('paused', 'true');
            await AsyncStorage.setItem('savedScore', score.toString());
            navigation.navigate('Menu');
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>⏸️</Text>
        </TouchableOpacity>

        <Image source={require('../assets/play/player.png')} style={[styles.player, { left: playerX, top: playerY }]} />
        {shieldActive && (
          <View style={{ position: 'absolute', left: playerX - 10, top: playerY - 10, width: PLAYER_WIDTH + 20, height: PLAYER_HEIGHT + 20, borderRadius: 50, borderWidth: 2, borderColor: 'cyan', backgroundColor: 'rgba(0,255,255,0.1)' }} />
        )}
        {bullets.map((bullet) => (
          <View key={bullet.id} style={[styles.bullet, { left: bullet.x, top: bullet.y }]} />
        ))}
        {enemyBullets.map((bullet) => (
          <View key={bullet.id} style={[styles.bullet, { left: bullet.x, top: bullet.y, backgroundColor: 'yellow' }]} />
        ))}
        {powerUps.map((p) => (
          <Image
            key={p.id}
            source={p.type === 'shield' ? require('../assets/powerups/shield.png') : require('../assets/powerups/double.png')}
            style={{ position: 'absolute', width: 40, height: 40, left: p.x, top: p.y, resizeMode: 'contain' }}
          />
        ))}
        {enemies.map((enemy) => (
          <Image key={enemy.id} source={require('../assets/play/enemy.png')} style={[styles.enemy, { left: enemy.x, top: enemy.y }]} />
        ))}
        {explosions.map((explosion) => (
          <LottieView key={explosion.id.toString()} source={require('../assets/play/explosionn.json')} autoPlay loop={false} style={{ position: 'absolute', width: 80, height: 80, left: explosion.x, top: explosion.y, zIndex: 999 }} />
        ))}
        <Text style={styles.score}>Score: {score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gameArea: { flex: 1, position: 'relative' },
  player: {
    position: 'absolute',
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    resizeMode: 'contain',
  },
  bullet: {
    position: 'absolute',
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    backgroundColor: 'red',
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    resizeMode: 'contain',
  },
  score: {
    position: 'absolute',
    top: 40,
    left: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pauseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    zIndex: 999,
  },
});
