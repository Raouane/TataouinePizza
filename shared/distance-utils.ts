/**
 * Utilitaires partagés pour le calcul de distance et frais de livraison
 * Utilisé à la fois par le client et le serveur pour garantir la cohérence
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Rayon de la Terre en kilomètres
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcule la distance entre deux points GPS en utilisant la formule de Haversine
 * @param point1 Coordonnées du premier point (restaurant)
 * @param point2 Coordonnées du second point (client)
 * @returns Distance en kilomètres (arrondie à 2 décimales)
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  if (!point1.lat || !point1.lng || !point2.lat || !point2.lng) {
    return 0;
  }

  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
}

/**
 * Calcule les frais de livraison basés sur la distance
 * 
 * Tarification simplifiée :
 * - 0-2 km : 2.000 TND (forfait de base)
 * - > 2 km : 2.000 TND + 0.500 TND par km supplémentaire
 * 
 * Formule :
 * - Si distance ≤ 2 : Frais = 2.000 TND
 * - Si distance > 2 : Frais = 2.000 + (distance - 2) × 0.500 TND
 * 
 * @param distanceKm Distance en kilomètres
 * @returns Frais de livraison en TND (arrondi à 3 décimales)
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 0) {
    return 2.0; // Frais minimum
  }

  let fee: number;
  
  if (distanceKm <= 2) {
    fee = 2.0;
  } else {
    // Frais = 2.000 + (distance - 2) × 0.500
    fee = 2.0 + (distanceKm - 2) * 0.5;
  }
  
  // Arrondir à 3 décimales
  return parseFloat(fee.toFixed(3));
}

/**
 * Calcule les frais de livraison entre un restaurant et un client
 * @param restaurantCoords Coordonnées du restaurant
 * @param customerCoords Coordonnées du client
 * @returns Frais de livraison en TND (arrondi à 3 décimales)
 */
export function calculateDeliveryFeeFromCoords(
  restaurantCoords: Coordinates | null | undefined,
  customerCoords: Coordinates | null | undefined
): number {
  // Si les coordonnées ne sont pas disponibles, retourner le frais minimum
  if (!restaurantCoords || !customerCoords) {
    return 2.0;
  }

  const distance = calculateDistance(restaurantCoords, customerCoords);
  return calculateDeliveryFee(distance);
}
