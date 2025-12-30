import "dotenv/config";
import { storage } from "../server/storage.js";
import { notifyDriversOfNewOrder, type OrderNotification } from "../server/websocket.js";

/**
 * Script de test pour simuler le workflow complet avec un seul livreur (Raouane)
 * - Crée des commandes avec intervalles
 * - Teste max 2 commandes actives à la fois
 * - Vérifie que le système continue à chercher des livreurs jusqu'à livraison
 */

const DRIVER_PHONE = "+33783698509"; // Raouane
const MAX_ACTIVE_ORDERS = 2;
const ORDER_INTERVAL_MS = 10000; // 10 secondes entre chaque commande
const STATUS_UPDATE_INTERVAL_MS = 5000; // 5 secondes entre chaque mise à jour de statut

interface TestScenario {
  name: string;
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  items: Array<{
    pizzaId: string;
    size: "small" | "medium" | "large";
    quantity: number;
  }>;
  notes?: string;
}

async function testDriverWorkflow() {
  console.log("🧪 Test du workflow livreur avec Raouane\n");
  console.log("📋 Configuration:");
  console.log(`   - Livreur: Raouane (${DRIVER_PHONE})`);
  console.log(`   - Max commandes actives: ${MAX_ACTIVE_ORDERS}`);
  console.log(`   - Intervalle entre commandes: ${ORDER_INTERVAL_MS / 1000}s`);
  console.log(`   - Intervalle mise à jour statut: ${STATUS_UPDATE_INTERVAL_MS / 1000}s\n`);

  try {
    // 1. Vérifier que Raouane existe et est disponible
    const driver = await storage.getDriverByPhone(DRIVER_PHONE);
    if (!driver) {
      console.error(`❌ Livreur Raouane (${DRIVER_PHONE}) non trouvé`);
      console.error("💡 Créez le livreur d'abord ou vérifiez le numéro de téléphone");
      process.exit(1);
    }

    console.log(`✅ Livreur trouvé: ${driver.name} (ID: ${driver.id})`);
    console.log(`   Statut actuel: ${driver.status}\n`);

    // Mettre le livreur en "available"
    await storage.updateDriver(driver.id, { status: "available" });
    console.log(`✅ Statut mis à jour: available\n`);

    // 2. Récupérer les restaurants ouverts avec produits
    const allRestaurants = await storage.getAllRestaurants();
    const openRestaurants = allRestaurants.filter(r => r.isOpen === true);
    
    if (openRestaurants.length === 0) {
      console.error("❌ Aucun restaurant ouvert trouvé");
      process.exit(1);
    }

    const allPizzas = await storage.getAllPizzas();
    const allPrices = await storage.getPizzaPricesByPizzaIds(allPizzas.map(p => p.id));

    // Grouper les prix par pizza
    const pricesByPizza = new Map<string, typeof allPrices>();
    for (const price of allPrices) {
      if (!pricesByPizza.has(price.pizzaId)) {
        pricesByPizza.set(price.pizzaId, []);
      }
      pricesByPizza.get(price.pizzaId)!.push(price);
    }

    // Trouver un restaurant avec produits
    let selectedRestaurant = null;
    let selectedPizzas: typeof allPizzas = [];

    for (const restaurant of openRestaurants) {
      const restaurantPizzas = allPizzas.filter(p => p.restaurantId === restaurant.id);
      const pizzasWithPrices = restaurantPizzas.filter(pizza => {
        const prices = pricesByPizza.get(pizza.id) || [];
        return prices.length > 0;
      });

      if (pizzasWithPrices.length > 0) {
        selectedRestaurant = restaurant;
        selectedPizzas = pizzasWithPrices;
        break;
      }
    }

    if (!selectedRestaurant || selectedPizzas.length === 0) {
      console.error("❌ Aucun restaurant avec produits disponibles");
      process.exit(1);
    }

    console.log(`✅ Restaurant sélectionné: ${selectedRestaurant.name}`);
    console.log(`   Produits disponibles: ${selectedPizzas.length}\n`);

    // 3. Définir les scénarios de test
    const testScenarios: TestScenario[] = [
      {
        name: "Commande normale - 1 produit",
        restaurantId: selectedRestaurant.id,
        customerName: "Test Client 1",
        phone: "21650111111",
        address: "Adresse Test 1, Tataouine",
        items: [{
          pizzaId: selectedPizzas[0].id,
          size: (pricesByPizza.get(selectedPizzas[0].id)?.[0]?.size || "medium") as "small" | "medium" | "large",
          quantity: 1,
        }],
      },
      {
        name: "Commande normale - 2 produits",
        restaurantId: selectedRestaurant.id,
        customerName: "Test Client 2",
        phone: "21650222222",
        address: "Adresse Test 2, Tataouine",
        items: selectedPizzas.slice(0, 2).map(pizza => ({
          pizzaId: pizza.id,
          size: (pricesByPizza.get(pizza.id)?.[0]?.size || "medium") as "small" | "medium" | "large",
          quantity: 1,
        })),
      },
      {
        name: "Commande par téléphone",
        restaurantId: selectedRestaurant.id,
        customerName: "Test Client 3",
        phone: "21650333333",
        address: "Adresse Test 3, Tataouine",
        items: [{
          pizzaId: selectedPizzas[0].id,
          size: (pricesByPizza.get(selectedPizzas[0].id)?.[0]?.size || "medium") as "small" | "medium" | "large",
          quantity: 2,
        }],
        notes: "Commande par téléphone - Test workflow",
      },
      {
        name: "Commande spéciale - Sans produits",
        restaurantId: selectedRestaurant.id,
        customerName: "Test Client 4",
        phone: "21650444444",
        address: "Adresse Test 4, Tataouine",
        items: [],
        notes: "COMMANDE SPÉCIALE: Test commande spéciale pour workflow - Prix: 15 TND",
      },
      {
        name: "Commande normale - Grande quantité",
        restaurantId: selectedRestaurant.id,
        customerName: "Test Client 5",
        phone: "21650555555",
        address: "Adresse Test 5, Tataouine",
        items: selectedPizzas.slice(0, 3).map(pizza => ({
          pizzaId: pizza.id,
          size: (pricesByPizza.get(pizza.id)?.[0]?.size || "medium") as "small" | "medium" | "large",
          quantity: 2,
        })),
      },
    ];

    console.log(`📦 ${testScenarios.length} scénarios de test préparés\n`);
    console.log("🚀 Démarrage du test...\n");

    const createdOrders: Array<{ orderId: string; scenario: string; status: string }> = [];

    // 4. Créer les commandes avec intervalles
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      
      console.log(`\n📝 Scénario ${i + 1}/${testScenarios.length}: ${scenario.name}`);
      
      // Calculer le prix total
      let totalPrice = 0;
      const orderItemsData: Array<{
        pizzaId: string;
        size: "small" | "medium" | "large";
        quantity: number;
        pricePerUnit: string;
      }> = [];

      if (scenario.items.length > 0) {
        for (const item of scenario.items) {
          const prices = pricesByPizza.get(item.pizzaId) || [];
          const price = prices.find(p => p.size === item.size);
          if (!price) {
            console.warn(`⚠️  Prix non trouvé pour ${item.pizzaId} taille ${item.size}`);
            continue;
          }
          totalPrice += Number(price.price) * item.quantity;
          orderItemsData.push({
            pizzaId: item.pizzaId,
            size: item.size,
            quantity: item.quantity,
            pricePerUnit: price.price,
          });
        }
        totalPrice += 2.0; // Frais de livraison
      } else {
        // Commande spéciale - extraire prix des notes
        const priceMatch = scenario.notes?.match(/(\d+(?:\.\d+)?)\s*TND/i);
        totalPrice = priceMatch ? parseFloat(priceMatch[1]) : 2.0;
      }

      // Créer la commande
      const order = await storage.createOrderWithItems(
        {
          restaurantId: scenario.restaurantId,
          customerName: scenario.customerName,
          phone: scenario.phone,
          address: scenario.address,
          addressDetails: null,
          customerLat: null,
          customerLng: null,
          clientOrderId: null, // Commande admin/test
          totalPrice: totalPrice.toFixed(2),
          status: "accepted",
          paymentMethod: "cash",
          notes: scenario.notes || null,
        },
        orderItemsData,
        undefined
      );

      if (!order) {
        console.error(`❌ Erreur création commande pour ${scenario.name}`);
        continue;
      }

      createdOrders.push({
        orderId: order.id,
        scenario: scenario.name,
        status: order.status,
      });

      console.log(`   ✅ Commande créée: ${order.id.slice(0, 8)}... - ${totalPrice.toFixed(2)} TND`);
      console.log(`   📦 Articles: ${orderItemsData.length}`);

      // Notifier les livreurs (comme pour une vraie commande)
      try {
        await notifyDriversOfNewOrder({
          type: "new_order",
          orderId: order.id,
          restaurantName: selectedRestaurant.name,
          customerName: scenario.customerName,
          address: scenario.address,
          customerLat: null,
          customerLng: null,
          totalPrice: totalPrice.toFixed(2),
          items: orderItemsData.map(item => ({
            name: selectedPizzas.find(p => p.id === item.pizzaId)?.name || "Produit",
            size: item.size,
            quantity: item.quantity,
          })),
        });
        console.log(`   📢 Notification envoyée aux livreurs`);
      } catch (error: any) {
        console.warn(`   ⚠️  Erreur notification: ${error.message}`);
      }

      // Vérifier l'état actuel du livreur
      const currentDriver = await storage.getDriverById(driver.id);
      const driverOrders = await storage.getOrdersByDriver(driver.id);
      const activeDriverOrders = driverOrders.filter(o => 
        ["accepted", "ready", "delivery"].includes(o.status)
      );

      console.log(`   👤 Livreur ${driver.name}:`);
      console.log(`      - Statut: ${currentDriver?.status || "unknown"}`);
      console.log(`      - Commandes actives: ${activeDriverOrders.length}/${MAX_ACTIVE_ORDERS}`);

      if (activeDriverOrders.length >= MAX_ACTIVE_ORDERS) {
        console.log(`   ⚠️  Livreur a atteint le maximum (${MAX_ACTIVE_ORDERS} commandes actives)`);
        console.log(`   💡 Le système devrait chercher d'autres livreurs ou attendre`);
      }

      // Attendre avant la prochaine commande (sauf pour la dernière)
      if (i < testScenarios.length - 1) {
        console.log(`   ⏳ Attente ${ORDER_INTERVAL_MS / 1000}s avant la prochaine commande...`);
        await new Promise(resolve => setTimeout(resolve, ORDER_INTERVAL_MS));
      }
    }

    // 5. Résumé final
    console.log("\n" + "=".repeat(60));
    console.log("📊 RÉSUMÉ DU TEST");
    console.log("=".repeat(60));
    console.log(`✅ ${createdOrders.length} commande(s) créée(s)\n`);

    console.log("📋 Commandes créées:");
    for (const order of createdOrders) {
      console.log(`   - ${order.scenario}: ${order.orderId.slice(0, 8)}... (${order.status})`);
    }

    // Vérifier l'état final du livreur
    const finalDriver = await storage.getDriverById(driver.id);
    const finalDriverOrders = await storage.getOrdersByDriver(driver.id);
    const finalActiveOrders = finalDriverOrders.filter(o => 
      ["accepted", "ready", "delivery"].includes(o.status)
    );

    console.log(`\n👤 État final du livreur ${driver.name}:`);
    console.log(`   - Statut: ${finalDriver?.status || "unknown"}`);
    console.log(`   - Commandes actives: ${finalActiveOrders.length}`);
    console.log(`   - Total commandes: ${finalDriverOrders.length}`);

    console.log("\n💡 PROCHAINES ÉTAPES:");
    console.log("   1. Vérifiez dans l'espace admin que les commandes sont créées");
    console.log("   2. Vérifiez que Raouane reçoit les notifications Telegram");
    console.log("   3. Testez l'acceptation des commandes (max 2 à la fois)");
    console.log("   4. Testez la mise à jour des statuts (ready → delivery → delivered)");
    console.log("   5. Vérifiez que le système continue à chercher des livreurs");
    console.log("      tant que les commandes ne sont pas livrées\n");

  } catch (error: any) {
    console.error("❌ Erreur lors du test:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testDriverWorkflow();

