/**
 * Utilitaire pour jouer des sons de notification
 */

import { playCustomSound, stopCustomSound, isInForeground } from './pwa-sound-manager';

// Contexte audio global réutilisable
let globalAudioContext: AudioContext | null = null;
let audioInitialized = false;
let audioPermissionGranted = false;
let notificationPermissionGranted = false;

// Charger la permission depuis localStorage au démarrage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('audioPermissionGranted');
  audioPermissionGranted = stored === 'true';
  
  // Vérifier la permission des notifications système
  if ('Notification' in window) {
    notificationPermissionGranted = Notification.permission === 'granted';
  }
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
  
  // Initialiser le contexte audio immédiatement
  const context = initAudioContext();
  if (context) {
    console.log("[Sound] Permission audio accordée, contexte audio initialisé");
    
    // S'assurer que le contexte est actif
    if (context.state === 'suspended') {
      context.resume().then(() => {
        console.log("[Sound] Contexte audio activé après accord de permission");
      }).catch((error) => {
        console.error("[Sound] Erreur lors de l'activation du contexte:", error);
      });
    }
  } else {
    console.warn("[Sound] Permission accordée mais impossible d'initialiser le contexte");
  }
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
 * Vérifie si les notifications système sont supportées
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Vérifie si l'utilisateur a autorisé les notifications système
 */
export function hasNotificationPermission(): boolean {
  if (!areNotificationsSupported()) return false;
  return Notification.permission === 'granted';
}

/**
 * Demande la permission pour les notifications système
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.warn("[Notifications] Les notifications ne sont pas supportées");
    return false;
  }
  
  if (Notification.permission === 'granted') {
    notificationPermissionGranted = true;
    return true;
  }
  
  if (Notification.permission === 'denied') {
    console.warn("[Notifications] Permission refusée par l'utilisateur");
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    notificationPermissionGranted = permission === 'granted';
    return notificationPermissionGranted;
  } catch (error) {
    console.error("[Notifications] Erreur lors de la demande de permission:", error);
    return false;
  }
}

/**
 * Envoie une notification système avec son
 */
function sendSystemNotification(title: string, body: string, options?: NotificationOptions) {
  if (!hasNotificationPermission()) {
    console.log("[Notifications] Permission non accordée, notification système ignorée");
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico', // Icône de l'application
      badge: '/favicon.ico',
      tag: 'new-order', // Tag pour éviter les doublons
      requireInteraction: true, // Nécessite une interaction pour se fermer
      silent: false, // Activer le son système
      ...options,
    });
    
    // Fermer automatiquement après 10 secondes
    setTimeout(() => {
      notification.close();
    }, 10000);
    
    // Ouvrir l'application quand on clique sur la notification
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    console.log("[Notifications] Notification système envoyée");
  } catch (error) {
    console.error("[Notifications] Erreur lors de l'envoi de la notification:", error);
  }
}

/**
 * Démarre la répétition de notifications via Service Worker
 * Fonctionne même quand l'écran est éteint ou l'app en arrière-plan
 */
export function startNotificationRepeatViaSW(orderId: string, interval: number) {
  if ('serviceWorker' in navigator) {
    // Attendre que le Service Worker soit prêt
    navigator.serviceWorker.ready.then((registration) => {
      // Envoyer le message au Service Worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'START_NOTIFICATION_REPEAT',
          orderId,
          interval,
        });
        console.log(`[Notifications] 🔔 Répétition notification démarrée via SW pour ${orderId}, intervalle: ${interval}ms`);
      } else {
        console.warn("[Notifications] ⚠️ Service Worker actif non disponible");
        // Essayer avec le controller
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'START_NOTIFICATION_REPEAT',
            orderId,
            interval,
          });
          console.log(`[Notifications] 🔔 Répétition notification démarrée via SW controller pour ${orderId}`);
        }
      }
    }).catch((error) => {
      console.error("[Notifications] ❌ Erreur lors de l'envoi au Service Worker:", error);
    });
  } else {
    console.warn("[Notifications] ⚠️ Service Worker non disponible pour répétition");
  }
}

/**
 * Arrête la répétition de notifications via Service Worker
 */
export function stopNotificationRepeatViaSW(orderId: string) {
  if ('serviceWorker' in navigator) {
    // Attendre que le Service Worker soit prêt
    navigator.serviceWorker.ready.then((registration) => {
      // Envoyer le message au Service Worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'STOP_NOTIFICATION_REPEAT',
          orderId,
        });
        console.log(`[Notifications] ⏹️ Répétition notification arrêtée via SW pour ${orderId}`);
      } else {
        // Essayer avec le controller
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'STOP_NOTIFICATION_REPEAT',
            orderId,
          });
          console.log(`[Notifications] ⏹️ Répétition notification arrêtée via SW controller pour ${orderId}`);
        }
      }
    }).catch((error) => {
      console.error("[Notifications] ❌ Erreur lors de l'envoi au Service Worker:", error);
    });
  } else {
    console.warn("[Notifications] ⚠️ Service Worker non disponible pour arrêt");
  }
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
  
  console.log("[Sound] 🔊 playOrderNotificationSound appelé");
  console.log("[Sound] 📱 Appareil mobile:", isMobile);
  console.log("[Sound] ✅ Permission audio:", hasAudioPermission());
  console.log("[Sound] ✅ Permission notifications:", hasNotificationPermission());
  console.log("[Sound] ⏰ Timestamp:", new Date().toISOString());
  console.log("[Sound] 🎯 App en foreground:", isInForeground());
  
  // Notification visuelle (toujours active)
  triggerVisualNotification();
  
  // Si l'app est en foreground et permission accordée, jouer le son personnalisé
  if (isInForeground() && hasAudioPermission()) {
    console.log("[Sound] 🎵 App en foreground, lecture son personnalisé");
    playCustomSound(true, 5000); // Répéter toutes les 5 secondes
  }
  
  // Notification système (fonctionne même en arrière-plan)
  // Le Service Worker gérera le son système automatiquement quand l'app est en background
  if (hasNotificationPermission()) {
    sendSystemNotification(
      '🔔 Nouvelle commande!',
      'Une nouvelle commande est disponible',
      {
        vibrate: isMobile ? [200, 100, 200, 100, 200] : undefined,
      }
    );
  }
  
  // Vérifier la permission AVANT de jouer le son Web Audio (fallback)
  if (!hasAudioPermission()) {
    console.log("[Sound] Permission audio non accordée, notification visuelle uniquement");
    return;
  }
  
  // Fallback Web Audio uniquement si pas déjà géré par playCustomSound
  if (!isInForeground()) {
    console.log("[Sound] App en background, son géré par Service Worker");
    return;
  }
  
  try {
    // Utiliser le contexte global ou en créer un nouveau
    let audioContext = globalAudioContext;
    
    if (!audioContext) {
      console.log("[Sound] Création d'un nouveau contexte audio");
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      globalAudioContext = audioContext;
    }
    
    console.log("[Sound] État du contexte audio:", audioContext.state);
    
    // Fonction interne pour jouer le son une fois le contexte prêt
    const playSoundOnceReady = async (context: AudioContext) => {
      if (context.state === 'suspended') {
        console.log("[Sound] ⚠️ Contexte suspendu");
        
        // Utiliser directement le fallback Audio HTML5 car resume() peut échouer ou prendre trop de temps
        // Le fallback Audio HTML5 est plus fiable sur tous les appareils quand le contexte est suspendu
        console.log("[Sound] 🔊 Utilisation directe du fallback Audio HTML5 (contexte suspendu)");
        playFallbackSound(isMobile);
        return;
        
        // Note: On pourrait essayer de reprendre le contexte, mais sur mobile/web,
        // resume() peut échouer silencieusement ou prendre trop de temps.
        // Le fallback Audio HTML5 est plus fiable dans ce cas.
      } else {
        console.log("[Sound] ✅ Contexte actif, lecture immédiate");
        playSoundWithContext(audioContext, isMobile);
      }
    };
    
    // Jouer le son avec le contexte actif
    playSoundOnceReady(audioContext);
  } catch (error) {
    console.error("[Sound] Erreur lors de la lecture du son:", error);
    // Fallback Audio HTML5
    playFallbackSound(isMobile);
  }
}

// Fonction helper pour le fallback Audio HTML5
function playFallbackSound(isMobile: boolean) {
  console.log("[Sound] 🔊 Utilisation du fallback Audio HTML5");
  try {
    const repetitions = isMobile ? 5 : 3;
    const delayBetweenRepetitions = isMobile ? 400 : 500;
    
    for (let i = 0; i < repetitions; i++) {
      setTimeout(() => {
        try {
          // Créer un nouveau Audio à chaque fois pour éviter les problèmes de réutilisation
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKzn8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknU4MDlCs5/C2YxwGOJHX8sx5LAUkd8fw3ZBAC');
          audio.volume = isMobile ? 1.0 : 0.8;
          console.log(`[Sound] 🔊 Fallback Audio HTML5 - Répétition ${i + 1}/${repetitions}`);
          audio.play()
            .then(() => {
              console.log(`[Sound] ✅ Fallback Audio HTML5 joué avec succès - Répétition ${i + 1}`);
            })
            .catch((err) => {
              console.error(`[Sound] ❌ Erreur Audio HTML5 répétition ${i + 1}:`, err);
            });
        } catch (e) {
          console.error(`[Sound] ❌ Erreur création Audio HTML5 répétition ${i + 1}:`, e);
        }
      }, i * delayBetweenRepetitions);
    }
  } catch (e) {
    console.error("[Sound] ❌ Erreur fallback Audio HTML5:", e);
  }
}

/**
 * Fonction helper pour jouer le son avec un contexte audio donné
 */
function playSoundWithContext(audioContext: AudioContext, isMobile: boolean) {
  console.log("[Sound] playSoundWithContext appelé");
  console.log("[Sound] État du contexte avant lecture:", audioContext.state);
  
  // S'assurer que le contexte est actif AVANT de jouer
  if (audioContext.state !== 'running') {
    console.warn("[Sound] Contexte pas actif:", audioContext.state, "- Tentative de reprise...");
    audioContext.resume()
      .then(() => {
        console.log("[Sound] ✅ Contexte repris avec succès, état:", audioContext.state);
        // Si le contexte est maintenant actif, jouer le son
        if (audioContext.state === 'running') {
          playSoundImmediately(audioContext, isMobile);
        } else {
          console.warn("[Sound] ⚠️ Contexte toujours pas actif après resume:", audioContext.state);
          // Fallback vers Audio HTML5
          console.log("[Sound] Utilisation du fallback Audio HTML5");
          playFallbackSound(isMobile);
        }
      })
      .catch((error) => {
        console.error("[Sound] ❌ Erreur lors de la reprise du contexte:", error);
        // Fallback vers Audio HTML5
        console.log("[Sound] Utilisation du fallback Audio HTML5");
        playFallbackSound(isMobile);
      });
    return; // Ne pas continuer si le contexte n'est pas actif
  }
  
  // Si le contexte est déjà actif, jouer immédiatement
  playSoundImmediately(audioContext, isMobile);
}

// Fonction helper pour jouer le son immédiatement (contexte supposé actif)
function playSoundImmediately(audioContext: AudioContext, isMobile: boolean) {
  console.log("[Sound] playSoundImmediately appelé - Contexte actif");
  
  // Paramètres adaptés selon l'appareil
  const frequencies = [800, 1000]; // Hz
  const duration = isMobile ? 250 : 200; // ms
  const gainValue = isMobile ? 1.0 : 0.8; // Volume max
  const repetitions = isMobile ? 5 : 3; // Répétitions
  const delayBetweenRepetitions = isMobile ? 200 : 300; // ms
  
  console.log("[Sound] Paramètres:", { frequencies, duration, gainValue, repetitions });
  
  // Vérifier une dernière fois que le contexte est actif avant de jouer
  if (audioContext.state !== 'running') {
    console.error("[Sound] ❌ Contexte pas actif au moment de jouer:", audioContext.state);
    console.log("[Sound] Utilisation du fallback Audio HTML5");
    playFallbackSound(isMobile);
    return;
  }
  
  // Répéter le bip plusieurs fois
  for (let rep = 0; rep < repetitions; rep++) {
    const repDelay = rep * (delayBetweenRepetitions + frequencies.length * duration);
    
    setTimeout(() => {
      // Vérifier à nouveau avant chaque répétition
      if (audioContext.state !== 'running') {
        console.warn(`[Sound] ⚠️ Contexte suspendu avant répétition ${rep + 1}, utilisation fallback`);
        playFallbackSound(isMobile);
        return;
      }
      
      frequencies.forEach((freq, index) => {
        const toneDelay = index * duration;
        
        setTimeout(() => {
          try {
            // Vérifier une dernière fois avant de créer l'oscillateur
            if (audioContext.state !== 'running') {
              console.warn(`[Sound] ⚠️ Contexte suspendu avant fréquence ${freq}Hz`);
              return;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const now = audioContext.currentTime;
            const startTime = now + 0.01; // Démarrer presque immédiatement
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration / 1000);
            
            console.log(`[Sound] ✅ Son joué: répétition ${rep + 1}/${repetitions}, fréquence ${freq}Hz`);
          } catch (error) {
            console.error(`[Sound] ❌ Erreur oscillateur:`, error);
            // Fallback pour cette répétition
            playFallbackSound(isMobile);
          }
        }, toneDelay);
      });
    }, repDelay);
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

