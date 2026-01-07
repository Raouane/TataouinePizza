/**
 * Tests pour le script de migration des adresses
 * 
 * Ces tests vérifient :
 * - La validation des adresses sauvegardées
 * - La suppression des adresses non livrables
 * - Le géocodage des adresses sans coordonnées
 * - La gestion des erreurs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { migrateAllAddresses, migrateOnboardingCoords } from '@/lib/migrate-addresses';
import { MAX_DELIVERY_DISTANCE_KM } from '@shared/distance-utils';

// Mock de fetch pour simuler l'API
global.fetch = vi.fn();

// Mock de localStorage avec support pour Object.keys()
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
  // Permettre Object.keys(localStorage) de fonctionner
  return new Proxy(storage, {
    ownKeys: () => Reflect.ownKeys(store),
    getOwnPropertyDescriptor: (target, prop) => {
      if (typeof prop === 'string' && prop in store) {
        return {
          enumerable: true,
          configurable: true,
          value: store[prop],
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock de geocodeAddressInTataouine
vi.mock('@/lib/geocoding-utils', () => ({
  geocodeAddressInTataouine: vi.fn(),
}));

import { geocodeAddressInTataouine } from '@/lib/geocoding-utils';

describe('Migration des Adresses', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('migrateAllAddresses', () => {
    it('devrait retourner des statistiques vides si aucune adresse n\'existe', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      const stats = await migrateAllAddresses();

      expect(stats.totalPhones).toBe(0);
      expect(stats.totalAddresses).toBe(0);
      expect(stats.removedAddresses).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('devrait supprimer les adresses non livrables (> 30 km)', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Mock du géocodage pour une adresse non livrable
      (geocodeAddressInTataouine as any).mockResolvedValueOnce({
        lat: 33.86090841686546, // ~112 km du restaurant
        lng: 9.975585937500002,
      });

      // Créer une adresse non livrable
      localStorage.setItem(
        'savedAddresses_21678877',
        JSON.stringify([
          {
            id: 'addr1',
            label: 'Adresse Non Livrable',
            street: 'RR207, Beni Khedache, Tunisie',
          },
        ])
      );

      const stats = await migrateAllAddresses();

      expect(stats.totalPhones).toBe(1);
      expect(stats.totalAddresses).toBe(1);
      expect(stats.removedAddresses).toBe(1);
      expect(stats.errors).toHaveLength(0);

      // Vérifier que l'adresse a été supprimée (la clé devrait être supprimée)
      const remaining = localStorage.getItem('savedAddresses_21678877');
      expect(remaining).toBeNull();
    });

    it('devrait conserver les adresses livrables (≤ 30 km)', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Mock du géocodage pour une adresse livrable
      (geocodeAddressInTataouine as any).mockResolvedValueOnce({
        lat: 32.9145723, // ~2.5 km du restaurant
        lng: 10.4703577,
      });

      // Créer une adresse livrable
      const validAddress = {
        id: 'addr1',
        label: 'Cité Ennour',
        street: 'Cité Ennour, Tataouine',
        isDefault: true,
      };

      localStorage.setItem('savedAddresses_21678877', JSON.stringify([validAddress]));

      const stats = await migrateAllAddresses();

      expect(stats.totalPhones).toBe(1);
      expect(stats.totalAddresses).toBe(1);
      expect(stats.removedAddresses).toBe(0);
      expect(stats.errors).toHaveLength(0);

      // Vérifier que l'adresse a été conservée
      const remaining = JSON.parse(localStorage.getItem('savedAddresses_21678877') || '[]');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('addr1');
      expect(remaining[0].isDeliverable).toBe(true);
    });

    it('devrait gérer les adresses avec coordonnées déjà présentes', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Adresse avec coordonnées déjà présentes (livrable)
      const addressWithCoords = {
        id: 'addr1',
        label: 'Adresse avec Coords',
        street: 'Cité Ennour, Tataouine',
        lat: 32.9145723,
        lng: 10.4703577,
      };

      localStorage.setItem('savedAddresses_21678877', JSON.stringify([addressWithCoords]));

      const stats = await migrateAllAddresses();

      expect(stats.removedAddresses).toBe(0);

      // Le géocodage ne devrait pas être appelé car les coordonnées existent
      expect(geocodeAddressInTataouine).not.toHaveBeenCalled();
    });

    it('devrait supprimer les adresses qui ne peuvent pas être géocodées', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Mock du géocodage qui échoue (retourne null)
      (geocodeAddressInTataouine as any).mockResolvedValueOnce(null);

      // Créer une adresse non géocodable
      localStorage.setItem(
        'savedAddresses_21678877',
        JSON.stringify([
          {
            id: 'addr1',
            label: 'Adresse Invalide',
            street: 'RR207, Beni Khedache, Tunisie',
          },
        ])
      );

      const stats = await migrateAllAddresses();

      // Vérifier que le géocodage a été appelé
      expect(geocodeAddressInTataouine).toHaveBeenCalled();
      
      // L'adresse devrait être supprimée car le géocodage a échoué
      expect(stats.removedAddresses).toBe(1);

      // Vérifier que l'adresse a été supprimée (la clé devrait être supprimée)
      const remaining = localStorage.getItem('savedAddresses_21678877');
      expect(remaining).toBeNull();
    });

    it('devrait gérer plusieurs numéros de téléphone', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Mock du géocodage
      (geocodeAddressInTataouine as any)
        .mockResolvedValueOnce({
          lat: 32.9145723, // Livrable
          lng: 10.4703577,
        })
        .mockResolvedValueOnce({
          lat: 33.86090841686546, // Non livrable
          lng: 9.975585937500002,
        });

      // Créer des adresses pour deux numéros différents
      localStorage.setItem(
        'savedAddresses_21678877',
        JSON.stringify([
          {
            id: 'addr1',
            label: 'Adresse Livrable',
            street: 'Cité Ennour, Tataouine',
          },
        ])
      );

      localStorage.setItem(
        'savedAddresses_21678876',
        JSON.stringify([
          {
            id: 'addr2',
            label: 'Adresse Non Livrable',
            street: 'RR207, Beni Khedache, Tunisie',
          },
        ])
      );

      const stats = await migrateAllAddresses();

      expect(stats.totalPhones).toBe(2);
      expect(stats.totalAddresses).toBe(2);
      expect(stats.removedAddresses).toBe(1);
    });

    it('devrait gérer les erreurs de fetch', async () => {
      // Mock d'une erreur de fetch
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const stats = await migrateAllAddresses();

      expect(stats.errors.length).toBeGreaterThan(0);
      // Le script retourne "Aucun restaurant trouvé" quand fetch échoue
      expect(stats.errors[0]).toContain('Aucun restaurant trouvé');
    });

    it('devrait gérer les erreurs de géocodage', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Mock d'une erreur de géocodage
      (geocodeAddressInTataouine as any).mockRejectedValueOnce(new Error('Geocoding failed'));

      localStorage.setItem(
        'savedAddresses_21678877',
        JSON.stringify([
          {
            id: 'addr1',
            label: 'Adresse Erreur',
            street: 'Adresse invalide',
          },
        ])
      );

      const stats = await migrateAllAddresses();

      // L'adresse devrait être supprimée en cas d'erreur
      expect(stats.removedAddresses).toBe(1);
    });
  });

  describe('migrateOnboardingCoords', () => {
    it('devrait supprimer les coordonnées invalides de l\'onboarding', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Créer un onboarding avec coordonnées invalides (> 30 km)
      const onboarding = {
        phone: '21678877',
        name: 'Test',
        lat: 33.86090841686546, // Non livrable
        lng: 9.975585937500002,
      };

      localStorage.setItem('tp_onboarding', JSON.stringify(onboarding));

      const result = await migrateOnboardingCoords();

      expect(result).toBe(true);

      // Vérifier que les coordonnées ont été supprimées
      const updated = JSON.parse(localStorage.getItem('tp_onboarding') || '{}');
      expect(updated.lat).toBeUndefined();
      expect(updated.lng).toBeUndefined();
      expect(updated.phone).toBe('21678877'); // Autres données conservées
    });

    it('devrait conserver les coordonnées valides', async () => {
      // Mock des restaurants
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'rest1',
            name: 'BAB EL HARA',
            lat: 32.9295,
            lng: 10.451,
          },
        ],
      });

      // Créer un onboarding avec coordonnées valides
      const onboarding = {
        phone: '21678877',
        name: 'Test',
        lat: 32.9145723, // Livrable
        lng: 10.4703577,
      };

      localStorage.setItem('tp_onboarding', JSON.stringify(onboarding));

      const result = await migrateOnboardingCoords();

      expect(result).toBe(false); // Pas de modification

      // Vérifier que les coordonnées sont conservées
      const updated = JSON.parse(localStorage.getItem('tp_onboarding') || '{}');
      expect(updated.lat).toBe(32.9145723);
      expect(updated.lng).toBe(10.4703577);
    });

    it('devrait retourner false si pas d\'onboarding', async () => {
      const result = await migrateOnboardingCoords();
      expect(result).toBe(false);
    });

    it('devrait retourner false si pas de coordonnées', async () => {
      localStorage.setItem(
        'tp_onboarding',
        JSON.stringify({
          phone: '21678877',
          name: 'Test',
        })
      );

      const result = await migrateOnboardingCoords();
      expect(result).toBe(false);
    });
  });
});
