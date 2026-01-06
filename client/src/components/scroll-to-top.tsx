/**
 * ============================================================================
 * COMPOSANT SCROLL TO TOP - INTÉGRATION AVEC LA NAVIGATION WOUTER
 * ============================================================================
 * 
 * Ce composant assure que la page scroll automatiquement en haut lors des
 * changements de route dans la PWA.
 * 
 * UTILISATION DE LA NAVIGATION:
 * - Utilise useLocation() de wouter pour détecter les changements de route
 * - Écoute les changements de location pour déclencher le scroll
 * - Essentiel pour les SPA (Single Page Applications) car le scroll persiste
 *   entre les navigations sans rechargement de page
 * 
 * FONCTIONNEMENT:
 * 1. Le hook useLocation() retourne [location, setLocation]
 * 2. On utilise seulement location pour détecter les changements
 * 3. À chaque changement de location, on scroll en haut de la page
 * 
 * INTÉGRATION:
 * - Utilisé dans App.tsx, rendu au niveau racine
 * - Fonctionne pour toutes les routes de l'application
 * - Compatible avec la navigation wouter (pas de conflit)
 * 
 * ============================================================================
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Composant qui scroll automatiquement en haut de la page
 * à chaque changement de route (SPA behavior)
 * 
 * NAVIGATION WOUTER:
 * - useLocation() détecte les changements de route
 * - location change à chaque navigation (Link, setLocation, etc.)
 * - useEffect déclenche le scroll à chaque changement
 */
export default function ScrollToTop() {
  const [location] = useLocation(); // Lecture de la route actuelle via wouter

  useEffect(() => {
    // Scroll en haut de la page à chaque changement de route
    // Essentiel pour les SPA car le scroll persiste entre navigations
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // Instantané pour une meilleure UX
    });
  }, [location]); // Déclenché à chaque changement de route

  return null;
}



