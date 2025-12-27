/**
 * Composant PWA Install Prompt - Version refactorisée et améliorée
 * 
 * Design moderne avec animations douces
 * Support multilingue (FR, EN, AR)
 * Son optionnel
 * Réutilisable et maintenable
 * 
 * ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useLanguage } from "@/lib/i18n";
import { playCustomSound } from "@/lib/pwa-sound-manager";

interface PwaInstallPromptProps {
  /**
   * Langue pour les traductions (optionnel, utilise le contexte par défaut)
   */
  language?: "fr" | "en" | "ar";
  
  /**
   * Activer le son de notification (défaut: true)
   */
  enableSound?: boolean;
  
  /**
   * Délai avant d'afficher le prompt pour iOS/Safari (ms, défaut: 3000)
   */
  showDelay?: number;
  
  /**
   * Position du prompt (défaut: "bottom")
   */
  position?: "bottom" | "top";
}

/**
 * Composant PWA Install Prompt amélioré
 * 
 * @example
 * ```tsx
 * <PwaInstallPrompt
 *   enableSound={true}
 *   showDelay={3000}
 * />
 * ```
 */
export function PwaInstallPrompt({
  enableSound = true,
  showDelay = 3000,
  position = "bottom",
}: PwaInstallPromptProps) {
  const { t, language } = useLanguage();
  const {
    deferredPrompt,
    showPrompt,
    isInstalled,
    handleInstall,
    handleDismiss,
    isIOS,
    isSafari,
  } = usePwaInstall(showDelay);

  const soundPlayedRef = useRef(false);

  // Jouer le son une seule fois à l'affichage
  useEffect(() => {
    if (showPrompt && enableSound && !soundPlayedRef.current) {
      playCustomSound(false); // Ne pas répéter
      soundPlayedRef.current = true;
    }
  }, [showPrompt, enableSound]);

  // Ne rien afficher si déjà installé ou pas de prompt à afficher
  if (isInstalled || !showPrompt) {
    return null;
  }

  // Pour les navigateurs non-iOS, ne pas afficher si pas de deferredPrompt
  if (!deferredPrompt && !isIOS && !isSafari) {
    return null;
  }

  const message = t("pwa.install.message");
  const installButtonText = deferredPrompt
    ? t("pwa.install.button")
    : t("pwa.install.instructions");
  const laterButtonText = t("pwa.install.later");

  // Animation variants pour un effet slide doux
  const slideVariants = {
    hidden: {
      opacity: 0,
      y: position === "bottom" ? 100 : -100,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      y: position === "bottom" ? 100 : -100,
      scale: 0.9,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={slideVariants}
          className={`fixed ${position === "bottom" ? "bottom-4" : "top-4"} left-4 right-4 md:left-auto md:right-4 md:w-96 z-50`}
        >
          {/* Overlay avec backdrop blur (optionnel, pour un effet premium) */}
          <div className="absolute inset-0 bg-black/5 backdrop-blur-sm rounded-2xl -z-10" />
          
          {/* Card principale avec design moderne */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
            {/* Gradient accent en haut */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
            
            <div className="p-5 space-y-4">
              {/* Header avec icône et bouton fermer */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icône avec background gradient */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl blur-sm opacity-50" />
                    <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Message */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                      {message}
                    </p>
                  </div>
                </div>
                
                {/* Bouton fermer */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0 flex-shrink-0 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label={laterButtonText}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  size="default"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {installButtonText}
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="default"
                  className="flex-1 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {laterButtonText}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
