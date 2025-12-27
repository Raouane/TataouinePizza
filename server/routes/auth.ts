import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { verifyOtpSchema, sendOtpSchema, insertAdminUserSchema, customerLoginSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateAdmin, generateToken, hashPassword, comparePassword, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { authenticateCustomerSimple, isOtpEnabled } from "../services/customer-auth-service";

function validate<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function registerAuthRoutes(app: Express): void {
  // Rate limiting pour éviter le spam SMS
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Too many OTP requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============ CUSTOMER AUTHENTICATION (Simple - MVP) ============
  // OTP DISABLED FOR MVP – ENABLE VIA ENABLE_SMS_OTP ENV FLAG
  
  /**
   * POST /api/auth/login
   * Authentification simple pour les clients (prénom + téléphone)
   * 
   * Mode simple (ENABLE_SMS_OTP=false) :
   * - Crée ou récupère le client par téléphone
   * - Retourne un token JWT immédiatement
   * 
   * Mode OTP (ENABLE_SMS_OTP=true) :
   * - Redirige vers le flow OTP classique
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Vérifier si l'OTP est activé
      if (isOtpEnabled()) {
        return res.status(400).json({
          error: "OTP authentication is enabled. Please use /api/otp/send and /api/otp/verify endpoints.",
        });
      }

      // Mode simple : validation prénom + téléphone
      const validation = validate(customerLoginSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined,
        });
      }

      const data = validation.data;

      // Authentifier le client (création automatique si n'existe pas)
      const authResult = await authenticateCustomerSimple(data);

      res.json({
        token: authResult.token,
        customer: authResult.customer,
      });
    } catch (error: any) {
      console.error("[AUTH] Erreur lors de l'authentification:", error);
      errorHandler.sendError(res, error);
    }
  });

  // ============ OTP (Conditional - only if ENABLE_SMS_OTP=true) ============
  // OTP DISABLED FOR MVP – ENABLE VIA ENABLE_SMS_OTP ENV FLAG
  
  app.post("/api/otp/send", otpLimiter, async (req, res) => {
    // Vérifier si l'OTP est activé
    if (!isOtpEnabled()) {
      return res.status(400).json({
        error: "OTP authentication is disabled. Please use /api/auth/login endpoint.",
        message: "OTP désactivé pour le MVP. Utilisez /api/auth/login avec prénom + téléphone.",
      });
    }
    try {
      const validation = validate(sendOtpSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid phone number",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined
        });
      }
      const data = validation.data;
      
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode(data.phone, code, expiresAt);
      
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] Code for ${data.phone}: ${code}`);
      }
      
      res.json({ message: "OTP sent" });
    } catch (error: any) {
      console.error("[OTP] Erreur lors de l'envoi:", error);
      res.status(500).json({ 
        error: "Failed to send OTP",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });
  
  app.post("/api/otp/verify", async (req, res) => {
    // Vérifier si l'OTP est activé
    if (!isOtpEnabled()) {
      return res.status(400).json({
        error: "OTP authentication is disabled. Please use /api/auth/login endpoint.",
        message: "OTP désactivé pour le MVP. Utilisez /api/auth/login avec prénom + téléphone.",
      });
    }

    try {
      const validation = validate(verifyOtpSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined
        });
      }
      const data = validation.data;
      
      const verified = await storage.verifyOtpCode(data.phone, data.code);
      res.json({ verified });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ============ ADMIN AUTH ============
  
  app.post("/api/admin/register", async (req, res) => {
    // Désactiver l'enregistrement en production pour des raisons de sécurité
    if (process.env.NODE_ENV === "production") {
      console.log("[ADMIN REGISTER] Tentative d'enregistrement bloquée en production");
      return res.status(403).json({ 
        error: "Registration is disabled in production. Use the create-admin script instead." 
      });
    }
    
    try {
      const validation = validate(insertAdminUserSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid data",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined
        });
      }
      const data = validation.data;
      
      const existing = await storage.getAdminByEmail(data.email);
      if (existing) return res.status(409).json({ error: "Email already exists" });
      
      const hashedPassword = await hashPassword(data.password);
      const admin = await storage.createAdminUser({ email: data.email, password: hashedPassword });
      const token = generateToken(admin.id, admin.email);
      
      res.status(201).json({ token });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/admin/login", adminLoginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[ADMIN LOGIN] Tentative de connexion sans email/password");
        }
        return res.status(400).json({ error: "Email and password required" });
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ADMIN LOGIN] Tentative de connexion pour: ${email}`);
      }
      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[ADMIN LOGIN] Admin non trouvé: ${email}`);
        }
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const valid = await comparePassword(password, admin.password);
      if (!valid) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[ADMIN LOGIN] Mot de passe incorrect pour: ${email}`);
        }
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const token = generateToken(admin.id, admin.email);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ADMIN LOGIN] Connexion réussie pour: ${email}`);
      }
      res.json({ token });
    } catch (error: any) {
      console.error("[ADMIN LOGIN] Erreur:", error);
      res.status(500).json({ error: "Login failed", details: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
  });
}

