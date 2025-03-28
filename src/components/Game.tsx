'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Player } from '@/game/Player';
import { Enemy, EnemyType } from '@/game/Enemy';
import { Bullet } from '@/game/Bullet';
import { GameState } from '@/game/types';
import { PowerUp } from '@/game/PowerUp';
import { Particle } from '@/game/Particle';
import { Star } from '@/game/Star';
import { AudioManager } from '@/game/AudioManager';
import { ExplosionGIF } from '@/game/ExplosionGIF';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const INITIAL_HEALTH = 3;
const STAR_COUNT = 50;

// Mobile control constants
const MOBILE_CONTROL_HEIGHT = 120; // Height of mobile controls area

// Add utility functions for level persistence
const saveGameProgress = (level: number) => {
  try {
    localStorage.setItem('asteroidGameLevel', level.toString());
    console.log(`Saved game progress: level ${level}`);
  } catch (error) {
    console.error('Failed to save game progress:', error);
  }
};

// For loadGameProgress - we don't need to remove it since it might be useful later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loadGameProgress = (): number => {
  try {
    const savedLevel = localStorage.getItem('asteroidGameLevel');
    if (savedLevel) {
      const level = parseInt(savedLevel, 10);
      console.log(`Loaded saved game level: ${level}`);
      return level;
    }
  } catch (error) {
    console.error('Failed to load game progress:', error);
  }
  return 1; // Default to level 1
};

// New function to clear game progress
const clearGameProgress = () => {
  try {
    localStorage.removeItem('asteroidGameLevel');
    console.log('Cleared game progress');
  } catch (error) {
    console.error('Failed to clear game progress:', error);
  }
};

// Force clear localStorage on initial load to prevent issues
try {
  // Clear saved level when page first loads to avoid lingering state
  localStorage.removeItem('asteroidGameLevel');
  console.log('Cleared game progress on initial load');
} catch (error) {
  console.error('Failed to clear game progress on initial load:', error);
}

// At the top of the file, add a flag to track first load
const isFirstLoad = { current: true };

// Difficulty configuration
const getDifficultyConfig = (level: number) => {
  return {
    // Enemy counts and wave configuration
    baseEnemiesPerWave: level === 1 ? 5 : Math.min(15, 5 + Math.floor(level * 1.2)), // Start with 5, add ~1-2 per level
    maxWaves: Math.min(6, 1 + Math.floor(level / 1.5)), // Start with 1 wave, gradually increase
    waveDelay: Math.max(2000, 5000 - (level - 1) * 300), // Keep wave delay similar
    
    // Enemy attributes
    enemyHealthMultiplier: Math.min(3, 1 + Math.floor(level / 3)),
    enemySpeedMultiplier: 1 + (level - 1) * 0.08, // Slightly slower speed progression
    shooterProbability: Math.min(0.4, level === 1 ? 0.0 : (0.05 + (level - 1) * 0.05)), // No shooters in level 1
    tankProbability: Math.min(0.3, level <= 2 ? 0.0 : (0.05 + (level - 2) * 0.05)), // No tanks until level 3
    fastProbability: Math.min(0.3, level === 1 ? 0.0 : (0.05 + (level - 1) * 0.05)), // No fast enemies in level 1
    
    // Bullet and shooting dynamics
    bulletSpeedMultiplier: 1 + (level - 1) * 0.1,
    spreadShotLevel: Math.floor(level / 3),
    fireRateMultiplier: 1 + (level - 1) * 0.1,
    
    // Power-up dynamics
    powerUpChance: level === 1 ? 0.3 : Math.max(0.1, 0.2 - (level - 2) * 0.02), // More power-ups in early levels
    
    // Special mechanics
    divingEnemies: level > 2, // No diving enemies until level 3
    enemiesShootAngled: level > 3, // No angled shots until level 4
    formationComplexity: Math.min(5, Math.floor((level - 1) / 2)) // Level 1 has simplest formation (index 0)
  };
};

// First, let's add a LevelText component for animated level text
interface LevelTextProps {
  level: number;
  onComplete: () => void;
}

const LevelText: React.FC<LevelTextProps> = ({ level, onComplete }) => {
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Auto-hide after animation completes
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        onComplete();
      }
    }, 2000); // 2 seconds duration
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      clearTimeout(timeout);
      isMountedRef.current = false;
    };
  }, [level, onComplete]);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
      <div className="flex flex-col items-center">
        <h2 className="text-5xl md:text-6xl text-green-400 font-bold mb-4 animate-pulse">
          Level Complete!
        </h2>
        <div className="overflow-hidden">
          <div className="text-3xl md:text-4xl text-white animate-slideUp">
            Level {level} Starting
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const waveTimeoutRef = useRef<number | null>(null);
  const currentWaveRef = useRef<number>(0);
  const difficultyConfigRef = useRef(getDifficultyConfig(1));
  
  // Add the refs here, inside the component
  const gameJustStartedRef = useRef(true);
  const enableProgressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [gameState, setGameState] = useState<GameState>(() => {
    // IMPORTANT: Always start at level 1 for a brand new game
    console.log("Initializing a fresh game at level 1");
    return {
      score: 0,
      isGameOver: false,
      isPaused: false,
      health: INITIAL_HEALTH,
      victory: false,
      level: 1 // Always level 1 for a new game - never load from localStorage on first load
    };
  });
  const prevDirectionRef = useRef<'left' | 'right' | null>(null);
  const [soundVolume, setSoundVolume] = useState<number>(50);
  const [musicVolume, setMusicVolume] = useState<number>(30);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);
  const [canvasScale, setCanvasScale] = useState({ x: 1, y: 1 });
  const [isMobile, setIsMobile] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);
  const [isMovingUp, setIsMovingUp] = useState(false);
  const [isMovingDown, setIsMovingDown] = useState(false);
  const [showLevelText, setShowLevelText] = useState(false);
  const [gameOverFadeIn, setGameOverFadeIn] = useState(false);
  const gameOverTimeoutRef = useRef<number | null>(null);
  const levelProgressTimeoutRef = useRef<number | null>(null);

  // Update difficulty config when level changes
  useEffect(() => {
    difficultyConfigRef.current = getDifficultyConfig(gameState.level);
  }, [gameState.level]);

  // Update the initialization useEffect
  useEffect(() => {
    console.log("*** INITIAL COMPONENT MOUNT ***");
    
    // Forcefully clear any localStorage state
    try {
      localStorage.removeItem('asteroidGameLevel');
      console.log("Cleared localStorage on initial component mount");
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
    
    // Force game to start at level 1
    setGameState(prevState => {
      if (prevState.level !== 1) {
        console.log(`Forcing initial level to 1 (was ${prevState.level})`);
        return {
          ...prevState,
          level: 1
        };
      }
      return prevState;
    });
    
    // Mark the game as just started to prevent immediate level advancement
    gameJustStartedRef.current = true;
    
    // After 3 seconds, allow level progression
    const enableProgressionTimer = setTimeout(() => {
      console.log("Initial load cooldown complete - enabling level progression");
      gameJustStartedRef.current = false;
    }, 3000);
    
    // Store the enableProgressionTimer in the ref
    enableProgressionTimerRef.current = enableProgressionTimer;
    
    return () => {
      // Clean up the enableProgressionTimer
      clearTimeout(enableProgressionTimer);
    };
  }, []);

  // Immediately clear the localStorage on first load
  useEffect(() => {
    if (isFirstLoad.current) {
      console.log("FIRST LOAD: Clearing localStorage and forcing level 1");
      clearGameProgress();
      
      // Force level 1 explicitly
      setGameState(prev => ({
        ...prev,
        level: 1
      }));
      
      // Reset wave counter
      currentWaveRef.current = 0;
      
      // Mark first load complete
      isFirstLoad.current = false;
    }
  }, []);

  // Modify spawnEnemyWave to directly check level completion logic when the last wave is spawned
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spawnEnemyWave = useCallback((level: number, waveNumber: number, ctx: CanvasRenderingContext2D) => {
    const config = difficultyConfigRef.current;
    
    console.log(`Spawning wave ${waveNumber} of level ${level}, max waves: ${config.maxWaves}`);
    
    if (waveNumber >= config.maxWaves) {
      console.log(`No more waves for level ${level} (max: ${config.maxWaves})`);
      
      // Extra check: if we somehow got called with a wave number beyond max,
      // and there are no enemies, let's complete the level
      if (enemiesRef.current.length === 0 && !gameState.victory && !gameJustStartedRef.current) {
        console.log("Beyond max waves with no enemies - forcing level completion");
        handleLevelComplete(ctx, level + 1);
      }
      return; // No more waves for this level
    }

    // Always update the current wave reference to track wave progression
    currentWaveRef.current = waveNumber;
    
    const startRow = waveNumber;
    const enemiesInThisWave = config.baseEnemiesPerWave;
    
    // Define createFormation function inside to avoid dependencies
    const createFormation = (formation: string, enemyCount: number, startRow: number, level: number) => {
      // Create different formations based on chosen type
      switch (formation) {
        case 'linear':
          // Basic linear formation
          for (let col = 0; col < enemyCount; col++) {
            spawnEnemy(col, startRow, level, enemyCount);
          }
          break;
        
        case 'v-shape':
          // V formation
          for (let col = 0; col < enemyCount; col++) {
            const offset = Math.abs(col - enemyCount / 2) * 0.7;
            spawnEnemy(col, startRow + offset, level, enemyCount);
          }
          break;
        
        case 'arc':
          // Arc formation
          for (let col = 0; col < enemyCount; col++) {
            const angle = (col / (enemyCount - 1)) * Math.PI;
            const offsetY = Math.sin(angle) * 2;
            spawnEnemy(col, startRow + offsetY, level, enemyCount);
          }
          break;
        
        case 'zigzag':
          // Zigzag formation
          for (let col = 0; col < enemyCount; col++) {
            const offset = (col % 2) * 1.5;
            spawnEnemy(col, startRow + offset, level, enemyCount);
          }
          break;
        
        case 'diamond':
          // Diamond formation (for levels with more enemies)
          const diamondSize = Math.min(4, Math.floor(enemyCount / 3));
          let diamondIndex = 0;
          
          for (let row = 0; row < diamondSize * 2 - 1; row++) {
            const rowWidth = row < diamondSize 
              ? row + 1 
              : diamondSize * 2 - row - 1;
            
            for (let i = 0; i < rowWidth; i++) {
              if (diamondIndex < enemyCount) {
                const xOffset = (i - (rowWidth - 1) / 2) * 1.5;
                spawnEnemy(
                  (enemyCount / 2) + xOffset, 
                  startRow + row * 0.8,
                  level, 
                  enemyCount
                );
                diamondIndex++;
              }
            }
          }
          break;
        
        case 'random':
        default:
          // Completely random formation
          for (let col = 0; col < enemyCount; col++) {
            const randomX = Math.random() * 0.8 + 0.1; // 0.1 to 0.9
            const randomY = Math.random() * 1.5; 
            spawnEnemy(
              randomX * (enemyCount - 1), 
              startRow + randomY,
              level, 
              enemyCount
            );
          }
          break;
      }
      
      // Update enemy count
      setGameState(prev => {
        // Add a console log to debug
        console.log(`Adding enemies for level ${level}, count: ${enemyCount}`);
        return {
          ...prev
        };
      });
    };
    
    // Choose a random formation
    const formationTypes = [
      'linear',
      'v-shape',
      'arc',
      'zigzag',
      'diamond',
      'random'
    ];
    
    // Determine available formations based on level
    const availableFormations = formationTypes.slice(0, Math.min(formationTypes.length, 1 + Math.floor(level / 2)));
    
    // Generate a random formation for this wave, but ensure variety by not using the same formation twice in a row
    let formationType;
    if (currentWaveRef.current === 0) {
      // Use linear formation for the first wave on level 1 for easier start
      formationType = level === 1 ? 'linear' : availableFormations[Math.floor(Math.random() * availableFormations.length)];
    } else {
      formationType = availableFormations[Math.floor(Math.random() * availableFormations.length)];
    }
    
    const adjustedEnemyCount = waveNumber === 0 && level === 1 ? 5 : enemiesInThisWave;
    
    // Call createFormation with the appropriate parameters
    createFormation(formationType, adjustedEnemyCount, startRow, level);
    
    // After spawning this wave, check if it's the last wave
    // This is used for logging and in the conditional below
    const isLastWave = waveNumber >= config.maxWaves - 1;
    console.log(`Wave ${waveNumber + 1}/${config.maxWaves} - Is last wave: ${isLastWave}`);
    
    if (waveNumber < config.maxWaves - 1) {
      // Schedule next wave with level-adjusted delay
      console.log(`Scheduling next wave ${waveNumber + 1} for level ${level} with delay ${config.waveDelay}ms`);
      
      // Clear any existing wave timeout to prevent double scheduling
      if (waveTimeoutRef.current) {
        clearTimeout(waveTimeoutRef.current);
        waveTimeoutRef.current = null;
      }
      
      waveTimeoutRef.current = window.setTimeout(() => {
        console.log(`Starting next wave ${waveNumber + 1} for level ${level}`);
        spawnEnemyWave(level, waveNumber + 1, ctx);
      }, config.waveDelay);
    } else {
      console.log(`This was the last wave (${waveNumber}) for level ${level}, no more waves will be scheduled`);
      
      // If this is the last wave, start a timer to check if enemies are eliminated
      const checkLastWaveTimer = setTimeout(() => {
        if (enemiesRef.current.length === 0 && !gameState.victory) {
          console.log("Last wave timer: All enemies eliminated, completing level");
          handleLevelComplete(ctx, level + 1);
        }
      }, 2000); // Check after 2 seconds to give time for enemies to be killed
      
      // Clean up the timer if component unmounts
      return () => {
        clearTimeout(checkLastWaveTimer);
      };
    }
  }, []);  // Empty dependency array with eslint-disable above

  const spawnEnemy = (col: number, row: number, level: number, totalEnemies: number) => {
    const config = difficultyConfigRef.current;
    let type = EnemyType.BASIC;
    
    // Determine enemy type based on level and probabilities
    const random = Math.random();
    if (random < config.shooterProbability) {
      type = EnemyType.SHOOTER;
    } else if (random < config.shooterProbability + config.tankProbability) {
      type = EnemyType.TANK;
    } else if (random < config.shooterProbability + config.tankProbability + config.fastProbability) {
      type = EnemyType.FAST;
    }

    const enemy = new Enemy(
      80 + col * (GAME_WIDTH - 160) / (totalEnemies - 1),
      60 + row * 60,
      type,
      level
    );

    // Apply level-based adjustments to enemy
    enemy.health *= config.enemyHealthMultiplier;
    enemy.speed *= config.enemySpeedMultiplier;
    enemy.shootProbability *= config.fireRateMultiplier;
    enemy.dropPowerUpChance = config.powerUpChance;
    
    // Special diving behavior for certain enemies
    if (config.divingEnemies && Math.random() < 0.2) {
      enemy.diveAtPlayer = true;
    }

    enemiesRef.current.push(enemy);
  };

  // Add eslint-disable for initializeLevel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initializeLevel = useCallback((level: number, ctx: CanvasRenderingContext2D) => {
    console.log(`initializeLevel called for level: ${level}`);
    
    // Clear previous wave timeout if exists
    if (waveTimeoutRef.current) {
      console.log(`Clearing existing wave timeout for level ${level}`);
      clearTimeout(waveTimeoutRef.current);
      waveTimeoutRef.current = null;
    }
    
    // Reset wave counter
    currentWaveRef.current = 0;
    
    // Clear existing enemies and bullets
    enemiesRef.current = [];
    
    // Update difficulty config
    difficultyConfigRef.current = getDifficultyConfig(level);
    
    // Reset game state before spawning
    setGameState(prev => {
      console.log(`Resetting state before spawning level ${level}`);
      return {
        ...prev,
        victory: false
      };
    });
    
    // Wait for state update before spawning
    setTimeout(() => {
      // Spawn first wave
      console.log(`About to spawn first wave for level ${level}`);
      spawnEnemyWave(level, 0, ctx);
    }, 0);
  }, [spawnEnemyWave]);

  // Update the startNewGame function to set the "just started" flag
  const startNewGame = () => {
    console.log("=== STARTING COMPLETELY NEW GAME ===");
    
    // Mark the game as just started
    gameJustStartedRef.current = true;
    
    // Forcefully clear any localStorage state
    try {
      localStorage.removeItem('asteroidGameLevel');
      console.log("Cleared localStorage for a fresh start");
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
    
    // Clear all timeouts
    if (waveTimeoutRef.current) {
      clearTimeout(waveTimeoutRef.current);
      waveTimeoutRef.current = null;
      console.log("Cleared wave timeout");
    }
    
    if (levelProgressTimeoutRef.current) {
      clearTimeout(levelProgressTimeoutRef.current);
      levelProgressTimeoutRef.current = null;
      console.log("Cleared level progress timeout");
    }
    
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
      console.log("Cleared game over timeout");
    }
    
    // Clear all game objects
    enemiesRef.current = [];
    console.log("Cleared enemies array");
    
    // Reset all game state
    currentWaveRef.current = 0;
    prevDirectionRef.current = null;
    
    // Force difficulty config to level 1
    difficultyConfigRef.current = getDifficultyConfig(1);
    console.log("Reset difficulty to level 1");
    
    // Reset UI states
    setGameOverFadeIn(false);
    setShowLevelText(false);
    setIsShooting(false);
    setIsMovingLeft(false);
    setIsMovingRight(false);
    setIsMovingUp(false);
    setIsMovingDown(false);
    
    // Explicitly set state to level 1
    setGameState({
      score: 0,
      isGameOver: false,
      isPaused: false,
      health: INITIAL_HEALTH,
      victory: false,
      level: 1 // EXPLICITLY set to level 1
    });
    console.log("Reset game state with level = 1");
    
    // We need to wait for state updates to propagate
    setTimeout(() => {
      // Double-check that level is still 1
      if (gameState.level !== 1) {
        console.log(`WARNING: level somehow changed to ${gameState.level}, forcing back to 1`);
        setGameState(prev => ({
          ...prev,
          level: 1
        }));
      }
      
      // Get the current canvas context
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          console.log("Starting first wave of level 1");
          
          // Reset wave counter again to be safe
          currentWaveRef.current = 0;
          
          // Initialize level 1
          spawnEnemyWave(1, 0, ctx);
          
          console.log("New game initialized and level 1 wave 0 spawned");
          
          // After 3 seconds, allow level progression
          setTimeout(() => {
            console.log("Game initialization complete - enabling level progression");
            gameJustStartedRef.current = false;
          }, 3000);
        } else {
          console.error("Failed to get canvas context");
        }
      } else {
        console.error("Failed to get canvas reference");
      }
    }, 100); // Wait a bit for React state updates
  };

  // Reset game - kept for potential future use with additional reset logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetGame = useCallback(() => {
    // This wrapper function is maintained in case we need to add
    // more reset functionality in the future beyond startNewGame
    startNewGame();
  }, []);

  // Handle audio volume changes
  const handleSoundVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setSoundVolume(newVolume);
    AudioManager.getInstance().setSoundEffectsVolume(newVolume / 100);
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setMusicVolume(newVolume);
    AudioManager.getInstance().setMusicVolume(newVolume / 100);
  };

  const toggleSoundMute = () => {
    const newMuted = !isSoundMuted;
    setIsSoundMuted(newMuted);
    AudioManager.getInstance().setMute(newMuted);
  };

  const toggleMusicMute = () => {
    const newMuted = !isMusicMuted;
    setIsMusicMuted(newMuted);
    AudioManager.getInstance().setMusicMute(newMuted);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log(`*** MAIN GAME EFFECT INITIALIZING (Level: ${gameState.level}) ***`);
    console.log(`Game just started status: ${gameJustStartedRef.current ? 'YES' : 'no'}`);

    // Initialize AudioManager
    const audioManager = AudioManager.getInstance();
    
    // Play game start sound
    audioManager.play('gameStart');
    
    // Start background music
    audioManager.playBackgroundMusic();

    const player = new Player(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    const bullets: Bullet[] = [];
    const powerUps: PowerUp[] = [];
    const particles: Particle[] = [];
    const explosions: ExplosionGIF[] = [];
    const stars: Star[] = [];
    let animationFrameId: number;
    let lastShot = 0;
    let isGameOverSoundPlayed = false;

    // Initialize stars
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT
      ));
    }

    // Initialize first level
    console.log("Initializing first level of the game");
    if (waveTimeoutRef.current) {
      console.log("Clearing any existing wave timeouts before first level init");
      clearTimeout(waveTimeoutRef.current);
      waveTimeoutRef.current = null;
    }
    enemiesRef.current = []; // Ensure we're starting with an empty enemies array
    
    // Lock level progression during initialization
    gameJustStartedRef.current = true;
    console.log("LOCKED level progression during initialization");
    
    // Initialize the current level
    const initialLevel = gameState.level;
    console.log(`Starting game at level ${initialLevel}`);
    initializeLevel(initialLevel, ctx);

    // After 3 seconds, allow level progression
    const enableProgressionTimer = setTimeout(() => {
      console.log("Main effect initialization complete - enabling level progression");
      gameJustStartedRef.current = false;
    }, 3000);

    // Store the enableProgressionTimer in the ref
    enableProgressionTimerRef.current = enableProgressionTimer;

    const createExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
      }
    };

    const createGIFExplosion = (x: number, y: number, type: 'player' | 'regularEnemy' | 'tankEnemy') => {
      if (type === 'player') {
        explosions.push(ExplosionGIF.createForPlayer(x, y));
      } else if (type === 'tankEnemy') {
        explosions.push(ExplosionGIF.createForEnemy(x, y, EnemyType.TANK));
      } else {
        explosions.push(ExplosionGIF.createForEnemy(x, y));
      }
    };

    const handlePlayerMovement = () => {
      if (isMobile) {
        // Mobile touch controls
        if (isMovingLeft) player.moveLeft();
        if (isMovingRight) player.moveRight();
        if (isMovingUp) player.moveUp();
        if (isMovingDown) player.moveDown();
        
        // Auto-shooting on mobile when button is held
        if (isShooting && Date.now() - lastShot > player.fireRate) {
          const shot = player.shoot();
          if (Array.isArray(shot)) {
            bullets.push(...shot);
          } else {
            bullets.push(shot);
          }
          lastShot = Date.now();
          audioManager.play('playerShoot');
        }
      } else {
        // Keyboard controls for desktop
        if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) {
          player.moveLeft();
        }
        if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) {
          player.moveRight();
        }
        if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) {
          player.moveUp();
        }
        if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) {
          player.moveDown();
        }
        
        // Shooting with spacebar
        if (keysPressed.current.has('Space') && Date.now() - lastShot > player.fireRate) {
          const shot = player.shoot();
          if (Array.isArray(shot)) {
            bullets.push(...shot);
          } else {
            bullets.push(shot);
          }
          lastShot = Date.now();
          audioManager.play('playerShoot');
        }
      }
    };

    // Draw mobile controls if on mobile device
    const drawMobileControls = (ctx: CanvasRenderingContext2D) => {
      if (!isMobile) return;
      
      const controlHeight = MOBILE_CONTROL_HEIGHT;
      const controlY = GAME_HEIGHT - controlHeight;
      const controlWidth = GAME_WIDTH / 5;
      
      // Semi-transparent background for controls
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, controlY, GAME_WIDTH, controlHeight);
      
      // Draw control buttons
      const buttonSize = 60;
      const buttonY = controlY + (controlHeight - buttonSize) / 2;
      
      // Helper function to draw a button
      const drawButton = (x: number, text: string, isActive: boolean) => {
        const buttonX = x * controlWidth + (controlWidth - buttonSize) / 2;
        
        // Button background
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Button text
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, buttonX + buttonSize/2, buttonY + buttonSize/2);
      };
      
      // Draw each button
      drawButton(0, '←', isMovingLeft);
      drawButton(1, '↑', isMovingUp);
      drawButton(2, '↓', isMovingDown);
      drawButton(3, '→', isMovingRight);
      drawButton(4, '🔥', isShooting);
    };

    const gameLoop = () => {
      if (gameState.isPaused) {
        // Pause background music when game is paused
        audioManager.pauseBackgroundMusic();
        return;
      } else {
        // Resume background music when game is unpaused
        audioManager.resumeBackgroundMusic();
      }
      
      if (gameState.isGameOver) {
        // Play game over sound once
        if (!isGameOverSoundPlayed) {
          audioManager.play('gameOver');
          audioManager.pauseBackgroundMusic();
          isGameOverSoundPlayed = true;
        }
        return;
      }

      handlePlayerMovement();

      // Clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Update and draw stars
      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      // Update and draw player
      player.update();
      player.draw(ctx);

      // Update the checkForLevelCompletion function to be more reliable
      const checkForLevelCompletion = () => {
        // Skip all checks if the game just started
        if (gameJustStartedRef.current) {
          return;
        }
        
        // Only log when enemies are zero to avoid spam
        if (enemiesRef.current.length === 0) {
          logGameState("Level completion check - no enemies remaining");
        }
        
        // Direct check if level should be completed (no enemies and we're on the last wave)
        const isLastWaveComplete = currentWaveRef.current >= difficultyConfigRef.current.maxWaves - 1;
        
        // FORCE LEVEL COMPLETION if we've killed all enemies and there are no more waves coming
        if (
          enemiesRef.current.length === 0 && 
          !gameState.isPaused && 
          !gameState.isGameOver && 
          !gameState.victory &&
          !waveTimeoutRef.current && // No more waves are scheduled
          isLastWaveComplete && // This is the last wave
          !gameJustStartedRef.current // Game is not just starting
        ) {
          // Get the current context
          const canvas = canvasRef.current;
          if (canvas) {
            const currentCtx = canvas.getContext('2d');
            if (currentCtx) {
              // IMMEDIATE level completion if all conditions are met
              console.log("=== CRITICAL CHECK: Last wave with no enemies and no pending waves - FORCING level completion ===");
              const nextLevel = gameState.level + 1;
              handleLevelComplete(currentCtx, nextLevel);
              return; // Exit early - we've triggered level completion
            }
          }
        }
        
        // If there are no enemies and the game is not paused, in victory state, or game over
        if (
          enemiesRef.current.length === 0 && 
          !gameState.isPaused && 
          !gameState.isGameOver && 
          !gameState.victory &&
          !gameJustStartedRef.current // Game is not just starting
        ) {
          if (isLastWaveComplete) {
            // If we're on the last wave and all enemies are defeated, immediately complete the level
            console.log("Last wave complete with no enemies - immediately completing level");
            if (!gameState.victory) {
              const nextLevel = gameState.level + 1;
              // Get the current context
              const canvas = canvasRef.current;
              if (canvas) {
                const currentCtx = canvas.getContext('2d');
                if (currentCtx) {
                  handleLevelComplete(currentCtx, nextLevel);
                }
              }
            }
            return; // Skip the timeout logic
          }
        
          // If there's still a wave timeout, it means we're between waves
          if (waveTimeoutRef.current) {
            // Let the wave system handle it - more enemies will spawn soon
            console.log("No enemies, but wave timeout active - waiting for next wave");
          } else {
            // No enemies and no pending waves = level complete!
            console.log("All enemies defeated with no waves pending - starting completion timer");
            
            // Set a timer to force level completion after 1 second if not already triggered
            if (!levelProgressTimeoutRef.current && !gameJustStartedRef.current) {
              console.log("Setting level progression timer");
              levelProgressTimeoutRef.current = window.setTimeout(() => {
                console.log("Force advancing level via timer");
                const nextLevel = gameState.level + 1;
                
                // Only trigger if not already in victory state and not just started
                if (!gameState.victory && !gameJustStartedRef.current) {
                  console.log(`Advancing to level ${nextLevel}`);
                  // Get the current context
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const currentCtx = canvas.getContext('2d');
                    if (currentCtx) {
                      // Call the handleLevelComplete with the current context
                      handleLevelComplete(currentCtx, nextLevel);
                    }
                  }
                }
                
                levelProgressTimeoutRef.current = null;
              }, 1000); // Force level progression after 1 second of no enemies
            }
          }
        }
      };
      
      // Call the function
      checkForLevelCompletion();

      // Update and draw enemies
      enemiesRef.current.forEach((enemy) => {
        enemy.update();
        enemy.draw(ctx);
        
        if (enemy.canShoot()) {
          bullets.push(enemy.shoot());
        }
      });

      // Update and draw power-ups
      powerUps.forEach((powerUp, index) => {
        powerUp.update();
        powerUp.draw(ctx);

        if (powerUp.y > GAME_HEIGHT) {
          powerUps.splice(index, 1);
          return;
        }

        if (powerUp.checkCollision(player)) {
          player.activatePowerUp(powerUp.type);
          powerUps.splice(index, 1);
          createExplosion(powerUp.x, powerUp.y, powerUp.color);
        }
      });

      // Update and draw explosions
      for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        if (!explosions[i].isActive) {
          explosions.splice(i, 1);
          continue;
        }
      }

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update();
        if (particle.life <= 0) {
          const idx = particles.indexOf(particle);
          if (idx !== -1) particles.splice(idx, 1);
          return;
        }
        particle.draw(ctx);
      });

      // Update and draw bullets
      bullets.forEach((playerBullet, playerBulletIndex) => {
        playerBullet.update();
        playerBullet.draw(ctx);

        // Remove bullets that go off screen
        if (playerBullet.y < 0 || playerBullet.y > GAME_HEIGHT) {
          bullets.splice(playerBulletIndex, 1);
          return;
        }

        if (playerBullet.isEnemyBullet) {
          // Enemy bullet logic - check collision with player
          if (!player.invulnerable && !player.hasShield && playerBullet.checkCollision(player)) {
            bullets.splice(playerBulletIndex, 1);
            createExplosion(player.x + player.width / 2, player.y, '#ff0000');
            player.makeInvulnerable();
            // Play player damage sound
            audioManager.play('playerDamage');
            
            // Check if this hit will reduce health to zero
            const newHealth = gameState.health - 1;
            if (newHealth <= 0) {
              // Play explosion sound
              audioManager.play('playerExplode');
              
              // Create player explosion effect
              createGIFExplosion(
                player.x + player.width / 2,
                player.y + player.height / 2,
                'player'
              );
              
              // Set game over state immediately to show the text
              setGameState(prev => ({
                ...prev,
                health: prev.health - 1,
                isGameOver: true
              }));
              
              return; // Skip the normal setGameState call below
            }
            
            setGameState(prev => ({
              ...prev,
              health: prev.health - 1,
              isGameOver: prev.health <= 1
            }));
          }
        } else {
          // Player bullet logic
          
          // First check if player bullet hits any enemy bullets
          // This is the new part to check bullet-to-bullet collisions
          for (let enemyBulletIndex = bullets.length - 1; enemyBulletIndex >= 0; enemyBulletIndex--) {
            const enemyBullet = bullets[enemyBulletIndex];
            
            // Make sure we're checking a player bullet against an enemy bullet
            if (!playerBullet.isEnemyBullet && enemyBullet.isEnemyBullet) {
              // Check for collision
              if (checkBulletCollision(playerBullet, enemyBullet)) {
                // Create particle explosion based on enemy bullet color
                const bulletColor = enemyBullet.enemyType === EnemyType.BASIC 
                  ? '#FF8C00'  // Orange for carrot bullets
                  : '#00ff00'; // Green for other enemy bullets
                
                // Create particle explosion at collision point
                const collisionX = (playerBullet.x + enemyBullet.x) / 2;
                const collisionY = (playerBullet.y + enemyBullet.y) / 2;
                
                // Create more particles for a more visible effect
                for (let i = 0; i < 15; i++) {
                  particles.push(new Particle(collisionX, collisionY, bulletColor));
                }
                
                // Remove both bullets
                bullets.splice(enemyBulletIndex, 1);
                bullets.splice(playerBulletIndex, 1);
                
                // Play a sound effect
                audioManager.play('enemyExplode');
                
                // Award a small score bonus for shooting down an enemy bullet
                setGameState(prev => ({
                  ...prev,
                  score: prev.score + 10
                }));
                
                // Exit the loop since we've removed the player bullet
                return;
              }
            }
          }

          // Then check if player bullet hits any enemies (existing logic)
          for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const enemy = enemiesRef.current[i];
            if (playerBullet.checkCollision(enemy)) {
              bullets.splice(playerBulletIndex, 1);
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);

              if (enemy.hit()) {
                // Play enemy explosion sound
                audioManager.play('enemyExplode');
                
                // Show appropriate explosion GIF based on enemy type
                if (enemy.type === EnemyType.TANK) {
                  createGIFExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'tankEnemy');
                } else {
                  createGIFExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'regularEnemy');
                }
                
                const powerUp = enemy.dropPowerUp();
                if (powerUp) powerUps.push(powerUp);
                
                // Remove the enemy
                enemiesRef.current.splice(i, 1);
                
                // Award score and update state
                setGameState(prev => ({
                  ...prev,
                  score: prev.score + 100
                }));
                
                // Log enemy count (moved level completion check to main game loop)
                console.log(`Enemy killed. Enemies remaining: ${enemiesRef.current.length}`);
                
                break;
              }
            }
          }
        }
      });

      // Draw mobile controls if on mobile device
      drawMobileControls(ctx);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Handle keyboard input for desktop
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        return;
      }
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    // Add touch event handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      
      // Get canvas position
      const canvasRect = canvas.getBoundingClientRect();
      
      // Process each touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchX = touch.clientX - canvasRect.left;
        const touchY = touch.clientY - canvasRect.top;
        
        // Convert touch position based on canvas scale
        const x = (touchX - canvas.offsetLeft) / canvasScale.x;
        const y = (touchY - canvas.offsetTop) / canvasScale.y;
        
        // Check if touch is in the bottom control area
        if (y > GAME_HEIGHT - MOBILE_CONTROL_HEIGHT) {
          // Determine which control was pressed
          const controlWidth = GAME_WIDTH / 5;
          const controlIndex = Math.floor(x / controlWidth);
          
          // Set movement based on which control was touched
          switch (controlIndex) {
            case 0: // Left
              setIsMovingLeft(true);
              break;
            case 1: // Up
              setIsMovingUp(true);
              break;
            case 2: // Down
              setIsMovingDown(true);
              break;
            case 3: // Right
              setIsMovingRight(true);
              break;
            case 4: // Fire
              setIsShooting(true);
              break;
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      
      // Update touch position for continuous movement
      if (e.touches.length > 0) {
        const canvasRect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - canvasRect.left;
        const touchY = touch.clientY - canvasRect.top;
        
        // Convert touch position based on canvas scale
        const x = (touchX - canvas.offsetLeft) / canvasScale.x;
        const y = (touchY - canvas.offsetTop) / canvasScale.y;
        
        // Check if touch is in the bottom control area
        if (y > GAME_HEIGHT - MOBILE_CONTROL_HEIGHT) {
          // Determine which control was released
          const controlWidth = GAME_WIDTH / 5;
          const controlIndex = Math.floor(x / controlWidth);
          
          // Reset movement based on which control was released
          switch (controlIndex) {
            case 0: // Left
              setIsMovingLeft(false);
              break;
            case 1: // Up
              setIsMovingUp(false);
              break;
            case 2: // Down
              setIsMovingDown(false);
              break;
            case 3: // Right
              setIsMovingRight(false);
              break;
            case 4: // Fire
              setIsShooting(false);
              break;
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      
      // Process each touch that ended
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const canvasRect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - canvasRect.left;
        const touchY = touch.clientY - canvasRect.top;
        
        // Convert touch position based on canvas scale
        const x = (touchX - canvas.offsetLeft) / canvasScale.x;
        const y = (touchY - canvas.offsetTop) / canvasScale.y;
        
        // Check if touch is in the bottom control area
        if (y > GAME_HEIGHT - MOBILE_CONTROL_HEIGHT) {
          // Determine which control was released
          const controlWidth = GAME_WIDTH / 5;
          const controlIndex = Math.floor(x / controlWidth);
          
          // Reset movement based on which control was released
          switch (controlIndex) {
            case 0: // Left
              setIsMovingLeft(false);
              break;
            case 1: // Up
              setIsMovingUp(false);
              break;
            case 2: // Down
              setIsMovingDown(false);
              break;
            case 3: // Right
              setIsMovingRight(false);
              break;
            case 4: // Fire
              setIsShooting(false);
              break;
          }
        }
      }
    };

    // Register event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Register touch event handlers if on mobile
    if (isMobile) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    // Start the game loop
    gameLoop();
    initializeLevel(gameState.level, ctx);

    return () => {
      // Clean up event listeners
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Clean up touch event handlers
      if (isMobile) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      }
      
      // Cancel animation frame
      cancelAnimationFrame(animationFrameId);
      
      // Clean up the progression timer
      if (enableProgressionTimerRef.current) {
        clearTimeout(enableProgressionTimerRef.current);
        enableProgressionTimerRef.current = null;
      }
      
      // Clear all timeouts
      if (waveTimeoutRef.current) {
        clearTimeout(waveTimeoutRef.current);
        waveTimeoutRef.current = null;
      }
      
      if (levelProgressTimeoutRef.current) {
        clearTimeout(levelProgressTimeoutRef.current);
        levelProgressTimeoutRef.current = null;
      }
    };
  }, [gameState.level, gameState.isPaused, gameState.isGameOver, isMobile, isMovingLeft, isMovingRight, isMovingUp, isMovingDown, isShooting, canvasScale]);

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      const isMobileDevice = window.matchMedia("(max-width: 768px)").matches ||
                             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    // Check on initial load
    checkMobile();
    
    // Resize handler to make the game responsive
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (!canvas || !container) return;
      
      // Get container dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate the scale to fit the game in the container
      const scaleX = containerWidth / GAME_WIDTH;
      const scaleY = containerHeight / GAME_HEIGHT;
      
      // Use the smaller scale to fit the game
      const scale = Math.min(scaleX, scaleY);
      
      // Set canvas size
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
      
      // Keep canvas resolution the same but scale the display
      canvas.width = GAME_WIDTH;
      canvas.height = GAME_HEIGHT;
      
      // Store scale for touch event position calculation
      setCanvasScale({ x: scale, y: scale });
      
      // Re-check if device is mobile
      checkMobile();
    };
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update the handleLevelComplete function to respect the gameJustStartedRef flag
  const handleLevelComplete = useCallback((ctx: CanvasRenderingContext2D, nextLevel: number) => {
    console.log(`handleLevelComplete called with nextLevel: ${nextLevel}`);
    
    // BLOCK LEVEL PROGRESSION if the game just started
    if (gameJustStartedRef.current) {
      console.log("BLOCKED: Level progression attempted while game is initializing");
      return;
    }
    
    // Guard against multiple calls in a short period
    if (gameState.victory) {
      console.log("Victory already in progress, ignoring duplicate level completion call");
      return;
    }
    
    // Save progress to localStorage
    saveGameProgress(nextLevel);
    
    // Clear any level progress timer
    if (levelProgressTimeoutRef.current) {
      console.log("Clearing existing level progress timer");
      window.clearTimeout(levelProgressTimeoutRef.current);
      levelProgressTimeoutRef.current = null;
    }
    
    // Clear any wave timeout
    if (waveTimeoutRef.current) {
      console.log("Clearing wave timeout during level completion");
      window.clearTimeout(waveTimeoutRef.current);
      waveTimeoutRef.current = null;
    }
    
    // Show level text animation
    setShowLevelText(true);
    console.log("Level completion text shown");
    
    // Store context reference to ensure it's available when we need it
    const contextRef = ctx;
    
    // Immediately update level in game state
    setGameState(prev => {
      console.log(`Updating to level ${nextLevel} immediately`);
      return {
        ...prev,
        level: nextLevel,
        victory: true
      };
    });
    
    // Schedule next level with shorter delay to match new animation duration
    setTimeout(() => {
      console.log(`Beginning initialization for level ${nextLevel}`);
      
      // Reset wave counter
      currentWaveRef.current = 0;
      
      // Clear existing enemies and bullets
      enemiesRef.current = [];
      console.log(`Cleared enemies array for level ${nextLevel}, length now: ${enemiesRef.current.length}`);
      
      // Update difficulty config
      difficultyConfigRef.current = getDifficultyConfig(nextLevel);
      
      // Make sure we have the context
      if (!contextRef) {
        console.error("Canvas context is missing when trying to initialize next level!");
        return;
      }
      
      // Wait for React to process state updates before spawning new enemies
      setTimeout(() => {
        // Check the enemy array before spawning
        console.log(`About to spawn enemies for level ${nextLevel}, current enemies count: ${enemiesRef.current.length}`);
        
        // Spawn first wave with the stored context
        spawnEnemyWave(nextLevel, 0, contextRef);
        
        console.log(`Spawned first wave for level ${nextLevel}`);
        
        // Reset victory flag
        setGameState(prev => {
          console.log(`Resetting victory flag for level ${nextLevel}`);
          return {
            ...prev,
            victory: false
          };
        });
      }, 100); // Increased delay to ensure state updates are processed
      
      // Explicitly set showLevelText to false after initializing the next level
      setTimeout(() => {
        setShowLevelText(false);
        console.log("Level text hidden");
      }, 150);
    }, 2500); // 2.5 seconds
  }, []); // No dependencies needed since we're using refs and inlining the initialization logic

  // Update the observer to check the gameJustStartedRef flag
  useEffect(() => {
    // Force check level completion every 500ms
    const checkEnemiesInterval = setInterval(() => {
      // Skip if game is paused, over, in victory animation, or just started
      if (gameState.isPaused || gameState.isGameOver || gameState.victory || gameJustStartedRef.current) {
        return;
      }
      
      // Use try-catch to handle any potential errors
      try {
        // If there are no enemies left
        if (enemiesRef.current.length === 0) {
          console.log("Observer check: No enemies left");
          
          // Check if we're on the last wave
          const isLastWave = currentWaveRef.current >= difficultyConfigRef.current.maxWaves - 1;
          
          // Get the wave timeout status
          const hasActiveWaveTimeout = !!waveTimeoutRef.current;
          
          // Log the state for debugging
          console.log({
            level: gameState.level,
            currentWave: currentWaveRef.current,
            maxWaves: difficultyConfigRef.current.maxWaves,
            isLastWave,
            hasActiveWaveTimeout,
            victory: gameState.victory,
            gameJustStarted: gameJustStartedRef.current
          });
          
          // If this is the last wave OR there are no more wave timeouts, and we're not already transitioning
          if ((isLastWave || !hasActiveWaveTimeout) && 
              !gameState.victory && 
              !levelProgressTimeoutRef.current &&
              !gameJustStartedRef.current) { // Ensure game isn't just starting
            console.log("Observer triggering level completion!");
            
            // Get canvas context
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Force level progress - add a slight delay to avoid race conditions
                setTimeout(() => {
                  // Final check that conditions still hold
                  if (enemiesRef.current.length === 0 && 
                      !gameState.victory && 
                      !gameState.isPaused &&
                      !gameState.isGameOver &&
                      !gameJustStartedRef.current) { // Double-check game isn't just starting
                    console.log("OBSERVER FORCING LEVEL COMPLETION");
                    handleLevelComplete(ctx, gameState.level + 1);
                  } else {
                    console.log("Conditions changed, canceling level completion");
                  }
                }, 100);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in level completion check interval:", error);
      }
    }, 500); // Check every 500ms
    
    return () => {
      clearInterval(checkEnemiesInterval);
    };
  }, [gameState.level, gameState.isPaused, gameState.isGameOver, gameState.victory, handleLevelComplete]);

  // Add eslint-disable for the gameOver useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gameState.isGameOver) {
      // Clear any existing timeout
      if (gameOverTimeoutRef.current !== null) {
        window.clearTimeout(gameOverTimeoutRef.current);
      }
      
      // Set a new timeout for the fade effect
      gameOverTimeoutRef.current = window.setTimeout(() => {
        setGameOverFadeIn(true);
      }, 2000);
    } else {
      // Reset the fade state when not game over
      setGameOverFadeIn(false);
    }
    
    return () => {
      if (gameOverTimeoutRef.current !== null) {
        window.clearTimeout(gameOverTimeoutRef.current);
      }
    };
  }, [gameState.isGameOver]);

  // Keep this function but simplify it since we're not using debug mode anymore
  const logGameState = (message: string) => {
    // Only log in development environment if needed
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex justify-center items-center overflow-hidden"
      style={{ 
        touchAction: 'none',  // Prevent browser handling of touch events
        userSelect: 'none'    // Prevent selection
      }}
    >
      <style jsx global>{`
        @keyframes slideUp {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          15% {
            transform: translateY(0);
            opacity: 1;
          }
          75% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
            display: none;
          }
        }
        .animate-slideUp {
          animation: slideUp 2s ease-in-out forwards;
        }
      `}</style>
      
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="bg-black"
      />
      
      {/* Simplified Game UI overlay with health bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between text-white">
        <div>Score: {gameState.score}</div>
        <div>Level: {gameState.level}</div>
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="mr-2">Health:</span>
            <div className="w-24 h-4 bg-gray-800 rounded overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${(gameState.health / INITIAL_HEALTH) * 100}%` }}
              ></div>
            </div>
          </div>
          <span className="ml-2">{gameState.health}</span>
        </div>
      </div>
      
      {/* Level complete text animation */}
      {showLevelText && (
        <LevelText 
          level={gameState.level} 
          onComplete={() => setShowLevelText(false)} 
        />
      )}
      
      {/* Game over screen with delayed background fade - keep this */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
          <div 
            className={`absolute inset-0 bg-black transition-opacity duration-1000 ${gameOverFadeIn ? 'opacity-70' : 'opacity-0'}`}
          ></div>
          <div className="z-10 text-center">
            <h2 className="text-5xl md:text-6xl text-red-500 font-bold mb-8 animate-pulse">Game Over</h2>
            <p className="text-white text-2xl mb-6">Final Score: {gameState.score}</p>
            <button 
              onClick={startNewGame}
              className="px-6 py-3 bg-red-500 text-white text-xl rounded-lg hover:bg-red-600 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Pause screen */}
      {gameState.isPaused && !gameState.isGameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <h2 className="text-3xl text-white mb-6">Paused</h2>
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex items-center">
              <span className="text-white mr-4 w-24">Sound:</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={soundVolume} 
                onChange={handleSoundVolumeChange}
                className="mr-2"
              />
              <button onClick={toggleSoundMute} className="text-white">
                {isSoundMuted ? '🔇' : '🔊'}
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-4 w-24">Music:</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={musicVolume} 
                onChange={handleMusicVolumeChange}
                className="mr-2"
              />
              <button onClick={toggleMusicMute} className="text-white">
                {isMusicMuted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>
          <p className="text-white mb-6">Press ESC to continue</p>
        </div>
      )}
      
      {/* Victory screen */}
      {gameState.victory && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-3xl text-green-400 mb-4">Level Complete!</h2>
          <p className="text-white">Get ready for level {gameState.level}...</p>
        </div>
      )}
      
      {/* Simplified header with health bar */}
      <div className="absolute top-0 w-full flex justify-between items-center p-4 bg-black bg-opacity-50">
        <h2 className="text-xl text-white">Asteroid Game - Level {gameState.level}</h2>
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <span className="text-white mr-2">Health:</span>
            <div className="w-24 h-4 bg-gray-800 rounded overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${(gameState.health / INITIAL_HEALTH) * 100}%` }}
              ></div>
            </div>
          </div>
          <button 
            onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {gameState.isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <div className="text-white">
          <span>Score: {gameState.score}</span>
        </div>
      </div>
    </div>
  );
}

// Function to check collision between two bullets
const checkBulletCollision = (bullet1: Bullet, bullet2: Bullet): boolean => {
  // Use a slightly larger collision area for bullets to make it easier to hit enemy bullets
  const collisionMargin = 5;
  
  return (
    bullet1.x - collisionMargin < bullet2.x + bullet2.width + collisionMargin &&
    bullet1.x + bullet1.width + collisionMargin > bullet2.x - collisionMargin &&
    bullet1.y - collisionMargin < bullet2.y + bullet2.height + collisionMargin &&
    bullet1.y + bullet1.height + collisionMargin > bullet2.y - collisionMargin
  );
}; 