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
  maxDrivers: number = 999 // Par défaut, tous les livreurs
) {
  if (!twilioClient) {
    console.warn('[SMS] ⚠️ Twilio non configuré, SMS non envoyé');
    return;
  }

  try {
    const message = `🔔 Nouvelle commande disponible!\nRestaurant: ${restaurantName}\nClient: ${customerName}\nTotal: ${totalPrice} TND\nID: ${orderId.slice(0, 8)}`;

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

