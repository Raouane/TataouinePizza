import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Smartphone, Bell } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Détecter si l'app est déjà installée
    const checkIfInstalled = () => {
      // Vérifier display-mode: standalone
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      // Vérifier si lancé depuis l'écran d'accueil (iOS)
      const isStandaloneIOS = (window.navigator as any).standalone === true;
      
      return isStandalone || isStandaloneIOS;
    };

    const installed = checkIfInstalled();
    setIsInstalled(installed);

    // Détecter si l'utilisateur est un livreur
    const driverToken = localStorage.getItem("driverToken");
    setIsDriver(!!driverToken);

    // Vérifier si le prompt a été refusé aujourd'hui
    const dismissedDate = localStorage.getItem("pwaInstallDismissed");
    let dismissed = false;
    if (dismissedDate) {
      const dismissedDateObj = new Date(dismissedDate);
      const today = new Date();
      const isSameDay = dismissedDateObj.toDateString() === today.toDateString();
      dismissed = isSameDay;
    }
    setIsDismissed(dismissed);

    // Écouter l'événement beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Afficher le prompt si pas déjà installé et pas refusé aujourd'hui
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
      localStorage.removeItem("pwaInstallDismissed");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Pour iOS et autres navigateurs qui ne supportent pas beforeinstallprompt
    // Afficher le prompt après un délai si l'app n'est pas installée
    if (!installed && !dismissed) {
      const timer = setTimeout(() => {
        // Vérifier à nouveau si installé (au cas où l'utilisateur l'a installé entre-temps)
        if (!checkIfInstalled() && !localStorage.getItem("pwaInstallDismissed")) {
          setShowPrompt(true);
        }
      }, 3000); // Afficher après 3 secondes

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback pour iOS (instructions manuelles)
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert(
          "Pour installer l'application sur iOS:\n\n" +
          "1. Appuyez sur le bouton Partager (📤)\n" +
          "2. Sélectionnez 'Sur l'écran d'accueil'\n" +
          "3. Confirmez l'ajout"
        );
        setShowPrompt(false);
        setIsDismissed(true);
        localStorage.setItem("pwaInstallDismissed", new Date().toISOString());
        return;
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        console.log("[PWA] ✅ Installation acceptée");
        setShowPrompt(false);
        setIsInstalled(true);
        localStorage.removeItem("pwaInstallDismissed");
      } else {
        console.log("[PWA] ❌ Installation refusée");
        setShowPrompt(false);
        setIsDismissed(true);
        localStorage.setItem("pwaInstallDismissed", new Date().toISOString());
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error("[PWA] Erreur lors de l'installation:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem("pwaInstallDismissed", new Date().toISOString());
  };

  // Ne pas afficher si déjà installé ou refusé aujourd'hui
  if (isInstalled || !showPrompt) {
    return null;
  }

  // Pour iOS et navigateurs sans beforeinstallprompt, on peut quand même afficher le prompt
  // avec des instructions manuelles
  const canShowManualInstructions = !deferredPrompt && (/iPhone|iPad|iPod/.test(navigator.userAgent) || /Safari/.test(navigator.userAgent));

  // Message spécial pour les livreurs
  const title = isDriver 
    ? "📦 Installe l'application JIBLI"
    : "📦 Installe l'application";
  
  const description = isDriver
    ? "Pour recevoir les commandes avec sonnerie automatique, notifications fiables et fonctionnement en arrière-plan, installe l'application sur ton téléphone."
    : "Installe l'application pour une meilleure expérience : notifications, fonctionnement hors ligne et accès rapide.";

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-2 border-orange-500 bg-white animate-in slide-in-from-bottom-5">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-orange-100 p-2 rounded-full">
              {isDriver ? (
                <Bell className="w-5 h-5 text-orange-600" />
              ) : (
                <Smartphone className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {canShowManualInstructions ? "Voir instructions" : "Installer maintenant"}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Plus tard
          </Button>
        </div>
      </div>
    </Card>
  );
}

