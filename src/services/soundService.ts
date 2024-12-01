class SoundService {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private enabled: boolean = true;
  private hapticEnabled: boolean = true;
  private volume: number = 0.5;
  private activeAudio: Set<HTMLAudioElement> = new Set();

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    const soundEffects = {
      'powerup-collect': [
        '/sounds/powerup-collect-1.mp3',
        '/sounds/powerup-collect-2.mp3',
        '/sounds/powerup-collect-3.mp3'
      ],
      'powerup-activate': [
        '/sounds/powerup-activate-1.mp3',
        '/sounds/powerup-activate-2.mp3'
      ],
      'shield-hit': ['/sounds/shield-hit.mp3'],
      'speed-boost': ['/sounds/speed-boost.mp3'],
      'magnet-active': ['/sounds/magnet-active.mp3'],
      'gravity-pulse': ['/sounds/gravity-pulse.mp3'],
      'teleport': ['/sounds/teleport.mp3'],
      'split-bomb': ['/sounds/split-bomb.mp3'],
      'combo-activate': ['/sounds/combo-activate.mp3'],
      'combo-speed-shield': ['/sounds/combo-speed-shield.mp3'],
      'combo-magnet-gravity': ['/sounds/combo-magnet-gravity.mp3'],
      'combo-teleport-split': ['/sounds/combo-teleport-split.mp3']
    };

    Object.entries(soundEffects).forEach(([key, paths]) => {
      const audioElements = paths.map(path => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.volume;
        return audio;
      });
      this.sounds.set(key, audioElements);
    });
  }

  play(soundName: string) {
    if (!this.enabled) return;
    
    const soundArray = this.sounds.get(soundName);
    if (!soundArray || soundArray.length === 0) return;

    // Cleanup any completed sounds
    this.cleanupCompletedSounds();

    // Play new sound
    const sound = soundArray[Math.floor(Math.random() * soundArray.length)];
    sound.currentTime = 0;
    sound.volume = this.volume;
    
    const playPromise = sound.play().catch(err => console.warn('Sound play failed:', err));
    if (playPromise) {
      this.activeAudio.add(sound);
      playPromise.then(() => {
        sound.addEventListener('ended', () => {
          this.activeAudio.delete(sound);
        }, { once: true });
      });
    }

    // Trigger haptic feedback on mobile devices
    if (this.hapticEnabled && 'vibrate' in navigator) {
      switch (soundName) {
        case 'powerup-collect':
          navigator.vibrate(50);
          break;
        case 'powerup-activate':
          navigator.vibrate([50, 50, 50]);
          break;
        case 'shield-hit':
          navigator.vibrate(100);
          break;
        case 'gravity-pulse':
          navigator.vibrate([20, 20, 20, 20, 20]);
          break;
        default:
          navigator.vibrate(30);
      }
    }
  }

  private cleanupCompletedSounds() {
    for (const sound of this.activeAudio) {
      if (sound.ended || sound.paused) {
        this.activeAudio.delete(sound);
      }
    }
  }

  toggleSound(enabled: boolean) {
    this.enabled = enabled;
  }

  toggleHaptic(enabled: boolean) {
    this.hapticEnabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = volume;
    // Update volume for all sounds
    this.sounds.forEach(soundArray => {
      soundArray.forEach(sound => {
        sound.volume = volume;
      });
    });
  }

  preloadAll() {
    this.sounds.forEach(soundArray => {
      soundArray.forEach(sound => {
        sound.load();
      });
    });
  }

  dispose() {
    // Stop and cleanup all active sounds
    this.activeAudio.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.activeAudio.clear();
    
    // Clear all sound arrays
    this.sounds.clear();
  }
}

export const soundService = new SoundService(); 