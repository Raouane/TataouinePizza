/**
 * Script de test pour la migration order-history-v2.tsx
 * 
 * Ce script teste que la version migrée fonctionne correctement
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { OrderService } from "../server/src/modules/order/order.service";

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

async function testFileExists() {
  console.log("\n📋 Test 1: Vérification des fichiers");

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const oldFile = path.join(process.cwd(), "client/src/pages/order-history.tsx");
    const newFile = path.join(process.cwd(), "client/src/pages/order-history-v2.tsx");
    const appFile = path.join(process.cwd(), "client/src/App.tsx");

    const oldExists = await fs.access(oldFile).then(() => true).catch(() => false);
    const newExists = await fs.access(newFile).then(() => true).catch(() => false);
    const appExists = await fs.access(appFile).then(() => true).catch(() => false);

    logTest("Fichier order-history.tsx existe (ancien)", oldExists, oldExists ? undefined : "Fichier manquant");
    logTest("Fichier order-history-v2.tsx existe (nouveau)", newExists, newExists ? undefined : "Fichier manquant");
    logTest("Fichier App.tsx existe", appExists, appExists ? undefined : "Fichier manquant");

    // Vérifier que le nouveau fichier utilise les hooks V2
    if (newExists) {
      const content = await fs.readFile(newFile, "utf-8");
      const usesV2Hook = content.includes("useCustomerOrders");
      const usesOldApi = content.includes("getOrdersByPhone");
      const hasUseStateForOrders = content.includes("useState<Order[]") || content.includes("useState<Order");
      const useStateCount = content.match(/useState/g)?.length || 0;

      logTest("Utilise useCustomerOrders (hook V2)", usesV2Hook, usesV2Hook ? undefined : "Hook V2 non utilisé");
      logTest("N'utilise pas getOrdersByPhone (ancien)", !usesOldApi, usesOldApi ? "Ancien API encore utilisé" : undefined);
      logTest("N'utilise pas useState pour orders", !hasUseStateForOrders, hasUseStateForOrders ? "useState encore utilisé pour orders" : undefined);
      logTest("Moins de useState que l'ancien (3 -> max 2)", useStateCount <= 2, useStateCount > 2 ? `${useStateCount} useState trouvés (attendu: max 2)` : undefined, {
        count: useStateCount,
        note: useStateCount <= 2 ? "Amélioration par rapport à l'ancien (3 useState)" : "Trop de useState"
      });
    }

    // Vérifier que App.tsx a la route
    if (appExists) {
      const content = await fs.readFile(appFile, "utf-8");
      const hasRoute = content.includes("/history-v2") || content.includes("OrderHistoryV2");
      logTest("Route /history-v2 ajoutée dans App.tsx", hasRoute, hasRoute ? undefined : "Route manquante");
    }

  } catch (error: any) {
    logTest("Vérification des fichiers", false, error.message);
  }
}

async function testBackendCompatibility() {
  console.log("\n📋 Test 2: Compatibilité Backend pour Migration");

  try {
    // Créer des commandes de test pour un téléphone spécifique
    const testPhone = "21677777777";
    const { restaurant, pizza, price } = await getTestData();
    
    if (!restaurant || !pizza || !price) {
      logTest("Données de test disponibles", false, "Impossible de récupérer les données de test");
      return;
    }

    // Créer 2-3 commandes pour le même téléphone
    const ordersToCreate = 2;
    const createdOrders = [];

    for (let i = 0; i < ordersToCreate; i++) {
      try {
        const orderResult = await OrderService.createOrder({
          restaurantId: restaurant.id,
          customerName: `Test Migration ${i + 1}`,
          phone: testPhone,
          address: `Test Address ${i + 1}`,
          items: [{
            pizzaId: pizza.id,
            size: price.size as "small" | "medium" | "large",
            quantity: 1
          }]
        });
        createdOrders.push(orderResult.orderId);
      } catch (error: any) {
        // Ignorer les doublons
        if (!error.message.includes("duplicate")) {
          throw error;
        }
      }
    }

    logTest("Commandes de test créées", createdOrders.length > 0, createdOrders.length === 0 ? "Aucune commande créée" : undefined, {
      count: createdOrders.length,
      phone: testPhone
    });

    // Vérifier que les commandes peuvent être récupérées
    const customerOrders = await OrderService.getCustomerOrders(testPhone);
    logTest("Commandes récupérables pour migration", customerOrders.length > 0, customerOrders.length === 0 ? "Aucune commande trouvée" : undefined, {
      count: customerOrders.length,
      phone: testPhone
    });

    // Vérifier que chaque commande a les champs nécessaires
    if (customerOrders.length > 0) {
      const firstOrder = customerOrders[0];
      const hasRequiredFields = 
        firstOrder.id && 
        firstOrder.customerName && 
        firstOrder.phone && 
        firstOrder.address && 
        firstOrder.status && 
        firstOrder.totalPrice;

      logTest("Commandes ont tous les champs requis", hasRequiredFields, hasRequiredFields ? undefined : "Champs manquants", {
        hasId: !!firstOrder.id,
        hasCustomerName: !!firstOrder.customerName,
        hasPhone: !!firstOrder.phone,
        hasAddress: !!firstOrder.address,
        hasStatus: !!firstOrder.status,
        hasTotalPrice: !!firstOrder.totalPrice
      });
    }

  } catch (error: any) {
    logTest("Compatibilité Backend", false, error.message);
  }
}

async function getTestData() {
  try {
    const restaurants = await storage.getAllRestaurants();
    for (const r of restaurants) {
      const pizzas = await storage.getPizzasByRestaurant(r.id);
      if (pizzas.length > 0) {
        const pizza = pizzas[0];
        const prices = await storage.getPizzaPrices(pizza.id);
        if (prices.length > 0) {
          return { restaurant: r, pizza, price: prices[0] };
        }
      }
    }
    return { restaurant: null, pizza: null, price: null };
  } catch (error) {
    return { restaurant: null, pizza: null, price: null };
  }
}

async function testHookCompatibility() {
  console.log("\n📋 Test 3: Compatibilité Hook V2");

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const hooksFile = path.join(process.cwd(), "client/src/features/order/hooks/use-order.ts");
    const hooksContent = await fs.readFile(hooksFile, "utf-8");

    // Vérifier que useCustomerOrders existe et retourne les bons types
    const hasUseCustomerOrders = hooksContent.includes("export function useCustomerOrders");
    logTest("Hook useCustomerOrders exporté", hasUseCustomerOrders, hasUseCustomerOrders ? undefined : "Hook manquant");

    // Vérifier que le hook utilise getCustomerOrders
    const usesGetCustomerOrders = hooksContent.includes("getCustomerOrders");
    logTest("Hook utilise getCustomerOrders", usesGetCustomerOrders, usesGetCustomerOrders ? undefined : "API incorrecte");

    // Vérifier que le hook utilise useQuery (qui retourne automatiquement data, isLoading, error, refetch)
    const usesUseQuery = hooksContent.includes("useQuery");
    const returnsObject = hooksContent.includes("return useQuery") || hooksContent.includes("return {") || hooksContent.includes("= useQuery");

    logTest("Hook utilise useQuery", usesUseQuery, usesUseQuery ? undefined : "useQuery non utilisé");
    logTest("Hook retourne un objet (avec data, isLoading, error, refetch)", returnsObject, returnsObject ? undefined : "Retour incorrect");
    
    // Vérifier que le hook est utilisé correctement dans le fichier migré
    if (usesUseQuery) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const newFile = path.join(process.cwd(), "client/src/pages/order-history-v2.tsx");
      const newFileExists = await fs.access(newFile).then(() => true).catch(() => false);
      
      if (newFileExists) {
        const newContent = await fs.readFile(newFile, "utf-8");
        const destructuresData = newContent.includes("data: orders") || newContent.includes("data =") || newContent.includes("data:");
        const destructuresIsLoading = newContent.includes("isLoading");
        const destructuresError = newContent.includes("error");
        const destructuresRefetch = newContent.includes("refetch");

        logTest("Fichier migré utilise 'data' du hook", destructuresData, destructuresData ? undefined : "Propriété 'data' non utilisée");
        logTest("Fichier migré utilise 'isLoading' du hook", destructuresIsLoading, destructuresIsLoading ? undefined : "Propriété 'isLoading' non utilisée");
        logTest("Fichier migré utilise 'error' du hook", destructuresError, destructuresError ? undefined : "Propriété 'error' non utilisée");
        logTest("Fichier migré utilise 'refetch' du hook", destructuresRefetch, destructuresRefetch ? undefined : "Fonction 'refetch' non utilisée");
      }
    }

  } catch (error: any) {
    logTest("Compatibilité Hook V2", false, error.message);
  }
}

async function testAPIClient() {
  console.log("\n📋 Test 4: Client API V2");

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const apiFile = path.join(process.cwd(), "client/src/features/order/order.api.ts");
    const apiContent = await fs.readFile(apiFile, "utf-8");

    // Vérifier que getCustomerOrders existe
    const hasGetCustomerOrders = apiContent.includes("export async function getCustomerOrders");
    logTest("Fonction getCustomerOrders exportée", hasGetCustomerOrders, hasGetCustomerOrders ? undefined : "Fonction manquante");

    // Vérifier que l'endpoint est correct
    const usesCorrectEndpoint = apiContent.includes("/orders/customer/");
    logTest("Utilise le bon endpoint (/orders/customer/)", usesCorrectEndpoint, usesCorrectEndpoint ? undefined : "Endpoint incorrect");

    // Vérifier le type de retour
    const returnsOrderArray = apiContent.includes("Promise<Order[]>");
    logTest("Retourne Promise<Order[]>", returnsOrderArray, returnsOrderArray ? undefined : "Type de retour incorrect");

  } catch (error: any) {
    logTest("Client API V2", false, error.message);
  }
}

async function runAllTests() {
  console.log("========================================");
  console.log("🧪 TESTS MIGRATION ORDER-HISTORY V2");
  console.log("========================================\n");

  // Test 1: Vérification des fichiers
  await testFileExists();

  // Test 2: Compatibilité Backend
  await testBackendCompatibility();

  // Test 3: Compatibilité Hook V2
  await testHookCompatibility();

  // Test 4: Client API V2
  await testAPIClient();

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
  } else {
    console.log("\n🎉 Tous les tests passent !");
    console.log("\n✅ La migration est prête à être testée dans le navigateur.");
    console.log("   Allez sur http://localhost:5000/history-v2 pour tester.");
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
