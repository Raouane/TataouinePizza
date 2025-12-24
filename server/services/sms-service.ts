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
      const isAvailable = driver.status === 'available' || driver.status === 'online';
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

