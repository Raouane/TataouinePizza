/**
 * Service métier pour le module Order (V2)
 * Contient toute la logique métier - pas de SQL ici
 */

import { OrderStorage } from "./order.storage";
import { OrderService as LegacyOrderService } from "../../../services/order-service";
import { storage } from "../../../storage";
import { isRestaurantOpenNow } from "../../../utils/restaurant-status";
import { sendN8nWebhook } from "../../../webhooks/n8n-webhook";
import { calculateDeliveryFeeFromCoords, type Coordinates } from "@shared/distance-utils";
import type { 
  CreateOrderInput, 
  CreateOrderResult, 
  OrderWithItems,
  UpdateOrderStatusInput,
  OrderNotificationPayload
} from "./order.types";
import type { Order, OrderItem } from "@shared/schema";

export class OrderService {
  /**
   * Crée une nouvelle commande avec validation complète
   */
  static async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    // 1. Vérifier que le restaurant existe
    const restaurant = await storage.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // 2. Vérifier que le restaurant est ouvert
    if (!isRestaurantOpenNow(restaurant)) {
      throw new Error("Le restaurant est actuellement fermé. Merci de commander pendant les horaires d'ouverture.");
    }

    // 3. Valider et calculer les prix
    const pizzaIds = Array.from(new Set(input.items.map(item => item.pizzaId)));
    const pizzas = await storage.getPizzasByIds(pizzaIds);
    const pizzaMap = new Map(pizzas.map(p => [p.id, p]));

    const prices = await storage.getPizzaPricesByPizzaIds(pizzaIds);
    const priceMap = new Map<string, typeof prices>();
    for (const price of prices) {
      if (!priceMap.has(price.pizzaId)) {
        priceMap.set(price.pizzaId, []);
      }
      priceMap.get(price.pizzaId)!.push(price);
    }

    // 4. Calculer le total
    let totalPrice = 0;
    const orderItemsDetails: Array<{ name: string; size: string; quantity: number }> = [];

    for (const item of input.items) {
      const pizza = pizzaMap.get(item.pizzaId);
      if (!pizza) {
        throw new Error(`Pizza ${item.pizzaId} not found`);
      }
      if (pizza.restaurantId !== input.restaurantId) {
        throw new Error("All pizzas must be from the same restaurant");
      }

      const pizzaPrices = priceMap.get(item.pizzaId) || [];
      const sizePrice = pizzaPrices.find(p => p.size === item.size);
      if (!sizePrice) {
        throw new Error(`Invalid size for pizza ${pizza.name}`);
      }

      totalPrice += Number(sizePrice.price) * item.quantity;
      orderItemsDetails.push({
        name: pizza.name,
        size: item.size,
        quantity: item.quantity,
      });
    }

    // 5. Calculer les frais de livraison dynamiques basés sur la distance GPS
    const restaurantCoords: Coordinates | null = restaurant.lat && restaurant.lng
      ? { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }
      : null;
    
    const customerCoords: Coordinates | null = input.customerLat && input.customerLng
      ? { lat: Number(input.customerLat), lng: Number(input.customerLng) }
      : null;
    
    const deliveryFee = calculateDeliveryFeeFromCoords(restaurantCoords, customerCoords);
    console.log(`[OrderService] 📍 Calcul frais de livraison:`);
    console.log(`[OrderService]    Restaurant: ${restaurant.name} (${restaurantCoords ? `${restaurantCoords.lat}, ${restaurantCoords.lng}` : 'pas de coordonnées'})`);
    console.log(`[OrderService]    Client: ${customerCoords ? `${customerCoords.lat}, ${customerCoords.lng}` : 'pas de coordonnées'}`);
    console.log(`[OrderService]    Frais calculés: ${deliveryFee} TND`);
    
    totalPrice += deliveryFee;

    // 6. Déterminer le statut initial
    const FORCE_RESTAURANT_READY = process.env.FORCE_RESTAURANT_READY === 'true' && 
                                    process.env.NODE_ENV !== 'production';
    const initialStatus = FORCE_RESTAURANT_READY ? "ready" : "received";

    // 7. Préparer les données pour la création
    const orderItemsData = input.items.map(item => {
      const pizzaPrices = priceMap.get(item.pizzaId) || [];
      const sizePrice = pizzaPrices.find(p => p.size === item.size);
      if (!sizePrice) {
        throw new Error(`Price not found for pizza ${item.pizzaId} size ${item.size}`);
      }
      return {
        pizzaId: item.pizzaId,
        size: item.size,
        quantity: item.quantity,
        pricePerUnit: sizePrice.price,
      };
    });

    // 8. Créer la commande (avec vérification de doublon)
    const order = await OrderStorage.createOrderWithItems(
      {
        restaurantId: input.restaurantId,
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        addressDetails: input.addressDetails,
        customerLat: input.customerLat?.toString(),
        customerLng: input.customerLng?.toString(),
        clientOrderId: input.clientOrderId || undefined,
        totalPrice: totalPrice.toString(),
        status: initialStatus,
      },
      orderItemsData,
      {
        phone: input.phone,
        restaurantId: input.restaurantId,
        totalPrice: totalPrice.toString(),
        withinSeconds: 10
      }
    );

    // 9. Gérer les doublons
    if (!order) {
      let duplicateOrder: Order | undefined;

      if (input.clientOrderId) {
        duplicateOrder = await OrderStorage.getByClientOrderId(input.clientOrderId);
      }

      if (!duplicateOrder) {
        duplicateOrder = await OrderStorage.getRecentDuplicate(
          input.phone,
          input.restaurantId,
          totalPrice.toString(),
          10
        );
      }

      if (duplicateOrder) {
        return {
          orderId: duplicateOrder.id,
          totalPrice,
          duplicate: true
        };
      } else {
        throw new Error("A duplicate order was detected but could not be retrieved. Please try again.");
      }
    }

    return {
      orderId: order.id,
      totalPrice
    };
  }

  /**
   * Met à jour le statut d'une commande (utilise le service legacy pour compatibilité)
   */
  static async updateStatus(input: UpdateOrderStatusInput): Promise<Order> {
    return LegacyOrderService.updateStatus(
      input.orderId,
      input.newStatus,
      input.actor
    );
  }

  /**
   * Récupère une commande avec ses items
   */
  static async getOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
    try {
      console.log(`[OrderService] 🔍 getOrderWithItems - Récupération commande ${orderId}`);
      const order = await OrderStorage.getById(orderId);
      if (!order) {
        console.log(`[OrderService] ❌ Commande ${orderId} non trouvée dans le storage`);
        return null;
      }
      console.log(`[OrderService] ✅ Commande ${orderId} trouvée dans le storage:`, {
        orderId: order.id,
        status: order.status,
        driverId: order.driverId,
        driverIdType: typeof order.driverId,
        createdAt: order.createdAt,
      });

      // Récupérer les items avec gestion d'erreur
      let items: OrderItem[] = [];
      try {
        items = await OrderStorage.getItems(orderId);
        console.log(`[OrderService] ✅ ${items.length} item(s) trouvé(s) pour commande ${orderId}`);
      } catch (itemsError: any) {
        console.error(`[OrderService] ❌ Erreur récupération items pour commande ${orderId}:`, itemsError.message);
        // Continuer avec une liste vide si les items ne peuvent pas être récupérés
        items = [];
      }

      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          try {
            const pizza = await storage.getPizzaById(item.pizzaId);
            return {
              ...item,
              pizza: pizza ? {
                id: pizza.id,
                name: pizza.name,
                description: pizza.description || undefined,
                imageUrl: pizza.imageUrl || undefined,
              } : undefined
            };
          } catch (pizzaError: any) {
            console.error(`[OrderService] ❌ Erreur récupération pizza ${item.pizzaId} pour commande ${orderId}:`, pizzaError.message);
            // Retourner l'item sans les détails de la pizza si elle n'existe plus
            return {
              ...item,
              pizza: undefined
            };
          }
        })
      );

      return {
        ...order,
        items: itemsWithDetails
      };
    } catch (error: any) {
      console.error(`[OrderService] ❌ ERREUR CRITIQUE dans getOrderWithItems pour commande ${orderId}:`, {
        message: error?.message,
        stack: error?.stack,
        name: error?.constructor?.name
      });
      throw error; // Re-throw pour que la route puisse gérer l'erreur
    }
  }

  /**
   * Récupère les commandes d'un client
   */
  static async getCustomerOrders(phone: string): Promise<Order[]> {
    return OrderStorage.getByPhone(phone);
  }

  /**
   * Retourne les transitions de statut autorisées pour une commande
   * Source de vérité unique pour la machine d'état
   */
  static async getAllowedTransitions(orderId: string): Promise<string[]> {
    const order = await OrderStorage.getById(orderId);
    if (!order) {
      return [];
    }

    // Définir les transitions autorisées selon le statut actuel
    const transitions: Record<string, string[]> = {
      'pending': ['accepted', 'rejected'],
      'accepted': ['preparing', 'ready', 'rejected'],
      'preparing': ['ready', 'rejected'],
      'ready': ['delivery', 'rejected'],
      'delivery': ['delivered', 'rejected'],
      'delivered': [], // État final
      'rejected': [], // État final
    };

    return transitions[order.status] || [];
  }

  /**
   * Vérifie si une transition de statut est autorisée
   */
  static async canTransition(orderId: string, newStatus: string): Promise<boolean> {
    const allowed = await this.getAllowedTransitions(orderId);
    return allowed.includes(newStatus);
  }
}
