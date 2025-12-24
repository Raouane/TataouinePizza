/**
 * Service centralisé pour les webhooks n8n
 * Évite la duplication de la fonction sendN8nWebhook
 */

/**
 * Envoie un webhook à n8n
 * @param event Nom de l'événement (ex: "order-ready", "order-picked-up")
 * @param data Données à envoyer
 */
export async function sendN8nWebhook(event: string, data: any): Promise<void> {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nWebhookUrl) {
    console.log(`[N8N] Webhook URL non configurée, skip event: ${event}`);
    return;
  }

  const webhookUrl = `${n8nWebhookUrl}/${event}`;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-n8n-token": process.env.N8N_WEBHOOK_TOKEN || "",
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });
    console.log(`[N8N] Webhook ${event} envoyé avec succès`);
  } catch (error: any) {
    console.error(`[N8N] Erreur envoi webhook ${event}:`, error.message);
    // Ne pas bloquer le flux si le webhook échoue
  }
}

