/**
 * Script pour créer 3 commandes avec un intervalle de 30 secondes (test Round Robin et re-notification)
 * Usage: npm run test:orders:3
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { notifyDriversOfNewOrder } from "../websocket.js";

interface TestOrderResult {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  totalPrice: string;
  status: string;
  restaurantName: string;
  pizzaName: string;
  success: boolean;
  error?: string;
}

async function createSingleOrder(orderNumber: number): Promise<TestOrderResult> {
  try {
    // 1. Récupérer un restaurant OUVERT avec des pizzas
    const restaurants = await storage.getAllRestaurants();
    if (restaurants.length === 0) {
      throw new Error("Aucun restaurant trouvé dans la base de données");
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
      throw new Error("Aucun restaurant ouvert avec des pizzas trouvé");
    }

    // 2. Récupérer les prix des pizzas
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

    // 3. Sélectionner une pizza avec un prix (différente pour chaque commande)
    let selectedPizza = null;
    let selectedPrice = null;

    // Utiliser un index différent pour chaque commande pour varier les pizzas
    const pizzaIndex = (orderNumber - 1) % pizzas.length;
    const pizza = pizzas[pizzaIndex];
    const prices = pricesByPizza.get(pizza.id) || [];
    const mediumPrice = prices.find(p => p.size === 'medium') || prices[0];
    
    if (mediumPrice) {
      selectedPizza = pizza;
      selectedPrice = mediumPrice;
    } else {
      // Fallback : prendre la première pizza avec n'importe quel prix
      selectedPizza = pizzas[0];
      selectedPrice = allPrices.find(p => p.pizzaId === selectedPizza.id) || allPrices[0];
    }

    if (!selectedPizza || !selectedPrice) {
      throw new Error("Aucune pizza avec prix trouvée");
    }

    // 4. Calculer le prix total
    const quantity = 1;
    const deliveryFee = 2.0;
    const totalPrice = (Number(selectedPrice.price) * quantity) + deliveryFee;

    // 5. Créer la commande avec un nom de client unique
    const order = await storage.createOrderWithItems(
      {
        restaurantId: restaurant.id,
        customerName: `Client Test ${orderNumber}`,
        phone: `+216${Math.floor(Math.random() * 90000000 + 10000000)}`, // Numéro aléatoire
        address: `Adresse Test ${orderNumber}, Tataouine`,
        addressDetails: null,
        customerLat: null,
        customerLng: null,
        clientOrderId: null,
        totalPrice: totalPrice.toFixed(2),
        status: "received", // Statut initial
        paymentMethod: "cash",
        notes: `Commande de test simultanée - Commande #${orderNumber}`,
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
      throw new Error("Erreur lors de la création de la commande");
    }

    // 6. Notifier les livreurs via Telegram
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

    return {
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      totalPrice: order.totalPrice,
      status: order.status,
      restaurantName: restaurant.name,
      pizzaName: selectedPizza.name,
      success: true,
    };
  } catch (error: any) {
    return {
      orderId: "",
      customerName: `Client Test ${orderNumber}`,
      phone: "",
      address: "",
      totalPrice: "",
      status: "",
      restaurantName: "",
      pizzaName: "",
      success: false,
      error: error.message || "Erreur inconnue",
    };
  }
}

async function createTestOrders3Simultaneous() {
  try {
    console.log("========================================");
    console.log("🧪 CRÉATION DE 3 COMMANDES AVEC INTERVALLE DE 30 SECONDES");
    console.log("========================================");
    console.log("");

    const startTime = Date.now();
    const INTERVAL_MS = 30 * 1000; // 30 secondes

    // Créer les 3 commandes avec un intervalle de 30 secondes
    console.log("📦 Création des 3 commandes avec intervalle de 30 secondes...");
    console.log("");
    
    const results: TestOrderResult[] = [];
    
    // Commande 1
    console.log("⏰ Création commande #1...");
    const result1 = await createSingleOrder(1);
    results.push(result1);
    console.log(`✅ Commande #1 ${result1.success ? 'créée' : 'échouée'}`);
    console.log("");
    
    if (results.length < 3) {
      console.log(`⏳ Attente de ${INTERVAL_MS / 1000} secondes avant la prochaine commande...`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
      console.log("");
    }
    
    // Commande 2
    console.log("⏰ Création commande #2...");
    const result2 = await createSingleOrder(2);
    results.push(result2);
    console.log(`✅ Commande #2 ${result2.success ? 'créée' : 'échouée'}`);
    console.log("");
    
    if (results.length < 3) {
      console.log(`⏳ Attente de ${INTERVAL_MS / 1000} secondes avant la prochaine commande...`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
      console.log("");
    }
    
    // Commande 3
    console.log("⏰ Création commande #3...");
    const result3 = await createSingleOrder(3);
    results.push(result3);
    console.log(`✅ Commande #3 ${result3.success ? 'créée' : 'échouée'}`);
    console.log("");

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("");
    console.log("========================================");
    console.log("📊 RÉSULTATS");
    console.log("========================================");
    console.log(`⏱️  Durée totale: ${(duration / 1000).toFixed(1)} secondes`);
    console.log(`⏱️  Intervalle entre commandes: 30 secondes`);
    console.log("");

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      const orderNum = index + 1;
      if (result.success) {
        successCount++;
        console.log(`✅ COMMANDE #${orderNum} - SUCCÈS`);
        console.log(`   📦 ID: ${result.orderId}`);
        console.log(`   👤 Client: ${result.customerName}`);
        console.log(`   📞 Téléphone: ${result.phone}`);
        console.log(`   📍 Adresse: ${result.address}`);
        console.log(`   💰 Prix total: ${result.totalPrice} TND`);
        console.log(`   📊 Statut: ${result.status}`);
        console.log(`   🏪 Restaurant: ${result.restaurantName}`);
        console.log(`   🍕 Pizza: ${result.pizzaName}`);
        console.log("");
      } else {
        failureCount++;
        console.log(`❌ COMMANDE #${orderNum} - ÉCHEC`);
        console.log(`   👤 Client: ${result.customerName}`);
        console.log(`   ⚠️  Erreur: ${result.error}`);
        console.log("");
      }
    });

    console.log("========================================");
    console.log("📈 RÉSUMÉ");
    console.log("========================================");
    console.log(`✅ Succès: ${successCount}/3`);
    console.log(`❌ Échecs: ${failureCount}/3`);
    console.log(`⏱️  Durée totale: ${(duration / 1000).toFixed(1)} secondes`);
    console.log(`⏱️  Intervalle entre commandes: 30 secondes`);
    console.log("");

    if (successCount > 0) {
      console.log("🔔 Les notifications Telegram ont été envoyées aux livreurs");
      console.log("📋 Vérifiez les logs serveur pour voir le Round Robin en action");
      console.log("");
      console.log("💡 Pour vérifier les commandes créées:");
      console.log("   npm run check:last-order");
      console.log("");
    }

    process.exit(failureCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error("❌ Erreur fatale:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

createTestOrders3Simultaneous();
