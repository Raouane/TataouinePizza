/**
 * Configuration de l'onboarding
 * 
 * ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
 * 
 * Pour réactiver l'onboarding :
 * 1. Ajouter VITE_ENABLE_ONBOARDING=true dans .env
 * 2. Redémarrer l'application
 * 
 * @see docs/ONBOARDING_CONFIG.md pour plus de détails
 */

/**
 * Vérifie si l'onboarding est activé
 * 
 * Dans Vite, les variables d'environnement doivent être préfixées par VITE_
 * pour être accessibles côté client.
 * 
 * @returns true si VITE_ENABLE_ONBOARDING=true, false sinon (désactivé par défaut pour MVP)
 */
export function isOnboardingEnabled(): boolean {
  // Vite expose les variables d'environnement via import.meta.env
  // VITE_ENABLE_ONBOARDING doit être défini dans .env
  return import.meta.env.VITE_ENABLE_ONBOARDING === "true";
}

/**
 * Vérifie si l'utilisateur a complété l'onboarding
 * 
 * Si l'onboarding est désactivé, retourne toujours true (accès direct à l'app).
 * Sinon, vérifie si les données d'onboarding existent dans localStorage.
 * 
 * @returns true si onboarding complété ou désactivé, false sinon
 * 
 * @deprecated Utiliser directement isOnboardingEnabled() dans useOnboarding()
 * Cette fonction est conservée pour compatibilité future
 */
export function shouldSkipOnboarding(): boolean {
  // Si l'onboarding est désactivé, toujours autoriser l'accès
  if (!isOnboardingEnabled()) {
    return true;
  }

  // Sinon, vérifier si l'utilisateur a complété l'onboarding
  try {
    const { getOnboarding } = require("@/pages/onboarding");
    return !!getOnboarding();
  } catch {
    // Si le module n'est pas disponible, autoriser l'accès (fallback)
    return true;
  }
}

