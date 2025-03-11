import { GameObject } from './types';
import { EnemyType } from './Enemy';

export class Bullet implements GameObject {
  x: number;
  y: number;
  width: number = 12; // Restore original width for heart shape
  height: number = 12; // Restore original height for heart shape
  speed: number;
  isEnemyBullet: boolean;
  angle: number;
  color: string;
  enemyType?: EnemyType; // Reference to enemy type for specialized bullets

  constructor(
    x: number, 
    y: number, 
    isEnemyBullet: boolean = false, 
    angle: number = 0,
    customSpeed?: number,
    enemyType?: EnemyType
  ) {
    this.x = x;
    this.y = y;
    this.isEnemyBullet = isEnemyBullet;
    this.angle = angle;
    this.enemyType = enemyType;
    
    // If customSpeed is provided, use it; otherwise use the default speeds
    if (customSpeed !== undefined) {
      this.speed = customSpeed;
    } else {
      // Default speeds for player and enemy bullets
      this.speed = isEnemyBullet ? 5 : 7;
    }
    
    // Set bullet color based on enemy type
    if (isEnemyBullet) {
      if (enemyType === EnemyType.BASIC) {
        this.color = '#FF8C00'; // Orange for carrot bullets
      } else {
        this.color = '#00ff00'; // Green for all other enemy bullets
      }
    } else {
      this.color = '#ff3366'; // Red for player bullets
    }
  }

  update() {
    // Move bullet based on angle
    if (this.angle !== 0) {
      this.x += Math.sin(this.angle) * this.speed;
      this.y += -Math.cos(this.angle) * this.speed;
    } else {
      // Move up or down based on which entity shot the bullet
      this.y += this.isEnemyBullet ? this.speed : -this.speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isEnemyBullet && this.enemyType === EnemyType.BASIC) {
      // Draw carrot-shaped bullet for Bad Intentions enemy
      this.drawCarrot(ctx);
    } else if (!this.isEnemyBullet) {
      // Draw heart-shaped bullet for player
      this.drawHeart(ctx);
    } else {
      // Standard green bullet for other enemy types
      ctx.fillStyle = this.color;
      
      // Make green enemy bullets slightly rectangular
      if (this.angle !== 0) {
        // For angled bullets, rotate the canvas to draw at an angle
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.width / 4, -this.height / 2, this.width / 2, this.height);
        ctx.restore();
      } else {
        // For standard bullets, draw directly
        ctx.fillRect(this.x - this.width / 4, this.y - this.height / 2, this.width / 2, this.height);
      }
    }
  }

  // Draw a heart-shaped bullet for player
  private drawHeart(ctx: CanvasRenderingContext2D) {
    const heartSize = this.width;
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.angle !== 0) {
      ctx.rotate(this.angle);
    }
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, heartSize/4);
    ctx.bezierCurveTo(
      0, 0,
      -heartSize/2, 0,
      -heartSize/2, heartSize/4
    );
    ctx.bezierCurveTo(
      -heartSize/2, heartSize/2,
      0, heartSize,
      0, heartSize
    );
    ctx.bezierCurveTo(
      0, heartSize,
      heartSize/2, heartSize/2,
      heartSize/2, heartSize/4
    );
    ctx.bezierCurveTo(
      heartSize/2, 0,
      0, 0,
      0, heartSize/4
    );
    ctx.fill();
    ctx.restore();
  }

  // Draw a carrot-shaped bullet for Bad Intentions enemy
  private drawCarrot(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Translate to the bullet's position
    ctx.translate(this.x, this.y);
    
    // Rotate if there's an angle (probably not needed for enemy bullets going down)
    if (this.angle !== 0) {
      ctx.rotate(this.angle);
    }
    
    // For enemy bullets going down, rotate an additional 180 degrees
    if (this.isEnemyBullet) {
      ctx.rotate(Math.PI); // 180 degrees to point downward
    }
    
    // Draw a carrot shape
    ctx.fillStyle = '#FF8C00'; // Orange for carrot
    
    // Carrot body (triangle)
    ctx.beginPath();
    ctx.moveTo(0, -this.height/2);
    ctx.lineTo(this.width/2, this.height/2);
    ctx.lineTo(-this.width/2, this.height/2);
    ctx.closePath();
    ctx.fill();
    
    // Carrot top (green leaves)
    ctx.fillStyle = '#4CAF50'; // Green for leaves
    
    // Left leaf
    ctx.beginPath();
    ctx.ellipse(-this.width/3, -this.height/2, this.width/3, this.height/5, Math.PI/4, 0, Math.PI*2);
    ctx.fill();
    
    // Right leaf
    ctx.beginPath();
    ctx.ellipse(this.width/3, -this.height/2, this.width/3, this.height/5, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
  }

  checkCollision(other: GameObject): boolean {
    return this.x < other.x + other.width &&
           this.x + this.width > other.x &&
           this.y < other.y + other.height &&
           this.y + this.height > other.y;
  }
} 