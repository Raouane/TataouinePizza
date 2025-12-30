import "dotenv/config";
import { storage } from "../storage.js";

/**
 * Script pour ajouter un telegramId à un livreur
 * Usage: npm run script:add-driver-telegram-id <phone> <telegram-id>
 * Exemple: npm run script:add-driver-telegram-id +33783698509 7302763094
 */
async function addDriverTelegramId() {
  const phone = process.argv[2];
  const telegramId = process.argv[3];

  if (!phone || !telegramId) {
    console.error("❌ Usage: npm run script:add-driver-telegram-id <phone> <telegram-id>");
    console.error("   Exemple: npm run script:add-driver-telegram-id +33783698509 7302763094");
    console.error("   Exemple: npm run script:add-driver-telegram-id 21612345678 7302763094");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🔧 AJOUT TELEGRAM ID AU LIVREUR");
  console.log("========================================");
  console.log(`Téléphone: ${phone}`);
  console.log(`Telegram ID: ${telegramId}`);
  console.log("");

  try {
    // Nettoyer le numéro de téléphone (garder le + si présent)
    let cleanPhone = phone.replace(/\s/g, '');
    
    // Essayer d'abord avec le format tel quel
    let driver = await storage.getDriverByPhone(cleanPhone);
    
    // Si pas trouvé, essayer sans le +
    if (!driver && cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.replace('+', '');
      driver = await storage.getDriverByPhone(cleanPhone);
    }
    
    // Si toujours pas trouvé, essayer avec le +
    if (!driver && !cleanPhone.startsWith('+')) {
      driver = await storage.getDriverByPhone(`+${cleanPhone}`);
    }
    
    if (!driver) {
      console.error(`❌ Livreur non trouvé avec le téléphone: ${phone}`);
      console.error("");
      console.error("💡 Livreurs disponibles:");
      const allDrivers = await storage.getAllDrivers();
      allDrivers.forEach((d, index) => {
        console.error(`   ${index + 1}. ${d.name} - ${d.phone} ${d.telegramId ? `(Telegram: ${d.telegramId})` : '(Pas de Telegram)'}`);
      });
      process.exit(1);
    }

    console.log(`✅ Livreur trouvé: ${driver.name}`);
    console.log(`   ID: ${driver.id}`);
    console.log(`   Téléphone: ${driver.phone}`);
    console.log(`   Telegram ID actuel: ${driver.telegramId || 'AUCUN'}`);
    console.log("");

    // Mettre à jour le telegramId
    await storage.updateDriver(driver.id, { telegramId });

    console.log(`✅ Telegram ID ajouté avec succès !`);
    console.log(`   ${driver.name} (${driver.phone}) → Telegram ID: ${telegramId}`);
    console.log("");
    console.log("🎉 Le livreur recevra maintenant les notifications Telegram !");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }

  process.exit(0);
}

addDriverTelegramId();

