/**
 * Service d'authentification centralisé pour les clients
 * 
 * Authentification simple basée sur prénom + téléphone (sans OTP)
 * L'OTP a été complètement supprimé pour tous les utilisateurs
 */

import { storage } from "../storage";
import { generateToken, verifyToken } from "../auth";
import type { Customer, CustomerLogin } from "@shared/schema";

export interface AuthResult {
  token: string;
  customer: {
    id: string;
    firstName: string;
    phone: string;
  };
}

/**
 * Authentifie un client avec prénom + téléphone (authentification simple)
 * 
 * - Si le client existe → connexion automatique
 * - Si le client n'existe pas → création automatique puis connexion
 * 
 * @param data Prénom et téléphone du client
 * @returns Token JWT et informations du client
 */
export async function authenticateCustomerSimple(
  data: CustomerLogin
): Promise<AuthResult> {
  // Normaliser le numéro de téléphone (supprimer espaces, +, etc.)
  const normalizedPhone = data.phone.replace(/\s+/g, "").replace(/^\+/, "");

  // Rechercher le client existant
  let customer = await storage.getCustomerByPhone(normalizedPhone);

  if (!customer) {
    // Créer le client s'il n'existe pas
    customer = await storage.createCustomer({
      firstName: data.firstName.trim(),
      phone: normalizedPhone,
    });
  } else {
    // Mettre à jour le prénom si différent (au cas où l'utilisateur change de prénom)
    if (customer.firstName !== data.firstName.trim()) {
      customer = await storage.updateCustomer(customer.id, {
        firstName: data.firstName.trim(),
      });
    }
  }

  // Générer le token JWT
  const token = generateToken(customer.id, customer.phone);

  return {
    token,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      phone: customer.phone,
    },
  };
}

/**
 * Vérifie un token JWT et retourne les informations du client
 * 
 * @param token Token JWT
 * @returns Informations du client ou null si token invalide
 */
export async function verifyCustomerToken(
  token: string
): Promise<{ id: string; phone: string } | null> {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Vérifier que le client existe toujours
  // Note: decoded.email contient en fait le phone dans notre cas (pour compatibilité avec generateToken)
  const customer = await storage.getCustomerByPhone(decoded.email);
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    phone: customer.phone,
  };
}

/**
 * Récupère les informations complètes d'un client par son ID
 * 
 * @param customerId ID du client
 * @returns Client ou undefined si non trouvé
 */
export async function getCustomerById(
  customerId: string
): Promise<Customer | undefined> {
  // Note: On pourrait ajouter getCustomerById dans storage si nécessaire
  // Pour l'instant, on utilise getCustomerByPhone via le token
  // Cette fonction est prévue pour l'extension future
  throw new Error("getCustomerById not yet implemented - use verifyCustomerToken instead");
}

