import "dotenv/config";
import { db } from "../server/db.js";
import { 
  orders, orderItems, otpCodes, pizzas, pizzaPrices, restaurants, drivers, adminUsers
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  try {
    console.log("🗑️  Début du nettoyage de la base de données...");

    // Supprimer toutes les commandes et leurs items (en cascade)
    console.log("📦 Suppression de toutes les commandes...");
    await db.delete(orderItems);
    await db.delete(orders);
    console.log("✅ Commandes supprimées");

    // Supprimer tous les codes OTP
    console.log("🔐 Suppression de tous les codes OTP...");
    await db.delete(otpCodes);
    console.log("✅ Codes OTP supprimés");

    // Supprimer tous les prix de pizzas
    console.log("💰 Suppression de tous les prix de pizzas...");
    await db.delete(pizzaPrices);
    console.log("✅ Prix de pizzas supprimés");

    // Supprimer toutes les pizzas
    console.log("🍕 Suppression de toutes les pizzas...");
    await db.delete(pizzas);
    console.log("✅ Pizzas supprimées");

    // Supprimer tous les restaurants
    console.log("🏪 Suppression de tous les restaurants...");
    await db.delete(restaurants);
    console.log("✅ Restaurants supprimés");

    // Supprimer tous les livreurs
    console.log("🚗 Suppression de tous les livreurs...");
    await db.delete(drivers);
    console.log("✅ Livreurs supprimés");

    // Supprimer tous les admins (sauf si vous voulez garder certains admins)
    console.log("👤 Suppression de tous les admins...");
    await db.delete(adminUsers);
    console.log("✅ Admins supprimés");

    // Réinitialiser les séquences (si nécessaire)
    console.log("🔄 Réinitialisation des séquences...");
    // Les UUID sont générés automatiquement, pas besoin de réinitialiser

    console.log("\n✨ Base de données complètement vidée !");
    console.log("💡 Vous pouvez maintenant recommencer avec de nouvelles données.");
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur lors du nettoyage:", error.message);
    console.error(error);
    process.exit(1);
  }
}

clearDatabase();


