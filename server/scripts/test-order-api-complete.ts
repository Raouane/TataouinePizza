/**
 * Script de test complet : Commande de A à Z
 * 
 * Ce script teste le flux complet d'une commande :
 * 1. Récupération des restaurants disponibles
 * 2. Récupération du menu d'un restaurant
 * 3. Création d'une commande via OrderCreationService
 * 4. Vérification de la commande créée
 * 
 * Usage: npx tsx server/scripts/test-order-api-complete.ts
 * 
 * Note: Ce script utilise directement le storage et les services,
 * pas besoin que le serveur HTTP soit démarré.
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { OrderCreationService } from "../services/order-creation-service.js";

// Couleurs pour la console
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
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

async function testGetRestaurants() {
  logStep(1, "Récupération de la liste des restaurants");
  
  try {
    const restaurants = await storage.getAllRestaurants();
    
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      throw new Error("Aucun restaurant trouvé");
    }
    
    logSuccess(`${restaurants.length} restaurant(s) trouvé(s)`);
    restaurants.forEach((restaurant: any, index: number) => {
      logInfo(`  ${index + 1}. ${restaurant.name} (${restaurant.id}) - ${restaurant.isOpen ? "Ouvert" : "Fermé"}`);
    });
    
    return restaurants;
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

async function testGetRestaurantMenu(restaurantId: string) {
  logStep(2, `Récupération du menu du restaurant ${restaurantId}`);
  
  try {
    const pizzas = await storage.getPizzasByRestaurant(restaurantId);
    
    if (!Array.isArray(pizzas) || pizzas.length === 0) {
      throw new Error("Aucun produit trouvé dans le menu");
    }
    
    // Récupérer les prix pour chaque pizza
    const menuWithPrices = await Promise.all(
      pizzas.map(async (pizza) => {
        const prices = await storage.getPizzaPrices(pizza.id);
        return { ...pizza, prices };
      })
    );
    
    logSuccess(`${menuWithPrices.length} produit(s) trouvé(s) dans le menu`);
    
    // Afficher quelques produits avec leurs prix
    menuWithPrices.slice(0, 3).forEach((product: any, index: number) => {
      const prices = product.prices || [];
      const priceInfo = prices.length > 0 
        ? prices.map((p: any) => `${p.size}: ${p.price} TND`).join(", ")
        : "Pas de prix";
      logInfo(`  ${index + 1}. ${product.name} - ${priceInfo}`);
    });
    
    return menuWithPrices;
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

async function testCreateOrder(restaurantId: string, menu: any[]) {
  logStep(3, "Création d'une commande via OrderCreationService");
  
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
      // Essayer avec n'importe quelle taille
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
    
    // Créer la commande
    const orderData = {
      restaurantId: restaurantId,
      customerName: "Test Client",
      phone: randomPhone,
      address: "123 Rue de Test, Tataouine",
      addressDetails: "Appartement 3, 2ème étage",
      customerLat: 33.8869, // Coordonnées de Tunisie
      customerLng: 10.1000,
      items: [
        {
          pizzaId: selectedProduct.id,
          size: selectedPrice.size,
          quantity: 2,
        }
      ],
      paymentMethod: "cash",
      notes: "Commande de test automatique",
    };
    
    logInfo("Données de la commande:");
    logInfo(`  - Restaurant: ${restaurantId}`);
    logInfo(`  - Client: ${orderData.customerName}`);
    logInfo(`  - Téléphone: ${orderData.phone}`);
    logInfo(`  - Adresse: ${orderData.address}`);
    logInfo(`  - Items: ${orderData.items.length} article(s)`);
    
    const result = await OrderCreationService.createOrder(orderData);
    
    if (!result.orderId) {
      throw new Error("La commande n'a pas été créée (pas d'orderId dans la réponse)");
    }
    
    logSuccess(`Commande créée avec succès!`);
    logInfo(`  - Order ID: ${result.orderId}`);
    logInfo(`  - Prix total: ${result.totalPrice} TND`);
    if (result.duplicate) {
      logInfo(`  - ⚠️ Doublon détecté (commande existante retournée)`);
    }
    
    return {
      orderId: result.orderId,
      totalPrice: result.totalPrice,
      phone: orderData.phone,
    };
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

async function testGetOrder(orderId: string) {
  logStep(4, `Vérification de la commande ${orderId}`);
  
  try {
    const order = await storage.getOrderById(orderId);
    
    if (!order || order.id !== orderId) {
      throw new Error("La commande récupérée ne correspond pas");
    }
    
    logSuccess("Commande récupérée avec succès");
    logInfo(`  - ID: ${order.id}`);
    logInfo(`  - Statut: ${order.status}`);
    logInfo(`  - Client: ${order.customerName}`);
    logInfo(`  - Téléphone: ${order.phone}`);
    logInfo(`  - Adresse: ${order.address}`);
    logInfo(`  - Prix total: ${order.totalPrice} TND`);
    logInfo(`  - Restaurant ID: ${order.restaurantId}`);
    
    // Récupérer les items de la commande
    const items = await storage.getOrderItems(orderId);
    logInfo(`  - Items: ${items.length} article(s)`);
    items.forEach((item, index) => {
      logInfo(`    ${index + 1}. Pizza ID: ${item.pizzaId}, Taille: ${item.size}, Quantité: ${item.quantity}, Prix unitaire: ${item.pricePerUnit} TND`);
    });
    
    return order;
  } catch (error: any) {
    logError(`Erreur: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("========================================");
  console.log("🧪 TEST COMPLET : COMMANDE DE A À Z");
  console.log("========================================");
  console.log("Test via OrderCreationService (pas besoin de serveur HTTP)\n");
  
  try {
    // Étape 1: Récupérer les restaurants
    const restaurants = await testGetRestaurants();
    
    // Sélectionner le premier restaurant ouvert
    const restaurant = restaurants.find((r: any) => r.isOpen) || restaurants[0];
    if (!restaurant) {
      throw new Error("Aucun restaurant disponible");
    }
    
    logInfo(`\nRestaurant sélectionné: ${restaurant.name} (${restaurant.id})`);
    
    // Étape 2: Récupérer le menu
    const menu = await testGetRestaurantMenu(restaurant.id);
    
    // Étape 3: Créer une commande
    const orderResult = await testCreateOrder(restaurant.id, menu);
    
    // Étape 4: Vérifier la commande
    await testGetOrder(orderResult.orderId);
    
    // Résumé final
    console.log("\n========================================");
    console.log("🎉 RÉSUMÉ DU TEST");
    console.log("========================================");
    logSuccess("✅ Récupération des restaurants: OK");
    logSuccess("✅ Récupération du menu: OK");
    logSuccess("✅ Création de commande: OK");
    logSuccess("✅ Vérification de commande: OK");
    console.log("\n📊 Détails de la commande testée:");
    console.log(`   - Order ID: ${orderResult.orderId}`);
    console.log(`   - Prix total: ${orderResult.totalPrice} TND`);
    console.log(`   - Téléphone: ${orderResult.phone}`);
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
