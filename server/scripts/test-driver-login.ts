/**
 * Script pour tester la connexion d'un livreur
 * Usage: npm run test:driver:login
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { comparePassword } from "../auth.js";
import { generateDriverToken } from "../auth.js";

async function testDriverLogin() {
  try {
    console.log("========================================");
    console.log("[TEST LOGIN] 🔍 Test de connexion pour Raouane");
    console.log("========================================");

    const phone = "+33783698509";
    const password = "driver123";

    console.log(`\n[TEST LOGIN] 📋 Tentative de connexion avec:`);
    console.log(`   Téléphone: ${phone}`);
    console.log(`   Mot de passe: ${password}`);

    // 1. Chercher le livreur
    console.log(`\n[TEST LOGIN] 1️⃣ Recherche du livreur...`);
    const driver = await storage.getDriverByPhone(phone);
    
    if (!driver) {
      console.error(`[TEST LOGIN] ❌ Livreur non trouvé avec le téléphone: ${phone}`);
      console.log(`[TEST LOGIN] 💡 Essayez aussi sans le + : ${phone.replace('+', '')}`);
      process.exit(1);
    }

    console.log(`[TEST LOGIN] ✅ Livreur trouvé:`);
    console.log(`   ID: ${driver.id}`);
    console.log(`   Nom: ${driver.name}`);
    console.log(`   Téléphone: ${driver.phone}`);
    console.log(`   Statut: ${driver.status}`);
    console.log(`   Mot de passe hashé: ${driver.password ? 'OUI' : 'NON'}`);

    // 2. Vérifier le mot de passe
    if (!driver.password) {
      console.error(`[TEST LOGIN] ❌ Le livreur n'a pas de mot de passe défini`);
      console.log(`[TEST LOGIN] 💡 Il faut définir un mot de passe via l'admin`);
      process.exit(1);
    }

    console.log(`\n[TEST LOGIN] 2️⃣ Vérification du mot de passe...`);
    const isPasswordValid = await comparePassword(password, driver.password);
    
    if (!isPasswordValid) {
      console.error(`[TEST LOGIN] ❌ Mot de passe incorrect`);
      console.log(`[TEST LOGIN] 💡 Le mot de passe "${password}" ne correspond pas`);
      console.log(`[TEST LOGIN] 💡 Il faut réinitialiser le mot de passe`);
      process.exit(1);
    }

    console.log(`[TEST LOGIN] ✅ Mot de passe correct !`);

    // 3. Générer le token
    console.log(`\n[TEST LOGIN] 3️⃣ Génération du token...`);
    const token = generateDriverToken(driver.id, driver.phone);
    console.log(`[TEST LOGIN] ✅ Token généré avec succès`);
    console.log(`   Token (premiers 30 caractères): ${token.substring(0, 30)}...`);

    console.log("\n========================================");
    console.log("[TEST LOGIN] ✅ CONNEXION RÉUSSIE !");
    console.log("========================================");
    console.log(`📱 Téléphone: ${phone}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log(`🎫 Token généré: OUI`);
    console.log(`\n💡 Identifiants à utiliser dans le formulaire:`);
    console.log(`   Téléphone: ${phone}`);
    console.log(`   OU sans le + : ${phone.replace('+', '')}`);
    console.log(`   Mot de passe: ${password}`);
    console.log("========================================");

  } catch (error: any) {
    console.error("\n========================================");
    console.error("[TEST LOGIN] ❌ ERREUR");
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

testDriverLogin();
