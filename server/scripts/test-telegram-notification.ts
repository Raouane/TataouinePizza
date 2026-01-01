/**
 * Script pour tester l'envoi d'une notification Telegram
 */

import { telegramService } from '../services/telegram-service.js';
import { storage } from '../storage.js';

async function testTelegramNotification() {
  console.log('========================================');
  console.log('🧪 TEST NOTIFICATION TELEGRAM');
  console.log('========================================\n');

  // 1. Vérifier la configuration
  console.log('1️⃣ Vérification de la configuration:');
  const isConfigured = telegramService.isReady();
  console.log(`   Bot configuré: ${isConfigured ? '✅ OUI' : '❌ NON'}`);
  
  if (!isConfigured) {
    console.log('   ⚠️ TELEGRAM_BOT_TOKEN manquant dans .env');
    process.exit(1);
  }
  console.log('');

  // 2. Récupérer un livreur avec Telegram
  console.log('2️⃣ Recherche d\'un livreur avec Telegram:');
  const allDrivers = await storage.getAllDrivers();
  const driversWithTelegram = allDrivers.filter(d => d.telegramId);
  
  if (driversWithTelegram.length === 0) {
    console.log('   ❌ Aucun livreur avec Telegram configuré');
    process.exit(1);
  }
  
  const testDriver = driversWithTelegram[0];
  console.log(`   ✅ Livreur trouvé: ${testDriver.name}`);
  console.log(`   📱 TelegramId: ${testDriver.telegramId}`);
  console.log(`   📊 Status: ${testDriver.status}`);
  console.log('');

  // 3. Envoyer une notification de test
  console.log('3️⃣ Envoi d\'une notification de test:');
  const testOrderId = 'test-' + Date.now();
  const success = await telegramService.sendOrderNotification(
    testDriver.telegramId!,
    testOrderId,
    'Client Test',
    '20.00',
    'Adresse Test, Tataouine',
    'Restaurant Test',
    testDriver.id
  );

  if (success) {
    console.log('   ✅ Notification envoyée avec succès !');
    console.log('   💡 Vérifiez votre téléphone Telegram pour voir la notification');
  } else {
    console.log('   ❌ Échec de l\'envoi de la notification');
    console.log('   💡 Vérifiez les logs ci-dessus pour plus de détails');
  }
  
  console.log('\n========================================');
  process.exit(success ? 0 : 1);
}

testTelegramNotification().catch(error => {
  console.error('❌ Erreur lors du test:', error);
  process.exit(1);
});
