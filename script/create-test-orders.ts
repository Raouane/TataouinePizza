import "dotenv/config";
import { db } from "../server/db";
import { orders, orderItems, restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

async function createTestOrders() {
  console.log("🛒 Création de commandes de test...\n");

  try {
    // Récupérer les restaurants existants
    const allRestaurants = await db.select().from(restaurants).limit(3);
    if (allRestaurants.length === 0) {
      console.error("❌ Aucun restaurant trouvé. Exécutez d'abord: npm run db:seed");
      process.exit(1);
    }

    // Récupérer les pizzas existantes
    const allPizzas = await db.select().from(pizzas).limit(10);
    if (allPizzas.length === 0) {
      console.error("❌ Aucune pizza trouvée. Exécutez d'abord: npm run db:seed");
      process.exit(1);
    }

    // Récupérer les prix des pizzas
    const allPrices = await db.select().from(pizzaPrices);

    // Créer des commandes de test avec différents statuts
    const testOrders = [
      {
        restaurantId: allRestaurants[0].id,
        customerName: "Ahmed Ben Ali",
        phone: "21650123456",
        address: "Rue de la République, Tataouine",
        addressDetails: "Appartement 3, 2ème étage",
        status: "pending",
        totalPrice: "25.50",
        paymentMethod: "cash",
        notes: "Sonner à la porte",
      },
      {
        restaurantId: allRestaurants[0].id,
        customerName: "Fatma Trabelsi",
        phone: "21650987654",
        address: "Avenue Habib Bourguiba, Tataouine",
        addressDetails: "Maison avec jardin",
        status: "accepted",
        totalPrice: "32.00",
        paymentMethod: "cash",
      },
      {
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Mohamed Hammami",
        phone: "21650234567",
        address: "Boulevard de l'Environnement, Tataouine",
        status: "preparing",
        totalPrice: "18.75",
        paymentMethod: "cash",
        notes: "Sans oignons",
      },
      {
        restaurantId: allRestaurants[0].id,
        customerName: "Salma Khelifi",
        phone: "21650345678",
        address: "Rue de la Liberté, Tataouine",
        addressDetails: "Bâtiment B, porte 12",
        status: "baking",
        totalPrice: "45.00",
        paymentMethod: "cash",
      },
      {
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Youssef Bouslama",
        phone: "21650456789",
        address: "Avenue de la République, Tataouine",
        status: "ready",
        totalPrice: "28.50",
        paymentMethod: "cash",
      },
      {
        restaurantId: allRestaurants[0].id,
        customerName: "Aicha Mansouri",
        phone: "21650567890",
        address: "Rue de la Poste, Tataouine",
        status: "delivery",
        totalPrice: "35.25",
        paymentMethod: "cash",
      },
      {
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Khalil Jebali",
        phone: "21650678901",
        address: "Boulevard Mohamed V, Tataouine",
        status: "delivered",
        totalPrice: "22.00",
        paymentMethod: "cash",
      },
      {
        restaurantId: allRestaurants[0].id,
        customerName: "Nour Haddad",
        phone: "21650789012",
        address: "Rue de la Mosquée, Tataouine",
        status: "delivered",
        totalPrice: "40.50",
        paymentMethod: "cash",
      },
    ];

    let ordersCreated = 0;
    let itemsCreated = 0;

    for (const orderData of testOrders) {
      // Créer la commande
      const [order] = await db.insert(orders).values({
        ...orderData,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Dates aléatoires sur les 7 derniers jours
      }).returning();

      if (!order) {
        console.error(`❌ Erreur lors de la création de la commande pour ${orderData.customerName}`);
        continue;
      }

      ordersCreated++;

      // Sélectionner des pizzas du même restaurant
      const restaurantPizzas = allPizzas.filter(p => p.restaurantId === order.restaurantId);
      if (restaurantPizzas.length === 0) {
        console.warn(`⚠️  Aucune pizza trouvée pour le restaurant ${order.restaurantId}`);
        continue;
      }

      // Créer 1-3 items par commande
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedPizzas = restaurantPizzas.slice(0, numItems);

      for (const pizza of selectedPizzas) {
        // Trouver un prix pour cette pizza
        const pizzaPrice = allPrices.find(p => p.pizzaId === pizza.id);
        if (!pizzaPrice) {
          console.warn(`⚠️  Aucun prix trouvé pour la pizza ${pizza.id}`);
          continue;
        }

        const quantity = Math.floor(Math.random() * 2) + 1; // 1 ou 2

        await db.insert(orderItems).values({
          orderId: order.id,
          pizzaId: pizza.id,
          size: pizzaPrice.size as "small" | "medium" | "large",
          quantity: quantity,
          pricePerUnit: pizzaPrice.price,
        });

        itemsCreated++;
      }

      console.log(`✅ Commande créée: ${orderData.customerName} - ${orderData.status} - ${orderData.totalPrice} TND`);
    }

    console.log(`\n✨ ${ordersCreated} commandes créées avec ${itemsCreated} articles !`);
    console.log("💡 Vous pouvez maintenant voir les commandes dans l'espace admin.");
  } catch (error) {
    console.error("❌ Erreur lors de la création des commandes:", error);
    process.exit(1);
  } finally {
    // Ne pas fermer la connexion, elle peut être utilisée ailleurs
  }
}

createTestOrders();

