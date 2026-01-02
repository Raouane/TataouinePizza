import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET n'est pas défini en production !");
  console.warn("   Définissez JWT_SECRET dans vos variables d'environnement.");
}

export interface AuthRequest extends Request {
  admin?: { id: string; email: string };
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateToken(adminId: string, email: string): string {
  return jwt.sign({ id: adminId, email }, JWT_SECRET, { expiresIn: "7d" });
}

export function generateDriverToken(driverId: string, phone: string): string {
  // ✅ NOUVEAU : Augmenter la durée de vie du token à 7 jours (comme les admins)
  // pour éviter les expirations fréquentes pendant les journées de travail
  return jwt.sign({ id: driverId, type: 'driver', phone }, JWT_SECRET, { expiresIn: "7d" });
}

// ✅ NOUVEAU : Générer un refresh token (longue durée : 30 jours)
export function generateRefreshToken(driverId: string, phone: string): string {
  return jwt.sign({ id: driverId, type: 'driver', phone, refresh: true }, JWT_SECRET, { expiresIn: "30d" });
}

// ✅ NOUVEAU : Vérifier un refresh token
export function verifyRefreshToken(token: string): { id: string; phone?: string; type?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone?: string; type?: string; refresh?: boolean };
    // Vérifier que c'est bien un refresh token
    if (!decoded.refresh) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// ✅ NOUVEAU : Type de retour détaillé pour distinguer expired/invalid
export type TokenVerificationResult =
  | { valid: true; decoded: { id: string; email?: string; phone?: string; type?: string } }
  | { valid: false; reason: "expired" | "invalid"; expiredAt?: Date };

export function verifyToken(token: string): TokenVerificationResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string; phone?: string; type?: string };
    return { valid: true, decoded };
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return { valid: false, reason: "expired", expiredAt: err.expiredAt };
    }
    return { valid: false, reason: "invalid" };
  }
}

// Middleware pour authentifier les webhooks n8n
export function authenticateN8nWebhook(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-n8n-token'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedToken = process.env.N8N_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.warn("[N8N] N8N_WEBHOOK_TOKEN non configuré - webhook non sécurisé");
    next();
    return;
  }
  
  if (!token || token !== expectedToken) {
    console.log("[N8N] ❌ Webhook rejeté: token invalide");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  console.log("[N8N] ✅ Webhook authentifié");
  next();
}

export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const url = req.url || req.path || "unknown";
  
  console.log(`[AUTH] Requête ${req.method} ${url}`);
  
  if (!authHeader) {
    console.log("[AUTH] ❌ Pas de header Authorization");
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.log("[AUTH] ❌ Token manquant dans le header Authorization");
    res.status(401).json({ error: "No token provided" });
    return;
  }

  console.log(`[AUTH] 🔍 Vérification du token (longueur: ${token.length}, préfixe: ${token.substring(0, 20)}...)`);
  const result = verifyToken(token);
  
  if (!result.valid) {
    // ✅ NOUVEAU : Différencier TOKEN_EXPIRED / TOKEN_INVALID
    if (result.reason === "expired") {
      console.log(`[AUTH] ❌ Token expiré le: ${result.expiredAt}`);
      res.status(401).json({ error: "TOKEN_EXPIRED", expiredAt: result.expiredAt });
    } else {
      console.log("[AUTH] ❌ Token invalide (signature ou format incorrect)");
      res.status(401).json({ error: "TOKEN_INVALID" });
    }
    return;
  }

  const decoded = result.decoded;

  // Gérer les deux types de tokens : admin (avec email) et driver (avec phone)
  if (decoded.email) {
    console.log(`[AUTH] ✅ Token valide pour admin: ${decoded.email} (ID: ${decoded.id})`);
  } else if (decoded.phone) {
    console.log(`[AUTH] ✅ Token valide pour livreur: ${decoded.phone} (ID: ${decoded.id})`);
  } else {
    console.log(`[AUTH] ✅ Token valide (ID: ${decoded.id})`);
  }
  
  // Pour compatibilité, on met toujours dans req.admin même pour les livreurs
  req.admin = decoded as { id: string; email: string };
  next();
}
