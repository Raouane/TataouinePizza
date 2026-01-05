import "dotenv/config";
import { db } from "../db.js";
import { restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Script pour vérifier le mot de passe d'un restaurant spécifique
 * Usage: npm run script:check-restaurant-password
 */
async function checkRestaurantPassword() {
  const phoneToCheck = "21699999999"; // BAB EL HARA
  
  try {
    console.log("========================================");
    console.log("🔍 VÉRIFICATION DU RESTAURANT");
    console.log("========================================");
    console.log(`Téléphone recherché: ${phoneToCheck}`);
    console.log("");

    // Rechercher avec le téléphone exact
    const result1 = await db.execute(sql`
      SELECT id, name, phone, password, address
      FROM restaurants 
      WHERE phone = ${phoneToCheck}
    `);

    if (result1.rows && result1.rows.length > 0) {
      const restaurant = result1.rows[0] as any;
      console.log("✅ Restaurant trouvé avec téléphone exact:");
      console.log({
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        hasPassword: !!restaurant.password,
        passwordType: typeof restaurant.password,
        passwordLength: restaurant.password ? restaurant.password.length : 0,
        passwordPreview: restaurant.password ? restaurant.password.substring(0, 30) + "..." : "NULL"
      });
    } else {
      console.log("❌ Restaurant non trouvé avec téléphone exact");
      
      // Essayer sans préfixe
      const phoneWithoutPrefix = phoneToCheck.substring(3);
      const result2 = await db.execute(sql`
        SELECT id, name, phone, password, address
        FROM restaurants 
        WHERE phone = ${phoneWithoutPrefix}
      `);
      
      if (result2.rows && result2.rows.length > 0) {
        const restaurant = result2.rows[0] as any;
        console.log("✅ Restaurant trouvé sans préfixe:");
        console.log({
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          hasPassword: !!restaurant.password,
          passwordType: typeof restaurant.password,
          passwordLength: restaurant.password ? restaurant.password.length : 0,
          passwordPreview: restaurant.password ? restaurant.password.substring(0, 30) + "..." : "NULL"
        });
      } else {
        console.log("❌ Restaurant non trouvé sans préfixe non plus");
      }
    }

    // Lister tous les restaurants pour voir ce qui existe
    console.log("");
    console.log("📋 Liste de tous les restaurants:");
    const allRestaurants = await db.execute(sql`
      SELECT id, name, phone, 
             CASE WHEN password IS NULL THEN 'NULL' ELSE 'HAS_PASSWORD' END as password_status
      FROM restaurants 
      ORDER BY name
    `);
    
    allRestaurants.rows?.forEach((r: any) => {
      console.log(`  - ${r.name}: ${r.phone} (password: ${r.password_status})`);
    });

    console.log("");
    console.log("========================================");
    console.log("✅ TERMINÉ");
    console.log("========================================");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

checkRestaurantPassword();
