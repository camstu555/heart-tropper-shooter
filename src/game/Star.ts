import { GameObject } from './types';

export class Star implements GameObject {
  x: number;
  y: number;
  width: number = 2;
  height: number = 2;
  speed: number;
  brightness: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.speed = Math.random() * 0.5 + 0.1;
    this.brightness = Math.random() * 0.5 + 0.5;
  }

  update() {
    this.y += this.speed;
    if (this.y > 600) {
      this.y = 0;
      this.x = Math.random() * 800;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
} 