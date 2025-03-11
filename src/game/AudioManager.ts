export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, HTMLAudioElement | HTMLAudioElement[]> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private loaded: boolean = false;
  private muted: boolean = false;
  private musicMuted: boolean = false;
  private soundEffectsVolume: number = 0.5;
  private musicVolume: number = 0.3;

  // Private constructor for singleton pattern
  private constructor() {
    this.loadSounds();
    this.loadBackgroundMusic();
  }

  // Get the singleton instance
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // Load all game sounds
  private loadSounds() {
    // Player shoot sound
    this.loadSound('playerShoot', 'https://media.veefriends.com/video/upload/v1741707898/test/heart-trooper-game/player-shoot-1.ogg');
    
    // Enemy explosion sounds (array of sounds)
    this.loadSoundArray('enemyExplode', [
      'https://media.veefriends.com/video/upload/v1741707899/test/heart-trooper-game/enemy-explosion-1.ogg',
      'https://media.veefriends.com/video/upload/v1741707899/test/heart-trooper-game/enemy-explosion-2.ogg',
      'https://media.veefriends.com/video/upload/v1741707899/test/heart-trooper-game/enemy-explosion-3.ogg',
      'https://media.veefriends.com/video/upload/v1741707899/test/heart-trooper-game/enemy-explosion-4.ogg'
    ]);
    
    // Player damage sound
    this.loadSound('playerDamage', 'https://media.veefriends.com/video/upload/v1741707900/test/heart-trooper-game/enemy-hit-sound.ogg');
    
    // Game over sound
    this.loadSound('gameOver', 'https://media.veefriends.com/video/upload/v1741707900/test/heart-trooper-game/enemy-hit-sound.ogg');
    
    // Game start sound
    this.loadSound('gameStart', 'https://media.veefriends.com/video/upload/v1741707900/test/heart-trooper-game/enemy-hit-sound.ogg');
    
    // Navigation change sound
    this.loadSound('navigationChange', 'https://media.veefriends.com/video/upload/v1741707898/test/heart-trooper-game/navigation-change-sound.ogg');
  }

  // Load background music
  private loadBackgroundMusic() {
    this.backgroundMusic = new Audio('https://media.veefriends.com/video/upload/v1741707899/test/heart-trooper-game/background-music-gameplay.ogg');
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = this.musicVolume;
    this.backgroundMusic.addEventListener('canplaythrough', () => {
      console.log('Background music loaded');
    });
    this.backgroundMusic.addEventListener('error', (e) => {
      console.error('Error loading background music:', e);
    });
  }

  // Load a single sound
  private loadSound(name: string, path: string) {
    const audio = new Audio();
    audio.src = path;
    audio.preload = 'auto';
    
    audio.addEventListener('canplaythrough', () => {
      console.log(`Sound loaded: ${name}`);
    });
    
    audio.addEventListener('error', (e) => {
      console.error(`Error loading sound ${name}:`, e);
    });
    
    this.sounds.set(name, audio);
  }

  // Load an array of sounds (for random selection)
  private loadSoundArray(name: string, paths: string[]) {
    const audioArray: HTMLAudioElement[] = [];
    
    paths.forEach((path, index) => {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      
      audio.addEventListener('canplaythrough', () => {
        console.log(`Sound loaded: ${name}${index + 1}`);
      });
      
      audio.addEventListener('error', (e) => {
        console.error(`Error loading sound ${name}${index + 1}:`, e);
      });
      
      audioArray.push(audio);
    });
    
    this.sounds.set(name, audioArray);
  }

  // Play a sound by name
  play(name: string) {
    if (this.muted) return;
    
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound not found: ${name}`);
      return;
    }
    
    if (Array.isArray(sound)) {
      // For arrays, play a random sound
      const randomIndex = Math.floor(Math.random() * sound.length);
      const randomSound = sound[randomIndex];
      const soundClone = randomSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = this.soundEffectsVolume;
      soundClone.play().catch(e => console.error(`Error playing sound ${name}:`, e));
    } else {
      // For single sounds
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = this.soundEffectsVolume;
      soundClone.play().catch(e => console.error(`Error playing sound ${name}:`, e));
    }
  }

  // Start playing background music
  playBackgroundMusic() {
    if (this.backgroundMusic && !this.musicMuted) {
      this.backgroundMusic.volume = this.musicVolume;
      this.backgroundMusic.play().catch(e => console.error('Error playing background music:', e));
    }
  }

  // Pause background music
  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  // Resume background music
  resumeBackgroundMusic() {
    if (this.backgroundMusic && !this.musicMuted) {
      this.backgroundMusic.play().catch(e => console.error('Error resuming background music:', e));
    }
  }

  // Toggle mute all sounds
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Set mute state for all sounds
  setMute(muted: boolean) {
    this.muted = muted;
    return this.muted;
  }

  // Toggle mute just for background music
  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    if (this.musicMuted) {
      this.pauseBackgroundMusic();
    } else {
      this.resumeBackgroundMusic();
    }
    return this.musicMuted;
  }

  // Set mute state for background music
  setMusicMute(muted: boolean) {
    this.musicMuted = muted;
    if (this.musicMuted) {
      this.pauseBackgroundMusic();
    } else {
      this.resumeBackgroundMusic();
    }
    return this.musicMuted;
  }

  // Set sound effects volume (0.0 to 1.0)
  setSoundEffectsVolume(volume: number) {
    this.soundEffectsVolume = Math.max(0, Math.min(1, volume));
    return this.soundEffectsVolume;
  }

  // Get current sound effects volume
  getSoundEffectsVolume(): number {
    return this.soundEffectsVolume;
  }

  // Set music volume (0.0 to 1.0)
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume;
    }
    return this.musicVolume;
  }

  // Get current music volume
  getMusicVolume(): number {
    return this.musicVolume;
  }
} 