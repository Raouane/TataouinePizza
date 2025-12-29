import type { Express, Request, Response } from "express";
import { storage } from "../storage.js";
import { OrderAcceptanceService } from "../services/order-acceptance-service.js";
import { OrderService } from "../services/order-service.js";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

/**
 * Formate un numéro de téléphone au format international
 */
function formatPhoneNumber(phone: string): string {
  if (phone.startsWith('+')) {
    return phone;
  }
  if (phone.startsWith('216')) {
    return `+${phone}`;
  }
  return `+216${phone}`;
}

/**
 * Envoie un message WhatsApp de confirmation
 */
async function sendWhatsAppConfirmation(
  driverPhone: string,
  message: string
): Promise<void> {
  if (!twilioClient || !twilioWhatsAppNumber) {
    console.warn('[WhatsApp] ⚠️ Twilio non configuré, confirmation non envoyée');
    return;
  }

  const formattedPhone = formatPhoneNumber(driverPhone);
  const whatsappTo = formattedPhone.startsWith('whatsapp:') 
    ? formattedPhone 
    : `whatsapp:${formattedPhone}`;
  const whatsappFrom = twilioWhatsAppNumber.startsWith('whatsapp:')
    ? twilioWhatsAppNumber
    : `whatsapp:${twilioWhatsAppNumber}`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappTo,
    });
    console.log(`[WhatsApp] ✅ Confirmation envoyée à ${whatsappTo}`);
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Erreur envoi confirmation:`, error.message);
  }
}

export function registerWhatsAppWebhookRoutes(app: Express): void {
  // Webhook pour recevoir les réponses WhatsApp des livreurs
  app.post("/api/webhook/whatsapp", async (req: Request, res: Response) => {
    try {
      const { From, Body, MessageSid } = req.body;
      
      console.log("========================================");
      console.log("[WhatsApp Webhook] 📨 MESSAGE REÇU");
      console.log("[WhatsApp Webhook] De:", From);
      console.log("[WhatsApp Webhook] Corps:", Body);
      console.log("[WhatsApp Webhook] MessageSid:", MessageSid);
      console.log("========================================");

      // Extraire le numéro de téléphone (format: whatsapp:+33783698509)
      const phone = From?.replace("whatsapp:", "") || From;
      if (!phone) {
        console.error("[WhatsApp Webhook] ❌ Numéro manquant");
        return res.status(400).send("Numéro manquant");
      }

      // Trouver le livreur par son numéro
      const driver = await storage.getDriverByPhone(phone);
      if (!driver) {
        console.error(`[WhatsApp Webhook] ❌ Livreur non trouvé: ${phone}`);
        return res.status(404).send("Livreur non trouvé");
      }

      console.log(`[WhatsApp Webhook] ✅ Livreur trouvé: ${driver.name} (${driver.phone})`);

      // Normaliser la réponse (majuscules, sans espaces)
      const response = Body?.trim().toUpperCase();

      // Chercher la dernière commande "accepted" sans livreur assigné
      const allOrders = await storage.getAllOrders();
      const pendingOrder = allOrders
        .filter(o => o.status === "accepted" && !o.driverId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!pendingOrder) {
        console.log("[WhatsApp Webhook] ⚠️ Aucune commande en attente");
        await sendWhatsAppConfirmation(
          driver.phone,
          "❌ Aucune commande en attente pour le moment."
        );
        return res.status(200).send("Aucune commande en attente");
      }

      console.log(`[WhatsApp Webhook] 🔍 Commande en attente trouvée: ${pendingOrder.id}`);

      if (response === "A" || response === "ACCEPTER") {
        // Accepter la commande
        console.log(`[WhatsApp Webhook] ✅ Livreur ${driver.name} accepte la commande ${pendingOrder.id}`);
        
        const acceptedOrder = await OrderAcceptanceService.acceptOrder(
          pendingOrder.id,
          driver.id
        );

        if (acceptedOrder) {
          // Mettre le livreur en statut "on_delivery" (OCCUPÉ)
          await storage.updateDriver(driver.id, { status: "on_delivery" });

          // Enrichir la commande avec les détails du restaurant
          const { OrderEnrichmentService } = await import("../services/order-enrichment-service.js");
          const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(acceptedOrder);

          // Mettre à jour le statut à "delivery"
          await OrderService.updateStatus(
            pendingOrder.id,
            "delivery",
            { type: "driver", id: driver.id }
          );

          // URL de l'espace livreur
          const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
          const driverDashboardUrl = `${appUrl}/driver/dashboard?order=${pendingOrder.id}&accepted=true`;

          // Envoyer une confirmation WhatsApp avec toutes les infos et le lien
          await sendWhatsAppConfirmation(
            driver.phone,
            `✅ *Commande acceptée !*\n\n` +
            `📋 Commande #${pendingOrder.id.slice(0, 8)}\n` +
            `💰 Gain: +2.50 TND\n` +
            `🏪 Restaurant: ${enrichedOrder.restaurantName || 'Restaurant'}\n` +
            `👤 Client: ${pendingOrder.customerName}\n` +
            `📍 Adresse: ${pendingOrder.address}\n` +
            (pendingOrder.customerLat && pendingOrder.customerLng 
              ? `🗺️ GPS: ${pendingOrder.customerLat}, ${pendingOrder.customerLng}\n`
              : '') +
            `\n🔗 *Ouvrez votre espace livreur:*\n${driverDashboardUrl}\n\n` +
            `Toutes les informations sont disponibles dans l'application.`
          );

          console.log(`[WhatsApp Webhook] ✅ Commande ${pendingOrder.id} acceptée par ${driver.name}`);
          return res.status(200).send("Commande acceptée");
        } else {
          await sendWhatsAppConfirmation(
            driver.phone,
            `❌ Cette commande a déjà été prise par un autre livreur.`
          );
          return res.status(400).send("Commande déjà prise");
        }
      } else if (response === "R" || response === "REFUSER") {
        // PROMPT 3: Refuser la commande - Passer au livreur suivant dans la file
        console.log(`[WhatsApp Webhook] ❌ Livreur ${driver.name} refuse la commande ${pendingOrder.id}`);
        
        // Enrichir la commande pour obtenir les infos nécessaires
        const { OrderEnrichmentService } = await import("../services/order-enrichment-service.js");
        const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(pendingOrder);
        
        await sendWhatsAppConfirmation(
          driver.phone,
          `❌ *Commande refusée*\n\n` +
          `La commande sera proposée à un autre livreur.`
        );

        // Passer au livreur suivant dans la file Round Robin
        const { notifyNextDriverInQueue } = await import("../services/sms-service.js");
        await notifyNextDriverInQueue(
          pendingOrder.id,
          enrichedOrder.restaurantName || "Restaurant",
          pendingOrder.customerName,
          pendingOrder.totalPrice.toString(),
          pendingOrder.address
        );

        return res.status(200).send("Commande refusée");
      } else {
        // Réponse non reconnue
        console.log(`[WhatsApp Webhook] ⚠️ Réponse non reconnue: ${response}`);
        await sendWhatsAppConfirmation(
          driver.phone,
          `⚠️ *Réponse non reconnue*\n\n` +
          `Tapez *A* pour accepter ou *R* pour refuser.`
        );
        return res.status(200).send("Réponse non reconnue");
      }
    } catch (error: any) {
      console.error("[WhatsApp Webhook] ❌ Erreur:", error);
      console.error("[WhatsApp Webhook] ❌ Stack:", error.stack);
      return res.status(500).send("Erreur serveur");
    }
  });
}

