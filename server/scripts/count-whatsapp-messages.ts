import "dotenv/config";
import twilio from "twilio";

/**
 * Script pour compter les messages WhatsApp envoyés aujourd'hui via Twilio
 * Usage: npm run script:count-whatsapp-messages
 */
async function countWhatsAppMessages() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error("❌ TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant dans les variables d'environnement");
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);

  try {
    console.log("========================================");
    console.log("📊 COMPTAGE DES MESSAGES WHATSAPP");
    console.log("========================================");

    // Date d'aujourd'hui (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Date de demain (pour la fin de la journée)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const todayEnd = tomorrow.toISOString();

    console.log(`📅 Période: ${todayStart} → ${todayEnd}`);
    console.log("🔍 Recherche des messages WhatsApp...\n");

    // Récupérer tous les messages WhatsApp envoyés aujourd'hui
    const messages = await client.messages.list({
      dateSentAfter: todayStart,
      dateSentBefore: todayEnd,
    });

    // Filtrer uniquement les messages WhatsApp (qui commencent par "whatsapp:")
    const whatsappMessages = messages.filter(msg => 
      msg.from?.startsWith("whatsapp:") || msg.to?.startsWith("whatsapp:")
    );

    // Séparer les messages envoyés et reçus
    const sentMessages = whatsappMessages.filter(msg => msg.direction === "outbound-api");
    const receivedMessages = whatsappMessages.filter(msg => msg.direction === "inbound");

    // Compter par statut
    const sentByStatus = {
      sent: sentMessages.filter(m => 
        m.status === "sent" || 
        m.status === "delivered" || 
        m.status === "read" ||
        m.status === "received"
      ).length,
      failed: sentMessages.filter(m => m.status === "failed" || m.status === "undelivered").length,
      queued: sentMessages.filter(m => m.status === "queued").length,
      sending: sentMessages.filter(m => m.status === "sending").length,
    };

    const totalSent = sentMessages.length;
    const totalReceived = receivedMessages.length;
    const limit = 50; // Limite quotidienne Twilio Trial
    const remaining = Math.max(0, limit - totalSent);

    console.log("========================================");
    console.log("📊 RÉSULTATS");
    console.log("========================================");
    console.log(`📤 Messages WhatsApp ENVOYÉS aujourd'hui: ${totalSent}`);
    console.log(`   ✅ Envoyés/Livrés: ${sentByStatus.sent}`);
    console.log(`   ❌ Échoués: ${sentByStatus.failed}`);
    console.log(`   ⏳ En file d'attente: ${sentByStatus.queued}`);
    console.log(`   📡 En cours d'envoi: ${sentByStatus.sending}`);
    console.log(`\n📥 Messages WhatsApp REÇUS aujourd'hui: ${totalReceived}`);
    console.log(`\n🎯 Limite quotidienne Twilio: ${limit}`);
    console.log(`📊 Messages restants: ${remaining}`);
    
    if (totalSent >= limit) {
      console.log(`\n⚠️ ⚠️ ⚠️ LIMITE ATTEINTE ⚠️ ⚠️ ⚠️`);
      console.log(`Vous avez atteint la limite de ${limit} messages/jour.`);
      console.log(`La limite sera réinitialisée à minuit UTC.`);
    } else if (remaining <= 5) {
      console.log(`\n⚠️ Attention: Il ne reste que ${remaining} message(s) disponible(s) !`);
    } else {
      console.log(`\n✅ Vous avez encore ${remaining} message(s) disponible(s) aujourd'hui.`);
    }

    console.log("\n========================================");
    console.log("📋 DÉTAILS DES MESSAGES ENVOYÉS");
    console.log("========================================");
    
    if (sentMessages.length === 0) {
      console.log("Aucun message WhatsApp envoyé aujourd'hui.");
    } else {
      sentMessages.slice(0, 10).forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.to} - ${msg.status} - ${msg.dateSent?.toISOString()}`);
      });
      if (sentMessages.length > 10) {
        console.log(`... et ${sentMessages.length - 10} autre(s) message(s)`);
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur lors du comptage des messages:", error.message);
    if (error.code) {
      console.error(`Code d'erreur: ${error.code}`);
    }
    process.exit(1);
  }
}

countWhatsAppMessages();

