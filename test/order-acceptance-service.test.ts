import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrderAcceptanceService } from "../server/services/order-acceptance-service";
import { storage } from "../server/storage";
import { errorHandler } from "../server/errors";
import { sendN8nWebhook } from "../server/webhooks/n8n-webhook";

// Mock des dépendances
vi.mock("../server/storage");
vi.mock("../server/errors");
vi.mock("../server/webhooks/n8n-webhook");

describe("OrderAcceptanceService", () => {
  const mockOrderId = "order-123";
  const mockDriverId = "driver-456";
  const mockOrder = {
    id: mockOrderId,
    status: "ready",
    driverId: null,
    restaurantId: "restaurant-789",
    customerName: "John Doe",
    address: "123 Main St",
    phone: "1234567890",
    totalPrice: "25.00",
    customerLat: "33.8869",
    customerLng: "10.6089",
  };

  const mockDriver = {
    id: mockDriverId,
    name: "Mohamed",
    phone: "9876543210",
    status: "available",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("acceptOrder", () => {
    it("devrait accepter une commande disponible avec succès", async () => {
      // Arrange
      const acceptedOrder = { ...mockOrder, driverId: mockDriverId };
      vi.mocked(storage.getOrderById).mockResolvedValue(mockOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(storage.acceptOrderByDriver).mockResolvedValue(acceptedOrder as any);
      vi.mocked(sendN8nWebhook).mockResolvedValue();

      // Act
      const result = await OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId);

      // Assert
      expect(result).toEqual(acceptedOrder);
      expect(storage.getOrderById).toHaveBeenCalledWith(mockOrderId);
      expect(storage.getDriverById).toHaveBeenCalledWith(mockDriverId);
      expect(storage.acceptOrderByDriver).toHaveBeenCalledWith(mockOrderId, mockDriverId);
      expect(sendN8nWebhook).toHaveBeenCalledWith("order-accepted-by-driver", expect.objectContaining({
        orderId: mockOrderId,
        driverId: mockDriverId,
        driverName: mockDriver.name,
      }));
    });

    it("devrait accepter une commande avec statut 'accepted'", async () => {
      // Arrange
      const orderAccepted = { ...mockOrder, status: "accepted" };
      const acceptedOrder = { ...orderAccepted, driverId: mockDriverId };
      vi.mocked(storage.getOrderById).mockResolvedValue(orderAccepted as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(storage.acceptOrderByDriver).mockResolvedValue(acceptedOrder as any);
      vi.mocked(sendN8nWebhook).mockResolvedValue();

      // Act
      const result = await OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId);

      // Assert
      expect(result).toEqual(acceptedOrder);
    });

    it("devrait retourner null si la commande a été prise entre-temps", async () => {
      // Arrange
      vi.mocked(storage.getOrderById).mockResolvedValue(mockOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(storage.acceptOrderByDriver).mockResolvedValue(null);

      // Act
      const result = await OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId);

      // Assert
      expect(result).toBeNull();
      expect(sendN8nWebhook).not.toHaveBeenCalled();
    });

    it("devrait lancer une erreur si la commande n'existe pas", async () => {
      // Arrange
      const notFoundError = errorHandler.notFound("Order not found");
      vi.mocked(storage.getOrderById).mockResolvedValue(undefined);
      vi.mocked(errorHandler.notFound).mockReturnValue(notFoundError as any);

      // Act & Assert
      await expect(
        OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId)
      ).rejects.toEqual(notFoundError);
      expect(storage.acceptOrderByDriver).not.toHaveBeenCalled();
    });

    it("devrait lancer une erreur si le livreur n'existe pas", async () => {
      // Arrange
      const notFoundError = errorHandler.notFound("Driver not found");
      vi.mocked(storage.getOrderById).mockResolvedValue(mockOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(undefined);
      vi.mocked(errorHandler.notFound).mockReturnValue(notFoundError as any);

      // Act & Assert
      await expect(
        OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId)
      ).rejects.toEqual(notFoundError);
      expect(storage.acceptOrderByDriver).not.toHaveBeenCalled();
    });

    it("devrait lancer une erreur si le statut de la commande n'est pas 'accepted' ou 'ready'", async () => {
      // Arrange
      const invalidStatusOrder = { ...mockOrder, status: "delivered" };
      const badRequestError = errorHandler.badRequest(
        "Order status must be 'accepted' or 'ready', got 'delivered'"
      );
      vi.mocked(storage.getOrderById).mockResolvedValue(invalidStatusOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(errorHandler.badRequest).mockReturnValue(badRequestError as any);

      // Act & Assert
      await expect(
        OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId)
      ).rejects.toEqual(badRequestError);
      expect(storage.acceptOrderByDriver).not.toHaveBeenCalled();
    });

    it("devrait lancer une erreur si la commande est déjà assignée à un autre livreur", async () => {
      // Arrange
      const assignedOrder = { ...mockOrder, driverId: "other-driver-999" };
      const badRequestError = errorHandler.badRequest(
        "Cette commande a déjà été prise par un autre livreur"
      );
      vi.mocked(storage.getOrderById).mockResolvedValue(assignedOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(errorHandler.badRequest).mockReturnValue(badRequestError as any);

      // Act & Assert
      await expect(
        OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId)
      ).rejects.toEqual(badRequestError);
      expect(storage.acceptOrderByDriver).not.toHaveBeenCalled();
    });

    it("devrait permettre l'acceptation si la commande est déjà assignée au même livreur", async () => {
      // Arrange
      const alreadyAssignedOrder = { ...mockOrder, driverId: mockDriverId };
      vi.mocked(storage.getOrderById).mockResolvedValue(alreadyAssignedOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(storage.acceptOrderByDriver).mockResolvedValue(alreadyAssignedOrder as any);
      vi.mocked(sendN8nWebhook).mockResolvedValue();

      // Act
      const result = await OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId);

      // Assert
      expect(result).toEqual(alreadyAssignedOrder);
      expect(storage.acceptOrderByDriver).toHaveBeenCalled();
    });

    it("ne devrait pas bloquer si le webhook échoue", async () => {
      // Arrange
      const acceptedOrder = { ...mockOrder, driverId: mockDriverId };
      vi.mocked(storage.getOrderById).mockResolvedValue(mockOrder as any);
      vi.mocked(storage.getDriverById).mockResolvedValue(mockDriver as any);
      vi.mocked(storage.acceptOrderByDriver).mockResolvedValue(acceptedOrder as any);
      vi.mocked(sendN8nWebhook).mockRejectedValue(new Error("Webhook failed"));

      // Act
      const result = await OrderAcceptanceService.acceptOrder(mockOrderId, mockDriverId);

      // Assert
      expect(result).toEqual(acceptedOrder);
      // Le service devrait toujours retourner la commande même si le webhook échoue
    });
  });
});

