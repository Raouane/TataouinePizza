import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Composant qui scroll automatiquement en haut de la page
 * à chaque changement de route (SPA behavior)
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll en haut de la page à chaque changement de route
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // Instantané pour une meilleure UX
    });
  }, [location]);

  return null;
}



