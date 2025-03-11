import { GameObject } from './types';

export enum PowerUpType {
  SHIELD = 'shield',
  SPREAD_SHOT = 'spreadShot',
  SPEED = 'speed',
  HEALTH = 'health'
}

export class PowerUp implements GameObject {
  x: number;
  y: number;
  width: number = 30;
  height: number = 30;
  speed: number = 2;
  type: PowerUpType;
  color: string;
  pulse: number = 0;
  pulseDirection: number = 1;
  rotation: number = 0;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;
    
    // Assign color based on type
    switch (type) {
      case PowerUpType.SHIELD:
        this.color = '#00ffff'; // Cyan for shield
        break;
      case PowerUpType.SPREAD_SHOT:
        this.color = '#ff00ff'; // Magenta for spread shot
        break;
      case PowerUpType.SPEED:
        this.color = '#ffff00'; // Yellow for speed
        break;
      case PowerUpType.HEALTH:
        this.color = '#ff3366'; // Pink for health
        break;
      default:
        this.color = '#ffffff'; // White as fallback
    }
  }

  update() {
    this.y += this.speed;
    
    // Update pulse effect
    this.pulse += 0.05 * this.pulseDirection;
    if (this.pulse >= 1) {
      this.pulseDirection = -1;
    } else if (this.pulse <= 0) {
      this.pulseDirection = 1;
    }
    
    // Update rotation
    this.rotation += 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Base glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    
    // Draw power-up based on type
    switch (this.type) {
      case PowerUpType.SHIELD:
        this.drawShield(ctx);
        break;
      case PowerUpType.SPREAD_SHOT:
        this.drawSpreadShot(ctx);
        break;
      case PowerUpType.SPEED:
        this.drawSpeed(ctx);
        break;
      case PowerUpType.HEALTH:
        this.drawHealth(ctx);
        break;
      default:
        // Fallback - simple circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
  }

  drawShield(ctx: CanvasRenderingContext2D) {
    // Shield - circular ring with inner pulsing
    const radius = this.width / 2;
    
    // Outer ring
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner pulsing circle
    ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + this.pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.6 + this.pulse * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  drawSpreadShot(ctx: CanvasRenderingContext2D) {
    // Spread shot - three small arrows pointing outward
    const size = this.width / 2;
    
    ctx.fillStyle = this.color;
    
    // Center arrow
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(-size / 2, 0);
    ctx.closePath();
    ctx.fill();
    
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 2);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
    
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(size / 2, -size / 2);
    ctx.lineTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.closePath();
    ctx.fill();
  }

  drawSpeed(ctx: CanvasRenderingContext2D) {
    // Speed - lightning bolt
    const size = this.width / 2;
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size / 2, -size / 4);
    ctx.lineTo(0, size / 4);
    ctx.lineTo(size / 2, size);
    ctx.lineTo(-size / 3, 0);
    ctx.lineTo(0, -size / 3);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.closePath();
    ctx.fill();
    
    // Pulsing glow
    ctx.fillStyle = `rgba(255, 255, 0, ${0.4 * this.pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.8 + this.pulse * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  drawHealth(ctx: CanvasRenderingContext2D) {
    // Health - heart shape
    const size = this.width / 2;
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, size / 3);
    ctx.bezierCurveTo(
      0, 0,
      -size, 0,
      -size, size / 3
    );
    ctx.bezierCurveTo(
      -size, size * 0.7,
      0, size,
      0, size
    );
    ctx.bezierCurveTo(
      0, size,
      size, size * 0.7,
      size, size / 3
    );
    ctx.bezierCurveTo(
      size, 0,
      0, 0,
      0, size / 3
    );
    ctx.fill();
    
    // Add pulsing effect
    ctx.fillStyle = `rgba(255, 51, 102, ${0.5 * this.pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.6 + this.pulse * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  checkCollision(other: GameObject): boolean {
    return (
      this.x - this.width / 2 < other.x + other.width &&
      this.x + this.width / 2 > other.x &&
      this.y - this.height / 2 < other.y + other.height &&
      this.y + this.height / 2 > other.y
    );
  }
} 