import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrderEnrichmentService } from "../server/services/order-enrichment-service";
import { storage } from "../server/storage";

// Mock des dépendances
vi.mock("../server/storage");

describe("OrderEnrichmentService", () => {
  const mockOrder = {
    id: "order-123",
    restaurantId: "restaurant-789",
    driverId: null,
    customerName: "John Doe",
    phone: "1234567890",
    address: "123 Main St",
    totalPrice: "25.00",
    status: "ready",
    customerLat: "33.8869",
    customerLng: "10.6089",
  } as any;

  const mockRestaurant = {
    id: "restaurant-789",
    name: "Tataouine Pizza",
    address: "Avenue Habib Bourguiba",
  } as any;

  const mockDriver = {
    id: "driver-456",
    name: "Mohamed",
    phone: "9876543210",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Vider le cache avant chaque test
    OrderEnrichmentService.clearCache();
  });

  describe("parseGpsCoordinate", () => {
    it("devrait convertir une string en number", () => {
      expect(OrderEnrichmentService.parseGpsCoordinate("33.8869")).toBe(33.8869);
      expect(OrderEnrichmentService.parseGpsCoordinate("10.6089")).toBe(10.6089);
    });

    it("devrait retourner un number tel quel", () => {
      expect(OrderEnrichmentService.parseGpsCoordinate(33.8869)).toBe(33.8869);
      expect(OrderEnrichmentService.parseGpsCoordinate(10.6089)).toBe(10.6089);
    });

    it("devrait retourner null pour null ou undefined", () => {
      expect(OrderEnrichmentService.parseGpsCoordinate(null)).toBeNull();
      expect(OrderEnrichmentService.parseGpsCoordinate(undefined)).toBeNull();
    });

    it("devrait retourner null pour une string invalide", () => {
      expect(OrderEnrichmentService.parseGpsCoordinate("invalid")).toBeNull();
      expect(OrderEnrichmentService.parseGpsCoordinate("")).toBeNull();
    });
  });

  describe("enrichWithRestaurant", () => {
    it("devrait enrichir une commande avec les infos du restaurant", async () => {
      vi.mocked(storage.getRestaurantById).mockResolvedValue(mockRestaurant);

      const result = await OrderEnrichmentService.enrichWithRestaurant(mockOrder);

      expect(result.restaurantName).toBe("Tataouine Pizza");
      expect(result.restaurantAddress).toBe("Avenue Habib Bourguiba");
      expect(result.customerLat).toBe(33.8869);
      expect(result.customerLng).toBe(10.6089);
      expect(storage.getRestaurantById).toHaveBeenCalledWith("restaurant-789");
    });

    it("devrait utiliser des valeurs par défaut si restaurant non trouvé", async () => {
      vi.mocked(storage.getRestaurantById).mockResolvedValue(undefined);

      const result = await OrderEnrichmentService.enrichWithRestaurant(mockOrder);

      expect(result.restaurantName).toBe("Restaurant");
      expect(result.restaurantAddress).toBe("");
    });

    it("devrait utiliser le cache pour éviter les requêtes répétées", async () => {
      vi.mocked(storage.getRestaurantById).mockResolvedValue(mockRestaurant);

      // Premier appel
      await OrderEnrichmentService.enrichWithRestaurant(mockOrder);
      // Deuxième appel (devrait utiliser le cache)
      await OrderEnrichmentService.enrichWithRestaurant(mockOrder);

      // getRestaurantById ne devrait être appelé qu'une seule fois
      expect(storage.getRestaurantById).toHaveBeenCalledTimes(1);
    });
  });

  describe("enrichWithDriver", () => {
    it("devrait enrichir une commande avec les infos du livreur", async () => {
      const orderWithDriver = { ...mockOrder, driverId: "driver-456" };
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver);

      const result = await OrderEnrichmentService.enrichWithDriver(orderWithDriver);

      expect(result.driverName).toBe("Mohamed");
      expect(result.customerLat).toBe(33.8869);
      expect(result.customerLng).toBe(10.6089);
    });

    it("devrait gérer l'absence de livreur", async () => {
      vi.mocked(storage.getDriverById).mockResolvedValue(undefined);

      const result = await OrderEnrichmentService.enrichWithDriver(mockOrder);

      expect(result.driverName).toBeUndefined();
    });
  });

  describe("enrichOrder", () => {
    it("devrait enrichir avec restaurant et livreur", async () => {
      const orderWithDriver = { ...mockOrder, driverId: "driver-456" };
      vi.mocked(storage.getRestaurantById).mockResolvedValue(mockRestaurant);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver);

      const result = await OrderEnrichmentService.enrichOrder(orderWithDriver);

      expect(result.restaurantName).toBe("Tataouine Pizza");
      expect(result.driverName).toBe("Mohamed");
    });
  });

  describe("enrichOrders", () => {
    it("devrait enrichir plusieurs commandes efficacement", async () => {
      const orders = [
        { ...mockOrder, id: "order-1", restaurantId: "restaurant-789" },
        { ...mockOrder, id: "order-2", restaurantId: "restaurant-789" }, // Même restaurant
        { ...mockOrder, id: "order-3", restaurantId: "restaurant-999" },
      ];
      
      vi.mocked(storage.getRestaurantById)
        .mockResolvedValueOnce(mockRestaurant)
        .mockResolvedValueOnce({
          id: "restaurant-999",
          name: "Autre Restaurant",
          address: "Autre Adresse",
        } as any);

      const results = await OrderEnrichmentService.enrichOrders(orders);

      expect(results).toHaveLength(3);
      expect(results[0].restaurantName).toBe("Tataouine Pizza");
      expect(results[1].restaurantName).toBe("Tataouine Pizza"); // Utilise le cache
      expect(results[2].restaurantName).toBe("Autre Restaurant");
      
      // Devrait appeler getRestaurantById seulement 2 fois (pas 3) grâce au cache
      expect(storage.getRestaurantById).toHaveBeenCalledTimes(2);
    });
  });
});

