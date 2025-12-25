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
 * Format JSON pour les horaires d'ouverture (nouveau format simplifié)
 */
export interface OpeningHoursJSON {
  open: string;  // "09:00"
  close: string; // "23:00"
  closedDay?: string | null; // "Vendredi" ou null
}

/**
 * Parse les horaires d'ouverture
 * Supporte deux formats :
 * 1. Nouveau format JSON: {"open": "09:00", "close": "23:00", "closedDay": null}
 * 2. Ancien format texte: "09:00-23:00" ou "20:00-06:00|Vendredi" (pour compatibilité)
 */
function parseOpeningHours(openingHours?: string | null): {
  open?: string;
  close?: string;
  closedDay?: string | null;
} {
  if (!openingHours || openingHours.trim() === '') return {};
  
  // Essayer de parser comme JSON d'abord (nouveau format)
  if (openingHours.trim().startsWith('{')) {
    try {
      let parsed = JSON.parse(openingHours) as OpeningHoursJSON;
      
      // Vérifier si le résultat est encore une chaîne (double encodage)
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed) as OpeningHoursJSON;
        } catch (e) {
          console.warn(`[RestaurantStatus] Double encodage détecté mais parsing échoué:`, e);
        }
      }
      
      // Vérifier que les champs requis sont présents
      if (parsed && typeof parsed === 'object' && parsed.open && parsed.close) {
        return {
          open: parsed.open,
          close: parsed.close,
          closedDay: parsed.closedDay || null
        };
      } else {
        console.warn(`[RestaurantStatus] JSON parsé mais champs manquants:`, parsed);
      }
    } catch (error) {
      // Si le JSON est invalide, essayer l'ancien format
      console.warn(`[RestaurantStatus] Erreur parsing JSON, fallback sur ancien format:`, error);
    }
  }
  
  // Ancien format texte (compatibilité)
  const parts = openingHours.split('|');
  const hours = parts[0]?.trim();
  const closedDay = parts[1]?.trim() || null;
  
  if (!hours) return { closedDay };
  
  const [open, close] = hours.split('-');
  return {
    open: open?.trim(),
    close: close?.trim(),
    closedDay
  };
}

/**
 * Convertit une heure au format "HH:MM" en minutes depuis minuit
 */
function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return 0;
  return hour * 60 + minute;
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
  
  // Logs de débogage réduits (uniquement pour BOUBA en cas de problème)
  if (shouldLog) {
    console.log(`[RestaurantStatus] ${restaurantName} - Calcul: ${currentTime}, Horaires: ${restaurant.openingHours}`);
  }
  
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
  
  // 3. Parser les horaires (support JSON et ancien format)
  const parsedHours = parseOpeningHours(restaurant.openingHours);
  if (shouldLog) {
    console.log(`[RestaurantStatus] ${restaurantName} - Horaires parsés: ${parsedHours.open}-${parsedHours.close}`);
  }
  
  // 4. Vérifier le jour de repos
  if (parsedHours.closedDay && currentDay === parsedHours.closedDay) {
    if (shouldLog) console.log(`[RestaurantStatus] ${restaurantName} - Fermé - jour de repos (${parsedHours.closedDay})`);
    return { isOpen: false, reason: 'closedDay' };
  }
  
  // 5. Si pas d'horaires spécifiques après parsing, considérer ouvert
  if (!parsedHours.open || !parsedHours.close) {
    if (shouldLog) {
      console.warn(`[RestaurantStatus] ${restaurantName} - Pas d'horaires spécifiques après parsing, considéré ouvert`);
    }
    return { isOpen: true };
  }
  
  // 6. Convertir les heures en minutes
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  const openTimeMinutes = parseTimeToMinutes(parsedHours.open);
  const closeTimeMinutes = parseTimeToMinutes(parsedHours.close);
  
  // Vérifier que les heures sont valides
  if (openTimeMinutes === 0 && parsedHours.open !== "00:00") {
    if (shouldLog) console.warn(`[RestaurantStatus] ${restaurantName} - Heure d'ouverture invalide: "${parsedHours.open}"`);
    return { isOpen: true }; // Format invalide, considérer ouvert par sécurité
  }
  
  if (closeTimeMinutes === 0 && parsedHours.close !== "00:00") {
    if (shouldLog) console.warn(`[RestaurantStatus] ${restaurantName} - Heure de fermeture invalide: "${parsedHours.close}"`);
    return { isOpen: true }; // Format invalide, considérer ouvert par sécurité
  }
  
  // 7. Vérifier les horaires
  let isWithinHours = false;
  
  if (closeTimeMinutes > openTimeMinutes) {
    // Cas normal : fermeture le même jour (ex: "09:00-23:00")
    isWithinHours = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  } else {
    // Cas nuit : fermeture le lendemain (ex: "20:00-06:00")
    isWithinHours = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
  }
  
  const result = {
    isOpen: isWithinHours,
    reason: isWithinHours ? undefined : 'hours' as const
  };
  
  if (shouldLog) {
    console.log(`[RestaurantStatus] ${restaurantName} - Résultat: ${result.isOpen ? 'OUVERT' : 'FERMÉ'} (${result.reason || 'heures'})`);
  }
  
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

