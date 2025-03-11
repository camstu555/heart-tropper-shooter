import { GameObject } from './types';

export class Particle implements GameObject {
  x: number;
  y: number;
  width: number = 2;
  height: number = 2;
  speed: number = 3;
  color: string;
  life: number;
  velocity: { x: number; y: number };

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 1.0; // Life from 1 to 0
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * this.speed;
    this.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1;
  }
} 