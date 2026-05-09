// FILE: constants/sounds.js

export const SOUND_ASSETS = {
  'Classic Alarm': require('../assets/sounds/mixkit-classic-alarm-995.wav'),
  'Critical Alarm': require('../assets/sounds/mixkit-critical-alarm-1004.wav'),
  'Facility Alarm': require('../assets/sounds/mixkit-facility-alarm-sound-999.wav'),
  'Street Alarm': require('../assets/sounds/mixkit-street-public-alarm-997.wav'),
  'Warning Buzzer': require('../assets/sounds/mixkit-warning-alarm-buzzer-991.wav'),
  'Default': require('../assets/sounds/mixkit-classic-alarm-995.wav'),
};

export const SOUND_OPTIONS = Object.keys(SOUND_ASSETS).filter(k => k !== 'Default');
