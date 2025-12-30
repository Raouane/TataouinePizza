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
   * Envoie un fichier audio via Telegram (notification plus puissante)
   * @param chatId ID du chat Telegram
   * @param audioUrl URL publique du fichier audio (MP3, M4A, OGG)
   * @param caption Texte optionnel avec l'audio
   */
  async sendAudio(
    chatId: string, 
    audioUrl: string, 
    caption?: string
  ): Promise<{ success: boolean; error?: any; messageId?: number }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      // IMPORTANT: Telegram accepte les URLs HTTPS publiques pour les fichiers audio
      // L'URL doit être accessible publiquement et le fichier doit être valide
      const url = `https://api.telegram.org/bot${this.botToken}/sendAudio`;
      
      const payload: any = {
        chat_id: chatId,
        audio: audioUrl, // URL publique du fichier audio (HTTPS requis)
        disable_notification: false, // FORCER la sonnerie
        parse_mode: undefined, // Pas de parse_mode pour les fichiers audio
      };

      if (caption) {
        payload.caption = caption;
      }

      console.log(`[Telegram] 🎵 Envoi fichier audio à ${chatId}`);
      console.log(`[Telegram] 🎵 URL audio: ${audioUrl}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur API sendAudio:', JSON.stringify(data, null, 2));
        console.error('[Telegram] ❌ Code erreur:', data.error_code);
        console.error('[Telegram] ❌ Description:', data.description);
        
        // Si l'URL ne fonctionne pas, essayer avec sendVoice (pour messages vocaux)
        if (data.error_code === 400 || data.description?.includes('file')) {
          console.log('[Telegram] 💡 Tentative avec sendVoice (format message vocal)...');
          return await this.sendVoice(chatId, audioUrl, caption);
        }
        
        return { 
          success: false, 
          error: data.description || 'Erreur Telegram API',
          messageId: undefined 
        };
      }

      console.log(`[Telegram] ✅ Audio envoyé (ID: ${data.result?.message_id})`);
      console.log(`[Telegram] ✅ Fichier audio: ${data.result?.audio?.file_name || 'N/A'}`);
      
      return { 
        success: true, 
        messageId: data.result?.message_id 
      };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur envoi audio:', error);
      console.error('[Telegram] ❌ Stack:', error.stack);
      return { 
        success: false, 
        error: error.message || 'Erreur réseau',
        messageId: undefined 
      };
    }
  }

  /**
   * Envoie un message vocal via Telegram (alternative si sendAudio échoue)
   * Les messages vocaux ont souvent une notification plus forte
   */
  async sendVoice(
    chatId: string,
    audioUrl: string,
    caption?: string
  ): Promise<{ success: boolean; error?: any; messageId?: number }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendVoice`;
      
      const payload: any = {
        chat_id: chatId,
        voice: audioUrl, // URL publique du fichier audio (format OGG recommandé pour voice)
        disable_notification: false, // FORCER la sonnerie
      };

      if (caption) {
        payload.caption = caption;
      }

      console.log(`[Telegram] 🎤 Envoi message vocal à ${chatId} (URL: ${audioUrl})`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur API sendVoice:', data);
        return { 
          success: false, 
          error: data.description || 'Erreur Telegram API',
          messageId: undefined 
        };
      }

      console.log(`[Telegram] ✅ Message vocal envoyé (ID: ${data.result?.message_id})`);
      
      return { 
        success: true, 
        messageId: data.result?.message_id 
      };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur envoi message vocal:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur réseau',
        messageId: undefined 
      };
    }
  }

  /**
   * Envoie une alerte sonore PUISSANTE avec plusieurs fichiers audio
   * Envoie plusieurs fichiers audio en succession pour créer une sonnerie répétée
   * IMPORTANT: La sonnerie fonctionne uniquement si les notifications Telegram sont activées sur le téléphone
   */
  async sendSoundAlert(chatId: string, orderId: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('[Telegram] ❌ Bot non configuré, impossible d\'envoyer l\'alerte sonore');
      return false;
    }

    try {
      // URL du fichier audio d'alerte (doit être accessible publiquement)
      const appUrl = process.env.APP_URL || 'https://tataouine-pizza.onrender.com';
      
      // Utiliser le fichier audio hébergé sur votre serveur
      // Note: Le fichier s'appelle alert.mp3.mp3 (double extension)
      let audioUrl = `${appUrl}/public/audio/alert.mp3.mp3`;
      
      // Si le fichier n'existe pas, essayer alert.mp3
      // audioUrl = `${appUrl}/public/audio/alert.mp3`;
      
      console.log(`[Telegram] 🔊 Début envoi alerte sonore PUISSANTE avec audio à ${chatId}`);
      console.log(`[Telegram] 🎵 URL audio: ${audioUrl}`);
      
      // Vérifier que l'URL est accessible avant d'envoyer
      try {
        console.log(`[Telegram] 🔍 Vérification accessibilité de l'URL audio...`);
        const testResponse = await fetch(audioUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          console.error(`[Telegram] ❌ URL audio non accessible: ${testResponse.status} ${testResponse.statusText}`);
          console.error(`[Telegram] 💡 Vérifiez que le fichier est bien servi par le serveur et accessible publiquement`);
        } else {
          const contentType = testResponse.headers.get('content-type');
          console.log(`[Telegram] ✅ URL audio accessible (Content-Type: ${contentType || 'N/A'})`);
        }
      } catch (urlError: any) {
        console.error(`[Telegram] ⚠️ Erreur lors de la vérification de l'URL audio:`, urlError.message);
        console.error(`[Telegram] 💡 L'URL peut ne pas être accessible publiquement. Vérifiez votre configuration.`);
      }
      
      const alerts = [];
      
      // ENVOYER PLUSIEURS FICHIERS AUDIO EN SUCCESSION (sonnerie PUISSANTE)
      const NUM_AUDIO = 5; // Nombre de fichiers audio à envoyer
      const AUDIO_INTERVAL = 400; // Intervalle entre chaque audio (ms)
      
      for (let i = 0; i < NUM_AUDIO; i++) {
        const result = await this.sendAudio(
          chatId,
          audioUrl,
          `🔔 Alerte ${i + 1}/${NUM_AUDIO}` // Caption court pour chaque audio
        );
        
        alerts.push(result);
        
        if (!result.success) {
          console.error(`[Telegram] ❌ Échec envoi audio ${i + 1}/${NUM_AUDIO}:`, result.error);
        } else {
          console.log(`[Telegram] ✅ Audio ${i + 1}/${NUM_AUDIO} envoyé avec succès`);
        }
        
        // Attendre entre chaque audio pour créer une sonnerie répétée
        if (i < NUM_AUDIO - 1) {
          await new Promise(resolve => setTimeout(resolve, AUDIO_INTERVAL));
        }
      }

      const allSuccess = alerts.every(result => result.success);
      if (allSuccess) {
        console.log(`[Telegram] ✅ ${NUM_AUDIO} fichiers audio envoyés avec succès`);
        console.log(`[Telegram] 💡 NOTE: Si le téléphone ne sonne pas, vérifiez que les notifications Telegram sont activées dans les paramètres du téléphone`);
      } else {
        const failedCount = alerts.filter(r => !r.success).length;
        console.warn(`[Telegram] ⚠️ ${failedCount}/${NUM_AUDIO} fichiers audio ont échoué`);
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

    // ÉTAPE 1: Envoyer plusieurs fichiers audio (sonnerie PUISSANTE)
    console.log(`[Telegram] 🔊 Envoi fichiers audio PUISSANTS à livreur ${driverTelegramId}`);
    await this.sendSoundAlert(driverTelegramId, orderId);
    
    // Attendre 2 secondes après les audios pour que la sonnerie soit bien entendue
    // (5 audios × 400ms = ~2 secondes + marge)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ÉTAPE 2: Envoyer UN SEUL message texte avec tous les détails et le lien PWA
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

    console.log(`[Telegram] 📤 Envoi UN SEUL message détaillé à livreur ${driverTelegramId} (avec sonnerie)`);
    
    // UN SEUL MESSAGE TEXTE avec sonnerie activée
    const result = await this.sendMessage(driverTelegramId, message, {
      parseMode: 'HTML',
      replyMarkup,
      disableNotification: false // FORCER la sonnerie pour le message aussi
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

