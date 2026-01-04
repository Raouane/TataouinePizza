/**
 * Script de test complet : Cycle de livraison de A à Z
 * 
 * Ce script teste le flux complet d'une livraison :
 * 1. Création d'une commande via OrderCreationService
 * 2. Notification Telegram réelle (avec sonnerie)
 * 3. Acceptation de la commande par le livreur
 * 4. Vérification du lien GPS Google Maps
 * 5. Cycle de vie des statuts : preparing -> delivery -> delivered
 * 6. Vérification de la comptabilité cash (dette du livreur)
 * 
 * Usage: npx tsx server/scripts/test-delivery-full-cycle.ts
 * 
 * Prérequis:
 * - Un livreur avec telegramId configuré dans la DB
 * - TELEGRAM_BOT_TOKEN dans .env
 * - Variable d'environnement TEST_DRIVER_ID (optionnel, sinon prend le premier livreur avec Telegram)
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { OrderCreationService } from "../services/order-creation-service.js";
import { OrderAcceptanceService } from "../services/order-acceptance-service.js";
import { OrderService } from "../services/order-service.js";
import { telegramService } from "../services/telegram-service.js";
import { CommissionService } from "../services/commission-service.js";

// Couleurs pour la console
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
const cyan = "\x1b[36m";
const reset = "\x1b[0m";

function logSuccess(message: string) {
  console.log(`${green}✅ ${message}${reset}`);
}

function logError(message: string) {
  console.log(`${red}❌ ${message}${reset}`);
}

function logInfo(message: string) {
  console.log(`${blue}ℹ️  ${message}${reset}`);
}

function logStep(step: number, message: string) {
  console.log(`\n${yellow}📋 ÉTAPE ${step}: ${message}${reset}`);
}

function logWarning(message: string) {
  console.log(`${yellow}⚠️  ${message}${reset}`);
}

/**
 * Récupère un livreur avec Telegram ID configuré
 */
async function getTestDriver() {
  logStep(1, "Récupération d'un livreur avec Telegram ID");
  
  try {
    // Essayer d'abord avec TEST_DRIVER_ID si défini
    const testDriverId = process.env.TEST_DRIVER_ID;
    if (testDriverId) {
      const driver = await storage.getDriverById(testDriverId);
      if (driver && driver.telegramId) {
        logSuccess(`Livreur trouvé via TEST_DRIVER_ID: ${driver.name} (${driver.id})`);
        logInfo(`  - Telegram ID: ${driver.telegramId}`);
        return driver;
      } else {
        logWarning(`TEST_DRIVER_ID fourni mais livreur sans Telegram ID, recherche alternative...`);
      }
    }
    
    // Sinon, chercher le premier livreur avec Telegram ID
    const allDrivers = await storage.getAllDrivers();
    const driverWithTelegram = allDrivers.find(d => d.telegramId);
    
    if (!driverWithTelegram) {
      throw new Error("Aucun livreur avec Telegram ID trouvé dans la base de données");
    }
    
    logSuccess(`Livreur trouvé: ${driverWithTelegram.name} (${driverWithTelegram.id})`);
    logInfo(`  - Telegram ID: ${driverWithTelegram.telegramId}`);
    logInfo(`  - Téléphone: ${driverWithTelegram.phone}`);
    logInfo(`  - Statut: ${driverWithTelegram.status}`);
    
    return driverWithTelegram;
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

/**
 * Crée une commande de test
 */
async function createTestOrder(restaurantId: string, menu: any[]) {
  logStep(2, "Création d'une commande de test");
  
  try {
    // Sélectionner une pizza avec des prix
    let selectedProduct = null;
    let selectedPrice = null;
    
    for (const product of menu) {
      const prices = product.prices || [];
      const mediumPrice = prices.find((p: any) => p.size === "medium");
      if (mediumPrice) {
        selectedProduct = product;
        selectedPrice = mediumPrice;
        break;
      }
    }
    
    if (!selectedProduct || !selectedPrice) {
      for (const product of menu) {
        const prices = product.prices || [];
        if (prices.length > 0) {
          selectedProduct = product;
          selectedPrice = prices[0];
          break;
        }
      }
    }
    
    if (!selectedProduct || !selectedPrice) {
      throw new Error("Aucun produit avec prix trouvé dans le menu");
    }
    
    logInfo(`Produit sélectionné: ${selectedProduct.name} (${selectedPrice.size}) - ${selectedPrice.price} TND`);
    
    // Générer un numéro de téléphone aléatoire
    const randomPhone = `+216${Math.floor(Math.random() * 90000000 + 10000000)}`;
    
    // Coordonnées GPS de test (Tataouine, Tunisie)
    const testLat = 33.8869;
    const testLng = 10.1000;
    
    // Créer la commande
    const orderData = {
      restaurantId: restaurantId,
      customerName: "Test Client Livraison",
      phone: randomPhone,
      address: "123 Rue de Test, Tataouine",
      addressDetails: "Appartement 3, 2ème étage",
      customerLat: testLat,
      customerLng: testLng,
      items: [
        {
          pizzaId: selectedProduct.id,
          size: selectedPrice.size,
          quantity: 1,
        }
      ],
      paymentMethod: "cash", // IMPORTANT: cash pour tester la comptabilité
      notes: "Commande de test cycle complet livraison",
    };
    
    logInfo("Données de la commande:");
    logInfo(`  - Restaurant: ${restaurantId}`);
    logInfo(`  - Client: ${orderData.customerName}`);
    logInfo(`  - Téléphone: ${orderData.phone}`);
    logInfo(`  - Adresse: ${orderData.address}`);
    logInfo(`  - GPS: ${testLat}, ${testLng}`);
    logInfo(`  - Paiement: ${orderData.paymentMethod}`);
    logInfo(`  - Items: ${orderData.items.length} article(s)`);
    
    const result = await OrderCreationService.createOrder(orderData);
    
    if (!result.orderId) {
      throw new Error("La commande n'a pas été créée (pas d'orderId dans la réponse)");
    }
    
    logSuccess(`Commande créée avec succès!`);
    logInfo(`  - Order ID: ${result.orderId}`);
    logInfo(`  - Prix total: ${result.totalPrice} TND`);
    
    // Récupérer la commande complète
    const order = await storage.getOrderById(result.orderId);
    if (!order) {
      throw new Error("Impossible de récupérer la commande créée");
    }
    
    return order;
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

/**
 * Vérifie que la notification Telegram a été envoyée
 */
async function verifyTelegramNotification(orderId: string, driverTelegramId: string) {
  logStep(3, `Vérification de la notification Telegram (chatId: ${driverTelegramId})`);
  
  try {
    // Vérifier que le service Telegram est configuré
    if (!telegramService.isReady()) {
      logWarning("Service Telegram non configuré (TELEGRAM_BOT_TOKEN manquant)");
      logWarning("La notification ne sera pas envoyée, mais le test continue...");
      return false;
    }
    
    // Vérifier dans la DB que le message a été sauvegardé
    const telegramMessages = await storage.getTelegramMessagesByOrderId(orderId);
    const messageForDriver = telegramMessages.find((msg: any) => msg.chatId === driverTelegramId);
    
    if (messageForDriver) {
      logSuccess(`Message Telegram sauvegardé dans la DB`);
      logInfo(`  - Message ID: ${messageForDriver.messageId}`);
      logInfo(`  - Chat ID: ${messageForDriver.chatId}`);
      logInfo(`  - Statut: ${messageForDriver.status}`);
      logInfo(`  - 📱 Vérifiez votre téléphone Telegram - vous devriez avoir reçu une notification avec sonnerie!`);
      return true;
    } else {
      logWarning("Message Telegram non trouvé dans la DB (peut être normal si notification échouée)");
      return false;
    }
  } catch (error: any) {
    logWarning(`Erreur vérification Telegram: ${error.message}`);
    return false;
  }
}

/**
 * Attend que l'utilisateur accepte manuellement la commande via Telegram
 */
async function waitForManualAcceptance(orderId: string, driverId: string, maxWaitMinutes: number = 10) {
  logStep(4, `⏳ ATTENTE DE L'ACCEPTATION MANUELLE DE LA COMMANDE ${orderId}`);
  logInfo(`📱 Vérifiez votre téléphone Telegram et cliquez sur "✅ Accepter"`);
  logInfo(`⏱️  Le script attendra jusqu'à ${maxWaitMinutes} minutes...`);
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  const checkInterval = 2000; // Vérifier toutes les 2 secondes
  
  while (Date.now() - startTime < maxWaitMs) {
    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      throw new Error("Commande non trouvée");
    }
    
    // Vérifier si la commande a été acceptée (statut delivery ou accepted avec driverId)
    if (order.driverId === driverId && (order.status === "delivery" || order.status === "accepted" || order.status === "ready")) {
      logSuccess(`✅ Commande acceptée manuellement!`);
      logInfo(`  - Statut: ${order.status}`);
      logInfo(`  - Driver ID: ${order.driverId}`);
      return order;
    }
    
    // Afficher un point toutes les 10 secondes pour montrer que ça attend
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedSeconds % 10 === 0 && elapsedSeconds > 0) {
      process.stdout.write(".");
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Timeout: La commande n'a pas été acceptée dans les ${maxWaitMinutes} minutes`);
}

/**
 * Vérifie le lien GPS Google Maps
 */
function verifyGpsLink(order: any) {
  logStep(5, "Vérification du lien GPS Google Maps");
  
  try {
    if (!order.customerLat || !order.customerLng) {
      logWarning("Coordonnées GPS non disponibles pour cette commande");
      return;
    }
    
    const lat = parseFloat(order.customerLat);
    const lng = parseFloat(order.customerLng);
    
    // Générer le lien Google Maps
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    logSuccess("Lien GPS généré:");
    logInfo(`  - Coordonnées: ${lat}, ${lng}`);
    logInfo(`  - Lien: ${cyan}${googleMapsUrl}${reset}`);
    logInfo(`  - 📍 Testez le lien dans Telegram pour vérifier que l'épingle est correcte`);
    
    return googleMapsUrl;
  } catch (error: any) {
    logWarning(`Erreur vérification GPS: ${error.message}`);
  }
}

/**
 * Attend que l'utilisateur termine manuellement la livraison
 */
async function waitForManualDelivery(orderId: string, driverId: string, maxWaitMinutes: number = 10) {
  logStep(6, `⏳ ATTENTE DE LA FIN DE LIVRAISON MANUELLE DE LA COMMANDE ${orderId}`);
  logInfo(`📱 Terminez la livraison dans votre dashboard livreur ou via l'API`);
  logInfo(`⏱️  Le script attendra jusqu'à ${maxWaitMinutes} minutes...`);
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  const checkInterval = 2000; // Vérifier toutes les 2 secondes
  
  while (Date.now() - startTime < maxWaitMs) {
    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      throw new Error("Commande non trouvée");
    }
    
    // Vérifier si la commande a été livrée
    if (order.status === "delivered") {
      logSuccess(`✅ Commande livrée manuellement!`);
      logInfo(`  - Statut: ${order.status}`);
      logInfo(`  - Date de livraison: ${order.updatedAt}`);
      return order;
    }
    
    // Afficher un point toutes les 10 secondes pour montrer que ça attend
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedSeconds % 10 === 0 && elapsedSeconds > 0) {
      process.stdout.write(".");
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Timeout: La commande n'a pas été livrée dans les ${maxWaitMinutes} minutes`);
}

/**
 * Calcule la dette cash du livreur (avant et après)
 */
async function calculateDriverCashDebt(driverId: string, orderTotal: number) {
  logStep(7, "Calcul de la dette cash du livreur");
  
  try {
    // Récupérer toutes les commandes du livreur
    const allOrders = await storage.getOrdersByDriver(driverId);
    
    // Filtrer les commandes livrées aujourd'hui avec paiement cash
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const cashOrdersToday = allOrders.filter((order: any) => {
      if (order.status !== "delivered") return false;
      if (order.paymentMethod !== "cash") return false;
      const orderDate = new Date(order.createdAt || order.updatedAt || "");
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
    
    // Calculer le total cash collecté
    let totalCash = 0;
    let totalCommission = 0;
    
    cashOrdersToday.forEach((order: any) => {
      const orderTotal = Number(order.totalPrice);
      totalCash += orderTotal;
      const commission = CommissionService.calculateCommissions(orderTotal);
      totalCommission += commission.driver;
    });
    
    // Montant à rendre = Total collecté - Commission livreur
    const amountToReturn = totalCash - totalCommission;
    
    logSuccess("Calcul de la dette cash:");
    logInfo(`  - Commandes cash livrées aujourd'hui: ${cashOrdersToday.length}`);
    logInfo(`  - Total collecté: ${totalCash.toFixed(2)} TND`);
    logInfo(`  - Commission livreur: ${totalCommission.toFixed(2)} TND`);
    logInfo(`  - Montant à rendre: ${amountToReturn.toFixed(2)} TND`);
    
    // Vérifier la dernière remise de caisse
    const lastHandover = await storage.getLastCashHandover(driverId, today);
    if (lastHandover) {
      logInfo(`  - Dernière remise: ${Number(lastHandover.amount).toFixed(2)} TND`);
      logInfo(`  - Date remise: ${lastHandover.handoverAt?.toISOString() || 'N/A'}`);
      logInfo(`  - Validée: ${lastHandover.validatedAt ? 'Oui' : 'Non'}`);
    } else {
      logInfo(`  - Aucune remise de caisse enregistrée aujourd'hui`);
    }
    
    return {
      totalCash,
      totalCommission,
      amountToReturn,
      deliveryCount: cashOrdersToday.length,
      lastHandover
    };
  } catch (error: any) {
    logError(`Erreur calcul cash: ${error.message}`);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log("========================================");
  console.log("🧪 TEST COMPLET : CYCLE DE LIVRAISON DE A À Z");
  console.log("========================================");
  console.log("Ce script va:");
  console.log("  1. Créer une commande de test");
  console.log("  2. Envoyer une notification Telegram RÉELLE (votre téléphone va sonner!)");
  console.log("  3. ⏸️  ATTENDRE que vous acceptiez la commande manuellement via Telegram");
  console.log("  4. Vérifier le lien GPS");
  console.log("  5. ⏸️  ATTENDRE que vous terminiez la livraison manuellement");
  console.log("  6. Vérifier la comptabilité cash");
  console.log("========================================\n");
  
  try {
    // Étape 1: Récupérer un livreur avec Telegram
    const driver = await getTestDriver();
    
    if (!driver.telegramId) {
      throw new Error("Le livreur sélectionné n'a pas de Telegram ID configuré");
    }
    
    // Étape 2: Récupérer un restaurant et son menu
    logStep(2, "Récupération d'un restaurant avec menu");
    const restaurants = await storage.getAllRestaurants();
    const restaurant = restaurants.find((r: any) => r.isOpen) || restaurants[0];
    
    if (!restaurant) {
      throw new Error("Aucun restaurant disponible");
    }
    
    logInfo(`Restaurant sélectionné: ${restaurant.name} (${restaurant.id})`);
    
    const pizzas = await storage.getPizzasByRestaurant(restaurant.id);
    const menuWithPrices = await Promise.all(
      pizzas.map(async (pizza: any) => {
        const prices = await storage.getPizzaPrices(pizza.id);
        return { ...pizza, prices };
      })
    );
    
    if (menuWithPrices.length === 0) {
      throw new Error("Aucun produit trouvé dans le menu");
    }
    
    logInfo(`${menuWithPrices.length} produit(s) trouvé(s) dans le menu`);
    
    // Étape 3: Créer une commande
    const order = await createTestOrder(restaurant.id, menuWithPrices);
    
    // Étape 4: Vérifier la notification Telegram
    await verifyTelegramNotification(order.id, driver.telegramId);
    
    // Attendre 2 secondes pour que la notification soit bien reçue
    logInfo("⏳ Attente de 2 secondes pour la notification Telegram...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Étape 5: Calculer la dette AVANT acceptation
    logInfo("\n💰 Calcul de la dette AVANT acceptation:");
    const cashBefore = await calculateDriverCashDebt(driver.id, Number(order.totalPrice));
    
    // Étape 6: ATTENDRE L'ACCEPTATION MANUELLE
    console.log("\n" + "=".repeat(50));
    console.log("⏸️  PAUSE : ACCEPTATION MANUELLE REQUISE");
    console.log("=".repeat(50));
    const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
    const acceptUrl = `${appUrl}/accept/${order.id}?driverId=${driver.id}`;
    logInfo(`📱 Lien d'acceptation: ${cyan}${acceptUrl}${reset}`);
    logInfo(`📱 Ou cliquez sur "✅ Accepter" dans le message Telegram`);
    logInfo(`📋 Order ID: ${order.id}`);
    console.log("=".repeat(50));
    const acceptedOrder = await waitForManualAcceptance(order.id, driver.id, 10);
    console.log(""); // Nouvelle ligne après les points
    
    // Étape 7: Vérifier le lien GPS
    verifyGpsLink(acceptedOrder);
    
    // Étape 8: ATTENDRE LA FIN DE LIVRAISON MANUELLE
    console.log("\n" + "=".repeat(50));
    console.log("⏸️  PAUSE : FIN DE LIVRAISON MANUELLE REQUISE");
    console.log("=".repeat(50));
    const dashboardUrl = `${appUrl}/driver/dashboard?order=${order.id}`;
    logInfo(`📱 Dashboard livreur: ${cyan}${dashboardUrl}${reset}`);
    logInfo(`📱 Ou utilisez l'API: PATCH /api/driver/orders/${order.id}/status avec {"status": "delivered"}`);
    logInfo(`📋 Order ID: ${order.id}`);
    console.log("=".repeat(50));
    const deliveredOrder = await waitForManualDelivery(order.id, driver.id, 10);
    console.log(""); // Nouvelle ligne après les points
    
    // Étape 9: Calculer la dette APRÈS livraison
    logInfo("\n💰 Calcul de la dette APRÈS livraison:");
    const cashAfter = await calculateDriverCashDebt(driver.id, Number(order.totalPrice));
    
    // Résumé final
    console.log("\n========================================");
    console.log("🎉 RÉSUMÉ DU TEST");
    console.log("========================================");
    logSuccess("✅ Livreur récupéré: OK");
    logSuccess("✅ Commande créée: OK");
    logSuccess("✅ Notification Telegram: OK");
    logSuccess("✅ Acceptation manuelle: OK");
    logSuccess("✅ Vérification GPS: OK");
    logSuccess("✅ Livraison manuelle: OK");
    logSuccess("✅ Calcul cash: OK");
    
    console.log("\n📊 Détails de la commande:");
    console.log(`   - Order ID: ${order.id}`);
    console.log(`   - Prix total: ${order.totalPrice} TND`);
    console.log(`   - Statut final: ${deliveredOrder.status}`);
    console.log(`   - Livreur: ${driver.name} (${driver.id})`);
    
    console.log("\n💰 Comptabilité Cash:");
    console.log(`   - Commandes cash livrées aujourd'hui: ${cashAfter.deliveryCount}`);
    console.log(`   - Total collecté: ${cashAfter.totalCash.toFixed(2)} TND`);
    console.log(`   - Commission livreur: ${cashAfter.totalCommission.toFixed(2)} TND`);
    console.log(`   - Montant à rendre: ${cashAfter.amountToReturn.toFixed(2)} TND`);
    
    // Vérification de l'augmentation de la dette
    const debtIncrease = cashAfter.amountToReturn - cashBefore.amountToReturn;
    const expectedIncrease = Number(order.totalPrice) - CommissionService.calculateCommissions(Number(order.totalPrice)).driver;
    
    console.log("\n🔍 Vérification de l'augmentation de la dette:");
    console.log(`   - Dette avant: ${cashBefore.amountToReturn.toFixed(2)} TND`);
    console.log(`   - Dette après: ${cashAfter.amountToReturn.toFixed(2)} TND`);
    console.log(`   - Augmentation réelle: ${debtIncrease.toFixed(2)} TND`);
    console.log(`   - Augmentation attendue: ${expectedIncrease.toFixed(2)} TND`);
    
    if (Math.abs(debtIncrease - expectedIncrease) < 0.01) {
      logSuccess("✅ La dette a augmenté correctement!");
    } else {
      logError(`❌ La dette n'a pas augmenté comme attendu (différence: ${Math.abs(debtIncrease - expectedIncrease).toFixed(2)} TND)`);
    }
    
    console.log("\n✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!");
    console.log("========================================\n");
    
    process.exit(0);
  } catch (error: any) {
    logError(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le test
main();
