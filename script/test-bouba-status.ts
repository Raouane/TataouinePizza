/**
 * Script de test pour vérifier le statut de "bouba" à 12h57
 */

import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";
import { eq } from "drizzle-orm";

async function testBoubaStatus() {
  try {
    console.log("🧪 Test du statut de BOUBA à 12h57...\n");
    
    // Simuler l'heure 12:57
    const originalDate = Date;
    (global as any).Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super();
          this.setHours(12);
          this.setMinutes(57);
        } else {
          super(...args);
        }
      }
    } as any;
    
    // Récupérer bouba
    const bouba = await db.select().from(restaurants)
      .where(eq(restaurants.name, "bouba"))
      .limit(1);
    
    if (bouba.length === 0) {
      console.log("❌ Restaurant 'bouba' non trouvé");
      return;
    }
    
    const restaurant = bouba[0];
    console.log("📊 Données de BOUBA:");
    console.log(`   - isOpen (toggle): ${restaurant.isOpen}`);
    console.log(`   - openingHours: ${restaurant.openingHours}`);
    console.log(`   - Type openingHours: ${typeof restaurant.openingHours}`);
    
    // Vérifier le parsing JSON
    if (restaurant.openingHours) {
      try {
        const parsed = JSON.parse(restaurant.openingHours);
        console.log(`   - Parsed JSON:`, parsed);
      } catch (e) {
        console.log(`   - ❌ Erreur parsing JSON:`, e);
      }
    }
    
    // Calculer le statut
    const status = checkRestaurantStatus({
      isOpen: restaurant.isOpen,
      openingHours: restaurant.openingHours
    });
    
    console.log(`\n📈 Statut calculé:`);
    console.log(`   - isOpen: ${status.isOpen}`);
    console.log(`   - reason: ${status.reason || 'heures'}`);
    
    const now = new Date();
    console.log(`\n⏰ Heure simulée: ${now.getHours()}:${now.getMinutes()}`);
    console.log(`   - Heure en minutes: ${now.getHours() * 60 + now.getMinutes()}`);
    
    if (restaurant.openingHours) {
      try {
        const parsed = JSON.parse(restaurant.openingHours);
        const openMinutes = parseInt(parsed.open.split(':')[0]) * 60 + parseInt(parsed.open.split(':')[1]);
        const closeMinutes = parseInt(parsed.close.split(':')[0]) * 60 + parseInt(parsed.close.split(':')[1]);
        console.log(`   - Ouverture: ${parsed.open} (${openMinutes} min)`);
        console.log(`   - Fermeture: ${parsed.close} (${closeMinutes} min)`);
        console.log(`   - Dans les horaires: ${(now.getHours() * 60 + now.getMinutes()) >= openMinutes && (now.getHours() * 60 + now.getMinutes()) <= closeMinutes}`);
      } catch (e) {
        console.log(`   - ❌ Erreur calcul:`, e);
      }
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error);
  }
}

testBoubaStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

