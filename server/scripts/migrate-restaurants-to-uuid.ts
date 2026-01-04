/**
 * Script de migration : Convertit tous les IDs de restaurants en UUIDs
 * 
 * Ce script :
 * 1. Trouve tous les restaurants avec des IDs non-UUID (comme "resto-001")
 * 2. Génère un UUID pour chacun
 * 3. Met à jour toutes les références dans les tables liées (pizzas, orders)
 * 4. Met à jour le restaurant lui-même
 */

import { db } from "../db.js";
import { restaurants, pizzas, orders } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Fonction helper pour vérifier si un string est un UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Fonction helper pour logger
function logInfo(msg: string) {
  console.log(`\x1b[34mℹ️  ${msg}\x1b[0m`);
}

function logSuccess(msg: string) {
  console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
}

function logError(msg: string) {
  console.log(`\x1b[31m❌ ${msg}\x1b[0m`);
}

function logWarning(msg: string) {
  console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔄 MIGRATION : RESTAURANTS → UUIDs");
  console.log("=".repeat(60));
  console.log();

  try {
    // 1. Récupérer tous les restaurants
    logInfo("ÉTAPE 1: Récupération de tous les restaurants...");
    const allRestaurants = await db.select().from(restaurants);
    logSuccess(`${allRestaurants.length} restaurant(s) trouvé(s)`);
    console.log();

    // 2. Filtrer les restaurants avec des IDs non-UUID
    logInfo("ÉTAPE 2: Identification des restaurants à migrer...");
    const restaurantsToMigrate = allRestaurants.filter(r => !isUUID(r.id));
    
    if (restaurantsToMigrate.length === 0) {
      logSuccess("✅ Tous les restaurants ont déjà des UUIDs !");
      process.exit(0);
    }

    logWarning(`${restaurantsToMigrate.length} restaurant(s) à migrer:`);
    restaurantsToMigrate.forEach(r => {
      console.log(`   - ${r.name} (ID actuel: ${r.id})`);
    });
    console.log();

    // 3. Pour chaque restaurant, créer un UUID et mettre à jour
    logInfo("ÉTAPE 3: Migration des restaurants...");
    const migrationMap = new Map<string, string>(); // oldId -> newUUID

    for (const restaurant of restaurantsToMigrate) {
      const newUUID = randomUUID();
      migrationMap.set(restaurant.id, newUUID);
      
      logInfo(`Migration de "${restaurant.name}": ${restaurant.id} → ${newUUID}`);

      // Utiliser une approche en plusieurs étapes avec transaction
      // 1. Créer un nouveau restaurant avec le nouvel UUID (téléphone temporaire)
      // 2. Mettre à jour toutes les références
      // 3. Supprimer l'ancien restaurant
      // 4. Mettre à jour le téléphone du nouveau restaurant
      
      const pizzasCount = await db
        .select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));
      
      const ordersCount = await db
        .select()
        .from(orders)
        .where(eq(orders.restaurantId, restaurant.id));
      
      logInfo(`   ${pizzasCount.length} pizza(s) et ${ordersCount.length} commande(s) à migrer`);
      
      // Créer un nouveau restaurant avec un téléphone temporaire unique
      const tempPhone = `${restaurant.phone}_temp_${Date.now()}`;
      const { id, phone, ...restaurantData } = restaurant;
      
      // Gérer le champ categories
      const categoriesValue = typeof restaurantData.categories === 'string' 
        ? restaurantData.categories 
        : (Array.isArray(restaurantData.categories) 
            ? JSON.stringify(restaurantData.categories) 
            : restaurantData.categories || null);
      
      await db.insert(restaurants).values({
        ...restaurantData,
        id: newUUID,
        phone: tempPhone,
        categories: categoriesValue,
      });
      logSuccess(`   ✅ Nouveau restaurant créé avec UUID temporaire`);
      
      // Mettre à jour les pizzas
      if (pizzasCount.length > 0) {
        await db
          .update(pizzas)
          .set({ restaurantId: newUUID })
          .where(eq(pizzas.restaurantId, restaurant.id));
        logSuccess(`   ✅ ${pizzasCount.length} pizza(s) migrée(s)`);
      }
      
      // Mettre à jour les commandes
      if (ordersCount.length > 0) {
        await db
          .update(orders)
          .set({ restaurantId: newUUID })
          .where(eq(orders.restaurantId, restaurant.id));
        logSuccess(`   ✅ ${ordersCount.length} commande(s) migrée(s)`);
      }
      
      // Supprimer l'ancien restaurant
      await db.delete(restaurants).where(eq(restaurants.id, restaurant.id));
      logSuccess(`   ✅ Ancien restaurant supprimé`);
      
      // Restaurer le téléphone original
      await db
        .update(restaurants)
        .set({ phone: restaurant.phone })
        .where(eq(restaurants.id, newUUID));
      logSuccess(`   ✅ Téléphone restauré`);
      
      // Vérifier le résultat final
      const finalPizzasCount = await db
        .select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, newUUID));
      
      const finalOrdersCount = await db
        .select()
        .from(orders)
        .where(eq(orders.restaurantId, newUUID));
      
      logSuccess(`   ✅ ${finalPizzasCount.length} pizza(s) migrée(s)`);
      logSuccess(`   ✅ ${finalOrdersCount.length} commande(s) migrée(s)`);
      logSuccess(`   ✅ Restaurant "${restaurant.name}" migré avec succès`);
      console.log();
    }

    // 4. Résumé
    console.log("=".repeat(60));
    console.log("📊 RÉSUMÉ DE LA MIGRATION");
    console.log("=".repeat(60));
    console.log(`✅ ${restaurantsToMigrate.length} restaurant(s) migré(s)`);
    console.log();
    console.log("Mapping des IDs (ancien → nouveau):");
    migrationMap.forEach((newId, oldId) => {
      console.log(`   ${oldId} → ${newId}`);
    });
    console.log("=".repeat(60));
    console.log();

    logSuccess("🎉 Migration terminée avec succès !");
    logInfo("💡 Tous les restaurants ont maintenant des UUIDs valides");

    process.exit(0);
  } catch (error) {
    logError(`Erreur lors de la migration: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
