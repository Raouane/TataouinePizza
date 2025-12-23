import "dotenv/config";
import { db } from "../server/db.js";
import { restaurants } from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Script pour diagnostiquer pourquoi certains restaurants n'apparaissent pas en production
 */

async function debugProductionRestaurants() {
  console.log("🔍 Diagnostic des restaurants en production...\n");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non définie");
    console.log("\n💡 Utilisez: DATABASE_URL='votre_url' tsx script/debug-production-restaurants.ts");
    process.exit(1);
  }

  const dbUrlPreview = process.env.DATABASE_URL.substring(0, 30) + "...";
  console.log(`🔗 Connexion à: ${dbUrlPreview}\n`);

  try {
    // 1. Récupérer TOUS les restaurants avec leurs données brutes
    console.log("📊 1. Récupération de tous les restaurants (données brutes)...\n");
    const rawResult = await db.execute(sql`
      SELECT 
        id, 
        name, 
        phone, 
        address, 
        description, 
        image_url, 
        categories,
        is_open,
        is_open::text as is_open_text,
        opening_hours, 
        delivery_time, 
        min_order, 
        rating, 
        created_at, 
        updated_at 
      FROM restaurants 
      ORDER BY name
    `);

    console.log(`✅ ${rawResult.rows.length} restaurants trouvés dans la base de données\n`);

    if (rawResult.rows.length === 0) {
      console.log("⚠️ Aucun restaurant dans la base de données !");
      return;
    }

    // 2. Analyser chaque restaurant
    console.log("📋 2. Analyse détaillée de chaque restaurant:\n");
    console.log("=" .repeat(80));

    let validCount = 0;
    let invalidCount = 0;
    const issues: Array<{ name: string; issues: string[] }> = [];

    for (const row of rawResult.rows as any[]) {
      const restaurantIssues: string[] = [];
      
      // Vérifier is_open
      const isOpenRaw = row.is_open;
      const isOpenText = row.is_open_text;
      let isOpenParsed: boolean;
      
      if (typeof isOpenRaw === 'boolean') {
        isOpenParsed = isOpenRaw;
      } else if (typeof isOpenText === 'string') {
        isOpenParsed = isOpenText === 'true';
      } else {
        isOpenParsed = false;
        restaurantIssues.push(`is_open invalide: ${JSON.stringify(isOpenRaw)} (text: ${isOpenText})`);
      }

      // Vérifier categories
      let categories: string[] = [];
      let categoriesValid = true;
      try {
        if (row.categories) {
          if (typeof row.categories === 'string') {
            categories = JSON.parse(row.categories);
          } else if (Array.isArray(row.categories)) {
            categories = row.categories;
          } else {
            categoriesValid = false;
            restaurantIssues.push(`categories invalide: ${typeof row.categories}`);
          }
        }
      } catch (e: any) {
        categoriesValid = false;
        restaurantIssues.push(`Erreur parsing categories: ${e.message}`);
      }

      // Vérifier les champs requis
      if (!row.name) restaurantIssues.push("name manquant");
      if (!row.phone) restaurantIssues.push("phone manquant");
      if (!row.address) restaurantIssues.push("address manquant");

      // Afficher les détails
      console.log(`\n🏪 ${row.name || '(Sans nom)'}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Phone: ${row.phone || '(Manquant)'}`);
      console.log(`   is_open (raw): ${JSON.stringify(isOpenRaw)}`);
      console.log(`   is_open (text): ${isOpenText}`);
      console.log(`   is_open (parsed): ${isOpenParsed}`);
      console.log(`   categories (raw): ${row.categories ? (typeof row.categories === 'string' ? row.categories.substring(0, 50) : JSON.stringify(row.categories)) : 'NULL'}`);
      console.log(`   categories (parsed): ${JSON.stringify(categories)}`);
      console.log(`   image_url: ${row.image_url || '(Manquant)'}`);
      console.log(`   created_at: ${row.created_at}`);

      if (restaurantIssues.length > 0) {
        console.log(`   ⚠️ PROBLÈMES:`);
        restaurantIssues.forEach(issue => console.log(`      - ${issue}`));
        invalidCount++;
        issues.push({ name: row.name || 'Sans nom', issues: restaurantIssues });
      } else {
        validCount++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("\n📊 3. Résumé:\n");
    console.log(`   ✅ Restaurants valides: ${validCount}`);
    console.log(`   ⚠️ Restaurants avec problèmes: ${invalidCount}`);
    console.log(`   📦 Total: ${rawResult.rows.length}`);

    if (issues.length > 0) {
      console.log("\n⚠️ Restaurants avec problèmes:\n");
      issues.forEach(({ name, issues: restaurantIssues }) => {
        console.log(`   - ${name}:`);
        restaurantIssues.forEach(issue => console.log(`     • ${issue}`));
      });
    }

    // 4. Tester la fonction getAllRestaurants
    console.log("\n📊 4. Test de getAllRestaurants()...\n");
    const { storage } = await import("../server/storage.js");
    const restaurantsFromStorage = await storage.getAllRestaurants();
    console.log(`   Restaurants retournés par getAllRestaurants(): ${restaurantsFromStorage.length}`);
    
    if (restaurantsFromStorage.length !== rawResult.rows.length) {
      console.log(`   ⚠️ DIFFÉRENCE DÉTECTÉE !`);
      console.log(`   Base de données: ${rawResult.rows.length} restaurants`);
      console.log(`   getAllRestaurants(): ${restaurantsFromStorage.length} restaurants`);
      
      const missingIds = (rawResult.rows as any[])
        .map(r => r.id)
        .filter(id => !restaurantsFromStorage.find(r => r.id === id));
      
      if (missingIds.length > 0) {
        console.log(`\n   Restaurants manquants dans getAllRestaurants():`);
        missingIds.forEach(id => {
          const restaurant = (rawResult.rows as any[]).find(r => r.id === id);
          console.log(`     - ${restaurant?.name || id} (ID: ${id})`);
        });
      }
    } else {
      console.log(`   ✅ Tous les restaurants sont retournés correctement`);
    }

    // 5. Vérifier les restaurants attendus
    console.log("\n📊 5. Vérification des restaurants attendus:\n");
    const expectedRestaurants = [
      "Carrefour",
      "Aziza",
      "BAB EL HARA",
      "Boucherie Brahim",
      "Volaille Othman",
      "Bijouterie Ziyad",
      "Tataouine Pizza",
      "Pizza del Sol",
      "Sahara Grill",
      "GAZELLES",
    ];

    const foundRestaurants = (rawResult.rows as any[]).map(r => r.name);
    const missingRestaurants = expectedRestaurants.filter(name => !foundRestaurants.includes(name));

    if (missingRestaurants.length > 0) {
      console.log(`   ⚠️ Restaurants attendus mais non trouvés:`);
      missingRestaurants.forEach(name => console.log(`     - ${name}`));
    } else {
      console.log(`   ✅ Tous les restaurants attendus sont présents`);
    }

  } catch (error: any) {
    console.error("❌ Erreur lors du diagnostic:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

debugProductionRestaurants()
  .then(() => {
    console.log("\n✅ Diagnostic terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

