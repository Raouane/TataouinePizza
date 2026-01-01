/**
 * Script pour créer une commande de test pour tester le refus
 */

import { storage } from "../storage.js";
import { notifyDriversOfNewOrder } from "../websocket.js";

async function createTestOrderForRefuse() {
  try {
    console.log("========================================");
    console.log("🧪 CRÉATION COMMANDE DE TEST POUR REFUS");
    console.log("========================================");

    // Récupérer un restaurant ouvert avec des pizzas disponibles
    const restaurants = await storage.getAllRestaurants();
    let selectedRestaurant = null;
    let selectedPizza = null;

    for (const restaurant of restaurants) {
      if (!restaurant.isOpen) continue;
      
      const pizzas = await storage.getPizzasByRestaurant(restaurant.id);
      const availablePizzas = pizzas.filter(p => p.available);
      
      if (availablePizzas.length > 0) {
        selectedRestaurant = restaurant;
        selectedPizza = availablePizzas[0];
        break;
      }
    }

    if (!selectedRestaurant || !selectedPizza) {
      console.error("❌ Aucun restaurant ouvert avec pizzas disponibles");
      process.exit(1);
    }

    console.log(`✅ Restaurant sélectionné: ${selectedRestaurant.name}`);
    console.log(`✅ Pizza sélectionnée: ${selectedPizza.name}`);

    // Récupérer le prix de la pizza
    const prices = await storage.getPizzaPrices(selectedPizza.id);
    const mediumPrice = prices.find(p => p.size === "medium") || prices[0];
    
    if (!mediumPrice) {
      console.error("❌ Aucun prix trouvé pour cette pizza");
      process.exit(1);
    }

    const totalPrice = Number(mediumPrice.price);

    // Créer la commande
    const order = await storage.createOrderWithItems(
      {
        restaurantId: selectedRestaurant.id,
        customerName: "TEST REFUS",
        phone: "+21612345678",
        address: "Adresse de test pour refus",
        totalPrice: totalPrice.toString(),
        status: "received",
        paymentMethod: "cash",
      },
      [
        {
          pizzaId: selectedPizza.id,
          size: "medium",
          quantity: 1,
          price: totalPrice.toString(),
        },
      ],
      { checkDuplicate: false }
    );

    if (!order) {
      console.error("❌ Erreur lors de la création de la commande");
      process.exit(1);
    }

    console.log(`\n✅ Commande créée avec succès !`);
    console.log(`📦 ID: ${order.id}`);
    console.log(`👤 Client: TEST REFUS`);
    console.log(`💰 Prix: ${totalPrice} TND`);
    console.log(`📍 Restaurant: ${selectedRestaurant.name}`);
    console.log(`\n🔔 Notification des livreurs...`);

    // Notifier les livreurs
    await notifyDriversOfNewOrder({
      orderId: order.id,
      restaurantName: selectedRestaurant.name,
      customerName: "TEST REFUS",
      totalPrice: totalPrice.toString(),
      address: "Adresse de test pour refus",
    });

    console.log(`\n✅ Commande créée et livreurs notifiés !`);
    console.log(`\n🧪 POUR TESTER LE REFUS:`);
    console.log(`1. Vérifie que tu reçois la notification Telegram`);
    console.log(`2. Va sur le dashboard livreur`);
    console.log(`3. Clique sur "Refuser" pour cette commande`);
    console.log(`4. Vérifie qu'elle disparaît et qu'un autre livreur est notifié`);
  } catch (error: any) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

// Exécuter le script
createTestOrderForRefuse()
  .then(() => {
    console.log("\n✅ Script terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
