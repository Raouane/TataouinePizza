/**
 * Script pour vérifier les identifiants d'un livreur
 * Usage: npm run check:driver:credentials
 */

import "dotenv/config";
import { db } from "../db.js";
import { drivers } from "@shared/schema";
import { eq, or, like } from "drizzle-orm";

async function checkDriverCredentials() {
  try {
    console.log("========================================");
    console.log("[CHECK CREDENTIALS] 🔍 Recherche du livreur Raouane");
    console.log("========================================");

    // Rechercher par nom (insensible à la casse)
    const driversByName = await db
      .select()
      .from(drivers)
      .where(like(drivers.name, "%Raouane%"));
    
    // Rechercher par téléphone (plusieurs formats possibles)
    const phoneVariants = [
      "+33783698509",
      "33783698509",
      "783698509",
      "216783698509",
      "+216783698509"
    ];

    console.log("\n[CHECK CREDENTIALS] 📋 Recherche par nom 'Raouane'...");
    if (driversByName.length > 0) {
      driversByName.forEach((driver, index) => {
        console.log(`\n✅ Livreur ${index + 1} trouvé par nom:`);
        console.log(`   ID: ${driver.id}`);
        console.log(`   Nom: ${driver.name}`);
        console.log(`   Téléphone: ${driver.phone}`);
        console.log(`   Statut: ${driver.status}`);
        console.log(`   Last Seen: ${driver.lastSeen || 'Jamais'}`);
        console.log(`   Telegram ID: ${driver.telegramId || 'Non configuré'}`);
      });
    } else {
      console.log("❌ Aucun livreur trouvé avec le nom 'Raouane'");
    }

    console.log("\n[CHECK CREDENTIALS] 📋 Recherche par téléphone...");
    for (const phone of phoneVariants) {
      const driversByPhone = await db
        .select()
        .from(drivers)
        .where(eq(drivers.phone, phone));
      
      if (driversByPhone.length > 0) {
        console.log(`\n✅ Livreur trouvé avec le téléphone: ${phone}`);
        driversByPhone.forEach((driver) => {
          console.log(`   ID: ${driver.id}`);
          console.log(`   Nom: ${driver.name}`);
          console.log(`   Téléphone: ${driver.phone}`);
          console.log(`   Statut: ${driver.status}`);
          console.log(`   Last Seen: ${driver.lastSeen || 'Jamais'}`);
          console.log(`   Telegram ID: ${driver.telegramId || 'Non configuré'}`);
        });
      }
    }

    // Afficher tous les livreurs pour référence
    console.log("\n[CHECK CREDENTIALS] 📋 Tous les livreurs dans la base:");
    const allDrivers = await db.select().from(drivers);
    console.log(`   Total: ${allDrivers.length} livreur(s)`);
    allDrivers.forEach((driver, index) => {
      console.log(`\n   ${index + 1}. ${driver.name}`);
      console.log(`      Téléphone: ${driver.phone}`);
      console.log(`      Statut: ${driver.status}`);
      console.log(`      ID: ${driver.id}`);
    });

    // Instructions de connexion
    if (driversByName.length > 0 || phoneVariants.some(p => {
      // Vérifier si un livreur existe avec ce téléphone
      return true; // On a déjà vérifié ci-dessus
    })) {
      const driver = driversByName[0] || await db.select().from(drivers).where(eq(drivers.phone, phoneVariants[0])).then(r => r[0]);
      
      if (driver) {
        console.log("\n========================================");
        console.log("[CHECK CREDENTIALS] ✅ IDENTIFIANTS DE CONNEXION");
        console.log("========================================");
        console.log(`📱 Téléphone: ${driver.phone}`);
        console.log(`🔑 Mot de passe: driver123 (par défaut)`);
        console.log(`\n💡 Format à utiliser dans le formulaire:`);
        console.log(`   - Avec le + : ${driver.phone}`);
        console.log(`   - Sans le + : ${driver.phone.replace('+', '')}`);
        console.log(`\n🌐 URL de connexion: /driver/login`);
        console.log("========================================");
      }
    }

  } catch (error: any) {
    console.error("[CHECK CREDENTIALS] ❌ Erreur:", error.message);
    console.error("[CHECK CREDENTIALS] Stack:", error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkDriverCredentials();
