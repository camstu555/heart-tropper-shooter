import { GameObject } from './types';
import { EnemyType } from './Enemy';

// URLs for different explosion GIFs
const EXPLOSION_URLS = {
  regularEnemy: [
    'https://media.veefriends.com/image/upload/v1741711663/test/heart-trooper-game/explosion-image-1.gif',
    'https://media.veefriends.com/image/upload/v1741711663/test/heart-trooper-game/explosion-image-2.gif'
  ],
  tankEnemy: 'https://media.veefriends.com/image/upload/v1741712938/test/heart-trooper-game/explosion-image-3.gif',
  player: 'https://media.veefriends.com/image/upload/v1741712991/test/heart-trooper-game/explosion-image-4.gif'
};

// GIF durations in milliseconds
const GIF_DURATIONS = {
  'explosion-image-1': 660, // 0.66 seconds, 11 frames
  'explosion-image-2': 790, // 0.79 seconds, 14 frames
  'explosion-image-3': 540, // 0.54 seconds, 17 frames
  'explosion-image-4': 420  // 0.42 seconds, 7 frames
};

// Explosion DOM element container (will be created and attached to the document)
let explosionsContainer: HTMLDivElement | null = null;

// Create and setup the explosions container
function setupExplosionsContainer() {
  if (explosionsContainer) return; // Already set up
  
  explosionsContainer = document.createElement('div');
  explosionsContainer.style.position = 'absolute';
  explosionsContainer.style.top = '0';
  explosionsContainer.style.left = '0';
  explosionsContainer.style.width = '100%';
  explosionsContainer.style.height = '100%';
  explosionsContainer.style.pointerEvents = 'none';
  explosionsContainer.style.overflow = 'hidden';
  explosionsContainer.style.zIndex = '10';
  explosionsContainer.id = 'explosion-container';
  
  document.body.appendChild(explosionsContainer);
}

// Call setup during module initialization
setupExplosionsContainer();

// Make sure the container is available
function ensureContainer() {
  if (!explosionsContainer || !document.getElementById('explosion-container')) {
    setupExplosionsContainer();
  }
}

export class ExplosionGIF implements GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number = 0; // Required by GameObject interface
  type: 'regularEnemy' | 'tankEnemy' | 'player';
  element: HTMLImageElement;
  startTime: number;
  duration: number;
  isActive: boolean = true;
  canvasScale: { x: number, y: number } = { x: 1, y: 1 };
  id: string;
  
  constructor(
    x: number, 
    y: number, 
    type: 'regularEnemy' | 'tankEnemy' | 'player' = 'regularEnemy'
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.startTime = Date.now();
    this.id = `explosion-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Ensure container exists
    ensureContainer();
    
    // Create a new image element for the explosion
    this.element = document.createElement('img');
    this.element.id = this.id;
    
    // Set size based on explosion type
    if (type === 'player') {
      this.width = 100;
      this.height = 128;  // Maintain aspect ratio of original (200x256)
      this.element.src = EXPLOSION_URLS.player;
      this.duration = GIF_DURATIONS['explosion-image-4'];
    } else if (type === 'tankEnemy') {
      this.width = 80;
      this.height = 75;   // Maintain aspect ratio of original (200x187)
      this.element.src = EXPLOSION_URLS.tankEnemy;
      this.duration = GIF_DURATIONS['explosion-image-3'];
    } else {
      // Regular enemy - randomly choose one of the two explosion GIFs
      const randomIndex = Math.floor(Math.random() * EXPLOSION_URLS.regularEnemy.length);
      const gifUrl = EXPLOSION_URLS.regularEnemy[randomIndex];
      
      this.element.src = gifUrl;
      
      // Set appropriate duration based on which explosion GIF was chosen
      this.duration = gifUrl.includes('explosion-image-1') 
        ? GIF_DURATIONS['explosion-image-1'] 
        : GIF_DURATIONS['explosion-image-2'];
      
      // Set dimensions based on which GIF was chosen
      if (gifUrl.includes('explosion-image-1')) {
        this.width = 80;
        this.height = 68;  // Maintain aspect ratio of original (200x169)
      } else {
        this.width = 80;
        this.height = 80;  // Square for explosion-image-2
      }
    }
    
    // Critical: Add a timestamp parameter to prevent caching and ensure GIF plays from start
    this.element.src = `${this.element.src}?t=${Date.now()}`;
    
    // Style the image element
    this.element.style.position = 'absolute';
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    this.element.style.transform = 'translate(-50%, -50%)'; // Center the explosion
    this.element.style.pointerEvents = 'none';
    
    // Position the element
    this.updateElementPosition();
    
    // Add to container
    if (explosionsContainer) {
      explosionsContainer.appendChild(this.element);
    }
    
    // Set a timeout to remove the element after its duration
    setTimeout(() => {
      this.remove();
    }, this.duration + 50); // Add a small buffer to ensure animation completes
  }
  
  // Method to remove the explosion element from DOM
  remove() {
    this.isActive = false;
    
    // Check if element still exists and has a parent
    if (this.element && this.element.parentElement) {
      try {
        this.element.parentElement.removeChild(this.element);
      } catch (e) {
        console.warn('Failed to remove explosion element:', e);
      }
    }
    
    // Also try to remove by ID as a fallback
    try {
      const elementById = document.getElementById(this.id);
      if (elementById && elementById.parentElement) {
        elementById.parentElement.removeChild(elementById);
      }
    } catch (e) {
      console.warn('Failed to remove explosion element by ID:', e);
    }
  }
  
  // Update explosion element position based on game coordinates
  updateElementPosition() {
    // Skip if already removed
    if (!this.isActive) return;
    
    ensureContainer();
    
    // Get the canvas element to calculate the correct position
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    this.canvasScale = {
      x: rect.width / 800, // 800 is GAME_WIDTH
      y: rect.height / 600 // 600 is GAME_HEIGHT
    };
    
    // Position relative to the canvas
    const left = rect.left + this.x * this.canvasScale.x;
    const top = rect.top + this.y * this.canvasScale.y;
    
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }
  
  // Factory method to create appropriate explosion based on enemy type
  static createForEnemy(x: number, y: number, enemyType?: EnemyType): ExplosionGIF {
    if (enemyType === EnemyType.TANK) {
      return new ExplosionGIF(x, y, 'tankEnemy');
    } else {
      return new ExplosionGIF(x, y, 'regularEnemy');
    }
  }
  
  // Factory method for player explosion
  static createForPlayer(x: number, y: number): ExplosionGIF {
    return new ExplosionGIF(x, y, 'player');
  }
  
  update() {
    // Update position in case the canvas has been resized
    if (this.isActive) {
      this.updateElementPosition();
      
      // Check if explosion animation should end
      if (Date.now() - this.startTime > this.duration) {
        this.remove();
      }
    }
  }
  
  // This method is required by the GameObject interface but we're actually
  // rendering via DOM elements instead of on the canvas
  draw(ctx: CanvasRenderingContext2D) {
    // We don't need to draw on the canvas as we're using DOM elements
    // This method is only here to satisfy the GameObject interface
  }
} 