/**
 * Service de création de commandes
 * Centralise toute la logique métier de création de commande
 * 
 * Responsabilités :
 * - Validation des données (restaurant, pizzas, prix)
 * - Calcul du prix total
 * - Détection de doublons (idempotence)
 * - Création de la commande en base
 * - Notification des livreurs
 * - Envoi des webhooks
 */

import { storage } from "../storage";
import { errorHandler } from "../errors";
import { isRestaurantOpenNow } from "../utils/restaurant-status";
import { notifyDriversOfNewOrder } from "../websocket";
import { sendN8nWebhook } from "../webhooks/n8n-webhook";
import { parseGpsCoordinates } from "../utils/gps-utils";
import { calculateDeliveryFeeFromCoords, type Coordinates } from "@shared/distance-utils";
import type { PizzaPrice } from "@shared/schema";
import type { InsertOrder } from "@shared/schema";

export interface CreateOrderInput {
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  clientOrderId?: string | null;
  items: Array<{
    pizzaId: string;
    size: string;
    quantity: number;
  }>;
}

export interface CreateOrderResult {
  orderId: string;
  totalPrice: number;
  duplicate?: boolean;
}

export interface OrderItemDetail {
  name: string;
  size: string;
  quantity: number;
}

export class OrderCreationService {
  private static readonly DUPLICATE_WINDOW_SECONDS = 10;

  /**
   * Crée une nouvelle commande avec toute la logique métier
   * @param input Données de la commande
   * @returns Résultat de la création (orderId, totalPrice, duplicate)
   */
  static async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    console.log("========================================");
    console.log("[OrderCreationService] ⚡⚡⚡ DÉBUT CRÉATION COMMANDE ⚡⚡⚡");
    console.log("[OrderCreationService] Input:", JSON.stringify(input, null, 2));
    console.log("========================================");

    // 1. Vérifier que le restaurant existe
    const restaurant = await storage.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw errorHandler.notFound("Restaurant not found");
    }

    // 2. Vérifier que le restaurant est ouvert
    if (!isRestaurantOpenNow(restaurant)) {
      throw errorHandler.badRequest(
        "Le restaurant est actuellement fermé. Merci de commander pendant les horaires d'ouverture."
      );
    }

    // 3. Valider et calculer le prix total (sans frais de livraison)
    const { totalPrice: subtotal, orderItemsDetails, orderItemsData } = await this.validateAndCalculatePrice(
      input.restaurantId,
      input.items
    );

    // 4. Calculer les frais de livraison dynamiques basés sur la distance GPS
    const restaurantCoords: Coordinates | null = restaurant.lat && restaurant.lng
      ? { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }
      : null;
    
    const customerCoords: Coordinates | null = input.customerLat && input.customerLng
      ? { lat: Number(input.customerLat), lng: Number(input.customerLng) }
      : null;
    
    const deliveryFee = calculateDeliveryFeeFromCoords(restaurantCoords, customerCoords);
    console.log(`[OrderCreationService] 📍 Calcul frais de livraison:`);
    console.log(`[OrderCreationService]    Restaurant: ${restaurant.name} (${restaurantCoords ? `${restaurantCoords.lat}, ${restaurantCoords.lng}` : 'pas de coordonnées'})`);
    console.log(`[OrderCreationService]    Client: ${customerCoords ? `${customerCoords.lat}, ${customerCoords.lng}` : 'pas de coordonnées'}`);
    console.log(`[OrderCreationService]    Frais calculés: ${deliveryFee} TND`);
    
    const totalPrice = subtotal + deliveryFee;

    // 5. Déterminer le statut initial
    const initialStatus = this.getInitialStatus();
    
    console.log(`\n[OrderCreationService] 🆕 ========================================`);
    console.log(`[OrderCreationService] 🆕 CRÉATION D'UNE NOUVELLE COMMANDE`);
    console.log(`[OrderCreationService]    Restaurant ID: ${input.restaurantId}`);
    console.log(`[OrderCreationService]    Client: ${input.customerName} (${input.phone})`);
    console.log(`[OrderCreationService]    Sous-total: ${subtotal} TND`);
    console.log(`[OrderCreationService]    Frais de livraison: ${deliveryFee} TND`);
    console.log(`[OrderCreationService]    Total: ${totalPrice} TND`);
    console.log(`[OrderCreationService]    Statut initial déterminé: ${initialStatus}`);
    console.log(`[OrderCreationService]    ⚠️ Le statut devrait être "accepted" ou "ready", JAMAIS "delivered"`);

    // 6. Convertir les coordonnées GPS
    const gpsCoords = parseGpsCoordinates({
      customerLat: input.customerLat,
      customerLng: input.customerLng,
    });

    // 6. Créer la commande en base (avec détection de doublons)
    const order = await storage.createOrderWithItems(
      {
        restaurantId: input.restaurantId,
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        addressDetails: input.addressDetails || null,
        customerLat: gpsCoords.lat?.toString() || null,
        customerLng: gpsCoords.lng?.toString() || null,
        clientOrderId: input.clientOrderId || null,
        totalPrice: totalPrice.toString(),
        status: initialStatus,
      },
      orderItemsData,
      {
        phone: input.phone,
        restaurantId: input.restaurantId,
        totalPrice: totalPrice.toString(),
        withinSeconds: this.DUPLICATE_WINDOW_SECONDS,
      }
    );

    // 7. Gérer les doublons (idempotence)
    if (!order) {
      const duplicateOrder = await this.findDuplicateOrder(input, totalPrice);
      if (duplicateOrder) {
        console.log(`[OrderCreationService] ✅ Doublon détecté, retour de la commande existante: ${duplicateOrder.id}`);
        console.log(`[OrderCreationService]    Statut de la commande dupliquée: ${duplicateOrder.status}`);
        console.log(`[OrderCreationService] ========================================\n`);
        return {
          orderId: duplicateOrder.id,
          totalPrice: Number(duplicateOrder.totalPrice),
          duplicate: true,
        };
      } else {
        throw errorHandler.conflict(
          "A duplicate order was detected but could not be retrieved. Please try again."
        );
      }
    }

    console.log(`[OrderCreationService] ✅ Commande créée avec succès`);
    console.log(`[OrderCreationService]    Order ID: ${order.id}`);
    console.log(`[OrderCreationService]    Statut en DB: ${order.status}`);
    console.log(`[OrderCreationService]    Driver ID: ${order.driverId || 'NULL (normal au départ)'}`);
    
    // ⚠️ ALERTE si le statut est "delivered" dès la création
    if (order.status === 'delivered') {
      console.error(`\n[OrderCreationService] ⚠️⚠️⚠️ ALERTE CRITIQUE: STATUT "delivered" DÈS LA CRÉATION ! ⚠️⚠️⚠️`);
      console.error(`[OrderCreationService]    Order ID: ${order.id}`);
      console.error(`[OrderCreationService]    Statut en DB: ${order.status}`);
      console.error(`[OrderCreationService]    ⚠️ Une commande ne devrait JAMAIS être créée avec le statut "delivered" !`);
      console.error(`[OrderCreationService] ⚠️⚠️⚠️ ========================================\n`);
    } else if (order.status !== initialStatus) {
      console.warn(`[OrderCreationService] ⚠️ Le statut en DB (${order.status}) diffère du statut initial (${initialStatus})`);
    }
    
    console.log(`[OrderCreationService] ========================================\n`);

    // 8. Notifier les livreurs (non-bloquant)
    this.notifyDrivers(order, restaurant, input, orderItemsDetails, totalPrice).catch((error) => {
      console.error("[OrderCreationService] ❌ Erreur notification WebSocket (non-bloquant):", error);
    });

    // 9. Envoyer le webhook n8n (non-bloquant)
    this.sendWebhook(order, restaurant, input, orderItemsDetails, totalPrice).catch((error) => {
      console.error("[OrderCreationService] ❌ Erreur webhook n8n (non-bloquant):", error);
    });

    return {
      orderId: order.id,
      totalPrice,
      duplicate: false,
    };
  }

  /**
   * Valide les pizzas et calcule le prix total
   * @private
   */
  private static async validateAndCalculatePrice(
    restaurantId: string,
    items: CreateOrderInput["items"]
  ): Promise<{
    totalPrice: number;
    orderItemsDetails: OrderItemDetail[];
    orderItemsData: Array<{
      pizzaId: string;
      size: string;
      quantity: number;
      pricePerUnit: string;
    }>;
  }> {
    // Récupérer toutes les pizzas uniques
    const pizzaIds = Array.from(new Set(items.map((item) => item.pizzaId)));
    const pizzas = await storage.getPizzasByIds(pizzaIds);
    const pizzaMap = new Map(pizzas.map((p) => [p.id, p]));

    // Récupérer tous les prix
    const prices = await storage.getPizzaPricesByPizzaIds(pizzaIds);
    const priceMap = new Map<string, PizzaPrice[]>();
    for (const price of prices) {
      if (!priceMap.has(price.pizzaId)) {
        priceMap.set(price.pizzaId, []);
      }
      priceMap.get(price.pizzaId)!.push(price);
    }

    // Valider et calculer
    let totalPrice = 0;
    const orderItemsDetails: OrderItemDetail[] = [];
    const orderItemsData: Array<{
      pizzaId: string;
      size: string;
      quantity: number;
      pricePerUnit: string;
    }> = [];

    for (const item of items) {
      const pizza = pizzaMap.get(item.pizzaId);
      if (!pizza) {
        throw errorHandler.notFound(`Pizza ${item.pizzaId} not found`);
      }

      // Vérifier que la pizza appartient au restaurant
      if (pizza.restaurantId !== restaurantId) {
        throw errorHandler.badRequest("All pizzas must be from the same restaurant");
      }

      // Trouver le prix pour la taille demandée
      const pizzaPrices = priceMap.get(item.pizzaId) || [];
      const sizePrice = pizzaPrices.find((p) => p.size === item.size);
      if (!sizePrice) {
        throw errorHandler.badRequest(`Invalid size for pizza ${pizza.name}`);
      }

      // Calculer le sous-total
      const itemTotal = Number(sizePrice.price) * item.quantity;
      totalPrice += itemTotal;

      // Préparer les données pour la base
      orderItemsDetails.push({
        name: pizza.name,
        size: item.size,
        quantity: item.quantity,
      });

      orderItemsData.push({
        pizzaId: item.pizzaId,
        size: item.size,
        quantity: item.quantity,
        pricePerUnit: sizePrice.price,
      });
    }

    // Note: Les frais de livraison sont calculés séparément dans createOrder()
    // pour avoir accès aux coordonnées GPS du restaurant et du client

    return {
      totalPrice: Number(totalPrice.toFixed(2)),
      orderItemsDetails,
      orderItemsData,
    };
  }

  /**
   * Détermine le statut initial de la commande
   * @private
   */
  private static getInitialStatus(): "accepted" | "ready" {
    let FORCE_RESTAURANT_READY = process.env.FORCE_RESTAURANT_READY === "true";
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && FORCE_RESTAURANT_READY) {
      console.error("[OrderCreationService] ⚠️ FORCE_RESTAURANT_READY désactivé automatiquement en production");
      FORCE_RESTAURANT_READY = false;
    }

    if (FORCE_RESTAURANT_READY && process.env.NODE_ENV !== "production") {
      console.log("[OrderCreationService] ⚠️ FORCE_RESTAURANT_READY activé - Commande forcée à READY");
    }

    return FORCE_RESTAURANT_READY ? "ready" : "accepted";
  }

  /**
   * Recherche une commande dupliquée
   * @private
   */
  private static async findDuplicateOrder(
    input: CreateOrderInput,
    totalPrice: number
  ): Promise<any | null> {
    // D'abord par clientOrderId (idempotence explicite)
    if (input.clientOrderId) {
      const duplicate = await storage.getOrderByClientOrderId(input.clientOrderId);
      if (duplicate) {
        return duplicate;
      }
    }

    // Sinon, recherche par téléphone + restaurant + prix (dans les 10 dernières secondes)
    return await storage.getRecentDuplicateOrder(
      input.phone,
      input.restaurantId,
      totalPrice.toString(),
      this.DUPLICATE_WINDOW_SECONDS
    );
  }

  /**
   * Notifie les livreurs d'une nouvelle commande (non-bloquant)
   * @private
   */
  private static async notifyDrivers(
    order: any,
    restaurant: any,
    input: CreateOrderInput,
    orderItemsDetails: OrderItemDetail[],
    totalPrice: number
  ): Promise<void> {
    console.log("[OrderCreationService] 📞 Notification des livreurs pour commande:", order.id);
    
    await notifyDriversOfNewOrder({
      type: "new_order",
      orderId: order.id,
      restaurantName: restaurant.name,
      customerName: input.customerName,
      address: input.address,
      customerLat: input.customerLat || undefined,
      customerLng: input.customerLng || undefined,
      totalPrice: totalPrice.toString(),
      items: orderItemsDetails,
    });
    
    console.log("[OrderCreationService] ✅ Notification des livreurs terminée");
  }

  /**
   * Envoie le webhook n8n (non-bloquant)
   * @private
   */
  private static async sendWebhook(
    order: any,
    restaurant: any,
    input: CreateOrderInput,
    orderItemsDetails: OrderItemDetail[],
    totalPrice: number
  ): Promise<void> {
    await sendN8nWebhook("order-created", {
      orderId: order.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantPhone: restaurant.phone,
      customerName: input.customerName,
      customerPhone: input.phone,
      address: input.address,
      addressDetails: input.addressDetails || undefined,
      totalPrice: totalPrice.toString(),
      items: orderItemsDetails,
      status: order.status,
      createdAt: order.createdAt,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[OrderCreationService] ✅ Webhook n8n envoyé pour commande ${order.id}`);
    }
  }
}
