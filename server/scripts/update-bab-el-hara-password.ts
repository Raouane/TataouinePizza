import "dotenv/config";
import { db } from "../db.js";
import { restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Script pour mettre à jour le mot de passe de BAB EL HARA à "123456"
 * Usage: npm run script:update-bab-el-hara-password
 */
async function updateBabElHaraPassword() {
  const restaurantPhone = "21699999999";
  const newPassword = "123456"; // 6 caractères pour respecter la validation
  
  try {
    console.log("========================================");
    console.log("🔐 MISE À JOUR DU MOT DE PASSE");
    console.log("========================================");
    console.log(`Restaurant: BAB EL HARA`);
    console.log(`Téléphone: ${restaurantPhone}`);
    console.log(`Nouveau mot de passe: ${newPassword}`);
    console.log("");

    // Importer la fonction de hash
    const { hashPassword } = await import("../auth.js");
    const hashedPassword = await hashPassword(newPassword);

    console.log("🔐 Hash du nouveau mot de passe généré");
    console.log("");

    // Trouver le restaurant
    const restaurantResult = await db.execute(sql`
      SELECT id, name, phone
      FROM restaurants 
      WHERE phone = ${restaurantPhone}
    `);

    if (!restaurantResult.rows || restaurantResult.rows.length === 0) {
      console.log("❌ Restaurant non trouvé avec ce téléphone");
      process.exit(1);
    }

    const restaurant = restaurantResult.rows[0] as any;
    console.log(`✅ Restaurant trouvé: ${restaurant.name} (ID: ${restaurant.id})`);
    console.log("");

    // Mettre à jour le mot de passe
    await db
      .update(restaurants)
      .set({ password: hashedPassword })
      .where(eq(restaurants.id, restaurant.id));

    console.log("✅ Mot de passe mis à jour avec succès !");
    console.log("");
    console.log("========================================");
    console.log("📝 INFORMATIONS DE CONNEXION");
    console.log("========================================");
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Téléphone: ${restaurantPhone} (ou ${restaurantPhone.substring(3)} sans préfixe)`);
    console.log(`Mot de passe: ${newPassword}`);
    console.log("");
    console.log("✅ Vous pouvez maintenant vous connecter !");
    console.log("========================================");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

updateBabElHaraPassword();
