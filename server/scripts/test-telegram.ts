import "dotenv/config";
import { telegramService } from "../services/telegram-service.js";

async function testTelegram() {
  const chatId = process.argv[2];

  if (!chatId) {
    console.error("❌ Usage: npm run script:test-telegram <chat-id>");
    console.error("   Exemple: npm run script:test-telegram 123456789");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🧪 TEST TELEGRAM");
  console.log("========================================");
  console.log(`Bot configuré: ${telegramService.isReady() ? '✅ OUI' : '❌ NON'}`);
  console.log(`Chat ID: ${chatId}`);
  console.log("");

  if (!telegramService.isReady()) {
    console.error("❌ Bot Telegram non configuré !");
    console.error("Vérifiez TELEGRAM_BOT_TOKEN dans les variables d'environnement");
    process.exit(1);
  }

  const testMessage = `🧪 <b>TEST TELEGRAM</b>

Ceci est un message de test depuis votre application Tataouine Pizza.

Si vous recevez ce message, la configuration Telegram fonctionne correctement ! ✅

Date: ${new Date().toLocaleString('fr-FR')}`;

  console.log("📤 Envoi du message de test...");
  const success = await telegramService.sendConfirmation(chatId, testMessage);

  if (success) {
    console.log("");
    console.log("✅ Message envoyé avec succès !");
    console.log("Vérifiez Telegram pour confirmer la réception.");
  } else {
    console.log("");
    console.log("❌ Échec de l'envoi du message");
    console.log("Vérifiez les logs ci-dessus pour plus de détails.");
  }

  process.exit(success ? 0 : 1);
}

testTelegram();

