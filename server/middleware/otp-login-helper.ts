/**
 * Helper générique pour le login OTP
 * Utilisé par les routes driver et restaurant pour éviter la duplication
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { generateToken } from "../auth";

export interface OtpLoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface OtpLoginOptions {
  getUserByPhone: (phone: string) => Promise<{ id: string; name: string; phone: string } | null>;
  userType: "driver" | "restaurant";
}

/**
 * Helper générique pour gérer le login OTP
 * Gère la validation OTP, la récupération de l'utilisateur et la génération du token
 * @param req Requête Express
 * @param res Réponse Express
 * @param options Options pour personnaliser le comportement
 * @returns Résultat du login ou null si erreur (la réponse est déjà envoyée)
 */
export async function handleOtpLogin(
  req: Request,
  res: Response,
  options: OtpLoginOptions
): Promise<OtpLoginResult | null> {
  try {
    const { phone, code } = req.body as { phone?: string; code?: string };
    
    if (!phone) {
      res.status(400).json({ error: "Phone required" });
      return null;
    }
    
    // Vérifier le code OTP si fourni
    if (code) {
      const isValid = await storage.verifyOtpCode(phone, code);
      if (!isValid) {
        // Vérifier pourquoi le code est invalide pour donner un message plus clair
        const latestOtp = await storage.getLatestOtpCode(phone);
        if (!latestOtp) {
          res.status(403).json({ error: "Aucun code OTP trouvé. Veuillez demander un nouveau code." });
        } else if (latestOtp.verified) {
          res.status(403).json({ error: "Ce code a déjà été utilisé. Veuillez demander un nouveau code." });
        } else if (new Date() > latestOtp.expiresAt) {
          res.status(403).json({ error: "Le code OTP a expiré. Veuillez demander un nouveau code." });
        } else if ((latestOtp.attempts || 0) >= 3) {
          res.status(403).json({ error: "Trop de tentatives échouées. Veuillez demander un nouveau code." });
        } else {
          res.status(403).json({ error: "Code OTP incorrect. Vérifiez votre code et réessayez." });
        }
        return null;
      }
    } else {
      // Si pas de code fourni, permettre la connexion sans vérification (pour compatibilité)
      // Mais loguer un avertissement
      console.warn(`[OTP LOGIN] ${options.userType} login sans code OTP pour ${phone}`);
    }
    
    // Récupérer l'utilisateur par téléphone
    const user = await options.getUserByPhone(phone);
    if (!user) {
      const userTypeLabel = options.userType === "driver" ? "Livreur" : "Restaurant";
      res.status(404).json({ error: `${userTypeLabel} non trouvé avec ce numéro` });
      return null;
    }
    
    // Générer le token
    const token = generateToken(user.id, phone);
    
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    };
  } catch (error) {
    console.error(`[OTP LOGIN] ${options.userType} login error:`, error);
    res.status(500).json({ error: "Login failed" });
    return null;
  }
}

