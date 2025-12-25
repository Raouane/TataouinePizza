import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function removeCategoriesFromRestaurants() {
  console.log("🗑️  Suppression des catégories indésirables de tous les restaurants...\n");

  try {
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📦 ${allRestaurants.length} restaurants trouvés\n`);

    const categoriesToRemove = ['dessert', 'patisserie', 'bakery', 'sweets', 'drink', 'boisson'];
    let updatedCount = 0;

    for (const restaurant of allRestaurants) {
      if (!restaurant.categories) {
        continue;
      }

      // Parser les catégories si c'est une chaîne JSON
      let categoriesArray: string[] = [];
      if (typeof restaurant.categories === 'string') {
        try {
          categoriesArray = JSON.parse(restaurant.categories);
        } catch {
          categoriesArray = [restaurant.categories];
        }
      } else if (Array.isArray(restaurant.categories)) {
        categoriesArray = restaurant.categories;
      }

      // Filtrer les catégories à supprimer
      const originalLength = categoriesArray.length;
      const filteredCategories = categoriesArray.filter(
        (cat) => !categoriesToRemove.includes(cat.toLowerCase())
      );

      // Si des catégories ont été supprimées, mettre à jour
      if (filteredCategories.length !== originalLength) {
        const removedCategories = categoriesArray.filter(
          (cat) => categoriesToRemove.includes(cat.toLowerCase())
        );
        
        // Convertir en JSON string pour la base de données
        const updatedCategories = filteredCategories.length > 0 
          ? JSON.stringify(filteredCategories)
          : null;

        await db.update(restaurants)
          .set({ categories: updatedCategories })
          .where(eq(restaurants.id, restaurant.id));

        console.log(`✅ ${restaurant.name}`);
        console.log(`   Catégories supprimées: ${removedCategories.join(', ')}`);
        console.log(`   Catégories restantes: ${filteredCategories.length > 0 ? filteredCategories.join(', ') : 'Aucune'}\n`);
        updatedCount++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Restaurants mis à jour: ${updatedCount}`);
    console.log(`   ⏭️  Restaurants non modifiés: ${allRestaurants.length - updatedCount}\n`);

    console.log("💡 Les catégories suivantes ont été supprimées définitivement:");
    console.log(`   - ${categoriesToRemove.join(', ')}\n`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

removeCategoriesFromRestaurants();

