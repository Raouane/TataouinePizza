import { storage } from '../storage.js';
import fs from 'fs';
import path from 'path';

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
   * Modifie le texte d'un message Telegram existant
   * @param chatId ID du chat Telegram
   * @param messageId ID du message à modifier
   * @param newText Nouveau texte du message
   * @param options Options (parseMode, replyMarkup)
   */
  async editMessageText(
    chatId: string,
    messageId: number,
    newText: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      replyMarkup?: any;
    }
  ): Promise<{ success: boolean; error?: any }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/editMessageText`;
      
      const payload: any = {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
      };

      if (options?.parseMode) {
        payload.parse_mode = options.parseMode;
      }

      if (options?.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
      }

      console.log(`[Telegram] ✏️ Modification message ${messageId} pour chat ${chatId}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur editMessageText:', data);
        return { success: false, error: data.description || 'Erreur Telegram API' };
      }

      console.log(`[Telegram] ✅ Message ${messageId} modifié avec succès`);
      return { success: true };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur editMessageText:', error);
      return { success: false, error: error.message || 'Erreur réseau' };
    }
  }

  /**
   * Supprime un message Telegram
   * @param chatId ID du chat Telegram
   * @param messageId ID du message à supprimer
   */
  async deleteMessage(
    chatId: string,
    messageId: number
  ): Promise<{ success: boolean; error?: any }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteMessage`;
      
      const payload = {
        chat_id: chatId,
        message_id: messageId,
      };

      console.log(`[Telegram] 🗑️ Suppression message ${messageId} pour chat ${chatId}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur deleteMessage:', data);
        return { success: false, error: data.description || 'Erreur Telegram API' };
      }

      console.log(`[Telegram] ✅ Message ${messageId} supprimé avec succès`);
      return { success: true };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur deleteMessage:', error);
      return { success: false, error: error.message || 'Erreur réseau' };
    }
  }

  /**
   * Envoie un message vocal directement depuis le système de fichiers (notification automatique plus forte)
   * IMPORTANT: Utiliser sendVoice au lieu de sendAudio car les messages vocaux ont une notification automatique
   * @param chatId ID du chat Telegram
   * @param filePath Chemin vers le fichier audio sur le serveur
   * @param caption Texte optionnel avec l'audio
   */
  async sendVoiceFile(
    chatId: string,
    filePath: string,
    caption?: string
  ): Promise<{ success: boolean; error?: any; messageId?: number }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Telegram bot non configuré' };
    }

    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        console.error(`[Telegram] ❌ Fichier audio non trouvé: ${filePath}`);
        return { success: false, error: 'Fichier audio non trouvé' };
      }

      // Utiliser sendVoice au lieu de sendAudio pour une notification automatique plus forte
      const url = `https://api.telegram.org/bot${this.botToken}/sendVoice`;
      
      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      
      // Créer FormData pour envoyer le fichier (Node.js 18+ supporte FormData globalement)
      const formData = new FormData();
      
      // Créer un Blob à partir du buffer
      // Note: Telegram accepte MP3 pour sendVoice, mais OGG/OPUS est recommandé
      const audioBlob = new Blob([fileBuffer], { type: 'audio/ogg' });
      
      formData.append('chat_id', chatId);
      formData.append('voice', audioBlob, fileName);
      formData.append('disable_notification', 'false'); // FORCER la sonnerie
      
      if (caption) {
        formData.append('caption', caption);
      }

      console.log(`[Telegram] 🎤 Envoi message VOCAL DIRECT à ${chatId} (${fileName}, ${fileBuffer.length} bytes)`);
      console.log(`[Telegram] 💡 Les messages vocaux ont une notification automatique plus forte`);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Ne pas définir Content-Type, fetch le fera automatiquement avec la boundary
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('[Telegram] ❌ Erreur API sendVoice (fichier direct):', JSON.stringify(data, null, 2));
        console.error('[Telegram] ❌ Code erreur:', data.error_code);
        console.error('[Telegram] ❌ Description:', data.description);
        
        return { 
          success: false, 
          error: data.description || 'Erreur Telegram API',
          messageId: undefined 
        };
      }

      console.log(`[Telegram] ✅ Message vocal envoyé (ID: ${data.result?.message_id})`);
      console.log(`[Telegram] ✅ Notification automatique déclenchée`);
      
      return { 
        success: true, 
        messageId: data.result?.message_id 
      };
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur envoi message vocal (fichier direct):', error);
      console.error('[Telegram] ❌ Stack:', error.stack);
      
      // Si l'envoi direct échoue (problème de compatibilité), retourner une erreur
      // Le code appelant utilisera l'URL en fallback
      return { 
        success: false, 
        error: error.message || 'Erreur réseau',
        messageId: undefined 
      };
    }
  }

  /**
   * Envoie un fichier audio directement depuis le système de fichiers (plus fiable que URL)
   * @param chatId ID du chat Telegram
   * @param filePath Chemin vers le fichier audio sur le serveur
   * @param caption Texte optionnel avec l'audio
   */
  async sendAudioFile(
    chatId: string,
    filePath: string,
    caption?: string
  ): Promise<{ success: boolean; error?: any; messageId?: number }> {
    // Utiliser sendVoiceFile en priorité car les messages vocaux ont une notification automatique
    return await this.sendVoiceFile(chatId, filePath, caption);
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
      console.log(`[Telegram] 🔊 Début envoi alerte sonore PUISSANTE avec audio à ${chatId}`);
      
      // PRIORITÉ 1: Essayer d'envoyer le fichier directement depuis le système de fichiers
      // C'est plus fiable que d'utiliser une URL
      const projectRoot = process.cwd();
      // CORRECTION: Utiliser alert.mp3 (pas alert.mp3.mp3)
      const audioFilePath = path.resolve(projectRoot, 'client', 'public', 'audio', 'alert.mp3');
      
      let useDirectFile = false;
      let actualFilePath = audioFilePath;
      
      if (fs.existsSync(audioFilePath)) {
        useDirectFile = true;
        actualFilePath = audioFilePath;
        console.log(`[Telegram] 📁 Fichier audio trouvé localement: ${actualFilePath}`);
      } else {
        console.log(`[Telegram] ⚠️ Fichier audio non trouvé localement, utilisation de l'URL`);
      }
      
      // PRIORITÉ 2: Si le fichier n'existe pas localement, utiliser l'URL
      const appUrl = process.env.APP_URL || 'https://tataouine-pizza.onrender.com';
      const audioUrl = `${appUrl}/audio/alert.mp3`;
      
      // ENVOYER UN SEUL MESSAGE VOCAL (notification automatique)
      let result;
      
      if (useDirectFile) {
        // Envoyer le fichier directement (plus fiable) - utilise sendVoice pour notification automatique
        result = await this.sendVoiceFile(
          chatId,
          actualFilePath,
          `🔔 Nouvelle commande disponible`
        );
      } else {
        // Fallback: utiliser l'URL avec sendVoice (notification automatique)
        console.log(`[Telegram] 🎤 Tentative avec URL (sendVoice): ${audioUrl}`);
        result = await this.sendVoice(
          chatId,
          audioUrl,
          `🔔 Nouvelle commande disponible`
        );
      }
      
      if (!result.success) {
        console.error(`[Telegram] ❌ Échec envoi message vocal:`, result.error);
        // Si l'envoi direct échoue, essayer avec l'URL en fallback
        if (useDirectFile) {
          console.log(`[Telegram] 💡 Tentative avec URL en fallback...`);
          result = await this.sendVoice(chatId, audioUrl, `🔔 Nouvelle commande disponible`);
        }
      } else {
        console.log(`[Telegram] ✅ Message vocal envoyé avec succès (notification automatique)`);
      }

      return result.success;
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
    console.log(`\n[Telegram] 📨 ========================================`);
    console.log(`[Telegram] 📨 ENVOI NOTIFICATION INDIVIDUELLE`);
    console.log(`[Telegram]    Driver Telegram ID: ${driverTelegramId}`);
    console.log(`[Telegram]    Driver ID: ${driverId || 'N/A'}`);
    console.log(`[Telegram]    Order ID: ${orderId}`);
    
    if (!this.isConfigured) {
      console.error('[Telegram] ❌❌❌ BOT NON CONFIGURÉ ❌❌❌');
      console.error('[Telegram]    TELEGRAM_BOT_TOKEN manquant');
      console.log(`[Telegram] ========================================\n`);
      return false;
    }
    
    if (!driverTelegramId || driverTelegramId.trim() === '') {
      console.error('[Telegram] ❌❌❌ TELEGRAM ID MANQUANT ❌❌❌');
      console.error('[Telegram]    Le livreur n\'a pas de telegramId');
      console.log(`[Telegram] ========================================\n`);
      return false;
    }
    
    console.log(`[Telegram] ✅ Configuration OK, envoi du message...`);

    const DRIVER_COMMISSION_RATE = 0.15; // 15% commission
    const gain = (Number(totalPrice) * DRIVER_COMMISSION_RATE).toFixed(2);
    const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
    
    // Lien d'acceptation uniquement (ancienne version)
    let acceptUrl = `${appUrl}/accept/${orderId}`;
    if (driverId) {
      acceptUrl = `${appUrl}/accept/${orderId}?driverId=${driverId}`;
    }
    
    // Récupérer l'adresse du restaurant depuis la commande
    let restaurantAddress = "";
    try {
      const { storage } = await import("../storage.js");
      const order = await storage.getOrderById(orderId);
      if (order?.restaurantId) {
        const restaurant = await storage.getRestaurantById(order.restaurantId);
        if (restaurant?.address) {
          restaurantAddress = restaurant.address;
        }
      }
    } catch (error) {
      console.error('[Telegram] ⚠️ Erreur récupération adresse restaurant:', error);
    }

    // ✅ SONS DÉSACTIVÉS - On utilise uniquement la sonnerie native Telegram
    // ÉTAPE 1: Envoyer plusieurs fichiers audio (sonnerie PUISSANTE) - DÉSACTIVÉ
    // console.log(`[Telegram] 🔊 Envoi fichiers audio PUISSANTS à livreur ${driverTelegramId}`);
    // await this.sendSoundAlert(driverTelegramId, orderId);
    // 
    // // Attendre 2 secondes après les audios pour que la sonnerie soit bien entendue
    // await new Promise(resolve => setTimeout(resolve, 2000));

    // ÉTAPE 2: Message simplifié avec boutons inline "Accepter" et "Refuser"
    const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 <b>NOUVELLE COMMANDE</b> 🔵
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Commande #${orderId.slice(0, 8).toUpperCase()}</b>

<b>👤 ${customerName}</b> - <b>💰 +${gain} TND</b>

🏪 <b>${restaurantName}</b>
${restaurantAddress ? `📍 ${restaurantAddress}` : ''}

👤 <b>${customerName}</b>
📍 ${address}

<i>⏱️ Cliquez sur "Accepter" pour commencer la livraison</i>`;

    // URLs pour les boutons inline
    const refuseUrl = driverId 
      ? `${appUrl}/refuse/${orderId}?driverId=${driverId}`
      : `${appUrl}/refuse/${orderId}`;

    // Boutons inline : Accepter et Refuser
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Accepter",
            url: acceptUrl
          },
          {
            text: "❌ Refuser",
            url: refuseUrl
          }
        ]
      ]
    };

    console.log(`[Telegram] 📤 Envoi message avec boutons inline à ${driverTelegramId} (avec sonnerie)`);
    console.log(`[Telegram]    URL Accept: ${acceptUrl}`);
    console.log(`[Telegram]    URL Refuse: ${refuseUrl}`);
    
    // Message avec boutons inline et sonnerie activée
    const result = await this.sendMessage(driverTelegramId, message, {
      parseMode: 'HTML',
      disableNotification: false, // FORCER la sonnerie pour le message aussi
      replyMarkup: inlineKeyboard
    });

    if (!result.success || !result.messageId) {
      console.error(`[Telegram] ❌ Échec envoi message`);
      console.error(`[Telegram]    Erreur: ${result.error || 'Inconnue'}`);
      console.log(`[Telegram] ========================================\n`);
      return false;
    }

    console.log(`[Telegram] ✅ Message envoyé avec succès !`);
    console.log(`[Telegram]    Message ID: ${result.messageId}`);
    console.log(`[Telegram]    Sonnerie: OUI`);

    // Sauvegarder le messageId si driverId est fourni
    if (driverId) {
      // ✅ SOLUTION 3 : Identifier les duplicatas et programmer leur suppression
      try {
        const { storage } = await import("../storage.js");
        
        // Vérifier si c'est un duplicata (il existe déjà un message pour cette commande + driver)
        const existingMessages = await storage.getTelegramMessagesByOrderIdAndDriver(orderId, driverId);
        const isDuplicate = existingMessages.length > 0;
        
        // Si c'est un duplicata, programmer sa suppression après 5 minutes
        const scheduledDeletionAt = isDuplicate 
          ? new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
          : null;
        
        if (isDuplicate) {
          console.log(`[Telegram] 🔄 Duplicata détecté (messageId: ${result.messageId}). Suppression programmée dans 5 minutes.`);
        } else {
          console.log(`[Telegram] 📝 Message original (messageId: ${result.messageId}). Conservé indéfiniment.`);
        }
        
        // Stocker le messageId dans la base de données avec la date de suppression programmée
        await storage.saveTelegramMessage(
          orderId,
          driverId,
          driverTelegramId,
          result.messageId,
          "sent",
          scheduledDeletionAt
        );
        console.log(`[Telegram] 💾 MessageId ${result.messageId} sauvegardé pour commande ${orderId} (duplicata: ${isDuplicate ? 'OUI' : 'NON'})`);
      } catch (storageError: any) {
        console.error(`[Telegram] ⚠️ Erreur sauvegarde messageId (non-bloquant):`, storageError);
        // Ne pas bloquer si la sauvegarde échoue
      }
    }
    
    console.log(`[Telegram] ========================================\n`);
    return true;
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
    console.log(`\n[Telegram] 🔍 ========================================`);
    console.log(`[Telegram] 🔍 ENVOI NOTIFICATIONS À TOUS LES LIVREURS`);
    console.log(`[Telegram]    Order ID: ${orderId}`);
    console.log(`[Telegram]    Restaurant: ${restaurantName}`);
    console.log(`[Telegram]    Client: ${customerName}`);
    
    if (!this.isConfigured) {
      console.error('[Telegram] ❌❌❌ BOT NON CONFIGURÉ ❌❌❌');
      console.error('[Telegram]    TELEGRAM_BOT_TOKEN manquant dans .env');
      console.error(`[Telegram] ========================================\n`);
      return 0;
    }

    console.log(`[Telegram] ✅ Bot Telegram configuré (token: ${this.botToken?.substring(0, 10)}...)`);

    try {
      const allDrivers = await storage.getAllDrivers();
      console.log(`[Telegram] 📋 ${allDrivers.length} livreur(s) total trouvé(s) dans la DB`);
      
      // Afficher tous les livreurs pour diagnostic
      allDrivers.forEach((driver, idx) => {
        console.log(`[Telegram]    ${idx + 1}. ${driver.name} - Status: ${driver.status} - Telegram ID: ${driver.telegramId || '❌ MANQUANT'}`);
      });
      
      // Inclure les livreurs "available" ET "on_delivery" qui ont Telegram
      const driversWithTelegram = allDrivers.filter(d => 
        (d.status === 'available' || d.status === 'on_delivery') && d.telegramId
      );

      console.log(`[Telegram] 🔍 ${driversWithTelegram.length} livreur(s) avec Telegram trouvé(s) (available ou on_delivery)`);
      
      if (driversWithTelegram.length === 0) {
        console.warn(`[Telegram] ⚠️ Aucun livreur avec Telegram ID trouvé !`);
        console.warn(`[Telegram]    Vérifiez que les livreurs ont un telegramId dans la base de données`);
        console.log(`[Telegram] ========================================\n`);
        return 0;
      }

      const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
      const driversWithOrderCheck = await Promise.all(
        driversWithTelegram.map(async (driver) => {
          const driverOrders = await storage.getOrdersByDriver(driver.id);
          // ✅ CORRECTION : Inclure aussi les commandes "received" avec driverId (elles sont assignées au livreur)
          const activeOrders = driverOrders.filter(o => 
            o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received'
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
        console.warn('[Telegram] ⚠️ Aucun livreur disponible avec Telegram');
        console.warn('[Telegram]    Raisons possibles:');
        console.warn('[Telegram]      - Tous les livreurs ont déjà 2 commandes actives');
        console.warn('[Telegram]      - Aucun livreur n\'est en statut "available" ou "on_delivery"');
        console.log(`[Telegram] ========================================\n`);
        return 0;
      }

      console.log(`[Telegram] 📤 Envoi de ${trulyAvailableDrivers.length} notification(s)...`);

      // ✅ Initialiser la file d'attente Round Robin pour cette commande
      const { orderDriverQueues } = await import('../websocket.js');
      if (!orderDriverQueues.has(orderId)) {
        orderDriverQueues.set(orderId, []);
        console.log(`[Telegram] 📋 File d'attente Round Robin initialisée pour commande ${orderId}`);
      }

      // ✅ MODIFIÉ : Envoyer à TOUS les livreurs disponibles (pas seulement le premier)
      let successCount = 0;
      let failureCount = 0;
      
      for (const driver of trulyAvailableDrivers) {
        console.log(`\n[Telegram] 📤 Envoi notification à ${driver.name}`);
        console.log(`[Telegram]    Telegram ID: ${driver.telegramId}`);
        console.log(`[Telegram]    Driver ID: ${driver.id}`);
        console.log(`[Telegram]    Status: ${driver.status}`);
        
        const success = await this.sendOrderNotification(
          driver.telegramId!,
          orderId,
          customerName,
          totalPrice,
          address,
          restaurantName,
          driver.id
        );
        
        if (success) {
          successCount++;
          console.log(`[Telegram] ✅ Notification envoyée avec succès à ${driver.name}`);
          
          // Ajouter le livreur à la file d'attente Round Robin
          const queue = orderDriverQueues.get(orderId)!;
          queue.push({
            driverId: driver.id,
            notifiedAt: new Date()
          });
        } else {
          failureCount++;
          console.error(`[Telegram] ❌ Échec envoi notification à ${driver.name}`);
        }
      }

      console.log(`\n[Telegram] 📊 RÉSUMÉ:`);
      console.log(`[Telegram]    ✅ Succès: ${successCount}`);
      console.log(`[Telegram]    ❌ Échecs: ${failureCount}`);
      console.log(`[Telegram]    📋 Total: ${trulyAvailableDrivers.length}`);
      console.log(`[Telegram] ========================================\n`);
      
      return successCount;
    } catch (error: any) {
      console.error('[Telegram] ❌ Erreur envoi aux livreurs:', error);
      return 0;
    }
  }
}

export const telegramService = new TelegramService();

