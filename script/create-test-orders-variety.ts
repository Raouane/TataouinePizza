import "dotenv/config";
import { storage } from "../server/storage.js";
import type { Order } from "@shared/schema";

/**
 * Script pour créer des commandes de test variées :
 * - Commandes normales avec différents produits
 * - Commandes par téléphone (via admin)
 * - Commandes spéciales bizarres (sans items)
 * - Différents statuts et scénarios
 */

interface TestOrder {
  type: "normal" | "phone" | "special";
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  status: "accepted" | "ready" | "delivery" | "delivered";
  paymentMethod: "cash" | "card" | "online";
  items?: Array<{
    pizzaId: string;
    size: "small" | "medium" | "large";
    quantity: number;
  }>;
  notes?: string;
  description: string;
}

async function createTestOrdersVariety() {
  console.log("🛒 Création de commandes de test variées...\n");

  try {
    // Récupérer les restaurants et produits existants
    const allRestaurants = await storage.getAllRestaurants();
    if (allRestaurants.length === 0) {
      console.error("❌ Aucun restaurant trouvé. Exécutez d'abord: npm run db:seed");
      process.exit(1);
    }

    const allPizzas = await storage.getAllPizzas();
    if (allPizzas.length === 0) {
      console.error("❌ Aucun produit trouvé. Exécutez d'abord: npm run db:seed");
      process.exit(1);
    }

    // Récupérer les prix
    const allPrices = await storage.getPizzaPricesByPizzaIds(allPizzas.map(p => p.id));

    // Grouper les pizzas par restaurant
    const pizzasByRestaurant = new Map<string, typeof allPizzas>();
    for (const pizza of allPizzas) {
      if (!pizza.restaurantId) continue;
      if (!pizzasByRestaurant.has(pizza.restaurantId)) {
        pizzasByRestaurant.set(pizza.restaurantId, []);
      }
      pizzasByRestaurant.get(pizza.restaurantId)!.push(pizza);
    }

    // Grouper les prix par pizza
    const pricesByPizza = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      if (!pricesByPizza.has(price.pizzaId)) {
        pricesByPizza.set(price.pizzaId, []);
      }
      pricesByPizza.get(price.pizzaId)!.push(price);
    }

    // Fonction helper pour obtenir une pizza avec prix disponible
    const getPizzaWithPrice = (restaurantId: string, size?: "small" | "medium" | "large") => {
      const restaurantPizzas = pizzasByRestaurant.get(restaurantId) || [];
      for (const pizza of restaurantPizzas) {
        const prices = pricesByPizza.get(pizza.id) || [];
        if (prices.length === 0) continue;
        
        if (size) {
          const price = prices.find(p => p.size === size);
          if (price) return { pizza, price };
        } else {
          // Retourner la première taille disponible
          return { pizza, price: prices[0] };
        }
      }
      return null;
    };

    // Définir les commandes de test variées
    const testOrders: TestOrder[] = [
      // ============ COMMANDES NORMALES ============
      {
        type: "normal",
        restaurantId: allRestaurants[0].id,
        customerName: "Ahmed Ben Ali",
        phone: "21650123456",
        address: "Rue de la République, Tataouine",
        addressDetails: "Appartement 3, 2ème étage",
        status: "accepted",
        paymentMethod: "cash",
        description: "Commande normale - Pizza avec plusieurs tailles",
      },
      {
        type: "normal",
        restaurantId: allRestaurants[0].id,
        customerName: "Fatma Trabelsi",
        phone: "21650987654",
        address: "Avenue Habib Bourguiba, Tataouine",
        status: "ready",
        paymentMethod: "card",
        description: "Commande normale - Prête pour livraison",
      },
      {
        type: "normal",
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Mohamed Hammami",
        phone: "21650234567",
        address: "Boulevard de l'Environnement, Tataouine",
        status: "delivery",
        paymentMethod: "cash",
        notes: "Sans oignons, livraison rapide",
        description: "Commande normale - En cours de livraison",
      },
      {
        type: "normal",
        restaurantId: allRestaurants[0].id,
        customerName: "Salma Khelifi",
        phone: "21650345678",
        address: "Rue de la Liberté, Tataouine",
        addressDetails: "Bâtiment B, porte 12",
        status: "delivered",
        paymentMethod: "online",
        description: "Commande normale - Livrée",
      },

      // ============ COMMANDES PAR TÉLÉPHONE (ADMIN) ============
      {
        type: "phone",
        restaurantId: allRestaurants[0].id,
        customerName: "Youssef Bouslama",
        phone: "21650456789",
        address: "Avenue de la République, Tataouine",
        status: "accepted",
        paymentMethod: "cash",
        notes: "Commande par téléphone - Client a appelé directement",
        description: "Commande par téléphone - Produits multiples",
      },
      {
        type: "phone",
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Aicha Mansouri",
        phone: "21650567890",
        address: "Rue de la Poste, Tataouine",
        status: "ready",
        paymentMethod: "cash",
        notes: "Commande par téléphone - Urgent",
        description: "Commande par téléphone - Produit par unité",
      },
      {
        type: "phone",
        restaurantId: allRestaurants[0].id,
        customerName: "Khalil Jebali",
        phone: "21650678901",
        address: "Boulevard Mohamed V, Tataouine",
        status: "delivery",
        paymentMethod: "card",
        notes: "Commande par téléphone - Client fidèle",
        description: "Commande par téléphone - Grande quantité",
      },

      // ============ COMMANDES SPÉCIALES BIZARRES ============
      {
        type: "special",
        restaurantId: allRestaurants[0].id,
        customerName: "Nour Haddad",
        phone: "21650789012",
        address: "Rue de la Mosquée, Tataouine",
        status: "accepted",
        paymentMethod: "cash",
        notes: "COMMANDE SPÉCIALE: Client veut 3 pizzas personnalisées avec des ingrédients qu'on n'a pas sur le site. Pizza 1: Base tomate, double mozzarella, jambon, champignons, olives noires, poivrons verts, piments forts. Pizza 2: Base blanche, fromage de chèvre, miel, noix, roquette. Pizza 3: Base tomate, thon, oignons, câpres, anchois. Total estimé: 45 TND",
        description: "Commande spéciale - Pizzas personnalisées complexes",
      },
      {
        type: "special",
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Omar Fadhel",
        phone: "21650890123",
        address: "Avenue de l'Indépendance, Tataouine",
        addressDetails: "Villa blanche avec portail bleu",
        status: "ready",
        paymentMethod: "cash",
        notes: "COMMANDE SPÉCIALE: Client veut un menu complet pour 8 personnes : 4 pizzas grandes, 2 salades, 4 boissons, 2 desserts. Pas de produits spécifiques sur le site. Budget: 120 TND. Livraison pour anniversaire.",
        description: "Commande spéciale - Menu complet pour groupe",
      },
      {
        type: "special",
        restaurantId: allRestaurants[0].id,
        customerName: "Lina Baccouche",
        phone: "21650901234",
        address: "Rue des Palmiers, Tataouine",
        status: "delivery",
        paymentMethod: "online",
        notes: "COMMANDE SPÉCIALE: Client allergique à plusieurs ingrédients. Veut une pizza sans gluten, sans lactose, végétarienne. Produits spéciaux non listés. Prix négocié: 25 TND",
        description: "Commande spéciale - Allergies et restrictions",
      },
      {
        type: "special",
        restaurantId: allRestaurants[0].id,
        customerName: "Rami Sassi",
        phone: "21650012345",
        address: "Boulevard de la Révolution, Tataouine",
        status: "accepted",
        paymentMethod: "cash",
        notes: "COMMANDE SPÉCIALE: Client veut juste des frites et des sauces. Pas de pizza. 3 portions de frites, sauce blanche, sauce rouge, sauce harissa. Total: 8 TND",
        description: "Commande spéciale - Juste accompagnements",
      },
      {
        type: "special",
        restaurantId: allRestaurants[1]?.id || allRestaurants[0].id,
        customerName: "Sana Mezghani",
        phone: "21650123456",
        address: "Rue de la Gare, Tataouine",
        status: "ready",
        paymentMethod: "card",
        notes: "COMMANDE SPÉCIALE: Client veut un gâteau d'anniversaire personnalisé avec le nom 'Yasmine' écrit dessus. Pas de gâteaux sur le site. Budget: 35 TND. Livraison urgente dans 2h.",
        description: "Commande spéciale - Gâteau personnalisé",
      },
    ];

    let ordersCreated = 0;
    let itemsCreated = 0;

    for (const testOrder of testOrders) {
      try {
        const restaurant = allRestaurants.find(r => r.id === testOrder.restaurantId);
        if (!restaurant) {
          console.warn(`⚠️  Restaurant ${testOrder.restaurantId} non trouvé, skip`);
          continue;
        }

        let totalPrice = 0;
        const orderItemsData: Array<{
          pizzaId: string;
          size: "small" | "medium" | "large";
          quantity: number;
          pricePerUnit: string;
        }> = [];

        // Pour les commandes spéciales, pas d'items
        if (testOrder.type === "special") {
          // Frais de livraison uniquement (2 TND) ou prix estimé depuis les notes
          const estimatedPriceMatch = testOrder.notes?.match(/(\d+(?:\.\d+)?)\s*TND/i);
          if (estimatedPriceMatch) {
            totalPrice = parseFloat(estimatedPriceMatch[1]);
          } else {
            totalPrice = 2.0; // Frais de livraison minimum
          }
        } else {
          // Pour les commandes normales et par téléphone, générer des items
          const numItems = testOrder.type === "phone" 
            ? Math.floor(Math.random() * 3) + 1 // 1-3 items pour téléphone
            : Math.floor(Math.random() * 4) + 1; // 1-4 items pour normale

          const restaurantPizzas = pizzasByRestaurant.get(testOrder.restaurantId) || [];
          const selectedPizzas = restaurantPizzas.slice(0, Math.min(numItems, restaurantPizzas.length));

          for (const pizza of selectedPizzas) {
            const prices = pricesByPizza.get(pizza.id) || [];
            if (prices.length === 0) continue;

            // Choisir une taille aléatoire disponible
            const availableSizes = prices.map(p => p.size);
            const randomSize = availableSizes[Math.floor(Math.random() * availableSizes.length)];
            const price = prices.find(p => p.size === randomSize);
            if (!price) continue;

            const quantity = testOrder.type === "phone" 
              ? Math.floor(Math.random() * 2) + 1 // 1-2 pour téléphone
              : Math.floor(Math.random() * 3) + 1; // 1-3 pour normale

            totalPrice += Number(price.price) * quantity;

            orderItemsData.push({
              pizzaId: pizza.id,
              size: randomSize as "small" | "medium" | "large",
              quantity: quantity,
              pricePerUnit: price.price,
            });
          }

          // Ajouter frais de livraison
          totalPrice += 2.0;
        }

        // Créer la commande
        const order = await storage.createOrderWithItems(
          {
            restaurantId: testOrder.restaurantId,
            customerName: testOrder.customerName,
            phone: testOrder.phone,
            address: testOrder.address,
            addressDetails: testOrder.addressDetails || null,
            customerLat: null,
            customerLng: null,
            clientOrderId: testOrder.type === "phone" || testOrder.type === "special" ? null : undefined, // null pour commandes admin/téléphone
            totalPrice: totalPrice.toFixed(2),
            status: testOrder.status,
            paymentMethod: testOrder.paymentMethod,
            notes: testOrder.notes || null,
          },
          orderItemsData,
          undefined // Pas de vérification de doublon pour commandes de test
        );

        if (!order) {
          console.error(`❌ Erreur lors de la création de la commande pour ${testOrder.customerName}`);
          continue;
        }

        ordersCreated++;
        itemsCreated += orderItemsData.length;

        const typeEmoji = testOrder.type === "normal" ? "📱" : testOrder.type === "phone" ? "📞" : "🎯";
        console.log(`${typeEmoji} ${testOrder.description}`);
        console.log(`   ✅ Commande créée: ${testOrder.customerName} - ${testOrder.status} - ${totalPrice.toFixed(2)} TND`);
        if (orderItemsData.length > 0) {
          console.log(`   📦 ${orderItemsData.length} article(s)`);
        }
        if (testOrder.notes) {
          console.log(`   📝 Notes: ${testOrder.notes.substring(0, 60)}...`);
        }
        console.log("");

      } catch (error: any) {
        console.error(`❌ Erreur pour ${testOrder.customerName}:`, error.message);
        continue;
      }
    }

    console.log(`\n✨ ${ordersCreated} commandes créées avec ${itemsCreated} articles !`);
    console.log("💡 Vous pouvez maintenant voir les commandes dans l'espace admin et driver.");
    console.log("\n📊 Résumé:");
    console.log(`   - Commandes normales: ${testOrders.filter(o => o.type === "normal").length}`);
    console.log(`   - Commandes par téléphone: ${testOrders.filter(o => o.type === "phone").length}`);
    console.log(`   - Commandes spéciales: ${testOrders.filter(o => o.type === "special").length}`);

  } catch (error) {
    console.error("❌ Erreur lors de la création des commandes:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createTestOrdersVariety();

