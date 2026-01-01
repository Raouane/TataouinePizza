/**
 * Script de diagnostic pour les notifications Telegram
 * Vérifie la configuration et les livreurs disponibles
 */

import { storage } from '../server/storage.js';
import { telegramService } from '../server/services/telegram-service.js';

async function main() {
  console.log("========================================");
  console.log("🔍 DIAGNOSTIC TELEGRAM");
  console.log("========================================\n");

  // 1. Vérifier la configuration Telegram
  console.log("📋 1. Configuration Telegram");
  const isConfigured = telegramService.isReady();
  console.log(`   Bot configuré: ${isConfigured ? '✅ OUI' : '❌ NON'}`);
  
  if (!isConfigured) {
    console.log("\n❌ PROBLÈME: TELEGRAM_BOT_TOKEN non configuré !");
    console.log("   Solution: Ajoutez TELEGRAM_BOT_TOKEN dans votre fichier .env");
    console.log("   Format: TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
    return;
  }

  // 2. Vérifier les livreurs
  console.log("\n📋 2. Livreurs dans la base de données");
  const allDrivers = await storage.getAllDrivers();
  console.log(`   Total livreurs: ${allDrivers.length}`);

  if (allDrivers.length === 0) {
    console.log("\n❌ PROBLÈME: Aucun livreur dans la base de données !");
    console.log("   Solution: Créez au moins un livreur avec un telegramId");
    return;
  }

  // 3. Vérifier les livreurs avec Telegram
  console.log("\n📋 3. Livreurs avec Telegram configuré");
  const driversWithTelegram = allDrivers.filter(d => d.telegramId);
  console.log(`   Livreurs avec telegramId: ${driversWithTelegram.length}/${allDrivers.length}`);

  if (driversWithTelegram.length === 0) {
    console.log("\n❌ PROBLÈME: Aucun livreur n'a de telegramId !");
    console.log("   Solution: Ajoutez un telegramId aux livreurs dans la base de données");
    console.log("\n   Livreurs disponibles:");
    allDrivers.forEach(driver => {
      console.log(`     - ${driver.name} (${driver.phone}) - telegramId: ${driver.telegramId || '❌ MANQUANT'}`);
    });
    return;
  }

  // 4. Vérifier les livreurs disponibles
  console.log("\n📋 4. Livreurs disponibles (status: available ou on_delivery)");
  const availableDrivers = driversWithTelegram.filter(d => 
    d.status === 'available' || d.status === 'on_delivery'
  );
  console.log(`   Livreurs disponibles: ${availableDrivers.length}/${driversWithTelegram.length}`);

  if (availableDrivers.length === 0) {
    console.log("\n⚠️  ATTENTION: Aucun livreur disponible actuellement !");
    console.log("   Les livreurs doivent avoir status='available' ou 'on_delivery'");
    console.log("\n   Statuts des livreurs:");
    driversWithTelegram.forEach(driver => {
      console.log(`     - ${driver.name}: status=${driver.status}`);
    });
  }

  // 5. Vérifier les commandes actives par livreur
  console.log("\n📋 5. Commandes actives par livreur (limite: 2)");
  const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
  
  for (const driver of availableDrivers) {
    const driverOrders = await storage.getOrdersByDriver(driver.id);
    const activeOrders = driverOrders.filter(o => 
      o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
    );
    const canAcceptMore = activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER;
    
    console.log(`   ${driver.name}:`);
    console.log(`     - Commandes actives: ${activeOrders.length}/${MAX_ACTIVE_ORDERS_PER_DRIVER}`);
    console.log(`     - Peut accepter: ${canAcceptMore ? '✅ OUI' : '❌ NON (limite atteinte)'}`);
    console.log(`     - telegramId: ${driver.telegramId}`);
  }

  // 6. Résumé
  console.log("\n========================================");
  console.log("📊 RÉSUMÉ");
  console.log("========================================\n");

  const trulyAvailableDrivers = await Promise.all(
    availableDrivers.map(async (driver) => {
      const driverOrders = await storage.getOrdersByDriver(driver.id);
      const activeOrders = driverOrders.filter(o => 
        o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
      );
      return {
        driver,
        canAcceptMore: activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER
      };
    })
  );

  const canAccept = trulyAvailableDrivers.filter(({ canAcceptMore }) => canAcceptMore);

  if (canAccept.length === 0) {
    console.log("❌ Aucun livreur ne peut accepter de nouvelles commandes");
    console.log("   Raisons possibles:");
    console.log("   - Tous les livreurs ont atteint la limite (2 commandes actives)");
    console.log("   - Tous les livreurs sont hors ligne (status != 'available' ou 'on_delivery')");
  } else {
    console.log(`✅ ${canAccept.length} livreur(s) peut/peuvent accepter des commandes:`);
    canAccept.forEach(({ driver }) => {
      console.log(`   - ${driver.name} (telegramId: ${driver.telegramId})`);
    });
  }

  // 7. Test d'envoi (optionnel)
  console.log("\n========================================");
  console.log("🧪 TEST D'ENVOI (optionnel)");
  console.log("========================================\n");
  console.log("Pour tester l'envoi d'un message Telegram:");
  console.log("  1. Utilisez le script: npm run script:test-telegram <chat-id>");
  console.log("  2. Ou testez directement dans le code avec une commande de test");
  console.log("\nPour obtenir votre chat-id Telegram:");
  console.log("  1. Parlez à @userinfobot sur Telegram");
  console.log("  2. Il vous donnera votre chat-id");
  console.log("  3. Ajoutez ce chat-id comme telegramId dans la base de données");
}

main().catch(console.error);
