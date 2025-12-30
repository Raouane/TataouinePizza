import "dotenv/config";
import { sendWhatsAppToDriver } from "../services/sms-service.js";

/**
 * Script pour tester l'envoi d'un message WhatsApp
 * Usage: npm run script:test-whatsapp
 */
async function testWhatsApp() {
  console.log("========================================");
  console.log("🧪 TEST D'ENVOI WHATSAPP");
  console.log("========================================");
  console.log("");

  // Vérifier les variables d'environnement
  console.log("📋 Vérification des variables d'environnement:");
  console.log("   - TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "✅ DÉFINI" : "❌ MANQUANT");
  console.log("   - TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "✅ DÉFINI" : "❌ MANQUANT");
  console.log("   - TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER || "❌ MANQUANT");
  console.log("   - TWILIO_WHATSAPP_NUMBER:", process.env.TWILIO_WHATSAPP_NUMBER || "❌ MANQUANT");
  console.log("");

  // Numéro de test (Raouane)
  const testPhone = "+33783698509";
  const testOrderId = "test-" + Date.now();
  
  console.log("📱 Test d'envoi WhatsApp:");
  console.log("   - Destinataire:", testPhone);
  console.log("   - Order ID:", testOrderId);
  console.log("");

  let result = false;
  
  try {
    result = await sendWhatsAppToDriver(
      testPhone,
      testOrderId,
      "Client Test",
      "10.00",
      "Adresse Test",
      "Restaurant Test",
      undefined // Pas de driverId pour ce test
    );

    if (result) {
      console.log("");
      console.log("========================================");
      console.log("✅ TEST RÉUSSI - Message WhatsApp envoyé !");
      console.log("========================================");
      console.log("Vérifiez votre téléphone WhatsApp pour voir le message.");
    } else {
      console.log("");
      console.log("========================================");
      console.log("❌ TEST ÉCHOUÉ - Message WhatsApp non envoyé");
      console.log("========================================");
      console.log("Vérifiez les logs ci-dessus pour identifier le problème.");
    }
  } catch (error: any) {
    console.error("");
    console.error("========================================");
    console.error("❌ ERREUR LORS DU TEST");
    console.error("========================================");
    console.error("Erreur:", error.message);
    console.error("Stack:", error.stack);
  }

  process.exit(result ? 0 : 1);
}

testWhatsApp();

