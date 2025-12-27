/**
 * Hook personnalisé pour gérer l'installation PWA
 * 
 * Sépare la logique métier de l'UI pour une meilleure réutilisabilité
 */

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePwaInstallReturn {
  deferredPrompt: BeforeInstallPromptEvent | null;
  showPrompt: boolean;
  isInstalled: boolean;
  isDismissed: boolean;
  handleInstall: () => Promise<void>;
  handleDismiss: () => void;
  isIOS: boolean;
  isSafari: boolean;
}

const STORAGE_KEY = "pwaInstallDismissed";

/**
 * Vérifie si l'app est déjà installée
 */
function checkIfInstalled(): boolean {
  // Vérifier display-mode: standalone
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  // Vérifier si lancé depuis l'écran d'accueil (iOS)
  const isStandaloneIOS = (window.navigator as any).standalone === true;
  
  return isStandalone || isStandaloneIOS;
}

/**
 * Vérifie si le prompt a été refusé aujourd'hui
 */
function checkIfDismissedToday(): boolean {
  const dismissedDate = localStorage.getItem(STORAGE_KEY);
  if (!dismissedDate) return false;
  
  const dismissedDateObj = new Date(dismissedDate);
  const today = new Date();
  return dismissedDateObj.toDateString() === today.toDateString();
}

/**
 * Marque le prompt comme refusé pour aujourd'hui
 */
function markAsDismissed(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

/**
 * Supprime le marqueur de refus
 */
function clearDismissed(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Détecte si l'appareil est iOS
 */
function detectIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Détecte si le navigateur est Safari
 */
function detectSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

/**
 * Hook pour gérer l'installation PWA
 * 
 * @param showDelay Délai en ms avant d'afficher le prompt (pour iOS/Safari)
 * @returns État et fonctions pour gérer l'installation
 */
export function usePwaInstall(showDelay: number = 3000): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isIOS = detectIOS();
  const isSafari = detectSafari();

  useEffect(() => {
    // Vérifier si déjà installé
    const installed = checkIfInstalled();
    setIsInstalled(installed);

    // Vérifier si refusé aujourd'hui
    const dismissed = checkIfDismissedToday();
    setIsDismissed(dismissed);

    // Si déjà installé ou refusé, ne pas continuer
    if (installed || dismissed) {
      return;
    }

    // Écouter l'événement beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Afficher le prompt si pas déjà installé et pas refusé
      if (!installed && !dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      clearDismissed();
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Pour iOS/Safari uniquement : afficher le prompt après un délai
    let timer: NodeJS.Timeout | null = null;
    if ((isIOS || isSafari) && !installed && !dismissed) {
      timer = setTimeout(() => {
        // Vérifier à nouveau si installé (au cas où l'utilisateur l'a installé entre-temps)
        if (!checkIfInstalled() && !checkIfDismissedToday()) {
          setShowPrompt(true);
        }
      }, showDelay);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [showDelay, isIOS, isSafari]);

  const handleInstall = useCallback(async () => {
    // Si deferredPrompt est disponible, l'utiliser pour installer directement
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === "accepted") {
          console.log("[PWA] ✅ Installation acceptée");
          setShowPrompt(false);
          setIsInstalled(true);
          clearDismissed();
        } else {
          console.log("[PWA] ❌ Installation refusée");
          setShowPrompt(false);
          setIsDismissed(true);
          markAsDismissed();
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error("[PWA] Erreur lors de l'installation:", error);
        // En cas d'erreur, essayer de déclencher le prompt natif du navigateur
        alert("Erreur lors de l'installation. Veuillez utiliser le menu du navigateur pour installer l'application.");
      }
      return;
    }

    // Fallback pour iOS/Safari (instructions manuelles)
    if (isIOS || isSafari) {
      alert(
        "Pour installer l'application:\n\n" +
        "1. Appuyez sur le bouton Partager (📤) dans la barre d'adresse\n" +
        "2. Sélectionnez 'Sur l'écran d'accueil' ou 'Ajouter à l'écran d'accueil'\n" +
        "3. Confirmez l'ajout"
      );
      setShowPrompt(false);
      setIsDismissed(true);
      markAsDismissed();
      return;
    }

    // Si on arrive ici, c'est qu'il n'y a pas de deferredPrompt et ce n'est pas iOS
    console.warn("[PWA] deferredPrompt non disponible et ce n'est pas iOS");
  }, [deferredPrompt, isIOS, isSafari]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setIsDismissed(true);
    markAsDismissed();
  }, []);

  return {
    deferredPrompt,
    showPrompt: showPrompt && !isInstalled && !isDismissed,
    isInstalled,
    isDismissed,
    handleInstall,
    handleDismiss,
    isIOS,
    isSafari,
  };
}

