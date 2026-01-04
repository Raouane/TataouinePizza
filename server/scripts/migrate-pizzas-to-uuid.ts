/**
 * Script de migration : Convertit tous les IDs de pizzas en UUIDs
 * 
 * Ce script :
 * 1. Trouve toutes les pizzas avec des IDs non-UUID (comme "pizza-001", "burger-001")
 * 2. Génère un UUID pour chacune
 * 3. Met à jour toutes les références dans les tables liées (pizza_prices, order_items)
 * 4. Met à jour la pizza elle-même
 */

import { db } from "../db.js";
import { pizzas, pizzaPrices, orderItems } from "@shared/schema";
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
  console.log("🔄 MIGRATION : PIZZAS → UUIDs");
  console.log("=".repeat(60));
  console.log();

  try {
    // 1. Récupérer toutes les pizzas
    logInfo("ÉTAPE 1: Récupération de toutes les pizzas...");
    const allPizzas = await db.select().from(pizzas);
    logSuccess(`${allPizzas.length} pizza(s) trouvée(s)`);
    console.log();

    // 2. Filtrer les pizzas avec des IDs non-UUID
    logInfo("ÉTAPE 2: Identification des pizzas à migrer...");
    const pizzasToMigrate = allPizzas.filter(p => !isUUID(p.id));
    
    if (pizzasToMigrate.length === 0) {
      logSuccess("✅ Toutes les pizzas ont déjà des UUIDs !");
      process.exit(0);
    }

    logWarning(`${pizzasToMigrate.length} pizza(s) à migrer`);
    if (pizzasToMigrate.length <= 10) {
      pizzasToMigrate.forEach(p => {
        console.log(`   - ${p.name} (ID actuel: ${p.id})`);
      });
    } else {
      console.log(`   (Afficher les 10 premières sur ${pizzasToMigrate.length})`);
      pizzasToMigrate.slice(0, 10).forEach(p => {
        console.log(`   - ${p.name} (ID actuel: ${p.id})`);
      });
    }
    console.log();

    // 3. Pour chaque pizza, créer un UUID et mettre à jour
    logInfo("ÉTAPE 3: Migration des pizzas...");
    const migrationMap = new Map<string, string>(); // oldId -> newUUID

    for (const pizza of pizzasToMigrate) {
      const newUUID = randomUUID();
      migrationMap.set(pizza.id, newUUID);
      
      logInfo(`Migration de "${pizza.name}": ${pizza.id} → ${newUUID.substring(0, 8)}...`);

      // Utiliser une approche en plusieurs étapes
      // 1. Créer une nouvelle pizza avec le nouvel UUID
      // 2. Mettre à jour toutes les références
      // 3. Supprimer l'ancienne pizza
      
      const pricesCount = await db
        .select()
        .from(pizzaPrices)
        .where(eq(pizzaPrices.pizzaId, pizza.id));
      
      const orderItemsCount = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.pizzaId, pizza.id));
      
      logInfo(`   ${pricesCount.length} prix et ${orderItemsCount.length} order item(s) à migrer`);
      
      // Créer une nouvelle pizza avec le nouvel UUID
      const { id, ...pizzaData } = pizza;
      
      await db.insert(pizzas).values({
        ...pizzaData,
        id: newUUID,
      });
      logSuccess(`   ✅ Nouvelle pizza créée avec UUID`);
      
      // Mettre à jour les prix
      if (pricesCount.length > 0) {
        await db
          .update(pizzaPrices)
          .set({ pizzaId: newUUID })
          .where(eq(pizzaPrices.pizzaId, pizza.id));
        logSuccess(`   ✅ ${pricesCount.length} prix migré(s)`);
      }
      
      // Mettre à jour les order items
      if (orderItemsCount.length > 0) {
        await db
          .update(orderItems)
          .set({ pizzaId: newUUID })
          .where(eq(orderItems.pizzaId, pizza.id));
        logSuccess(`   ✅ ${orderItemsCount.length} order item(s) migré(s)`);
      }
      
      // Supprimer l'ancienne pizza
      await db.delete(pizzas).where(eq(pizzas.id, pizza.id));
      logSuccess(`   ✅ Ancienne pizza supprimée`);
      
      logSuccess(`   ✅ Pizza "${pizza.name}" migrée avec succès`);
    }

    // 4. Résumé
    console.log();
    console.log("=".repeat(60));
    console.log("📊 RÉSUMÉ DE LA MIGRATION");
    console.log("=".repeat(60));
    console.log(`✅ ${pizzasToMigrate.length} pizza(s) migrée(s)`);
    console.log("=".repeat(60));
    console.log();

    logSuccess("🎉 Migration terminée avec succès !");
    logInfo("💡 Toutes les pizzas ont maintenant des UUIDs valides");

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
