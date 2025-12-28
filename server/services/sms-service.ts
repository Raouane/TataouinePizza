import twilio from 'twilio';
import { storage } from '../storage.js';

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
 */
export async function sendOtpSms(
  phone: string,
  code: string,
  userType: "driver" | "restaurant" = "driver"
): Promise<void> {
  if (!twilioClient) {
    console.warn('[SMS OTP] ⚠️ Twilio non configuré, SMS OTP non envoyé');
    return;
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
      return;
    }

    // En production, envoyer au numéro réel du livreur/restaurant
    console.log(`[SMS OTP] Envoi OTP à ${formattedPhone} (${userLabel})`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber!,
      to: formattedPhone,
    });

    console.log(`[SMS OTP] ✅ SMS OTP envoyé à ${formattedPhone}: ${result.sid}`);
  } catch (error: any) {
    console.error(`[SMS OTP] ❌ Erreur envoi SMS OTP à ${formattedPhone}:`, error.message);
    if (error.code === 21211) {
      console.error(`[SMS OTP] ⚠️ Numéro invalide: ${formattedPhone}`);
    }
    // Ne pas throw l'erreur pour ne pas bloquer le processus si SMS échoue
    // Le code OTP est quand même stocké en base et peut être utilisé
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
  restaurantName: string
): Promise<boolean> {
  if (!twilioClient) {
    console.warn('[WhatsApp] ⚠️ Twilio non configuré, WhatsApp non envoyé');
    return false;
  }

  const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || (twilioPhoneNumber ? `whatsapp:${twilioPhoneNumber}` : null);
  
  if (!whatsappFrom) {
    console.error('[WhatsApp] ❌ Numéro WhatsApp Twilio non configuré (TWILIO_WHATSAPP_NUMBER)');
    return false;
  }

  const formattedPhone = formatPhoneNumber(driverPhone);
  const whatsappTo = formattedPhone.startsWith('whatsapp:') 
    ? formattedPhone 
    : `whatsapp:${formattedPhone}`;

  // Message WhatsApp amélioré avec instructions simples
  const message = `╔═══════════════════════════╗
║  🍕 NOUVELLE COMMANDE 🍕  ║
╚═══════════════════════════╝

📋 *Commande #${orderId.slice(0, 8)}*
💰 *Montant:* ${totalPrice} DT

━━━━━━━━━━━━━━━━━━━━━━━━
🏪 *RESTAURANT*
${restaurantName}

👤 *CLIENT*
${customerName}

📍 *ADRESSE*
${address}
━━━━━━━━━━━━━━━━━━━━━━━━

⚡ *RÉPONDEZ RAPIDEMENT:*

✅ Tapez *A* pour ACCEPTER
❌ Tapez *R* pour REFUSER

⏱️ *Délai: 20 secondes*`;

  try {
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
  console.log("[WhatsApp] Order ID:", orderId.slice(0, 8));
  console.log("[WhatsApp] Restaurant:", restaurantName);
  console.log("[WhatsApp] Client:", customerName);
  console.log("========================================");
  
  if (!twilioClient) {
    console.error('[WhatsApp] ❌ Twilio non configuré, WhatsApp non envoyé');
    return 0;
  }

  try {
    // Pour WhatsApp, on envoie à TOUS les livreurs avec statut 'available' ou 'online'
    // même s'ils ne sont pas connectés (c'est le but de WhatsApp : notifier même app fermée)
    console.log('[WhatsApp] 🔍 Récupération de tous les livreurs...');
    const allDrivers = await storage.getAllDrivers();
    console.log(`[WhatsApp] 🔍 ${allDrivers.length} livreur(s) total dans la DB`);
    
    const availableDrivers = allDrivers.filter(driver => 
      driver.status === 'available'
    );
    
    console.log(`[WhatsApp] 🔍 ${availableDrivers.length} livreur(s) avec statut available`);
    availableDrivers.forEach(driver => {
      console.log(`[WhatsApp] 🔍 - ${driver.name} (${driver.phone}) - statut: ${driver.status}`);
    });
    
    if (availableDrivers.length === 0) {
      console.log('[WhatsApp] ⚠️ Aucun livreur disponible (statut available/online)');
      return 0;
    }

    // OPTIMISATION: Envoyer seulement à Raouane (+33783698509) pour économiser les messages
    // (Limite Twilio: 50 messages/jour en mode Trial)
    const targetPhone = "+33783698509";
    const driversToNotify = availableDrivers.filter(driver => driver.phone === targetPhone);

    if (driversToNotify.length === 0) {
      console.log(`[WhatsApp] ⚠️ Raouane (${targetPhone}) n'est pas disponible`);
      console.log(`[WhatsApp] 💡 Livreurs disponibles: ${availableDrivers.map(d => d.name).join(', ')}`);
      return 0;
    }

    console.log(`[WhatsApp] 📤 Envoi WhatsApp uniquement à Raouane (${targetPhone}) sur ${availableDrivers.length} disponible(s)`);
    console.log(`[WhatsApp] 💡 Optimisation: 1 seul message pour économiser la limite Twilio (50/jour)`);

    // Envoyer WhatsApp à chaque livreur (en parallèle, non-bloquant)
    const results = await Promise.allSettled(
      driversToNotify.map(driver => 
        sendWhatsAppToDriver(
          driver.phone,
          orderId,
          customerName,
          totalPrice,
          address,
          restaurantName
        )
      )
    );

    // Compter les succès
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failureCount = results.length - successCount;

    console.log(`[WhatsApp] 📊 Messages envoyés: ${successCount} succès, ${failureCount} échecs sur ${driversToNotify.length} livreurs`);
    
    return successCount;
  } catch (error: any) {
    console.error('[WhatsApp] ❌ Erreur lors de l\'envoi des messages WhatsApp:', error);
    return 0;
  }
}

