/**
 * Utilitaires côté client pour le statut des restaurants
 * Utilise les données calculées côté serveur si disponibles
 */

interface Restaurant {
  isOpen?: boolean | null;
  openingHours?: string | null;
  computedStatus?: {
    isOpen: boolean;
    reason?: 'toggle' | 'hours' | 'closedDay';
  };
}

/**
 * Vérifie si un restaurant est ouvert
 * Utilise computedStatus si disponible (calculé côté serveur)
 * Sinon, recalcule côté client (fallback)
 */
export function isRestaurantOpen(restaurant: Restaurant): boolean {
  // Priorité : utiliser le statut calculé côté serveur
  if (restaurant.computedStatus !== undefined) {
    // Log pour débogage uniquement pour BOUBA
    const restaurantName = (restaurant as any).name || 'Unknown';
    const shouldLog = restaurantName.toLowerCase().includes('bouba');
    if (shouldLog) {
      console.log(`[Client] isRestaurantOpen - ${restaurantName} - Utilise computedStatus:`, restaurant.computedStatus);
    }
    return restaurant.computedStatus.isOpen;
  }
  
  // Fallback : calcul côté client (même logique que serveur)
  const restaurantName = (restaurant as any).name || 'Unknown';
  const shouldLog = restaurantName.toLowerCase().includes('bouba');
  if (shouldLog) {
    console.log(`[Client] isRestaurantOpen - ${restaurantName} - Fallback calcul client`);
  }
  return isRestaurantOpenClient(restaurant);
}

interface OpeningHoursJSON {
  open: string;
  close: string;
  closedDay?: string | null;
}

function parseOpeningHoursInternal(openingHours?: string | null): OpeningHoursJSON | null {
  if (!openingHours || openingHours.trim() === '') return null;
  
  // Essayer de parser comme JSON d'abord (nouveau format)
  if (openingHours.trim().startsWith('{')) {
    try {
      return JSON.parse(openingHours) as OpeningHoursJSON;
    } catch {
      // Si le JSON est invalide, essayer l'ancien format
    }
  }
  
  // Ancien format texte (compatibilité)
  const parts = openingHours.split('|');
  const hours = parts[0]?.trim();
  const closedDay = parts[1]?.trim() || null;
  
  if (!hours) return null;
  
  const [open, close] = hours.split('-');
  if (!open || !close) return null;
  
  return {
    open: open.trim(),
    close: close.trim(),
    closedDay
  };
}

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return 0;
  return hour * 60 + minute;
}

function isRestaurantOpenClient(restaurant: Restaurant): boolean {
  const restaurantName = (restaurant as any).name || 'Unknown';
  const shouldLog = restaurantName.toLowerCase().includes('bouba');
  
  if (restaurant.isOpen === false || restaurant.isOpen === null) {
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Fermé via toggle`);
    return false;
  }
  
  if (!restaurant.openingHours) {
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Pas d'horaires, statut selon toggle:`, restaurant.isOpen === true);
    return restaurant.isOpen === true;
  }
  
  const parsedHours = parseOpeningHoursInternal(restaurant.openingHours);
  if (!parsedHours) {
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Parsing échoué, statut selon toggle:`, restaurant.isOpen === true);
    return restaurant.isOpen === true;
  }
  
  if (shouldLog) {
    console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Horaires parsés:`, parsedHours);
  }
  
  // Vérifier le jour de repos
  if (parsedHours.closedDay) {
    const now = new Date();
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDay = dayNames[now.getDay()];
    if (currentDay === parsedHours.closedDay) {
      if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Fermé - jour de repos (${parsedHours.closedDay})`);
      return false;
    }
  }
  
  // Vérifier les heures
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const openTimeMinutes = parseTimeToMinutes(parsedHours.open);
  const closeTimeMinutes = parseTimeToMinutes(parsedHours.close);
  
  if (shouldLog) {
    console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Heure actuelle: ${now.getHours()}:${now.getMinutes()} (${currentTimeMinutes} min)`);
    console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Ouverture: ${parsedHours.open} (${openTimeMinutes} min), Fermeture: ${parsedHours.close} (${closeTimeMinutes} min)`);
  }
  
  if (openTimeMinutes === 0 && parsedHours.open !== "00:00") {
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Heure d'ouverture invalide, considéré ouvert`);
    return true;
  }
  if (closeTimeMinutes === 0 && parsedHours.close !== "00:00") {
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Heure de fermeture invalide, considéré ouvert`);
    return true;
  }
  
  let isWithinHours = false;
  if (closeTimeMinutes > openTimeMinutes) {
    // Cas normal : fermeture le même jour
    isWithinHours = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Cas normal: ${currentTimeMinutes} >= ${openTimeMinutes} && ${currentTimeMinutes} <= ${closeTimeMinutes} = ${isWithinHours}`);
  } else {
    // Cas nuit : fermeture le lendemain
    isWithinHours = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
    if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Cas nuit: ${currentTimeMinutes} >= ${openTimeMinutes} || ${currentTimeMinutes} <= ${closeTimeMinutes} = ${isWithinHours}`);
  }
  
  if (shouldLog) console.log(`[Client] isRestaurantOpenClient - ${restaurantName} - Résultat final: ${isWithinHours}`);
  return isWithinHours;
}

export function getRestaurantCloseReason(restaurant: Restaurant | null): 'toggle' | 'hours' | 'closedDay' | null {
  if (!restaurant) return null;
  
  // Priorité : utiliser le statut calculé côté serveur
  if (restaurant.computedStatus) {
    // Convertir 'closedDay' en 'hours' pour compatibilité avec l'ancien code
    const reason = restaurant.computedStatus.reason;
    return reason === 'closedDay' ? 'hours' : (reason || null);
  }
  
  // Fallback : calcul côté client
  if (!isRestaurantOpenClient(restaurant)) {
    if (restaurant.isOpen === false) return 'toggle';
    if (restaurant.openingHours?.includes('|')) {
      const parts = restaurant.openingHours.split('|');
      const closedDay = parts[1]?.trim();
      if (closedDay) {
        const now = new Date();
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        if (dayNames[now.getDay()] === closedDay) {
          return 'hours'; // Retourner 'hours' pour compatibilité
        }
      }
    }
    return 'hours';
  }
  
  return null;
}

/**
 * Parse les horaires d'ouverture pour l'affichage
 * Retourne le format pour compatibilité avec l'ancien code
 */
/**
 * Parse les horaires d'ouverture pour l'affichage
 * Retourne le format pour compatibilité avec l'ancien code
 */
export function parseOpeningHours(openingHours?: string | null): {
  hours?: string;
  closedDay?: string;
} {
  const parsed = parseOpeningHoursInternal(openingHours);
  if (!parsed) return {};
  
  return {
    hours: parsed.open && parsed.close ? `${parsed.open}-${parsed.close}` : undefined,
    closedDay: parsed.closedDay || undefined,
  };
}

/**
 * Convertit les horaires en format JSON
 */
export function formatOpeningHoursJSON(open: string, close: string, closedDay?: string | null): string {
  return JSON.stringify({
    open: open.trim(),
    close: close.trim(),
    closedDay: closedDay || null
  });
}

