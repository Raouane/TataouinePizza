/**
 * Script de vérification : Vérifie que toutes les pizzas ont des UUIDs valides
 * 
 * Ce script :
 * 1. Récupère toutes les pizzas de la base de données
 * 2. Vérifie que chaque ID est un UUID valide
 * 3. Vérifie que toutes les références (pizza_prices, order_items) utilisent des UUIDs valides
 * 4. Affiche un rapport détaillé
 */

import { db } from "../db.js";
import { pizzas, pizzaPrices, orderItems } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
  console.log("🔍 VÉRIFICATION : UUIDs DES PIZZAS");
  console.log("=".repeat(60));
  console.log();

  try {
    let hasErrors = false;

    // 1. Vérifier toutes les pizzas
    logInfo("ÉTAPE 1: Vérification des IDs des pizzas...");
    const allPizzas = await db.select().from(pizzas);
    logInfo(`${allPizzas.length} pizza(s) trouvée(s) dans la base de données`);
    console.log();

    const invalidPizzaIds: Array<{ id: string; name: string }> = [];
    for (const pizza of allPizzas) {
      if (!isUUID(pizza.id)) {
        invalidPizzaIds.push({ id: pizza.id, name: pizza.name });
        hasErrors = true;
      }
    }

    if (invalidPizzaIds.length > 0) {
      logError(`${invalidPizzaIds.length} pizza(s) avec des IDs non-UUID :`);
      invalidPizzaIds.forEach(p => {
        console.log(`   - "${p.name}" (ID: ${p.id})`);
      });
    } else {
      logSuccess(`✅ Toutes les ${allPizzas.length} pizzas ont des UUIDs valides`);
    }
    console.log();

    // 2. Vérifier les références dans pizza_prices
    logInfo("ÉTAPE 2: Vérification des références dans pizza_prices...");
    const allPrices = await db.select().from(pizzaPrices);
    logInfo(`${allPrices.length} prix trouvé(s)`);

    const invalidPriceRefs: Array<{ pizzaId: string; size: string }> = [];
    const orphanedPrices: Array<{ pizzaId: string; size: string }> = [];

    for (const price of allPrices) {
      if (!isUUID(price.pizzaId)) {
        invalidPriceRefs.push({ pizzaId: price.pizzaId, size: price.size });
        hasErrors = true;
      } else {
        // Vérifier que la pizza existe
        const pizzaExists = allPizzas.some(p => p.id === price.pizzaId);
        if (!pizzaExists) {
          orphanedPrices.push({ pizzaId: price.pizzaId, size: price.size });
          hasErrors = true;
        }
      }
    }

    if (invalidPriceRefs.length > 0) {
      logError(`${invalidPriceRefs.length} prix avec des références non-UUID :`);
      invalidPriceRefs.slice(0, 10).forEach(p => {
        console.log(`   - pizzaId: ${p.pizzaId}, size: ${p.size}`);
      });
      if (invalidPriceRefs.length > 10) {
        console.log(`   ... et ${invalidPriceRefs.length - 10} autres`);
      }
    }

    if (orphanedPrices.length > 0) {
      logError(`${orphanedPrices.length} prix orphelins (référencent des pizzas inexistantes) :`);
      orphanedPrices.slice(0, 10).forEach(p => {
        console.log(`   - pizzaId: ${p.pizzaId}, size: ${p.size}`);
      });
      if (orphanedPrices.length > 10) {
        console.log(`   ... et ${orphanedPrices.length - 10} autres`);
      }
    }

    if (invalidPriceRefs.length === 0 && orphanedPrices.length === 0) {
      logSuccess(`✅ Tous les ${allPrices.length} prix ont des références UUID valides`);
    }
    console.log();

    // 3. Vérifier les références dans order_items
    logInfo("ÉTAPE 3: Vérification des références dans order_items...");
    const allOrderItems = await db.select().from(orderItems);
    logInfo(`${allOrderItems.length} order item(s) trouvé(s)`);

    const invalidOrderItemRefs: Array<{ pizzaId: string; orderId: string }> = [];
    const orphanedOrderItems: Array<{ pizzaId: string; orderId: string }> = [];

    for (const item of allOrderItems) {
      if (!isUUID(item.pizzaId)) {
        invalidOrderItemRefs.push({ pizzaId: item.pizzaId, orderId: item.orderId });
        hasErrors = true;
      } else {
        // Vérifier que la pizza existe
        const pizzaExists = allPizzas.some(p => p.id === item.pizzaId);
        if (!pizzaExists) {
          orphanedOrderItems.push({ pizzaId: item.pizzaId, orderId: item.orderId });
          hasErrors = true;
        }
      }
    }

    if (invalidOrderItemRefs.length > 0) {
      logError(`${invalidOrderItemRefs.length} order item(s) avec des références non-UUID :`);
      invalidOrderItemRefs.slice(0, 10).forEach(i => {
        console.log(`   - pizzaId: ${i.pizzaId}, orderId: ${i.orderId}`);
      });
      if (invalidOrderItemRefs.length > 10) {
        console.log(`   ... et ${invalidOrderItemRefs.length - 10} autres`);
      }
    }

    if (orphanedOrderItems.length > 0) {
      logError(`${orphanedOrderItems.length} order item(s) orphelins (référencent des pizzas inexistantes) :`);
      orphanedOrderItems.slice(0, 10).forEach(i => {
        console.log(`   - pizzaId: ${i.pizzaId}, orderId: ${i.orderId}`);
      });
      if (orphanedOrderItems.length > 10) {
        console.log(`   ... et ${orphanedOrderItems.length - 10} autres`);
      }
    }

    if (invalidOrderItemRefs.length === 0 && orphanedOrderItems.length === 0) {
      logSuccess(`✅ Tous les ${allOrderItems.length} order items ont des références UUID valides`);
    }
    console.log();

    // 4. Résumé final
    console.log("=".repeat(60));
    console.log("📊 RÉSUMÉ DE LA VÉRIFICATION");
    console.log("=".repeat(60));
    console.log(`📦 Pizzas totales: ${allPizzas.length}`);
    console.log(`   ✅ UUIDs valides: ${allPizzas.length - invalidPizzaIds.length}`);
    if (invalidPizzaIds.length > 0) {
      console.log(`   ❌ UUIDs invalides: ${invalidPizzaIds.length}`);
    }
    console.log();
    console.log(`💰 Prix totaux: ${allPrices.length}`);
    console.log(`   ✅ Références valides: ${allPrices.length - invalidPriceRefs.length - orphanedPrices.length}`);
    if (invalidPriceRefs.length > 0) {
      console.log(`   ❌ Références non-UUID: ${invalidPriceRefs.length}`);
    }
    if (orphanedPrices.length > 0) {
      console.log(`   ⚠️  Prix orphelins: ${orphanedPrices.length}`);
    }
    console.log();
    console.log(`🛒 Order items totaux: ${allOrderItems.length}`);
    console.log(`   ✅ Références valides: ${allOrderItems.length - invalidOrderItemRefs.length - orphanedOrderItems.length}`);
    if (invalidOrderItemRefs.length > 0) {
      console.log(`   ❌ Références non-UUID: ${invalidOrderItemRefs.length}`);
    }
    if (orphanedOrderItems.length > 0) {
      console.log(`   ⚠️  Order items orphelins: ${orphanedOrderItems.length}`);
    }
    console.log("=".repeat(60));
    console.log();

    if (hasErrors) {
      logError("❌ Des problèmes ont été détectés !");
      logWarning("💡 Exécutez le script de migration pour corriger ces problèmes");
      process.exit(1);
    } else {
      logSuccess("🎉 Toutes les vérifications sont passées avec succès !");
      logInfo("💡 Tous les produits ont des UUIDs valides et toutes les références sont cohérentes");
      process.exit(0);
    }
  } catch (error) {
    logError(`Erreur lors de la vérification: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
