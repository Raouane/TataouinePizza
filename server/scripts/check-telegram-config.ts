/**
 * Script de diagnostic pour vérifier la configuration Telegram
 */

import { storage } from '../storage.js';
import { telegramService } from '../services/telegram-service.js';

async function checkTelegramConfig() {
  console.log('========================================');
  console.log('🔍 DIAGNOSTIC CONFIGURATION TELEGRAM');
  console.log('========================================\n');

  // 1. Vérifier le bot Telegram
  console.log('1️⃣ Vérification du bot Telegram:');
  const isConfigured = telegramService.isReady();
  console.log(`   Bot configuré: ${isConfigured ? '✅ OUI' : '❌ NON'}`);
  
  if (!isConfigured) {
    console.log('   ⚠️ TELEGRAM_BOT_TOKEN manquant dans .env');
    console.log('   💡 Ajoutez TELEGRAM_BOT_TOKEN=... dans votre fichier .env');
  }
  console.log('');

  // 2. Vérifier les livreurs
  console.log('2️⃣ Vérification des livreurs:');
  const allDrivers = await storage.getAllDrivers();
  console.log(`   Total livreurs: ${allDrivers.length}`);
  console.log('');

  // 3. Détails de chaque livreur
  console.log('3️⃣ Détails des livreurs:');
  for (const driver of allDrivers) {
    console.log(`   📋 ${driver.name}:`);
    console.log(`      - ID: ${driver.id}`);
    console.log(`      - Status: ${driver.status}`);
    console.log(`      - TelegramId: ${driver.telegramId ? '✅ ' + driver.telegramId : '❌ MANQUANT'}`);
    
    // Vérifier les commandes actives
    const driverOrders = await storage.getOrdersByDriver(driver.id);
    const activeOrders = driverOrders.filter(o => 
      o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received'
    );
    console.log(`      - Commandes actives: ${activeOrders.length}/2`);
    
    // Vérifier si le livreur peut recevoir une notification
    const canReceiveNotification = 
      (driver.status === 'available' || driver.status === 'on_delivery') &&
      driver.telegramId &&
      activeOrders.length < 2;
    
    console.log(`      - Peut recevoir notification: ${canReceiveNotification ? '✅ OUI' : '❌ NON'}`);
    console.log('');
  }

  // 4. Résumé
  console.log('4️⃣ Résumé:');
  const availableDrivers = allDrivers.filter(d => 
    (d.status === 'available' || d.status === 'on_delivery') && d.telegramId
  );
  console.log(`   Livreurs disponibles avec Telegram: ${availableDrivers.length}`);
  
  const driversWithActiveOrders = await Promise.all(
    availableDrivers.map(async (driver) => {
      const driverOrders = await storage.getOrdersByDriver(driver.id);
      const activeOrders = driverOrders.filter(o => 
        o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received'
      );
      return { driver, activeOrdersCount: activeOrders.length };
    })
  );
  
  const trulyAvailable = driversWithActiveOrders.filter(({ activeOrdersCount }) => activeOrdersCount < 2);
  console.log(`   Livreurs pouvant accepter une nouvelle commande: ${trulyAvailable.length}`);
  console.log('');

  // 5. Recommandations
  console.log('5️⃣ Recommandations:');
  if (!isConfigured) {
    console.log('   ❌ Configurez TELEGRAM_BOT_TOKEN dans .env');
  }
  if (availableDrivers.length === 0) {
    console.log('   ❌ Aucun livreur disponible avec Telegram');
    console.log('   💡 Vérifiez que:');
    console.log('      - Les livreurs ont un statut "available" ou "on_delivery"');
    console.log('      - Les livreurs ont un telegramId configuré');
  }
  if (trulyAvailable.length === 0 && availableDrivers.length > 0) {
    console.log('   ⚠️ Tous les livreurs disponibles ont déjà 2 commandes actives');
  }
  if (trulyAvailable.length > 0 && isConfigured) {
    console.log('   ✅ Configuration correcte - Les notifications devraient fonctionner');
  }
  
  console.log('\n========================================');
  process.exit(0);
}

checkTelegramConfig().catch(error => {
  console.error('❌ Erreur lors du diagnostic:', error);
  process.exit(1);
});
