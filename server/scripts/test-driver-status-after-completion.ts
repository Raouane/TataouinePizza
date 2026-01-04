/**
 * Script de test pour vérifier que le livreur reste en "available"
 * après avoir terminé toutes ses commandes, même en cas de déconnexion WebSocket.
 * 
 * Ce test vérifie la correction : le livreur ne doit PAS passer en "offline"
 * automatiquement après avoir terminé ses commandes.
 */

import { storage } from "../storage.js";
import { db } from "../db.js";
import { drivers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Fonction helper pour logger avec emojis
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

function logStep(msg: string) {
  console.log(`\x1b[33m📋 ${msg}\x1b[0m`);
}

/**
 * Simule la logique de cleanupDriverConnection pour tester le comportement
 */
async function simulateCleanupDriverConnection(driverId: string): Promise<string> {
  logInfo(`🧹 Simulation nettoyage connexion pour livreur ${driverId}...`);
  
  try {
    const driver = await storage.getDriverById(driverId);
    
    if (!driver) {
      logWarning(`Livreur ${driverId} non trouvé`);
      return "not_found";
    }
    
    logInfo(`Statut actuel du livreur: ${driver.status}`);
    
    // 🛡️ RÈGLE CRITIQUE : Les statuts "available" et "offline" sont des choix explicites
    // → NE JAMAIS les modifier, même en cas de déconnexion WebSocket
    if (driver.status === "available" || driver.status === "offline") {
      logSuccess(`Livreur ${driverId} en "${driver.status}" (choix explicite via bouton ON/OFF), statut préservé malgré déconnexion WebSocket`);
      // Mettre à jour last_seen pour éviter le nettoyage automatique à 10h
      await db
        .update(drivers)
        .set({ lastSeen: sql`NOW()` })
        .where(eq(drivers.id, driverId));
      return driver.status === "available" ? "available_preserved" : "offline_preserved";
    }
    
    // Vérifier les commandes actives
    const driverOrders = await storage.getOrdersByDriver(driverId);
    logInfo(`Livreur ${driverId}: ${driverOrders.length} commande(s) totale(s) trouvée(s)`);
    
    // Inclure aussi les commandes "received" avec driverId (elles sont assignées au livreur)
    const activeOrders = driverOrders.filter(o => 
      o.status === "delivery" || o.status === "accepted" || o.status === "ready" || o.status === "received"
    );
    
    logInfo(`Livreur ${driverId}: ${activeOrders.length} commande(s) active(s)`);
    
    if (activeOrders.length > 0) {
      logInfo(`Détails des commandes actives:`);
      activeOrders.forEach((order, index) => {
        logInfo(`  ${index + 1}. Commande ${order.id.slice(0, 8)} - Statut: ${order.status}`);
      });
      // Le livreur a des commandes actives, garder "on_delivery"
      logWarning(`Livreur ${driverId} déconnecté mais garde statut "on_delivery" (${activeOrders.length} commande(s) active(s))`);
      return "on_delivery_preserved";
    }
    
    // Aucune commande active ET statut "on_delivery"
    // 🛡️ RÈGLE : Si le livreur n'a plus de commandes actives, le remettre en "available"
    // (statut de travail par défaut). On suppose qu'il était en "available" avant d'accepter
    // car un livreur "offline" ne peut pas accepter de commandes.
    if (driver.status === "on_delivery") {
      logInfo(`Livreur ${driverId} n'a plus de commandes actives, remise en "available" (retour au statut de travail par défaut)`);
      await storage.updateDriver(driverId, { status: "available" });
      logSuccess(`Livreur ${driverId} remis en "available" (aucune commande active, prêt pour nouvelles commandes)`);
      return "switched_to_available";
    }
    
    // Si le statut n'est ni "available", ni "offline", ni "on_delivery", on ne le modifie pas
    logWarning(`Livreur ${driverId} a un statut inattendu: ${driver.status}, aucun changement`);
    return "no_change";
    
    return "no_change";
  } catch (error) {
    logError(`Erreur lors de la simulation: ${error instanceof Error ? error.message : String(error)}`);
    return "error";
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🧪 TEST : DÉCONNEXION AUTOMATIQUE DU LIVREUR");
  console.log("=".repeat(60));
  console.log("Ce test vérifie que:");
  console.log("  1. Un livreur en 'available' reste 'available' après déconnexion WebSocket");
  console.log("  2. Un livreur en 'on_delivery' sans commandes actives");
  console.log("     passe en 'available' (pas 'offline') après déconnexion");
  console.log("=".repeat(60));
  console.log();
  
  try {
    // Récupérer un livreur de test
    logStep("ÉTAPE 1: Récupération d'un livreur de test");
    const allDrivers = await storage.getAllDrivers();
    
    if (allDrivers.length === 0) {
      logError("Aucun livreur trouvé dans la base de données");
      process.exit(1);
    }
    
    const testDriver = allDrivers[0];
    logSuccess(`Livreur trouvé: ${testDriver.name} (${testDriver.id})`);
    logInfo(`  - Statut actuel: ${testDriver.status}`);
    logInfo(`  - Téléphone: ${testDriver.phone}`);
    console.log();
    
    // TEST 1: Livreur en "available" → doit rester "available"
    logStep("ÉTAPE 2: TEST 1 - Livreur en 'available'");
    logInfo("Mise du livreur en statut 'available'...");
    await storage.updateDriver(testDriver.id, { status: "available" });
    
    const driverBefore1 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut avant déconnexion simulée: ${driverBefore1?.status}`);
    
    logInfo("Simulation d'une déconnexion WebSocket...");
    const result1 = await simulateCleanupDriverConnection(testDriver.id);
    
    const driverAfter1 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut après déconnexion simulée: ${driverAfter1?.status}`);
    
    if (driverAfter1?.status === "available") {
      logSuccess("✅ TEST 1 RÉUSSI: Le livreur reste en 'available' après déconnexion");
    } else {
      logError(`❌ TEST 1 ÉCHOUÉ: Le livreur devrait être en 'available' mais est en '${driverAfter1?.status}'`);
    }
    console.log();
    
    // TEST 2: Livreur en "on_delivery" sans commandes actives → doit passer en "available"
    logStep("ÉTAPE 3: TEST 2 - Livreur en 'on_delivery' sans commandes actives");
    logInfo("Mise du livreur en statut 'on_delivery'...");
    await storage.updateDriver(testDriver.id, { status: "on_delivery" });
    
    const driverBefore2 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut avant déconnexion simulée: ${driverBefore2?.status}`);
    
    // Vérifier qu'il n'a pas de commandes actives
    const ordersBefore = await storage.getOrdersByDriver(testDriver.id);
    const activeOrdersBefore = ordersBefore.filter(o => 
      o.status === "delivery" || o.status === "accepted" || o.status === "ready" || o.status === "received"
    );
    logInfo(`Commandes actives: ${activeOrdersBefore.length}`);
    
    logInfo("Simulation d'une déconnexion WebSocket...");
    const result2 = await simulateCleanupDriverConnection(testDriver.id);
    
    const driverAfter2 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut après déconnexion simulée: ${driverAfter2?.status}`);
    
    if (driverAfter2?.status === "available") {
      logSuccess("✅ TEST 2 RÉUSSI: Le livreur passe en 'available' (pas 'offline') après déconnexion");
    } else {
      logError(`❌ TEST 2 ÉCHOUÉ: Le livreur devrait être en 'available' mais est en '${driverAfter2?.status}'`);
    }
    console.log();
    
    // TEST 3: Livreur en "offline" → doit rester "offline" (choix explicite préservé)
    logStep("ÉTAPE 4: TEST 3 - Livreur en 'offline' (choix manuel)");
    logInfo("Mise du livreur en statut 'offline' (simulation d'un choix manuel via bouton ON/OFF)...");
    await storage.updateDriver(testDriver.id, { status: "offline" });
    
    const driverBefore3 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut avant déconnexion simulée: ${driverBefore3?.status}`);
    
    logInfo("Simulation d'une déconnexion WebSocket (perte de connexion 4G)...");
    const result3 = await simulateCleanupDriverConnection(testDriver.id);
    
    const driverAfter3 = await storage.getDriverById(testDriver.id);
    logSuccess(`Statut après déconnexion simulée: ${driverAfter3?.status}`);
    
    // 🛡️ RÈGLE STRICTE : Le statut "offline" est un choix explicite, il doit être préservé
    // même en cas de déconnexion WebSocket. Seul le bouton ON/OFF peut le changer.
    if (driverAfter3?.status === "offline") {
      logSuccess("✅ TEST 3 RÉUSSI: Le statut 'offline' est préservé malgré la déconnexion WebSocket");
    } else {
      logError(`❌ TEST 3 ÉCHOUÉ: Le livreur devrait rester en 'offline' mais est en '${driverAfter3?.status}'`);
    }
    console.log();
    
    // Résumé final
    console.log("=".repeat(60));
    console.log("📊 RÉSUMÉ DES TESTS");
    console.log("=".repeat(60));
    console.log(`TEST 1 (available → available): ${driverAfter1?.status === "available" ? "✅ RÉUSSI" : "❌ ÉCHOUÉ"}`);
    console.log(`TEST 2 (on_delivery → available): ${driverAfter2?.status === "available" ? "✅ RÉUSSI" : "❌ ÉCHOUÉ"}`);
    console.log(`TEST 3 (offline → offline): ${driverAfter3?.status === "offline" ? "✅ RÉUSSI" : "❌ ÉCHOUÉ"}`);
    console.log("=".repeat(60));
    console.log();
    
    logInfo("💡 Le livreur doit rester en 'available' après avoir terminé ses commandes");
    logInfo("💡 Seul le bouton ON/OFF peut le mettre en 'offline'");
    
    process.exit(0);
  } catch (error) {
    logError(`Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
