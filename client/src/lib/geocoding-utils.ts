/**
 * Utilitaires pour le géocodage (conversion adresse ↔ coordonnées GPS)
 * Utilise l'API Nominatim d'OpenStreetMap (gratuite)
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    street?: string;
    city?: string;
    country?: string;
    postcode?: string;
  };
}

/**
 * Géocodage direct : convertir une adresse en coordonnées GPS
 * @param address Adresse à géocoder (ex: "Rue Habib Bourguiba, Tataouine, Tunisie")
 * @returns Coordonnées GPS ou null si l'adresse n'est pas trouvée
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    // Ajouter un délai pour respecter la politique d'utilisation Nominatim (1 requête/seconde)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TataouinePizza/1.0', // Requis par Nominatim
        },
      }
    );
    
    if (!response.ok) {
      console.error('[Geocoding] Erreur HTTP:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('[Geocoding] Aucun résultat pour l\'adresse:', address);
      return null;
    }
    
    const result = data[0];
    const addr = result.address || {};
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name || address,
      address: {
        street: addr.road || addr.street || '',
        city: addr.city || addr.town || addr.village || addr.municipality || '',
        country: addr.country || '',
        postcode: addr.postcode || '',
      },
    };
  } catch (error) {
    console.error('[Geocoding] Erreur lors du géocodage:', error);
    return null;
  }
}

/**
 * Géocodage avec ajout automatique de "Tataouine, Tunisie" si nécessaire
 * @param address Adresse à géocoder
 * @returns Coordonnées GPS ou null
 */
export async function geocodeAddressInTataouine(address: string): Promise<GeocodeResult | null> {
  // Si l'adresse ne contient pas déjà "Tataouine", l'ajouter
  const normalizedAddress = address.toLowerCase();
  if (!normalizedAddress.includes('tataouine') && !normalizedAddress.includes('تطاوين')) {
    return geocodeAddress(`${address}, Tataouine, Tunisie`);
  }
  return geocodeAddress(address);
}
