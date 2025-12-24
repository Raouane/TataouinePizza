/**
 * Utilitaires pour la conversion des coordonnées GPS
 * Centralise la logique de parsing pour éviter les duplications
 */

/**
 * Convertit une coordonnée GPS (string ou number) en number
 * @param value Valeur à convertir (string, number, null, ou undefined)
 * @returns Coordonnée en number ou null si invalide
 */
export function parseGpsCoordinate(value: string | number | null | undefined): number | null {
  if (!value) return null;
  if (typeof value === "number") return value;
  
  const parsed = parseFloat(value.toString());
  return isNaN(parsed) ? null : parsed;
}

/**
 * Convertit un objet avec lat/lng en coordonnées parsées
 * @param data Objet avec customerLat et customerLng
 * @returns Objet avec lat et lng en number ou null
 */
export function parseGpsCoordinates(data: {
  customerLat?: string | number | null;
  customerLng?: string | number | null;
}): {
  lat: number | null;
  lng: number | null;
} {
  return {
    lat: parseGpsCoordinate(data.customerLat),
    lng: parseGpsCoordinate(data.customerLng),
  };
}

