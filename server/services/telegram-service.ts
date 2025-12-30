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
      // Messages d'alerte sonore - variés et répétés pour maximiser l'impact et créer une sonnerie PUISSANTE
      // Plus de messages = sonnerie plus longue et plus audible
      const alertMessages = [
        `🔔🔔🔔 NOUVELLE COMMANDE #${orderId.slice(0, 8)} 🔔🔔🔔`,
        `⚡⚡⚡ URGENT - COMMANDE DISPONIBLE ⚡⚡⚡`,
        `📱📱📱 NOUVELLE COMMANDE - RÉPONDEZ MAINTENANT 📱📱📱`,
        `🚨🚨🚨 ALERTE - NOUVELLE COMMANDE 🚨🚨🚨`,
        `🔊🔊🔊 COMMANDE EN ATTENTE - RÉPONDEZ 🔊🔊🔊`,
        `⚠️⚠️⚠️ URGENT - NOUVELLE COMMANDE ⚠️⚠️⚠️`
      ];
      
      const NUM_ALERTS = 6; // Augmenter de 3 à 6 messages pour sonnerie plus puissante
      const ALERT_INTERVAL = 400; // Réduire l'intervalle à 400ms pour sonnerie plus rapide et répétée
      
      console.log(`[Telegram] 🔊 Début envoi alerte sonore PUISSANTE à ${chatId} (${NUM_ALERTS} messages avec sonnerie)`);
      
      // Envoyer plusieurs messages en succession rapide pour créer une sonnerie PUISSANTE et répétée
      const alerts = [];
      for (let i = 0; i < NUM_ALERTS; i++) {
        const alertMessage = alertMessages[i] || alertMessages[i % alertMessages.length];
        
        // FORCER disableNotification à false explicitement
        const result = await this.sendMessage(chatId, alertMessage, {
          disableNotification: false, // FORCER la sonnerie
        });
        
        alerts.push(result);
        
        if (!result.success) {
          console.error(`[Telegram] ❌ Échec envoi alerte ${i + 1}/${NUM_ALERTS}:`, result.error);
        } else {
          console.log(`[Telegram] ✅ Alerte ${i + 1}/${NUM_ALERTS} envoyée avec succès`);
        }
        
        // Attendre un intervalle court entre chaque message pour créer une sonnerie rapide et répétée
        // Intervalle réduit pour sonnerie plus puissante
        if (i < NUM_ALERTS - 1) {
          await new Promise(resolve => setTimeout(resolve, ALERT_INTERVAL));
        }
      }

      const allSuccess = alerts.every(result => result.success);
      if (allSuccess) {
        console.log(`[Telegram] ✅ Alerte sonore PUISSANTE complète envoyée (${NUM_ALERTS} messages avec sonnerie activée)`);
        console.log(`[Telegram] 💡 NOTE: Si le téléphone ne sonne pas, vérifiez que les notifications Telegram sont activées dans les paramètres du téléphone`);
      } else {
        const failedCount = alerts.filter(r => !r.success).length;
        console.warn(`[Telegram] ⚠️ ${failedCount}/${NUM_ALERTS} alertes sonores ont échoué`);
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

    // ÉTAPE 1: Envoyer l'alerte sonore PUISSANTE (6 messages rapides pour sonnerie maximale)
    console.log(`[Telegram] 🔊 Envoi alerte sonore PUISSANTE à livreur ${driverTelegramId}`);
    await this.sendSoundAlert(driverTelegramId, orderId);
    
    // Attendre 2 secondes après l'alerte sonore pour que la sonnerie soit bien entendue
    // (6 messages × 400ms = ~2.4 secondes + marge)
    await new Promise(resolve => setTimeout(resolve, 2000));

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
      // Inclure les livreurs "available" ET "on_delivery" qui ont Telegram
      const driversWithTelegram = allDrivers.filter(d => 
        (d.status === 'available' || d.status === 'on_delivery') && d.telegramId
      );

      console.log(`[Telegram] 🔍 ${driversWithTelegram.length} livreur(s) avec Telegram trouvé(s) (available ou on_delivery)`);

      const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
      const driversWithOrderCheck = await Promise.all(
        driversWithTelegram.map(async (driver) => {
          const driverOrders = await storage.getOrdersByDriver(driver.id);
          const activeOrders = driverOrders.filter(o => 
            o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
          );
          const canAcceptMore = activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER;
          
          console.log(`[Telegram] 📊 ${driver.name} (${driver.status}): ${activeOrders.length} commande(s) active(s) - ${canAcceptMore ? '✅ Peut accepter' : '❌ Limite atteinte'}`);
          
          return {
            driver,
            activeOrdersCount: activeOrders.length,
            canAcceptMore
          };
        })
      );

      const trulyAvailableDrivers = driversWithOrderCheck
        .filter(({ canAcceptMore }) => canAcceptMore)
        .map(({ driver }) => driver);

      console.log(`[Telegram] 🔍 ${trulyAvailableDrivers.length} livreur(s) disponible(s) (available ou on_delivery avec < ${MAX_ACTIVE_ORDERS_PER_DRIVER} commande(s))`);

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

