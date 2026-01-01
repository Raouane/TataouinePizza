/**
 * Exemple d'utilisation du module Order V2
 * 
 * Ce fichier montre comment utiliser le service Order V2
 * dans d'autres parties de l'application
 */

import { OrderService } from "./order.service";
import { OrderStorage } from "./order.storage";
import type { CreateOrderInput, UpdateOrderStatusInput } from "./order.types";

// Exemple 1 : Créer une commande via le service
export async function exampleCreateOrder() {
  try {
    const result = await OrderService.createOrder({
      restaurantId: "resto-001",
      customerName: "John Doe",
      phone: "21612345678",
      address: "123 Main Street",
      addressDetails: "Appartement 4B",
      customerLat: 33.8869,
      customerLng: 10.1000,
      items: [
        {
          pizzaId: "pizza-001",
          size: "medium",
          quantity: 2
        },
        {
          pizzaId: "pizza-002",
          size: "large",
          quantity: 1
        }
      ],
      paymentMethod: "cash",
      notes: "Sans oignons"
    });

    console.log("Commande créée:", result.orderId);
    console.log("Total:", result.totalPrice);
    
    return result;
  } catch (error: any) {
    console.error("Erreur création commande:", error.message);
    throw error;
  }
}

// Exemple 2 : Mettre à jour le statut d'une commande
export async function exampleUpdateOrderStatus(
  orderId: string,
  newStatus: string,
  actorType: "restaurant" | "driver" | "admin",
  actorId?: string
) {
  try {
    const input: UpdateOrderStatusInput = {
      orderId,
      newStatus,
      actor: {
        type: actorType,
        id: actorId
      }
    };

    const updatedOrder = await OrderService.updateStatus(input);
    console.log("Statut mis à jour:", updatedOrder.status);
    
    return updatedOrder;
  } catch (error: any) {
    console.error("Erreur mise à jour statut:", error.message);
    throw error;
  }
}

// Exemple 3 : Récupérer une commande avec ses items
export async function exampleGetOrderWithItems(orderId: string) {
  try {
    const order = await OrderService.getOrderWithItems(orderId);
    
    if (!order) {
      console.log("Commande introuvable");
      return null;
    }

    console.log("Commande:", order.id);
    console.log("Statut:", order.status);
    console.log("Total:", order.totalPrice);
    console.log("Items:", order.items?.length || 0);
    
    return order;
  } catch (error: any) {
    console.error("Erreur récupération commande:", error.message);
    throw error;
  }
}

// Exemple 4 : Utiliser directement le storage (pour cas avancés)
export async function exampleDirectStorage() {
  try {
    // Récupérer une commande directement
    const order = await OrderStorage.getById("order-id");
    
    // Récupérer les items
    const items = await OrderStorage.getItems("order-id");
    
    // Mettre à jour le statut
    const updated = await OrderStorage.updateStatus("order-id", "ready");
    
    return { order, items, updated };
  } catch (error: any) {
    console.error("Erreur storage:", error.message);
    throw error;
  }
}

// Exemple 5 : Workflow complet
export async function exampleCompleteWorkflow() {
  try {
    // 1. Créer une commande
    const createResult = await OrderService.createOrder({
      restaurantId: "resto-001",
      customerName: "Jane Doe",
      phone: "21698765432",
      address: "456 Main Street",
      items: [
        {
          pizzaId: "pizza-001",
          size: "medium",
          quantity: 1
        }
      ]
    });

    console.log("✅ Commande créée:", createResult.orderId);

    // 2. Récupérer la commande avec items
    const order = await OrderService.getOrderWithItems(createResult.orderId);
    console.log("✅ Commande récupérée:", order?.id);

    // 3. Restaurant accepte la commande
    const accepted = await OrderService.updateStatus({
      orderId: createResult.orderId,
      newStatus: "accepted",
      actor: { type: "restaurant", id: "resto-001" }
    });
    console.log("✅ Commande acceptée:", accepted.status);

    // 4. Restaurant marque comme prête
    const ready = await OrderService.updateStatus({
      orderId: createResult.orderId,
      newStatus: "ready",
      actor: { type: "restaurant", id: "resto-001" }
    });
    console.log("✅ Commande prête:", ready.status);

    // 5. Livreur récupère la commande
    const inDelivery = await OrderService.updateStatus({
      orderId: createResult.orderId,
      newStatus: "delivery",
      actor: { type: "driver", id: "driver-001" }
    });
    console.log("✅ Commande en livraison:", inDelivery.status);

    // 6. Livreur livre la commande
    const delivered = await OrderService.updateStatus({
      orderId: createResult.orderId,
      newStatus: "delivered",
      actor: { type: "driver", id: "driver-001" }
    });
    console.log("✅ Commande livrée:", delivered.status);

    return delivered;
  } catch (error: any) {
    console.error("❌ Erreur workflow:", error.message);
    throw error;
  }
}
