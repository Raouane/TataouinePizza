/**
 * Utilitaires pour vérifier le statut d'ouverture des restaurants
 * Source de vérité unique pour toute l'application
 */

export interface RestaurantStatus {
  isOpen: boolean;
  reason?: 'toggle' | 'hours' | 'closedDay';
  nextOpenTime?: string; // Optionnel : prochaine heure d'ouverture
}

/**
 * Parse les horaires d'ouverture
 * Format: "09:00-23:00" ou "20:00-06:00|Vendredi"
 */
function parseOpeningHours(openingHours?: string | null): {
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

/**
 * Vérifie si un restaurant est ouvert MAINTENANT
 * Logique centralisée et cohérente
 */
export function checkRestaurantStatus(restaurant: {
  isOpen?: boolean | null;
  openingHours?: string | null;
}): RestaurantStatus {
  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const currentDay = dayNames[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
  
  const restaurantName = (restaurant as any).name || 'Unknown';
  
  // Log pour débogage uniquement pour BOUBA ou si problème détecté
  const shouldLog = restaurantName.toLowerCase().includes('bouba');
  
  // 1. Vérifier le toggle (priorité absolue) - si fermé manuellement, toujours fermé
  if (restaurant.isOpen === false || restaurant.isOpen === null) {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Fermé via toggle`);
    return { isOpen: false, reason: 'toggle' };
  }
  
  // 2. Si pas d'horaires définis, considérer ouvert si toggle = true
  if (!restaurant.openingHours || restaurant.openingHours.trim() === '') {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Pas d'horaires définis, statut selon toggle:`, restaurant.isOpen === true);
    return { isOpen: restaurant.isOpen === true };
  }
  
  // 3. Parser les horaires et jour de repos
  const { hours, closedDay } = parseOpeningHours(restaurant.openingHours);
  if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Horaires parsés:`, { hours, closedDay, currentTime, currentDay });
  
  // 4. Vérifier le jour de repos
  if (closedDay && currentDay === closedDay) {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Fermé - jour de repos (${closedDay})`);
    return { isOpen: false, reason: 'closedDay' };
  }
  
  // 5. Si pas d'horaires spécifiques après parsing, considérer ouvert
  if (!hours || hours.trim() === '') {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Pas d'horaires spécifiques après parsing, considéré ouvert`);
    return { isOpen: true };
  }
  
  // 6. Parser les heures
  const [openTime, closeTime] = hours.split("-");
  if (!openTime || !closeTime || openTime.trim() === '' || closeTime.trim() === '') {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Format d'horaires invalide: "${hours}", considéré ouvert par sécurité`);
    return { isOpen: true }; // Format invalide, considérer ouvert par sécurité
  }
  
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  const [openHour, openMin] = openTime.trim().split(":").map(Number);
  const [closeHour, closeMin] = closeTime.trim().split(":").map(Number);
  
  // Vérifier que les heures sont valides
  if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Heures invalides: openTime="${openTime}", closeTime="${closeTime}"`);
    return { isOpen: true }; // Format invalide
  }
  
  const openTimeMinutes = openHour * 60 + openMin;
  const closeTimeMinutes = closeHour * 60 + closeMin;
  
  // 7. Vérifier les horaires
  let isWithinHours = false;
  
  if (closeTimeMinutes > openTimeMinutes) {
    // Cas normal : fermeture le même jour (ex: "09:00-23:00")
    isWithinHours = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Cas normal: ${currentTime} (${currentTimeMinutes} min) entre ${openTime} (${openTimeMinutes} min) et ${closeTime} (${closeTimeMinutes} min) = ${isWithinHours}`);
  } else {
    // Cas nuit : fermeture le lendemain (ex: "20:00-06:00")
    isWithinHours = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Cas nuit: ${currentTime} (${currentTimeMinutes} min) entre ${openTime} (${openTimeMinutes} min) et ${closeTime} (${closeTimeMinutes} min) = ${isWithinHours}`);
  }
  
  const result = {
    isOpen: isWithinHours,
    reason: isWithinHours ? undefined : 'hours' as const
  };
  
  if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Résultat final:`, result);
  return result;
}

/**
 * Version simplifiée pour compatibilité
 */
export function isRestaurantOpenNow(restaurant: {
  isOpen?: boolean | null;
  openingHours?: string | null;
}): boolean {
  return checkRestaurantStatus(restaurant).isOpen;
}

