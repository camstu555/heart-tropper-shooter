import { GameObject } from './types';
import { Bullet } from './Bullet';
import { PowerUp, PowerUpType } from './PowerUp';

// Game boundaries to prevent enemies from going off-screen
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BOUNDARY_PADDING = 30; // Keep enemies at least this far from the edge

export enum EnemyType {
  BASIC = 'basic',
  SHOOTER = 'shooter',
  TANK = 'tank',
  FAST = 'fast'
}

// Static image cache for enemies
const enemyImages: { [key: string]: HTMLImageElement } = {};

// Preload the cat image directly from the provided URL
const preloadCatImage = () => {
  if (!enemyImages['cat']) {
    enemyImages['cat'] = new Image();
    enemyImages['cat'].src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/cynical-cat-competing-shrinkwrapped.png';
    
    // Fallback in case the image fails to load
    enemyImages['cat'].onerror = () => {
      console.error('Failed to load cat image');
    };
  }
  return enemyImages['cat'];
};

// Preload the "bad intentions" image for BASIC enemies
const preloadBadIntentionsImage = () => {
  if (!enemyImages['badIntentions']) {
    enemyImages['badIntentions'] = new Image();
    enemyImages['badIntentions'].src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/bad-intentions-competing-shrinkwrapped.png';
    
    // Fallback in case the image fails to load
    enemyImages['badIntentions'].onerror = () => {
      console.error('Failed to load bad intentions image');
    };
  }
  return enemyImages['badIntentions'];
};

// Preload the "befuddled burglar" image for FAST enemies
const preloadBefuddledBurglarImage = () => {
  if (!enemyImages['befuddledBurglar']) {
    enemyImages['befuddledBurglar'] = new Image();
    enemyImages['befuddledBurglar'].src = 'https://media.veefriends.com/image/upload/v1700083055/veefriends/specials/series2/characters/befuddled-burglar-competing-shrinkwrapped.png';
    
    // Fallback in case the image fails to load
    enemyImages['befuddledBurglar'].onerror = () => {
      console.error('Failed to load befuddled burglar image');
    };
  }
  return enemyImages['befuddledBurglar'];
};

// Make sure we call this early
preloadCatImage();
preloadBadIntentionsImage();
preloadBefuddledBurglarImage();

export class Enemy implements GameObject {
  x: number;
  y: number;
  width: number = 40;
  height: number = 40;
  baseSpeed: number = 1;
  speed: number = this.baseSpeed;
  verticalSpeed: number = 0;
  direction: number = 1;
  lastShot: number = 0;
  type: EnemyType;
  health: number = 1;
  shootProbability: number = 0.3;
  dropPowerUpChance: number = 0.2; // 20% chance to drop power-up
  color: string = '#4488ff';
  targetY: number;
  pulseOffset: number = 0;
  diveAtPlayer: boolean = false;
  diverTimer: number = 0;
  originalX: number = 0;
  originalY: number = 0;
  divePhase: 'ready' | 'diving' | 'returning' = 'ready';
  imageLoaded: boolean = false;
  currentLevel: number = 1;
  bulletSpeedMultiplier: number = 1.0;
  stuckTimer: number = 0; // Timer to track if enemy is stuck off-screen
  initialSize: number = 1; // For tank enemies to track shrinking
  timeOffScreen: number = 0; // Track how long enemy has been off-screen

  constructor(x: number, y: number, type: EnemyType = EnemyType.BASIC, level: number = 1) {
    this.x = x;
    this.y = y - 100; // Start above screen
    this.originalX = x;
    this.originalY = y;
    this.type = type;
    this.targetY = y; // Store the target Y position
    this.currentLevel = level;
    this.setupType();
    this.calculateBulletSpeedMultiplier(); // Calculate bullet speed based on level
    
    // Initialize size for tank enemies
    if (this.type === EnemyType.TANK) {
      this.initialSize = 1.0;
      this.width = 60; // Make tank enemies bigger
      this.height = 60;
    }
    
    // Preload the images based on enemy type
    if (this.type === EnemyType.SHOOTER) {
      preloadCatImage();
    } else if (this.type === EnemyType.BASIC) {
      preloadBadIntentionsImage();
    } else if (this.type === EnemyType.FAST) {
      preloadBefuddledBurglarImage();
    }
  }

  private setupType() {
    switch (this.type) {
      case EnemyType.SHOOTER:
        this.health = 1;
        this.shootProbability = 0.4;
        this.color = '#999999'; // Gray as fallback if image fails to load
        this.verticalSpeed = 0.5;
        break;
      case EnemyType.TANK:
        this.health = 3;
        this.shootProbability = 0.15;
        this.speed = this.baseSpeed * 0.5;
        this.color = '#0022cc';
        this.verticalSpeed = 0.3;
        break;
      case EnemyType.FAST:
        this.health = 1;
        this.shootProbability = 0.2;
        this.speed = this.baseSpeed * 2;
        this.color = '#66aaff';
        this.verticalSpeed = 1;
        break;
      default: // BASIC
        this.health = 1;
        this.shootProbability = 0.1;
        this.color = '#4488ff';
        this.verticalSpeed = 0.7;
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);
    
    // Add subtle pulsing effect for shooter
    if (this.type === EnemyType.SHOOTER) {
      this.pulseOffset = (Math.sin(Date.now() / 200) * 0.1) + 1;
      ctx.scale(this.pulseOffset, this.pulseOffset);
    }

    ctx.beginPath();
    ctx.moveTo(0, size/4);
    ctx.bezierCurveTo(
      0, 0,
      -size/2, 0,
      -size/2, size/4
    );
    ctx.bezierCurveTo(
      -size/2, size/2,
      0, size,
      0, size
    );
    ctx.bezierCurveTo(
      0, size,
      size/2, size/2,
      size/2, size/4
    );
    ctx.bezierCurveTo(
      size/2, 0,
      0, 0,
      0, size/4
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Pulse effect for all enemies
    const pulseAmount = Math.sin(this.pulseOffset) * 0.1;
    this.pulseOffset += 0.1;
    
    ctx.save();
    
    // Add glow effect for diving enemies
    if (this.divePhase === 'diving') {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
    }
    
    // Draw enemy body based on type
    if (this.type === EnemyType.SHOOTER) {
      // Draw cat image for SHOOTER type
      const catImage = enemyImages['cat'];
      if (catImage && catImage.complete) {
        // If the image is loaded, draw it
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const scale = 1.4 + pulseAmount; // Increased scale to make it bigger
        
        // Draw with increased scaling effect
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;
        ctx.drawImage(
          catImage, 
          centerX - drawWidth/2, 
          centerY - drawHeight/2, 
          drawWidth, 
          drawHeight
        );
        
        // Add a health indicator if needed
        if (this.health > 1) {
          ctx.fillStyle = '#ff9999';
          const healthWidth = (this.width * 0.8) * (this.health / 3);
          ctx.fillRect(this.x + this.width * 0.1, this.y - 5, healthWidth, 3);
        }
      } else {
        // Fallback to a basic shape if image is not loaded
        this.drawCatFallback(ctx, pulseAmount);
      }
    } else if (this.type === EnemyType.TANK) {
      // Draw tank as a hexagon shape that shrinks with each hit
      ctx.fillStyle = this.color;
      
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      
      // Calculate size based on initial health and current health
      // Start large and shrink with each hit
      const sizeMultiplier = 0.7 + (this.initialSize * (this.health / 3)) * 0.5;
      const size = this.width / 2 * sizeMultiplier * (1 + pulseAmount);
      
      // Draw hexagon shape
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const xPos = centerX + size * Math.cos(angle);
        const yPos = centerY + size * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      // Add glow effect for tank enemies
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 5;
      ctx.stroke();
      
    } else if (this.type === EnemyType.FAST) {
      // Draw befuddled burglar image for FAST enemy type
      const burglarImage = enemyImages['befuddledBurglar'];
      if (burglarImage && burglarImage.complete) {
        // If the image is loaded, draw it
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const scale = 1.2 + pulseAmount; // Add pulse effect
        
        // Draw with scaling effect
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;
        ctx.drawImage(
          burglarImage, 
          centerX - drawWidth/2, 
          centerY - drawHeight/2, 
          drawWidth, 
          drawHeight
        );
      } else {
        // Fallback to diamond shape if image is not loaded
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const size = this.width / 2 * (1 + pulseAmount);
        
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY);
        ctx.lineTo(centerX, centerY + size);
        ctx.lineTo(centerX - size, centerY);
        ctx.closePath();
        ctx.fill();
        
        // Speed lines
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(centerX - size * 1.2, centerY);
        ctx.lineTo(centerX - size * 0.7, centerY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + size * 0.7, centerY);
        ctx.lineTo(centerX + size * 1.2, centerY);
        ctx.stroke();
      }
    } else {
      // BASIC enemy - use bad intentions image
      const badIntentionsImage = enemyImages['badIntentions'];
      if (badIntentionsImage && badIntentionsImage.complete) {
        // If the image is loaded, draw it
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const scale = 1.2 + pulseAmount; // Add pulse effect
        
        // Draw with scaling effect
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;
        ctx.drawImage(
          badIntentionsImage, 
          centerX - drawWidth/2, 
          centerY - drawHeight/2, 
          drawWidth, 
          drawHeight
        );
      } else {
        // Fallback to heart shape if image is not loaded
        this.drawHeart(ctx, this.x + this.width / 2, this.y + this.height / 2, this.width / 2 * (1 + pulseAmount));
      }
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    ctx.restore();
  }
  
  // Fallback method if cat image fails to load
  private drawCatFallback(ctx: CanvasRenderingContext2D, pulseAmount: number) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const size = this.width / 2 * (1 + pulseAmount);
    
    // Draw basic cat shape as fallback
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.3, centerY - size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(centerX - size * 0.3, centerY - size * 0.2, size * 0.1, 0, Math.PI * 2);
    ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(centerX - size * 0.3, centerY + size * 0.3);
    ctx.lineTo(centerX + size * 0.3, centerY + size * 0.3);
    ctx.stroke();
  }

  update() {
    // Move towards target Y position if not there yet
    if (this.y < this.targetY) {
      this.y += this.verticalSpeed;
    }
    
    // Handle movement based on enemy type
    if (this.diveAtPlayer) {
      this.handleDiving();
    } else {
      // Standard horizontal movement
      this.x += this.speed * this.direction;
      
      // Check boundaries and reverse direction
      if (this.x <= BOUNDARY_PADDING || this.x + this.width >= GAME_WIDTH - BOUNDARY_PADDING) {
        this.direction *= -1;
        this.y += 10; // Move down a bit when changing direction
      }
    }
    
    // Check if enemy is off-screen or stuck
    const isOffScreen = 
      this.x + this.width < 0 || 
      this.x > GAME_WIDTH || 
      this.y + this.height < 0 || 
      this.y > GAME_HEIGHT + 100; // Allow some space below screen
    
    if (isOffScreen) {
      this.timeOffScreen += 1;
      
      // If off-screen for too long (2 seconds at 60fps), force back to screen
      if (this.timeOffScreen > 120) {
        // Force enemy back into visible area
        if (this.x + this.width < 0) {
          this.x = BOUNDARY_PADDING;
          this.direction = 1; // Move right
        } else if (this.x > GAME_WIDTH) {
          this.x = GAME_WIDTH - this.width - BOUNDARY_PADDING;
          this.direction = -1; // Move left
        }
        
        // If below screen, move to top
        if (this.y > GAME_HEIGHT + 100) {
          this.y = 50;
        }
        
        this.timeOffScreen = 0;
      }
    } else {
      // Reset timer when on screen
      this.timeOffScreen = 0;
    }
    
    // Update pulse offset for animation
    this.pulseOffset += 0.1;
  }

  // Handle diving behavior for certain enemies
  private handleDiving() {
    const now = Date.now();
    
    if (this.divePhase === 'ready' && this.y >= this.targetY - 20) {
      // Chance to start diving
      if (Math.random() < 0.005) {
        this.divePhase = 'diving';
        this.diverTimer = now + 3000; // Dive for 3 seconds
      }
    } else if (this.divePhase === 'diving') {
      // Dive downward quickly
      this.y += this.verticalSpeed * 3;
      
      // Check if dive period is over or if enemy is off-screen
      if (now > this.diverTimer || this.y > 600) {
        this.divePhase = 'returning';
      }
    } else if (this.divePhase === 'returning') {
      // Return to formation
      const dx = this.originalX - this.x;
      const dy = this.originalY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 5) {
        // Close enough, snap back to formation
        this.x = this.originalX;
        this.y = this.originalY;
        this.divePhase = 'ready';
      } else {
        // Move back to formation position
        this.x += dx * 0.05;
        this.y += dy * 0.05;
      }
    }
  }

  canShoot(): boolean {
    const now = Date.now();
    const minInterval = 3000;
    
    // Only shoot when near target Y position or diving
    if (this.y >= this.targetY - 20 || this.divePhase === 'diving') {
      if (now - this.lastShot >= minInterval) {
        if (Math.random() < this.shootProbability / 20) {
          this.lastShot = now;
          return true;
        }
      }
    }
    return false;
  }

  private calculateBulletSpeedMultiplier() {
    // Base bullet speed multiplier that increases with level
    // Level 1: 0.2x speed (extremely slow)
    // Level 2: 0.3x speed (very slow)
    // Level 3: 0.4x speed
    // Level 4: 0.5x speed
    // Level 5: 0.6x speed
    // Level 6: 0.7x speed
    // Level 7: 0.8x speed
    // Level 8: 0.9x speed
    // Level 9: 1.0x speed (normal)
    // Level 10+: 1.1x speed (faster)
    
    if (this.currentLevel <= 1) {
      this.bulletSpeedMultiplier = 0.2;
    } else if (this.currentLevel <= 2) {
      this.bulletSpeedMultiplier = 0.3;
    } else if (this.currentLevel <= 3) {
      this.bulletSpeedMultiplier = 0.4;
    } else if (this.currentLevel <= 4) {
      this.bulletSpeedMultiplier = 0.5;
    } else if (this.currentLevel <= 5) {
      this.bulletSpeedMultiplier = 0.6;
    } else if (this.currentLevel <= 6) {
      this.bulletSpeedMultiplier = 0.7;
    } else if (this.currentLevel <= 7) {
      this.bulletSpeedMultiplier = 0.8;
    } else if (this.currentLevel <= 8) {
      this.bulletSpeedMultiplier = 0.9;
    } else if (this.currentLevel <= 9) {
      this.bulletSpeedMultiplier = 1.0;
    } else {
      this.bulletSpeedMultiplier = 1.1;
    }
    
    // Additionally, adjust based on enemy type
    if (this.type === EnemyType.SHOOTER) {
      // Shooter enemies fire slightly faster bullets
      this.bulletSpeedMultiplier += 0.1;
    }
  }

  shoot(): Bullet {
    // Calculate a base bullet speed using the level-based multiplier
    // Reduce the base speed from 4 to 3 to make all bullets slower
    const baseBulletSpeed = 3 * this.bulletSpeedMultiplier;
    
    // Add some randomness based on enemy type
    let finalSpeed = baseBulletSpeed;
    
    if (this.type === EnemyType.SHOOTER) {
      // Shooter enemies have slightly faster bullets
      finalSpeed += 0.2;
    } else if (this.type === EnemyType.TANK) {
      // Tank enemies no longer have slower bullets
      // Remove the speed penalty
    } else if (this.type === EnemyType.FAST) {
      // Fast enemies have varied speed bullets (reduce variation)
      finalSpeed += (Math.random() * 0.4) - 0.2; // -0.2 to +0.2 variation
    }
    
    // Create bullet with the calculated speed and enemy type info
    return new Bullet(
      this.x + this.width / 2,
      this.y + this.height,
      true,      // isEnemyBullet
      0,         // angle (default straight down)
      finalSpeed, // custom speed based on level and enemy type
      this.type   // pass enemy type to style the bullet appropriately
    );
  }

  hit(): boolean {
    this.health--;
    
    // For tank enemies, update the size when hit
    if (this.type === EnemyType.TANK) {
      this.initialSize -= 0.2; // Reduce size with each hit
    }
    
    return this.health <= 0;
  }

  dropPowerUp(): PowerUp | null {
    if (Math.random() > this.dropPowerUpChance) return null;

    const powerUpTypes = Object.values(PowerUpType);
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    return new PowerUp(this.x + this.width / 2, this.y + this.height / 2, randomType);
  }
} 