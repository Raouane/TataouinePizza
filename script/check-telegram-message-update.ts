import "dotenv/config";
import { storage } from "../server/storage.js";

/**
 * Script de diagnostic pour vérifier les messages Telegram d'une commande
 * Usage: npm run check:telegram:message -- <orderId>
 */

async function checkTelegramMessage(orderId: string) {
  try {
    console.log(`\n🔍 Vérification des messages Telegram pour la commande: ${orderId}\n`);

    // Récupérer la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      process.exit(1);
    }

    console.log(`📋 Commande trouvée:`);
    console.log(`   - Statut: ${order.status}`);
    console.log(`   - Livreur: ${order.driverId || 'Aucun'}`);
    console.log(`   - Client: ${order.customerName}`);
    console.log(`   - Adresse: ${order.address}\n`);

    // Récupérer les messages Telegram
    const telegramMessages = await storage.getTelegramMessagesByOrderId(orderId);
    
    console.log(`📨 Messages Telegram trouvés: ${telegramMessages.length}\n`);

    if (telegramMessages.length === 0) {
      console.warn(`⚠️ Aucun message Telegram trouvé pour cette commande`);
      console.warn(`   Cela peut signifier que:`);
      console.warn(`   - Le message n'a pas été sauvegardé lors de l'envoi`);
      console.warn(`   - Le message a été supprimé`);
      console.warn(`   - La commande n'a pas été envoyée via Telegram\n`);
      process.exit(0);
    }

    telegramMessages.forEach((msg, index) => {
      console.log(`📨 Message ${index + 1}:`);
      console.log(`   - ID: ${msg.id}`);
      console.log(`   - Driver ID: ${msg.driverId}`);
      console.log(`   - Telegram ID: ${msg.driverTelegramId}`);
      console.log(`   - Message ID: ${msg.messageId}`);
      
      // Vérifier si le driverId correspond au livreur de la commande
      if (order.driverId && msg.driverId === order.driverId) {
        console.log(`   ✅ Ce message correspond au livreur de la commande\n`);
      } else if (order.driverId) {
        console.log(`   ⚠️ Ce message ne correspond PAS au livreur actuel (${order.driverId})\n`);
      } else {
        console.log(`   ⚠️ La commande n'a pas de livreur assigné\n`);
      }
    });

    // Si la commande a un livreur, vérifier s'il y a un message pour lui
    if (order.driverId) {
      const driverMessage = telegramMessages.find(msg => msg.driverId === order.driverId);
      if (driverMessage) {
        console.log(`✅ Message Telegram trouvé pour le livreur actuel`);
        console.log(`   - Message ID: ${driverMessage.messageId}`);
        console.log(`   - Telegram ID: ${driverMessage.driverTelegramId}`);
        console.log(`\n💡 Ce message devrait être mis à jour lors du changement de statut.\n`);
      } else {
        console.warn(`⚠️ Aucun message Telegram trouvé pour le livreur actuel (${order.driverId})`);
        console.warn(`   Les messages trouvés sont pour d'autres livreurs.\n`);
      }
    }

    console.log(`\n✅ Diagnostic terminé\n`);
  } catch (error: any) {
    console.error(`❌ Erreur:`, error.message);
    process.exit(1);
  }
}

// Récupérer l'orderId depuis les arguments
const orderId = process.argv[2];

if (!orderId) {
  console.error(`❌ Usage: npm run check:telegram:message -- <orderId>`);
  process.exit(1);
}

checkTelegramMessage(orderId).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Erreur fatale:`, error);
  process.exit(1);
});
