// FILE: services/AudioService.js
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import { SOUND_ASSETS } from '../constants/sounds';

class AudioService {
  constructor() {
    this.player = null;
    this.setupAudioMode();
    this.preloadSounds();
  }

  async preloadSounds() {
    try {
      console.log('Preloading sound assets...');
      const assets = Object.values(SOUND_ASSETS);
      await Promise.all(assets.map(asset => Asset.fromModule(asset).downloadAsync()));
      console.log('Sound assets preloaded');
    } catch (e) {
      console.error('Preload Error:', e);
    }
  }

  async setupAudioMode() {
    try {
      console.log('Setting up Audio Mode...');
      await setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      console.log('Audio Mode set successfully');
    } catch (e) {
      console.error('AudioMode Error:', e);
    }
  }

  async playAlarm(soundName, loop = false) {
    console.log(`Attempting to play alarm: ${soundName} (loop: ${loop})`);
    try {
      if (this.player) {
        console.log('Releasing previous player');
        this.player.release();
      }

      const asset = SOUND_ASSETS[soundName] || SOUND_ASSETS.Default;
      if (!asset) {
        console.warn(`Sound asset not found for: ${soundName}`);
        return;
      }
      
      console.log('Creating new player with asset:', asset);
      this.player = createAudioPlayer(asset);
      this.player.loop = loop;
      this.player.volume = 1.0;
      
      // Some versions of expo-audio might need a tiny tick to be ready
      setTimeout(() => {
        if (this.player) {
          this.player.play();
          console.log('Player.play() executed after timeout');
        }
      }, 100);

      this.player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && !status.isLooping) {
          console.log('Playback finished, releasing player');
          this.player?.release();
          this.player = null;
        }
      });
    } catch (error) {
      console.error('AudioService Play Error:', error);
    }
  }

  async stopAlarm() {
    console.log('Stopping alarm');
    console.trace('stopAlarm was called at:');
    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch (e) {
        console.error('Stop Error:', e);
      } finally {
        this.player = null;
      }
    }
  }
}

export default new AudioService();
