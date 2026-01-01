/**
 * Script de diagnostic pour vérifier la connexion à la base de données
 * et tester l'écriture/lecture de données
 * 
 * Usage: npm run test:db
 */

import "dotenv/config";
import { db } from "../db.js";
import { orders, restaurants, drivers } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

async function testDatabaseConnection() {
  try {
    console.log("========================================");
    console.log("[TEST DB] 🔍 Test de connexion à la base de données");
    console.log("========================================");

    // 1. Test de connexion basique
    console.log("\n[TEST DB] 1️⃣ Test de connexion basique...");
    const connectionTest = await db.execute(sql`SELECT NOW() as current_time`);
    console.log("✅ Connexion réussie !");
    console.log(`   Heure serveur: ${connectionTest.rows[0]?.current_time}`);

    // 2. Vérifier les tables existantes
    console.log("\n[TEST DB] 2️⃣ Vérification des tables...");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`✅ ${tables.rows.length} table(s) trouvée(s):`);
    tables.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });

    // 3. Compter les enregistrements dans les tables principales
    console.log("\n[TEST DB] 3️⃣ Comptage des enregistrements...");
    
    const ordersCount = await db.execute(sql`SELECT COUNT(*) as count FROM orders`);
    console.log(`   📦 Commandes: ${ordersCount.rows[0]?.count || 0}`);
    
    const restaurantsCount = await db.execute(sql`SELECT COUNT(*) as count FROM restaurants`);
    console.log(`   🏪 Restaurants: ${restaurantsCount.rows[0]?.count || 0}`);
    
    const driversCount = await db.execute(sql`SELECT COUNT(*) as count FROM drivers`);
    console.log(`   🚴 Livreurs: ${driversCount.rows[0]?.count || 0}`);

    // 4. Test d'écriture (INSERT)
    console.log("\n[TEST DB] 4️⃣ Test d'écriture (INSERT)...");
    const testId = `test-${Date.now()}`;
    try {
      // Créer un enregistrement de test dans orders
      // Note: Utiliser les noms de colonnes réels (snake_case) dans SQL brut
      const insertResult = await db.execute(sql`
        INSERT INTO orders (id, status, total_price, restaurant_id, customer_name, phone, address, created_at, updated_at)
        VALUES (${testId}, 'received', 0, (SELECT id FROM restaurants LIMIT 1), 'Test Client', '21600000000', 'Adresse Test', NOW(), NOW())
        RETURNING id, status
      `);
      console.log("✅ INSERT réussi !");
      console.log(`   Enregistrement créé: ${JSON.stringify(insertResult.rows[0])}`);

      // 5. Test de lecture (SELECT)
      console.log("\n[TEST DB] 5️⃣ Test de lecture (SELECT)...");
      const selectResult = await db.execute(sql`
        SELECT id, status, created_at
        FROM orders
        WHERE id = ${testId}
      `);
      console.log("✅ SELECT réussi !");
      console.log(`   Données récupérées: ${JSON.stringify(selectResult.rows[0])}`);

      // 6. Test de mise à jour (UPDATE)
      console.log("\n[TEST DB] 6️⃣ Test de mise à jour (UPDATE)...");
      const updateResult = await db.execute(sql`
        UPDATE orders
        SET status = 'accepted', updated_at = NOW()
        WHERE id = ${testId}
        RETURNING id, status
      `);
      console.log("✅ UPDATE réussi !");
      console.log(`   Données mises à jour: ${JSON.stringify(updateResult.rows[0])}`);

      // 7. Nettoyer l'enregistrement de test
      console.log("\n[TEST DB] 7️⃣ Nettoyage de l'enregistrement de test...");
      await db.execute(sql`DELETE FROM orders WHERE id = ${testId}`);
      console.log("✅ DELETE réussi !");

    } catch (writeError: any) {
      console.error("❌ ERREUR lors du test d'écriture:");
      console.error(`   Code: ${writeError.code}`);
      console.error(`   Message: ${writeError.message}`);
      console.error(`   Détails: ${writeError.detail || 'N/A'}`);
      throw writeError;
    }

    // 8. Vérifier les dernières commandes
    console.log("\n[TEST DB] 8️⃣ Dernières commandes créées...");
    const lastOrders = await db.execute(sql`
      SELECT id, status, total_price, created_at, driver_id
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log(`✅ ${lastOrders.rows.length} dernière(s) commande(s):`);
    lastOrders.rows.forEach((order: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${order.id.substring(0, 8)}... | Status: ${order.status} | Prix: ${order.totalPrice} TND | Créée: ${new Date(order.createdAt).toLocaleString()}`);
    });

    // 9. Vérifier les permissions de la base de données
    console.log("\n[TEST DB] 9️⃣ Vérification des permissions...");
    const permissions = await db.execute(sql`
      SELECT 
        has_table_privilege(current_user, 'orders', 'INSERT') as can_insert,
        has_table_privilege(current_user, 'orders', 'UPDATE') as can_update,
        has_table_privilege(current_user, 'orders', 'DELETE') as can_delete,
        has_table_privilege(current_user, 'orders', 'SELECT') as can_select
    `);
    const perm = permissions.rows[0] as any;
    console.log(`   INSERT: ${perm.can_insert ? '✅' : '❌'}`);
    console.log(`   UPDATE: ${perm.can_update ? '✅' : '❌'}`);
    console.log(`   DELETE: ${perm.can_delete ? '✅' : '❌'}`);
    console.log(`   SELECT: ${perm.can_select ? '✅' : '❌'}`);

    console.log("\n========================================");
    console.log("[TEST DB] ✅ Tous les tests sont passés avec succès !");
    console.log("========================================");

  } catch (error: any) {
    console.error("\n========================================");
    console.error("[TEST DB] ❌ ERREUR CRITIQUE");
    console.error("========================================");
    console.error(`Type: ${error.constructor.name}`);
    console.error(`Message: ${error.message}`);
    console.error(`Code: ${error.code || 'N/A'}`);
    console.error(`Détails: ${error.detail || 'N/A'}`);
    if (error.stack) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Exécuter le test
testDatabaseConnection();
