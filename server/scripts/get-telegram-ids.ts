import "dotenv/config";

async function getTelegramIds() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN non défini");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🔍 RÉCUPÉRATION DES IDs TELEGRAM");
  console.log("========================================");
  console.log("");

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      console.error("❌ Erreur API Telegram:", data.description);
      process.exit(1);
    }

    const updates = data.result || [];
    
    if (updates.length === 0) {
      console.log("⚠️ Aucun message reçu par le bot");
      console.log("💡 Les livreurs doivent d'abord envoyer un message au bot (ex: /start)");
      process.exit(0);
    }

    console.log(`✅ ${updates.length} message(s) trouvé(s)\n`);

    const chatIds = new Map<number, { firstName?: string; lastName?: string; username?: string; type: string }>();

    for (const update of updates) {
      if (update.message?.chat) {
        const chat = update.message.chat;
        const chatId = chat.id;
        
        if (!chatIds.has(chatId)) {
          chatIds.set(chatId, {
            firstName: chat.first_name,
            lastName: chat.last_name,
            username: chat.username,
            type: chat.type
          });
        }
      }
    }

    console.log("========================================");
    console.log("📋 IDs TELEGRAM TROUVÉS");
    console.log("========================================");
    console.log("");

    chatIds.forEach((info, chatId) => {
      console.log(`ID: ${chatId}`);
      console.log(`  Type: ${info.type}`);
      if (info.firstName) console.log(`  Nom: ${info.firstName} ${info.lastName || ''}`.trim());
      if (info.username) console.log(`  Username: @${info.username}`);
      console.log("");
    });

    console.log("========================================");
    console.log("💡 INSTRUCTIONS");
    console.log("========================================");
    console.log("1. Notez les IDs ci-dessus");
    console.log("2. Ajoutez-les dans la base de données (table drivers, colonne telegram_id)");
    console.log("");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

getTelegramIds();

