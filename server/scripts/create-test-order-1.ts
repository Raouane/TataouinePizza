/**
 * Script pour créer 1 commande de test
 * Usage: npm run tsx server/scripts/create-test-order-1.ts
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { notifyDriversOfNewOrder } from "../websocket.js";

async function createTestOrder1() {
  try {
    console.log("========================================");
    console.log("🧪 CRÉATION DE 1 COMMANDE DE TEST");
    console.log("========================================");

    // 1. Récupérer un restaurant OUVERT avec des pizzas
    const restaurants = await storage.getAllRestaurants();
    if (restaurants.length === 0) {
      console.error("❌ Aucun restaurant trouvé dans la base de données");
      process.exit(1);
    }

    // Chercher un restaurant ouvert avec des pizzas
    let restaurant = null;
    let pizzas: any[] = [];

    for (const r of restaurants) {
      if (r.isOpen) {
        const restaurantPizzas = await storage.getPizzasByRestaurant(r.id);
        if (restaurantPizzas.length > 0) {
          restaurant = r;
          pizzas = restaurantPizzas;
          break;
        }
      }
    }

    if (!restaurant || pizzas.length === 0) {
      console.error("❌ Aucun restaurant ouvert avec des pizzas trouvé");
      process.exit(1);
    }

    console.log(`📋 Restaurant sélectionné: ${restaurant.name} (${restaurant.id})`);

    // 3. Récupérer les prix des pizzas
    const pizzaIds = pizzas.map(p => p.id);
    const allPrices = await storage.getPizzaPricesByPizzaIds(pizzaIds);
    
    // Créer une map des prix par pizza
    const pricesByPizza = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      if (!pricesByPizza.has(price.pizzaId)) {
        pricesByPizza.set(price.pizzaId, []);
      }
      pricesByPizza.get(price.pizzaId)!.push(price);
    }

    // 4. Sélectionner une pizza avec un prix
    let selectedPizza = null;
    let selectedPrice = null;

    for (const pizza of pizzas) {
      const prices = pricesByPizza.get(pizza.id) || [];
      const mediumPrice = prices.find(p => p.size === 'medium');
      if (mediumPrice) {
        selectedPizza = pizza;
        selectedPrice = mediumPrice;
        break;
      }
    }

    if (!selectedPizza || !selectedPrice) {
      console.error("❌ Aucune pizza avec prix 'medium' trouvée");
      process.exit(1);
    }

    console.log(`🍕 Pizza sélectionnée: ${selectedPizza.name} - ${selectedPrice.price} TND (${selectedPrice.size})`);

    // 5. Calculer le prix total
    const quantity = 1;
    const deliveryFee = 2.0;
    const totalPrice = (Number(selectedPrice.price) * quantity) + deliveryFee;

    // 6. Créer la commande
    const order = await storage.createOrderWithItems(
      {
        restaurantId: restaurant.id,
        customerName: "Client Test 1",
        phone: `+216${Math.floor(Math.random() * 90000000 + 10000000)}`, // Numéro aléatoire
        address: "Adresse Test 1, Tataouine",
        addressDetails: null,
        customerLat: null,
        customerLng: null,
        clientOrderId: null,
        totalPrice: totalPrice.toFixed(2),
        status: "received", // Statut initial
        paymentMethod: "cash",
        notes: "Commande de test - 1 commande",
      },
      [
        {
          pizzaId: selectedPizza.id,
          size: selectedPrice.size as "small" | "medium" | "large",
          quantity: quantity,
          pricePerUnit: selectedPrice.price,
        }
      ],
      undefined // Pas de vérification de doublon pour les tests
    );

    if (!order) {
      console.error("❌ Erreur lors de la création de la commande");
      process.exit(1);
    }

    console.log("");
    console.log("========================================");
    console.log("✅ COMMANDE CRÉÉE AVEC SUCCÈS");
    console.log("========================================");
    console.log(`📦 ID Commande: ${order.id}`);
    console.log(`👤 Client: ${order.customerName}`);
    console.log(`📞 Téléphone: ${order.phone}`);
    console.log(`📍 Adresse: ${order.address}`);
    console.log(`💰 Prix total: ${order.totalPrice} TND`);
    console.log(`📊 Statut: ${order.status}`);
    console.log(`🏪 Restaurant: ${restaurant.name}`);
    console.log(`🍕 Pizza: ${selectedPizza.name} x${quantity}`);
    console.log("");
    
    // 7. Notifier les livreurs via Telegram
    try {
      console.log("🔔 Envoi notification Telegram aux livreurs...");
      await notifyDriversOfNewOrder({
        type: "new_order",
        orderId: order.id,
        restaurantName: restaurant.name,
        customerName: order.customerName,
        address: order.address,
        customerLat: order.customerLat ? parseFloat(order.customerLat) : undefined,
        customerLng: order.customerLng ? parseFloat(order.customerLng) : undefined,
        totalPrice: order.totalPrice,
        items: [{
          name: selectedPizza.name,
          size: selectedPrice.size,
          quantity: quantity,
        }],
      });
      console.log("✅ Notification Telegram envoyée avec succès");
    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi de la notification Telegram:", error.message);
      console.error("Stack:", error.stack);
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

createTestOrder1();
