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
    return restaurant.computedStatus.isOpen;
  }
  
  // Fallback : calcul côté client (même logique que serveur)
  return isRestaurantOpenClient(restaurant);
}

function isRestaurantOpenClient(restaurant: Restaurant): boolean {
  if (restaurant.isOpen === false || restaurant.isOpen === null) {
    return false;
  }
  
  if (!restaurant.openingHours) {
    return restaurant.isOpen === true;
  }
  
  const parts = restaurant.openingHours.split('|');
  const hoursPart = parts[0]?.trim() || "";
  const closedDay = parts[1]?.trim();
  
  if (closedDay) {
    const now = new Date();
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDay = dayNames[now.getDay()];
    if (currentDay === closedDay) {
      return false;
    }
  }
  
  if (!hoursPart) return true;
  
  const [openTime, closeTime] = hoursPart.split("-");
  if (!openTime || !closeTime) return true;
  
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [openHour, openMin] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);
  const openTimeMinutes = openHour * 60 + openMin;
  const closeTimeMinutes = closeHour * 60 + closeMin;
  
  if (closeTimeMinutes > openTimeMinutes) {
    return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  }
  
  return currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
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
 */
export function parseOpeningHours(openingHours?: string | null): {
  hours?: string;
  closedDay?: string;
} {
  if (!openingHours) return {};
  
  const parts = openingHours.split('|');
  return {
    hours: parts[0]?.trim() || undefined,
    closedDay: parts[1]?.trim() || undefined,
  };
}

