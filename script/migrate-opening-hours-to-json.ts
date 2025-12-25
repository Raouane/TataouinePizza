/**
 * Script de migration pour convertir les horaires d'ouverture
 * de l'ancien format texte vers le nouveau format JSON
 * 
 * Usage: npx tsx script/migrate-opening-hours-to-json.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

interface OpeningHoursJSON {
  open: string;
  close: string;
  closedDay?: string | null;
}

function convertToJSON(openingHours: string | null): string | null {
  if (!openingHours || openingHours.trim() === '') {
    return null;
  }
  
  // Si c'est déjà du JSON, le retourner tel quel
  if (openingHours.trim().startsWith('{')) {
    try {
      JSON.parse(openingHours); // Vérifier que c'est du JSON valide
      return openingHours; // Déjà au format JSON
    } catch {
      // JSON invalide, continuer avec la conversion
    }
  }
  
  // Parser l'ancien format texte: "09:00-23:00" ou "20:00-06:00|Vendredi"
  const parts = openingHours.split('|');
  const hours = parts[0]?.trim();
  const closedDay = parts[1]?.trim() || null;
  
  if (!hours) {
    return null;
  }
  
  const [open, close] = hours.split('-');
  if (!open || !close || open.trim() === '' || close.trim() === '') {
    return null;
  }
  
  const json: OpeningHoursJSON = {
    open: open.trim(),
    close: close.trim(),
    closedDay
  };
  
  return JSON.stringify(json);
}

async function migrateOpeningHours() {
  try {
    console.log("🔄 Début de la migration des horaires d'ouverture vers le format JSON...\n");
    
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📊 ${allRestaurants.length} restaurants trouvés\n`);
    
    let migrated = 0;
    let alreadyJSON = 0;
    let nullOrEmpty = 0;
    let errors = 0;
    
    for (const restaurant of allRestaurants) {
      const currentHours = restaurant.openingHours;
      
      // Si null ou vide, passer
      if (!currentHours || currentHours.trim() === '') {
        nullOrEmpty++;
        continue;
      }
      
      // Si déjà au format JSON, passer
      if (currentHours.trim().startsWith('{')) {
        try {
          JSON.parse(currentHours);
          alreadyJSON++;
          continue;
        } catch {
          // JSON invalide, continuer avec la conversion
        }
      }
      
      // Convertir vers JSON
      const jsonHours = convertToJSON(currentHours);
      
      if (!jsonHours) {
        console.log(`⚠️  Restaurant "${restaurant.name}" - Horaires invalides, ignoré: "${currentHours}"`);
        errors++;
        continue;
      }
      
      // Mettre à jour dans la base de données
      await db.update(restaurants)
        .set({ openingHours: jsonHours })
        .where(eq(restaurants.id, restaurant.id));
      
      console.log(`✅ "${restaurant.name}": "${currentHours}" → ${jsonHours}`);
      migrated++;
    }
    
    console.log("\n📈 Résumé de la migration:");
    console.log(`   ✅ Migrés: ${migrated}`);
    console.log(`   📄 Déjà au format JSON: ${alreadyJSON}`);
    console.log(`   ⚪ Null ou vides: ${nullOrEmpty}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`\n✨ Migration terminée avec succès!`);
    
  } catch (error: any) {
    console.error("❌ Erreur lors de la migration:", error);
    process.exit(1);
  }
}

// Exécuter la migration
migrateOpeningHours()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

