import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

async function removeProductsWithoutImagesExceptMargherita() {
  console.log("🗑️  Suppression des produits sans images (sauf Pizza Margherita)...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    const productsToDelete: Array<{ id: string; name: string }> = [];

    for (const product of allProducts) {
      // Garder Pizza Margherita même si elle n'a pas d'image
      if (product.name.toLowerCase().includes("margherita")) {
        console.log(`✅ Conservé: ${product.name} (Pizza Margherita)`);
        continue;
      }

      // Supprimer les produits sans imageUrl
      if (!product.imageUrl || product.imageUrl.trim() === "") {
        productsToDelete.push({
          id: product.id,
          name: product.name
        });
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 PRODUITS À SUPPRIMER");
    console.log("=".repeat(70));
    console.log(`\n   Total: ${productsToDelete.length} produits\n`);

    if (productsToDelete.length === 0) {
      console.log("✅ Aucun produit à supprimer.\n");
      process.exit(0);
    }

    console.log("📝 Liste des produits qui seront supprimés:\n");
    productsToDelete.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (ID: ${item.id})`);
    });

    console.log(`\n⚠️  ATTENTION: Cette action est irréversible !`);
    console.log(`   ${productsToDelete.length} produits seront supprimés de la base de données.\n`);

    // Supprimer les prix associés d'abord
    console.log("🗑️  Suppression des prix associés...\n");
    let pricesDeleted = 0;
    for (const product of productsToDelete) {
      const prices = await db.select().from(pizzaPrices).where(eq(pizzaPrices.pizzaId, product.id));
      if (prices.length > 0) {
        await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, product.id));
        pricesDeleted += prices.length;
        console.log(`   ✅ ${prices.length} prix supprimés pour ${product.name}`);
      }
    }

    // Supprimer les produits
    console.log(`\n🗑️  Suppression des produits...\n`);
    let productsDeleted = 0;
    for (const product of productsToDelete) {
      await db.delete(pizzas).where(eq(pizzas.id, product.id));
      productsDeleted++;
      console.log(`   ✅ Supprimé: ${product.name}`);
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Produits supprimés: ${productsDeleted}`);
    console.log(`   ✅ Prix supprimés: ${pricesDeleted}`);
    console.log(`   ✅ Pizza Margherita conservée\n`);

    console.log("💡 Pour ajouter l'image de Pizza Margherita:");
    console.log("   1. Placez l'image dans: client/public/images/products/");
    console.log("   2. Nommez-la: pizza-margherita.png");
    console.log("   3. Exécutez: npx tsx script/map-images-to-products.ts");
    console.log("   4. Ou rechargez la page (l'image sera détectée automatiquement)\n");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

removeProductsWithoutImagesExceptMargherita();

