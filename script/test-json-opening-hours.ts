/**
 * Script de test pour vérifier que le système fonctionne correctement
 * avec le nouveau format JSON pour les horaires d'ouverture
 */

import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";
import { eq } from "drizzle-orm";

async function testJSONOpeningHours() {
  try {
    console.log("🧪 Test du système d'horaires JSON...\n");
    
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📊 ${allRestaurants.length} restaurants trouvés\n`);
    
    let jsonFormat = 0;
    let oldFormat = 0;
    let nullOrEmpty = 0;
    let errors = 0;
    
    console.log("🔍 Vérification du format des horaires:\n");
    
    for (const restaurant of allRestaurants) {
      const hours = restaurant.openingHours;
      
      if (!hours || hours.trim() === '') {
        nullOrEmpty++;
        console.log(`⚪ "${restaurant.name}": Pas d'horaires définis`);
        continue;
      }
      
      if (hours.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(hours);
          jsonFormat++;
          console.log(`✅ "${restaurant.name}": Format JSON valide`);
          console.log(`   → ${JSON.stringify(parsed, null, 2)}`);
          
          // Tester la fonction checkRestaurantStatus
          const status = checkRestaurantStatus({
            isOpen: restaurant.isOpen,
            openingHours: hours
          });
          console.log(`   → Statut actuel: ${status.isOpen ? 'OUVERT' : 'FERMÉ'} (${status.reason || 'heures'})`);
          
        } catch (error) {
          errors++;
          console.log(`❌ "${restaurant.name}": JSON invalide - ${error}`);
        }
      } else {
        oldFormat++;
        console.log(`⚠️  "${restaurant.name}": Ancien format détecté`);
        console.log(`   → "${hours}"`);
        console.log(`   → ⚠️  Devrait être migré vers JSON`);
      }
      
      console.log('');
    }
    
    console.log("\n📈 Résumé des tests:");
    console.log(`   ✅ Format JSON: ${jsonFormat}`);
    console.log(`   ⚠️  Ancien format: ${oldFormat}`);
    console.log(`   ⚪ Null ou vides: ${nullOrEmpty}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    
    if (oldFormat > 0) {
      console.log(`\n⚠️  Attention: ${oldFormat} restaurant(s) utilisent encore l'ancien format.`);
      console.log(`   Exécutez le script de migration: npx tsx script/migrate-opening-hours-to-json.ts`);
    } else {
      console.log(`\n✨ Tous les restaurants utilisent le nouveau format JSON !`);
    }
    
    // Test de création d'un format JSON
    console.log("\n🧪 Test de création d'un format JSON:");
    const testJSON = JSON.stringify({
      open: "09:00",
      close: "23:00",
      closedDay: null
    });
    console.log(`   Format créé: ${testJSON}`);
    
    const testStatus = checkRestaurantStatus({
      isOpen: true,
      openingHours: testJSON
    });
    console.log(`   Statut test: ${testStatus.isOpen ? 'OUVERT' : 'FERMÉ'}`);
    
  } catch (error: any) {
    console.error("❌ Erreur lors des tests:", error);
    process.exit(1);
  }
}

// Exécuter les tests
testJSONOpeningHours()
  .then(() => {
    console.log("\n✅ Tests terminés");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

