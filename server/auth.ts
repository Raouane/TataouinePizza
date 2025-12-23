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

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    return decoded;
  } catch {
    return null;
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
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log("[AUTH] ❌ Token invalide ou expiré");
    // Log plus de détails
    try {
      const jwt = require("jsonwebtoken");
      jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      console.log(`[AUTH] ❌ Erreur JWT: ${error.message}`);
      if (error.name === "JsonWebTokenError") {
        console.log("[AUTH] ⚠️  Le JWT_SECRET pourrait être différent entre dev et prod");
      } else if (error.name === "TokenExpiredError") {
        console.log(`[AUTH] ⚠️  Token expiré le: ${error.expiredAt}`);
      }
    }
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  console.log(`[AUTH] ✅ Token valide pour admin: ${decoded.email} (ID: ${decoded.id})`);
  req.admin = decoded;
  next();
}
