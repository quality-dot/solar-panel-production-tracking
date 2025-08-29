/**
 * Audio Feedback Service for Barcode Scanning
 * Provides audio feedback for various scanning events
 */

export interface AudioFeedbackConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    success: string;
    error: string;
    scan: string;
    warning: string;
  };
}

export class AudioFeedbackService {
  private audioContext: AudioContext | null = null;
  private config: AudioFeedbackConfig;
  private audioCache: Map<string, AudioBuffer> = new Map();

  constructor(config: Partial<AudioFeedbackConfig> = {}) {
    this.config = {
      enabled: true,
      volume: 0.7,
      sounds: {
        success: 'success',
        error: 'error',
        scan: 'scan',
        warning: 'warning'
      },
      ...config
    };
  }

  /**
   * Initialize the audio context
   */
  async initialize(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        this.audioContext = new AudioContext();
        await this.preloadSounds();
      }
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Preload audio sounds
   */
  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    const soundUrls = {
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      scan: '/sounds/scan.mp3',
      warning: '/sounds/warning.mp3'
    };

    for (const [key, url] of Object.entries(soundUrls)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.audioCache.set(key, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    }
  }

  /**
   * Play a success sound
   */
  playSuccess(): void {
    this.playSound('success');
  }

  /**
   * Play an error sound
   */
  playError(): void {
    this.playSound('error');
  }

  /**
   * Play a scan sound
   */
  playScan(): void {
    this.playSound('scan');
  }

  /**
   * Play a warning sound
   */
  playWarning(): void {
    this.playSound('warning');
  }

  /**
   * Play a custom sound by name
   */
  playSound(soundName: string): void {
    if (!this.config.enabled || !this.audioContext) return;

    try {
      const audioBuffer = this.audioCache.get(soundName);
      if (audioBuffer) {
        this.playAudioBuffer(audioBuffer);
      } else {
        // Fallback to generated tones
        this.playGeneratedTone(soundName);
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Play an audio buffer
   */
  private playAudioBuffer(audioBuffer: AudioBuffer): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.value = this.config.volume;
    source.start(0);
  }

  /**
   * Generate and play a tone as fallback
   */
  private playGeneratedTone(soundName: string): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Configure tone based on sound type
    const toneConfig = this.getToneConfig(soundName);
    
    oscillator.frequency.setValueAtTime(toneConfig.frequency, this.audioContext.currentTime);
    oscillator.type = toneConfig.type;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Set volume and timing
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.config.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + toneConfig.duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + toneConfig.duration);
  }

  /**
   * Get tone configuration for different sound types
   */
  private getToneConfig(soundName: string): { frequency: number; duration: number; type: OscillatorType } {
    switch (soundName) {
      case 'success':
        return { frequency: 800, duration: 0.3, type: 'sine' };
      case 'error':
        return { frequency: 200, duration: 0.5, type: 'sawtooth' };
      case 'scan':
        return { frequency: 1200, duration: 0.1, type: 'square' };
      case 'warning':
        return { frequency: 600, duration: 0.4, type: 'triangle' };
      default:
        return { frequency: 440, duration: 0.2, type: 'sine' };
    }
  }

  /**
   * Set audio volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable or disable audio feedback
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioFeedbackConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioCache.clear();
  }
}

// Create and export a singleton instance
const audioFeedbackService = new AudioFeedbackService();
export default audioFeedbackService;
