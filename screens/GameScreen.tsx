import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
const MAX_HEALTH = 100;
const PLAYER_BULLET_SPEED = 720;
const ENEMY_BULLET_SPEED = 430;
const POWER_UP_SPEED = 150;
const DAMAGE_COOLDOWN_MS = 450;

type Difficulty = 'easy' | 'normal' | 'hard';
type FireRate = 'steady' | 'fast' | 'rapid';
type Bullet = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number; shootTimer: number };
type EnemyBullet = { id: number; x: number; y: number };
type Explosion = { id: number; x: number; y: number; createdAt: number };
type PowerUp = { id: number; x: number; y: number; type: 'shield' | 'double' };

let globalId = 0;
const uniqueId = () => globalId++;

const difficultyConfig: Record<
  Difficulty,
  { enemySpeed: number; spawnMs: number; enemyFireMs: number; bulletDamage: number; collisionDamage: number }
> = {
  easy: { enemySpeed: 170, spawnMs: 1700, enemyFireMs: 2400, bulletDamage: 18, collisionDamage: 28 },
  normal: { enemySpeed: 230, spawnMs: 1350, enemyFireMs: 1900, bulletDamage: 25, collisionDamage: 35 },
  hard: { enemySpeed: 300, spawnMs: 1050, enemyFireMs: 1450, bulletDamage: 32, collisionDamage: 45 },
};

const fireRateMs: Record<FireRate, number> = {
  steady: 260,
  fast: 190,
  rapid: 135,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

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
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [fireRate, setFireRate] = useState<FireRate>('fast');
  const [damageFlash, setDamageFlash] = useState(false);

  const playerXRef = useRef(playerX);
  const playerYRef = useRef(playerY);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<EnemyBullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const healthRef = useRef(MAX_HEALTH);
  const isTouching = useRef(false);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const musicEnabledRef = useRef(true);
  const shieldActiveRef = useRef(false);
  const doubleShotActiveRef = useRef(false);
  const difficultyRef = useRef<Difficulty>('normal');
  const fireRateRef = useRef<FireRate>('fast');
  const showDamageFlashRef = useRef(true);
  const lastFrameAt = useRef<number | null>(null);
  const lastShotAt = useRef(0);
  const enemySpawnTimer = useRef(0);
  const powerUpSpawnTimer = useRef(0);
  const lastDamageAt = useRef(0);
  const animationFrame = useRef<number | null>(null);
  const gameFocused = useRef(false);
  const soundsLoaded = useRef(false);

  const shootSound = useRef<Audio.Sound | null>(null);
  const explosionSound = useRef<Audio.Sound | null>(null);
  const backgroundMusic = useRef<Audio.Sound | null>(null);

  const syncSettings = useCallback(async () => {
    const [savedSound, savedMusic, savedDifficulty, savedFireRate, savedDamageFlash] = await Promise.all([
      AsyncStorage.getItem('soundEnabled'),
      AsyncStorage.getItem('musicEnabled'),
      AsyncStorage.getItem('difficulty'),
      AsyncStorage.getItem('fireRate'),
      AsyncStorage.getItem('showDamageFlash'),
    ]);

    const nextSound = savedSound === null || savedSound === 'true';
    const nextMusic = savedMusic === null || savedMusic === 'true';
    const nextDifficulty = savedDifficulty === 'easy' || savedDifficulty === 'hard' ? savedDifficulty : 'normal';
    const nextFireRate =
      savedFireRate === 'steady' || savedFireRate === 'rapid' ? savedFireRate : 'fast';

    soundEnabledRef.current = nextSound;
    musicEnabledRef.current = nextMusic;
    difficultyRef.current = nextDifficulty;
    fireRateRef.current = nextFireRate;
    showDamageFlashRef.current = savedDamageFlash === null || savedDamageFlash === 'true';
    setSoundEnabled(nextSound);
    setMusicEnabled(nextMusic);
    setDifficulty(nextDifficulty);
    setFireRate(nextFireRate);

    if (!backgroundMusic.current || !soundsLoaded.current) return;
    if (gameFocused.current && nextMusic && !pausedRef.current && !gameOverRef.current) {
      await backgroundMusic.current.playAsync();
    } else {
      await backgroundMusic.current.pauseAsync();
    }
  }, []);

  const stopMusic = useCallback(async () => {
    try {
      await backgroundMusic.current?.pauseAsync();
    } catch (error) {
      console.warn('Music pause error:', error);
    }
  }, []);

  const playExplosion = useCallback(() => {
    if (soundEnabledRef.current && soundsLoaded.current) {
      explosionSound.current?.replayAsync().catch(console.warn);
    }
  }, []);

  const endGame = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    isTouching.current = false;
    stopMusic();
    playExplosion();
    Alert.alert('Game Over', `Score: ${scoreRef.current}`, [{ text: 'Restart', onPress: () => resetGame() }]);
  }, [playExplosion, stopMusic]);

  const damagePlayer = useCallback(
    (amount: number, now: number) => {
      if (shieldActiveRef.current || now - lastDamageAt.current < DAMAGE_COOLDOWN_MS) return false;
      lastDamageAt.current = now;
      const nextHealth = clamp(healthRef.current - amount, 0, MAX_HEALTH);
      healthRef.current = nextHealth;
      setHealth(nextHealth);
      if (showDamageFlashRef.current) {
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 110);
      }
      playExplosion();

      if (nextHealth <= 0) {
        endGame();
      }
      return true;
    },
    [endGame, playExplosion]
  );

  const resetGame = useCallback(async () => {
    await AsyncStorage.removeItem('paused');
    await AsyncStorage.removeItem('savedScore');
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    powerUpsRef.current = [];
    scoreRef.current = 0;
    healthRef.current = MAX_HEALTH;
    playerXRef.current = width / 2 - PLAYER_WIDTH / 2;
    playerYRef.current = height - PLAYER_HEIGHT - 50;
    lastShotAt.current = 0;
    enemySpawnTimer.current = 0;
    powerUpSpawnTimer.current = 0;
    lastDamageAt.current = 0;
    gameOverRef.current = false;
    pausedRef.current = false;
    isTouching.current = false;
    setPlayerX(playerXRef.current);
    setPlayerY(playerYRef.current);
    setBullets([]);
    setEnemyBullets([]);
    setEnemies([]);
    setPowerUps([]);
    setExplosions([]);
    setScore(0);
    setHealth(MAX_HEALTH);
    setGameOver(false);
    setPaused(false);
    await syncSettings();
  }, [syncSettings]);

  useEffect(() => {
    const loadSounds = async () => {
      try {
        shootSound.current = new Audio.Sound();
        explosionSound.current = new Audio.Sound();
        backgroundMusic.current = new Audio.Sound();

        await Promise.all([
          shootSound.current.loadAsync(require('../assets/sounds/shoot.wav')),
          explosionSound.current.loadAsync(require('../assets/sounds/explosion.wav')),
          backgroundMusic.current.loadAsync(require('../assets/sounds/background.mp3')),
        ]);
        await backgroundMusic.current.setIsLoopingAsync(true);
        soundsLoaded.current = true;
        await syncSettings();
      } catch (error) {
        console.warn('Sound loading error:', error);
      }
    };

    loadSounds();

    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      shootSound.current?.unloadAsync();
      explosionSound.current?.unloadAsync();
      backgroundMusic.current?.unloadAsync();
    };
  }, [syncSettings]);

  useEffect(() => {
    const focus = navigation.addListener('focus', async () => {
      gameFocused.current = true;
      const [isPaused, savedScore] = await Promise.all([
        AsyncStorage.getItem('paused'),
        AsyncStorage.getItem('savedScore'),
      ]);
      await syncSettings();

      if (scoreRef.current === 0 && savedScore !== null) {
        const restoredScore = parseInt(savedScore, 10) || 0;
        scoreRef.current = restoredScore;
        setScore(restoredScore);
      } else if (score === null) {
        setScore(0);
      }

      pausedRef.current = false;
      setPaused(false);
      if (isPaused !== 'true') {
        await AsyncStorage.removeItem('paused');
      }
    });

    const blur = navigation.addListener('blur', () => {
      gameFocused.current = false;
      stopMusic();
    });

    return () => {
      focus();
      blur();
    };
  }, [navigation, score, stopMusic, syncSettings]);

  useEffect(() => {
    const beforeRemove = navigation.addListener('beforeRemove', async () => {
      if (!gameOverRef.current) {
        await AsyncStorage.setItem('paused', 'true');
        await AsyncStorage.setItem('savedScore', scoreRef.current.toString());
      }
      await stopMusic();
    });

    return beforeRemove;
  }, [navigation, stopMusic]);

  useEffect(() => {
    shieldActiveRef.current = shieldActive;
  }, [shieldActive]);

  useEffect(() => {
    doubleShotActiveRef.current = doubleShotActive;
  }, [doubleShotActive]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExplosions((prev) => prev.slice(-6).filter((explosion) => Date.now() - explosion.createdAt < 700));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      if (lastFrameAt.current === null) lastFrameAt.current = now;
      const dt = Math.min((now - lastFrameAt.current) / 1000, 0.035);
      lastFrameAt.current = now;

      if (!pausedRef.current && !gameOverRef.current) {
        const config = difficultyConfig[difficultyRef.current];

        if (isTouching.current && now - lastShotAt.current >= fireRateMs[fireRateRef.current]) {
          const centerX = playerXRef.current + PLAYER_WIDTH / 2;
          const y = playerYRef.current - 8;
          const nextBullets = doubleShotActiveRef.current
            ? [
                { id: uniqueId(), x: centerX - 15, y },
                { id: uniqueId(), x: centerX + 15 - BULLET_WIDTH, y },
              ]
            : [{ id: uniqueId(), x: centerX - BULLET_WIDTH / 2, y }];

          bulletsRef.current = [...bulletsRef.current, ...nextBullets];
          lastShotAt.current = now;
          if (soundEnabledRef.current && soundsLoaded.current) {
            shootSound.current?.replayAsync().catch(console.warn);
          }
        }

        enemySpawnTimer.current += now - (lastFrameAt.current - dt * 1000);
        if (enemySpawnTimer.current >= config.spawnMs) {
          enemySpawnTimer.current = 0;
          enemiesRef.current = [
            ...enemiesRef.current,
            {
              id: uniqueId(),
              x: Math.random() * (width - ENEMY_WIDTH),
              y: -ENEMY_HEIGHT,
              shootTimer: Math.random() * config.enemyFireMs * 0.6,
            },
          ];
        }

        powerUpSpawnTimer.current += now - (lastFrameAt.current - dt * 1000);
        if (powerUpSpawnTimer.current >= 6000) {
          powerUpSpawnTimer.current = 0;
          if (Math.random() < 0.55) {
            powerUpsRef.current = [
              ...powerUpsRef.current,
              {
                id: uniqueId(),
                x: Math.random() * (width - 40),
                y: -40,
                type: Math.random() < 0.5 ? 'shield' : 'double',
              },
            ];
          }
        }

        bulletsRef.current = bulletsRef.current
          .map((bullet) => ({ ...bullet, y: bullet.y - PLAYER_BULLET_SPEED * dt }))
          .filter((bullet) => bullet.y > -BULLET_HEIGHT);

        enemyBulletsRef.current = enemyBulletsRef.current
          .map((bullet) => ({ ...bullet, y: bullet.y + ENEMY_BULLET_SPEED * dt }))
          .filter((bullet) => bullet.y < height + BULLET_HEIGHT);

        powerUpsRef.current = powerUpsRef.current
          .map((powerUp) => ({ ...powerUp, y: powerUp.y + POWER_UP_SPEED * dt }))
          .filter((powerUp) => powerUp.y < height + 40);

        const nextEnemyBullets = [...enemyBulletsRef.current];
        enemiesRef.current = enemiesRef.current
          .map((enemy) => {
            const shootTimer = enemy.shootTimer + dt * 1000;
            if (shootTimer >= config.enemyFireMs) {
              nextEnemyBullets.push({
                id: uniqueId(),
                x: enemy.x + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2,
                y: enemy.y + ENEMY_HEIGHT,
              });
              return { ...enemy, y: enemy.y + config.enemySpeed * dt, shootTimer: 0 };
            }
            return { ...enemy, y: enemy.y + config.enemySpeed * dt, shootTimer };
          })
          .filter((enemy) => enemy.y < height + ENEMY_HEIGHT);
        enemyBulletsRef.current = nextEnemyBullets;

        const remainingBullets: Bullet[] = [];
        const remainingEnemies: Enemy[] = [];

        for (const enemy of enemiesRef.current) {
          const hitBullet = bulletsRef.current.find((bullet) =>
            overlaps(
              { x: bullet.x, y: bullet.y, width: BULLET_WIDTH, height: BULLET_HEIGHT },
              { x: enemy.x, y: enemy.y, width: ENEMY_WIDTH, height: ENEMY_HEIGHT }
            )
          );

          if (hitBullet) {
            bulletsRef.current = bulletsRef.current.filter((bullet) => bullet.id !== hitBullet.id);
            scoreRef.current += 10;
            setExplosions((prev) => [...prev, { id: uniqueId(), x: enemy.x, y: enemy.y, createdAt: Date.now() }]);
            playExplosion();
          } else {
            remainingEnemies.push(enemy);
          }
        }

        for (const bullet of bulletsRef.current) {
          if (!remainingBullets.some((remaining) => remaining.id === bullet.id)) {
            remainingBullets.push(bullet);
          }
        }

        enemiesRef.current = remainingEnemies;
        bulletsRef.current = remainingBullets;

        const playerBox = {
          x: playerXRef.current + 8,
          y: playerYRef.current + 8,
          width: PLAYER_WIDTH - 16,
          height: PLAYER_HEIGHT - 16,
        };

        enemiesRef.current = enemiesRef.current.filter((enemy) => {
          const hit = overlaps(playerBox, {
            x: enemy.x + 4,
            y: enemy.y + 4,
            width: ENEMY_WIDTH - 8,
            height: ENEMY_HEIGHT - 8,
          });
          if (hit) {
            damagePlayer(config.collisionDamage, now);
            setExplosions((prev) => [
              ...prev,
              { id: uniqueId(), x: enemy.x, y: enemy.y, createdAt: Date.now() },
            ]);
          }
          return !hit;
        });

        enemyBulletsRef.current = enemyBulletsRef.current.filter((bullet) => {
          const hit = overlaps(playerBox, {
            x: bullet.x,
            y: bullet.y,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
          });
          if (hit) {
            damagePlayer(config.bulletDamage, now);
          }
          return !hit;
        });

        powerUpsRef.current = powerUpsRef.current.filter((powerUp) => {
          const pickedUp = overlaps(playerBox, { x: powerUp.x, y: powerUp.y, width: 40, height: 40 });
          if (pickedUp) {
            if (powerUp.type === 'shield') {
              setShieldActive(true);
              setTimeout(() => setShieldActive(false), 10000);
            } else {
              setDoubleShotActive(true);
              setTimeout(() => setDoubleShotActive(false), 10000);
            }
          }
          return !pickedUp;
        });

        setBullets([...bulletsRef.current]);
        setEnemyBullets([...enemyBulletsRef.current]);
        setEnemies([...enemiesRef.current]);
        setPowerUps([...powerUpsRef.current]);
        setScore(scoreRef.current);
      }

      animationFrame.current = requestAnimationFrame(tick);
    };

    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    };
  }, [damagePlayer, playExplosion]);

  const movePlayer = (x: number, y: number) => {
    const clampedX = clamp(x - PLAYER_WIDTH / 2, 0, width - PLAYER_WIDTH);
    const clampedY = clamp(y - PLAYER_HEIGHT / 2, 90, height - PLAYER_HEIGHT - 8);
    playerXRef.current = clampedX;
    playerYRef.current = clampedY;
    setPlayerX(clampedX);
    setPlayerY(clampedY);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
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
      onPanResponderTerminate: () => {
        isTouching.current = false;
      },
    })
  ).current;

  if (score === null) return null;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.starsOne} pointerEvents="none" />
      <View style={styles.starsTwo} pointerEvents="none" />
      <TouchableOpacity
        style={styles.pauseBtn}
        onPress={async () => {
          pausedRef.current = true;
          setPaused(true);
          isTouching.current = false;
          await stopMusic();
          await AsyncStorage.setItem('paused', 'true');
          await AsyncStorage.setItem('savedScore', scoreRef.current.toString());
          navigation.navigate('Menu');
        }}
      >
        <Text style={styles.pauseText}>Pause</Text>
      </TouchableOpacity>

      <View style={styles.hud}>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.modeText}>{difficulty.toUpperCase()} | {fireRate.toUpperCase()}</Text>
        <View style={styles.lifeFrame}>
          <View style={[styles.lifeFill, { width: `${health}%` }]} />
        </View>
      </View>

      <Image source={require('../assets/play/player.png')} style={[styles.player, { left: playerX, top: playerY }]} />
      {shieldActive && (
        <View
          style={[
            styles.shield,
            { left: playerX - 10, top: playerY - 10 },
          ]}
        />
      )}
      {bullets.map((bullet) => (
        <View key={bullet.id} style={[styles.bullet, { left: bullet.x, top: bullet.y }]} />
      ))}
      {enemyBullets.map((bullet) => (
        <View key={bullet.id} style={[styles.enemyBullet, { left: bullet.x, top: bullet.y }]} />
      ))}
      {powerUps.map((powerUp) => (
        <Image
          key={powerUp.id}
          source={
            powerUp.type === 'shield'
              ? require('../assets/powerups/shield.png')
              : require('../assets/powerups/double.png')
          }
          style={[styles.powerUp, { left: powerUp.x, top: powerUp.y }]}
        />
      ))}
      {enemies.map((enemy) => (
        <Image
          key={enemy.id}
          source={require('../assets/play/enemy.png')}
          style={[styles.enemy, { left: enemy.x, top: enemy.y }]}
        />
      ))}
      {explosions.map((explosion) => (
        <LottieView
          key={explosion.id.toString()}
          source={require('../assets/play/explosionn.json')}
          autoPlay
          loop={false}
          style={[styles.explosion, { left: explosion.x - 15, top: explosion.y - 15 }]}
        />
      ))}

      {paused && <Text style={styles.pausedText}>Paused</Text>}
      {damageFlash && <View pointerEvents="none" style={styles.damageFlash} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040d',
    overflow: 'hidden',
  },
  starsOne: {
    position: 'absolute',
    width: 2,
    height: 2,
    top: 80,
    left: 30,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowRadius: 4,
    shadowOpacity: 0.8,
    elevation: 2,
  },
  starsTwo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderColor: 'rgba(67, 179, 255, 0.16)',
    borderLeftWidth: 18,
    borderRightWidth: 18,
  },
  hud: {
    position: 'absolute',
    top: 34,
    left: 16,
    right: 96,
    zIndex: 20,
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modeText: {
    marginTop: 2,
    color: '#9fd8ff',
    fontSize: 11,
    fontWeight: '700',
  },
  lifeFrame: {
    marginTop: 8,
    height: 12,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lifeFill: {
    height: '100%',
    backgroundColor: '#2af598',
  },
  pauseBtn: {
    position: 'absolute',
    top: 36,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(16, 23, 38, 0.82)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 30,
  },
  pauseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  player: {
    position: 'absolute',
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    resizeMode: 'contain',
    zIndex: 10,
  },
  shield: {
    position: 'absolute',
    width: PLAYER_WIDTH + 20,
    height: PLAYER_HEIGHT + 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'cyan',
    backgroundColor: 'rgba(0,255,255,0.1)',
    zIndex: 9,
  },
  bullet: {
    position: 'absolute',
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    shadowColor: '#ff3b30',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    zIndex: 7,
  },
  enemyBullet: {
    position: 'absolute',
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    borderRadius: 4,
    backgroundColor: '#ffe45c',
    shadowColor: '#ffe45c',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    zIndex: 7,
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    resizeMode: 'contain',
    zIndex: 6,
  },
  powerUp: {
    position: 'absolute',
    width: 40,
    height: 40,
    resizeMode: 'contain',
    zIndex: 8,
  },
  explosion: {
    position: 'absolute',
    width: 80,
    height: 80,
    zIndex: 40,
  },
  pausedText: {
    position: 'absolute',
    top: height / 2 - 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    zIndex: 50,
  },
  damageFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 30, 48, 0.2)',
    zIndex: 45,
  },
});
