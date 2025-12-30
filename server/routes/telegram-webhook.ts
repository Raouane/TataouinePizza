import type { Express, Request, Response } from "express";
import { telegramService } from "../services/telegram-service.js";

export function registerTelegramWebhookRoutes(app: Express): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[Telegram Webhook] ⚠️ TELEGRAM_BOT_TOKEN non configuré, webhook désactivé');
    return;
  }

  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;

      res.status(200).json({ ok: true });

      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const firstName = update.message.from?.first_name || 'Utilisateur';

        console.log(`[Telegram Webhook] 📨 Message reçu de ${chatId}: ${text}`);

        if (text === '/start' || text.startsWith('/start')) {
          const welcomeMessage = `👋 Bonjour ${firstName} !

Je suis le bot de notifications pour les livreurs de Tataouine Pizza.

✅ Vous recevrez automatiquement des alertes pour les nouvelles commandes.

📱 Les notifications incluront :
• Détails de la commande
• Adresse de livraison
• Gain pour le livreur
• Liens pour accepter/refuser

🔔 Restez connecté pour recevoir les notifications !`;

          await telegramService.sendConfirmation(chatId.toString(), welcomeMessage);
          console.log(`[Telegram Webhook] ✅ Message de bienvenue envoyé à ${chatId}`);
        }
        else if (text.toLowerCase().includes('bonjour') || text.toLowerCase().includes('salut') || text.toLowerCase().includes('hello')) {
          const responseMessage = `👋 Bonjour ${firstName} !

Je suis le bot de notifications. Vous recevrez des alertes pour les nouvelles commandes.

Pour commencer, assurez-vous que votre ID Telegram (${chatId}) est ajouté dans la base de données.`;

          await telegramService.sendConfirmation(chatId.toString(), responseMessage);
        }
        else if (text === '/help' || text.startsWith('/help')) {
          const helpMessage = `ℹ️ <b>Aide - Bot Notifications</b>

<b>Commandes disponibles :</b>
/start - Démarrer le bot
/help - Afficher cette aide
/myid - Afficher votre ID Telegram

<b>Fonctionnement :</b>
• Vous recevrez automatiquement des notifications pour les nouvelles commandes
• Cliquez sur "✅ Accepter" ou "❌ Refuser" dans les messages
• Votre ID Telegram : <code>${chatId}</code>

<b>Important :</b>
Assurez-vous que votre ID Telegram est ajouté dans la base de données pour recevoir les notifications.`;

          await telegramService.sendConfirmation(chatId.toString(), helpMessage);
        }
        else if (text === '/myid' || text.startsWith('/myid')) {
          const idMessage = `🆔 <b>Votre ID Telegram</b>

<code>${chatId}</code>

📝 <i>Donnez cet ID à l'administrateur pour être ajouté au système de notifications.</i>`;

          await telegramService.sendConfirmation(chatId.toString(), idMessage);
        }
      }
    } catch (error: any) {
      console.error('[Telegram Webhook] ❌ Erreur:', error);
    }
  });

  console.log('[Telegram Webhook] ✅ Routes webhook Telegram enregistrées');
}

