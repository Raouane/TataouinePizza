/**
 * Script de test pour l'architecture V2 - Module Order
 * 
 * Ce script teste toutes les fonctionnalités du module Order V2
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { OrderService } from "../server/src/modules/order/order.service";
import { FEATURE_FLAGS } from "../server/src/config/feature-flags";

const API_BASE = process.env.API_BASE || "http://localhost:5000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, data?: any) {
  results.push({ name, passed, error, data });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Erreur: ${error}`);
  }
  if (data && process.env.NODE_ENV !== "production") {
    console.log(`   Données:`, JSON.stringify(data, null, 2));
  }
}

async function testFeatureFlags() {
  console.log("\n📋 Test 1: Feature Flags");
  logTest(
    "USE_ORDER_V2_ROUTES activé",
    FEATURE_FLAGS.USE_ORDER_V2_ROUTES,
    FEATURE_FLAGS.USE_ORDER_V2_ROUTES ? undefined : "USE_ORDER_V2_ROUTES n'est pas activé dans .env"
  );
}

async function testGetRestaurantAndPizza() {
  console.log("\n📋 Test 2: Récupération des données de test");
  
  try {
    // Récupérer tous les restaurants
    const restaurants = await storage.getAllRestaurants();
    if (restaurants.length === 0) {
      logTest("Restaurants disponibles", false, "Aucun restaurant trouvé dans la base");
      return { restaurant: null, pizza: null, price: null };
    }

    logTest(`Restaurants trouvés: ${restaurants.length}`, true);

    // Chercher un restaurant avec des pizzas
    let restaurant = null;
    let pizza = null;
    let price = null;

    for (const r of restaurants) {
      const pizzas = await storage.getPizzasByRestaurant(r.id);
      if (pizzas.length > 0) {
        restaurant = r;
        pizza = pizzas[0];
        
        // Récupérer les prix
        const prices = await storage.getPizzaPrices(pizza.id);
        if (prices.length > 0) {
          price = prices[0];
          break;
        }
      }
    }

    if (!restaurant) {
      logTest("Restaurant avec pizzas", false, "Aucun restaurant avec pizzas trouvé");
      return { restaurant: null, pizza: null, price: null };
    }

    logTest(`Restaurant trouvé: ${restaurant.name}`, true, undefined, { id: restaurant.id, name: restaurant.name });
    logTest(`Pizza trouvée: ${pizza!.name}`, true, undefined, { id: pizza!.id, name: pizza!.name });
    logTest(`Prix trouvé: ${price!.size} - ${price!.price} TND`, true, undefined, { size: price!.size, price: price!.price });

    return { restaurant, pizza, price };
  } catch (error: any) {
    logTest("Récupération des données", false, error.message);
    return { restaurant: null, pizza: null, price: null };
  }
}

async function testCreateOrder(restaurant: any, pizza: any, price: any) {
  console.log("\n📋 Test 3: Création de commande (Service)");

  if (!restaurant || !pizza || !price) {
    logTest("Création de commande", false, "Données de test manquantes");
    return null;
  }

  try {
    const result = await OrderService.createOrder({
      restaurantId: restaurant.id,
      customerName: "Test User V2",
      phone: "21699999999",
      address: "123 Test Street, Tataouine",
      addressDetails: "Appartement Test",
      customerLat: 33.8869,
      customerLng: 10.1000,
      items: [
        {
          pizzaId: pizza.id,
          size: price.size as "small" | "medium" | "large",
          quantity: 1
        }
      ],
      paymentMethod: "cash",
      notes: "Test commande V2"
    });

    logTest("Commande créée avec succès", true, undefined, {
      orderId: result.orderId,
      totalPrice: result.totalPrice,
      duplicate: result.duplicate
    });

    return result.orderId;
  } catch (error: any) {
    logTest("Création de commande", false, error.message);
    return null;
  }
}

async function testGetOrderWithItems(orderId: string | null) {
  console.log("\n📋 Test 4: Récupération de commande avec items");

  if (!orderId) {
    logTest("Récupération de commande", false, "OrderId manquant");
    return;
  }

  try {
    const order = await OrderService.getOrderWithItems(orderId);
    if (!order) {
      logTest("Récupération de commande", false, "Commande introuvable");
      return;
    }

    logTest("Commande récupérée avec succès", true, undefined, {
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      itemsCount: order.items?.length || 0
    });
  } catch (error: any) {
    logTest("Récupération de commande", false, error.message);
  }
}

async function testGetCustomerOrders() {
  console.log("\n📋 Test 5: Récupération des commandes d'un client");

  try {
    const orders = await OrderService.getCustomerOrders("21699999999");
    logTest("Commandes client récupérées", true, undefined, {
      count: orders.length
    });
  } catch (error: any) {
    logTest("Récupération commandes client", false, error.message);
  }
}

async function testAPIRoutes() {
  console.log("\n📋 Test 6: Routes API HTTP");
  console.log("   Note: Le serveur doit être démarré (npm run dev) pour ces tests");

  try {
    // Test GET /api/health avec timeout personnalisé
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const healthResponse = await fetch(`${API_BASE}/api/health`, { 
        signal: controller.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId);
      const healthOk = healthResponse.ok;
      logTest("GET /api/health", healthOk, healthOk ? undefined : `Status: ${healthResponse.status}`);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logTest("GET /api/health", false, "Timeout - Serveur ne répond pas");
        return;
      }
      throw fetchError;
    }

    // Test GET /api/restaurants
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    
    try {
      const restaurantsResponse = await fetch(`${API_BASE}/api/restaurants`, {
        signal: controller2.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId2);
      const restaurantsOk = restaurantsResponse.ok;
      logTest("GET /api/restaurants", restaurantsOk, restaurantsOk ? undefined : `Status: ${restaurantsResponse.status}`);
    } catch (fetchError: any) {
      clearTimeout(timeoutId2);
      if (fetchError.name === 'AbortError') {
        logTest("GET /api/restaurants", false, "Timeout - Serveur ne répond pas");
        return;
      }
      throw fetchError;
    }

    // Test POST /api/orders (route V2)
    const controller3 = new AbortController();
    const timeoutId3 = setTimeout(() => controller3.abort(), 5000);
    
    try {
      const testOrderData = {
        restaurantId: "8db7da74-589f-43fa-891d-ca2408943b54", // BAB EL HARA
        customerName: "Test API V2",
        phone: "21688888888",
        address: "Test Address API",
        items: [{
          pizzaId: "d19a505a-d126-4ec1-a4ee-f2b993362568", // Pizza Margherita
          size: "small",
          quantity: 1
        }]
      };

      const orderResponse = await fetch(`${API_BASE}/api/orders`, {
        signal: controller3.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrderData)
      });
      clearTimeout(timeoutId3);
      
      const orderOk = orderResponse.ok;
      if (orderOk) {
        const orderData = await orderResponse.json();
        logTest("POST /api/orders (Route V2)", true, undefined, {
          orderId: orderData.orderId,
          totalPrice: orderData.totalPrice
        });
      } else {
        const errorData = await orderResponse.json().catch(() => ({}));
        logTest("POST /api/orders (Route V2)", false, `Status: ${orderResponse.status} - ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId3);
      if (fetchError.name === 'AbortError') {
        logTest("POST /api/orders (Route V2)", false, "Timeout - Serveur ne répond pas");
      } else {
        logTest("POST /api/orders (Route V2)", false, fetchError.message);
      }
    }

  } catch (error: any) {
    logTest("Routes API", false, error.message);
  }
}

async function runAllTests() {
  console.log("========================================");
  console.log("🧪 TESTS ARCHITECTURE V2 - MODULE ORDER");
  console.log("========================================\n");

  // Test 1: Feature Flags
  await testFeatureFlags();

  // Test 2: Récupération des données
  const { restaurant, pizza, price } = await testGetRestaurantAndPizza();

  // Test 3: Création de commande
  const orderId = await testCreateOrder(restaurant, pizza, price);

  // Test 4: Récupération de commande
  await testGetOrderWithItems(orderId);

  // Test 5: Commandes d'un client
  await testGetCustomerOrders();

  // Test 6: Routes API
  await testAPIRoutes();

  // Résumé
  console.log("\n========================================");
  console.log("📊 RÉSUMÉ DES TESTS");
  console.log("========================================");
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`✅ Réussis: ${passed}/${total}`);
  console.log(`❌ Échoués: ${failed}/${total}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log("\n❌ Tests échoués:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || "Erreur inconnue"}`);
    });
  }

  console.log("\n========================================");

  // Code de sortie
  process.exit(failed > 0 ? 1 : 0);
}

// Exécuter les tests
runAllTests().catch((error) => {
  console.error("❌ Erreur fatale lors des tests:", error);
  process.exit(1);
});
