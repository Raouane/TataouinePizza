/**
 * Test de l'API avec diagnostics complets pour comprendre le problème
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";

async function testAPIWithDiagnostics() {
  try {
    console.log("🧪 Test de l'API avec diagnostics complets...\n");
    
    // Simuler exactement ce que fait la route /api/restaurants
    console.log("=".repeat(60));
    console.log("1️⃣ DIAGNOSTIC TIMEZONE/HEURE");
    console.log("=".repeat(60));
    const now = new Date();
    console.log("[API] Now raw:", now);
    console.log("[API] Now ISO:", now.toISOString());
    console.log("[API] Now locale:", now.toLocaleString("fr-FR"));
    console.log("[API] Timezone offset (min):", now.getTimezoneOffset());
    console.log("[API] process.env.TZ:", process.env.TZ);
    console.log("[API] Runtime:", process.env.NEXT_RUNTIME || "Node.js");
    console.log("");
    
    console.log("=".repeat(60));
    console.log("2️⃣ RÉCUPÉRATION DES DONNÉES DE LA BASE");
    console.log("=".repeat(60));
    const restaurants = await storage.getAllRestaurants();
    
    const bouba = restaurants.find(r => r.name && r.name.toLowerCase().includes('bouba'));
    
    if (!bouba) {
      console.log("❌ BOUBA non trouvé dans la base de données");
      return;
    }
    
    console.log("[DB] ========== BOUBA DANS LA BASE DE DONNÉES ==========");
    console.log(`[DB] Restaurant ${bouba.name} - isOpen: ${bouba.isOpen}`);
    console.log(`[DB] Restaurant ${bouba.name} - openingHours: ${bouba.openingHours}`);
    console.log(`[DB] Restaurant ${bouba.name} - openingHours type: ${typeof bouba.openingHours}`);
    console.log("[DB] ===================================================");
    console.log("");
    
    console.log("=".repeat(60));
    console.log("3️⃣ CALCUL DU STATUT");
    console.log("=".repeat(60));
    const status = checkRestaurantStatus(bouba);
    console.log("");
    
    console.log("=".repeat(60));
    console.log("4️⃣ RÉSULTAT FINAL");
    console.log("=".repeat(60));
    console.log(`📊 BOUBA - Statut calculé:`, JSON.stringify(status, null, 2));
    
    const now2 = new Date();
    console.log(`⏰ Heure actuelle: ${now2.getHours()}:${now2.getMinutes()}`);
    
    if (status.isOpen) {
      console.log(`\n⚠️  PROBLÈME: Le serveur calcule BOUBA comme OUVERT !`);
      console.log(`   - Horaires: ${bouba.openingHours}`);
      console.log(`   - Heure actuelle: ${now2.getHours()}:${now2.getMinutes()}`);
      console.log(`   - Raison: ${status.reason || 'unknown'}`);
    } else {
      console.log(`\n✅ Le serveur calcule correctement BOUBA comme FERMÉ`);
      console.log(`   - Raison: ${status.reason || 'unknown'}`);
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testAPIWithDiagnostics();

