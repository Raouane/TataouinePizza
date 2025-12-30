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
  }): Promise<{ success: boolean; error?: any; messageId?: number }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const payload: any = {
        chat_id: chatId,
        text: message,
      };

      if (options?.parseMode) {
        payload.parse_mode = options.parseMode;
      }

      if (options?.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
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
        return { 
          success: false, 
          error: data.description || 'Erreur Telegram API',
          messageId: undefined 
        };
      }

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
    
    let acceptUrl = `${appUrl}/accept/${orderId}`;
    let refuseUrl = `${appUrl}/refuse/${orderId}`;
    
    if (driverId) {
      acceptUrl = `${appUrl}/accept/${orderId}?driverId=${driverId}`;
      refuseUrl = `${appUrl}/refuse/${orderId}?driverId=${driverId}`;
    }

    const message = `🍕 <b>NOUVELLE COMMANDE</b>

🏪 <b>Resto:</b> ${restaurantName}
💰 <b>Gain:</b> +${DRIVER_COMMISSION.toFixed(2)} TND
📋 <b>Commande #${orderId.slice(0, 8)}</b>
👤 <b>Client:</b> ${customerName}
📍 <b>Adresse:</b> ${address}

⚡ <b>RÉPONDEZ RAPIDEMENT:</b>

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
            text: '✅ Accepter',
            url: acceptUrl
          },
          {
            text: '❌ Refuser',
            url: refuseUrl
          }
        ],
        [
          {
            text: '📱 Ouvrir l\'app',
            url: `${appUrl}/driver/dashboard?order=${orderId}`
          }
        ]
      ]
    };

    console.log(`[Telegram] 📤 Envoi notification à livreur ${driverTelegramId}`);
    
    const result = await this.sendMessage(driverTelegramId, message, {
      parseMode: 'HTML',
      replyMarkup
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

