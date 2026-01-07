/**
 * Script de migration pour nettoyer les adresses invalides dans localStorage
 * 
 * Ce script :
 * 1. Vérifie toutes les adresses sauvegardées
 * 2. Recalcule la distance pour chaque adresse
 * 3. Supprime ou marque les adresses non livrables (> 30 km)
 * 4. Nettoie les coordonnées obsolètes ou invalides
 */

import { calculateDistance, MAX_DELIVERY_DISTANCE_KM, isDeliverableZone, type Coordinates } from '@/lib/distance-utils';
import { geocodeAddressInTataouine } from '@/lib/geocoding-utils';

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  details?: string;
  isDefault?: boolean;
  // Champs optionnels pour la migration
  lat?: number | null;
  lng?: number | null;
  distance?: number;
  isDeliverable?: boolean;
}

interface RestaurantCoords {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Récupère les coordonnées de tous les restaurants depuis l'API
 */
async function fetchRestaurantCoords(): Promise<Map<string, RestaurantCoords>> {
  try {
    const response = await fetch('/api/restaurants');
    if (!response.ok) {
      console.error('[Migration] Erreur lors de la récupération des restaurants');
      return new Map();
    }

    const restaurants = await response.json();
    const restaurantMap = new Map<string, RestaurantCoords>();
    
    restaurants.forEach((restaurant: any) => {
      if (restaurant.lat && restaurant.lng) {
        restaurantMap.set(restaurant.id, {
          id: restaurant.id,
          name: restaurant.name,
          lat: typeof restaurant.lat === 'number' ? restaurant.lat : parseFloat(String(restaurant.lat)),
          lng: typeof restaurant.lng === 'number' ? restaurant.lng : parseFloat(String(restaurant.lng)),
        });
      }
    });

    return restaurantMap;
  } catch (error) {
    console.error('[Migration] Erreur:', error);
    return new Map();
  }
}

/**
 * Valide une adresse en calculant sa distance par rapport aux restaurants
 * @param address Adresse à valider
 * @param restaurantCoords Map des coordonnées des restaurants
 * @returns true si l'adresse est livrable (distance <= 30 km pour au moins un restaurant)
 */
async function validateAddress(
  address: SavedAddress,
  restaurantCoords: Map<string, RestaurantCoords>
): Promise<{ isValid: boolean; maxDistance: number; closestRestaurant?: RestaurantCoords }> {
  // Si l'adresse a déjà des coordonnées, les utiliser
  let customerCoords: Coordinates | null = null;
  
  if (address.lat && address.lng) {
    customerCoords = {
      lat: typeof address.lat === 'number' ? address.lat : parseFloat(String(address.lat)),
      lng: typeof address.lng === 'number' ? address.lng : parseFloat(String(address.lng)),
    };
  } else {
    // Sinon, géocoder l'adresse
    const addressToGeocode = address.details ? `${address.street}, ${address.details}` : address.street;
    try {
      const result = await geocodeAddressInTataouine(addressToGeocode);
      if (result) {
        customerCoords = { lat: result.lat, lng: result.lng };
      }
    } catch (error) {
      console.warn(`[Migration] ⚠️ Impossible de géocoder l'adresse: ${addressToGeocode}`, error);
      return { isValid: false, maxDistance: Infinity };
    }
  }

  if (!customerCoords) {
    return { isValid: false, maxDistance: Infinity };
  }

  // Calculer la distance pour chaque restaurant
  let maxDistance = 0;
  let closestRestaurant: RestaurantCoords | undefined;

  for (const restaurant of restaurantCoords.values()) {
    const distance = calculateDistance(restaurant, customerCoords);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
    // Trouver le restaurant le plus proche
    if (!closestRestaurant || distance < calculateDistance(restaurant, closestRestaurant)) {
      closestRestaurant = restaurant;
    }
  }

  // L'adresse est valide si la distance maximale est <= 30 km
  const isValid = maxDistance <= MAX_DELIVERY_DISTANCE_KM;

  return { isValid, maxDistance, closestRestaurant };
}

/**
 * Migre et nettoie les adresses sauvegardées pour un numéro de téléphone
 * @param phone Numéro de téléphone
 * @param restaurantCoords Map des coordonnées des restaurants
 * @returns Nombre d'adresses supprimées
 */
async function migrateAddressesForPhone(
  phone: string,
  restaurantCoords: Map<string, RestaurantCoords>
): Promise<number> {
  const key = `savedAddresses_${phone}`;
  const saved = localStorage.getItem(key);
  
  if (!saved) {
    return 0;
  }

  let addresses: SavedAddress[] = [];
  try {
    addresses = JSON.parse(saved) as SavedAddress[];
  } catch (e) {
    console.error(`[Migration] Erreur parsing adresses pour ${phone}:`, e);
    return 0;
  }

  if (addresses.length === 0) {
    return 0;
  }

  console.log(`[Migration] 🔍 Validation de ${addresses.length} adresse(s) pour ${phone}`);

  const validAddresses: SavedAddress[] = [];
  let removedCount = 0;

  for (const address of addresses) {
    const validation = await validateAddress(address, restaurantCoords);
    
    if (validation.isValid) {
      // Adresse valide : la conserver et mettre à jour les infos
      // Note: Les coordonnées seront recalculées dynamiquement lors de la sélection
      validAddresses.push({
        ...address,
        distance: validation.maxDistance,
        isDeliverable: true,
      });
      console.log(`[Migration] ✅ Adresse "${address.label}" valide (${validation.maxDistance.toFixed(1)} km)`);
    } else {
      // Adresse invalide : la supprimer
      removedCount++;
      console.warn(
        `[Migration] ❌ Adresse "${address.label}" supprimée (${validation.maxDistance.toFixed(1)} km > ${MAX_DELIVERY_DISTANCE_KM} km)`
      );
    }
  }

  // Si toutes les adresses ont été supprimées, supprimer la clé ou sauvegarder un tableau vide
  if (validAddresses.length === 0 && addresses.length > 0) {
    console.warn(`[Migration] ⚠️ Toutes les adresses ont été supprimées pour ${phone}`);
    // Supprimer la clé pour nettoyer complètement
    localStorage.removeItem(key);
  } else if (validAddresses.length > 0) {
    // Sauvegarder les adresses valides
    localStorage.setItem(key, JSON.stringify(validAddresses));
    console.log(`[Migration] ✅ ${validAddresses.length} adresse(s) valide(s) sauvegardée(s) pour ${phone}`);
  }

  return removedCount;
}

/**
 * Migre toutes les adresses sauvegardées dans localStorage
 * @returns Statistiques de migration
 */
export async function migrateAllAddresses(): Promise<{
  totalPhones: number;
  totalAddresses: number;
  removedAddresses: number;
  errors: string[];
}> {
  console.log('[Migration] 🚀 Début de la migration des adresses...');

  const stats = {
    totalPhones: 0,
    totalAddresses: 0,
    removedAddresses: 0,
    errors: [] as string[],
  };

  try {
    // Récupérer les coordonnées des restaurants
    const restaurantCoords = await fetchRestaurantCoords();
    if (restaurantCoords.size === 0) {
      console.error('[Migration] ❌ Aucun restaurant trouvé, migration annulée');
      stats.errors.push('Aucun restaurant trouvé');
      return stats;
    }

    console.log(`[Migration] 📍 ${restaurantCoords.size} restaurant(s) trouvé(s)`);

    // Parcourir toutes les clés de localStorage
    const keys = Object.keys(localStorage);
    const addressKeys = keys.filter(key => key.startsWith('savedAddresses_'));

    stats.totalPhones = addressKeys.length;

    for (const key of addressKeys) {
      const phone = key.replace('savedAddresses_', '');
      
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const addresses = JSON.parse(saved) as SavedAddress[];
          stats.totalAddresses += addresses.length;
        }

        const removed = await migrateAddressesForPhone(phone, restaurantCoords);
        stats.removedAddresses += removed;
      } catch (error) {
        const errorMsg = `Erreur migration pour ${phone}: ${error}`;
        console.error(`[Migration] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    console.log('[Migration] ✅ Migration terminée:', stats);
    return stats;
  } catch (error) {
    const errorMsg = `Erreur générale lors de la migration: ${error}`;
    console.error(`[Migration] ❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    return stats;
  }
}

/**
 * Nettoie les coordonnées obsolètes dans tp_onboarding
 * Vérifie si les coordonnées actuelles sont valides
 */
export async function migrateOnboardingCoords(): Promise<boolean> {
  console.log('[Migration] 🔍 Vérification des coordonnées onboarding...');

  try {
    const onboardingStr = localStorage.getItem('tp_onboarding');
    if (!onboardingStr) {
      return false;
    }

    const onboarding = JSON.parse(onboardingStr);
    if (!onboarding.lat || !onboarding.lng) {
      return false;
    }

    const customerCoords: Coordinates = {
      lat: typeof onboarding.lat === 'number' ? onboarding.lat : parseFloat(String(onboarding.lat)),
      lng: typeof onboarding.lng === 'number' ? onboarding.lng : parseFloat(String(onboarding.lng)),
    };

    // Récupérer les coordonnées des restaurants
    const restaurantCoords = await fetchRestaurantCoords();
    if (restaurantCoords.size === 0) {
      return false;
    }

    // Vérifier si les coordonnées sont valides pour au moins un restaurant
    let isValid = false;
    let maxDistance = 0;

    for (const restaurant of restaurantCoords.values()) {
      const distance = calculateDistance(restaurant, customerCoords);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
      if (isDeliverableZone(restaurant, customerCoords)) {
        isValid = true;
      }
    }

    if (!isValid && maxDistance > MAX_DELIVERY_DISTANCE_KM) {
      console.warn(
        `[Migration] ❌ Coordonnées onboarding invalides (${maxDistance.toFixed(1)} km > ${MAX_DELIVERY_DISTANCE_KM} km), suppression...`
      );
      // Supprimer les coordonnées invalides mais garder les autres données
      delete onboarding.lat;
      delete onboarding.lng;
      localStorage.setItem('tp_onboarding', JSON.stringify(onboarding));
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Migration] Erreur migration onboarding:', error);
    return false;
  }
}
