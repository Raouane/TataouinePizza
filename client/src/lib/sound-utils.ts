/**
 * Utilitaire pour jouer des sons de notification
 */

// Contexte audio global réutilisable
let globalAudioContext: AudioContext | null = null;
let audioInitialized = false;
let audioPermissionGranted = false;

// Charger la permission depuis localStorage au démarrage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('audioPermissionGranted');
  audioPermissionGranted = stored === 'true';
}

/**
 * Vérifie si l'utilisateur a autorisé les notifications sonores
 */
export function hasAudioPermission(): boolean {
  return audioPermissionGranted;
}

/**
 * Active la permission audio (doit être appelé explicitement par l'utilisateur)
 */
export function grantAudioPermission() {
  audioPermissionGranted = true;
  localStorage.setItem('audioPermissionGranted', 'true');
  initAudioContext();
  console.log("[Sound] Permission audio accordée");
}

/**
 * Révoque la permission audio
 */
export function revokeAudioPermission() {
  audioPermissionGranted = false;
  localStorage.setItem('audioPermissionGranted', 'false');
  console.log("[Sound] Permission audio révoquée");
}

/**
 * Détecte si l'appareil est mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768 && 'ontouchstart' in window);
}

/**
 * Initialise et active le contexte audio (doit être appelé après une interaction utilisateur)
 */
export function initAudioContext() {
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("[Sound] Impossible de créer le contexte audio:", error);
      return null;
    }
  }
  
  // Reprendre le contexte s'il est suspendu
  if (globalAudioContext.state === 'suspended') {
    globalAudioContext.resume().then(() => {
      audioInitialized = true;
      console.log("[Sound] Contexte audio activé");
    }).catch(() => {
      console.warn("[Sound] Impossible de reprendre le contexte audio");
    });
  } else {
    audioInitialized = true;
  }
  
  return globalAudioContext;
}

/**
 * Notification visuelle (flash d'écran) pour mobile
 */
function triggerVisualNotification() {
  // Flash d'écran avec overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 165, 0, 0.3);
    z-index: 9999;
    pointer-events: none;
    animation: flash 0.3s ease-out;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes flash {
      0% { opacity: 0; }
      50% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
  
  setTimeout(() => {
    overlay.remove();
    style.remove();
  }, 300);
  
  // Faire clignoter le titre de la page
  const originalTitle = document.title;
  let blinkCount = 0;
  const blinkInterval = setInterval(() => {
    document.title = blinkCount % 2 === 0 ? '🔔 NOUVELLE COMMANDE!' : originalTitle;
    blinkCount++;
    if (blinkCount >= 6) {
      clearInterval(blinkInterval);
      document.title = originalTitle;
    }
  }, 500);
}

/**
 * Joue un bip sonore pour notifier d'une nouvelle commande
 * Utilise l'API Web Audio pour générer un son sans fichier externe
 * Volume augmenté et répétitif, avec notification visuelle sur mobile
 * NE JOUERA LE SON QUE SI LA PERMISSION A ÉTÉ ACCORDÉE
 */
export function playOrderNotificationSound() {
  const isMobile = isMobileDevice();
  
  // Notification visuelle (toujours active)
  triggerVisualNotification();
  
  // Vérifier la permission AVANT de jouer le son
  if (!hasAudioPermission()) {
    console.log("[Sound] Permission audio non accordée, notification visuelle uniquement");
    return;
  }
  
  try {
    // Utiliser le contexte global ou en créer un nouveau
    let audioContext = globalAudioContext;
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      globalAudioContext = audioContext;
    }
    
    // Reprendre le contexte s'il est suspendu
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        // Rejouer le son une fois le contexte activé (si permission accordée)
        if (hasAudioPermission()) {
          playOrderNotificationSound();
        }
      }).catch(() => {
        console.warn("[Sound] Contexte audio suspendu");
      });
      return;
    }
    
    // Paramètres adaptés selon l'appareil
    const frequencies = [800, 1000]; // Hz
    const duration = isMobile ? 250 : 200; // Plus long sur mobile
    const gainValue = isMobile ? 1.0 : 0.8; // Volume max sur mobile
    const repetitions = isMobile ? 5 : 3; // Plus de répétitions sur mobile
    const delayBetweenRepetitions = isMobile ? 200 : 300; // Plus rapide sur mobile
    
    // Répéter le bip plusieurs fois
    for (let rep = 0; rep < repetitions; rep++) {
      setTimeout(() => {
        frequencies.forEach((freq, index) => {
          setTimeout(() => {
            const oscillator = audioContext!.createOscillator();
            const gainNode = audioContext!.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext!.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = audioContext!.currentTime + (index * duration / 1000);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration / 1000);
          }, index * duration);
        });
      }, rep * (delayBetweenRepetitions + frequencies.length * duration));
    }
  } catch (error) {
    console.warn("[Sound] Impossible de jouer le son:", error);
    // Fallback visuel si le son ne fonctionne pas
    triggerVisualNotification();
    
    // Fallback Audio HTML5
    try {
      for (let i = 0; i < (isMobile ? 5 : 3); i++) {
        setTimeout(() => {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKzn8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknU4MDlCs5/C2YxwGOJHX8sx5LAUkd8fw3ZBAC');
          audio.volume = isMobile ? 1.0 : 0.8;
          audio.play().catch(() => {
            // Ignorer les erreurs
          });
        }, i * (isMobile ? 400 : 500));
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  }
}

/**
 * Joue un son de succès (pour confirmation d'action)
 */
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Ignorer les erreurs
  }
}

