import "dotenv/config";

async function setupTelegramWebhook() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";

  if (!botToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN non défini");
    process.exit(1);
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  console.log("========================================");
  console.log("🔧 CONFIGURATION WEBHOOK TELEGRAM");
  console.log("========================================");
  console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log("");

  try {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Webhook configuré avec succès !");
      console.log(`   URL: ${webhookUrl}`);
      
      const infoUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
      const infoResponse = await fetch(infoUrl);
      const infoData = await infoResponse.json();
      
      if (infoData.ok) {
        console.log("");
        console.log("📊 Informations du webhook:");
        console.log(`   URL: ${infoData.result.url}`);
        console.log(`   Pending updates: ${infoData.result.pending_update_count || 0}`);
        if (infoData.result.last_error_date) {
          console.log(`   ⚠️ Dernière erreur: ${infoData.result.last_error_message}`);
        }
      }
    } else {
      console.error("❌ Erreur configuration webhook:", data.description);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

setupTelegramWebhook();

