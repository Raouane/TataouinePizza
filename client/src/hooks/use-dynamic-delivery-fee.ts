/**
 * Hook pour calculer les frais de livraison dynamiques basés sur la distance
 */

import { useEffect, useState, useMemo } from 'react';
import { useCart } from '@/lib/cart';
import { getOnboarding } from '@/pages/onboarding';
import { calculateDistance, calculateDeliveryFee, type Coordinates } from '@/lib/distance-utils';
import type { Restaurant } from '@/features/restaurant/restaurant.types';

interface RestaurantWithCoords extends Restaurant {
  lat?: number | null;
  lng?: number | null;
}

interface DeliveryFeeInfo {
  restaurantId: string;
  distance: number;
  fee: number;
  restaurantCoords?: Coordinates;
}

export function useDynamicDeliveryFee() {
  const { restaurants: cartRestaurants } = useCart();
  const [restaurantsData, setRestaurantsData] = useState<Map<string, RestaurantWithCoords>>(new Map());
  const [deliveryFees, setDeliveryFees] = useState<Map<string, DeliveryFeeInfo>>(new Map());
  const [loading, setLoading] = useState(false);

  // Récupérer les coordonnées du client (avec re-render quand l'onboarding change)
  const [onboardingUpdate, setOnboardingUpdate] = useState(0);
  
  // Écouter les changements dans localStorage pour détecter les mises à jour de coordonnées
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('[DeliveryFee] 🔄 Détection de changement de coordonnées');
      setOnboardingUpdate(prev => prev + 1);
    };
    
    // Écouter les changements dans tp_onboarding (pour autres onglets)
    window.addEventListener('storage', handleStorageChange);
    
    // Écouter l'événement personnalisé déclenché après géocodage
    window.addEventListener('onboarding-updated', handleStorageChange);
    
    // Créer un intervalle pour vérifier les changements (car storage event ne se déclenche que pour d'autres onglets)
    const interval = setInterval(() => {
      const current = getOnboarding();
      const currentKey = current ? `${current.lat}-${current.lng}` : 'none';
      const lastKey = localStorage.getItem('_lastOnboardingKey');
      if (currentKey !== lastKey) {
        console.log('[DeliveryFee] 🔄 Changement détecté dans l\'onboarding:', { currentKey, lastKey });
        localStorage.setItem('_lastOnboardingKey', currentKey);
        handleStorageChange();
      }
    }, 500); // Vérifier toutes les 500ms pour une réactivité plus rapide
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('onboarding-updated', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const customerCoords = useMemo(() => {
    const onboarding = getOnboarding();
    console.log('[DeliveryFee] 🔍 Vérification onboarding:', {
      hasOnboarding: !!onboarding,
      lat: onboarding?.lat,
      lng: onboarding?.lng,
      latType: typeof onboarding?.lat,
      lngType: typeof onboarding?.lng,
    });
    
    if (onboarding?.lat && onboarding?.lng) {
      const coords = {
        lat: typeof onboarding.lat === 'number' ? onboarding.lat : parseFloat(String(onboarding.lat)),
        lng: typeof onboarding.lng === 'number' ? onboarding.lng : parseFloat(String(onboarding.lng)),
      };
      console.log('[DeliveryFee] ✅ Coordonnées client trouvées:', coords);
      return coords;
    }
    console.log('[DeliveryFee] ⚠️ Coordonnées client manquantes dans onboarding');
    return undefined;
  }, [onboardingUpdate]);

  // Charger les données des restaurants depuis l'API
  useEffect(() => {
    if (cartRestaurants.length === 0) {
      setRestaurantsData(new Map());
      setDeliveryFees(new Map());
      return;
    }

    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/restaurants');
        if (!response.ok) {
          console.error('[DeliveryFee] Erreur lors de la récupération des restaurants');
          return;
        }

        const allRestaurants: RestaurantWithCoords[] = await response.json();
        const restaurantMap = new Map<string, RestaurantWithCoords>();
        
        allRestaurants.forEach((restaurant) => {
          restaurantMap.set(restaurant.id, restaurant);
        });

        setRestaurantsData(restaurantMap);
      } catch (error) {
        console.error('[DeliveryFee] Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [cartRestaurants.length]);

  // Calculer les frais de livraison pour chaque restaurant dans le panier
  useEffect(() => {
    if (!customerCoords) {
      console.log('[DeliveryFee] ⚠️ Pas de coordonnées client disponibles');
      return;
    }
    
    if (restaurantsData.size === 0) {
      console.log('[DeliveryFee] ⚠️ Pas de restaurants chargés');
      return;
    }

    console.log('[DeliveryFee] 📍 Coordonnées client:', customerCoords);
    const fees = new Map<string, DeliveryFeeInfo>();

    cartRestaurants.forEach((cartRestaurant) => {
      const restaurant = restaurantsData.get(cartRestaurant.restaurantId);
      
      if (restaurant?.lat && restaurant?.lng) {
        const restaurantCoords: Coordinates = {
          lat: typeof restaurant.lat === 'number' ? restaurant.lat : parseFloat(String(restaurant.lat)),
          lng: typeof restaurant.lng === 'number' ? restaurant.lng : parseFloat(String(restaurant.lng)),
        };

        const distance = calculateDistance(restaurantCoords, customerCoords);
        const fee = calculateDeliveryFee(distance);

        console.log(`[DeliveryFee] 🏪 Restaurant: ${restaurant.name}`);
        console.log(`[DeliveryFee]    Coordonnées: ${restaurantCoords.lat}, ${restaurantCoords.lng}`);
        console.log(`[DeliveryFee]    Distance: ${distance} km`);
        console.log(`[DeliveryFee]    Frais: ${fee} TND`);

        fees.set(cartRestaurant.restaurantId, {
          restaurantId: cartRestaurant.restaurantId,
          distance,
          fee,
          restaurantCoords,
        });
      } else {
        console.warn(`[DeliveryFee] ⚠️ Restaurant ${restaurant?.name || cartRestaurant.restaurantId} n'a pas de coordonnées`);
      }
    });

    setDeliveryFees(fees);
  }, [cartRestaurants, customerCoords, restaurantsData]);

  // Fonction pour obtenir les frais de livraison d'un restaurant
  const getDeliveryFee = (restaurantId: string): number => {
    const feeInfo = deliveryFees.get(restaurantId);
    return feeInfo?.fee ?? 2.0; // Frais par défaut
  };

  // Fonction pour obtenir la distance d'un restaurant
  const getDistance = (restaurantId: string): number | undefined => {
    const feeInfo = deliveryFees.get(restaurantId);
    return feeInfo?.distance;
  };

  // Fonction pour obtenir toutes les infos de livraison
  const getDeliveryInfo = (restaurantId: string): DeliveryFeeInfo | undefined => {
    return deliveryFees.get(restaurantId);
  };

  return {
    deliveryFees,
    getDeliveryFee,
    getDistance,
    getDeliveryInfo,
    loading,
    hasCustomerCoords: !!customerCoords,
  };
}
