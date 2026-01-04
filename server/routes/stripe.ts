import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { errorHandler } from "../errors";
import { z } from "zod";

// Schéma de validation pour la création d'un SetupIntent
const createSetupIntentSchema = z.object({
  customerPhone: z.string().min(8, "Phone number must be at least 8 characters"),
});

/**
 * Initialise Stripe avec la clé secrète
 * 
 * IMPORTANT : La clé secrète Stripe doit être définie dans STRIPE_SECRET_KEY
 * dans votre fichier .env
 * 
 * Ne JAMAIS exposer cette clé côté client !
 */
function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not defined in environment variables. " +
      "Please add STRIPE_SECRET_KEY=sk_test_... to your .env file."
    );
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia",
  });
}

/**
 * Récupère ou crée un Customer Stripe pour un utilisateur
 * 
 * @param stripe Instance Stripe
 * @param customerPhone Numéro de téléphone du client
 * @returns Customer Stripe ID
 */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  customerPhone: string
): Promise<string> {
  // Normaliser le numéro de téléphone
  const normalizedPhone = customerPhone.replace(/\s+/g, "").replace(/^\+/, "");

  // Récupérer le client depuis notre base de données
  let customer = await storage.getCustomerByPhone(normalizedPhone);

  if (!customer) {
    // Si le client n'existe pas dans notre DB, on peut le créer
    // ou retourner une erreur selon votre logique métier
    throw new Error(`Customer with phone ${normalizedPhone} not found. Please complete your profile first.`);
  }

  // Vérifier si le client a déjà un Stripe Customer ID stocké
  // Pour l'instant, on va créer un nouveau customer Stripe à chaque fois
  // TODO: Stocker le stripeCustomerId dans la table customers pour éviter les doublons

  // Créer un Customer Stripe
  const stripeCustomer = await stripe.customers.create({
    phone: normalizedPhone,
    metadata: {
      customerId: customer.id,
      customerPhone: normalizedPhone,
    },
  });

  // TODO: Sauvegarder stripeCustomer.id dans la table customers
  // await storage.updateCustomer(customer.id, { stripeCustomerId: stripeCustomer.id });

  return stripeCustomer.id;
}

export function registerStripeRoutes(app: Express): void {
  /**
   * POST /api/stripe/create-setup-intent
   * 
   * Crée un SetupIntent Stripe pour enregistrer une méthode de paiement
   * 
   * Body:
   * {
   *   "customerPhone": "21612345678"
   * }
   * 
   * Response:
   * {
   *   "clientSecret": "seti_xxx_secret_xxx"
   * }
   */
  app.post("/api/stripe/create-setup-intent", async (req: Request, res: Response) => {
    try {
      // Validation des données
      const validation = createSetupIntentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: process.env.NODE_ENV === "development" 
            ? validation.error.errors 
            : "customerPhone is required and must be at least 8 characters",
        });
      }

      const { customerPhone } = validation.data;

      // Initialiser Stripe
      const stripe = getStripeInstance();

      // Récupérer ou créer le Customer Stripe
      const stripeCustomerId = await getOrCreateStripeCustomer(stripe, customerPhone);

      // Créer le SetupIntent
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        usage: "off_session", // La carte sera utilisée pour des paiements futurs
      });

      console.log(`[STRIPE] SetupIntent créé pour ${customerPhone}: ${setupIntent.id}`);

      // Retourner le client_secret (nécessaire côté frontend)
      res.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    } catch (error: any) {
      console.error("[STRIPE] Erreur lors de la création du SetupIntent:", error);
      errorHandler.sendError(res, error);
    }
  });

  /**
   * POST /api/stripe/get-payment-methods
   * 
   * Récupère les détails des méthodes de paiement depuis Stripe
   * 
   * Body:
   * {
   *   "paymentMethodIds": ["pm_xxx", "pm_yyy"]
   * }
   * 
   * Response:
   * {
   *   "paymentMethods": [
   *     {
   *       "id": "pm_xxx",
   *       "type": "card",
   *       "card": {
   *         "brand": "visa",
   *         "last4": "4242",
   *         "exp_month": 12,
   *         "exp_year": 2025
   *       }
   *     }
   *   ]
   * }
   */
  app.post("/api/stripe/get-payment-methods", async (req: Request, res: Response) => {
    try {
      const { paymentMethodIds } = req.body;

      if (!Array.isArray(paymentMethodIds) || paymentMethodIds.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          details: "paymentMethodIds must be a non-empty array",
        });
      }

      // Initialiser Stripe
      const stripe = getStripeInstance();

      // Récupérer les détails de chaque payment method
      const paymentMethods = await Promise.all(
        paymentMethodIds.map(async (pmId: string) => {
          try {
            const pm = await stripe.paymentMethods.retrieve(pmId);
            return {
              id: pm.id,
              type: pm.type,
              billing_details: pm.billing_details ? {
                name: pm.billing_details.name || null,
                email: pm.billing_details.email || null,
              } : null,
              card: pm.card ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                exp_month: pm.card.exp_month,
                exp_year: pm.card.exp_year,
              } : null,
            };
          } catch (err: any) {
            console.error(`[STRIPE] Erreur récupération payment method ${pmId}:`, err.message);
            return null; // Ignorer les payment methods invalides
          }
        })
      );

      // Filtrer les nulls
      const validPaymentMethods = paymentMethods.filter(pm => pm !== null);

      res.json({
        paymentMethods: validPaymentMethods,
      });
    } catch (error: any) {
      console.error("[STRIPE] Erreur lors de la récupération des payment methods:", error);
      errorHandler.sendError(res, error);
    }
  });

  /**
   * POST /api/stripe/delete-payment-method
   * 
   * Supprime une méthode de paiement depuis Stripe
   * 
   * Body:
   * {
   *   "paymentMethodId": "pm_xxx"
   * }
   * 
   * Response:
   * {
   *   "success": true
   * }
   */
  app.post("/api/stripe/delete-payment-method", async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.body;

      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        return res.status(400).json({
          error: "Invalid request",
          details: "paymentMethodId is required and must be a string",
        });
      }

      // Initialiser Stripe
      const stripe = getStripeInstance();

      // Détacher la payment method (la supprime du customer)
      await stripe.paymentMethods.detach(paymentMethodId);

      console.log(`[STRIPE] Payment method supprimée: ${paymentMethodId}`);

      res.json({
        success: true,
      });
    } catch (error: any) {
      console.error("[STRIPE] Erreur lors de la suppression de la payment method:", error);
      errorHandler.sendError(res, error);
    }
  });
}
