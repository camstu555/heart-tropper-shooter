import { GameObject } from './types';
import { PowerUpType } from './PowerUp';
import { Bullet } from './Bullet';

export class Player implements GameObject {
  x: number;
  y: number;
  width: number = 50;
  height: number = 50;
  speed: number = 5;
  baseSpeed: number = 5;
  hasShield: boolean = false;
  hasSpreadShot: boolean = false;
  shieldTimer: number = 0;
  spreadShotTimer: number = 0;
  speedTimer: number = 0;
  invulnerable: boolean = false;
  invulnerableTimer: number = 0;
  powerUpTimer: number = 0;
  color: string = '#4488ff';
  fireRate: number = 250; // Time in ms between shots
  private playerImage: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.loadPlayerImage();
  }

  private loadPlayerImage() {
    this.playerImage = new Image();
    this.playerImage.src = 'https://media.veefriends.com/image/upload/v1700083068/veefriends/specials/series2/characters/heart-trooper-manifesting-shrinkwrapped.png';
    this.playerImage.onload = () => {
      this.imageLoaded = true;
    };
  }

  moveLeft() {
    this.x = Math.max(0, this.x - this.speed);
  }

  moveRight() {
    this.x = Math.min(800 - this.width, this.x + this.speed);
  }
  
  moveUp() {
    this.y = Math.max(0, this.y - this.speed);
  }
  
  moveDown() {
    this.y = Math.min(600 - this.height, this.y + this.speed);
  }
  
  shoot(): Bullet | Bullet[] {
    if (this.hasSpreadShot) {
      return [
        new Bullet(this.x + this.width / 2, this.y, false),
        new Bullet(this.x + this.width / 2, this.y, false, -0.3),
        new Bullet(this.x + this.width / 2, this.y, false, 0.3)
      ];
    } else {
      return new Bullet(this.x + this.width / 2, this.y);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw shield if active
    if (this.hasShield) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw player with blinking effect when invulnerable
    if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
      if (this.imageLoaded && this.playerImage) {
        // Draw the loaded image
        ctx.drawImage(this.playerImage, this.x, this.y, this.width, this.height);
      } else {
        // Fallback to rectangle if image hasn't loaded
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw the cannon
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + this.width / 2 - 5, this.y - 10, 10, 10);
      }
    }
  }

  update() {
    const now = Date.now();

    // Update shield timer
    if (this.shieldTimer > 0 && now > this.shieldTimer) {
      this.hasShield = false;
      this.shieldTimer = 0;
    }

    // Update spread shot timer
    if (this.spreadShotTimer > 0 && now > this.spreadShotTimer) {
      this.hasSpreadShot = false;
      this.spreadShotTimer = 0;
    }

    // Update speed timer
    if (this.speedTimer > 0 && now > this.speedTimer) {
      this.speed = this.baseSpeed;
      this.speedTimer = 0;
    }

    // Update invulnerability timer
    if (this.invulnerableTimer > 0 && now > this.invulnerableTimer) {
      this.invulnerable = false;
      this.invulnerableTimer = 0;
    }
  }

  activatePowerUp(type: PowerUpType) {
    const duration = 5000; // 5 seconds
    const now = Date.now();

    switch (type) {
      case PowerUpType.SHIELD:
        this.hasShield = true;
        this.shieldTimer = now + duration;
        break;
      case PowerUpType.SPREAD_SHOT:
        this.hasSpreadShot = true;
        this.spreadShotTimer = now + duration;
        break;
      case PowerUpType.SPEED:
        this.speed = this.baseSpeed * 1.5;
        this.speedTimer = now + duration;
        break;
      case PowerUpType.HEALTH:
        // Health is handled by the game component
        break;
    }
  }

  makeInvulnerable() {
    this.invulnerable = true;
    this.invulnerableTimer = Date.now() + 2000; // 2 seconds of invulnerability
  }
} 