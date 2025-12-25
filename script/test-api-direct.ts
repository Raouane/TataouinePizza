/**
 * Test direct de l'API pour voir ce que le serveur retourne pour BOUBA
 * Simule exactement ce que fait la route /api/restaurants
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";

async function testAPIDirect() {
  try {
    console.log("🧪 Test direct de la logique API pour BOUBA...\n");
    
    // Simuler exactement ce que fait la route /api/restaurants
    const restaurants = await storage.getAllRestaurants();
    
    const bouba = restaurants.find(r => r.name && r.name.toLowerCase().includes('bouba'));
    
    if (!bouba) {
      console.log("❌ BOUBA non trouvé dans la base de données");
      return;
    }
    
    console.log("📊 BOUBA dans la base de données:");
    console.log(`   - name: ${bouba.name}`);
    console.log(`   - isOpen (toggle): ${bouba.isOpen}`);
    console.log(`   - openingHours: ${bouba.openingHours}`);
    console.log(`   - openingHours type: ${typeof bouba.openingHours}`);
    
    const now = new Date();
    console.log(`\n⏰ Heure actuelle du serveur:`);
    console.log(`   - Heure locale: ${now.getHours()}:${now.getMinutes()}`);
    console.log(`   - Date ISO: ${now.toISOString()}`);
    console.log(`   - Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    
    console.log(`\n🔍 Calcul du statut avec checkRestaurantStatus...`);
    const status = checkRestaurantStatus(bouba);
    
    console.log(`\n📈 Résultat du calcul:`);
    console.log(`   - computedStatus:`, JSON.stringify(status, null, 2));
    
    if (status.isOpen) {
      console.log(`\n⚠️  PROBLÈME: Le serveur calcule BOUBA comme OUVERT !`);
      console.log(`   - Horaires: ${bouba.openingHours}`);
      console.log(`   - Heure actuelle: ${now.getHours()}:${now.getMinutes()}`);
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

testAPIDirect();

