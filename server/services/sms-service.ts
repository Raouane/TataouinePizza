import twilio from 'twilio';
import { storage } from '../storage.js';
import { telegramService } from './telegram-service.js';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const verifiedNumber = process.env.TWILIO_VERIFIED_NUMBER; // Numéro vérifié pour le compte Trial

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('[SMS] ⚠️ Twilio non configuré - les SMS ne seront pas envoyés');
  console.warn('[SMS] Variables manquantes:', {
    accountSid: !!accountSid,
    authToken: !!authToken,
    phoneNumber: !!twilioPhoneNumber,
  });
}

const twilioClient = accountSid && authToken 
  ? twilio(accountSid, authToken)
  : null;

// Log de configuration au démarrage
if (twilioClient) {
  console.log('[SMS] ✅ Twilio configuré et prêt');
  console.log('[SMS] Numéro Twilio:', twilioPhoneNumber);
  if (verifiedNumber) {
    console.log('[SMS] Mode Trial: SMS envoyés au numéro vérifié:', verifiedNumber);
  } else {
    console.log('[SMS] Mode Production: SMS envoyés aux livreurs disponibles');
  }
} else {
  console.warn('[SMS] ⚠️ Twilio non configuré - les SMS ne seront pas envoyés');
  console.warn('[SMS] Vérifiez que les variables d\'environnement sont définies:');
  console.warn('[SMS]   - TWILIO_ACCOUNT_SID:', accountSid ? '✅' : '❌');
  console.warn('[SMS]   - TWILIO_AUTH_TOKEN:', authToken ? '✅' : '❌');
  console.warn('[SMS]   - TWILIO_PHONE_NUMBER:', twilioPhoneNumber ? '✅' : '❌');
}

/**
 * Formate un numéro de téléphone au format international
 */
function formatPhoneNumber(phone: string): string {
  // Si le numéro commence déjà par +, le retourner tel quel
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Si le numéro commence par 216, ajouter +
  if (phone.startsWith('216')) {
    return `+${phone}`;
  }
  
  // Sinon, ajouter +216 (code pays Tunisie)
  return `+216${phone}`;
}

/**
 * Envoie des SMS à tous les livreurs disponibles pour une nouvelle commande
 */
export async function sendSMSToDrivers(
  orderId: string,
  restaurantName: string,
  customerName: string,
  totalPrice: string,
  maxDrivers: number = 999, // Par défaut, tous les livreurs
  address?: string,
  restaurantAddress?: string,
  customerPhone?: string,
  items?: Array<{ name: string; size: string; quantity: number }>
) {
  console.log('[SMS] 🔔 sendSMSToDrivers appelé pour commande:', orderId.slice(0, 8));
  console.log('[SMS] 📊 Paramètres reçus:', {
    orderId: orderId.slice(0, 8),
    restaurantName,
    customerName,
    totalPrice,
    address: address || 'non fourni',
    restaurantAddress: restaurantAddress || 'non fourni',
    customerPhone: customerPhone || 'non fourni',
    itemsCount: items?.length || 0
  });
  
  if (!twilioClient) {
    console.error('[SMS] ❌ Twilio non configuré, SMS non envoyé');
    console.error('[SMS] Vérification configuration:', {
      accountSid: !!accountSid,
      authToken: !!authToken,
      twilioPhoneNumber: !!twilioPhoneNumber,
      verifiedNumber: verifiedNumber || 'non configuré'
    });
    return;
  }
  
  console.log('[SMS] ✅ Twilio client disponible, envoi du SMS...');

  try {
    // Construire le message avec toutes les informations disponibles
    let message = `🔔 NOUVELLE COMMANDE DISPONIBLE!\n\n`;
    
    // Informations de base
    message += `📋 ID: ${orderId.slice(0, 8)}\n`;
    message += `💰 Total: ${totalPrice} TND\n\n`;
    
    // Informations restaurant
    message += `🍕 RESTAURANT:\n`;
    message += `${restaurantName}\n`;
    if (restaurantAddress) {
      message += `📍 ${restaurantAddress}\n`;
    }
    message += `\n`;
    
    // Informations client
    message += `👤 CLIENT:\n`;
    message += `${customerName}\n`;
    if (customerPhone) {
      message += `📞 ${customerPhone}\n`;
    }
    if (address) {
      message += `📍 ${address}\n`;
    }
    message += `\n`;
    
    // Détails des articles (si disponibles)
    if (items && items.length > 0) {
      message += `📦 COMMANDE:\n`;
      items.forEach((item, index) => {
        if (index < 3) { // Limiter à 3 articles pour ne pas dépasser la limite SMS
          message += `• ${item.quantity}x ${item.name} (${item.size})\n`;
        }
      });
      if (items.length > 3) {
        message += `... et ${items.length - 3} autre(s) article(s)\n`;
      }
      message += `\n`;
    }
    
    message += `✅ Vérifiez l'application pour accepter`;

    // Si un numéro vérifié est configuré (pour compte Trial), envoyer uniquement à ce numéro
    if (verifiedNumber) {
      // S'assurer que le numéro a le format international avec +
      const formattedVerifiedNumber = verifiedNumber.startsWith('+') 
        ? verifiedNumber 
        : `+${verifiedNumber}`;
      
      console.log(`[SMS] Mode Trial: Envoi SMS au numéro vérifié ${formattedVerifiedNumber}`);
      
      try {
        const result = await twilioClient.messages.create({
          body: message,
          from: twilioPhoneNumber!,
          to: formattedVerifiedNumber,
        });

        console.log(`[SMS] ✅ SMS envoyé au numéro vérifié ${formattedVerifiedNumber}: ${result.sid}`);
        console.log(`[SMS] Message: ${message}`);
      } catch (error: any) {
        console.error(`[SMS] ❌ Erreur envoi SMS au numéro vérifié:`, error.message);
        console.error(`[SMS] Détails de l'erreur:`, error);
        if (error.code === 21211) {
          console.error(`[SMS] ⚠️ Numéro invalide. Vérifiez que ${formattedVerifiedNumber} est bien vérifié dans Twilio.`);
        }
      }
      return;
    }

    // Sinon, envoyer à tous les livreurs disponibles (pour compte payant)
    // Récupérer tous les livreurs
    const allDrivers = await storage.getAllDrivers();
    
    // Filtrer les livreurs disponibles (en ligne dans les 5 dernières minutes)
    const onlineDrivers = allDrivers.filter(driver => {
      const isAvailable = driver.status === 'available';
      return isAvailable;
    });

    // Limiter le nombre de livreurs si nécessaire
    const driversToNotify = onlineDrivers.slice(0, maxDrivers);

    console.log(`[SMS] Envoi SMS à ${driversToNotify.length} livreur(s) sur ${onlineDrivers.length} disponible(s)`);

    // Envoyer SMS à chaque livreur
    let successCount = 0;
    let errorCount = 0;

    for (const driver of driversToNotify) {
      try {
        // Formater le numéro de téléphone
        const phoneNumber = formatPhoneNumber(driver.phone);

        console.log(`[SMS] Envoi SMS à ${driver.name} (${phoneNumber})...`);

        const result = await twilioClient.messages.create({
          body: message,
          from: twilioPhoneNumber!,
          to: phoneNumber,
        });

        console.log(`[SMS] ✅ SMS envoyé à ${driver.name} (${phoneNumber}): ${result.sid}`);
        successCount++;
      } catch (error: any) {
        console.error(`[SMS] ❌ Erreur envoi SMS à ${driver.name}:`, error.message);
        errorCount++;
        // Continuer avec les autres livreurs même si un échoue
      }
    }

    console.log(`[SMS] Résumé: ${successCount} SMS envoyés avec succès, ${errorCount} erreurs`);
  } catch (error) {
    console.error('[SMS] ❌ Erreur lors de l\'envoi des SMS:', error);
  }
}

/**
 * Envoie un code OTP par SMS à un utilisateur (livreur ou restaurant)
 * @param phone Numéro de téléphone du destinataire
 * @param code Code OTP à envoyer
 * @param userType Type d'utilisateur (driver ou restaurant)
 * @returns Résultat de l'envoi avec success et error si échec
 */
export async function sendOtpSms(
  phone: string,
  code: string,
  userType: "driver" | "restaurant" = "driver"
): Promise<{ success: boolean; error?: any }> {
  if (!twilioClient) {
    console.warn('[SMS OTP] ⚠️ Twilio non configuré, SMS OTP non envoyé');
    return { success: false, error: { code: 'NO_TWILIO', message: 'Twilio non configuré' } };
  }

  const formattedPhone = formatPhoneNumber(phone);
  const userLabel = userType === "driver" ? "Livreur" : "Restaurant";
  
  const message = `🔐 Code OTP ${userLabel}\n\nVotre code de connexion: ${code}\n\nCe code expire dans 5 minutes.`;

  try {
    // Si un numéro vérifié est configuré (pour compte Trial), envoyer uniquement à ce numéro
    if (verifiedNumber) {
      const formattedVerifiedNumber = verifiedNumber.startsWith('+') 
        ? verifiedNumber 
        : `+${verifiedNumber}`;
      
      console.log(`[SMS OTP] Mode Trial: Envoi OTP au numéro vérifié ${formattedVerifiedNumber}`);
      
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber!,
        to: formattedVerifiedNumber,
      });

      console.log(`[SMS OTP] ✅ SMS OTP envoyé au numéro vérifié: ${result.sid}`);
      console.log(`[SMS OTP] Code OTP: ${code} (pour ${phone})`);
      return { success: true };
    }

    // En production, envoyer au numéro réel du livreur/restaurant
    console.log(`[SMS OTP] Envoi OTP à ${formattedPhone} (${userLabel})`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber!,
      to: formattedPhone,
    });

    console.log(`[SMS OTP] ✅ SMS OTP envoyé à ${formattedPhone}: ${result.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[SMS OTP] ❌ Erreur envoi SMS OTP à ${formattedPhone}:`, error.message);
    if (error.code === 21211) {
      console.error(`[SMS OTP] ⚠️ Numéro invalide: ${formattedPhone}`);
    } else if (error.code === 63038) {
      console.error(`[SMS OTP] ⚠️ Limite quotidienne atteinte (50 messages/jour)`);
    }
    // Retourner l'erreur pour que l'appelant puisse la gérer
    return { success: false, error };
  }
}

/**
 * Envoie une notification WhatsApp à un livreur pour une nouvelle commande
 * WhatsApp sonne toujours, même téléphone éteint (contrairement aux notifications push)
 * @param driverPhone Numéro WhatsApp du livreur (format: +216xxxxxxxxx ou +33xxxxxxxxx)
 * @param orderId ID de la commande
 * @param customerName Nom du client
 * @param totalPrice Prix total
 * @param address Adresse de livraison
 * @param restaurantName Nom du restaurant
 */
export async function sendWhatsAppToDriver(
  driverPhone: string,
  orderId: string,
  customerName: string,
  totalPrice: string,
  address: string,
  restaurantName: string,
  driverId?: string  // Ajouter driverId optionnel pour éviter la recherche
): Promise<boolean> {
  console.log('[WhatsApp] 📞 sendWhatsAppToDriver APPELÉE');
  console.log('[WhatsApp]   - Téléphone livreur:', driverPhone);
  console.log('[WhatsApp]   - Order ID:', orderId.slice(0, 8));
  console.log('[WhatsApp]   - Driver ID:', driverId || 'NON FOURNI');
  
  if (!twilioClient) {
    console.error('[WhatsApp] ❌ Twilio client non initialisé');
    console.error('[WhatsApp] ❌ Vérifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans .env');
    return false;
  }
  
  console.log('[WhatsApp] ✅ Twilio client initialisé');

  // Construire le numéro WhatsApp source avec le préfixe "whatsapp:"
  let whatsappFrom: string | null = null;
  
  if (process.env.TWILIO_WHATSAPP_NUMBER) {
    // Si TWILIO_WHATSAPP_NUMBER est défini, s'assurer qu'il a le préfixe "whatsapp:"
    whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
  } else if (twilioPhoneNumber) {
    // Sinon, utiliser TWILIO_PHONE_NUMBER avec le préfixe "whatsapp:"
    whatsappFrom = `whatsapp:${twilioPhoneNumber}`;
  }
  
  console.log('[WhatsApp] 🔍 Vérification configuration WhatsApp:');
  console.log('[WhatsApp]   - TWILIO_WHATSAPP_NUMBER (raw):', process.env.TWILIO_WHATSAPP_NUMBER || 'NON DÉFINI');
  console.log('[WhatsApp]   - TWILIO_PHONE_NUMBER:', twilioPhoneNumber || 'NON DÉFINI');
  console.log('[WhatsApp]   - whatsappFrom calculé:', whatsappFrom || 'NULL');
  
  if (!whatsappFrom) {
    console.error('[WhatsApp] ❌ Numéro WhatsApp Twilio non configuré');
    console.error('[WhatsApp] ❌ Définissez TWILIO_WHATSAPP_NUMBER dans votre .env (ex: whatsapp:+14155238886)');
    return false;
  }
  
  console.log('[WhatsApp] ✅ Numéro WhatsApp source configuré:', whatsappFrom);

  const formattedPhone = formatPhoneNumber(driverPhone);
  const whatsappTo = formattedPhone.startsWith('whatsapp:') 
    ? formattedPhone 
    : `whatsapp:${formattedPhone}`;

  // Commission fixe du livreur
  const DRIVER_COMMISSION = 2.5; // TND fixe

  // URL de l'application
  const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
  
  // Créer les liens uniques avec driverId si fourni
  let acceptUrl = `${appUrl}/accept/${orderId}`;
  let refuseUrl = `${appUrl}/refuse/${orderId}`;
  
  if (driverId) {
    // Si driverId fourni directement, l'utiliser
    acceptUrl = `${appUrl}/accept/${orderId}?driverId=${driverId}`;
    refuseUrl = `${appUrl}/refuse/${orderId}?driverId=${driverId}`;
    console.log('[WhatsApp] ✅ driverId fourni directement, liens créés avec driverId');
  } else {
    // Sinon, chercher le livreur par téléphone (fallback)
    try {
      const { storage } = await import("../storage.js");
      const cleanPhone = driverPhone.replace('whatsapp:', '').replace('+', '');
      console.log('[WhatsApp] 🔍 Recherche livreur par téléphone:', cleanPhone);
      const driver = await storage.getDriverByPhone(cleanPhone);
      if (driver) {
        acceptUrl = `${appUrl}/accept/${orderId}?driverId=${driver.id}`;
        refuseUrl = `${appUrl}/refuse/${orderId}?driverId=${driver.id}`;
        console.log('[WhatsApp] ✅ Livreur trouvé, liens créés avec driverId:', driver.id);
      } else {
        console.warn('[WhatsApp] ⚠️ Livreur non trouvé par téléphone, utilisation des liens génériques');
      }
    } catch (error) {
      console.error('[WhatsApp] ❌ Erreur recherche livreur:', error);
      console.warn('[WhatsApp] ⚠️ Utilisation des liens génériques (sans driverId)');
    }
  }

  // Message WhatsApp amélioré avec liens cliquables ET instructions texte
  const message = `🍕 *NOUVELLE COMMANDE*

🏪 *Resto:* ${restaurantName}
💰 *Gain:* +${DRIVER_COMMISSION.toFixed(2)} TND
📋 *Commande #${orderId.slice(0, 8)}*
👤 *Client:* ${customerName}
📍 *Adresse:* ${address}

⚡ *RÉPONDEZ RAPIDEMENT:*

✅ *ACCEPTER:*
${acceptUrl}

❌ *REFUSER:*
${refuseUrl}

*Ou tapez A pour accepter, R pour refuser*

⏱️ *Délai: 2 minutes*`;

  try {
    // Log final avant envoi pour diagnostic
    console.log('[WhatsApp] 📤 ENVOI MESSAGE - Valeurs finales:');
    console.log('[WhatsApp]   - from:', whatsappFrom);
    console.log('[WhatsApp]   - to:', whatsappTo);
    console.log('[WhatsApp]   - from type:', typeof whatsappFrom);
    console.log('[WhatsApp]   - to type:', typeof whatsappTo);
    
    // Utiliser body au lieu de ContentSid pour un message libre
    const result = await twilioClient.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappTo,
    });

    console.log(`[WhatsApp] ✅ Message WhatsApp envoyé à ${whatsappTo}: ${result.sid}`);
    return true;
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Erreur envoi WhatsApp à ${whatsappTo}:`, error.message);
    console.error(`[WhatsApp] Code erreur: ${error.code}`);
    
    if (error.code === 21211) {
      console.error(`[WhatsApp] ⚠️ Numéro invalide: ${whatsappTo}`);
    } else if (error.code === 21608) {
      console.error(`[WhatsApp] ⚠️ Numéro non autorisé. En mode Sandbox, ajoutez ce numéro dans Twilio Console.`);
    } else if (error.code === 63007) {
      console.error(`[WhatsApp] ⚠️ Template requis. Le livreur doit d'abord rejoindre le Sandbox.`);
      console.error(`[WhatsApp] 💡 Solution: Le livreur doit envoyer le code Sandbox à son numéro WhatsApp.`);
    } else if (error.code === 21610) {
      console.error(`[WhatsApp] ⚠️ Message non autorisé. Utilisez un template pour le premier message.`);
    } else if (error.code === 63038) {
      console.error(`[WhatsApp] ⚠️⚠️⚠️ LIMITE QUOTIDIENNE ATTEINTE ⚠️⚠️⚠️`);
      console.error(`[WhatsApp] ⚠️ Le compte Twilio a atteint la limite de 50 messages/jour (mode Trial)`);
      console.error(`[WhatsApp] 💡 Solutions:`);
      console.error(`[WhatsApp]    1. Attendre demain (limite réinitialisée à minuit UTC)`);
      console.error(`[WhatsApp]    2. Upgrader le compte Twilio pour plus de messages`);
      console.error(`[WhatsApp]    3. Optimisation: Envoi seulement au premier livreur (déjà fait)`);
    }
    
    return false;
  }
}

/**
 * Envoie des notifications WhatsApp à tous les livreurs disponibles pour une nouvelle commande
 * WhatsApp sonne toujours, même téléphone éteint
 * @param orderId ID de la commande
 * @param restaurantName Nom du restaurant
 * @param customerName Nom du client
 * @param totalPrice Prix total
 * @param address Adresse de livraison
 * @param maxDrivers Nombre maximum de livreurs à notifier
 */
export async function sendWhatsAppToDrivers(
  orderId: string,
  restaurantName: string,
  customerName: string,
  totalPrice: string,
  address: string,
  maxDrivers: number = 999
): Promise<number> {
  console.log("========================================");
  console.log("[WhatsApp] 📱📱📱 SEND WHATSAPP TO DRIVERS 📱📱📱");
  console.log("[WhatsApp] ⚡ FONCTION APPELÉE - DÉBUT DU PROCESSUS");
  console.log("[WhatsApp] Order ID:", orderId.slice(0, 8));
  console.log("[WhatsApp] Restaurant:", restaurantName);
  console.log("[WhatsApp] Client:", customerName);
  console.log("[WhatsApp] Adresse:", address);
  console.log("========================================");
  
  if (!twilioClient) {
    console.error('[WhatsApp] ❌ Twilio non configuré, WhatsApp non envoyé');
    console.error('[WhatsApp] ❌ Vérifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans .env');
    return 0;
  }
  
  console.log('[WhatsApp] ✅ Twilio client configuré');

  try {
    // PROMPT 3: ROUND ROBIN - Trier les livreurs par temps d'attente (plus ancien en premier)
    console.log('[WhatsApp] 🔍 Récupération de tous les livreurs...');
    const allDrivers = await storage.getAllDrivers();
    console.log(`[WhatsApp] 🔍 ${allDrivers.length} livreur(s) total dans la DB`);
    
    // LOGS DÉTAILLÉS POUR DIAGNOSTIC
    console.log(`[WhatsApp] 📋 DÉTAILS DE TOUS LES LIVREURS:`);
    allDrivers.forEach((driver, index) => {
      console.log(`[WhatsApp]   ${index + 1}. ${driver.name}`);
      console.log(`[WhatsApp]      - Téléphone: ${driver.phone}`);
      console.log(`[WhatsApp]      - Statut: ${driver.status || 'NON DÉFINI'}`);
      console.log(`[WhatsApp]      - ID: ${driver.id}`);
      console.log(`[WhatsApp]      - Last Seen: ${driver.lastSeen ? new Date(driver.lastSeen).toISOString() : 'JAMAIS'}`);
      console.log(`[WhatsApp]      - Disponible?: ${driver.status === 'available' ? '✅ OUI' : '❌ NON'}`);
    });
    
    // Vérification automatique : Corriger les livreurs en "on_delivery" sans commande en cours
    for (const driver of allDrivers) {
      if (driver.status === 'on_delivery') {
        const driverOrders = await storage.getOrdersByDriver(driver.id);
        const activeOrders = driverOrders.filter(o => 
          o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
        );
        
        if (activeOrders.length === 0) {
          console.log(`[WhatsApp] 🔧 CORRECTION AUTO: ${driver.name} est en "on_delivery" mais n'a pas de commande en cours`);
          console.log(`[WhatsApp] 🔧 Remise automatique en statut "available"`);
          await storage.updateDriver(driver.id, { status: 'available' });
          driver.status = 'available'; // Mettre à jour aussi dans la liste locale
        }
      }
    }
    
    // IMPORTANT: Inclure les livreurs "available" ET "on_delivery" qui peuvent encore accepter des commandes
    // Un livreur en "on_delivery" avec moins de 2 commandes actives peut recevoir une nouvelle commande
    const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
    
    // Vérifier tous les livreurs (available + on_delivery) et leurs commandes actives
    const driversWithOrderCheck = await Promise.all(
      allDrivers.map(async (driver) => {
        // Ne considérer que les livreurs "available" ou "on_delivery"
        if (driver.status !== 'available' && driver.status !== 'on_delivery') {
          return {
            driver,
            activeOrdersCount: 999, // Exclure les autres statuts
            canAcceptMore: false
          };
        }
        
        const driverOrders = await storage.getOrdersByDriver(driver.id);
        const activeOrders = driverOrders.filter(o => 
          o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
        );
        
        const canAcceptMore = activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER;
        
        console.log(`[WhatsApp] 📊 ${driver.name} (${driver.status}): ${activeOrders.length} commande(s) active(s) - ${canAcceptMore ? '✅ Peut accepter' : '❌ Limite atteinte'}`);
        
        return {
          driver,
          activeOrdersCount: activeOrders.length,
          canAcceptMore
        };
      })
    );
    
    // Filtrer uniquement les livreurs qui peuvent accepter plus de commandes
    const availableDriversWithOrderCheck = driversWithOrderCheck.filter(({ canAcceptMore }) => canAcceptMore);
    
    const trulyAvailableDrivers = availableDriversWithOrderCheck
      .map(({ driver }) => driver);
    
    const excludedDrivers = driversWithOrderCheck.filter(({ canAcceptMore }) => !canAcceptMore);
    if (excludedDrivers.length > 0) {
      console.log(`[WhatsApp] ⚠️ ${excludedDrivers.length} livreur(s) exclus (déjà ${MAX_ACTIVE_ORDERS_PER_DRIVER} commande(s) en cours ou statut incompatible):`);
      excludedDrivers.forEach(({ driver, activeOrdersCount }) => {
        console.log(`[WhatsApp]   - ${driver.name} (${driver.phone}) - Statut: ${driver.status} - ${activeOrdersCount} commande(s) active(s)`);
      });
    }
    
    if (trulyAvailableDrivers.length === 0) {
      console.log('[WhatsApp] ⚠️ Aucun livreur disponible (tous ont déjà 2 commandes en cours ou sont hors ligne)');
      return 0;
    }

    // Calculer le temps d'attente pour chaque livreur (basé sur sa dernière commande)
    const driversWithWaitTime = await Promise.all(
      trulyAvailableDrivers.map(async (driver) => {
        try {
          const driverOrders = await storage.getOrdersByDriver(driver.id);
          // Trouver la dernière commande assignée (livrée ou en cours)
          const lastOrder = driverOrders
            .filter(o => o.driverId === driver.id && (o.status === 'delivered' || o.status === 'delivery'))
            .sort((a, b) => {
              const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return dateB - dateA; // Plus récent en premier
            })[0];
          
          // Temps d'attente = temps depuis la dernière commande (ou depuis toujours si jamais de commande)
          const waitTime = lastOrder && lastOrder.assignedAt
            ? Date.now() - new Date(lastOrder.assignedAt).getTime()
            : Infinity; // Jamais de commande = priorité maximale
          
          return {
            ...driver,
            waitTime,
            lastOrderDate: lastOrder?.assignedAt || null
          };
        } catch (error) {
          console.error(`[WhatsApp] Erreur calcul temps attente pour ${driver.id}:`, error);
          return {
            ...driver,
            waitTime: Infinity, // En cas d'erreur, priorité maximale
            lastOrderDate: null
          };
        }
      })
    );

    // Trier par temps d'attente (plus ancien = plus grand waitTime = en premier)
    driversWithWaitTime.sort((a, b) => b.waitTime - a.waitTime);

    console.log('[WhatsApp] 📊 Livreurs triés par temps d\'attente (Round Robin):');
    driversWithWaitTime.forEach((driver, index) => {
      const waitMinutes = driver.waitTime === Infinity 
        ? 'Jamais' 
        : Math.floor(driver.waitTime / 60000);
      console.log(`[WhatsApp]   ${index + 1}. ${driver.name} (${driver.phone}) - Attente: ${waitMinutes} min`);
    });

    // PROMPT 3: Envoyer WhatsApp UNIQUEMENT au premier livreur de la file
    const firstDriver = driversWithWaitTime[0];
    
    if (!firstDriver) {
      console.log('[WhatsApp] ⚠️ Aucun livreur à notifier');
      return 0;
    }

    // Créer/initialiser la file d'attente pour cette commande
    const { orderDriverQueues } = await import('../websocket.js');
    if (!orderDriverQueues.has(orderId)) {
      orderDriverQueues.set(orderId, []);
    }
    const queue = orderDriverQueues.get(orderId)!;
    
    // Ajouter le livreur à la file avec timestamp
    queue.push({
      driverId: firstDriver.id,
      notifiedAt: new Date()
    });
    
    console.log(`[WhatsApp] 📤 Envoi WhatsApp au premier livreur de la file: ${firstDriver.name} (${firstDriver.phone})`);
    console.log(`[WhatsApp] 📋 File d'attente: ${queue.length} livreur(s) notifié(s)`);

    // Envoyer WhatsApp au premier livreur avec driverId directement
    const result = await sendWhatsAppToDriver(
      firstDriver.phone,
      orderId,
      customerName,
      totalPrice,
      address,
      restaurantName,
      firstDriver.id  // Passer driverId directement
    );

    if (result) {
      console.log(`[WhatsApp] ✅ Message envoyé à ${firstDriver.name}`);
      
      // Démarrer le timer de 2 minutes pour cette commande
      const { startRoundRobinTimer } = await import('../websocket.js');
      startRoundRobinTimer(orderId, restaurantName, customerName, totalPrice, address);
      
      // ENVOI TELEGRAM (en parallèle avec WhatsApp)
      try {
        console.log("[Telegram] 📞 Envoi notification Telegram pour commande:", orderId);
        const telegramCount = await telegramService.sendToAllAvailableDrivers(
          orderId,
          restaurantName,
          customerName,
          totalPrice,
          address
        );
        console.log(`[Telegram] 📱 ${telegramCount} notification(s) Telegram envoyée(s)`);
      } catch (telegramError: any) {
        console.error('[Telegram] ❌ Erreur envoi Telegram:', telegramError);
        // Ne pas bloquer si Telegram échoue
      }
      
      return 1;
    } else {
      console.log(`[WhatsApp] ❌ Échec envoi à ${firstDriver.name}, passage au suivant...`);
      // En cas d'échec, passer au suivant immédiatement
      return await notifyNextDriverInQueue(orderId, restaurantName, customerName, totalPrice, address);
    }
  } catch (error: any) {
    console.error('[WhatsApp] ❌ Erreur lors de l\'envoi des messages WhatsApp:', error);
    return 0;
  }
}

/**
 * PROMPT 3: Notifie le livreur suivant dans la file d'attente Round Robin
 * Appelé après timeout (2 min) ou refus du livreur précédent
 */
export async function notifyNextDriverInQueue(
  orderId: string,
  restaurantName: string,
  customerName: string,
  totalPrice: string,
  address: string
): Promise<number> {
  console.log(`[Round Robin] 🔄 Recherche du livreur suivant pour commande ${orderId}`);
  
  try {
    // Récupérer la file d'attente pour cette commande
    const { orderDriverQueues } = await import('../websocket.js');
    const queue = orderDriverQueues.get(orderId);
    
    if (!queue || queue.length === 0) {
      console.log(`[Round Robin] ⚠️ Aucune file d'attente pour commande ${orderId}`);
      return 0;
    }

    // Récupérer tous les livreurs disponibles
    const allDrivers = await storage.getAllDrivers();
    
    // Vérification automatique : Corriger les livreurs en "on_delivery" sans commande en cours
    for (const driver of allDrivers) {
      if (driver.status === 'on_delivery') {
        const driverOrders = await storage.getOrdersByDriver(driver.id);
        const activeOrders = driverOrders.filter(o => 
          o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
        );
        
        if (activeOrders.length === 0) {
          console.log(`[Round Robin] 🔧 CORRECTION AUTO: ${driver.name} est en "on_delivery" mais n'a pas de commande en cours`);
          await storage.updateDriver(driver.id, { status: 'available' });
          driver.status = 'available';
        }
      }
    }
    
    const availableDriversWithActiveStatus = allDrivers.filter(driver => 
      driver.status === 'available'
    );

    // PROMPT: Limiter à 2 commandes maximum par livreur - Vérifier les commandes actives
    const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
    const availableDriversWithOrderCheck = await Promise.all(
      availableDriversWithActiveStatus.map(async (driver) => {
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
    
    const trulyAvailableDrivers = availableDriversWithOrderCheck
      .filter(({ canAcceptMore }) => canAcceptMore)
      .map(({ driver }) => driver);

    if (trulyAvailableDrivers.length === 0) {
      console.log(`[Round Robin] ⚠️ Aucun livreur disponible (tous ont déjà ${MAX_ACTIVE_ORDERS_PER_DRIVER} commande(s) en cours)`);
      return 0;
    }

    // Calculer le temps d'attente pour chaque livreur disponible
    const driversWithWaitTime = await Promise.all(
      trulyAvailableDrivers.map(async (driver) => {
        try {
          const driverOrders = await storage.getOrdersByDriver(driver.id);
          const lastOrder = driverOrders
            .filter(o => o.driverId === driver.id && (o.status === 'delivered' || o.status === 'delivery'))
            .sort((a, b) => {
              const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return dateB - dateA;
            })[0];
          
          const waitTime = lastOrder && lastOrder.assignedAt
            ? Date.now() - new Date(lastOrder.assignedAt).getTime()
            : Infinity;
          
          return {
            ...driver,
            waitTime,
            lastOrderDate: lastOrder?.assignedAt || null
          };
        } catch (error) {
          return {
            ...driver,
            waitTime: Infinity,
            lastOrderDate: null
          };
        }
      })
    );

    // ✅ NOUVEAU : Récupérer la liste des livreurs qui ont refusé (ignoredBy)
    // Gère le cas où la colonne ignored_by n'existe pas encore en base de données
    let ignoredDriverIds: string[] = [];
    try {
      const order = await storage.getOrderById(orderId);
      if (order?.ignoredBy) {
        try {
          ignoredDriverIds = JSON.parse(order.ignoredBy);
        } catch (e) {
          // Si le JSON est invalide, on ignore
          ignoredDriverIds = [];
        }
      }
    } catch (error: any) {
      // Si l'erreur est liée à la colonne manquante, on continue avec une liste vide
      if (error?.message?.includes('ignored_by') || error?.message?.includes('column') || error?.code === '42703') {
        console.log(`[Round Robin] ⚠️ Colonne ignored_by n'existe pas encore. Migration nécessaire. Continuation sans exclusion.`);
        ignoredDriverIds = [];
      } else {
        // Autre erreur, on log mais on continue
        console.error(`[Round Robin] ⚠️ Erreur récupération ignoredBy (non-bloquant):`, error);
        ignoredDriverIds = [];
      }
    }

    // Trier par temps d'attente
    driversWithWaitTime.sort((a, b) => b.waitTime - a.waitTime);

    // ✅ MODIFIÉ : Trouver le prochain livreur qui :
    // 1. N'a pas encore été notifié (pas dans la file)
    // 2. N'a pas refusé la commande (pas dans ignoredBy)
    const notifiedDriverIds = new Set(queue.map(item => item.driverId));
    const ignoredDriverIdsSet = new Set(ignoredDriverIds);
    const nextDriver = driversWithWaitTime.find(driver => 
      !notifiedDriverIds.has(driver.id) && !ignoredDriverIdsSet.has(driver.id)
    );

    if (!nextDriver) {
      console.log(`[Round Robin] ⚠️ Tous les livreurs disponibles ont déjà été notifiés pour commande ${orderId}`);
      // Tous les livreurs ont été notifiés, nettoyer la file
      orderDriverQueues.delete(orderId);
      return 0;
    }

    // Ajouter le livreur à la file
    queue.push({
      driverId: nextDriver.id,
      notifiedAt: new Date()
    });

    console.log(`[Round Robin] 📤 Notification du livreur suivant: ${nextDriver.name} (${nextDriver.phone})`);

    // Envoyer WhatsApp au livreur suivant avec driverId directement
    const result = await sendWhatsAppToDriver(
      nextDriver.phone,
      orderId,
      customerName,
      totalPrice,
      address,
      restaurantName,
      nextDriver.id  // Passer driverId directement
    );

    if (result) {
      console.log(`[Round Robin] ✅ Message envoyé à ${nextDriver.name}`);
      
      // Redémarrer le timer de 2 minutes
      const { startRoundRobinTimer } = await import('../websocket.js');
      await startRoundRobinTimer(orderId, restaurantName, customerName, totalPrice, address);
      
      return 1;
    } else {
      console.log(`[Round Robin] ❌ Échec envoi à ${nextDriver.name}, passage au suivant...`);
      // En cas d'échec, passer au suivant récursivement
      return await notifyNextDriverInQueue(orderId, restaurantName, customerName, totalPrice, address);
    }
  } catch (error: any) {
    console.error('[Round Robin] ❌ Erreur:', error);
    return 0;
  }
}

