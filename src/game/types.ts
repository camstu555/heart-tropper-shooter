export interface GameState {
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
  health: number;
  enemyCount: number;
  victory: boolean;
  level: number;
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  update: () => void;
}

export interface Collidable extends GameObject {
  checkCollision: (other: GameObject) => boolean;
} 