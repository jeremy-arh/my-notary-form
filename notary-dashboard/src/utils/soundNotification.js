/**
 * Utility for playing sound notifications
 * Plays a notification sound when a new message is received
 */

let audioContext = null;
let notificationSound = null;

/**
 * Initialize the audio context (required for playing sounds)
 */
const initAudioContext = () => {
  if (!audioContext) {
    // Create AudioContext if not already created
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Create a simple notification sound (beep)
 * Uses Web Audio API to generate a pleasant notification sound
 */
const createNotificationSound = () => {
  const ctx = initAudioContext();
  
  // Create oscillator for the beep sound
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Configure sound
  oscillator.frequency.value = 800; // Frequency in Hz (pleasant beep)
  oscillator.type = 'sine'; // Sine wave for smooth sound
  
  // Configure gain (volume) with fade in/out
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01); // Fade in
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); // Fade out
  
  // Play the sound
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
};

/**
 * Play notification sound
 * This function can be called when a new message is received
 */
export const playNotificationSound = () => {
  try {
    // Check if user has interacted with the page (required for autoplay policy)
    // If not, we'll try to play anyway, but it might not work until user interaction
    createNotificationSound();
  } catch (error) {
    console.warn('Could not play notification sound:', error);
    // Fallback: Try using HTML5 Audio if Web Audio API fails
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHm7A7+OZUBALSKTf8sBtJQUzf87y24EzBiFuwO/jmVAQC0ik3/LA')
      audio.volume = 0.3;
      audio.play().catch(err => {
        console.warn('Could not play fallback notification sound:', err);
      });
    } catch (fallbackError) {
      console.warn('Could not play fallback notification sound:', fallbackError);
    }
  }
};

/**
 * Play notification sound only if user is not on the messages page
 * This prevents sound from playing when user is already viewing messages
 */
export const playNotificationSoundIfNeeded = (isOnMessagesPage = false) => {
  if (!isOnMessagesPage) {
    playNotificationSound();
  }
};

