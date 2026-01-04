import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "../storage";
import { insertAdminUserSchema, customerLoginSchema } from "@shared/schema";
import { generateToken, hashPassword, comparePassword, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { authenticateCustomerSimple } from "../services/customer-auth-service";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../middlewares/error-handler";

export function registerAuthRoutes(app: Express): void {
  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============ CUSTOMER AUTHENTICATION (Simple - MVP) ============
  // OTP SUPPRIMÉ COMPLÈTEMENT - Authentification simple uniquement
  
  /**
   * POST /api/auth/login
   * Authentification simple pour les clients (prénom + téléphone)
   * - Crée ou récupère le client par téléphone
   * - Retourne un token JWT immédiatement
   * 
   * ✅ Validation automatique via middleware Zod
   * ✅ Gestion d'erreur automatique via asyncHandler
   */
  app.post(
    "/api/auth/login",
    validate(customerLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // req.body est maintenant typé et validé (phone normalisé, firstName validé)
      const authResult = await authenticateCustomerSimple(req.body);

      res.json({
        token: authResult.token,
        customer: authResult.customer,
      });
    })
  );

  // ============ OTP SUPPRIMÉ COMPLÈTEMENT ============
  // Les routes /api/otp/send et /api/otp/verify ont été supprimées pour tous les utilisateurs
  // Tous utilisent maintenant l'authentification par téléphone + mot de passe (ou prénom + téléphone pour les clients)

  // ============ ADMIN AUTH ============
  
  /**
   * POST /api/admin/register
   * Enregistrement d'un administrateur (désactivé en production)
   * 
   * ✅ Validation automatique via middleware Zod
   * ✅ Gestion d'erreur automatique via asyncHandler
   */
  app.post(
    "/api/admin/register",
    validate(insertAdminUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // Désactiver l'enregistrement en production pour des raisons de sécurité
      if (process.env.NODE_ENV === "production") {
        console.log("[ADMIN REGISTER] Tentative d'enregistrement bloquée en production");
        throw errorHandler.forbidden(
          "Registration is disabled in production. Use the create-admin script instead."
        );
      }
      
      // req.body est maintenant typé et validé
      const existing = await storage.getAdminByEmail(req.body.email);
      if (existing) {
        throw errorHandler.conflict("Email already exists");
      }
      
      const hashedPassword = await hashPassword(req.body.password);
      const admin = await storage.createAdminUser({ 
        email: req.body.email, 
        password: hashedPassword 
      });
      const token = generateToken(admin.id, admin.email);
      
      res.status(201).json({ token });
    })
  );

  /**
   * POST /api/admin/login
   * Connexion administrateur (email + mot de passe)
   * 
   * ✅ Validation automatique via middleware Zod
   * ✅ Gestion d'erreur automatique via asyncHandler
   * ✅ Rate limiting pour sécurité
   */
  app.post(
    "/api/admin/login",
    adminLoginLimiter,
    validate(z.object({
      email: z.string().email("Email invalide"),
      password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    })),
    asyncHandler(async (req: Request, res: Response) => {
      // req.body est maintenant typé et validé
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ADMIN LOGIN] Tentative de connexion pour: ${req.body.email}`);
      }
      
      const admin = await storage.getAdminByEmail(req.body.email);
      if (!admin) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[ADMIN LOGIN] Admin non trouvé: ${req.body.email}`);
        }
        throw errorHandler.unauthorized("Invalid credentials");
      }
      
      const valid = await comparePassword(req.body.password, admin.password);
      if (!valid) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[ADMIN LOGIN] Mot de passe incorrect pour: ${req.body.email}`);
        }
        throw errorHandler.unauthorized("Invalid credentials");
      }
      
      const token = generateToken(admin.id, admin.email);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ADMIN LOGIN] Connexion réussie pour: ${req.body.email}`);
      }
      res.json({ token });
    })
  );
}

