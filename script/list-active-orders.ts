/**
 * Script pour lister les commandes actives d'un livreur
 * et les terminer si nécessaire
 */

import "dotenv/config";
import { storage } from '../server/storage.js';

async function main() {
  console.log("========================================");
  console.log("📋 COMMANDES ACTIVES PAR LIVREUR");
  console.log("========================================\n");

  const allDrivers = await storage.getAllDrivers();
  const driversWithTelegram = allDrivers.filter(d => d.telegramId);

  if (driversWithTelegram.length === 0) {
    console.log("❌ Aucun livreur avec Telegram trouvé");
    return;
  }

  for (const driver of driversWithTelegram) {
    console.log(`\n👤 ${driver.name} (${driver.phone})`);
    console.log(`   Status: ${driver.status}`);
    console.log(`   Telegram ID: ${driver.telegramId}`);
    
    const driverOrders = await storage.getOrdersByDriver(driver.id);
    const activeOrders = driverOrders.filter(o => 
      o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
    );
    
    console.log(`   Commandes actives: ${activeOrders.length}/2`);
    
    if (activeOrders.length > 0) {
      console.log("\n   📦 Commandes actives:");
      for (const order of activeOrders) {
        console.log(`      - ${order.id.slice(0, 8)}... - Status: ${order.status}`);
        console.log(`        Client: ${order.customerName}`);
        console.log(`        Créée: ${new Date(order.createdAt).toLocaleString()}`);
        console.log(`        URL: http://localhost:5000/driver/dashboard?order=${order.id}`);
      }
    } else {
      console.log("   ✅ Aucune commande active");
    }
  }

  console.log("\n========================================");
  console.log("💡 POUR TERMINER UNE COMMANDE:");
  console.log("========================================");
  console.log("1. Allez sur le dashboard livreur:");
  console.log("   http://localhost:5000/driver/dashboard");
  console.log("\n2. Trouvez la commande dans la liste");
  console.log("\n3. Cliquez sur 'Marquer comme livrée'");
  console.log("\nOU utilisez l'API directement:");
  console.log("   PATCH /api/driver/orders/:id/status");
  console.log("   Body: { \"status\": \"delivered\" }");
  console.log("\n========================================");
}

main().catch(console.error);
