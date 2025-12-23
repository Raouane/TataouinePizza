/**
 * Fonction utilitaire pour jouer un son d'ajout au panier
 * Utilise l'API Web Audio pour générer un son court et discret
 */
export function playAddToCartSound() {
  try {
    // Vérifier que l'API est disponible
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      return;
    }
    
    // Créer un contexte audio
    const audioContext = new AudioContext();
    
    // Si le contexte est suspendu (restriction navigateur), le reprendre
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Créer un oscillateur pour générer un son
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connecter l'oscillateur au gain puis à la sortie
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configuration du son : fréquence, type d'onde, volume
    oscillator.frequency.value = 800; // Fréquence en Hz (son aigu et discret)
    oscillator.type = 'sine'; // Onde sinusoïdale (son doux)
    
    // Enveloppe ADSR pour un son court et naturel
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack rapide (volume 0.3)
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.05); // Decay
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Release
    
    // Démarrer et arrêter le son
    oscillator.start(now);
    oscillator.stop(now + 0.15); // Durée de 150ms
    
    // Nettoyer après la fin
    oscillator.onended = () => {
      try {
        audioContext.close();
      } catch (e) {
        // Ignorer les erreurs de fermeture
      }
    };
  } catch (error) {
    // Ignorer silencieusement les erreurs (navigateur ne supporte pas l'audio, etc.)
    // Ne pas afficher d'erreur en production
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Sounds] Impossible de jouer le son:', error);
    }
  }
}

/**
 * Alternative : Utiliser un fichier audio si disponible
 * À utiliser si vous avez un fichier son personnalisé
 */
export function playAddToCartSoundFromFile() {
  try {
    const audio = new Audio('/sounds/add-to-cart.mp3');
    audio.volume = 0.4;
    audio.play().catch(() => {
      // Fallback vers le son généré si le fichier n'existe pas
      playAddToCartSound();
    });
  } catch (error) {
    // Fallback vers le son généré
    playAddToCartSound();
  }
}
