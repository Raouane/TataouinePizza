import type { Express, Request, Response } from "express";
import { errorHandler } from "../errors";
import { z } from "zod";

// Schéma de validation pour l'initialisation d'un paiement Flouci
const initFlouciPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  success_link: z.string().url("Success link must be a valid URL"),
  fail_link: z.string().url("Fail link must be a valid URL"),
  developer_tracking_id: z.string().optional(),
});

/**
 * Vérifie la configuration Flouci
 * 
 * IMPORTANT : Les clés Flouci doivent être définies dans :
 * - FLOUCI_APP_TOKEN (clé publique)
 * - FLOUCI_APP_SECRET (clé secrète)
 * 
 * Ne JAMAIS exposer ces clés côté client !
 */
function getFlouciConfig() {
  const appToken = process.env.FLOUCI_APP_TOKEN;
  const appSecret = process.env.FLOUCI_APP_SECRET;

  if (!appToken || !appSecret) {
    throw new Error(
      "FLOUCI_APP_TOKEN and FLOUCI_APP_SECRET must be defined in environment variables. " +
      "Please add them to your .env file."
    );
  }

  return {
    appToken,
    appSecret,
    apiUrl: "https://developers.flouci.com/api/v2/generate_payment",
  };
}

/**
 * Convertit un montant en Dinars Tunisiens (TND) en millimes
 * Flouci attend les montants en millimes (1 TND = 1000 millimes)
 * 
 * @param amountTND Montant en Dinars Tunisiens
 * @returns Montant en millimes
 */
function convertTNDToMillimes(amountTND: number): number {
  return Math.round(amountTND * 1000);
}

/**
 * Génère un paiement Flouci
 * 
 * @param amountMillimes Montant en millimes
 * @param successLink URL de redirection en cas de succès
 * @param failLink URL de redirection en cas d'échec
 * @param developerTrackingId ID de suivi optionnel
 * @returns Réponse de l'API Flouci avec payment_id et link
 */
async function generateFlouciPayment(
  amountMillimes: number,
  successLink: string,
  failLink: string,
  developerTrackingId?: string
): Promise<{ payment_id: string; link: string }> {
  const config = getFlouciConfig();

  const requestBody: any = {
    amount: amountMillimes,
    success_link: successLink,
    fail_link: failLink,
    accept_card: true, // Accepter les paiements par carte
  };

  // Ajouter le tracking ID si fourni
  if (developerTrackingId) {
    requestBody.developer_tracking_id = developerTrackingId;
  }

  // Appel à l'API Flouci
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.appToken}:${config.appSecret}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[FLOUCI] ❌ Erreur API Flouci:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(
      `Flouci API error: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  const data = await response.json();

  // Vérifier la structure de la réponse
  if (!data.result || !data.result.success || !data.result.payment_id || !data.result.link) {
    console.error("[FLOUCI] ❌ Réponse invalide de l'API Flouci:", data);
    throw new Error("Invalid response from Flouci API");
  }

  return {
    payment_id: data.result.payment_id,
    link: data.result.link,
  };
}

/**
 * Enregistre les routes Flouci
 */
export function registerFlouciRoutes(app: Express): void {
  /**
   * POST /api/payments/flouci/init
   * 
   * Initialise un paiement Flouci
   * 
   * Body:
   * - amount: number (montant en TND)
   * - success_link: string (URL de redirection en cas de succès)
   * - fail_link: string (URL de redirection en cas d'échec)
   * - developer_tracking_id: string (optionnel, ID de suivi)
   * 
   * Response:
   * - payment_id: string (ID du paiement Flouci)
   * - link: string (URL de redirection vers Flouci)
   * - amount_millimes: number (montant converti en millimes)
   */
  app.post("/api/payments/flouci/init", async (req: Request, res: Response) => {
    try {
      // Vérifier la configuration Flouci d'abord
      let config;
      try {
        config = getFlouciConfig();
      } catch (configError: any) {
        console.error("[FLOUCI] ❌ Configuration manquante:", configError.message);
        return res.status(503).json({
          success: false,
          error: "Paiement par carte non disponible",
          message: "Le paiement par carte n'est pas encore disponible. Veuillez utiliser une autre méthode de paiement.",
          code: "PAYMENT_NOT_AVAILABLE",
        });
      }

      // Valider les données d'entrée
      const validation = initFlouciPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.errors,
        });
      }

      const { amount, success_link, fail_link, developer_tracking_id } = validation.data;

      // Convertir le montant en millimes
      const amountMillimes = convertTNDToMillimes(amount);

      console.log("[FLOUCI] 💳 Initialisation paiement:", {
        amountTND: amount,
        amountMillimes,
        success_link,
        fail_link,
        developer_tracking_id,
      });

      // Générer le paiement Flouci
      const payment = await generateFlouciPayment(
        amountMillimes,
        success_link,
        fail_link,
        developer_tracking_id
      );

      console.log("[FLOUCI] ✅ Paiement généré:", {
        payment_id: payment.payment_id,
        link: payment.link,
      });

      // Retourner les informations de paiement
      res.json({
        success: true,
        payment_id: payment.payment_id,
        link: payment.link,
        amount_tnd: amount,
        amount_millimes: amountMillimes,
      });
    } catch (error: any) {
      console.error("[FLOUCI] ❌ Erreur initialisation paiement:", error);
      errorHandler.sendError(res, error);
    }
  });

  /**
   * GET /api/payments/flouci/verify/:payment_id
   * 
   * Vérifie le statut d'un paiement Flouci
   * 
   * Response:
   * - success: boolean
   * - status: "SUCCESS" | "PENDING" | "EXPIRED" | "FAILURE"
   * - amount: number (montant en millimes)
   * - created_at: string (date de création)
   */
  app.get("/api/payments/flouci/verify/:payment_id", async (req: Request, res: Response) => {
    try {
      const { payment_id } = req.params;

      if (!payment_id) {
        return res.status(400).json({
          error: "Invalid request",
          details: "payment_id is required",
        });
      }

      // Vérifier la configuration Flouci d'abord
      let config;
      try {
        config = getFlouciConfig();
      } catch (configError: any) {
        console.error("[FLOUCI] ❌ Configuration manquante:", configError.message);
        return res.status(503).json({
          error: "Flouci payment service is not configured",
          message: "FLOUCI_APP_TOKEN and FLOUCI_APP_SECRET must be set in environment variables",
          code: "SERVICE_UNAVAILABLE",
        });
      }

      console.log("[FLOUCI] 🔍 Vérification paiement:", { payment_id });

      // Appeler l'API Flouci pour vérifier le paiement
      const response = await fetch(
        `https://developers.flouci.com/api/v2/verify_payment/${payment_id}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.appToken}:${config.appSecret}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[FLOUCI] ❌ Erreur vérification paiement:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Flouci API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();

      // Vérifier la structure de la réponse
      if (!data.result) {
        console.error("[FLOUCI] ❌ Réponse invalide de l'API Flouci:", data);
        throw new Error("Invalid response from Flouci API");
      }

      const { status, amount, created_at } = data.result;

      console.log("[FLOUCI] ✅ Statut paiement vérifié:", {
        payment_id,
        status,
        amount,
      });

      // Retourner le statut du paiement
      res.json({
        success: data.result.success !== false,
        status: status || "UNKNOWN",
        amount: amount || null,
        amount_tnd: amount ? amount / 1000 : null, // Convertir millimes en TND
        created_at: created_at || null,
      });
    } catch (error: any) {
      console.error("[FLOUCI] ❌ Erreur vérification paiement:", error);
      errorHandler.sendError(res, error);
    }
  });

  // Vérifier la configuration au démarrage
  try {
    getFlouciConfig();
    console.log("[FLOUCI] ✅ Configuration Flouci chargée");
  } catch (error: any) {
    console.warn("[FLOUCI] ⚠️ Configuration Flouci manquante:", error.message);
    console.warn("[FLOUCI] ⚠️ Les routes Flouci ne fonctionneront pas sans FLOUCI_APP_TOKEN et FLOUCI_APP_SECRET");
  }
}
