/**
 * Test du statut de BOUBA avec l'heure réelle du serveur
 */

import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";
import { eq } from "drizzle-orm";

async function testBoubaRealTime() {
  try {
    console.log("🧪 Test du statut de BOUBA avec l'heure réelle du serveur...\n");
    
    // Récupérer bouba
    const bouba = await db.select().from(restaurants)
      .where(eq(restaurants.name, "bouba"))
      .limit(1);
    
    if (bouba.length === 0) {
      console.log("❌ Restaurant 'bouba' non trouvé");
      return;
    }
    
    const restaurant = bouba[0];
    const now = new Date();
    
    console.log("📊 Données de BOUBA:");
    console.log(`   - isOpen (toggle): ${restaurant.isOpen}`);
    console.log(`   - openingHours: ${restaurant.openingHours}`);
    console.log(`   - Type openingHours: ${typeof restaurant.openingHours}`);
    console.log(`\n⏰ Heure actuelle du serveur: ${now.getHours()}:${now.getMinutes()}`);
    console.log(`   - Date complète: ${now.toISOString()}`);
    console.log(`   - Fuseau horaire: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    
    // Calculer le statut
    console.log(`\n🔍 Calcul du statut...`);
    const status = checkRestaurantStatus({
      isOpen: restaurant.isOpen,
      openingHours: restaurant.openingHours
    });
    
    console.log(`\n📈 Résultat:`);
    console.log(`   - isOpen: ${status.isOpen}`);
    console.log(`   - reason: ${status.reason || 'heures'}`);
    
    if (status.isOpen) {
      console.log(`\n⚠️  PROBLÈME: BOUBA est calculé comme OUVERT alors qu'il devrait être FERMÉ !`);
    } else {
      console.log(`\n✅ BOUBA est correctement calculé comme FERMÉ`);
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error);
  }
}

testBoubaRealTime()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

