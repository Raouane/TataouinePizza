/**
 * Utilitaires pour le calcul de distance et frais de livraison
 * Réexporte les fonctions partagées depuis @shared/distance-utils
 * et ajoute les fonctions spécifiques au client (formatage, temps estimé)
 */

// Réexporter les fonctions partagées pour garantir la cohérence client/serveur
export {
  calculateDistance,
  calculateDeliveryFee,
  calculateDeliveryFeeFromCoords,
  MAX_DELIVERY_FEE,
  type Coordinates,
} from '@shared/distance-utils';

/**
 * Calcule le temps de livraison estimé basé sur la distance
 * 
 * Estimation :
 * - Vitesse moyenne : 30 km/h en ville
 * - Temps de préparation : 15-20 minutes
 * 
 * @param distanceKm Distance en kilomètres
 * @returns Temps de livraison estimé en minutes
 */
export function calculateEstimatedDeliveryTime(distanceKm: number): number {
  if (distanceKm <= 0) {
    return 30; // Temps par défaut
  }

  // Temps de préparation moyen : 15 minutes
  const preparationTime = 15;
  
  // Vitesse moyenne en ville : 30 km/h
  const averageSpeedKmh = 30;
  const travelTimeMinutes = (distanceKm / averageSpeedKmh) * 60;
  
  // Arrondir à la minute supérieure
  const totalTime = Math.ceil(preparationTime + travelTimeMinutes);
  
  // Minimum 20 minutes, maximum 90 minutes
  return Math.min(Math.max(totalTime, 20), 90);
}

/**
 * Formate la distance pour l'affichage
 * @param distanceKm Distance en kilomètres
 * @returns String formatée (ex: "2.5 km" ou "500 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Formate le temps de livraison pour l'affichage
 * @param minutes Temps en minutes
 * @returns String formatée (ex: "25-30 min" ou "1h")
 */
export function formatDeliveryTime(minutes: number): string {
  if (minutes < 60) {
    // Afficher une plage de ±5 minutes
    const min = Math.max(20, minutes - 5);
    const max = Math.min(90, minutes + 5);
    return `${min}-${max} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainingMinutes}`;
  }
}
