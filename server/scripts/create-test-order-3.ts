/**
 * Script pour créer 3 commandes de test
 * Usage: npm run tsx server/scripts/create-test-order-3.ts
 */

import "dotenv/config";
import { storage } from "../storage.js";

async function createTestOrder3() {
  try {
    console.log("========================================");
    console.log("🧪 CRÉATION DE 3 COMMANDES DE TEST");
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

    // 4. Sélectionner 3 pizzas différentes avec prix (ou réutiliser si moins de 3)
    const selectedPizzas: Array<{ pizza: typeof pizzas[0], price: typeof allPrices[0] }> = [];

    for (const pizza of pizzas) {
      if (selectedPizzas.length >= 3) break;
      const prices = pricesByPizza.get(pizza.id) || [];
      const mediumPrice = prices.find(p => p.size === 'medium');
      if (mediumPrice) {
        selectedPizzas.push({ pizza, price: mediumPrice });
      }
    }

    // Si moins de 3 pizzas différentes, réutiliser les premières
    while (selectedPizzas.length < 3 && selectedPizzas.length > 0) {
      selectedPizzas.push(selectedPizzas[selectedPizzas.length - 1]);
    }

    if (selectedPizzas.length === 0) {
      console.error("❌ Aucune pizza avec prix 'medium' trouvée");
      process.exit(1);
    }

    console.log(`🍕 Pizzas sélectionnées:`);
    selectedPizzas.forEach((sp, i) => {
      console.log(`   ${i + 1}. ${sp.pizza.name} - ${sp.price.price} TND (${sp.price.size})`);
    });

    const deliveryFee = 2.0;
    const createdOrders = [];

    // 5. Créer les 3 commandes
    for (let i = 0; i < 3; i++) {
      const { pizza, price } = selectedPizzas[i % selectedPizzas.length];
      const quantity = 1;
      const totalPrice = (Number(price.price) * quantity) + deliveryFee;

      const order = await storage.createOrderWithItems(
        {
          restaurantId: restaurant.id,
          customerName: `Client Test ${i + 1}`,
          phone: `+216${Math.floor(Math.random() * 90000000 + 10000000)}`, // Numéro aléatoire
          address: `Adresse Test ${i + 1}, Tataouine`,
          addressDetails: null,
          customerLat: null,
          customerLng: null,
          clientOrderId: null,
          totalPrice: totalPrice.toFixed(2),
          status: "received", // Statut initial
          paymentMethod: "cash",
          notes: `Commande de test - Commande ${i + 1} sur 3`,
        },
        [
          {
            pizzaId: pizza.id,
            size: price.size as "small" | "medium" | "large",
            quantity: quantity,
            pricePerUnit: price.price,
          }
        ],
        undefined // Pas de vérification de doublon pour les tests
      );

      if (!order) {
        console.error(`❌ Erreur lors de la création de la commande ${i + 1}`);
        continue;
      }

      createdOrders.push(order);
      console.log(`\n✅ Commande ${i + 1} créée: ${order.id.slice(0, 8)}... - ${order.totalPrice} TND`);
    }

    console.log("");
    console.log("========================================");
    console.log("✅ 3 COMMANDES CRÉÉES AVEC SUCCÈS");
    console.log("========================================");
    console.log(`📦 Total: ${createdOrders.length} commande(s)`);
    createdOrders.forEach((order, i) => {
      console.log(`\n📦 Commande ${i + 1}:`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Client: ${order.customerName}`);
      console.log(`   Prix: ${order.totalPrice} TND`);
      console.log(`   Statut: ${order.status}`);
    });
    console.log("");
    console.log("🔔 Les livreurs disponibles devraient recevoir des notifications Telegram");
    console.log("⚠️  Note: Un livreur avec 2 commandes actives ne recevra pas de notification pour la 3ème");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

createTestOrder3();
