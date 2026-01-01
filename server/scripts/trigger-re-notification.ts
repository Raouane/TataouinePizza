/**
 * Script pour déclencher manuellement la re-notification des commandes en attente
 * Usage: npx tsx server/scripts/trigger-re-notification.ts [driverId]
 */

import "dotenv/config";
import { checkAndNotifyPendingOrdersForDriver } from "../websocket.js";

async function triggerReNotification() {
  try {
    const driverId = process.argv[2];
    
    if (!driverId) {
      console.error("❌ Usage: npx tsx server/scripts/trigger-re-notification.ts [driverId]");
      console.error("💡 Exemple: npx tsx server/scripts/trigger-re-notification.ts 2d780c33-f2f5-47e1-8f15-0d40875c878e");
      process.exit(1);
    }

    console.log("========================================");
    console.log("🔔 DÉCLENCHEMENT RE-NOTIFICATION");
    console.log("========================================");
    console.log(`📋 Driver ID: ${driverId}`);
    console.log("");

    await checkAndNotifyPendingOrdersForDriver(driverId);

    console.log("");
    console.log("✅ Re-notification déclenchée");
    console.log("💡 Vérifiez votre téléphone Telegram pour voir si une notification a été reçue");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

triggerReNotification();
