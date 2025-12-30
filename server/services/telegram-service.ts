import { storage } from '../storage.js';

/**
 * Service Telegram pour envoyer des notifications aux livreurs
 */
class TelegramService {
  private botToken: string | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.isConfigured = !!this.botToken;

    if (this.isConfigured) {
      console.log('[Telegram] ✅ Bot Telegram configuré et prêt');
    } else {
      console.warn('[Telegram] ⚠️ Bot Telegram non configuré');
      console.warn('[Telegram] ⚠️ Définissez TELEGRAM_BOT_TOKEN dans les variables d\'environnement');
    }
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  async sendMessage(chatId: string, message: string, options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    disableNotification?: boolean;
  }): Promise<{ success: boolean; error?: any; messageId?: number }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      // IMPORTANT: disable_notification doit être explicitement false pour que la sonnerie fonctionne
      // Si disableNotification n'est pas défini, on le met à false par défaut
      const disableNotification = options?.disableNotification !== undefined 
        ? options.disableNotification 
        : false;
      
      const payload: any = {
        chat_id: chatId,
        text: message,
        disable_notification: disableNotification, // false = sonnerie activée, true = silencieux
      };

      if (options?.parseMode) {
        payload.parse_mode = options.parseMode;
      }

      if (options?.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
      }

      // Log pour déboguer
      if (!disableNotification) {
        console.log(`[Telegram] 🔊 Envoi message avec SONNERIE activée à ${chatId}`);
      } else {
        console.log(`[Telegram] 🔇 Envoi message SILENCIEUX à ${chatId}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur API:', data);
        console.error('[Telegram] ❌ Payload envoyé:', JSON.stringify(payload, null, 2));
        return { 
          success: false, 
          error: data.description || 'Erreur Telegram API',
          messageId: undefined 
        };
      }

      console.log(`[Telegram] ✅ Message envoyé (ID: ${data.result?.message_id}, Sonnerie: ${!disableNotification ? 'OUI' : 'NON'})`);
      
      return { 
        success: true, 
        messageId: data.result?.message_id 
      };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur réseau:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur réseau',
        messageId: undefined 
      };
    }
  }

  /**
   * Envoie une alerte sonore distincte et répétée pour attirer l'attention du livreur
   * Envoie plusieurs messages courts en succession pour créer une sonnerie
   * IMPORTANT: La sonnerie fonctionne uniquement si les notifications Telegram sont activées sur le téléphone
   */
  async sendSoundAlert(chatId: string, orderId: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('[Telegram] ❌ Bot non configuré, impossible d\'envoyer l\'alerte sonore');
      return false;
    }

    try {
      // Messages d'alerte sonore - variés pour maximiser l'impact
      const alertMessages = [
        `🔔🔔🔔 NOUVELLE COMMANDE #${orderId.slice(0, 8)} 🔔🔔🔔`,
        `⚡⚡⚡ URGENT - COMMANDE DISPONIBLE ⚡⚡⚡`,
        `📱📱📱 NOUVELLE COMMANDE - RÉPONDEZ MAINTENANT 📱📱📱`
      ];
      
      console.log(`[Telegram] 🔊 Début envoi alerte sonore à ${chatId} (3 messages avec sonnerie)`);
      
      // Envoyer 3 messages différents en succession pour créer une sonnerie répétée et distincte
      const alerts = [];
      for (let i = 0; i < 3; i++) {
        const alertMessage = alertMessages[i] || alertMessages[0];
        
        // FORCER disableNotification à false explicitement
        const result = await this.sendMessage(chatId, alertMessage, {
          disableNotification: false, // FORCER la sonnerie
        });
        
        alerts.push(result);
        
        if (!result.success) {
          console.error(`[Telegram] ❌ Échec envoi alerte ${i + 1}/3:`, result.error);
        } else {
          console.log(`[Telegram] ✅ Alerte ${i + 1}/3 envoyée avec succès`);
        }
        
        // Attendre 800ms entre chaque message pour créer une sonnerie répétée plus audible
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      const allSuccess = alerts.every(result => result.success);
      if (allSuccess) {
        console.log(`[Telegram] ✅ Alerte sonore complète envoyée (3 messages avec sonnerie activée)`);
        console.log(`[Telegram] 💡 NOTE: Si le téléphone ne sonne pas, vérifiez que les notifications Telegram sont activées dans les paramètres du téléphone`);
      } else {
        const failedCount = alerts.filter(r => !r.success).length;
        console.warn(`[Telegram] ⚠️ ${failedCount}/3 alertes sonores ont échoué`);
      }

      return allSuccess;
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur alerte sonore:', error);
      console.error('[Telegram] ❌ Stack:', error.stack);
      return false;
    }
  }

  async sendOrderNotification(
    driverTelegramId: string,
    orderId: string,
    customerName: string,
    totalPrice: string,
    address: string,
    restaurantName: string,
    driverId?: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('[Telegram] ❌ Bot non configuré');
      return false;
    }

    const DRIVER_COMMISSION = 2.5;
    const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
    
    // URL principale vers la PWA pour commencer la livraison
    const pwaUrl = driverId 
      ? `${appUrl}/driver/dashboard?order=${orderId}&driverId=${driverId}`
      : `${appUrl}/driver/dashboard?order=${orderId}`;
    
    let acceptUrl = `${appUrl}/accept/${orderId}`;
    let refuseUrl = `${appUrl}/refuse/${orderId}`;
    
    if (driverId) {
      acceptUrl = `${appUrl}/accept/${orderId}?driverId=${driverId}`;
      refuseUrl = `${appUrl}/refuse/${orderId}?driverId=${driverId}`;
    }

    // ÉTAPE 1: Envoyer l'alerte sonore (sonnerie distincte et longue)
    console.log(`[Telegram] 🔊 Envoi alerte sonore à livreur ${driverTelegramId}`);
    await this.sendSoundAlert(driverTelegramId, orderId);
    
    // Attendre 1 seconde après l'alerte sonore avant d'envoyer le message principal
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ÉTAPE 2: Envoyer le message principal avec tous les détails et le lien PWA
    const message = `🍕 <b>NOUVELLE COMMANDE</b>

🏪 <b>Resto:</b> ${restaurantName}
💰 <b>Gain:</b> +${DRIVER_COMMISSION.toFixed(2)} TND
📋 <b>Commande #${orderId.slice(0, 8)}</b>
👤 <b>Client:</b> ${customerName}
📍 <b>Adresse:</b> ${address}

⚡ <b>RÉPONDEZ RAPIDEMENT:</b>

📱 <b>COMMENCER LA LIVRAISON:</b>
${pwaUrl}

✅ <b>ACCEPTER:</b>
${acceptUrl}

❌ <b>REFUSER:</b>
${refuseUrl}

<i>Ou tapez A pour accepter, R pour refuser</i>

⏱️ <b>Délai: 2 minutes</b>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '📱 Commencer la livraison',
            url: pwaUrl
          }
        ],
        [
          {
            text: '✅ Accepter',
            url: acceptUrl
          },
          {
            text: '❌ Refuser',
            url: refuseUrl
          }
        ]
      ]
    };

    console.log(`[Telegram] 📤 Envoi message détaillé à livreur ${driverTelegramId} (avec sonnerie)`);
    
    // FORCER disableNotification à false pour que le message principal sonne aussi
    const result = await this.sendMessage(driverTelegramId, message, {
      parseMode: 'HTML',
      replyMarkup,
      disableNotification: false // FORCER la sonnerie pour le message principal
    });

    if (result.success) {
      console.log(`[Telegram] ✅ Message envoyé: ${result.messageId || 'N/A'}`);
      return true;
    } else {
      console.error(`[Telegram] ❌ Erreur envoi:`, result.error);
      return false;
    }
  }

  async sendConfirmation(chatId: string, message: string): Promise<boolean> {
    const result = await this.sendMessage(chatId, message, { parseMode: 'HTML' });
    return result.success;
  }

  async sendToAllAvailableDrivers(
    orderId: string,
    restaurantName: string,
    customerName: string,
    totalPrice: string,
    address: string
  ): Promise<number> {
    if (!this.isConfigured) {
      console.error('[Telegram] ❌ Bot non configuré');
      return 0;
    }

    try {
      const allDrivers = await storage.getAllDrivers();
      const availableDrivers = allDrivers.filter(d => 
        d.status === 'available' && d.telegramId
      );

      console.log(`[Telegram] 🔍 ${availableDrivers.length} livreur(s) avec Telegram trouvé(s)`);

      const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
      const driversWithOrderCheck = await Promise.all(
        availableDrivers.map(async (driver) => {
          const driverOrders = await storage.getOrdersByDriver(driver.id);
          const activeOrders = driverOrders.filter(o => 
            o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
          );
          return {
            driver,
            activeOrdersCount: activeOrders.length,
            canAcceptMore: activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER
          };
        })
      );

      const trulyAvailableDrivers = driversWithOrderCheck
        .filter(({ canAcceptMore }) => canAcceptMore)
        .map(({ driver }) => driver);

      console.log(`[Telegram] 🔍 ${trulyAvailableDrivers.length} livreur(s) disponible(s)`);

      if (trulyAvailableDrivers.length === 0) {
        console.log('[Telegram] ⚠️ Aucun livreur disponible avec Telegram');
        return 0;
      }

      const firstDriver = trulyAvailableDrivers[0];
      
      const success = await this.sendOrderNotification(
        firstDriver.telegramId!,
        orderId,
        customerName,
        totalPrice,
        address,
        restaurantName,
        firstDriver.id
      );

      return success ? 1 : 0;
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur envoi aux livreurs:', error);
      return 0;
    }
  }
}

export const telegramService = new TelegramService();

