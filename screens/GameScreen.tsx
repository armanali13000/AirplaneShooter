import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Audio,
} from 'expo-av';
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
const SAVED_GAME_KEY = 'savedGameState';
const HIGH_SCORE_KEY = 'highScore';

type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard';
type FireRate = 'steady' | 'fast' | 'rapid';
type Bullet = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number; shootTimer: number };
type EnemyBullet = { id: number; x: number; y: number };
type Explosion = { id: number; x: number; y: number; createdAt: number };
type PowerUp = { id: number; x: number; y: number; type: 'shield' | 'double' | 'health' };
type SoundRef = Audio.Sound;
type SavedGameState = {
  playerX: number;
  playerY: number;
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  score: number;
  health: number;
  shieldActive: boolean;
  doubleShotActive: boolean;
  difficulty: Difficulty;
  fireRate: FireRate;
  enemySpawnTimer: number;
  powerUpSpawnTimer: number;
};

let globalId = 0;
const uniqueId = () => globalId++;

const difficultyConfig: Record<
  Difficulty,
  { label: string; enemySpeed: number; spawnMs: number; enemyFireMs: number; bulletDamage: number; collisionDamage: number }
> = {
  easy: { label: 'Easy', enemySpeed: 165, spawnMs: 1750, enemyFireMs: 1700, bulletDamage: 16, collisionDamage: 26 },
  medium: { label: 'Medium', enemySpeed: 225, spawnMs: 1350, enemyFireMs: 1300, bulletDamage: 24, collisionDamage: 34 },
  hard: { label: 'Hard', enemySpeed: 295, spawnMs: 1050, enemyFireMs: 980, bulletDamage: 31, collisionDamage: 43 },
  veryHard: { label: 'Very Hard', enemySpeed: 370, spawnMs: 820, enemyFireMs: 760, bulletDamage: 39, collisionDamage: 54 },
};

const fireRateMs: Record<FireRate, number> = {
  steady: 300,
  fast: 230,
  rapid: 170,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const toVolume = (value: string | null, fallback: number) => {
  const parsed = value === null ? fallback : Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, 0, 1) : fallback;
};

const normalizeDifficulty = (value: string | null): Difficulty => {
  if (value === 'easy' || value === 'hard' || value === 'veryHard') return value;
  return 'medium';
};

const normalizeFireRate = (value: string | null): FireRate => {
  if (value === 'steady' || value === 'rapid') return value;
  return 'fast';
};

const lifeColor = (health: number) => {
  if (health > 55) return '#2af598';
  if (health > 25) return '#ffd166';
  return '#ff3b48';
};

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

export default function GameScreen({ navigation, route }: any) {
  const [playerX, setPlayerX] = useState(width / 2 - PLAYER_WIDTH / 2);
  const [playerY, setPlayerY] = useState(height - PLAYER_HEIGHT - 50);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [shieldActive, setShieldActive] = useState(false);
  const [doubleShotActive, setDoubleShotActive] = useState(false);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [fireRate, setFireRate] = useState<FireRate>('fast');
  const [damageFlash, setDamageFlash] = useState(false);
  const [paused, setPaused] = useState(false);

  const playerXRef = useRef(playerX);
  const playerYRef = useRef(playerY);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<EnemyBullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const healthRef = useRef(MAX_HEALTH);
  const isTouching = useRef(false);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const musicEnabledRef = useRef(true);
  const musicVolumeRef = useRef(0.95);
  const soundVolumeRef = useRef(0.9);
  const shieldActiveRef = useRef(false);
  const doubleShotActiveRef = useRef(false);
  const difficultyRef = useRef<Difficulty>('medium');
  const fireRateRef = useRef<FireRate>('fast');
  const showDamageFlashRef = useRef(true);
  const lastFrameAt = useRef<number | null>(null);
  const lastShotAt = useRef(0);
  const enemySpawnTimer = useRef(0);
  const powerUpSpawnTimer = useRef(0);
  const lastDamageAt = useRef(0);
  const animationFrame = useRef<number | null>(null);
  const gameFocused = useRef(false);

  const backgroundMusic = useRef<SoundRef | null>(null);
  const shootPlayers = useRef<SoundRef[]>([]);
  const explosionPlayers = useRef<SoundRef[]>([]);
  const shootPlayerIndex = useRef(0);
  const explosionPlayerIndex = useRef(0);

  const applyState = (state: SavedGameState) => {
    playerXRef.current = state.playerX;
    playerYRef.current = state.playerY;
    bulletsRef.current = state.bullets;
    enemyBulletsRef.current = state.enemyBullets;
    enemiesRef.current = state.enemies;
    powerUpsRef.current = state.powerUps;
    scoreRef.current = state.score;
    healthRef.current = state.health;
    shieldActiveRef.current = state.shieldActive;
    doubleShotActiveRef.current = state.doubleShotActive;
    difficultyRef.current = state.difficulty;
    fireRateRef.current = state.fireRate;
    enemySpawnTimer.current = state.enemySpawnTimer;
    powerUpSpawnTimer.current = state.powerUpSpawnTimer;

    setPlayerX(state.playerX);
    setPlayerY(state.playerY);
    setBullets([...state.bullets]);
    setEnemyBullets([...state.enemyBullets]);
    setEnemies([...state.enemies]);
    setPowerUps([...state.powerUps]);
    setScore(state.score);
    setHealth(state.health);
    setShieldActive(state.shieldActive);
    setDoubleShotActive(state.doubleShotActive);
    setDifficulty(state.difficulty);
    setFireRate(state.fireRate);
  };

  const getSnapshot = (): SavedGameState => ({
    playerX: playerXRef.current,
    playerY: playerYRef.current,
    bullets: bulletsRef.current,
    enemyBullets: enemyBulletsRef.current,
    enemies: enemiesRef.current,
    powerUps: powerUpsRef.current,
    score: scoreRef.current,
    health: healthRef.current,
    shieldActive: shieldActiveRef.current,
    doubleShotActive: doubleShotActiveRef.current,
    difficulty: difficultyRef.current,
    fireRate: fireRateRef.current,
    enemySpawnTimer: enemySpawnTimer.current,
    powerUpSpawnTimer: powerUpSpawnTimer.current,
  });

  const savePausedGame = useCallback(async () => {
    await AsyncStorage.multiSet([
      ['paused', 'true'],
      ['savedScore', scoreRef.current.toString()],
      [SAVED_GAME_KEY, JSON.stringify(getSnapshot())],
    ]);
  }, []);

  const stopMusic = useCallback(() => {
    backgroundMusic.current?.pauseAsync().catch(() => undefined);
  }, []);

  const playMusicIfAllowed = useCallback(() => {
    const player = backgroundMusic.current;
    if (!player) return;
    player.setVolumeAsync(musicVolumeRef.current).catch(() => undefined);
    if (gameFocused.current && musicVolumeRef.current > 0 && !pausedRef.current && !gameOverRef.current) {
      player.playAsync().catch(() => undefined);
    } else {
      player.pauseAsync().catch(() => undefined);
    }
  }, []);

  const playPooledSound = useCallback((players: SoundRef[], indexRef: React.MutableRefObject<number>) => {
    if (soundVolumeRef.current <= 0 || players.length === 0) return;
    const player = players[indexRef.current % players.length];
    indexRef.current += 1;
    player.setVolumeAsync(soundVolumeRef.current)
      .then(() => player.replayAsync())
      .catch(() => undefined);
  }, []);

  const playShoot = useCallback(() => {
    playPooledSound(shootPlayers.current, shootPlayerIndex);
  }, [playPooledSound]);

  const playExplosion = useCallback(() => {
    playPooledSound(explosionPlayers.current, explosionPlayerIndex);
  }, [playPooledSound]);

  const syncSettings = useCallback(async () => {
    const [
      savedDifficulty,
      savedFireRate,
      savedDamageFlash,
      savedMusicVolume,
      savedSoundVolume,
    ] = await Promise.all([
      AsyncStorage.getItem('difficulty'),
      AsyncStorage.getItem('fireRate'),
      AsyncStorage.getItem('showDamageFlash'),
      AsyncStorage.getItem('musicVolume'),
      AsyncStorage.getItem('soundVolume'),
    ]);

    const nextDifficulty = normalizeDifficulty(savedDifficulty);
    const nextFireRate = normalizeFireRate(savedFireRate);
    const nextMusicVolume = toVolume(savedMusicVolume, 0.95);
    const nextSoundVolume = toVolume(savedSoundVolume, 0.9);

    soundEnabledRef.current = nextSoundVolume > 0;
    musicEnabledRef.current = nextMusicVolume > 0;
    musicVolumeRef.current = nextMusicVolume;
    soundVolumeRef.current = nextSoundVolume;
    difficultyRef.current = nextDifficulty;
    fireRateRef.current = nextFireRate;
    showDamageFlashRef.current = savedDamageFlash === null || savedDamageFlash === 'true';
    setDifficulty(nextDifficulty);
    setFireRate(nextFireRate);
    shootPlayers.current.forEach((player) => {
      player.setVolumeAsync(nextSoundVolume).catch(() => undefined);
    });
    explosionPlayers.current.forEach((player) => {
      player.setVolumeAsync(nextSoundVolume).catch(() => undefined);
    });
    playMusicIfAllowed();
  }, [playMusicIfAllowed]);

  const loadHighScore = useCallback(async () => {
    const savedHighScore = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    const parsedHighScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
    const nextHighScore = Number.isFinite(parsedHighScore) ? parsedHighScore : 0;
    highScoreRef.current = nextHighScore;
    setHighScore(nextHighScore);
  }, []);

  const startFreshGame = useCallback(
    async (selectedDifficulty?: Difficulty) => {
      await AsyncStorage.multiRemove(['paused', 'savedScore', SAVED_GAME_KEY]);
      const nextDifficulty = selectedDifficulty ?? difficultyRef.current;
      bulletsRef.current = [];
      enemyBulletsRef.current = [];
      enemiesRef.current = [];
      powerUpsRef.current = [];
      scoreRef.current = 0;
      healthRef.current = MAX_HEALTH;
      playerXRef.current = width / 2 - PLAYER_WIDTH / 2;
      playerYRef.current = height - PLAYER_HEIGHT - 50;
      difficultyRef.current = nextDifficulty;
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
      setDifficulty(nextDifficulty);
      setGameOver(false);
      setPaused(false);
      setShieldActive(false);
      setDoubleShotActive(false);
      playMusicIfAllowed();
    },
    [playMusicIfAllowed]
  );

  const endGame = useCallback(async () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    isTouching.current = false;
    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(scoreRef.current);
      await AsyncStorage.setItem(HIGH_SCORE_KEY, scoreRef.current.toString());
    }
    await AsyncStorage.multiRemove(['paused', 'savedScore', SAVED_GAME_KEY]);
    stopMusic();
    playExplosion();
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

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        const music = await Audio.Sound.createAsync(
          require('../assets/sounds/background.mp3'),
          { isLooping: true, shouldPlay: false, volume: musicVolumeRef.current }
        );
        const shootPool = await Promise.all(
          Array.from({ length: 6 }, () =>
            Audio.Sound.createAsync(require('../assets/sounds/shoot.wav'), { volume: soundVolumeRef.current })
          )
        );
        const explosionPool = await Promise.all(
          Array.from({ length: 5 }, () =>
            Audio.Sound.createAsync(require('../assets/sounds/explosion.wav'), { volume: soundVolumeRef.current })
          )
        );
        backgroundMusic.current = music.sound;
        shootPlayers.current = shootPool.map((item) => item.sound);
        explosionPlayers.current = explosionPool.map((item) => item.sound);
        await syncSettings();
        await loadHighScore();
      } catch (error) {
        console.warn('Audio setup error:', error);
      }
    };

    setupAudio();
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      backgroundMusic.current?.unloadAsync();
      shootPlayers.current.forEach((player) => player.unloadAsync());
      explosionPlayers.current.forEach((player) => player.unloadAsync());
    };
  }, [loadHighScore, syncSettings]);

  useEffect(() => {
    const focus = navigation.addListener('focus', async () => {
      gameFocused.current = true;
      const [isPaused, savedState, selectedDifficulty] = await Promise.all([
        AsyncStorage.getItem('paused'),
        AsyncStorage.getItem(SAVED_GAME_KEY),
        AsyncStorage.getItem('selectedDifficulty'),
      ]);
      await syncSettings();
      await loadHighScore();

      const routeWantsNewGame = Boolean(route?.params?.newGame);
      if (routeWantsNewGame) {
        await startFreshGame(normalizeDifficulty(selectedDifficulty));
        navigation.setParams({ newGame: undefined });
        return;
      }

      if (isPaused === 'true' && savedState) {
        try {
          const parsed = JSON.parse(savedState) as SavedGameState;
          applyState(parsed);
          await AsyncStorage.removeItem('paused');
        } catch {
          await startFreshGame();
        }
      } else if (scoreRef.current === 0 && score === null) {
        setScore(0);
      }

      pausedRef.current = false;
      setPaused(false);
      gameOverRef.current = false;
      playMusicIfAllowed();
    });

    const blur = navigation.addListener('blur', () => {
      gameFocused.current = false;
      stopMusic();
    });

    return () => {
      focus();
      blur();
    };
  }, [loadHighScore, navigation, playMusicIfAllowed, route?.params?.newGame, score, startFreshGame, stopMusic, syncSettings]);

  useEffect(() => {
    const beforeRemove = navigation.addListener('beforeRemove', async () => {
      if (!gameOverRef.current && scoreRef.current > 0) {
        await savePausedGame();
      }
      stopMusic();
    });

    return beforeRemove;
  }, [navigation, savePausedGame, stopMusic]);

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
          playShoot();
        }

        enemySpawnTimer.current += dt * 1000;
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

        powerUpSpawnTimer.current += dt * 1000;
        if (powerUpSpawnTimer.current >= 5200) {
          powerUpSpawnTimer.current = 0;
          if (Math.random() < 0.65) {
            const roll = Math.random();
            const type: PowerUp['type'] = healthRef.current < MAX_HEALTH && roll < 0.38
              ? 'health'
              : roll < 0.69
                ? 'shield'
                : 'double';
            powerUpsRef.current = [
              ...powerUpsRef.current,
              {
                id: uniqueId(),
                x: Math.random() * (width - 40),
                y: -40,
                type,
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
        enemiesRef.current = remainingEnemies;

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
            } else if (powerUp.type === 'double') {
              setDoubleShotActive(true);
              setTimeout(() => setDoubleShotActive(false), 10000);
            } else {
              const healed = clamp(healthRef.current + 25, 0, MAX_HEALTH);
              healthRef.current = healed;
              setHealth(healed);
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
  }, [damagePlayer, playExplosion, playShoot]);

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
      <Pressable
        style={styles.pauseBtn}
        onPress={async () => {
          pausedRef.current = true;
          setPaused(true);
          isTouching.current = false;
          stopMusic();
          await savePausedGame();
          navigation.navigate('Menu');
        }}
      >
        <Text style={styles.pauseText}>⏸ Pause</Text>
      </Pressable>

      <View style={styles.hud}>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.modeText}>{difficultyConfig[difficulty].label.toUpperCase()} | {fireRate.toUpperCase()}</Text>
        <View style={styles.lifeFrame}>
          <View style={[styles.lifeFill, { width: `${health}%`, backgroundColor: lifeColor(health) }]} />
        </View>
      </View>

      <Image source={require('../assets/play/player.png')} style={[styles.player, { left: playerX, top: playerY }]} />
      {shieldActive && (
        <View style={[styles.shield, { left: playerX - 10, top: playerY - 10 }]} />
      )}
      {bullets.map((bullet) => (
        <View key={bullet.id} style={[styles.bullet, { left: bullet.x, top: bullet.y }]} />
      ))}
      {enemyBullets.map((bullet) => (
        <View key={bullet.id} style={[styles.enemyBullet, { left: bullet.x, top: bullet.y }]} />
      ))}
      {powerUps.map((powerUp) =>
        powerUp.type === 'health' ? (
          <Text key={powerUp.id} style={[styles.healthPower, { left: powerUp.x, top: powerUp.y }]}>♥</Text>
        ) : (
          <Image
            key={powerUp.id}
            source={
              powerUp.type === 'shield'
                ? require('../assets/powerups/shield.png')
                : require('../assets/powerups/double.png')
            }
            style={[styles.powerUp, { left: powerUp.x, top: powerUp.y }]}
          />
        )
      )}
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

      {gameOver && (
        <View style={styles.gameOverOverlay} pointerEvents="auto">
          <View style={styles.gameOverPanel}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverScore}>Score {scoreRef.current}</Text>
            <Text style={styles.gameOverHighScore}>High Score {highScore}</Text>
            <Pressable style={styles.goldButton} onPress={() => startFreshGame(difficultyRef.current)}>
              <Text style={styles.goldButtonText}>🔄 Restart</Text>
            </Pressable>
            <Pressable style={styles.darkButton} onPress={() => navigation.navigate('Menu')}>
              <Text style={styles.darkButtonText}>⬅️ Back</Text>
            </Pressable>
          </View>
        </View>
      )}
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
    right: 118,
    zIndex: 20,
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modeText: {
    marginTop: 2,
    color: '#ffd166',
    fontSize: 11,
    fontWeight: '800',
  },
  lifeFrame: {
    marginTop: 8,
    height: 13,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lifeFill: {
    height: '100%',
    borderRadius: 8,
  },
  pauseBtn: {
    position: 'absolute',
    top: 36,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 23, 38, 0.86)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    zIndex: 30,
  },
  pauseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
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
  healthPower: {
    position: 'absolute',
    width: 40,
    height: 40,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#ff2244',
    fontSize: 34,
    fontWeight: '900',
    zIndex: 8,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowRadius: 5,
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
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.68)',
    zIndex: 80,
  },
  gameOverPanel: {
    width: '100%',
    maxWidth: 360,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 102, 0.55)',
    backgroundColor: 'rgba(8, 13, 24, 0.96)',
  },
  gameOverTitle: {
    color: '#ffd166',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  gameOverScore: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  gameOverHighScore: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  goldButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#ffd166',
    marginTop: 10,
  },
  goldButtonText: {
    color: '#15100a',
    fontSize: 18,
    fontWeight: '900',
  },
  darkButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 10,
  },
  darkButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
