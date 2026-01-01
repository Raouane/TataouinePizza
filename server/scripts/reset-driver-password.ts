/**
 * Script pour réinitialiser le mot de passe d'un livreur
 * Usage: npm run reset:driver:password
 */

import "dotenv/config";
import { db } from "../db.js";
import { drivers } from "@shared/schema";
import { hashPassword } from "../auth.js";
import { eq } from "drizzle-orm";

async function resetDriverPassword() {
  try {
    console.log("========================================");
    console.log("[RESET PASSWORD] 🔄 Réinitialisation du mot de passe");
    console.log("========================================");

    const phone = "+33783698509";
    const name = "Raouane";
    const newPassword = "driver123"; // Nouveau mot de passe

    console.log(`\n[RESET PASSWORD] 📋 Recherche du livreur...`);
    console.log(`   Téléphone: ${phone}`);
    console.log(`   Nom: ${name}`);

    // Chercher le livreur
    const existing = await db.select().from(drivers).where(eq(drivers.phone, phone));
    
    if (existing.length === 0) {
      console.error(`[RESET PASSWORD] ❌ Livreur non trouvé avec le téléphone: ${phone}`);
      process.exit(1);
    }

    const driver = existing[0];
    console.log(`[RESET PASSWORD] ✅ Livreur trouvé:`);
    console.log(`   ID: ${driver.id}`);
    console.log(`   Nom: ${driver.name}`);
    console.log(`   Téléphone: ${driver.phone}`);

    // Hasher le nouveau mot de passe
    console.log(`\n[RESET PASSWORD] 🔐 Hashage du nouveau mot de passe...`);
    const hashedPassword = await hashPassword(newPassword);
    console.log(`[RESET PASSWORD] ✅ Mot de passe hashé`);

    // Mettre à jour le mot de passe
    console.log(`\n[RESET PASSWORD] 💾 Mise à jour dans la base de données...`);
    const [updated] = await db
      .update(drivers)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(drivers.phone, phone))
      .returning();

    console.log(`[RESET PASSWORD] ✅ Mot de passe mis à jour avec succès !`);

    console.log("\n========================================");
    console.log("[RESET PASSWORD] ✅ RÉINITIALISATION RÉUSSIE");
    console.log("========================================");
    console.log(`📱 Téléphone: ${updated.phone}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log(`\n💡 Identifiants de connexion:`);
    console.log(`   Téléphone: ${updated.phone}`);
    console.log(`   OU sans le + : ${updated.phone.replace('+', '')}`);
    console.log(`   Mot de passe: ${newPassword}`);
    console.log(`\n🌐 URL: /driver/login`);
    console.log("========================================");

  } catch (error: any) {
    console.error("\n========================================");
    console.error("[RESET PASSWORD] ❌ ERREUR");
    console.error("========================================");
    console.error(`Type: ${error.constructor.name}`);
    console.error(`Message: ${error.message}`);
    if (error.stack) {
      console.error(`\nStack:\n${error.stack}`);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetDriverPassword();
