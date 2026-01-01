/**
 * Script pour mettre un livreur en statut "available"
 * Usage: npm run tsx server/scripts/set-driver-available.ts [driverId]
 */

import "dotenv/config";
import { storage } from "../storage.js";

async function setDriverAvailable() {
  try {
    const driverId = process.argv[2];
    
    if (!driverId) {
      console.error("❌ Usage: npm run tsx server/scripts/set-driver-available.ts [driverId]");
      console.error("💡 Exemple: npm run tsx server/scripts/set-driver-available.ts 2d780c33-f2f5-47e1-8f15-0d40875c878e");
      process.exit(1);
    }

    console.log("========================================");
    console.log("🔄 MISE À JOUR STATUT LIVREUR");
    console.log("========================================");
    console.log(`📋 Driver ID: ${driverId}`);

    // Récupérer le livreur
    const driver = await storage.getDriverById(driverId);
    
    if (!driver) {
      console.error(`❌ Livreur ${driverId} non trouvé`);
      process.exit(1);
    }

    console.log(`👤 Nom: ${driver.name}`);
    console.log(`📞 Téléphone: ${driver.phone}`);
    console.log(`📊 Statut actuel: ${driver.status}`);
    console.log(`📱 TelegramId: ${driver.telegramId || '❌ MANQUANT'}`);
    console.log("");

    // Mettre à jour le statut
    const updated = await storage.updateDriver(driverId, {
      status: "available",
      lastSeen: new Date()
    });

    console.log("✅ Statut mis à jour avec succès !");
    console.log(`📊 Nouveau statut: ${updated.status}`);
    console.log(`🕐 Last seen: ${updated.lastSeen}`);
    console.log("");
    console.log("🔔 Le livreur recevra maintenant les notifications Telegram pour les nouvelles commandes");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

setDriverAvailable();
