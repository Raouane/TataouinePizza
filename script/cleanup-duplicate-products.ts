import "dotenv/config";
import { db } from "../server/db";
import { pizzas, restaurants, pizzaPrices } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function cleanupDuplicateProducts() {
  console.log("🧹 Nettoyage des produits en double pour BAB EL HARA...\n");

  try {
    // Trouver le restaurant BAB EL HARA
    const babElHara = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, "BAB EL HARA"))
      .limit(1);

    if (babElHara.length === 0) {
      console.log("❌ Restaurant BAB EL HARA non trouvé");
      process.exit(1);
    }

    const restaurantId = babElHara[0].id;
    console.log(`✅ Restaurant trouvé: ${babElHara[0].name} (${restaurantId})\n`);

    // Récupérer tous les produits
    const allProducts = await db.select()
      .from(pizzas)
      .where(eq(pizzas.restaurantId, restaurantId));

    console.log(`📊 Total produits trouvés: ${allProducts.length}`);

    // Grouper par nom et garder seulement le premier (le plus ancien)
    const productsByName = new Map<string, typeof allProducts[0]>();
    const duplicatesToDelete: string[] = [];

    for (const product of allProducts) {
      const existing = productsByName.get(product.name);
      
      if (!existing) {
        // Premier produit avec ce nom, on le garde
        productsByName.set(product.name, product);
      } else {
        // Doublon trouvé, on marque pour suppression
        duplicatesToDelete.push(product.id);
      }
    }

    console.log(`📊 Produits uniques: ${productsByName.size}`);
    console.log(`🗑️  Produits en double à supprimer: ${duplicatesToDelete.length}\n`);

    if (duplicatesToDelete.length === 0) {
      console.log("✅ Aucun doublon trouvé, rien à nettoyer !");
      process.exit(0);
    }

    // Afficher les doublons
    const nameCounts: Record<string, number> = {};
    allProducts.forEach(p => {
      nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });
    
    const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1);
    console.log("📋 Produits avec doublons:");
    duplicates.forEach(([name, count]) => {
      console.log(`   - ${name}: ${count} exemplaires`);
    });
    console.log("");

    // Supprimer les prix des produits en double d'abord
    console.log("🗑️  Suppression des prix des produits en double...");
    for (const productId of duplicatesToDelete) {
      await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, productId));
    }
    console.log(`✅ ${duplicatesToDelete.length} prix supprimés\n`);

    // Supprimer les produits en double
    console.log("🗑️  Suppression des produits en double...");
    let deletedCount = 0;
    for (const productId of duplicatesToDelete) {
      await db.delete(pizzas).where(eq(pizzas.id, productId));
      deletedCount++;
      if (deletedCount % 10 === 0) {
        console.log(`   ${deletedCount}/${duplicatesToDelete.length} produits supprimés...`);
      }
    }
    console.log(`✅ ${deletedCount} produits supprimés\n`);

    // Vérifier le résultat final
    const finalProducts = await db.select()
      .from(pizzas)
      .where(eq(pizzas.restaurantId, restaurantId));

    console.log("📊 Résultat final:");
    console.log(`   ✅ Produits restants: ${finalProducts.length}`);
    console.log(`   ✅ Produits uniques: ${productsByName.size}`);
    console.log(`\n✨ Nettoyage terminé avec succès !`);

  } catch (error: any) {
    console.error("❌ Erreur fatale:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

cleanupDuplicateProducts();

