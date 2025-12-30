/**
 * Gestionnaire de son pour PWA
 * - Son personnalisé (MP3/WAV) quand l'app est en foreground
 * - Son système natif quand l'app est en background (via Service Worker)
 */

let customSoundAudio: HTMLAudioElement | null = null;
let soundInterval: NodeJS.Timeout | null = null;
let isAppInForeground = true;

// Détecter si l'app est en foreground ou background
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    isAppInForeground = !document.hidden;
    console.log('[Sound] App en foreground:', isAppInForeground);
  });
}

/**
 * Charge le fichier audio personnalisé
 */
function loadCustomSound(): HTMLAudioElement {
  if (!customSoundAudio) {
    // Créer un Audio HTML5 avec un son généré (data URI)
    // Vous pouvez remplacer par un fichier MP3/WAV réel si vous en avez un
    customSoundAudio = new Audio();
    // Si vous avez un fichier audio, utilisez-le :
    // customSoundAudio.src = '/sounds/notification.mp3';
    // Sinon, utilisez un data URI (son généré)
    customSoundAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKzn8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknU4MDlCs5/C2YxwGOJHX8sx5LAUkd8fw3ZBAC';
    customSoundAudio.volume = 0.8;
    customSoundAudio.preload = 'auto';
  }
  return customSoundAudio;
}

/**
 * Joue le son personnalisé (uniquement en foreground)
 */
export function playCustomSound(repeat: boolean = false, interval: number = 35000) {
  if (!isAppInForeground) {
    console.log('[Sound] App en background, son personnalisé ignoré (utilise notification système)');
    return;
  }

  const audio = loadCustomSound();
  
  const playOnce = () => {
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error('[Sound] Erreur lecture son personnalisé:', error);
    });
  };

  // Jouer immédiatement
  playOnce();

  // Répéter si demandé
  if (repeat) {
    if (soundInterval) {
      clearInterval(soundInterval);
    }
    soundInterval = setInterval(() => {
      if (isAppInForeground) {
        playOnce();
      } else {
        // Arrêter la répétition si l'app passe en background
        stopCustomSound();
      }
    }, interval);
  }
}

/**
 * Arrête le son personnalisé répétitif
 */
export function stopCustomSound() {
  if (soundInterval) {
    clearInterval(soundInterval);
    soundInterval = null;
  }
  if (customSoundAudio) {
    customSoundAudio.pause();
    customSoundAudio.currentTime = 0;
  }
}

/**
 * Vérifie si l'app est en foreground
 */
export function isInForeground(): boolean {
  return isAppInForeground;
}

