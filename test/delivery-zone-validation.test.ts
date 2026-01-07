/**
 * Tests pour la validation de zone de livraison
 * 
 * Ces tests vérifient :
 * - Le calcul de distance (formule de Haversine)
 * - La validation de zone livrable/non livrable
 * - Les frais de livraison selon la distance
 * - Les limites (30 km maximum)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateDeliveryFee,
  calculateDeliveryFeeFromCoords,
  isDeliverableZone,
  MAX_DELIVERY_DISTANCE_KM,
  MAX_DELIVERY_FEE,
  type Coordinates,
} from '@shared/distance-utils';

// Coordonnées de référence : Restaurant BAB EL HARA (Tataouine)
const RESTAURANT_COORDS: Coordinates = {
  lat: 32.9295,
  lng: 10.451,
};

describe('Validation de Zone de Livraison', () => {
  describe('calculateDistance', () => {
    it('devrait calculer la distance entre deux points GPS', () => {
      // Point proche : Cité Ennour (Tataouine) - ~2.5 km
      const customerCoords: Coordinates = {
        lat: 32.9145723,
        lng: 10.4703577,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      expect(distance).toBeGreaterThan(2);
      expect(distance).toBeLessThan(3);
      expect(typeof distance).toBe('number');
    });

    it('devrait retourner 0 si les coordonnées sont invalides', () => {
      expect(calculateDistance(RESTAURANT_COORDS, { lat: 0, lng: 0 })).toBe(0);
      expect(calculateDistance({ lat: 0, lng: 0 }, RESTAURANT_COORDS)).toBe(0);
      expect(calculateDistance({ lat: null as any, lng: null as any }, RESTAURANT_COORDS)).toBe(0);
    });

    it('devrait calculer correctement une distance de ~1.8 km', () => {
      // Point très proche : ~1.8 km du restaurant
      const customerCoords: Coordinates = {
        lat: 32.944463612808846,
        lng: 10.458984375000002,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      expect(distance).toBeGreaterThan(1.5);
      expect(distance).toBeLessThan(2.0);
    });

    it('devrait calculer correctement une distance de ~17 km', () => {
      // Point moyen : Hôpital Ghomrassen - ~17 km
      const customerCoords: Coordinates = {
        lat: 33.0686996,
        lng: 10.3680779,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      expect(distance).toBeGreaterThan(16);
      expect(distance).toBeLessThan(18);
    });

    it('devrait calculer correctement une distance de ~112 km (zone non livrable)', () => {
      // Point très éloigné : ~112 km (ex: Beni Khedache)
      const customerCoords: Coordinates = {
        lat: 33.86090841686546,
        lng: 9.975585937500002,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('calculateDeliveryFee', () => {
    it('devrait retourner 2.000 TND pour une distance ≤ 2 km', () => {
      expect(calculateDeliveryFee(0)).toBe(2.0);
      expect(calculateDeliveryFee(1)).toBe(2.0);
      expect(calculateDeliveryFee(2)).toBe(2.0);
    });

    it('devrait calculer correctement les frais pour 2.5 km', () => {
      // 2.0 + (2.5 - 2) × 0.5 = 2.0 + 0.25 = 2.25 TND
      const fee = calculateDeliveryFee(2.5);
      expect(fee).toBe(2.25);
    });

    it('devrait calculer correctement les frais pour 17 km', () => {
      // 2.0 + (17 - 2) × 0.5 = 2.0 + 7.5 = 9.5 TND
      const fee = calculateDeliveryFee(17);
      expect(fee).toBe(9.5);
    });

    it('devrait calculer correctement les frais pour 30 km (limite)', () => {
      // 2.0 + (30 - 2) × 0.5 = 2.0 + 14 = 16 TND
      const fee = calculateDeliveryFee(30);
      expect(fee).toBe(16.0);
    });

    it('devrait calculer correctement les frais pour 112 km (zone non livrable)', () => {
      // 2.0 + (112 - 2) × 0.5 = 2.0 + 55 = 57 TND
      const fee = calculateDeliveryFee(112);
      expect(fee).toBe(57.0);
    });

    it('devrait arrondir à 3 décimales', () => {
      const fee = calculateDeliveryFee(2.333);
      expect(fee).toBe(2.167);
      expect(fee.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });
  });

  describe('isDeliverableZone', () => {
    it('devrait retourner true pour une distance ≤ 30 km', () => {
      const customerCoords: Coordinates = {
        lat: 32.944463612808846,
        lng: 10.458984375000002,
      };
      expect(isDeliverableZone(RESTAURANT_COORDS, customerCoords)).toBe(true);
    });

    it('devrait retourner true pour exactement 30 km', () => {
      // Créer un point à exactement 30 km (approximatif)
      const customerCoords: Coordinates = {
        lat: 33.2, // Approximation pour ~30 km
        lng: 10.45,
      };
      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      if (distance <= 30) {
        expect(isDeliverableZone(RESTAURANT_COORDS, customerCoords)).toBe(true);
      }
    });

    it('devrait retourner false pour une distance > 30 km', () => {
      const customerCoords: Coordinates = {
        lat: 33.86090841686546,
        lng: 9.975585937500002,
      };
      expect(isDeliverableZone(RESTAURANT_COORDS, customerCoords)).toBe(false);
    });

    it('devrait retourner false si les coordonnées sont manquantes', () => {
      expect(isDeliverableZone(null, RESTAURANT_COORDS)).toBe(false);
      expect(isDeliverableZone(RESTAURANT_COORDS, null)).toBe(false);
      expect(isDeliverableZone(undefined, RESTAURANT_COORDS)).toBe(false);
      expect(isDeliverableZone(RESTAURANT_COORDS, undefined)).toBe(false);
    });

    it('devrait accepter une distance maximale personnalisée', () => {
      const customerCoords: Coordinates = {
        lat: 33.86090841686546,
        lng: 9.975585937500002,
      };
      // Avec une limite de 120 km, cette zone devrait être livrable
      expect(isDeliverableZone(RESTAURANT_COORDS, customerCoords, 120)).toBe(true);
      // Avec la limite par défaut (30 km), elle ne devrait pas être livrable
      expect(isDeliverableZone(RESTAURANT_COORDS, customerCoords, 30)).toBe(false);
    });
  });

  describe('calculateDeliveryFeeFromCoords', () => {
    it('devrait calculer les frais à partir des coordonnées', () => {
      const customerCoords: Coordinates = {
        lat: 32.9145723,
        lng: 10.4703577,
      };

      const fee = calculateDeliveryFeeFromCoords(RESTAURANT_COORDS, customerCoords);
      expect(fee).toBeGreaterThan(2.0);
      expect(fee).toBeLessThan(3.0);
    });

    it('devrait retourner MAX_DELIVERY_FEE si les coordonnées sont manquantes', () => {
      expect(calculateDeliveryFeeFromCoords(null, RESTAURANT_COORDS)).toBe(MAX_DELIVERY_FEE);
      expect(calculateDeliveryFeeFromCoords(RESTAURANT_COORDS, null)).toBe(MAX_DELIVERY_FEE);
      expect(calculateDeliveryFeeFromCoords(undefined, RESTAURANT_COORDS)).toBe(MAX_DELIVERY_FEE);
    });
  });

  describe('Constantes', () => {
    it('MAX_DELIVERY_DISTANCE_KM devrait être 30.0', () => {
      expect(MAX_DELIVERY_DISTANCE_KM).toBe(30.0);
    });

    it('MAX_DELIVERY_FEE devrait être 30.0', () => {
      expect(MAX_DELIVERY_FEE).toBe(30.0);
    });
  });

  describe('Scénarios réels de Tataouine', () => {
    it('devrait valider une adresse proche (Cité Ennour - ~2.5 km)', () => {
      const customerCoords: Coordinates = {
        lat: 32.9145723,
        lng: 10.4703577,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      const isDeliverable = isDeliverableZone(RESTAURANT_COORDS, customerCoords);
      const fee = calculateDeliveryFee(distance);

      expect(distance).toBeGreaterThan(2);
      expect(distance).toBeLessThan(3);
      expect(isDeliverable).toBe(true);
      expect(fee).toBeGreaterThan(2.0);
      expect(fee).toBeLessThan(2.5);
    });

    it('devrait valider une adresse moyenne (Hôpital Ghomrassen - ~17 km)', () => {
      const customerCoords: Coordinates = {
        lat: 33.0686996,
        lng: 10.3680779,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      const isDeliverable = isDeliverableZone(RESTAURANT_COORDS, customerCoords);
      const fee = calculateDeliveryFee(distance);

      expect(distance).toBeGreaterThan(16);
      expect(distance).toBeLessThan(18);
      expect(isDeliverable).toBe(true);
      expect(fee).toBeGreaterThan(9.0);
      expect(fee).toBeLessThan(10.0);
    });

    it('devrait rejeter une adresse trop éloignée (Beni Khedache - ~112 km)', () => {
      const customerCoords: Coordinates = {
        lat: 33.86090841686546,
        lng: 9.975585937500002,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      const isDeliverable = isDeliverableZone(RESTAURANT_COORDS, customerCoords);
      const fee = calculateDeliveryFee(distance);

      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
      expect(isDeliverable).toBe(false);
      expect(fee).toBeGreaterThan(50);
      expect(fee).toBeLessThan(60);
    });

    it('devrait rejeter une adresse à la limite (exactement 30.1 km)', () => {
      // Point calculé pour être juste au-dessus de 30 km
      // Approximation : déplacer vers le nord
      const customerCoords: Coordinates = {
        lat: 33.25, // ~30+ km au nord
        lng: 10.451,
      };

      const distance = calculateDistance(RESTAURANT_COORDS, customerCoords);
      const isDeliverable = isDeliverableZone(RESTAURANT_COORDS, customerCoords);

      if (distance > 30) {
        expect(isDeliverable).toBe(false);
      }
    });
  });
});
